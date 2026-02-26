import React, { useCallback } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import type { NoteListRow } from '@nicenote/database'
import { useNoteStore } from '@nicenote/store'

interface NoteListProps {
  folderId?: string | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function NoteList({ folderId }: NoteListProps): React.JSX.Element {
  const noteIds = useNoteStore((s) => s.noteIds)
  const notes = useNoteStore((s) => s.notes)
  const selectedNoteId = useNoteStore((s) => s.selectedNoteId)
  const selectNote = useNoteStore((s) => s.selectNote)
  const fetchMore = useNoteStore((s) => s.fetchMore)
  const deleteNote = useNoteStore((s) => s.deleteNote)

  const visibleIds = folderId ? noteIds.filter((id) => notes[id]?.folderId === folderId) : noteIds

  const handleSelect = useCallback(
    (id: string) => {
      selectNote(id)
    },
    [selectNote]
  )

  const renderItem = useCallback(
    ({ item: id }: { item: string }) => {
      const note = notes[id]
      if (!note) return null
      return (
        <NoteRow
          note={note}
          isSelected={selectedNoteId === id}
          onPress={handleSelect}
          onDelete={deleteNote}
        />
      )
    },
    [notes, selectedNoteId, handleSelect, deleteNote]
  )

  if (visibleIds.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No notes yet.</Text>
        <Text style={styles.emptyHint}>Click "+ New Note" in the sidebar to get started.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={visibleIds}
      keyExtractor={(id) => id}
      renderItem={renderItem}
      onEndReached={fetchMore}
      onEndReachedThreshold={0.4}
      style={styles.list}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    />
  )
}

function NoteRow({
  note,
  isSelected,
  onPress,
  onDelete: _onDelete,
}: {
  note: NoteListRow
  isSelected: boolean
  onPress: (id: string) => void
  onDelete: (id: string) => void
}): React.JSX.Element {
  return (
    <Pressable
      style={[styles.row, isSelected && styles.rowSelected]}
      onPress={() => onPress(note.id)}
    >
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, isSelected && styles.rowTitleSelected]} numberOfLines={1}>
          {note.title}
        </Text>

        <View style={styles.rowMeta}>
          <Text style={styles.rowDate}>{formatDate(note.updatedAt)}</Text>
          {note.summary ? (
            <Text style={styles.rowSummary} numberOfLines={1}>
              {note.summary}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingBottom: 16 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: { fontSize: 16, fontWeight: '500', color: '#737373', marginBottom: 8 },
  emptyHint: { fontSize: 13, color: '#a3a3a3', textAlign: 'center' },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  rowSelected: { backgroundColor: '#f0f0f0' },
  rowContent: { gap: 4 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#0a0a0a' },
  rowTitleSelected: { color: '#171717' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowDate: { fontSize: 11, color: '#a3a3a3', flexShrink: 0 },
  rowSummary: { fontSize: 12, color: '#737373', flex: 1 },
})
