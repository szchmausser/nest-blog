-- ============================================================================
-- Script SQL para eliminar solo el contenido del schema 'public' 
-- (sin eliminar la base de datos)
-- ============================================================================
-- 
-- Úsalo si quieres mantener la base de datos pero eliminar todas las tablas
-- y objetos del schema 'public'
-- ============================================================================

-- Conectarse al schema public
SET search_path TO public;

-- Eliminar todas las foreign keys primero
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (
    SELECT constraint_name, table_name 
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_schema = 'public'
  ) 
  LOOP
    EXECUTE 'ALTER TABLE "' || r.table_name || '" DROP CONSTRAINT IF EXISTS "' || r.constraint_name || '" CASCADE';
  END LOOP;
END $$;

-- Eliminar todas las tablas
DROP TABLE IF EXISTS "UserPermission" CASCADE;
DROP TABLE IF EXISTS "UserRole" CASCADE;
DROP TABLE IF EXISTS "RolePermission" CASCADE;
DROP TABLE IF EXISTS "Post" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Role" CASCADE;
DROP TABLE IF EXISTS "Permission" CASCADE;

-- Eliminar los enums
DROP TYPE IF EXISTS "ActionEnum" CASCADE;
DROP TYPE IF EXISTS "SubjectEnum" CASCADE;

-- Eliminar cualquier tabla de migraciones de Prisma (si existe)
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;

-- Verificar que todo esté limpio
SELECT 'Schema limpio. Ahora ejecuta: drizzle-kit push' AS mensaje;

-- ============================================================================
-- Después de ejecutar este script:
-- 1. Ejecuta: pnpm drizzle-kit push
-- 2. Ejecuta: pnpm db:seed
-- ============================================================================
