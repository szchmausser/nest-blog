import { Module, ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    /**
     * CONFIGURACIÓN GLOBAL DE VALIDACIÓN (ValidationPipe)
     * Establece un estándar estricto para la entrada de datos en toda la API.
     * Usamos 'useValue' en lugar de 'useClass' para pasarle opciones personalizadas.
     */
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        /**
         * 1. SEGURIDAD Y LIMPIEZA (whitelist & forbidNonWhitelisted)
         * Combinar ambos es la forma más segura de prevenir ataques de "Mass Assignment"
         * (Asignación Masiva) y la inyección de datos maliciosos.
         * * - whitelist: true -> Filtra el objeto y elimina automáticamente cualquier
         * propiedad que no tenga decoradores de validación en el DTO.
         * - forbidNonWhitelisted: true -> En lugar de solo filtrar, detiene la petición
         * y lanza una excepción 400 (Bad Request) si se detectan campos prohibidos.
         * * Ventajas:
         * - Frena en seco a quien intente "adivinar" campos ocultos (ej: enviar 'isAdmin: true').
         * - Obliga al Frontend a ser exacto con lo que envía, evitando errores accidentales.
         * - Garantiza que tus servicios reciban objetos "limpios" y seguros.
         */
        whitelist: true, // 1. Filtra lo que no esté en el DTO
        forbidNonWhitelisted: true, // 2. Lanza error si hay campos prohibidos

        /**
         * 2. TRANSFORMACIÓN AUTOMÁTICA (transform)
         * Convierte los Payloads al tipo de objeto de sus respectivos DTOs y realiza
         * conversiones de tipos primitivos basadas en la firma del método.
         * * Ventajas:
         * - Ahorro de código: Convierte automáticamente strings a números (ej: un ID "5"
         * en la URL pasa a ser el number 5 en el controlador).
         * - Tipado real: Los objetos que llegan al controlador son instancias reales
         * de sus clases DTO, no solo objetos planos de JS.
         */
        transform: true, // 3. Convierte tipos (ej: string a number en IDs)
        transformOptions: {
          enableImplicitConversion: true, // Esto convertirá "true" a true
        },
      }),
    },

    /**
     * MIDDLEWARE: AllExceptionsFilter - Filtro Global - (Formato estandard de respuestas con errores / excepciones)
     * ¿POR QUÉ ES NECESARIO?:
     * Implementamos un filtro global para manejar excepciones de manera centralizada.
     * Cada vez que ocurra un error en la aplicación, nuestro filtro lo captura y
     * responde con una respuesta estándar que contiene:
     * - Un estado HTTP apropiado
     * - Un mensaje descriptivo
     * - Un timestamp
     * - El path de la petición
     * - El error original (si es un objeto)
     * * Vínculo con la seguridad:
     * Aunque no es directamente relacionado con la seguridad, es una práctica
     * recomendada para mejorar la experiencia del usuario y la depuración.
     */
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
