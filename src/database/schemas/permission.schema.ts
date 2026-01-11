import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { actionEnum, subjectEnum } from './enums';
import { rolePermissions } from './role.schema';
import { userPermissions } from './user.schema';

// -----------------------------------------------------------------------------
// ENTIDAD CORE: Permiso Atómico
// -----------------------------------------------------------------------------

/**
 * PERMISO ATÓMICO: La unidad mínima de autorización.
 * Sigue el modelo [Acción] + [Sujeto] (ej: 'read' + 'Post').
 * Puede incluir condiciones dinámicas para restringir el acceso basado en atributos.
 */
export const permissions = pgTable(
  'Permission',
  {
    id: serial('id').primaryKey(),

    // CASL: Definición de la Capacidad
    action: actionEnum('action').notNull(),
    subject: subjectEnum('subject').notNull(),
    description: text('description'),

    // ABAC (Attribute-Based Access Control):
    // Reglas dinámicas en JSON que aplican lógica extra (ej: { "isPublished": true }).
    conditions: jsonb('conditions').$type<Record<string, any>>(),

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
  (table) => [
    // Índices de performance
    index('Permission_action_idx').on(table.action),
    index('Permission_subject_idx').on(table.subject),
  ],
);

// RELACIONES LÓGICAS (Drizzle Query API)
// -----------------------------------------------------------------------------

export const permissionsRelations = relations(permissions, ({ many }) => ({
  // Roles que incluyen este permiso
  roles: many(rolePermissions),

  // Usuarios con este permiso asignado directamente (claims)
  users: many(userPermissions),
}));
