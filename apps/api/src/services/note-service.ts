import { drizzle } from 'drizzle-orm/d1'
import { and, eq, lt, or } from 'drizzle-orm/sql/expressions/conditions'
import { desc } from 'drizzle-orm/sql/expressions/select'

import {
  generateSummary,
  type NoteContractService,
  type NoteInsert,
  type NoteSelect,
} from '@nicenote/shared'

import { notes } from '../db/schema'

export type NoteServiceBindings = {
  DB: Parameters<typeof drizzle>[0]
}

type DrizzleNoteSelect = typeof notes.$inferSelect
type DrizzleNoteInsert = typeof notes.$inferInsert

type IsExact<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false
type Assert<T extends true> = T

export type NoteSelectSchemaMatchesDrizzle = Assert<IsExact<NoteSelect, DrizzleNoteSelect>>
export type NoteInsertSchemaMatchesDrizzle = Assert<IsExact<NoteInsert, DrizzleNoteInsert>>

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
          content: notes.content,
          createdAt: notes.createdAt,
          updatedAt: notes.updatedAt,
        })
        .from(notes)
        .where(where)
        .orderBy(desc(notes.updatedAt), desc(notes.id))
        .limit(limit + 1)
        .all()
      const hasMore = rows.length > limit
      const data = (hasMore ? rows.slice(0, limit) : rows).map(({ content, ...rest }) => ({
        ...rest,
        summary: generateSummary(content),
      }))
      const last = data[data.length - 1]
      const nextCursor = hasMore && last ? last.updatedAt : null
      const nextCursorId = hasMore && last ? last.id : null
      return { data, nextCursor, nextCursorId }
    },
    getById: async (id) => {
      const result = await db.select().from(notes).where(eq(notes.id, id)).get()
      return result ?? null
    },
    create: async (body) => {
      const values: Pick<DrizzleNoteInsert, 'title' | 'content'> = {
        title: body.title || 'Untitled',
        content: body.content ?? '',
      }

      return db.insert(notes).values(values).returning().get()
    },
    update: async (id, body) => {
      const updates: Pick<DrizzleNoteInsert, 'updatedAt'> &
        Partial<Pick<DrizzleNoteInsert, 'title' | 'content'>> = {
        updatedAt: new Date().toISOString(),
      }

      if (body.title !== undefined) {
        updates.title = body.title
      }

      if (body.content !== undefined) {
        updates.content = body.content
      }

      const result = await db.update(notes).set(updates).where(eq(notes.id, id)).returning().get()
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
