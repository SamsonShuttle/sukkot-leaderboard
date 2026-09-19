import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

export interface DatabaseAdapter {
  readonly kind: 'browser-sqlite' | 'tauri-sqlite'
  execute(sql: string, params?: unknown[]): Promise<void>
  select<T extends Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>
  transaction(steps: Array<{ sql: string; params?: unknown[] }>): Promise<void>
  reload(): Promise<void>
  exportBytes(): Promise<Uint8Array | null>
  close(): Promise<void>
}

const DB_KEY = 'sukkot-leaderboard-sqlite-v1'
const IDB_NAME = 'sukkot-leaderboard-storage'
const IDB_STORE = 'database'
const CATALOG_KEY = 'sukkot-leaderboard-database-catalog-v1'
const DEFAULT_DATABASE_ID = 'default'

export interface DatabaseProfile {
  id: string
  name: string
  createdAt: string
}

export interface DatabaseCatalog {
  activeId: string
  databases: DatabaseProfile[]
}

const defaultProfile = (): DatabaseProfile => ({ id: DEFAULT_DATABASE_ID, name: 'Sukkot Camp', createdAt: new Date().toISOString() })

const databaseKey = (id: string) => id === DEFAULT_DATABASE_ID ? DB_KEY : `${DB_KEY}:${id}`
const databaseFileName = (id: string) => id === DEFAULT_DATABASE_ID ? 'sukkot-leaderboard.db' : `sukkot-leaderboard-${id}.db`

const validProfile = (value: unknown): value is DatabaseProfile => {
  if (!value || typeof value !== 'object') return false
  const profile = value as Record<string, unknown>
  return typeof profile.id === 'string' && /^[a-z0-9-]+$/i.test(profile.id)
    && typeof profile.name === 'string' && Boolean(profile.name.trim()) && profile.name.length <= 80
    && typeof profile.createdAt === 'string'
}

export function getDatabaseCatalog(): DatabaseCatalog {
  try {
    const parsed = JSON.parse(localStorage.getItem(CATALOG_KEY) ?? 'null') as Partial<DatabaseCatalog> | null
    const databases = parsed?.databases?.filter(validProfile) ?? []
    if (!databases.length) return { activeId: DEFAULT_DATABASE_ID, databases: [defaultProfile()] }
    const activeId = databases.some((database) => database.id === parsed?.activeId) ? String(parsed?.activeId) : databases[0].id
    return { activeId, databases }
  } catch {
    return { activeId: DEFAULT_DATABASE_ID, databases: [defaultProfile()] }
  }
}

function saveDatabaseCatalog(catalog: DatabaseCatalog) {
  localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog))
}

export function createDatabaseProfile(name: string): DatabaseCatalog {
  const cleanName = name.trim()
  if (!cleanName) throw new Error('Enter a database name')
  if (cleanName.length > 80) throw new Error('Keep database names to 80 characters or fewer')
  const catalog = getDatabaseCatalog()
  const database: DatabaseProfile = { id: crypto.randomUUID(), name: cleanName, createdAt: new Date().toISOString() }
  const next = { activeId: database.id, databases: [...catalog.databases, database] }
  saveDatabaseCatalog(next)
  return next
}

export function selectDatabaseProfile(id: string): DatabaseCatalog {
  const catalog = getDatabaseCatalog()
  if (!catalog.databases.some((database) => database.id === id)) throw new Error('That database is no longer available')
  const next = { ...catalog, activeId: id }
  saveDatabaseCatalog(next)
  return next
}

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(IDB_STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function loadBytes(id: string): Promise<Uint8Array | undefined> {
  const database = await openIndexedDb()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IDB_STORE, 'readonly')
    const request = transaction.objectStore(IDB_STORE).get(databaseKey(id))
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

async function saveBytes(id: string, bytes: Uint8Array): Promise<void> {
  const database = await openIndexedDb()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IDB_STORE, 'readwrite')
    transaction.objectStore(IDB_STORE).put(bytes.slice().buffer, databaseKey(id))
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

async function removeBrowserDatabase(id: string): Promise<void> {
  const database = await openIndexedDb()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IDB_STORE, 'readwrite')
    transaction.objectStore(IDB_STORE).delete(databaseKey(id))
    transaction.oncomplete = () => { database.close(); resolve() }
    transaction.onerror = () => { database.close(); reject(transaction.error) }
  })
}

class BrowserSqliteAdapter implements DatabaseAdapter {
  readonly kind = 'browser-sqlite' as const

  constructor(private database: SqlJsDatabase, private readonly SQL: SqlJsStatic, private readonly id: string) {
    this.exposeForDevtools()
  }

  private exposeForDevtools() {
    // SQLite Explorer needs a page-global sql.js Database. Restrict this to
    // localhost so a deployed build never publishes the live database object.
    if (!['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) return
    window.db = this.database
    window.sukkotDb = this.database
  }

  private async persist() {
    await saveBytes(this.id, this.database.export())
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
    const bytes = await loadBytes(this.id)
    if (!bytes) return
    this.database.close()
    this.database = new this.SQL.Database(bytes)
    this.exposeForDevtools()
  }

  async exportBytes() {
    return this.database.export()
  }

  async close() {
    this.database.close()
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

  async exportBytes() {
    // The native database is already a normal on-disk SQLite file.
    return null
  }

  async close() {
    const closable = this.database as typeof this.database & { close?: () => Promise<void> }
    await closable.close?.()
  }
}

export async function deleteDatabaseProfile(id: string, kind: DatabaseAdapter['kind']): Promise<DatabaseCatalog> {
  const catalog = getDatabaseCatalog()
  if (catalog.activeId === id) throw new Error('Select another database before deleting this one')
  if (catalog.databases.length <= 1) throw new Error('Keep at least one database')
  if (!catalog.databases.some((database) => database.id === id)) throw new Error('That database is no longer available')
  if (kind === 'browser-sqlite') {
    await removeBrowserDatabase(id)
  } else {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('delete_database', { databaseId: id })
  }
  const next = { activeId: catalog.activeId, databases: catalog.databases.filter((database) => database.id !== id) }
  saveDatabaseCatalog(next)
  return next
}

export async function createDatabase(id = DEFAULT_DATABASE_ID): Promise<DatabaseAdapter> {
  if (window.__TAURI_INTERNALS__) {
    const { default: Database } = await import('@tauri-apps/plugin-sql')
    const database = await Database.load(`sqlite:${databaseFileName(id)}`)
    return new TauriSqliteAdapter(database)
  }

  const SQL = await initSqlJs({ locateFile: () => wasmUrl })
  const bytes = await loadBytes(id)
  return new BrowserSqliteAdapter(bytes ? new SQL.Database(bytes) : new SQL.Database(), SQL, id)
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
      reason TEXT,
      atonement_offering TEXT,
      inventory_team TEXT REFERENCES teams(id),
      inventory_delta INTEGER NOT NULL DEFAULT 0 CHECK(inventory_delta BETWEEN -1 AND 1)
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
    `CREATE TABLE IF NOT EXISTS score_event_reason_annotations (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES score_events(id),
      reason TEXT NOT NULL,
      operator TEXT,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS annotations_by_event_time
      ON score_event_reason_annotations(event_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      winner TEXT,
      citation TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
  if (!eventColumns.some((column) => column.name === 'atonement_offering')) {
    await database.execute('ALTER TABLE score_events ADD COLUMN atonement_offering TEXT')
  }
  if (!eventColumns.some((column) => column.name === 'inventory_team')) {
    await database.execute('ALTER TABLE score_events ADD COLUMN inventory_team TEXT REFERENCES teams(id)')
  }
  if (!eventColumns.some((column) => column.name === 'inventory_delta')) {
    await database.execute('ALTER TABLE score_events ADD COLUMN inventory_delta INTEGER NOT NULL DEFAULT 0 CHECK(inventory_delta BETWEEN -1 AND 1)')
  }
}
