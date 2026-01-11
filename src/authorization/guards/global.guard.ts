/**
 * ============================================================================
 * @file global.guard.ts
 * @description Guard de NestJS que evalúa políticas globales (sin instancia).
 * @classification SECUNDARIO - Para reglas que no dependen de un ID.
 * @module AuthorizationModule
 * ============================================================================
 *
 * PROPÓSITO:
 * Guard que evalúa políticas declarativas generales.
 * Ideal para "Crear", "Listar todos", "Panel Admin".
 *
 * ANTES LLAMADO: PoliciesGuard
 *
 * FLUJO DE EJECUCIÓN:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                       GlobalGuard.canActivate()                         │
 * │                                                                         │
 * │  1. Extraer PolicyHandlers del decorador @CheckGlobal()                 │
 * │                                                                         │
 * │  2. Obtener usuario del request y cargar sus permisos                   │
 * │                                                                         │
 * │  3. Construir Ability (CaslAbilityFactory)                              │
 * │                                                                         │
 * │  4. Ejecutar handlers (sin cargar recursos de BD)                       │
 * │     └── handler(ability) -> boolean                                     │
 * │                                                                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠️ IMPORTANTE - CONDICIONES NO EVALUADAS:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Este guard NO evalúa condiciones ABAC porque no carga instancias.       │
 * │                                                                         │
 * │ Si un permiso tiene conditions: {"id": "{{id}}"}, este guard            │
 * │ lo tratará como si NO tuviera condiciones (siempre permitido).          │
 * │                                                                         │
 * │ CONSECUENCIA:                                                           │
 * │ - Mismo permiso con InstanceGuard → Solo recursos propios               │
 * │ - Mismo permiso con GlobalGuard  → Cualquier recurso                    │
 * │                                                                         │
 * │ USAR SOLO PARA:                                                         │
 * │ - Crear recursos (POST sin :id)                                         │
 * │ - Listar recursos (GET sin :id)                                         │
 * │ - Acceso a paneles/dashboards                                           │
 * │                                                                         │
 * │ Ver: src/authorization/docs/guards-usage.md para más detalles           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * USO:
 * ```typescript
 * @Post()
 * @UseGuards(GlobalGuard)
 * @CheckGlobal((ability) => ability.can('create', 'Post'))
 * create() { ... }
 * ```
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  CaslAbilityFactory,
  AppAbility,
  User,
} from '../casl/casl-ability.factory';
import { AuthorizationService } from '../authorization.service';
import { CHECK_GLOBAL_KEY } from '../decorators/check-global.decorator';
import { PolicyHandler } from '../interfaces/policy-handler.interface';
import { RequestWithUser } from '../interfaces/request-with-user.interface';
import { UserPayload } from '../../authentication/interfaces/user-payload.interface';

@Injectable()
export class GlobalGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
    private authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers =
      this.reflector.get<PolicyHandler[]>(
        CHECK_GLOBAL_KEY,
        context.getHandler(),
      ) || [];

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const userPayload: UserPayload | undefined = request.user;

    if (!userPayload) return false;

    const user = await this.authorizationService.getUserWithPermissions(
      userPayload.id,
    );

    if (!user) return false;

    const ability = this.caslAbilityFactory.createAbility(new User(user));

    const isAllowed = policyHandlers.every((handler) =>
      this.execPolicyHandler(handler, ability),
    );

    if (!isAllowed) {
      throw new ForbiddenException(
        'No tienes permiso global para realizar esta acción',
      );
    }

    return true;
  }

  private execPolicyHandler(handler: PolicyHandler, ability: AppAbility) {
    if (typeof handler === 'function') {
      return handler(ability);
    }
    return handler.handle(ability);
  }
}
