/**
 * ============================================================================
 * @file authorization.service.ts
 * @description Servicio para gestión de permisos y carga de datos de autorización.
 * @classification TRONCAL - Servicio principal de datos de permisos.
 * @module AuthorizationModule
 * ============================================================================
 *
 * PROPÓSITO:
 * Este servicio encapsula la lógica de acceso a datos relacionada con permisos.
 * Su responsabilidad principal es cargar usuarios con su jerarquía completa
 * de permisos para que CaslAbilityFactory pueda construir el Ability.
 *
 * DIAGRAMA DE USO:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                          FLUJO DE DATOS                                 │
 * │                                                                         │
 * │  Guard (InstanceGuard / GlobalGuard)                                    │
 * │    │                                                                    │
 * │    ▼                                                                    │
 * │  AuthorizationService.getUserWithPermissions(userId)                    │
 * │    │                                                                    │
 * │    ▼                                                                    │
 * │  Prisma Query con múltiples includes                                    │
 * │    │  ┌─ roles[] (filtrados por activo y no expirados)                  │
 * │    │  │    └─ role.permissions[]                                        │
 * │    │  │         └─ permission (action, subject, conditions)             │
 * │    │  └─ directPermissions[] (filtrados por no expirados)               │
 * │    │       └─ permission + inverted + reason                            │
 * │    ▼                                                                    │
 * │  Retorna usuario con permisos completos                                 │
 * │    │                                                                    │
 * │    ▼                                                                    │
 * │  CaslAbilityFactory.createAbility(user)                                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * DEPENDENCIAS:
 * - DatabaseService: Acceso a Prisma (debe estar configurado).
 * - CaslAbilityFactory: Para construir Abilities (usado en verifyPostAccess).
 * - Prisma types: User, Post, ActionEnum.
 *
 * PARA REPLICAR EN OTRO PROYECTO:
 * 1. Copiar este archivo.
 * 2. Asegurarse de tener DatabaseService configurado.
 * 3. Ajustar el query de getUserWithPermissions() si tu schema difiere.
 * 4. Añadir métodos verify* para otros recursos si es necesario.
 *
 * ============================================================================
 */

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ActionEnum } from 'generated/prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { CaslAbilityFactory, User, Post } from './casl/casl-ability.factory';
import { Prisma } from 'generated/prisma/client';

export const userWithPermissionsSelect = {
  // NIVEL 1: Usuario
  id: true,
  name: true,
  email: true,
  isActive: true,

  // NIVEL 2: Relación UserRole
  roles: {
    where: {
      role: { isActive: true },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      assignedAt: true,
      expiresAt: true,
      // NIVEL 3: Relación Role
      role: {
        select: {
          name: true,
          description: true,
          isActive: true, // Importante para lógica de negocio
          // NIVEL 4: Relación RolePermission
          permissions: {
            select: {
              // NIVEL 5: Relación Permission
              permission: {
                select: {
                  action: true,
                  subject: true,
                  description: true,
                  conditions: true,
                },
              },
            },
          },
        },
      },
    },
  },

  // NIVEL 2 (Rama B): Permisos Directos
  directPermissions: {
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      inverted: true,
      reason: true,
      assignedAt: true,
      expiresAt: true,
      permission: {
        select: {
          action: true,
          subject: true,
          description: true,
          conditions: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

export type UserWithPermissions = Prisma.UserGetPayload<{
  select: typeof userWithPermissionsSelect;
}>;

@Injectable()
export class AuthorizationService {
  /**
   * Constructor con inyección de dependencias.
   *
   * @param prisma - Servicio de base de datos (Prisma).
   * @param caslAbilityFactory - Fábrica para construir Abilities.
   */
  constructor(
    private prisma: DatabaseService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  // ==========================================================================
  // MÉTODOS PRINCIPALES
  // ==========================================================================

  /**
   * getUserWithPermissions
   * ======================
   * Carga un usuario con toda su jerarquía de permisos desde la base de datos.
   *
   * FILTROS APLICADOS:
   * 1. Usuario activo (isActive: true)
   * 2. Usuario no eliminado (deletedAt: null)
   * 3. Roles activos y no expirados
   * 4. Permisos directos no expirados
   *
   * @param userId - ID del usuario a cargar.
   * @returns Usuario con roles y permisos, o null si no existe/está inactivo.
   *
   * ESTRUCTURA RETORNADA:
   * ```typescript
   * {
   *   id: number,
   *   email: string,
   *   roles: [{
   *     role: {
   *       permissions: [{
   *         permission: { action, subject, conditions }
   *       }]
   *     }
   *   }],
   *   directPermissions: [{
   *     permission: { action, subject, conditions },
   *     inverted: boolean,
   *     reason: string | null
   *   }]
   * }
   * ```
   *
   * OPTIMIZACIÓN:
   * Este query hace múltiples JOINs. En sistemas de alto tráfico,
   * considerar cachear el resultado por unos segundos.
   */
  async getUserWithPermissions(userId: number) {
    return await this.prisma.user.findFirst({
      where: { id: userId, isActive: true, deletedAt: null },
      select: userWithPermissionsSelect,
    });
  }

  /* Cada vez que abres un par de llaves { ... } dentro de un include,
  te teletransportas a la tabla relacionada y desde ese momento "estás parado" allí.
  Todo lo que pidas dentro, debe existir en ese modelo nuevo.

  Hagamos el recorrido de tu "mapa de salto" línea por línea:

  El Viaje de la Consulta:
  
  Inicio: Estás en User. Seleccionas el usuario por su ID, activo y no eliminado.
  Escribes include: { roles: ... }.
  Salto: Te mueves a la tabla intermedia UserRole.
  
  Punto de vista: UserRole
  Aquí es donde aplicas el filtro where (fecha, activo, etc.).
  Miras a tu alrededor (en el schema.prisma de UserRole) y ves que hay una relación llamada role.
  Escribes include: { role: ... }.
  Salto: Te mueves a la tabla Role.
  
  Punto de vista: Role
  Ahora estás parado en el Rol (ej. "ADMIN").
  Miras el esquema de Role y ves que tiene permissions (que apunta a RolePermission).
  Escribes include: { permissions: ... }.
  Salto: Te mueves a la tabla intermedia RolePermission.
  
  Punto de vista: RolePermission
  Estás en la tabla que conecta roles con permisos.
  Miras el esquema y ves el campo permission (el permiso real).
  Escribes include: { permission: true }.
  Salto: Te mueves a la tabla Permission.
  
  Punto de vista: Permission
  Fin: Estás en Permission.
  Pones true porque ya llegaste al tesoro y quieres los datos de esa tabla.
  
  -----------------------------------------------------------------------
  MAPA JERÁRQUICO DE RELACIONES (Modelo Actual → Relación → Nuevo Modelo)
  -----------------------------------------------------------------------
  
  [User] (Modelo Actual)
  │
  ├── Relación: .roles -> nos lleva a cambiar el punto de vista a UserRole
  │   ↓
  │   [UserRole] (Nuevo Modelo Actual)
  │   │
  │   ├── Relación: .role -> nos lleva a cambiar el punto de vista a Role
  │   │   ↓
  │   │   [Role] (Nuevo Modelo Actual)
  │   │   │
  │   │   ├── Relación: .permissions -> nos lleva a cambiar el punto de vista a RolePermission
  │   │   │   ↓
  │   │   │   [RolePermission] (Nuevo Modelo Actual)
  │   │   │   │
  │   │   │   └── Relación: .permission -> nos lleva a cambiar el punto de vista a Permission
  │   │   │       ↓
  │   │   │       [Permission] (Modelo Final)
  │
  └── Relación: .directPermissions
      ↓
      [UserPermission] (Nuevo Modelo Actual)
      │
      └── Relación: .permission -> nos lleva a cambiar el punto de vista a Permission
          ↓
          [Permission] (Modelo Final)
  
  Si en el paso 3 (estando en Role) intentaras hacer include: { email: true }, fallaría, porque Role no tiene email.
  El modelo mental de "dónde estoy parado" es infalible para no perderse en queries anidadas. */

  // ==========================================================================
  // MÉTODOS DE VERIFICACIÓN (Ejemplos de uso avanzado)
  // ==========================================================================

  /**
   * verifyPostAccess
   * ================
   * Verifica el acceso ABAC sobre un Post específico.
   *
   * NOTA: Este método es un EJEMPLO de cómo combinar todos los componentes.
   * En la práctica, ResourceOwnershipGuard hace esto automáticamente.
   *
   * FLUJO:
   * 1. Cargar el Post desde la BD
   * 2. Cargar el Usuario con permisos
   * 3. Construir Ability
   * 4. Evaluar permiso con ability.can()
   *
   * @param userId - ID del usuario que intenta acceder.
   * @param postId - ID del post objetivo.
   * @param action - Acción a realizar (read, update, delete, etc.).
   * @returns Objeto con detalles de la verificación exitosa.
   * @throws NotFoundException si el post no existe.
   * @throws ForbiddenException si el usuario no tiene permiso.
   *
   * @example
   * // Verificar si usuario 5 puede editar post 10
   * await authorizationService.verifyPostAccess(5, 10, ActionEnum.update);
   */
  async verifyPostAccess(userId: number, postId: number, action: ActionEnum) {
    // Paso 1: Cargar el recurso
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException(`Post con ID ${postId} no encontrado`);
    }

    // Paso 2: Cargar usuario con permisos
    const user = await this.getUserWithPermissions(userId);

    if (!user) {
      throw new ForbiddenException('Usuario no encontrado o inactivo');
    }

    // Paso 3: Construir Ability
    // Envolvemos el usuario en la clase wrapper para CASL
    // AHORA TIPO SEGURO: Usamos el tipo estricto UserWithPermissions
    const userWrapper = new User(user);
    const ability = this.caslAbilityFactory.createAbility(userWrapper);

    // Paso 4: Evaluar permiso
    // Envolvemos el post en la clase wrapper para que CASL detecte el subject
    const postWrapper = new Post(post);
    const canPerformAction = ability.can(action, postWrapper);

    if (!canPerformAction) {
      throw new ForbiddenException({
        message: `No tienes permiso para ${action} este post`,
        details: {
          action,
          postId: post.id,
          postAuthorId: post.authorId,
          userId: user.id,
          reason:
            post.authorId !== user.id
              ? 'No eres el autor de este post'
              : 'Permiso denegado por política de seguridad',
        },
      });
    }

    // Paso 5: Retornar éxito con detalles
    return {
      success: true,
      verification: {
        action,
        allowed: true,
        user: { id: user.id, email: user.email },
        post: { id: post.id, title: post.title, authorId: post.authorId },
        isOwner: post.authorId === user.id,
      },
    };
  }
}
