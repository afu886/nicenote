import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { EditorBridgeHandle } from '@nicenote/editor-bridge'
import { EditorWebView } from '@nicenote/editor-bridge'
import { useFolderStore, useNoteStore, useUIStore } from '@nicenote/store'

import { NoteList } from '../components/NoteList'
import { SearchBar } from '../components/SearchBar'
import { Sidebar } from '../components/Sidebar'
import { TitleBar } from '../components/TitleBar'
import { GlobalShortcutEvents, GlobalShortcuts, SHORTCUT_ID } from '../native/GlobalShortcuts'

export function MainScreen(): React.JSX.Element {
  const editorRef = useRef<EditorBridgeHandle | null>(null)
  const [searchVisible, setSearchVisible] = useState(false)

  const selectedNoteId = useNoteStore((s) => s.selectedNoteId)
  const activeNote = useNoteStore((s) => s.activeNote)
  const createNote = useNoteStore((s) => s.createNote)
  const updateNoteContent = useNoteStore((s) => s.updateNoteContent)
  const selectNote = useNoteStore((s) => s.selectNote)
  const fetchNotes = useNoteStore((s) => s.fetchNotes)
  const fetchFolders = useFolderStore((s) => s.fetchFolders)
  const selectedFolderId = useFolderStore((s) => s.selectedFolderId)
  const isSidebarOpen = useUIStore((s) => s.sidebarOpen)

  // ── Initial data load ──────────────────────────────────────────────────────

  useEffect(() => {
    fetchFolders()
    fetchNotes({ reset: true })
  }, [fetchFolders, fetchNotes])

  // ── Global shortcuts ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!GlobalShortcuts.isAvailable || !GlobalShortcutEvents) return

    GlobalShortcuts.register(SHORTCUT_ID.NEW_NOTE, ['cmd'], 'n')
    GlobalShortcuts.register(SHORTCUT_ID.SEARCH, ['cmd'], 'k')

    const sub = GlobalShortcutEvents.addListener('shortcut', (id: string) => {
      if (id === SHORTCUT_ID.NEW_NOTE) handleNewNote()
      if (id === SHORTCUT_ID.SEARCH) setSearchVisible(true)
    })

    return () => {
      GlobalShortcuts.unregisterAll()
      sub.remove()
    }
  }, [])

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleNewNote = useCallback(() => {
    createNote({ folderId: selectedFolderId })
  }, [createNote, selectedFolderId])

  const handleContentChange = useCallback(
    (content: string) => {
      if (!selectedNoteId) return
      updateNoteContent(selectedNoteId, content)
    },
    [selectedNoteId, updateNoteContent]
  )

  const handleSearchSelect = useCallback(
    (note: { id: string }) => {
      selectNote(note.id)
    },
    [selectNote]
  )

  return (
    <View style={styles.root}>
      <TitleBar title={activeNote?.title} />

      <View style={styles.body}>
        {/* ── Panel 1: Sidebar ── */}
        {isSidebarOpen && (
          <Sidebar onNewNote={handleNewNote} onSearch={() => setSearchVisible(true)} />
        )}

        {/* ── Panel 2: Note list ── */}
        <View style={styles.noteList}>
          <NoteList folderId={selectedFolderId} />
        </View>

        {/* ── Panel 3: Editor ── */}
        <View style={styles.editor}>
          {selectedNoteId ? (
            <EditorWebView
              ref={editorRef}
              key={selectedNoteId} // remount when note changes to reset editor state
              initialContent={activeNote?.content ?? ''}
              editable
              onContentChange={handleContentChange}
            />
          ) : (
            <EmptyEditorPlaceholder onNewNote={handleNewNote} />
          )}
        </View>
      </View>

      {/* ── Cmd+K search overlay ── */}
      <SearchBar
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onSelect={handleSearchSelect}
      />
    </View>
  )
}

function EmptyEditorPlaceholder({ onNewNote }: { onNewNote: () => void }): React.JSX.Element {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Select a note or</Text>
      <Pressable onPress={onNewNote}>
        <Text style={styles.placeholderLink}> create a new one</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  body: { flex: 1, flexDirection: 'row' },
  noteList: {
    width: 260,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#e5e5e5',
    backgroundColor: '#fafafa',
  },
  editor: { flex: 1 },
  placeholder: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { fontSize: 15, color: '#a3a3a3' },
  placeholderLink: { fontSize: 15, color: '#3b82f6', textDecorationLine: 'underline' },
})
