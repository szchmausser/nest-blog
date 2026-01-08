-- ============================================================================
-- SEED MANUAL: Sistema de Permisos y Roles
-- ============================================================================
-- Ejecutar este archivo con: psql -U postgres -d nestjs-blog -f prisma/seed-manual.sql
-- O desde pgAdmin: copiar y pegar todo el contenido y ejecutar
-- ============================================================================

-- Limpiar datos existentes (solo para desarrollo)
TRUNCATE TABLE 
    "UserRole", 
    "UserPermission", 
    "RolePermission", 
    "Permission", 
    "Role", 
    "User" 
RESTART IDENTITY CASCADE;

-- ============================================================================
-- PASO 0: Crear Usuarios
-- ============================================================================

INSERT INTO "User" ("email", "name", "password", "isActive", "createdAt", "updatedAt") 
VALUES 
('wewewe@gmail.com', 'Mr. Wewewe', '$2b$10$FWFcaFnXMu7ehV/TlHFNfecadOWX8.EbdqZPcRdOJb3NcsiedC1FS', true, NOW(), NOW()),
('wiwiwi@gmail.com', 'Mr. Wiwiwi', '$2b$10$FWFcaFnXMu7ehV/TlHFNfecadOWX8.EbdqZPcRdOJb3NcsiedC1FS', true, NOW(), NOW());

-- ============================================================================
-- PASO 1: Crear Permisos Atómicos
-- ============================================================================

INSERT INTO "Permission" (action, subject, description, conditions, "createdAt", "updatedAt")
VALUES 
  -- Permiso: Editar usuarios (con condición de ownership)
  (
    'update',
    'User',
    'Puede editar usuarios (solo su propio perfil por defecto)',
    '{"id": "{{id}}"}',
    NOW(),
    NOW()
  ),
  
  -- Permiso: Eliminar usuarios (con condición de ownership)
  (
    'delete',
    'User',
    'Puede eliminar usuarios (solo su propia cuenta por defecto)',
    '{"id": "{{id}}"}',
    NOW(),
    NOW()
  ),
  
  -- Permiso: Leer usuarios (sin condiciones - todos pueden ver perfiles)
  (
    'read',
    'User',
    'Puede ver perfiles de usuarios',
    NULL,
    NOW(),
    NOW()
  ),
  
  -- Permiso: Super Admin (wildcard - acceso total)
  (
    'manage',
    'all',
    'Acceso total al sistema (super administrador)',
    NULL,
    NOW(),
    NOW()
  );

-- ============================================================================
-- PASO 2: Crear Roles
-- ============================================================================

INSERT INTO "Role" (name, description, "isActive", "createdAt", "updatedAt")
VALUES 
  -- Rol: Administrador
  (
    'ADMIN',
    'Administrador con acceso completo al sistema',
    true,
    NOW(),
    NOW()
  ),
  
  -- Rol: Usuario estándar
  (
    'USER',
    'Usuario estándar del sistema con permisos básicos',
    true,
    NOW(),
    NOW()
  );

-- ============================================================================
-- PASO 3: Asignar Permisos a Roles
-- ============================================================================

-- Rol USER: Puede leer, editar y eliminar (con condiciones de ownership)
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r.id, p.id
FROM "Role" r, "Permission" p
WHERE r.name = 'USER'
  AND p.action IN ('read', 'update', 'delete')
  AND p.subject = 'User';

-- Rol ADMIN: Tiene permiso manage:all (acceso total)
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r.id, p.id
FROM "Role" r, "Permission" p
WHERE r.name = 'ADMIN'
  AND p.action = 'manage'
  AND p.subject = 'all';

-- ============================================================================
-- PASO 4: Asignar rol ADMIN al Usuario 1 - Asignar Rol USER a todos los demas
-- ============================================================================

-- Asignar rol ADMIN al Usuario 1
INSERT INTO "UserRole" ("userId", "roleId", "assignedAt")
VALUES (
  1, 
  (SELECT id FROM "Role" WHERE name = 'ADMIN'), 
  NOW()
);

-- Asignar rol USER a todos los demas
INSERT INTO "UserRole" ("userId", "roleId", "assignedAt")
SELECT u.id, r.id, NOW()
FROM "User" u
CROSS JOIN "Role" r
WHERE r.name = 'USER'
  AND NOT EXISTS (
    SELECT 1 FROM "UserRole" ur WHERE ur."userId" = u.id
  );

-- ============================================================================
-- VERIFICACIÓN: Consultas para validar la configuración
-- ============================================================================

-- Ver todos los permisos creados
SELECT 
  id,
  action,
  subject,
  description,
  conditions
FROM "Permission" 
ORDER BY subject, action;

-- Ver todos los roles y sus permisos
SELECT 
  r.name as role,
  p.action,
  p.subject,
  p.conditions,
  p.description
FROM "Role" r
JOIN "RolePermission" rp ON r.id = rp."roleId"
JOIN "Permission" p ON rp."permissionId" = p.id
ORDER BY r.name, p.subject, p.action;

-- Ver usuarios y sus roles
SELECT 
  u.id,
  u.email,
  u.name,
  r.name as role
FROM "User" u
JOIN "UserRole" ur ON u.id = ur."userId"
JOIN "Role" r ON ur."roleId" = r.id
ORDER BY u.email;

-- ============================================================================
-- RESUMEN
-- ============================================================================
-- ✅ Opción B implementada: Un solo permiso con condiciones
-- ✅ Usuarios normales (rol USER): Solo pueden editar su propio perfil
-- ✅ Administradores (rol ADMIN): Pueden editar cualquier usuario (manage:all)
-- ============================================================================
