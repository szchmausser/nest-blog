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
 * DEPENDENCIAS:
 * - DRIZZLE_DB: Cliente Drizzle inyectado directamente.
 * - CaslAbilityFactory: Para construir Abilities (usado en verifyPostAccess).
 * - Types: User, Post, ActionEnum de src/database/types.
 *
 * ============================================================================
 */

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { ActionEnum } from 'src/database/types';
import { DRIZZLE_DB } from 'src/database/database.module';
import type { DrizzleDB } from 'src/database/database.module';
import { CaslAbilityFactory, User, Post } from './casl/casl-ability.factory';
import { UserWithPermissions } from 'src/database/types';
import { users, userRoles, userPermissions, posts } from 'src/database/schemas';
import { eq, and, isNull, gt, or } from 'drizzle-orm';

@Injectable()
export class AuthorizationService {
  /**
   * Constructor con inyección de dependencias.
   *
   * @param db - Cliente Drizzle inyectado directamente.
   * @param caslAbilityFactory - Fábrica para construir Abilities.
   */
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
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
   */
  async getUserWithPermissions(
    userId: number,
  ): Promise<UserWithPermissions | null> {
    const now = new Date();

    const user = await this.db.query.users.findFirst({
      where: and(
        eq(users.id, userId),
        eq(users.isActive, true),
        isNull(users.deletedAt),
      ),
      columns: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
      with: {
        // Roles y sus permisos
        roles: {
          where: or(isNull(userRoles.expiresAt), gt(userRoles.expiresAt, now)),
          with: {
            role: {
              with: {
                permissions: {
                  with: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        // Permisos directos
        directPermissions: {
          where: or(
            isNull(userPermissions.expiresAt),
            gt(userPermissions.expiresAt, now),
          ),
          with: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Filtrar los roles donde el rol asociado sea nulo o esté inactivo
    const validRoles = user.roles.filter(
      (ur) => ur.role !== null && ur.role.isActive === true,
    );

    // Drizzle devuelve la estructura anidada, pero necesitamos transformarla ligeramente
    // para que coincida exactamente con UserWithPermissions si es necesario,
    // aunque la estructura de 'with' es muy cercana.
    return {
      ...user,
      roles: validRoles,
    } as unknown as UserWithPermissions;
  }

  // ==========================================================================
  // MÉTODOS DE VERIFICACIÓN (Ejemplos de uso avanzado)
  // ==========================================================================

  /**
   * verifyPostAccess
   * ================
   * Verifica el acceso ABAC sobre un Post específico.
   *
   * @param userId - ID del usuario que intenta acceder.
   * @param postId - ID del post objetivo.
   * @param action - Acción a realizar (read, update, delete, etc.).
   * @returns Objeto con detalles de la verificación exitosa.
   * @throws NotFoundException si el post no existe.
   * @throws ForbiddenException si el usuario no tiene permiso.
   */
  async verifyPostAccess(userId: number, postId: number, action: ActionEnum) {
    // Paso 1: Cargar el recurso
    const post = await this.db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });

    if (!post) {
      throw new NotFoundException(`Post con ID ${postId} no encontrado`);
    }

    const postResultData = post;

    // Paso 2: Cargar usuario con permisos
    const user = await this.getUserWithPermissions(userId);

    if (!user) {
      throw new ForbiddenException('Usuario no encontrado o inactivo');
    }

    // Paso 3: Construir Ability
    const userWrapper = new User(user);
    const ability = this.caslAbilityFactory.createAbility(userWrapper);

    // Paso 4: Evaluar permiso
    const postWrapper = new Post(postResultData);
    const canPerformAction = ability.can(action, postWrapper);

    if (!canPerformAction) {
      throw new ForbiddenException({
        message: `No tienes permiso para ${action} este post`,
        details: {
          action,
          postId: postResultData.id,
          postAuthorId: postResultData.authorId,
          userId: user.id,
          reason:
            postResultData.authorId !== user.id
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
        post: {
          id: postResultData.id,
          title: postResultData.title,
          authorId: postResultData.authorId,
        },
        isOwner: postResultData.authorId === user.id,
      },
    };
  }
}
