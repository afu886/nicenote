import React, { useCallback } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import type { FolderRow } from '@nicenote/database'
import { useFolderStore, useNoteStore } from '@nicenote/store'

interface SidebarProps {
  onNewNote: () => void
  onSearch: () => void
}

export function Sidebar({ onNewNote, onSearch }: SidebarProps): React.JSX.Element {
  const folders = useFolderStore((s) => s.folders)
  const folderIds = useFolderStore((s) => s.folderIds)
  const selectedFolderId = useFolderStore((s) => s.selectedFolderId)
  const expandedFolderIds = useFolderStore((s) => s.expandedFolderIds)
  const selectFolder = useFolderStore((s) => s.selectFolder)
  const toggleExpanded = useFolderStore((s) => s.toggleFolderExpanded)
  const createFolder = useFolderStore((s) => s.createFolder)

  const selectedNoteId = useNoteStore((s) => s.selectedNoteId)
  const selectNote = useNoteStore((s) => s.selectNote)

  const handleAllNotes = useCallback(() => {
    selectFolder(null)
    selectNote(null)
  }, [selectFolder, selectNote])

  const handleFolderPress = useCallback(
    (id: string) => {
      selectFolder(id)
      selectNote(null)
    },
    [selectFolder, selectNote]
  )

  const handleNewFolder = useCallback(() => {
    createFolder({ name: 'New Folder' })
  }, [createFolder])

  const rootFolders = folderIds
    .map((id) => folders[id])
    .filter((f): f is FolderRow => !!f && f.parentId === null)

  return (
    <View style={styles.sidebar}>
      {/* Search shortcut */}
      <Pressable style={styles.searchButton} onPress={onSearch}>
        <Text style={styles.searchIcon}>⌘</Text>
        <Text style={styles.searchLabel}>Search</Text>
        <Text style={styles.searchHint}>K</Text>
      </Pressable>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* All Notes */}
        <Pressable
          style={[
            styles.navItem,
            selectedFolderId === null && !selectedNoteId && styles.navItemActive,
          ]}
          onPress={handleAllNotes}
        >
          <Text style={styles.navIcon}>📝</Text>
          <Text style={styles.navLabel}>All Notes</Text>
        </Pressable>

        {/* Folders */}
        {rootFolders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Folders</Text>
              <Pressable onPress={handleNewFolder} hitSlop={8}>
                <Text style={styles.addIcon}>+</Text>
              </Pressable>
            </View>

            {rootFolders.map((folder) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                isSelected={selectedFolderId === folder.id}
                isExpanded={expandedFolderIds.has(folder.id)}
                onPress={handleFolderPress}
                onToggle={toggleExpanded}
              />
            ))}
          </View>
        )}

        {rootFolders.length === 0 && (
          <Pressable style={styles.navItem} onPress={handleNewFolder}>
            <Text style={styles.navIcon}>📁</Text>
            <Text style={styles.navLabelMuted}>New Folder</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* New Note button */}
      <Pressable style={styles.newNoteButton} onPress={onNewNote}>
        <Text style={styles.newNoteLabel}>+ New Note</Text>
      </Pressable>
    </View>
  )
}

function FolderRow({
  folder,
  isSelected,
  isExpanded,
  onPress,
  onToggle,
}: {
  folder: FolderRow
  isSelected: boolean
  isExpanded: boolean
  onPress: (id: string) => void
  onToggle: (id: string) => void
}): React.JSX.Element {
  return (
    <Pressable
      style={[styles.navItem, isSelected && styles.navItemActive]}
      onPress={() => onPress(folder.id)}
    >
      <Pressable onPress={() => onToggle(folder.id)} hitSlop={8}>
        <Text style={styles.chevron}>{isExpanded ? '▾' : '▸'}</Text>
      </Pressable>
      <Text style={styles.navIcon}>📁</Text>
      <Text style={styles.navLabel} numberOfLines={1}>
        {folder.name}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  sidebar: {
    width: 220,
    height: '100%',
    backgroundColor: '#f9f9f9',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#e5e5e5',
    flexDirection: 'column',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e0e0e0',
  },
  searchIcon: { fontSize: 11, color: '#737373' },
  searchLabel: { flex: 1, fontSize: 13, color: '#737373' },
  searchHint: { fontSize: 11, color: '#a3a3a3' },
  scroll: { flex: 1 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginHorizontal: 6,
    marginVertical: 1,
  },
  navItemActive: { backgroundColor: '#e8e8e8' },
  navIcon: { fontSize: 14, width: 20, textAlign: 'center' },
  navLabel: { flex: 1, fontSize: 13, color: '#0a0a0a', fontWeight: '400' },
  navLabelMuted: { flex: 1, fontSize: 13, color: '#737373' },
  chevron: { fontSize: 10, color: '#a3a3a3', width: 14, textAlign: 'center' },
  section: { marginTop: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#a3a3a3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addIcon: { fontSize: 16, color: '#a3a3a3', lineHeight: 20 },
  newNoteButton: {
    margin: 12,
    paddingVertical: 10,
    backgroundColor: '#171717',
    borderRadius: 8,
    alignItems: 'center',
  },
  newNoteLabel: { fontSize: 13, fontWeight: '600', color: '#fafafa' },
})
