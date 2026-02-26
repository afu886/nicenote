import { z } from 'zod'

const isoDateTimeSchema = z.string().datetime({ offset: true })

export const MAX_TAG_NAME_LENGTH = 50
const TAG_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/

export const tagSelectSchema = z
  .object({
    id: z.string(),
    name: z.string().max(MAX_TAG_NAME_LENGTH),
    color: z.string().regex(TAG_COLOR_REGEX).nullable(),
    createdAt: isoDateTimeSchema,
  })
  .strict()

export const tagCreateSchema = z
  .object({
    name: z.string().min(1).max(MAX_TAG_NAME_LENGTH),
    color: z.string().regex(TAG_COLOR_REGEX).nullable().optional(),
  })
  .strict()

export const tagUpdateSchema = z
  .object({
    name: z.string().min(1).max(MAX_TAG_NAME_LENGTH).optional(),
    color: z.string().regex(TAG_COLOR_REGEX).nullable().optional(),
  })
  .strict()
  .refine((input) => input.name !== undefined || input.color !== undefined, {
    message: 'At least one field must be provided for update',
  })

export const tagIdParamSchema = z
  .object({
    id: z.string().min(1),
  })
  .strict()

export const noteTagParamSchema = z
  .object({
    id: z.string().min(1),
    tagId: z.string().min(1),
  })
  .strict()

export type TagSelect = z.infer<typeof tagSelectSchema>
export type TagCreateInput = z.infer<typeof tagCreateSchema>
export type TagUpdateInput = z.infer<typeof tagUpdateSchema>

export interface TagContractService {
  list: () => Promise<TagSelect[]> | TagSelect[]
  getById: (id: string) => Promise<TagSelect | null> | TagSelect | null
  create: (input: TagCreateInput) => Promise<TagSelect> | TagSelect
  update: (id: string, input: TagUpdateInput) => Promise<TagSelect | null> | TagSelect | null
  remove: (id: string) => Promise<boolean> | boolean
  addTagToNote: (noteId: string, tagId: string) => Promise<boolean> | boolean
  removeTagFromNote: (noteId: string, tagId: string) => Promise<boolean> | boolean
  getTagsForNote: (noteId: string) => Promise<TagSelect[]> | TagSelect[]
}
