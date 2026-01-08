/**
 * ============================================================================
 * @file request-with-user.interface.ts
 * @description Extensión del objeto Request de Express con usuario tipado.
 * @classification DEPENDENCIA - Usado por los guards.
 * @module AuthorizationModule
 * ============================================================================
 *
 * PROPÓSITO:
 * Extiende el tipo Request de Express para incluir la propiedad 'user'
 * con el tipo correcto (UserPayload). Esto permite tipado seguro en guards.
 *
 * ¿POR QUÉ ES NECESARIO?
 * Por defecto, Request de Express NO tiene la propiedad 'user'.
 * Passport inyecta esta propiedad dinámicamente después de validar el JWT.
 * Sin esta interfaz, tendríamos que usar 'any', perdiendo seguridad de tipos.
 *
 * FLUJO DE INYECCIÓN:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                                                                         │
 * │  1. Request llega con header: Authorization: Bearer <jwt>               │
 * │                                                                         │
 * │  2. JwtAuthGuard intercepta                                             │
 * │     └── Valida el token con JwtStrategy                                 │
 * │     └── JwtStrategy.validate() retorna { id, email }                    │
 * │                                                                         │
 * │  3. Passport inyecta el resultado en request.user                       │
 * │     └── request.user = { id: 5, email: 'user@example.com' }             │
 * │                                                                         │
 * │  4. Guards de autorización leen request.user                            │
 * │     └── const userPayload = request.user as UserPayload                 │
 * │     └── Con esta interfaz: request.user ya está tipado                  │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ALTERNATIVA:
 * También podrías extender el tipo globalmente en un archivo .d.ts:
 * ```typescript
 * // src/types/express.d.ts
 * declare namespace Express {
 *   interface Request {
 *     user?: UserPayload;
 *   }
 * }
 * ```
 * Pero esta interfaz explícita es más visible y mantenible.
 *
 * PARA REPLICAR:
 * 1. Copiar este archivo.
 * 2. Asegurarse de que UserPayload esté definido en tu módulo de autenticación.
 *
 * ============================================================================
 */

import { UserPayload } from '../../authentication/interfaces/user-payload.interface';

/**
 * RequestWithUser
 * ===============
 * Request de Express garantizando la existencia de un usuario tipado.
 *
 * USO EN GUARDS:
 * ```typescript
 * const request = context.switchToHttp().getRequest<RequestWithUser>();
 * const userPayload = request.user;  // Tipo: UserPayload | undefined
 *
 * if (!userPayload) {
 *   throw new UnauthorizedException();
 * }
 * // Ahora TypeScript sabe que userPayload es UserPayload
 * ```
 */
export interface RequestWithUser extends Request {
  /**
   * Usuario decodificado desde el JWT.
   * Inyectado por JwtAuthGuard/Passport.
   *
   * undefined si el usuario no está autenticado.
   */
  user?: UserPayload;
}
