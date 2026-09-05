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

The standard projector view includes a compact **Point story** strip showing points gained, points taken away, net movement, and each house's leading source. Use **Full data dashboard** for team-by-team reason breakdowns, transfer totals, daily progression, and scoring notes. Dashboard figures follow the organizer's active day and exclude actions that have been undone; the complete immutable audit trail remains visible in organizer history.

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
- Each event is assigned to one of the eight trip days. Choose the active scoring day in the organizer view; the leaderboard then shows cumulative scores through that day.
- Organizer history is grouped by day and shows each house's closing total after every day. Existing databases are migrated safely, with older events assigned to Day 1.
- Add reusable point reasons in **Point reasons**. A reason can appear for awards, deductions, or both; hiding it removes it from new dropdowns without changing historical events.
- **Atonement** always transfers from Judah or Israel to Levi. Its fixed dropdown is Turtle Dove (2 points), Ram (3 points), or Ox (4 points), with a separate note for names and behaviour/duty context.
- **Daily Tithe** applies either 5% or 10% to both Judah and Israel at once. It uses each house's positive net points earned on the active day before tithe, excludes opening seed balances, rounds each house to the nearest whole point, and prevents duplicate active tithes for that day.
- Undo inserts a compensating event with reversed source/destination; it never deletes the original.
- Starting a new event creates a new scoring session and selects it as active. Earlier sessions remain available in JSON backups.

For safe live use, export a JSON backup before the event and after each day. JSON import replaces the current local database after confirmation. CSV export contains the active session's event history for reporting.

## Banners and customization

Offline placeholder banners are in `public/banners/`:

```text
public/banners/judah.svg
public/banners/israel.svg
public/banners/levi.svg
```

Replace those files with real artwork using the same names, or update `bannerUrl` in `src/types.ts`. The wind motion is CSS-based and applies to replacement images automatically.

Quick point values, the large-action confirmation threshold, and the visible Tithe/Atonement labels and defaults are centralized in `src/config.ts`.

Product rules, architecture, data semantics, design decisions, extension guidance, and verification expectations are maintained in `ai-context/`. Future coding chats should begin with the root `AGENTS.md`, which points to the relevant context documents.

## Operational notes

- Keep the projector on the public route and the scorekeeper on the organizer route. Browser tabs synchronize score changes through a local broadcast channel; no internet connection is used.
- Deductions and transfers of 50+ points require confirmation. Every recent non-seed action also offers **Undo**.
- Negative scores are intentionally permitted so deductions and transfers are faithfully represented.
- The green database status indicator confirms that migrations and the active scoring session loaded successfully.
