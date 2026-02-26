import { and, desc, eq, lt, or, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid/non-secure'

import { DEFAULT_NOTE_TITLE } from '@nicenote/shared'

import type { Database } from '../db'
import { notes, noteTags } from '../schema'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface NoteRow {
  id: string
  title: string
  content: string | null
  summary: string | null
  folderId: string | null
  createdAt: string
  updatedAt: string
}

export type NoteListRow = Omit<NoteRow, 'content'>

export interface ListNotesOptions {
  folderId?: string | null
  cursor?: { updatedAt: string; id: string }
  limit?: number
}

export interface SearchNotesOptions {
  query: string
  limit?: number
}

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────

export class NoteService {
  constructor(private readonly db: Database) {}

  list(opts: ListNotesOptions = {}): { data: NoteListRow[]; nextCursor: string | null } {
    const limit = opts.limit ?? 50

    const rows = this.db
      .select({
        id: notes.id,
        title: notes.title,
        summary: notes.summary,
        folderId: notes.folderId,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(
        and(
          opts.folderId !== undefined ? eq(notes.folderId, opts.folderId as string) : undefined,
          opts.cursor
            ? or(
                lt(notes.updatedAt, opts.cursor.updatedAt),
                and(eq(notes.updatedAt, opts.cursor.updatedAt), lt(notes.id, opts.cursor.id))
              )
            : undefined
        )
      )
      .orderBy(desc(notes.updatedAt), desc(notes.id))
      .limit(limit + 1)
      .all()

    const hasMore = rows.length > limit
    const data = (hasMore ? rows.slice(0, limit) : rows) as NoteListRow[]
    const last = data.at(-1)
    const nextCursor = hasMore && last ? `${last.updatedAt}__${last.id}` : null

    return { data, nextCursor }
  }

  getById(id: string): NoteRow | null {
    return (
      (this.db.select().from(notes).where(eq(notes.id, id)).get() as NoteRow | undefined) ?? null
    )
  }

  search(opts: SearchNotesOptions): NoteListRow[] {
    const limit = opts.limit ?? 20
    // Escape special FTS5 characters
    const term = opts.query.replace(/['"*]/g, ' ').trim()
    if (!term) return []

    return this.db
      .select({
        id: notes.id,
        title: notes.title,
        summary: notes.summary,
        folderId: notes.folderId,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
      })
      .from(notes)
      .where(
        sql`notes.id IN (
          SELECT id FROM notes_fts
          WHERE notes_fts MATCH ${term + '*'}
          ORDER BY rank
          LIMIT ${limit}
        )`
      )
      .all() as NoteListRow[]
  }

  create(input: { title?: string; content?: string | null; folderId?: string | null }): NoteRow {
    const now = new Date().toISOString()
    const row: NoteRow = {
      id: nanoid(),
      title: input.title ?? DEFAULT_NOTE_TITLE,
      content: input.content ?? null,
      summary: null,
      folderId: input.folderId ?? null,
      createdAt: now,
      updatedAt: now,
    }
    this.db.insert(notes).values(row).run()
    return row
  }

  update(
    id: string,
    patch: {
      title?: string
      content?: string | null
      summary?: string | null
      folderId?: string | null
    }
  ): NoteRow | null {
    const existing = this.getById(id)
    if (!existing) return null

    const updated: Partial<NoteRow> = {
      updatedAt: new Date().toISOString(),
    }
    if (patch.title !== undefined) updated.title = patch.title
    if (patch.content !== undefined) updated.content = patch.content
    if (patch.summary !== undefined) updated.summary = patch.summary
    if (patch.folderId !== undefined) updated.folderId = patch.folderId

    this.db.update(notes).set(updated).where(eq(notes.id, id)).run()
    return { ...existing, ...updated }
  }

  delete(id: string): void {
    this.db.delete(notes).where(eq(notes.id, id)).run()
  }

  /** Attach / detach tags (replaces the full tag set for the note). */
  setTags(noteId: string, tagIds: string[]): void {
    this.db.delete(noteTags).where(eq(noteTags.noteId, noteId)).run()
    if (tagIds.length === 0) return
    this.db
      .insert(noteTags)
      .values(tagIds.map((tagId) => ({ noteId, tagId })))
      .run()
  }
}
