# Configuración de Base de Datos con Drizzle ORM

Este documento describe el proceso correcto y replicable para configurar la base de datos usando **únicamente herramientas oficiales de Drizzle ORM**.

## Requisitos Previos

- PostgreSQL instalado y corriendo
- Variable de entorno `DATABASE_URL` configurada en `.env`
- Dependencias instaladas: `pnpm install`

## Proceso de Configuración Inicial

### 1. Generar Migraciones (Opcional)

Si necesitas generar archivos de migración SQL:

```bash
pnpm drizzle-kit generate
```

Este comando genera los archivos de migración SQL en `drizzle/` basándose en el schema definido en `src/database/schema.ts`.

### 2. Aplicar Schema a la Base de Datos

```bash
pnpm drizzle-kit push
```

Este comando usa la herramienta oficial de Drizzle para aplicar el schema directamente a la base de datos. Crea todas las tablas, enums, índices y relaciones.

### 3. Aplicar Seed (Datos Iniciales)

```bash
pnpm db:seed
```

Este comando ejecuta `src/database/seed.ts` que inserta los datos iniciales necesarios para el sistema (usuarios, roles, permisos, etc.).

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm drizzle-kit generate` | Genera archivos de migración SQL desde el schema (comando oficial de Drizzle) |
| `pnpm drizzle-kit push` | Aplica el schema a la base de datos (comando oficial de Drizzle) |
| `pnpm db:seed` | Aplica el seed con datos iniciales |

## Estructura del Proyecto

```
src/database/
├── schema.ts          # Definición del schema de Drizzle
├── relations.ts       # Definición de relaciones
├── types.ts           # Tipos TypeScript derivados
├── seed.ts            # Seed file con datos iniciales
└── database.service.ts # Servicio de base de datos

drizzle/
├── 0000_*.sql         # Migraciones SQL generadas
└── meta/              # Metadatos de migraciones

drizzle.config.ts      # Configuración de Drizzle Kit
```

## Proceso de Despliegue en Nuevo Servidor

Para replicar la base de datos en un nuevo servidor:

1. **Configurar variables de entorno:**
   ```bash
   # .env
   DATABASE_URL="postgresql://usuario:password@host:puerto/database"
   ```

2. **Aplicar schema:**
   ```bash
   pnpm drizzle-kit push
   ```

3. **Aplicar seed:**
   ```bash
   pnpm db:seed
   ```


## Migraciones Futuras

Cuando necesites modificar el schema:

1. Edita `src/database/schema.ts`
2. (Opcional) Genera la migración: `pnpm drizzle-kit generate`
3. (Opcional) Revisa el archivo SQL generado en `drizzle/`
4. Aplica el schema: `pnpm drizzle-kit push`

## Seed File

El archivo `src/database/seed.ts` contiene todos los datos iniciales necesarios:
- Usuarios del sistema
- Roles y permisos
- Relaciones entre usuarios y roles
- Configuraciones iniciales

**Importante:** Este archivo debe mantenerse actualizado con los datos que necesitas en cada entorno.

## Notas Importantes

- ✅ **Solo se usan herramientas oficiales de Drizzle** (`pnpm drizzle-kit`)
- ✅ **No hay dependencias de Prisma** - La base de datos está completamente limpia
- ✅ **Proceso replicable** - Funciona en cualquier servidor siguiendo los mismos pasos
- ✅ **Seed file mantenible** - Los datos iniciales están en TypeScript, fácil de modificar

## Troubleshooting

### Error: "schema" parameter not recognized
- **Solución:** Asegúrate de que `DATABASE_URL` no tenga el parámetro `?schema=public`. El driver `postgres` no lo reconoce.

### Error: Tablas ya existen
- **Solución:** Elimina manualmente las tablas existentes o recrea la base de datos antes de aplicar el schema con `pnpm drizzle-kit push`.

### Error: Secuencias de IDs incorrectas
- **Solución:** El seed file resetea automáticamente las secuencias. Si necesitas hacerlo manualmente, consulta el código en `src/database/seed.ts`.
