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
      where: {
        id: userId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        // Roles asignados al usuario
        roles: {
          where: {
            // Solo roles activos
            role: { isActive: true },
            // Solo roles no expirados
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          include: {
            role: {
              include: {
                // Permisos de cada rol
                permissions: { include: { permission: true } },
              },
            },
          },
        },
        // Permisos directos (grants y revokes)
        directPermissions: {
          where: {
            // Solo permisos no expirados
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          include: { permission: true },
        },
      },
    });
  }

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
    const userWrapper = new User(user as Partial<User>);
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
