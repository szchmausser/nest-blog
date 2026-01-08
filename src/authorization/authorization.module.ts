/**
 * ============================================================================
 * @file authorization.module.ts
 * @description Módulo principal de autorización basado en CASL.
 * @classification TRONCAL - Punto de entrada obligatorio del sistema.
 * @module AuthorizationModule
 * ============================================================================
 *
 * PROPÓSITO:
 * Este es el punto de entrada del sistema de autorización. Ensambla todos los
 * componentes (servicios, guards, fábricas) y los expone para que otros módulos
 * puedan importar AuthorizationModule y usar sus capacidades.
 *
 * DEPENDENCIAS EXTERNAS (npm):
 * ```bash
 * npm install @casl/ability @casl/prisma mustache lodash
 * npm install -D @types/mustache @types/lodash
 * ```
 *
 * COMANDOS DE GENERACIÓN:
 * ```bash
 * nest g module authorization
 * nest g service authorization --no-spec
 * ```
 *
 * DIAGRAMA DE RELACIONES:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        AuthorizationModule                              │
 * │                                                                         │
 * │  IMPORTS:                                                               │
 * │    └── DatabaseModule (acceso a Prisma)                                 │
 * │                                                                         │
 * │  PROVIDERS (componentes internos):                                      │
 * │    ├── AuthorizationService    → Carga usuarios con permisos            │
 * │    ├── CaslAbilityFactory      → Construye reglas CASL                  │
 * │    ├── InstanceGuard           → Guard genérico de ownership            │
 * │    ├── GlobalGuard             → Guard para políticas globales          │
 * │                                                                         │
 * │  EXPORTS (disponibles para otros módulos):                              │
 * │    ├── AuthorizationService                                             │
 * │    ├── CaslAbilityFactory                                               │
 * │    ├── InstanceGuard                                                    │
 * │    └── GlobalGuard                                                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * CÓMO USAR EN OTROS MÓDULOS:
 * ```typescript
 *   imports: [AuthorizationModule],  // Importar el módulo
 *   // Ahora puedes usar InstanceGuard / GlobalGuard en controladores
 * })
 * export class UserModule {}
 * ```
 *
 * PARA REPLICAR EN OTRO PROYECTO:
 * 1. Copiar toda la carpeta src/authorization/
 * 2. Asegurarse de tener DatabaseModule configurado
 * 3. Configurar el schema de Prisma con los modelos de permisos
 * 4. Importar AuthorizationModule en AppModule
 *
 * ============================================================================
 */

import { Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';
import { CaslAbilityFactory } from './casl/casl-ability.factory';
import { DatabaseModule } from 'src/database/database.module';
import { InstanceGuard } from './guards/instance.guard';
import { GlobalGuard } from './guards/global.guard';

@Module({
  /**
   * IMPORTS:
   * - DatabaseModule: Provee acceso a Prisma para consultar permisos.
   *   Es necesario porque AuthorizationService hace queries a la BD.
   */
  imports: [DatabaseModule],

  /**
   * PROVIDERS:
   * Componentes que se instancian y gestionan internamente.
   * - AuthorizationService: Carga usuarios con jerarquía de permisos.
   * - CaslAbilityFactory: Construye el objeto Ability con las reglas.
   * - InstanceGuard: Guard reutilizable para validar ownership.
   * - GlobalGuard: Guard para políticas globales.
   */
  providers: [
    AuthorizationService,
    CaslAbilityFactory,
    InstanceGuard,
    GlobalGuard,
  ],

  /**
   * EXPORTS:
   * Componentes disponibles para módulos que importen AuthorizationModule.
   * Al exportarlos, otros módulos pueden:
   * - Usar InstanceGuard/GlobalGuard en sus controladores con @UseGuards()
   * - Inyectar CaslAbilityFactory para construir Abilities manualmente
   * - Inyectar AuthorizationService para cargar permisos de usuarios
   */
  exports: [
    AuthorizationService,
    CaslAbilityFactory,
    InstanceGuard,
    GlobalGuard,
  ],
})
export class AuthorizationModule {}
