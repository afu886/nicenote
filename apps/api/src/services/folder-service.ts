import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm/sql/expressions/conditions'
import { asc } from 'drizzle-orm/sql/expressions/select'

import type { FolderContractService } from '@nicenote/shared'

import { folders } from '../db/schema'

type ServiceBindings = { DB: Parameters<typeof drizzle>[0] }

const FOLDER_SELECT_COLUMNS = {
  id: folders.id,
  name: folders.name,
  parentId: folders.parentId,
  position: folders.position,
  createdAt: folders.createdAt,
  updatedAt: folders.updatedAt,
} as const

export function createFolderService(bindings: ServiceBindings): FolderContractService {
  const db = drizzle(bindings.DB)

  return {
    list: async () => {
      return db
        .select(FOLDER_SELECT_COLUMNS)
        .from(folders)
        .orderBy(asc(folders.position), asc(folders.createdAt))
        .all()
    },

    getById: async (id) => {
      const result = await db
        .select(FOLDER_SELECT_COLUMNS)
        .from(folders)
        .where(eq(folders.id, id))
        .get()
      return result ?? null
    },

    create: async (body) => {
      const values = {
        name: body.name,
        parentId: body.parentId ?? null,
      }
      return db.insert(folders).values(values).returning(FOLDER_SELECT_COLUMNS).get()
    },

    update: async (id, body) => {
      const updates: Partial<typeof folders.$inferInsert> = {
        updatedAt: new Date().toISOString(),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.parentId !== undefined && { parentId: body.parentId }),
        ...(body.position !== undefined && { position: body.position }),
      }

      const result = await db
        .update(folders)
        .set(updates)
        .where(eq(folders.id, id))
        .returning(FOLDER_SELECT_COLUMNS)
        .get()
      return result ?? null
    },

    remove: async (id) => {
      const deleted = await db
        .delete(folders)
        .where(eq(folders.id, id))
        .returning({ id: folders.id })
        .get()
      return !!deleted
    },
  }
}
