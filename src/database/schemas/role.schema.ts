import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { userRoles } from './user.schema';
import { permissions } from './permission.schema';

// -----------------------------------------------------------------------------
// ENTIDAD CORE: Rol
// -----------------------------------------------------------------------------

/**
 * Un rol agrupa un conjunto de permisos relacionados lógicamente.
 * Ejemplos: 'ADMIN', 'EDITOR', 'MODERATOR', 'VIEWER', 'GUEST'
 */
export const roles = pgTable(
  'Role',
  {
    id: serial('id').primaryKey(),

    // Identificador único del rol en el sistema (convención: UPPER_SNAKE_CASE)
    name: text('name').notNull().unique(),
    description: text('description'),

    // Permite deshabilitar roles sin eliminar su configuración.
    isActive: boolean('isActive').notNull().default(true),

    // TIMESTAMPS
    createdAt: timestamp('createdAt', {
      precision: 3,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updatedAt', {
      precision: 3,
      mode: 'date',
    })
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('Role_isActive_idx').on(table.isActive)],
);

// -----------------------------------------------------------------------------
// TABLA INTERMEDIA: Rol ↔ Permiso
// -----------------------------------------------------------------------------

/**
 * TABLA PIVOTE: Configura qué permisos atómicos componen cada rol.
 * Esta es la "plantilla" de capacidades que se aplican a los usuarios que poseen el rol.
 */
export const rolePermissions = pgTable(
  'RolePermission',
  {
    roleId: integer('roleId')
      .notNull()
      // RESTRICCIÓN FÍSICA: Bloquea la integridad a nivel de base de datos.
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: integer('permissionId')
      .notNull()
      // RESTRICCIÓN FÍSICA: Importante para evitar roles con permisos inexistentes.
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index('RolePermission_roleId_idx').on(table.roleId),
    index('RolePermission_permissionId_idx').on(table.permissionId),
  ],
);

// RELACIONES LÓGICAS (Drizzle Query API)
// -----------------------------------------------------------------------------

export const rolesRelations = relations(roles, ({ many }) => ({
  // Permisos que componen este rol
  permissions: many(rolePermissions),

  // Usuarios que tienen este rol asignado
  users: many(userRoles),
}));

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    // Relación con Role
    role: one(roles, {
      fields: [rolePermissions.roleId],
      references: [roles.id],
    }),

    // Relación con Permission
    permission: one(permissions, {
      fields: [rolePermissions.permissionId],
      references: [permissions.id],
    }),
  }),
);
