import { z } from 'zod'

export const noteSelectSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    content: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict()

export const noteInsertSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    content: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .strict()

export const noteCreateSchema = noteInsertSchema.pick({
  title: true,
  content: true,
})

export const noteUpdateSchema = noteCreateSchema

export const noteIdParamSchema = z
  .object({
    id: z.string().min(1),
  })
  .strict()

export type NoteSelect = z.infer<typeof noteSelectSchema>
export type NoteInsert = z.infer<typeof noteInsertSchema>
export type NoteCreateInput = z.infer<typeof noteCreateSchema>
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>
