/**
 * ============================================================================
 * @file policy-handler.interface.ts
 * @description Tipos para los manejadores de políticas de autorización.
 * @classification SECUNDARIO - Solo necesario si usas GlobalGuard.
 * @module AuthorizationModule
 * ============================================================================
 *
 * PROPÓSITO:
 * Define las interfaces y tipos para "Policy Handlers", que son las funciones
 * o clases que evalúan si un usuario tiene permiso para acceder a un recurso.
 *
 * NOTA: Este archivo solo es necesario si usas GlobalGuard.
 * Si solo usas InstanceGuard, puedes omitir este archivo.
 *
 * PATRÓN DE DISEÑO: Strategy Pattern
 * Las políticas se definen como "handlers" intercambiables que encapsulan
 * diferentes estrategias de verificación de permisos. Esto permite:
 * - Definir políticas inline como funciones lambda.
 * - Definir políticas reutilizables como clases.
 * - Componer múltiples políticas en un solo endpoint.
 *
 * TIPOS DE HANDLERS:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                                                                         │
 * │  FUNCIÓN (PolicyHandlerCallback):                                       │
 * │  Sintaxis más concisa, ideal para políticas simples.                    │
 * │  ```typescript                                                          │
 * │  @CheckPolicies((ability) => ability.can('read', 'Post'))               │
 * │  ```                                                                    │
 * │                                                                         │
 * │  CLASE (IPolicyHandler):                                                │
 * │  Más estructurada, ideal para lógica compleja o reutilizable.           │
 * │  ```typescript                                                          │
 * │  class ReadPostHandler implements IPolicyHandler {                      │
 * │    handle(ability: AppAbility): boolean {                               │
 * │      return ability.can('read', 'Post');                                │
 * │    }                                                                    │
 * │  }                                                                      │
 * │  @CheckPolicies(new ReadPostHandler())                                  │
 * │  ```                                                                    │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * POLIMORFISMO EN GlobalGuard:
 * El guard detecta el tipo de handler en runtime:
 * - typeof handler === 'function' → Ejecuta: handler(ability)
 * - typeof handler === 'object' → Ejecuta: handler.handle(ability)
 *
 * PARA REPLICAR:
 * Solo si usas GlobalGuard. Copiar junto con:
 * - global.guard.ts
 * - check-global.decorator.ts
 *
 * ============================================================================
 */

import { AppAbility } from '../casl/casl-ability.factory';

// ============================================================================
// INTERFAZ: IPolicyHandler (Para handlers basados en clases)
// ============================================================================

/**
 * IPolicyHandler
 * ==============
 * Interfaz para policy handlers basados en clases.
 *
 * CUÁNDO USAR CLASES EN VEZ DE FUNCIONES:
 * - Cuando la lógica de evaluación es compleja.
 * - Cuando necesitas inyección de dependencias (usar @Injectable).
 * - Cuando quieres reutilizar la misma política en múltiples lugares.
 * - Cuando necesitas testear la política de forma aislada.
 *
 * @example
 * ```typescript
 * @Injectable()
 * class CanManagePostPolicy implements IPolicyHandler {
 *   handle(ability: AppAbility): boolean {
 *     return ability.can('manage', 'Post');
 *   }
 * }
 *
 * // En controlador:
 * @CheckPolicies(new CanManagePostPolicy())
 * ```
 */
export interface IPolicyHandler {
  /**
   * Evalúa si la política se cumple.
   *
   * @param ability - Instancia de AppAbility con las reglas del usuario.
   * @returns true si el usuario cumple la política, false si no.
   */
  handle(ability: AppAbility): boolean;
}

// ============================================================================
// TIPO: PolicyHandlerCallback (Para handlers basados en funciones)
// ============================================================================

/**
 * PolicyHandlerCallback
 * =====================
 * Tipo para policy handlers basados en funciones lambda.
 *
 * CUÁNDO USAR FUNCIONES EN VEZ DE CLASES:
 * - Cuando la verificación es simple (una línea).
 * - Cuando defines políticas inline en el decorador.
 * - Cuando no necesitas dependencias externas.
 * - Para prototipado rápido.
 *
 * @example
 * ```typescript
 * // Simple
 * @CheckPolicies((ability) => ability.can('read', 'Post'))
 *
 * // Múltiples
 * @CheckPolicies(
 *   (ability) => ability.can('create', 'Post'),
 *   (ability) => ability.can('read', 'User')
 * )
 * ```
 */
type PolicyHandlerCallback = (ability: AppAbility) => boolean;

// ============================================================================
// TIPO UNIÓN: PolicyHandler
// ============================================================================

/**
 * PolicyHandler
 * =============
 * Tipo unión que acepta handlers como funciones o clases.
 *
 * BENEFICIOS:
 * 1. Flexibilidad: Usa funciones o clases según convenga.
 * 2. Consistencia: Un solo tipo para todo el sistema de políticas.
 * 3. Extensibilidad: Fácil agregar nuevos tipos de handlers.
 */
export type PolicyHandler = IPolicyHandler | PolicyHandlerCallback;
