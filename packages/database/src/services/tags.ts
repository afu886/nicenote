import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid/non-secure'

import type { Database } from '../db'
import { noteTags, tags } from '../schema'

export interface TagRow {
  id: string
  name: string
  color: string | null
  createdAt: string
}

export class TagService {
  constructor(private readonly db: Database) {}

  listAll(): TagRow[] {
    return this.db.select().from(tags).all() as TagRow[]
  }

  getById(id: string): TagRow | null {
    return (this.db.select().from(tags).where(eq(tags.id, id)).get() as TagRow | undefined) ?? null
  }

  /** Returns all tags attached to a given note. */
  listByNote(noteId: string): TagRow[] {
    return this.db
      .select({ id: tags.id, name: tags.name, color: tags.color, createdAt: tags.createdAt })
      .from(tags)
      .innerJoin(noteTags, eq(tags.id, noteTags.tagId))
      .where(eq(noteTags.noteId, noteId))
      .all() as TagRow[]
  }

  create(input: { name: string; color?: string | null }): TagRow {
    const row: TagRow = {
      id: nanoid(),
      name: input.name,
      color: input.color ?? null,
      createdAt: new Date().toISOString(),
    }
    this.db.insert(tags).values(row).run()
    return row
  }

  update(id: string, patch: { name?: string; color?: string | null }): TagRow | null {
    const existing = this.getById(id)
    if (!existing) return null

    const updated: Partial<TagRow> = {}
    if (patch.name !== undefined) updated.name = patch.name
    if (patch.color !== undefined) updated.color = patch.color

    this.db.update(tags).set(updated).where(eq(tags.id, id)).run()
    return { ...existing, ...updated }
  }

  delete(id: string): void {
    // noteTags rows cascade-delete via FK
    this.db.delete(tags).where(eq(tags.id, id)).run()
  }
}
