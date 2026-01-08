/**
 * ============================================================================
 * @file check-instance.decorator.ts
 * @description Decorador para especificar permisos sobre una INSTANCIA.
 * @classification DEPENDENCIA - Usado por InstanceGuard.
 * @module AuthorizationModule
 * ============================================================================
 *
 * ANTES LLAMADO: @CheckAbility
 *
 * PROPÓSITO:
 * Define qué acción y sobre qué recurso se debe validar la propiedad/acceso.
 * Funciona en par con InstanceGuard.
 *
 * @example
 * @CheckInstance({ action: ActionEnum.update, subject: 'User' })
 */

import { SetMetadata } from '@nestjs/common';
import { CHECK_INSTANCE_KEY, InstanceMetadata } from '../guards/instance.guard';

/**
 * CheckInstance
 * =============
 * Decorador para validación de instancias específicas.
 *
 * @param metadata - Configuración { action, subject, ... }
 */
export const CheckInstance = (metadata: InstanceMetadata) =>
  SetMetadata(CHECK_INSTANCE_KEY, metadata);
