/**
 * ============================================================================
 * @file check-global.decorator.ts
 * @description Decorador para declarar políticas GLOBALES.
 * @classification DEPENDENCIA - Usado por GlobalGuard.
 * @module AuthorizationModule
 * ============================================================================
 *
 * ANTES LLAMADO: @CheckPolicies
 *
 * PROPÓSITO:
 * Define reglas generales (no ligadas a un ID de recurso específico).
 * Funciona en par con GlobalGuard.
 *
 * @example
 * @CheckGlobal((ability) => ability.can('create', 'Post'))
 */

import { SetMetadata } from '@nestjs/common';
import { PolicyHandler } from '../interfaces/policy-handler.interface';

export const CHECK_GLOBAL_KEY = 'check_global';

/**
 * CheckGlobal
 * ===========
 * Decorador para validación de políticas globales.
 *
 * @param handlers - Funciones o clases que definen la política.
 */
export const CheckGlobal = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_GLOBAL_KEY, handlers);
