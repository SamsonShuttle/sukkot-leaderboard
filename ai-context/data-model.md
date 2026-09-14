# Data model and persistence

## Certificate catalogue

The `certificates` table stores `id`, `title`, optional `winner`, optional `citation`, `created_at`, and `updated_at` for awards night. It is independent of `score_events` for now so certificates can be awarded without points; a future relationship can be added without changing the reveal flow.

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
- `event_type`: seed, add, deduct, transfer, tithe, atonement, atonement_acquire, or undo
- `points`: positive integer magnitude
- `source_team`
- `destination_team`
- `operator`
- `note`
- `reverses_event_id`
- `day_number`: 1–8
- `reason`: immutable reason/offering/percentage snapshot
- `atonement_offering`: optional typed Turtle Dove, Ram, Ox, or 10% Tithe identifier
- `inventory_team`: house whose Atonement inventory changes
- `inventory_delta`: `1` for found, `-1` for spent, otherwise `0`

A partial unique index ensures only one undo can target any event. Repeated undo/restore actions therefore form a one-child compensation chain without mutating earlier rows.

### `score_reasons`

Persistent organizer-managed dropdown catalogue: `id`, case-insensitive unique `label`, `applies_to` (add/deduct/both), `active`, and `created_at`.

### `score_event_reason_annotations`

Append-only late annotations for historical score rows: `id`, `event_id`, `reason`, optional `operator`, and `created_at`. The original `score_events.reason` value is never mutated; the latest annotation is resolved for organizer, projector, dashboard, CSV, and analytics views. JSON backups include this table separately so existing event history remains intact.

### `settings`

Key/value application settings. `active_session_id` points to the current scoring session. `wheel_weights` stores the persisted relative odds (0–5 per result) for the non-scoring projector decision wheel.

## Score derivation

`calculateScores()` walks every active-session ledger event and subtracts from sources/adds to destinations. No mutable score column exists. A token-funded Atonement has no score source and Levi as its destination, so Levi gains points while the owning house is unchanged. `calculateAtonementInventory()` derives Judah and Israel's found, ready, and spent Turtle Dove, Ram, Ox, and 10% Tithe tokens from effective ledger events; no mutable inventory total exists. A spent 10% Tithe records the percentage-derived point value calculated at use time. `calculateAtonementReceipts()` derives Levi's effective receipt counts from Atonement events originating with Judah or Israel. The organizer's active day does not filter these current totals. `calculateDaySummaries()` separately derives daily changes and cumulative closing scores. `calculateDailyTitheStatus()` uses the active recording day to derive eligible daily bases and detect an active prior Tithe.

## Dashboard derivation

`src/lib/analytics.ts` is the typed analytics layer. It removes undone event pairs from effective analytics and can scope through a requested day. Public and full-dashboard callers request all eight days so current-score visuals always represent the complete active event. It derives per-team gross gained, gross lost, net movement, breakdowns by reason and event type, trip-level new/removed/moved totals, recent noted events, and a selected-day per-house reason breakdown for the projector Point story.

Add future data dimensions to the immutable event schema and analytics types/functions. Avoid creating a parallel mutable reporting database unless scale demands it.

## Browser and native persistence

- Browser: `sql.js` runs SQLite in WebAssembly. Serialized database bytes are persisted to IndexedDB after mutations.
- Tauri: `@tauri-apps/plugin-sql` opens `sqlite:sukkot-leaderboard.db` on disk.
- Browser tabs use `BroadcastChannel` to reload changed bytes and update projector/dashboard views.

Browser IndexedDB details are intentionally stable for troubleshooting: database `sukkot-leaderboard-storage`, object store `database`, key `sukkot-leaderboard-sqlite-v1`. The organizer can export those bytes as a standard `.sqlite3` snapshot for IDE inspection. Native SQLite is stored relative to Tauri's app configuration directory.

Migrations inspect SQLite schema with `PRAGMA table_info` before adding newer columns so first-release databases upgrade in place. New annotation tables are created idempotently alongside the existing ledger tables.

## Backup compatibility

JSON backup contains teams, sessions, events, event-reason annotations, settings, and saved reasons. Import validates all required table arrays, the three house records, active-session reference, event types, point values, days, house references, annotation targets, and optional Atonement inventory fields before starting replacement. It then uses one transaction with explicit column lists and defaults missing legacy `active_day`, `day_number`, `reason`, and Atonement inventory values safely. CSV includes the effective day, reason, Atonement inventory fields, operator, note, and reversal identifiers.
