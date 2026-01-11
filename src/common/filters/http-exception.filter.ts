import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ExceptionResponse } from '../interfaces/exception-response.interface';

/**
 * Error de PostgreSQL con código específico
 */
interface PostgresError extends Error {
  code?: string;
  constraint?: string;
  detail?: string;
  table?: string;
  column?: string;
}

/**
 * FILTRO DE EXCEPCIONES GLOBAL: AllExceptionsFilter
 * Este filtro es la última línea de defensa. Atrapa cualquier error que los
 * controladores, guards o interceptores no hayan manejado.
 * Al estar vacío @Catch(), le indicamos que capture CUALQUIER tipo de excepción.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  /**
   * MÉTODO CATCH
   * @param exception El objeto de error lanzado.
   * @param host El "contenedor" de la petición actual.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    /**
     * CONTEXTO DE EJECUCIÓN:
     * .switchToHttp() -> Le dice a Nest: "Estoy trabajando en una API Web (HTTP)".
     * Esto nos permite obtener los objetos específicos de Express:
     * - Request: Para saber qué URL se llamó (path).
     * - Response: Para poder enviar el JSON de error manualmente.
     */
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 1. DETERMINAR EL CÓDIGO DE ESTADO Y MENSAJE (Variables de control)
    // Inicializamos con un error 500 y un mensaje genérico por seguridad.
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    // 2. ANÁLISIS DE LA EXCEPCIÓN SEGÚN SU ORIGEN

    // CASO A: Errores de PostgreSQL (Base de Datos)
    if (this.isPostgresError(exception)) {
      const postgresError = this.handlePostgresError(exception);
      status = postgresError.status;
      message = postgresError.message;
    }
    // CASO B: Excepciones estándar de NestJS (HttpException)
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      /**
       * NestJS puede responder con:
       * - Un objeto (DTO): { message: ["password is too short"], error: "Bad Request" }
       * - Un string: "Unauthorized"
       */
      if (typeof res === 'object' && res !== null) {
        // Usamos la interfaz ExceptionResponse para acceder a la propiedad .message de forma segura
        const formattedRes = res as ExceptionResponse;
        message = formattedRes.message;
      } else {
        message = String(res);
      }
    }
    // CASO C: Errores genéricos de JavaScript (SyntaxError, etc)
    else if (exception instanceof Error) {
      /**
       * Si el error es una instancia de Error nativa tomamos su propiedad .message descriptiva.
       */
      message = exception.message;
    }

    // 3. RESPUESTA FINAL ESTANDARIZADA
    /**
     * Es el espejo del ResponseInterceptor. El Frontend siempre recibirá esta estructura
     * si algo sale mal, facilitando el manejo de errores global.
     */
    response.status(status).json({
      success: false, // Identificador de fallo
      statusCode: status, // Código HTTP para lógica del cliente
      timestamp: new Date().toISOString(), // Momento exacto del error
      path: request.url, // Endpoint donde ocurrió el fallo
      message: message, // Explicación amigable o técnica del error
    });
  }

  /**
   * Verifica si el error es un error de PostgreSQL
   */
  private isPostgresError(error: unknown): error is PostgresError {
    return (
      error instanceof Error &&
      'code' in error &&
      typeof (error as PostgresError).code === 'string'
    );
  }

  /**
   * MÉTODO PRIVADO: handlePostgresError
   * Centraliza la lógica de extracción de mensajes para errores conocidos de PostgreSQL.
   * Mapea códigos de error de PostgreSQL a mensajes amigables.
   */
  private handlePostgresError(exception: PostgresError): {
    status: number;
    message: string;
  } {
    const code = exception.code;
    const constraint = exception.constraint;
    const table = exception.table;
    const column = exception.column;
    const model = table ? ` (${table})` : '';

    /**
     * FUNCIÓN AUXILIAR: getFieldName
     * Intenta extraer el nombre del campo desde constraint, column, o detail
     */
    const getFieldName = (): string => {
      if (column) return column;
      if (constraint) {
        // Los constraints suelen tener formato: tabla_campo_key o tabla_campo_fkey
        const parts = constraint.split('_');
        if (parts.length > 1) {
          return parts.slice(1, -1).join('_');
        }
        return constraint;
      }
      if (exception.detail) {
        // Detail suele ser: "Key (campo)=(valor) already exists."
        const match = exception.detail.match(/Key \(([^)]+)\)/);
        if (match) return match[1];
      }
      return 'campo';
    };

    switch (code) {
      case '23505': // Unique constraint violation
        return {
          status: HttpStatus.CONFLICT,
          message: `Ya existe un registro con este valor en el campo: ${getFieldName()}${model}.`,
        };
      case '23503': // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `Error de referencia: El dato en '${getFieldName()}' no es válido en la relación${model}.`,
        };
      case '23502': // Not null constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `El campo '${getFieldName()}' es requerido${model}.`,
        };
      case '23514': // Check constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `El valor para '${getFieldName()}' no cumple con las restricciones${model}.`,
        };
      case '42P01': // Undefined table
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Error de base de datos: tabla no encontrada${model}.`,
        };
      case '42703': // Undefined column
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `Error de base de datos: columna '${getFieldName()}' no encontrada${model}.`,
        };
      case '08003': // Connection does not exist
      case '08006': // Connection failure
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'No se pudo establecer conexión con la base de datos.',
        };
      default:
        // Si el código no está mapeado, devolvemos un 400 genérico sin exponer detalles sensibles.
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `Error de base de datos${code ? ` (Código: ${code})` : ''}${model}.`,
        };
    }
  }
}
