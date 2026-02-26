import { drizzle } from 'drizzle-orm/d1'
import { and, eq } from 'drizzle-orm/sql/expressions/conditions'
import { asc } from 'drizzle-orm/sql/expressions/select'

import type { TagContractService } from '@nicenote/shared'

import { noteTags, tags } from '../db/schema'

type ServiceBindings = { DB: Parameters<typeof drizzle>[0] }

const TAG_SELECT_COLUMNS = {
  id: tags.id,
  name: tags.name,
  color: tags.color,
  createdAt: tags.createdAt,
} as const

export function createTagService(bindings: ServiceBindings): TagContractService {
  const db = drizzle(bindings.DB)

  return {
    list: async () => {
      return db.select(TAG_SELECT_COLUMNS).from(tags).orderBy(asc(tags.name)).all()
    },

    getById: async (id) => {
      const result = await db.select(TAG_SELECT_COLUMNS).from(tags).where(eq(tags.id, id)).get()
      return result ?? null
    },

    create: async (body) => {
      const values = {
        name: body.name,
        color: body.color ?? null,
      }
      return db.insert(tags).values(values).returning(TAG_SELECT_COLUMNS).get()
    },

    update: async (id, body) => {
      const updates: Partial<typeof tags.$inferInsert> = {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.color !== undefined && { color: body.color }),
      }

      const result = await db
        .update(tags)
        .set(updates)
        .where(eq(tags.id, id))
        .returning(TAG_SELECT_COLUMNS)
        .get()
      return result ?? null
    },

    remove: async (id) => {
      const deleted = await db.delete(tags).where(eq(tags.id, id)).returning({ id: tags.id }).get()
      return !!deleted
    },

    addTagToNote: async (noteId, tagId) => {
      try {
        await db.insert(noteTags).values({ noteId, tagId }).run()
        return true
      } catch (e) {
        // UNIQUE 约束失败：标签已存在，幂等返回 true
        // 其他错误（FK 约束、网络故障等）向上抛出，由全局错误处理器返回 500
        if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
          return true
        }
        throw e
      }
    },

    removeTagFromNote: async (noteId, tagId) => {
      const deleted = await db
        .delete(noteTags)
        .where(and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)))
        .returning({ noteId: noteTags.noteId })
        .get()
      return !!deleted
    },

    getTagsForNote: async (noteId) => {
      const rows = await db
        .select(TAG_SELECT_COLUMNS)
        .from(noteTags)
        .innerJoin(tags, eq(noteTags.tagId, tags.id))
        .where(eq(noteTags.noteId, noteId))
        .orderBy(asc(tags.name))
        .all()
      return rows
    },
  }
}
