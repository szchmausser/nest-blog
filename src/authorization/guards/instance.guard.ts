/**
 * ============================================================================
 * @file instance.guard.ts
 * @description Guard que verifica permisos CASL sobre una instancia específica.
 * @classification TRONCAL - Guard principal para endpoints con ownership.
 * @module AuthorizationModule
 * ============================================================================
 *
 * PROPÓSITO:
 * Guard reutilizable que automatiza la verificación de permisos CASL sobre un
 * recurso específico (instancia). Carga el recurso desde la BD.
 *
 * ANTES LLAMADO: ResourceOwnershipGuard
 *
 * FLUJO DE EJECUCIÓN:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                       InstanceGuard.canActivate()                       │
 * │                                                                         │
 * │  1. Obtener usuario del request (inyectado por JwtAuthGuard)            │
 * │     └── Si no hay usuario → UnauthorizedException (401)                 │
 * │                                                                         │
 * │  2. Extraer metadata de @CheckInstance()                                │
 * │     └── action, subject, resourceIdParam                                │
 * │                                                                         │
 * │  3. Obtener ID del recurso desde params                                 │
 * │                                                                         │
 * │  4. Cargar permisos del usuario (AuthorizationService)                  │
 * │                                                                         │
 * │  5. Cargar RECURSO INSTANCIA (ResourceLoader)                           │
 * │     └── Si recurso no existe → NotFoundException (404)                  │
 * │                                                                         │
 * │  6. Construir Ability y evaluar permiso sobre la INSTANCIA              │
 * │     └── ability.can(action, instanceWrapper)                            │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * EVALUACIÓN DE CONDICIONES:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Este guard EVALÚA las condiciones ABAC del permiso.                     │
 * │                                                                         │
 * │ • UN permiso con múltiples campos en conditions → AND                   │
 * │   Ejemplo: {"authorId": "{{id}}", "isPublished": true}                  │
 * │   Resultado: Solo recursos propios Y publicados                         │
 * │                                                                         │
 * │ • MÚLTIPLES permisos con misma acción/subject → OR                      │
 * │   Ejemplo: Usuario con dos permisos update:Post                         │
 * │     - Permiso A: {"authorId": "{{id}}"}                                 │
 * │     - Permiso B: {"isPublished": true}                                  │
 * │   Resultado: Recursos propios O cualquier publicado                     │
 * │                                                                         │
 * │ Ver: src/authorization/docs/guards-usage.md para más detalles           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * USO:
 * ```typescript
 * @Patch(':id')
 * @UseGuards(InstanceGuard)
 * @CheckInstance({ action: ActionEnum.update, subject: 'User' })
 * update(@Param('id') id: number) { ... }
 * ```
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector, ModuleRef } from '@nestjs/core';
import { Request } from 'express';
import { CaslAbilityFactory, User, Post } from '../casl/casl-ability.factory';
import { AuthorizationService } from '../authorization.service';
import type { UserPayload } from 'src/authentication/interfaces/user-payload.interface';
import { ActionEnum } from 'generated/prisma/client';
import { ResourceLoader } from '../interfaces/resource-loader.interface';

// ============================================================================
// METADATA KEY Y TIPOS
// ============================================================================

export const CHECK_INSTANCE_KEY = 'check_instance';

export interface InstanceMetadata {
  action: ActionEnum;
  subject: 'User' | 'Post' | 'Comment';
  resourceIdParam?: string; // Nombre del parámetro (default: 'id')
  loadResource?: boolean; // Si debe cargar el recurso desde BD
}

// ============================================================================
// GUARD
// ============================================================================

@Injectable()
export class InstanceGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private moduleRef: ModuleRef,
    private caslAbilityFactory: CaslAbilityFactory,
    private authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Obtener usuario
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: UserPayload }>();
    const userPayload = request.user;

    if (!userPayload) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    // 2. Obtener metadata de @CheckInstance
    const instanceMetadata = this.reflector.get<InstanceMetadata>(
      CHECK_INSTANCE_KEY,
      context.getHandler(),
    );

    if (!instanceMetadata) {
      throw new Error('InstanceGuard requiere el decorador @CheckInstance()');
    }

    const {
      action,
      subject,
      resourceIdParam = 'id',
      loadResource = true,
    } = instanceMetadata;

    // 3. Obtener ID del recurso
    const resourceId = Number(request.params[resourceIdParam]);
    if (isNaN(resourceId)) {
      throw new ForbiddenException('ID de recurso inválido');
    }

    // 4. Cargar permisos del usuario
    const user = await this.authorizationService.getUserWithPermissions(
      userPayload.id,
    );
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    // 5. Construir Ability
    const ability = this.caslAbilityFactory.createAbility(new User(user));

    // 6. Cargar recurso INSTANCIA
    const targetResource = await this.getTargetResource(
      subject,
      resourceId,
      loadResource,
      context,
    );

    // 7. Evaluar permiso
    const hasPermission = ability.can(action, targetResource);

    if (!hasPermission) {
      throw new ForbiddenException(
        `No tienes permiso para ${action} este ${subject} específico`,
      );
    }

    return true;
  }

  // ... (Métodos privados getTargetResource, getResourceLoader, createResourceInstance se mantienen igual pero con lógica Wrapper)

  private async getTargetResource(
    subject: string,
    resourceId: number,
    loadResource: boolean,
    context: ExecutionContext,
  ): Promise<User | Post> {
    if (!loadResource) {
      return this.createResourceInstance(subject, { id: resourceId });
    }

    const loader = await this.getResourceLoader(context);
    if (!loader) {
      throw new Error(
        `No se encontró ResourceLoader para ${subject} (InstanceGuard).`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const resource = await loader.loadResourceForAuthorization(resourceId);

    if (!resource) {
      throw new NotFoundException(`${subject} no encontrado`);
    }

    return this.createResourceInstance(subject, resource);
  }

  private async getResourceLoader(
    context: ExecutionContext,
  ): Promise<ResourceLoader | null> {
    try {
      const controller = context.getClass();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const controllerInstance = await this.moduleRef.resolve(controller);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      for (const key of Object.keys(controllerInstance)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const service = controllerInstance[key];
        if (
          service &&
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          typeof service.loadResourceForAuthorization === 'function'
        ) {
          return service as ResourceLoader;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private createResourceInstance(subject: string, data: any): User | Post {
    switch (subject) {
      case 'User':
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return new User(data);
      case 'Post':
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return new Post(data);
      default:
        throw new Error(`Subject no soportado en InstanceGuard: ${subject}`);
    }
  }
}
