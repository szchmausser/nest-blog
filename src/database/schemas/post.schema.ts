import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user.schema';

// -----------------------------------------------------------------------------
// EJEMPLO: Recurso Protegido
// -----------------------------------------------------------------------------

/**
 * Modelo de dominio sobre el cual se aplican los permisos.
 * Cada recurso debe tener campos relevantes para evaluar conditions.
 */
export const posts = pgTable(
  'Post',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    content: text('content').notNull(),

    // Campo usado en conditions para ownership
    authorId: integer('authorId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Campo usado en conditions para estado
    isPublished: boolean('isPublished').notNull().default(false),

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
    index('Post_authorId_idx').on(table.authorId),
    index('Post_isPublished_idx').on(table.isPublished),
    index('Post_authorId_isPublished_idx').on(
      table.authorId,
      table.isPublished,
    ),
  ],
);

// RELACIONES LÓGICAS (Drizzle Query API)
// -----------------------------------------------------------------------------

export const postsRelations = relations(posts, ({ one }) => ({
  // Relación con User (author)
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
