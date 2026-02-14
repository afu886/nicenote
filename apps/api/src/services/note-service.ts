import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm/sql/expressions/conditions'
import { desc } from 'drizzle-orm/sql/expressions/select'

import { type NoteContractService, type NoteInsert, type NoteSelect } from '@nicenote/contract'

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
    list: async () => db.select().from(notes).orderBy(desc(notes.updatedAt)).all(),
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
      const updates: Pick<DrizzleNoteInsert, 'title' | 'content' | 'updatedAt'> = {
        ...body,
        updatedAt: new Date().toISOString(),
      }

      const result = await db.update(notes).set(updates).where(eq(notes.id, id)).returning().get()
      return result ?? null
    },
    remove: async (id) => {
      await db.delete(notes).where(eq(notes.id, id))
    },
  }
}
