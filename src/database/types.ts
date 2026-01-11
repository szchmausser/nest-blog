import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  users,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  userPermissions,
  posts,
} from './schemas';

// -----------------------------------------------------------------------------
// ENUMS
// -----------------------------------------------------------------------------

/**
 * ENUM: Definiciones de Acción (Que puede hacer el usuario)
 */
export enum ActionEnum {
  manage = 'manage',
  create = 'create',
  read = 'read',
  update = 'update',
  delete = 'delete',
}

/**
 * ENUM: Definiciones de Sujeto (Sobre qué recurso se aplica la acción)
 */
export enum SubjectEnum {
  Post = 'Post',
  User = 'User',
  all = 'all',
}

// -----------------------------------------------------------------------------
// TIPOS DERIVADOS
// -----------------------------------------------------------------------------

/**
 * Tipos de selección (lectura) de las tablas
 */
export type User = InferSelectModel<typeof users>;
export type Role = InferSelectModel<typeof roles>;
export type Permission = InferSelectModel<typeof permissions>;
export type RolePermission = InferSelectModel<typeof rolePermissions>;
export type UserRole = InferSelectModel<typeof userRoles>;
export type UserPermission = InferSelectModel<typeof userPermissions>;
export type Post = InferSelectModel<typeof posts>;

/**
 * Tipos de inserción de las tablas
 */
export type NewUser = InferInsertModel<typeof users>;
export type NewRole = InferInsertModel<typeof roles>;
export type NewPermission = InferInsertModel<typeof permissions>;
export type NewRolePermission = InferInsertModel<typeof rolePermissions>;
export type NewUserRole = InferInsertModel<typeof userRoles>;
export type NewUserPermission = InferInsertModel<typeof userPermissions>;
export type NewPost = InferInsertModel<typeof posts>;

// -----------------------------------------------------------------------------
// TIPOS DERIVADOS COMPLEJOS
// -----------------------------------------------------------------------------

/**
 * Tipo para UserRole con relación Role cargada
 */
export type UserRoleWithRole = UserRole & {
  role: Role & {
    permissions: Array<RolePermission & { permission: Permission }>;
  };
};

/**
 * Tipo para UserPermission con relación Permission cargada
 */
export type UserPermissionWithPermission = UserPermission & {
  permission: Permission;
};

/**
 * Tipo para User con permisos completos (para autorización)
 * Equivalente a Prisma.UserGetPayload con select específico
 */
export type UserWithPermissions = User & {
  roles: Array<UserRoleWithRole>;
  directPermissions: Array<UserPermissionWithPermission>;
};
