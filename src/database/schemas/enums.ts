import { pgEnum } from 'drizzle-orm/pg-core';

// -----------------------------------------------------------------------------
// ENUMS COMPARTIDOS
// -----------------------------------------------------------------------------

/**
 * ENUM: Definiciones de Acción (Que puede hacer el usuario)
 */
export const actionEnum = pgEnum('ActionEnum', [
  'manage',
  'create',
  'read',
  'update',
  'delete',
]);

/**
 * ENUM: Definiciones de Sujeto (Sobre qué recurso se aplica la acción)
 */
export const subjectEnum = pgEnum('SubjectEnum', ['Post', 'User', 'all']);
