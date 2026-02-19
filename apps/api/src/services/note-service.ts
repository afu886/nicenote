import { drizzle } from 'drizzle-orm/d1'
import { and, eq, lt, or } from 'drizzle-orm/sql/expressions/conditions'
import { desc } from 'drizzle-orm/sql/expressions/select'

import {
  DEFAULT_NOTE_TITLE,
  generateSummary,
  type NoteContractService,
  sanitizeContent,
} from '@nicenote/shared'

import { notes } from '../db/schema'

export type NoteServiceBindings = {
  DB: Parameters<typeof drizzle>[0]
}

type DrizzleNoteInsert = typeof notes.$inferInsert

// Columns returned for single-note endpoints (matches NoteSelect contract)
const NOTE_SELECT_COLUMNS = {
  id: notes.id,
  title: notes.title,
  content: notes.content,
  createdAt: notes.createdAt,
  updatedAt: notes.updatedAt,
} as const

export function createNoteService(bindings: NoteServiceBindings): NoteContractService {
  const db = drizzle(bindings.DB)

  return {
    list: async ({ cursor, cursorId, limit }) => {
      const where =
        cursor && cursorId
          ? or(
              lt(notes.updatedAt, cursor),
              and(eq(notes.updatedAt, cursor), lt(notes.id, cursorId))
            )
          : cursor
            ? lt(notes.updatedAt, cursor)
            : undefined
      const rows = await db
        .select({
          id: notes.id,
          title: notes.title,
          summary: notes.summary,
          createdAt: notes.createdAt,
          updatedAt: notes.updatedAt,
        })
        .from(notes)
        .where(where)
        .orderBy(desc(notes.updatedAt), desc(notes.id))
        .limit(limit + 1)
        .all()
      const hasMore = rows.length > limit
      const data = hasMore ? rows.slice(0, limit) : rows
      const last = data[data.length - 1]
      const nextCursor = hasMore && last ? last.updatedAt : null
      const nextCursorId = hasMore && last ? last.id : null
      return { data, nextCursor, nextCursorId }
    },

    getById: async (id) => {
      const result = await db.select(NOTE_SELECT_COLUMNS).from(notes).where(eq(notes.id, id)).get()
      return result ?? null
    },

    create: async (body) => {
      const sanitized = sanitizeContent(body.content ?? '')
      const values: Pick<DrizzleNoteInsert, 'title' | 'content' | 'summary'> = {
        title: body.title || DEFAULT_NOTE_TITLE,
        content: sanitized,
        summary: generateSummary(sanitized),
      }
      const result = await db.insert(notes).values(values).returning(NOTE_SELECT_COLUMNS).get()
      return result
    },

    update: async (id, body) => {
      const updates: Pick<DrizzleNoteInsert, 'updatedAt'> &
        Partial<Pick<DrizzleNoteInsert, 'title' | 'content' | 'summary'>> = {
        updatedAt: new Date().toISOString(),
      }

      if (body.title !== undefined) {
        updates.title = body.title
      }

      if (body.content !== undefined) {
        const sanitized = sanitizeContent(body.content)
        updates.content = sanitized
        updates.summary = generateSummary(sanitized)
      }

      const result = await db
        .update(notes)
        .set(updates)
        .where(eq(notes.id, id))
        .returning(NOTE_SELECT_COLUMNS)
        .get()
      return result ?? null
    },

    remove: async (id) => {
      const deleted = await db
        .delete(notes)
        .where(eq(notes.id, id))
        .returning({ id: notes.id })
        .get()
      return !!deleted
    },
  }
}
