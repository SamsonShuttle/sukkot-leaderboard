# Data model and persistence

## SQLite tables

### `teams`

Static presentation metadata for Judah, Israel, and Levi: identifiers, names, colours, accents, and banner URLs.

### `scoring_sessions`

Represents a complete camp/event ledger. Fields include `id`, `name`, `created_at`, and `active_day`. Starting a new event creates a new session and switches the active session; it does not delete older sessions.

### `score_events`

Append-only scoring ledger. Important fields:

- `id`
- `session_id`
- `created_at`
- `event_type`: seed, add, deduct, transfer, tithe, atonement, or undo
- `points`: positive integer magnitude
- `source_team`
- `destination_team`
- `operator`
- `note`
- `reverses_event_id`
- `day_number`: 1–8
- `reason`: immutable reason/offering/percentage snapshot

A partial unique index ensures only one undo can target an original event.

### `score_reasons`

Persistent organizer-managed dropdown catalogue: `id`, case-insensitive unique `label`, `applies_to` (add/deduct/both), `active`, and `created_at`.

### `settings`

Key/value application settings. `active_session_id` points to the current scoring session.

## Score derivation

`calculateScores()` walks ledger events and subtracts from sources/adds to destinations. No mutable score column exists. `calculateDaySummaries()` derives daily changes and cumulative closing scores. `calculateDailyTitheStatus()` derives eligible daily bases and detects an active prior Tithe.

## Dashboard derivation

`src/lib/analytics.ts` is the typed analytics layer. It removes undone event pairs from effective analytics, scopes data through the active day, then derives per-team gross gained, gross lost, net movement, breakdowns by reason and event type, trip-level new/removed/moved totals, and recent noted events.

Add future data dimensions to the immutable event schema and analytics types/functions. Avoid creating a parallel mutable reporting database unless scale demands it.

## Browser and native persistence

- Browser: `sql.js` runs SQLite in WebAssembly. Serialized database bytes are persisted to IndexedDB after mutations.
- Tauri: `@tauri-apps/plugin-sql` opens `sqlite:sukkot-leaderboard.db` on disk.
- Browser tabs use `BroadcastChannel` to reload changed bytes and update projector/dashboard views.

Migrations inspect SQLite schema with `PRAGMA table_info` before adding newer columns so first-release databases upgrade in place.

## Backup compatibility

JSON backup contains teams, sessions, events, settings, and saved reasons. Import uses explicit column lists and defaults missing legacy `active_day`, `day_number`, and `reason` values safely. CSV includes day, reason, operator, note, and reversal identifiers.

