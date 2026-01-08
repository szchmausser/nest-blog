/**
 * ============================================================================
 * @file conditions-parser.util.ts
 * @description Utilidad para procesar condiciones ABAC de CASL.
 * @classification DEPENDENCIA - Usado por CaslAbilityFactory.
 * @module AuthorizationModule
 * ============================================================================
 *
 * PROPÓSITO:
 * Transforma las condiciones almacenadas en la base de datos (con placeholders
 * como {{id}}) en valores concretos evaluables por CASL.
 *
 * ¿QUÉ SON LAS CONDICIONES ABAC?
 * ABAC (Attribute-Based Access Control) permite definir permisos condicionales:
 * - "Puede editar Posts, PERO solo si es el autor"
 * - "Puede ver Orders, PERO solo las de su departamento"
 *
 * Las condiciones se almacenan en la BD como JSON con placeholders:
 * ```json
 * { "authorId": "{{id}}" }
 * ```
 *
 * Este parser las transforma en condiciones evaluables:
 * ```javascript
 * { authorId: 5 }  // Donde 5 es el id del usuario actual
 * ```
 *
 * FLUJO DE TRANSFORMACIÓN:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                                                                         │
 * │  ENTRADA (desde BD):                                                    │
 * │  Permission.conditions = { "authorId": "{{id}}", "status": "draft" }    │
 * │                                                                         │
 * │  CONTEXTO:                                                              │
 * │  User = { id: 5, email: "john@example.com" }                            │
 * │                                                                         │
 * │  PROCESO:                                                               │
 * │  1. Mustache.render("{{id}}", user) → "5"                               │
 * │  2. Conversión a número: "5" → 5                                        │
 * │                                                                         │
 * │  SALIDA:                                                                │
 * │  { authorId: 5, status: "draft" }                                       │
 * │                                                                         │
 * │  USO EN CASL:                                                           │
 * │  can('update', 'Post', { authorId: 5, status: "draft" })                │
 * │  → Usuario solo puede editar Posts donde authorId=5 Y status="draft"    │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * SINTAXIS DE PLACEHOLDERS (Mustache):
 * - {{id}} → user.id
 * - {{email}} → user.email
 * - {{roles.0.role.name}} → Primer rol del usuario
 *
 * DEPENDENCIAS NPM:
 * ```bash
 * npm install mustache lodash
 * npm install -D @types/mustache @types/lodash
 * ```
 *
 * PARA REPLICAR:
 * 1. Copiar este archivo.
 * 2. Instalar mustache y lodash.
 * 3. Ajustar si necesitas más propiedades del usuario en placeholders.
 *
 * ============================================================================
 */

import * as Mustache from 'mustache';
import * as _ from 'lodash';
import { User } from '../casl/casl-ability.factory';

/**
 * parseConditions
 * ===============
 * Procesa las condiciones ABAC interpolando variables del usuario.
 *
 * @param conditions - Condiciones originales desde la BD (objeto JSON).
 * @param user - Usuario actual para resolver placeholders.
 * @returns Condiciones con variables resueltas, o undefined si no hay condiciones.
 *
 * @example
 * ```typescript
 * const dbConditions = { "authorId": "{{id}}" };
 * const user = { id: 5, email: "test@example.com" };
 * const parsed = parseConditions(dbConditions, user);
 * // Resultado: { authorId: 5 }
 * ```
 *
 * @example
 * ```typescript
 * // Condiciones múltiples
 * const dbConditions = { "authorId": "{{id}}", "isPublished": true };
 * const parsed = parseConditions(dbConditions, user);
 * // Resultado: { authorId: 5, isPublished: true }
 * ```
 */
export function parseConditions(
  conditions: unknown,
  user: User,
): Record<string, unknown> | undefined {
  /**
   * GUARD: Manejar condiciones nulas o inválidas.
   * Permisos sin condiciones aplican globalmente a todos los recursos.
   */
  if (
    conditions === null ||
    conditions === undefined ||
    typeof conditions !== 'object'
  ) {
    return undefined;
  }

  /**
   * _.cloneDeepWith():
   * Clona el objeto recursivamente, aplicando una función de transformación
   * a cada valor. Esto permite procesar objetos anidados.
   *
   * La función retorna:
   * - undefined: Lodash continúa la clonación normal del valor.
   * - any otro valor: Lodash usa ese valor como reemplazo.
   */
  return _.cloneDeepWith(conditions, (value) => {
    /**
     * Solo procesamos valores string (que pueden contener placeholders).
     * Otros tipos (boolean, number, object) se clonan normalmente.
     */
    if (_.isString(value)) {
      /**
       * Mustache.render():
       * Reemplaza {{variable}} con el valor correspondiente del objeto user.
       *
       * Ejemplos:
       * - "{{id}}" + { id: 5 } → "5"
       * - "{{email}}" + { email: "a@b.com" } → "a@b.com"
       */
      const rendered = Mustache.render(value, user);

      /**
       * CONVERSIÓN DE TIPOS:
       * Mustache siempre retorna strings, pero en la BD los campos como
       * 'authorId' son Int. CASL necesita que los tipos coincidan para
       * comparar correctamente.
       *
       * /^\d+$/ → Expresión regular que detecta strings numéricos.
       * "5" → match → convertir a Number(5)
       * "abc" → no match → mantener como string
       */
      if (/^\d+$/.test(rendered)) {
        return Number(rendered);
      }

      return rendered;
    }

    /**
     * Retornar undefined para que Lodash continue
     * la clonación normal de valores no-string.
     */
    return undefined;
  }) as Record<string, unknown> | undefined;
}
