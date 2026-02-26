import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { TagRow } from '@nicenote/database'
import { getDatabase, TagService } from '@nicenote/database'

export interface TagStoreState {
  tags: Record<string, TagRow>
  tagIds: string[]
  selectedTagId: string | null
}

export interface TagStoreActions {
  fetchTags: () => void
  selectTag: (id: string | null) => void
  createTag: (input: { name: string; color?: string | null }) => TagRow
  updateTag: (id: string, patch: { name?: string; color?: string | null }) => void
  deleteTag: (id: string) => void
}

export type TagStore = TagStoreState & TagStoreActions

function svc(): TagService {
  return new TagService(getDatabase())
}

export const useTagStore = create<TagStore>()(
  immer((set) => ({
    tags: {},
    tagIds: [],
    selectedTagId: null,

    fetchTags() {
      const all = svc().listAll()
      set((s) => {
        s.tags = {}
        s.tagIds = []
        for (const t of all) {
          s.tags[t.id] = t
          s.tagIds.push(t.id)
        }
      })
    },

    selectTag(id) {
      set((s) => {
        s.selectedTagId = id
      })
    },

    createTag(input) {
      const tag = svc().create(input)
      set((s) => {
        s.tags[tag.id] = tag
        s.tagIds.push(tag.id)
      })
      return tag
    },

    updateTag(id, patch) {
      const updated = svc().update(id, patch)
      if (!updated) return
      set((s) => {
        if (s.tags[id]) s.tags[id] = updated
      })
    },

    deleteTag(id) {
      svc().delete(id)
      set((s) => {
        delete s.tags[id]
        s.tagIds = s.tagIds.filter((tid) => tid !== id)
        if (s.selectedTagId === id) s.selectedTagId = null
      })
    },
  }))
)
