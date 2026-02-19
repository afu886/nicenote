import { z } from 'zod'

const isoDateTimeSchema = z.string().datetime({ offset: true })

const MAX_TITLE_LENGTH = 500
const MAX_CONTENT_LENGTH = 100_000

export const noteSelectSchema = z
  .object({
    id: z.string(),
    title: z.string().max(MAX_TITLE_LENGTH),
    content: z.string().max(MAX_CONTENT_LENGTH).nullable(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .strict()

export const noteListItemSchema = noteSelectSchema.omit({ content: true }).extend({
  summary: z.string().nullable(),
})

export const noteInsertSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().max(MAX_TITLE_LENGTH).optional(),
    content: z.string().max(MAX_CONTENT_LENGTH).nullable().optional(),
    createdAt: isoDateTimeSchema.optional(),
    updatedAt: isoDateTimeSchema.optional(),
  })
  .strict()

export const noteCreateSchema = noteInsertSchema.pick({
  title: true,
  content: true,
})

export const noteUpdateSchema = z
  .object({
    title: z.string().max(MAX_TITLE_LENGTH).optional(),
    content: z.string().max(MAX_CONTENT_LENGTH).nullable().optional(),
  })
  .strict()
  .refine((input) => input.title !== undefined || input.content !== undefined, {
    message: 'At least one field must be provided for update',
  })

export const noteIdParamSchema = z
  .object({
    id: z.string().min(1),
  })
  .strict()

export const noteListQuerySchema = z.object({
  cursor: z.string().datetime({ offset: true }).optional(),
  cursorId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
})

export type NoteSelect = z.infer<typeof noteSelectSchema>
export type NoteListItem = z.infer<typeof noteListItemSchema>
export type NoteInsert = z.infer<typeof noteInsertSchema>
export type NoteCreateInput = z.infer<typeof noteCreateSchema>
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>
export type NoteListQuery = z.infer<typeof noteListQuerySchema>

export interface NoteListResult {
  data: NoteListItem[]
  nextCursor: string | null
  nextCursorId: string | null
}

export interface NoteContractService {
  list: (query: NoteListQuery) => Promise<NoteListResult> | NoteListResult
  getById: (id: string) => Promise<NoteSelect | null> | NoteSelect | null
  create: (input: NoteCreateInput) => Promise<NoteSelect> | NoteSelect
  update: (id: string, input: NoteUpdateInput) => Promise<NoteSelect | null> | NoteSelect | null
  remove: (id: string) => Promise<boolean> | boolean
}
