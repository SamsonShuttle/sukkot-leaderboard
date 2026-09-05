# Sukkot Camp Leaderboard

A local-first, projector-friendly score board for an eight-day church glamping trip. It has a public leaderboard and an organizer score desk for the Houses of Judah, Israel, and Levi.

## Start on localhost

Requirements: Node.js 20.19+ (Node 22 or 24 recommended) and npm.

```bash
npm install
npm run dev
```

Vite prints the available addresses. The default local URL is **http://localhost:5173/**.

- Projector view: [http://localhost:5173/](http://localhost:5173/)
- Data dashboard: [http://localhost:5173/#/dashboard](http://localhost:5173/#/dashboard)
- Organizer controls: [http://localhost:5173/#/organizer](http://localhost:5173/#/organizer)

Use the full-screen button in the projector header (or the browser's full-screen shortcut). Data is local to the browser profile and survives restarts. You can keep the projector and organizer routes open in separate tabs; scoring changes synchronize automatically.

Use the moon/sun button in any header to switch between the default parchment **Light** mode and the matching dark-linen **Dark** mode. The preference persists locally and synchronizes across open tabs.

The standard projector view includes a compact **Point story** strip, a slow continuously scrolling recent-activity ticker, and an optional **Spin the wheel** overlay for atonement calls. The wheel keeps spinning until Stop is pressed, shows a short callout inside every segment, adds restrained shake/spark effects while moving, then lands on and dramatically announces the same colour-coded result; organizers record any resulting points manually. Use **Full data dashboard** for cumulative score lines across all eight days, award-source bars, and house gain/deduction rings. Dashboard figures always cover the whole event and exclude actions that have been undone; the complete immutable audit trail remains visible in organizer history.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start browser development at `http://localhost:5173/` |
| `npm test` | Run ledger unit tests |
| `npm run build` | Type-check and create the production web build in `dist/` |
| `npm run preview` | Preview the production web build at `http://localhost:4173/` |
| `npm run tauri:dev` | Run the future native macOS shell in development |
| `npm run tauri:build` | Build a native macOS app/package |

## Persistence model

- **Browser development:** `sql.js` runs actual SQLite in WebAssembly. After every mutation, the SQLite database bytes are saved to IndexedDB under `sukkot-leaderboard-storage`. No network or backend is involved.
- **Tauri desktop:** `@tauri-apps/plugin-sql` opens `sqlite:sukkot-leaderboard.db` on disk. Install the [Rust prerequisites for Tauri](https://v2.tauri.app/start/prerequisites/) before using the Tauri commands.
- Scores are calculated from an append-only `score_events` ledger. Add, deduct, transfer, tithe, atonement, seed, and undo are distinct event types.
- Each event is assigned to one of the eight trip days. The organizer's day selector tags new entries and determines the Daily Tithe base; it does not filter the current leaderboard, dashboard, or organizer KPIs.
- Organizer history is grouped by day and shows each house's closing total after every day. Existing databases are migrated safely, with older events assigned to Day 1.
- Add reusable point reasons directly from the **Saved reason** selector. New reasons are available for both awards and deductions; the selected label is retained on each immutable event.
- **Atonement** always transfers from Judah or Israel to Levi. Its fixed dropdown is Turtle Dove (2 points), Ram (3 points), or Ox (4 points), with a separate note for names and behaviour/duty context.
- **Daily Tithe** applies either 5% or 10% to both Judah and Israel at once. It uses each house's positive net points earned on the active day before tithe, excludes opening seed balances, rounds each house to the nearest whole point, and prevents duplicate active tithes for that day.
- Undo inserts a compensating event with reversed source/destination; it never deletes the original.
- In **Organizer settings**, adjust each wheel result between Off, Rare, Low, Standard, Likely, and Favoured. Wheel odds persist in SQLite and are included in JSON backups.
- Starting a new event creates a new scoring session and selects it as active. Earlier sessions remain available in JSON backups.

For safe live use, export a JSON backup before the event and after each day. JSON import replaces the current local database after confirmation. CSV export contains the active session's event history for reporting.

### Inspecting the SQLite database

There is no SQLite server to connect to: SQLite is an embedded file/database engine.

- **Browser development:** `sql.js` keeps a real SQLite database in memory and serializes its bytes to IndexedDB database `sukkot-leaderboard-storage`, object store `database`, key `sukkot-leaderboard-sqlite-v1`. In Organizer settings, choose **SQLite DB** to download a normal `.sqlite3` snapshot, then open it with DB Browser for SQLite, a VS Code SQLite viewer, DataGrip, or `sqlite3 path/to/file.sqlite3`.
- **Tauri app:** the SQL plugin stores `sukkot-leaderboard.db` under the app configuration directory. With the current bundle identifier, the macOS path is normally `~/Library/Application Support/org.sukkotcamp.leaderboard/sukkot-leaderboard.db`. Close the app or inspect a copied snapshot rather than editing the live file.

JSON backup, history CSV, and browser SQLite exports show an inline success or error message. Imports are fully validated before the existing database is replaced, and the replacement remains one SQLite transaction.

## Banners and customization

Offline placeholder banners are in `public/banners/`:

```text
public/banners/judah.svg
public/banners/israel.svg
public/banners/levi.svg
```

Replace those files with real artwork using the same names, or update `bannerUrl` in `src/types.ts`. The wind motion is CSS-based and applies to replacement images automatically.

New logos, event branding, and future wheel illustrations can first be dropped into `public/assets/`; its README documents the recommended filenames. The interface renders house names separately, so replacement banners do not need embedded text.

Quick point values, the large-action confirmation threshold, and the visible Tithe/Atonement labels and defaults are centralized in `src/config.ts`.

Product rules, architecture, data semantics, design decisions, extension guidance, and verification expectations are maintained in `ai-context/`. Future coding chats should begin with the root `AGENTS.md`, which points to the relevant context documents.

The printed-material theme is documented in `ai-context/design-handoff.md`. The complete app immediately before that visual redesign is preserved in local Git commit `4582acd` (`checkpoint: leaderboard before printed-material redesign`), so the design can be compared or reverted without affecting the scoring specification.

## Operational notes

- Keep the projector on the public route and the scorekeeper on the organizer route. Browser tabs synchronize score changes through a local broadcast channel; no internet connection is used.
- Deductions and transfers of 50+ points require confirmation. Every recent non-seed action also offers **Undo**.
- Negative scores are intentionally permitted so deductions and transfers are faithfully represented.
- The green database status indicator confirms that migrations and the active scoring session loaded successfully.
