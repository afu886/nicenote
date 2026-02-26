import { open, type OPSQLiteConnection } from '@op-engineering/op-sqlite'
import { drizzle } from 'drizzle-orm/op-sqlite'

import { runMigrations } from './migrations'
import * as schema from './schema'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type Database = ReturnType<typeof drizzle<typeof schema>>

// ──────────────────────────────────────────────────────────────────────────────
// Singleton
// ──────────────────────────────────────────────────────────────────────────────

let _db: Database | null = null
let _connection: OPSQLiteConnection | null = null

export interface DatabaseOptions {
  name?: string
  /** Absolute path to the directory where the database file will be stored.
   *  Defaults to the app's Documents directory when omitted. */
  location?: string
}

export function initDatabase(options: DatabaseOptions = {}): Database {
  if (_db) return _db

  const connection = open({
    name: options.name ?? 'nicenote.db',
    ...(options.location ? { location: options.location } : {}),
  })

  // WAL mode — better concurrent read performance, safer crash recovery
  connection.execute('PRAGMA journal_mode=WAL')
  connection.execute('PRAGMA foreign_keys=ON')
  // Tighten synchronization inside WAL mode (safe + fast)
  connection.execute('PRAGMA synchronous=NORMAL')

  runMigrations(connection)

  _connection = connection
  _db = drizzle(connection, { schema })
  return _db
}

export function getDatabase(): Database {
  if (!_db) throw new Error('Database not initialized — call initDatabase() at app startup.')
  return _db
}

export function closeDatabase(): void {
  _connection?.close()
  _connection = null
  _db = null
}
