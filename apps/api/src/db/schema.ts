import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

import { DEFAULT_NOTE_TITLE } from '@nicenote/shared'

export const notes = sqliteTable(
  'notes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    title: text('title').default(DEFAULT_NOTE_TITLE).notNull(),
    content: text('content'), // Markdown
    summary: text('summary'),
    createdAt: text('created_at')
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
    updatedAt: text('updated_at')
      .$defaultFn(() => new Date().toISOString())
      .notNull(),
  },
  (table) => [index('idx_notes_cursor').on(table.updatedAt, table.id)]
)
