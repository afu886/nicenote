import React, { useCallback, useState } from 'react'
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import type { NoteListRow } from '@nicenote/database'
import { useNoteStore } from '@nicenote/store'

interface SearchBarProps {
  visible: boolean
  onClose: () => void
  onSelect: (note: NoteListRow) => void
}

export function SearchBar({ visible, onClose, onSelect }: SearchBarProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const searchNotes = useNoteStore((s) => s.searchNotes)
  const results = query.trim().length > 0 ? searchNotes(query) : []

  const handleSelect = useCallback(
    (note: NoteListRow) => {
      setQuery('')
      onSelect(note)
      onClose()
    },
    [onSelect, onClose]
  )

  const handleClose = useCallback(() => {
    setQuery('')
    Keyboard.dismiss()
    onClose()
  }, [onClose])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <KeyboardAvoidingView style={styles.panel}>
          <Pressable>
            {/* Prevent taps inside panel from closing */}
            <TextInput
              style={styles.input}
              placeholder="Search notes… (⌘K)"
              placeholderTextColor="#a3a3a3"
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
            />

            {results.length > 0 && (
              <View style={styles.results}>
                {results.slice(0, 8).map((note) => (
                  <Pressable
                    key={note.id}
                    style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
                    onPress={() => handleSelect(note)}
                  >
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {note.title}
                    </Text>
                    {note.summary ? (
                      <Text style={styles.resultSummary} numberOfLines={1}>
                        {note.summary}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            )}

            {query.trim().length > 0 && results.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No results for "{query}"</Text>
              </View>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 120,
  },
  panel: {
    width: 560,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  input: {
    height: 52,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#0a0a0a',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  results: {
    maxHeight: 320,
  },
  resultRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f5f5f5',
  },
  resultRowPressed: {
    backgroundColor: '#f5f5f5',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0a0a0a',
  },
  resultSummary: {
    fontSize: 12,
    color: '#737373',
    marginTop: 2,
  },
  empty: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#a3a3a3',
  },
})
