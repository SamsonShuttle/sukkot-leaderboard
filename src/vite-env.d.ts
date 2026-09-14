/// <reference types="vite/client" />

interface Window {
  __TAURI_INTERNALS__?: unknown
  /** Exposed only by the localhost Vite build for SQLite Explorer debugging. */
  db?: import('sql.js').Database
  sukkotDb?: import('sql.js').Database
}
