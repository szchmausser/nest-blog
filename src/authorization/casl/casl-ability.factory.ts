/**
 * ============================================================================
 * @file casl-ability.factory.ts
 * @description Fábrica central para la gestión de permisos dinámicos con CASL.
 * @classification TRONCAL - Corazón del sistema de autorización.
 * @module AuthorizationModule
 * @version 2.0.0
 * ============================================================================
 *
 * PROPÓSITO:
 * Este archivo implementa el motor de autorización de la aplicación,
 * actuando como el "cerebro" que decide qué puede o no puede hacer cada usuario.
 * Aquí se construyen las reglas de CASL basándose en los roles y permisos del usuario.
 *
 * MODELO DE AUTORIZACIÓN HÍBRIDO:
 * Combina tres paradigmas de control de acceso:
 *
 * 1. RBAC (Role-Based Access Control):
 *    - Los usuarios heredan permisos a través de roles predefinidos.
 *    - Flujo: User → UserRole → Role → RolePermission → Permission
 *
 * 2. ABAC (Attribute-Based Access Control):
 *    - Los permisos pueden tener condiciones basadas en atributos del recurso.
 *    - Las condiciones se evalúan en tiempo de ejecución mediante interpolación.
 *    - Ejemplo: { "authorId": "{{id}}" } → Solo puede editar sus propios recursos.
 *
 * 3. Claims (Permisos Directos):
 *    - Permisos asignados directamente al usuario, sin pasar por roles.
 *    - Pueden OTORGAR (inverted: false) o REVOCAR (inverted: true) capacidades.
 *    - Los REVOKES tienen prioridad máxima (la última regla gana en CASL).
 *
 * DIAGRAMA DE FLUJO:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         createAbility(user)                             │
 * │                                                                         │
 * │  PASO 1: Procesar Roles (Base)                                          │
 * │    └── Para cada rol del usuario:                                       │
 * │        └── Para cada permiso del rol:                                   │
 * │            └── can(action, subject, conditions)                         │
 * │                                                                         │
 * │  PASO 2: Procesar Grants (inverted: false)                              │
 * │    └── Para cada permiso directo con inverted=false:                    │
 * │        └── can(action, subject, conditions) ← Expande capacidades       │
 * │                                                                         │
 * │  PASO 3: Procesar Revokes (inverted: true) ← PRIORIDAD MÁXIMA           │
 * │    └── Para cada permiso directo con inverted=true:                     │
 * │        └── cannot(action, subject, conditions) ← Restringe              │
 * │                                                                         │
 * │  RESULTADO: Objeto Ability con todas las reglas evaluables              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * DEPENDENCIAS:
 * - conditions-parser.util.ts: Interpola variables como {{id}} en condiciones.
 * - Prisma types: User, Post, Permission, Role, etc.
 *
 * PARA REPLICAR EN OTRO PROYECTO:
 * 1. Copiar este archivo.
 * 2. Copiar conditions-parser.util.ts (dependencia).
 * 3. Ajustar los tipos de Prisma a tu schema.
 * 4. Añadir nuevas clases wrapper para tus entidades (ej: Comment, Order).
 * 5. Actualizar el tipo Subjects con tus entidades.
 *
 * ============================================================================
 */

import {
  AbilityBuilder,
  ExtractSubjectType,
  InferSubjects,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { parseConditions } from '../utils/conditions-parser.util';
import {
  User as PrismaUser,
  Post as PrismaPost,
  UserRole,
  Role,
  RolePermission,
  Permission,
  UserPermission,
  ActionEnum,
} from 'generated/prisma/client';

// ============================================================================
// CLASES WRAPPER (Envoltorio para entidades de Prisma)
// ============================================================================

/**
 * IMPORTANTE - ¿POR QUÉ NECESITAMOS ESTAS CLASES?
 *
 * CASL identifica el tipo de un objeto usando su constructor.name.
 * Los objetos retornados por Prisma son objetos planos (POJOs) sin clase.
 * Al envolverlos en estas clases, CASL puede detectar correctamente el "subject".
 *
 * EJEMPLO:
 * - Objeto plano de Prisma: { id: 1, authorId: 5 } → constructor.name = "Object"
 * - Envuelto en Post: new Post({ id: 1, authorId: 5 }) → constructor.name = "Post"
 *
 * CASL evalúa: ability.can('update', postWrapper) y detecta subject = "Post"
 */

/**
 * Post Wrapper
 * ============
 * Envuelve objetos Post de Prisma para que CASL identifique el subject.
 *
 * CAMPOS REQUERIDOS PARA CASL:
 * - id: Identificador del recurso
 * - authorId: Usado en condiciones de ownership { "authorId": "{{id}}" }
 * - isPublished: Usado en condiciones de estado { "isPublished": true }
 *
 * PARA AÑADIR UNA NUEVA ENTIDAD:
 * 1. Crear una clase similar con los campos relevantes para condiciones.
 * 2. Agregarla al tipo Subjects.
 * 3. Actualizar createResourceInstance() en instance.guard.ts
 */
export class Post implements Partial<PrismaPost> {
  constructor(partial: Partial<PrismaPost>) {
    Object.assign(this, partial);
  }
  id!: number;
  authorId!: number;
  isPublished!: boolean;
}

/**
 * User Wrapper
 * ============
 * Envuelve objetos User de Prisma con su jerarquía completa de permisos.
 *
 * ESTRUCTURA COMPLETA:
 * User
 *  ├── roles[] (UserRole con expiración)
 *  │    └── role (Role)
 *  │         └── permissions[] (RolePermission)
 *  │              └── permission (Permission con action, subject, conditions)
 *  └── directPermissions[] (UserPermission con inverted, expiración)
 *       └── permission (Permission)
 *
 * NOTA: Esta estructura viene del query en AuthorizationService.getUserWithPermissions()
 */
export class User implements Partial<PrismaUser> {
  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
  id!: number;
  email!: string;
  roles!: (UserRole & {
    role: Role & {
      permissions: (RolePermission & {
        permission: Permission;
      })[];
    };
  })[];
  directPermissions!: (UserPermission & {
    permission: Permission;
  })[];
}

// ============================================================================
// TIPOS DE CASL
// ============================================================================

/**
 * Subjects
 * ========
 * Define todos los "subjects" (recursos) que CASL puede evaluar.
 *
 * COMPOSICIÓN:
 * - InferSubjects<typeof Post | typeof User, true>: Deriva tipos de las clases
 * - 'Post' | 'User': Permite usar strings literales también
 * - 'all': Subject especial que representa "todos los recursos"
 *
 * PARA AÑADIR UNA NUEVA ENTIDAD:
 * 1. Crear la clase wrapper (ej: class Comment {...})
 * 2. Añadirla aquí: InferSubjects<typeof Post | typeof User | typeof Comment, true>
 * 3. Añadir el literal: | 'Comment'
 */
export type Subjects =
  | InferSubjects<typeof Post | typeof User, true>
  | 'Post'
  | 'User'
  | 'all';

/**
 * AppAbility
 * ==========
 * Tipo que representa una instancia de Ability configurada para esta aplicación.
 * MongoAbility usa sintaxis de condiciones compatible con MongoDB/Prisma.
 *
 * MÉTODOS DISPONIBLES:
 * - ability.can(action, subject): ¿Puede realizar la acción?
 * - ability.cannot(action, subject): ¿Está prohibida la acción?
 * - ability.relevantRuleFor(action, subject): Obtiene la regla que aplica
 */
export type AppAbility = MongoAbility<[ActionEnum, Subjects]>;

// ============================================================================
// FÁBRICA DE HABILIDADES
// ============================================================================

/**
 * CaslAbilityFactory
 * ==================
 * Servicio inyectable que construye instancias de AppAbility personalizadas
 * para cada usuario basándose en sus roles y permisos directos.
 *
 * USO TÍPICO:
 * ```typescript
 * const userWrapper = new User(userFromDb);
 * const ability = caslAbilityFactory.createAbility(userWrapper);
 * const canEdit = ability.can(ActionEnum.update, postWrapper);
 * ```
 */
@Injectable()
export class CaslAbilityFactory {
  /**
   * createAbility
   * =============
   * Construye el set de habilidades para un usuario basándose en roles y claims.
   *
   * REGLA CRÍTICA DE CASL: LA ÚLTIMA REGLA QUE COINCIDE ES LA QUE GANA.
   * Por esto procesamos en orden: Roles → Grants → Revokes
   * Los Revokes (cannot) al final garantizan que siempre ganen.
   *
   * @param user - Usuario con su jerarquía completa de permisos (roles + directPermissions)
   * @returns AppAbility - Objeto ability con todos los permisos evaluables
   *
   * @example
   * // Usuario con rol EDITOR que hereda 'update:Post'
   * // Pero tiene revoke directo de 'update:Post' por sanción
   * // Resultado: cannot('update', 'Post') gana
   */
  createAbility(user: User): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(
      createMongoAbility,
    );

    if (user) {
      // ========================================================================
      // PASO 1: Procesar Roles (Base de permisos)
      // ========================================================================
      /**
       * Itera sobre cada rol asignado al usuario y extrae sus permisos.
       * Las condiciones se interpolan usando parseConditions().
       *
       * EJEMPLO DE PERMISO CON CONDICIONES:
       * Permission: { action: 'update', subject: 'Post', conditions: { "authorId": "{{id}}" } }
       * parseConditions() transforma {{id}} → user.id (ej: 5)
       * Resultado: can('update', 'Post', { authorId: 5 })
       */
      user.roles.forEach((ur) => {
        ur.role.permissions.forEach((rp) => {
          can(
            rp.permission.action,
            rp.permission.subject,
            parseConditions(rp.permission.conditions, user),
          );
        });
      });

      // ========================================================================
      // PASO 2: Procesar Grants (Permisos directos que OTORGAN)
      // ========================================================================
      /**
       * Permisos directos con inverted: false
       * Estos EXPANDEN las capacidades del usuario más allá de sus roles.
       *
       * CASO DE USO:
       * Usuario con rol "viewer" (solo read) pero se le otorga
       * temporalmente 'create:Post' para un proyecto específico.
       */
      user.directPermissions
        .filter((dp) => !dp.inverted)
        .forEach((dp) => {
          can(
            dp.permission.action,
            dp.permission.subject,
            parseConditions(dp.permission.conditions, user),
          );
        });

      // ========================================================================
      // PASO 3: Procesar Revokes (Permisos directos que REVOCAN)
      // ========================================================================
      /**
       * Permisos directos con inverted: true
       * Estos RESTRINGEN capacidades, incluso las heredadas de roles.
       * SE PROCESAN AL FINAL PORQUE LA ÚLTIMA REGLA EN CASL GANA.
       *
       * CASOS DE USO:
       * - Sanción: Usuario editor que temporalmente no puede borrar posts
       * - Restricción: Usuario admin que no puede acceder a ciertos recursos
       *
       * .because() - Añade razón de la restricción (opcional pero recomendado)
       */
      user.directPermissions
        .filter((dp) => dp.inverted)
        .forEach((dp) => {
          cannot(
            dp.permission.action,
            dp.permission.subject,
            parseConditions(dp.permission.conditions, user),
          ).because(dp.reason ?? '');
        });
    }

    /**
     * build() - Compila todas las reglas en un objeto Ability inmutable.
     *
     * detectSubjectType: Función que extrae el nombre del subject de un objeto.
     * Usamos constructor.name porque nuestros wrappers (Post, User) son clases.
     */
    return build({
      detectSubjectType: (item) =>
        (item as object).constructor.name as ExtractSubjectType<Subjects>,
    });
  }
}
