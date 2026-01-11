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
import { posts } from './post.schema';
import { roles } from './role.schema';
import { permissions } from './permission.schema';

// -----------------------------------------------------------------------------
// ENTIDAD CORE: Usuario
// -----------------------------------------------------------------------------

/**
 * Representa cualquier actor del sistema que requiera autenticación y autorización.
 * Un usuario puede estar activo, inactivo o soft-deleted.
 */
export const users = pgTable(
  'User',
  {
    id: serial('id').primaryKey(),

    // Identificador único para autenticación
    email: text('email').notNull().unique(),

    // Información básica del usuario
    name: text('name').notNull(),

    password: text('password').notNull(),

    // CONTROL DE ACCESO
    // Permite deshabilitar el acceso sin eliminar datos históricos.
    isActive: boolean('isActive').notNull().default(true),
    deactivatedAt: timestamp('deactivatedAt', { precision: 3, mode: 'date' }),
    deactivationReason: text('deactivationReason'),

    // Soft delete: Marca de tiempo de eliminación lógica.
    deletedAt: timestamp('deletedAt', { precision: 3, mode: 'date' }),

    // TIMESTAMPS DE AUDITORÍA
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
    // ÚLTIMO ACCESO: Útil para auditoría y seguridad.
    lastLoginAt: timestamp('lastLoginAt', { precision: 3, mode: 'date' }),
  },
  (table) => [
    // ÍNDICES: Optimizan consultas frecuentes por email y filtrado de usuarios activos/eliminados.
    index('User_email_isActive_idx').on(table.email, table.isActive),
    index('User_deletedAt_idx').on(table.deletedAt),
  ],
);

// -----------------------------------------------------------------------------
// TABLA INTERMEDIA: Usuario ↔ Rol
// -----------------------------------------------------------------------------

/**
 * Relación muchos-a-muchos con metadatos de auditoría y control temporal.
 * FLUJO DE HERENCIA: User → UserRole → Role → RolePermission → Permission
 */
export const userRoles = pgTable(
  'UserRole',
  {
    userId: integer('userId')
      .notNull()
      // RESTRICCIÓN FÍSICA (SQL): Garantiza que el usuario exista en la DB.
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: integer('roleId')
      .notNull()
      // RESTRICCIÓN FÍSICA (SQL): Garantiza que el rol exista en la DB.
      .references(() => roles.id, { onDelete: 'cascade' }),
    // NOTA: La definición de FK física permite que la DB maneje la integridad.

    // AUDITORÍA: ¿Quién, Cuándo?
    assignedAt: timestamp('assignedAt', {
      precision: 3,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
    assignedBy: integer('assignedBy').references(() => users.id, {
      onDelete: 'set null',
    }),

    // TEMPORALIDAD DEL ROL (Sanciones/Membresías):
    // Un usuario puede tener un rol asignado solo hasta cierto momento.
    // Llegada esta fecha, el rol deja de tener efecto en las habilidades del usuario.
    expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index('UserRole_userId_idx').on(table.userId),
    index('UserRole_roleId_idx').on(table.roleId),
    index('UserRole_expiresAt_idx').on(table.expiresAt),
    index('UserRole_assignedBy_idx').on(table.assignedBy),
  ],
);

// -----------------------------------------------------------------------------
// TABLA INTERMEDIA: Usuario ↔ Permiso Directo (CLAIMS)
// -----------------------------------------------------------------------------

/**
 * Permisos asignados directamente al usuario, sin pasar por roles.
 * Este es el mecanismo para EXCEPCIONES al modelo de roles.
 *
 * DOS MODOS DE OPERACIÓN:
 * 1. GRANT (inverted: false) - Otorgar Capacidad Extra
 * 2. REVOKE (inverted: true) - Quitar Capacidad Heredada
 */
export const userPermissions = pgTable(
  'UserPermission',
  {
    userId: integer('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    permissionId: integer('permissionId')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    // La referencia a permissions.id se hará en permission.schema.ts

    // CONTROL DE EFECTO: Grant vs Revoke
    inverted: boolean('inverted').notNull().default(false),

    // AUDITORÍA Y CONTEXTO
    reason: text('reason'),
    assignedAt: timestamp('assignedAt', {
      precision: 3,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
    assignedBy: integer('assignedBy').references(() => users.id, {
      onDelete: 'set null',
    }),

    // TEMPORALIDAD DEL PERMISO: Define la vigencia de esta excepción.
    // Permite otorgar o revocar capacidades por un tiempo limitado. Al expirar,
    // el sistema ignora este registro al calcular los permisos del usuario.
    expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.permissionId] }),
    index('UserPermission_userId_idx').on(table.userId),
    index('UserPermission_permissionId_idx').on(table.permissionId),
    index('UserPermission_inverted_idx').on(table.inverted),
    index('UserPermission_expiresAt_idx').on(table.expiresAt),
    index('UserPermission_assignedBy_idx').on(table.assignedBy),
  ],
);

// RELACIONES LÓGICAS (Drizzle Query API)
// -----------------------------------------------------------------------------
// Estas definiciones NO afectan a la DB física. Permiten navegar entre tablas
// usando db.query.users.findMany({ with: { ... } }).
// -----------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  // Roles asignados a este usuario (herencia de permisos)
  roles: many(userRoles, { relationName: 'UserRoles' }),

  // Roles que este usuario ha asignado a otros (auditoría)
  assignedRoles: many(userRoles, { relationName: 'AssignedRoles' }),

  // Permisos directos asignados a este usuario (excepciones/claims)
  directPermissions: many(userPermissions, {
    relationName: 'UserPermissions',
  }),

  // Permisos que este usuario ha asignado a otros (auditoría)
  assignedPermissions: many(userPermissions, {
    relationName: 'AssignedPermissions',
  }),

  // Posts creados por este usuario
  posts: many(posts),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  // Relación con User
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
    relationName: 'UserRoles',
  }),

  // Relación con Role
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),

  // Relación de auditoría: usuario que asignó este rol
  assignedByUser: one(users, {
    fields: [userRoles.assignedBy],
    references: [users.id],
    relationName: 'AssignedRoles',
  }),
}));

export const userPermissionsRelations = relations(
  userPermissions,
  ({ one }) => ({
    // Relación con User
    user: one(users, {
      fields: [userPermissions.userId],
      references: [users.id],
      relationName: 'UserPermissions',
    }),

    // Relación con Permission
    permission: one(permissions, {
      fields: [userPermissions.permissionId],
      references: [permissions.id],
    }),

    // Relación de auditoría: usuario que asignó este permiso
    assignedByUser: one(users, {
      fields: [userPermissions.assignedBy],
      references: [users.id],
      relationName: 'AssignedPermissions',
    }),
  }),
);
