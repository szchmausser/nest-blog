# Migración de Prisma a Drizzle ORM

## Resumen
Migración completa del proyecto de Prisma ORM a Drizzle ORM para resolver problemas de compatibilidad con arquitecturas ARM32 (Android/Termux). Drizzle es una solución TypeScript pura sin binarios nativos, compatible con todas las arquitecturas.

## Cambios Principales

### Dependencias
- ✅ Agregado: `drizzle-orm`, `drizzle-kit`, `postgres`
- ❌ Eliminado: `@prisma/client`, `@prisma/adapter-pg`, `prisma`, `@casl/prisma`

### Estructura de Base de Datos
- **Nuevo**: `src/database/schema.ts` - Schema de Drizzle (equivalente a schema.prisma)
- **Nuevo**: `src/database/relations.ts` - Definición de relaciones usando `relations()`
- **Nuevo**: `src/database/types.ts` - Tipos derivados, enums TypeScript, y helpers
- **Nuevo**: `drizzle.config.ts` - Configuración de Drizzle Kit
- **Eliminado**: `prisma/schema.prisma`
- **Eliminado**: `prisma.config.ts`
- **Eliminado**: `generated/prisma/` (directorio completo)

### Servicios Actualizados
- **DatabaseService**: Reescrito completamente - ya no extiende PrismaClient, usa cliente Drizzle
- **UserService**: Convertido a queries de Drizzle usando Query Builder SQL-like
- **AuthorizationService**: Query complejo reescrito con JOINs manuales usando Query Builder
- **AllExceptionsFilter**: Actualizado para manejar errores de PostgreSQL en lugar de Prisma

### Tipos y Enums
- Convertidos enums de Prisma a enums TypeScript (`ActionEnum`, `SubjectEnum`)
- Creados tipos derivados manualmente usando `InferSelectModel`, `InferInsertModel`
- Actualizados todos los imports de tipos en guards, controllers, y servicios

### Patrones Adoptados ("The Drizzle Way")
- Schema definido en TypeScript en lugar de archivo `.prisma`
- Relaciones definidas separadamente usando `relations()`
- Queries usando Query Builder SQL-like con JOINs explícitos
- Tipos inferidos directamente desde TypeScript
- Manejo de errores nativo de PostgreSQL

## Archivos Modificados
- `src/database/database.service.ts` - Reescrito completamente
- `src/user/user.service.ts` - Queries convertidas a Drizzle
- `src/authorization/authorization.service.ts` - Query complejo reescrito
- `src/authorization/casl/casl-ability.factory.ts` - Imports y tipos actualizados
- `src/common/filters/http-exception.filter.ts` - Manejo de errores de PostgreSQL
- `src/authorization/guards/instance.guard.ts` - Imports actualizados
- `src/user/user.controller.ts` - Imports actualizados
- `src/authorization/authorization.module.ts` - Documentación actualizada
- `src/app.module.ts` - Comentarios actualizados
- `package.json` - Dependencias actualizadas

## Archivos Nuevos
- `src/database/schema.ts`
- `src/database/relations.ts`
- `src/database/types.ts`
- `drizzle.config.ts`

## Archivos Eliminados
- `prisma/schema.prisma`
- `prisma.config.ts`
- `prisma/` (directorio completo con migrations)
- `generated/prisma/` (directorio completo)

## Beneficios
- ✅ Compatible con arquitecturas ARM32/ARM64 (Android/Termux)
- ✅ Sin binarios nativos (TypeScript puro)
- ✅ Tipos seguros en tiempo de compilación
- ✅ Sintaxis más cercana a SQL (mayor control)
- ✅ Mejor rendimiento en muchos casos

## Notas Técnicas
- CASL no requiere cambios (usa objetos planos, compatible con Drizzle)
- Las migraciones futuras se manejan con `drizzle-kit push` o `drizzle-kit generate`
- El campo JSON `conditions` se mantiene como `jsonb` en PostgreSQL
- Se usa Query Builder SQL-like para queries (más explícito y controlable)
