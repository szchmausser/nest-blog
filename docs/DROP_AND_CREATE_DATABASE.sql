-- ============================================================================
-- Script SQL para eliminar y recrear la base de datos desde cero
-- ============================================================================
-- 
-- IMPORTANTE: Este script elimina TODOS los datos. Úsalo solo si quieres
-- empezar desde cero.
--
-- Pasos:
-- 1. Conéctate a PostgreSQL (puedes usar la base de datos 'postgres' o 'template1')
-- 2. Ejecuta este script completo
-- 3. Luego ejecuta: drizzle-kit push
-- 4. Luego ejecuta: pnpm db:seed
-- ============================================================================

-- Paso 1: Conectarse a otra base de datos (no a la que vas a eliminar)
-- Si tu base de datos se llama 'nestjs-blog', conéctate primero a 'postgres':
-- \c postgres

-- Paso 2: Terminar todas las conexiones activas a la base de datos
-- (Reemplaza 'nestjs-blog' con el nombre de tu base de datos)
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'nestjs-blog'
  AND pid <> pg_backend_pid();

-- Paso 3: Eliminar la base de datos
DROP DATABASE IF EXISTS "nestjs-blog";

-- Paso 4: Crear la base de datos nueva
CREATE DATABASE "nestjs-blog"
  WITH OWNER = postgres
  ENCODING = 'UTF8'
  LC_COLLATE = 'Spanish_Spain.1252'
  LC_CTYPE = 'Spanish_Spain.1252'
  TEMPLATE = template0;

-- Paso 5: Conectarse a la nueva base de datos
-- \c nestjs-blog

-- Paso 6: Crear el schema public si no existe (normalmente ya existe)
CREATE SCHEMA IF NOT EXISTS public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- ============================================================================
-- Después de ejecutar este script:
-- 1. Ejecuta: pnpm drizzle-kit push
-- 2. Ejecuta: pnpm db:seed
-- ============================================================================
