import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { FolderRow } from '@nicenote/database'
import { FolderService, getDatabase } from '@nicenote/database'

export interface FolderStoreState {
  folders: Record<string, FolderRow>
  folderIds: string[]
  selectedFolderId: string | null
  expandedFolderIds: Set<string>
}

export interface FolderStoreActions {
  fetchFolders: () => void
  selectFolder: (id: string | null) => void
  toggleFolderExpanded: (id: string) => void
  createFolder: (input: { name: string; parentId?: string | null }) => FolderRow
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
}

export type FolderStore = FolderStoreState & FolderStoreActions

function svc(): FolderService {
  return new FolderService(getDatabase())
}

export const useFolderStore = create<FolderStore>()(
  immer((set) => ({
    folders: {},
    folderIds: [],
    selectedFolderId: null,
    expandedFolderIds: new Set<string>(),

    fetchFolders() {
      const all = svc().listAll()
      set((s) => {
        s.folders = {}
        s.folderIds = []
        for (const f of all) {
          s.folders[f.id] = f
          s.folderIds.push(f.id)
        }
      })
    },

    selectFolder(id) {
      set((s) => {
        s.selectedFolderId = id
      })
    },

    toggleFolderExpanded(id) {
      set((s) => {
        if (s.expandedFolderIds.has(id)) s.expandedFolderIds.delete(id)
        else s.expandedFolderIds.add(id)
      })
    },

    createFolder(input) {
      const folder = svc().create(input)
      set((s) => {
        s.folders[folder.id] = folder
        s.folderIds.push(folder.id)
      })
      return folder
    },

    renameFolder(id, name) {
      const updated = svc().update(id, { name })
      if (!updated) return
      set((s) => {
        if (s.folders[id]) s.folders[id].name = name
      })
    },

    deleteFolder(id) {
      svc().delete(id)
      set((s) => {
        delete s.folders[id]
        s.folderIds = s.folderIds.filter((fid) => fid !== id)
        if (s.selectedFolderId === id) s.selectedFolderId = null
      })
    },
  }))
)
