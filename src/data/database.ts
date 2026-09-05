import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

export interface DatabaseAdapter {
  readonly kind: 'browser-sqlite' | 'tauri-sqlite'
  execute(sql: string, params?: unknown[]): Promise<void>
  select<T extends Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>
  transaction(steps: Array<{ sql: string; params?: unknown[] }>): Promise<void>
  reload(): Promise<void>
}

const DB_KEY = 'sukkot-leaderboard-sqlite-v1'
const IDB_NAME = 'sukkot-leaderboard-storage'
const IDB_STORE = 'database'

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(IDB_STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function loadBytes(): Promise<Uint8Array | undefined> {
  const database = await openIndexedDb()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IDB_STORE, 'readonly')
    const request = transaction.objectStore(IDB_STORE).get(DB_KEY)
    request.onsuccess = () => {
      database.close()
      resolve(request.result ? new Uint8Array(request.result as ArrayBuffer) : undefined)
    }
    request.onerror = () => {
      database.close()
      reject(request.error)
    }
  })
}

async function saveBytes(bytes: Uint8Array): Promise<void> {
  const database = await openIndexedDb()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IDB_STORE, 'readwrite')
    transaction.objectStore(IDB_STORE).put(bytes.slice().buffer, DB_KEY)
    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error)
    }
  })
}

class BrowserSqliteAdapter implements DatabaseAdapter {
  readonly kind = 'browser-sqlite' as const

  constructor(private database: SqlJsDatabase, private readonly SQL: SqlJsStatic) {}

  private async persist() {
    await saveBytes(this.database.export())
  }

  async execute(sql: string, params: unknown[] = []) {
    this.database.run(sql, params as never[])
    await this.persist()
  }

  async select<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
    const statement = this.database.prepare(sql)
    statement.bind(params as never[])
    const rows: T[] = []
    while (statement.step()) rows.push(statement.getAsObject() as T)
    statement.free()
    return rows
  }

  async transaction(steps: Array<{ sql: string; params?: unknown[] }>) {
    this.database.run('BEGIN IMMEDIATE')
    try {
      for (const step of steps) this.database.run(step.sql, (step.params ?? []) as never[])
      this.database.run('COMMIT')
      await this.persist()
    } catch (error) {
      this.database.run('ROLLBACK')
      throw error
    }
  }

  async reload() {
    const bytes = await loadBytes()
    if (!bytes) return
    this.database.close()
    this.database = new this.SQL.Database(bytes)
  }
}

class TauriSqliteAdapter implements DatabaseAdapter {
  readonly kind = 'tauri-sqlite' as const

  constructor(private readonly database: {
    execute(sql: string, params?: unknown[]): Promise<unknown>
    select<T>(sql: string, params?: unknown[]): Promise<T>
  }) {}

  async execute(sql: string, params: unknown[] = []) {
    await this.database.execute(sql, params)
  }

  async select<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
    return this.database.select<T[]>(sql, params)
  }

  async transaction(steps: Array<{ sql: string; params?: unknown[] }>) {
    await this.database.execute('BEGIN IMMEDIATE')
    try {
      for (const step of steps) await this.database.execute(step.sql, step.params ?? [])
      await this.database.execute('COMMIT')
    } catch (error) {
      await this.database.execute('ROLLBACK')
      throw error
    }
  }


  async reload() {
    // Native SQLite reads the shared on-disk database on every query.
  }
}

export async function createDatabase(): Promise<DatabaseAdapter> {
  if (window.__TAURI_INTERNALS__) {
    const { default: Database } = await import('@tauri-apps/plugin-sql')
    const database = await Database.load('sqlite:sukkot-leaderboard.db')
    return new TauriSqliteAdapter(database)
  }

  const SQL = await initSqlJs({ locateFile: () => wasmUrl })
  const bytes = await loadBytes()
  return new BrowserSqliteAdapter(bytes ? new SQL.Database(bytes) : new SQL.Database(), SQL)
}

export async function migrateDatabase(database: DatabaseAdapter) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      color TEXT NOT NULL,
      accent TEXT NOT NULL,
      banner_url TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS scoring_sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      active_day INTEGER NOT NULL DEFAULT 1 CHECK(active_day BETWEEN 1 AND 8)
    )`,
    `CREATE TABLE IF NOT EXISTS score_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES scoring_sessions(id),
      created_at TEXT NOT NULL,
      event_type TEXT NOT NULL,
      points INTEGER NOT NULL CHECK(points > 0),
      source_team TEXT REFERENCES teams(id),
      destination_team TEXT REFERENCES teams(id),
      operator TEXT,
      note TEXT,
      reverses_event_id TEXT REFERENCES score_events(id),
      day_number INTEGER NOT NULL DEFAULT 1 CHECK(day_number BETWEEN 1 AND 8),
      reason TEXT
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS one_undo_per_event
      ON score_events(reverses_event_id) WHERE reverses_event_id IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS events_by_session_time
      ON score_events(session_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS score_reasons (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL COLLATE NOCASE UNIQUE,
      applies_to TEXT NOT NULL CHECK(applies_to IN ('add', 'deduct', 'both')),
      active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
      created_at TEXT NOT NULL
    )`,
  ]
  for (const sql of statements) await database.execute(sql)

  // Add day support to databases created by the first release. SQLite does not
  // support `ADD COLUMN IF NOT EXISTS`, so inspect the schema before altering it.
  const sessionColumns = await database.select<{ name: string }>('PRAGMA table_info(scoring_sessions)')
  if (!sessionColumns.some((column) => column.name === 'active_day')) {
    await database.execute('ALTER TABLE scoring_sessions ADD COLUMN active_day INTEGER NOT NULL DEFAULT 1 CHECK(active_day BETWEEN 1 AND 8)')
  }
  const eventColumns = await database.select<{ name: string }>('PRAGMA table_info(score_events)')
  if (!eventColumns.some((column) => column.name === 'day_number')) {
    await database.execute('ALTER TABLE score_events ADD COLUMN day_number INTEGER NOT NULL DEFAULT 1 CHECK(day_number BETWEEN 1 AND 8)')
  }
  if (!eventColumns.some((column) => column.name === 'reason')) {
    await database.execute('ALTER TABLE score_events ADD COLUMN reason TEXT')
  }
}
