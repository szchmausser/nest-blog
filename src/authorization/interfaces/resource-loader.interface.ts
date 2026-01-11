/**
 * ============================================================================
 * @file resource-loader.interface.ts
 * @description Contrato para servicios que cargan recursos para autorización.
 * @classification DEPENDENCIA - Usado por ResourceOwnershipGuard.
 * @module AuthorizationModule
 * ============================================================================
 *
 * PROPÓSITO:
 * Define el contrato que deben implementar los servicios (UserService,
 * PostService, etc.) para que ResourceOwnershipGuard pueda cargar recursos
 * automáticamente desde la base de datos.
 *
 * ¿POR QUÉ ES NECESARIO?
 * ResourceOwnershipGuard necesita cargar el recurso desde BD para:
 * 1. Validar que el recurso existe (retornar 404 si no).
 * 2. Obtener campos necesarios para condiciones CASL (authorId, etc.).
 *
 * PATRÓN DE DISEÑO: Dependency Inversion Principle
 * El guard no depende de implementaciones concretas (UserService, PostService),
 * sino de esta interfaz abstracta. Cualquier servicio que la implemente
 * puede usarse automáticamente.
 *
 * CÓMO FUNCIONA EN ResourceOwnershipGuard:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                                                                         │
 * │  1. Guard obtiene la clase del controlador actual                       │
 * │                                                                         │
 * │  2. Resuelve la instancia del controlador con ModuleRef                 │
 * │                                                                         │
 * │  3. Busca en sus propiedades un servicio con loadResourceForAuthorization │
 * │     ```typescript                                                       │
 * │     for (const key of Object.keys(controllerInstance)) {                │
 * │       if (typeof service.loadResourceForAuthorization === 'function') { │
 * │         return service as ResourceLoader;                               │
 * │       }                                                                 │
 * │     }                                                                   │
 * │     ```                                                                 │
 * │                                                                         │
 * │  4. Usa el loader para cargar el recurso                                │
 * │     ```typescript                                                       │
 * │     const resource = await loader.loadResourceForAuthorization(id);     │
 * │     ```                                                                 │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * IMPLEMENTACIÓN EN SERVICIOS:
 * ```typescript
 * @Injectable()
 * export class UserService implements ResourceLoader {
 *   constructor(@Inject(DRIZZLE_DB) private readonly db: ReturnType<typeof drizzle>) {}
 *
 *   // ... otros métodos ...
 *
 *   async loadResourceForAuthorization(id: number) {
 *     return await this.db.user.findUnique({
 *       where: { id },
 *       select: { id: true },  // Solo campos necesarios para CASL
 *     });
 *   }
 * }
 *
 * @Injectable()
 * export class PostService implements ResourceLoader {
 *   async loadResourceForAuthorization(id: number) {
 *     return await this.db.post.findUnique({
 *       where: { id },
 *       select: { id: true, authorId: true },  // authorId para ownership
 *     });
 *   }
 * }
 * ```
 *
 * CONSIDERACIONES DE RENDIMIENTO:
 * - Seleccionar SOLO los campos necesarios para CASL (id, authorId, etc.)
 * - No cargar relaciones innecesarias
 * - Para alta concurrencia, considerar caching
 *
 * PARA REPLICAR:
 * 1. Copiar este archivo.
 * 2. Implementar la interfaz en cada servicio que maneje recursos protegidos.
 * 3. Asegurarse de que el servicio esté inyectado en el controlador.
 *
 * ============================================================================
 */

/**
 * ResourceLoader
 * ==============
 * Interfaz para servicios que cargan recursos para validación de permisos.
 *
 * @template T - Tipo del recurso retornado (opcional, default: any)
 */
export interface ResourceLoader<T = any> {
  /**
   * Carga un recurso por ID para validación de permisos.
   *
   * IMPORTANTE:
   * - Retornar SOLO los campos necesarios para evaluación CASL.
   * - Para User: { id }
   * - Para Post: { id, authorId }
   * - Para Comment: { id, authorId, postId }
   *
   * @param id - ID del recurso a cargar.
   * @returns Recurso con campos mínimos, o null si no existe.
   *
   * @example
   * ```typescript
   * async loadResourceForAuthorization(id: number) {
   *   return await this.db
   *     .select({ id: users.id, authorId: users.authorId })
   *     .from(users)
   *     .where(eq(users.id, id))
   *     .limit(1);
   * }
   * ```
   */
  loadResourceForAuthorization(id: number): Promise<T | null>;
}

/**
 * RESOURCE_LOADER
 * ===============
 * Token de inyección para el resource loader (opcional).
 *
 * Puede usarse para inyección explícita con @Inject(RESOURCE_LOADER)
 * en lugar de la detección automática por duck-typing.
 *
 * Actualmente no se usa porque ResourceOwnershipGuard detecta
 * automáticamente los servicios que implementan la interfaz.
 */
export const RESOURCE_LOADER = Symbol('RESOURCE_LOADER');
