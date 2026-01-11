import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  users,
  permissions,
  roles,
  rolePermissions,
  userRoles,
} from './schemas';

config();

/**
 * Seed file de Drizzle para restaurar los datos iniciales.
 * Este archivo contiene los datos que deben estar en la base de datos.
 */
async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not defined');
  }

  const connection = postgres(url);
  const db = drizzle(connection);

  try {
    console.log('🌱 Iniciando seed de datos...\n');

    // 1. Users
    console.log('📥 Insertando usuarios...');
    await db.insert(users).values([
      {
        id: 1,
        email: 'wewewe@gmail.com',
        name: 'Vioscar Alberto Rivero Castillo',
        password:
          '$2b$10$FWFcaFnXMu7ehV/TlHFNfecadOWX8.EbdqZPcRdOJb3NcsiedC1FS',
        isActive: true,
        deactivatedAt: null,
        deactivationReason: null,
        deletedAt: null,
        createdAt: new Date('2026-01-08T13:04:15.697Z'),
        updatedAt: new Date('2026-01-11T23:07:59.638Z'),
        lastLoginAt: null,
      },
      {
        id: 2,
        email: 'wiwiwi@gmail.com',
        name: 'Vioscar Alberto Rivero Castillo',
        password:
          '$2b$10$FWFcaFnXMu7ehV/TlHFNfecadOWX8.EbdqZPcRdOJb3NcsiedC1FS',
        isActive: true,
        deactivatedAt: null,
        deactivationReason: null,
        deletedAt: null,
        createdAt: new Date('2026-01-08T13:04:15.697Z'),
        updatedAt: new Date('2026-01-11T23:09:34.804Z'),
        lastLoginAt: null,
      },
    ]);
    console.log('   ✓ 2 usuarios insertados');

    // 2. Permissions
    console.log('\n📥 Insertando permisos...');
    await db.insert(permissions).values([
      {
        id: 1,
        action: 'update',
        subject: 'User',
        description:
          'Puede editar usuarios (solo su propio perfil por defecto)',
        conditions: { id: '{{id}}' },
        createdAt: new Date('2026-01-08T13:04:15.702Z'),
        updatedAt: new Date('2026-01-08T13:04:15.702Z'),
      },
      {
        id: 2,
        action: 'delete',
        subject: 'User',
        description:
          'Puede eliminar usuarios (solo su propia cuenta por defecto)',
        conditions: { id: '{{id}}' },
        createdAt: new Date('2026-01-08T13:04:15.702Z'),
        updatedAt: new Date('2026-01-08T13:04:15.702Z'),
      },
      {
        id: 3,
        action: 'read',
        subject: 'User',
        description: 'Puede ver perfiles de usuarios',
        conditions: null,
        createdAt: new Date('2026-01-08T13:04:15.702Z'),
        updatedAt: new Date('2026-01-08T13:04:15.702Z'),
      },
      {
        id: 4,
        action: 'manage',
        subject: 'all',
        description: 'Acceso total al sistema (super administrador)',
        conditions: null,
        createdAt: new Date('2026-01-08T13:04:15.702Z'),
        updatedAt: new Date('2026-01-08T13:04:15.702Z'),
      },
    ]);
    console.log('   ✓ 4 permisos insertados');

    // 3. Roles
    console.log('\n📥 Insertando roles...');
    await db.insert(roles).values([
      {
        id: 1,
        name: 'ADMIN',
        description: 'Administrador con acceso completo al sistema',
        isActive: true,
        createdAt: new Date('2026-01-08T13:04:15.723Z'),
        updatedAt: new Date('2026-01-08T13:04:15.723Z'),
      },
      {
        id: 2,
        name: 'USER',
        description: 'Usuario estándar del sistema con permisos básicos',
        isActive: true,
        createdAt: new Date('2026-01-08T13:04:15.723Z'),
        updatedAt: new Date('2026-01-08T13:04:15.723Z'),
      },
    ]);
    console.log('   ✓ 2 roles insertados');

    // 4. RolePermissions
    console.log('\n📥 Insertando role permissions...');
    await db.insert(rolePermissions).values([
      { roleId: 2, permissionId: 1 },
      { roleId: 2, permissionId: 2 },
      { roleId: 2, permissionId: 3 },
      { roleId: 1, permissionId: 4 },
    ]);
    console.log('   ✓ 4 role permissions insertados');

    // 5. UserRoles
    console.log('\n📥 Insertando user roles...');
    await db.insert(userRoles).values([
      {
        userId: 1,
        roleId: 1,
        assignedAt: new Date('2026-01-08T13:04:15.744Z'),
        assignedBy: null,
        expiresAt: null,
      },
      {
        userId: 2,
        roleId: 2,
        assignedAt: new Date('2026-01-08T13:04:15.754Z'),
        assignedBy: null,
        expiresAt: null,
      },
    ]);
    console.log('   ✓ 2 user roles insertados');

    // 6. Resetear secuencias de IDs
    console.log('\n🔄 Reseteando secuencias de IDs...');
    await connection.unsafe(`
      SELECT setval('"User_id_seq"', 2, true);
      SELECT setval('"Permission_id_seq"', 4, true);
      SELECT setval('"Role_id_seq"', 2, true);
      SELECT setval('"Post_id_seq"', 1, true);
    `);
    console.log('   ✓ Secuencias reseteadas');

    console.log('\n✅ Seed completado exitosamente');
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seed()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
