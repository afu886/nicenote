import type { OPSQLiteConnection } from '@op-engineering/op-sqlite'

// ──────────────────────────────────────────────────────────────────────────────
// Schema DDL — version 1
// ──────────────────────────────────────────────────────────────────────────────

const V1: string[] = [
  `CREATE TABLE IF NOT EXISTS folders (
    id         TEXT    PRIMARY KEY,
    name       TEXT    NOT NULL,
    parent_id  TEXT    REFERENCES folders(id) ON DELETE CASCADE,
    position   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL,
    updated_at TEXT    NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders (parent_id)`,

  `CREATE TABLE IF NOT EXISTS notes (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL DEFAULT 'Untitled',
    content    TEXT,
    summary    TEXT,
    folder_id  TEXT REFERENCES folders(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_notes_cursor ON notes (updated_at, id)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes (folder_id)`,

  // FTS5 for full-text search — op-sqlite ships with FTS5 enabled
  `CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5 (
    id        UNINDEXED,
    title,
    content,
    content='notes',
    content_rowid='rowid'
  )`,
  `CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts (rowid, id, title, content)
    VALUES (new.rowid, new.id, new.title, new.content);
  END`,
  `CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
    INSERT INTO notes_fts (notes_fts, rowid, id, title, content)
    VALUES ('delete', old.rowid, old.id, old.title, old.content);
    INSERT INTO notes_fts (rowid, id, title, content)
    VALUES (new.rowid, new.id, new.title, new.content);
  END`,
  `CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
    INSERT INTO notes_fts (notes_fts, rowid, id, title, content)
    VALUES ('delete', old.rowid, old.id, old.title, old.content);
  END`,

  `CREATE TABLE IF NOT EXISTS tags (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    color      TEXT,
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS note_tags (
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id  TEXT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags (note_id)`,
  `CREATE INDEX IF NOT EXISTS idx_note_tags_tag  ON note_tags (tag_id)`,
]

export interface Migration {
  version: number
  statements: string[]
}

export const migrations: Migration[] = [{ version: 1, statements: V1 }]

// ──────────────────────────────────────────────────────────────────────────────
// Runner (synchronous — JSI guarantees no bridge round-trips)
// ──────────────────────────────────────────────────────────────────────────────

export function runMigrations(connection: OPSQLiteConnection): void {
  connection.execute(
    'CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)'
  )

  const { rows } = connection.execute(
    'SELECT COALESCE(MAX(version), 0) AS version FROM _migrations'
  )
  const current = (rows as Array<{ version: number }>)[0]?.version ?? 0

  for (const migration of migrations) {
    if (migration.version <= current) continue

    connection.execute('BEGIN')
    try {
      for (const stmt of migration.statements) {
        connection.execute(stmt)
      }
      connection.execute('INSERT INTO _migrations VALUES (?, ?)', [
        migration.version,
        new Date().toISOString(),
      ])
      connection.execute('COMMIT')
    } catch (err) {
      connection.execute('ROLLBACK')
      throw err
    }
  }
}
