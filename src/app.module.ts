import { Module, ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtAuthGuard } from './authentication/guards/jwt-auth.guard';
import { AuthenticationModule } from './authentication/authentication.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule, // Modulo central para interactuar con la base de datos (ORM Prisma)
    UserModule,
    AuthenticationModule, // Modulo que encapsula toda la lógica de JWT, Estrategias y autenticacion de usuarios
  ],

  controllers: [AppController],

  providers: [
    AppService,

    /**
     * PROVEEDOR: APP_PIPE (Validación de Datos)
     * Registra el ValidationPipe de forma global.
     * - Efecto: Todos los DTOs de la aplicación serán validados automáticamente.
     * - Beneficio: Si un cliente envía datos malformados o tipos incorrectos,
     * NestJS rechazará la petición con un 400 Bad Request antes de llegar al servicio.
     */
    {
      provide: APP_PIPE,
      /**
       * CONFIGURACIÓN GLOBAL DE VALIDACIÓN (ValidationPipe)
       * Establece un estándar estricto para la entrada de datos en toda la API.
       * Usamos 'useValue' en lugar de 'useClass' para pasarle opciones personalizadas.
       */
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
     * PROVEEDOR: APP_FILTER - (Estandarización de respuestas con errores / excepciones)
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

    /**
     * PROVEEDOR: APP_INTERCEPTOR (Estandarización de Respuestas)
     * Registra el ResponseInterceptor de forma global.
     * ¿POR QUÉ USARLO?:
     * Sin un interceptor, cada controlador devuelve datos en formatos distintos.
     * Este interceptor actúa como un "envoltorio" (wrapper) universal para todas
     * las respuestas exitosas (200, 201).
     * VENTAJAS PARA EL DESARROLLO (Frontend & Móvil):
     * - Consistencia: El cliente siempre recibe la misma estructura { success, data, timestamp }.
     * - Predictibilidad: Facilita la creación de servicios de consumo (Axios/Fetch)
     * que pueden manejar todas las respuestas bajo una sola lógica.
     * - Metadata: Permite inyectar automáticamente información global (como la hora del
     * servidor o la versión de la API) sin tocar un solo controlador.
     * RELACIÓN CON EL FILTRO DE ERRORES:
     * Mientras el Interceptor maneja los éxitos (success: true), el ExceptionFilter
     * maneja los fallos (success: false). Juntos, garantizan que la API NUNCA
     * devuelva una respuesta fuera del formato estandarizado.
     */
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },

    // Autenticacion 6.1
    /**
     * PROVEEDOR: APP_GUARD (Seguridad por defecto)
     * Al registrar JwtAuthGuard aquí, estamos activando el "Escudo Global".
     * - Efecto: Cierra todas las rutas de la aplicación automáticamente.
     * - Excepción: Solo las rutas marcadas con @Public() podrán ser accedidas.
     * - Beneficio: Es más seguro "abrir" rutas específicas que olvidar "cerrar" una protegida.
     */
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
