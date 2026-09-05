# Architecture

## Stack

- React 19 + Vite + strict TypeScript
- Tailwind CSS utility foundation plus project-specific CSS in `src/styles.css`
- Framer Motion for transient UI movement
- Lucide React icons
- SQLite via `sql.js` in browsers and Tauri SQL plugin natively
- Vitest for pure ledger and analytics tests
- Tauri v2 shell scaffold under `src-tauri/`

## Important modules

- `src/App.tsx` — initialization, route selection, live state refresh, cross-tab broadcasts, and mutation callbacks.
- `src/data/database.ts` — common database interface and browser/native adapters.
- `src/data/ledger.ts` — migrations, validation, immutable event writes, session/day/reason management, backup/import, Tithe transaction, and derived score state.
- `src/types.ts` — domain types and team configuration.
- `src/config.ts` — configurable UI/scoring defaults, including Atonement offerings and Tithe rates.
- `src/lib/analytics.ts` — pure extensible dashboard model.
- `src/components/PublicLeaderboard.tsx` — default projector route.
- `src/components/ProjectorInsights.tsx` — compact default-view analytics element.
- `src/components/DataDashboard.tsx` — full data dashboard.
- `src/components/OrganizerView.tsx` — scoring control surface.
- `src/components/ActivityFeed.tsx` — public activity and grouped organizer history.
- `src/components/ActivityTicker.tsx` — fixed horizontal recent-activity strip shared by projector and dashboard.
- `src/components/ThemeToggle.tsx` — persistent, cross-tab Light/Dark control.
- `src/components/AtonementWheel.tsx` — weighted, non-scoring projector wheel; its odds are loaded from the SQLite-backed `settings` table.

## Routing

The app intentionally uses lightweight hash routes without a router dependency:

- empty hash / `#/` → leaderboard
- `#/dashboard` → data dashboard
- `#/organizer` → controls

## Extension approach

When adding more data points:

1. Add a typed field or related immutable entity.
2. Migrate both fresh and existing SQLite databases.
3. Include the field in JSON/CSV backup paths.
4. Update pure analytics derivation.
5. Add a focused dashboard component or breakdown.
6. Add unit tests that reconcile the new metric with ledger score behavior.

Avoid embedding business calculations directly in JSX. Components should consume typed, derived metrics.

Organizer data tools call typed ledger methods directly rather than dispatching a custom window event. Browser downloads attach a temporary anchor to the document and defer object-URL revocation for WebKit compatibility. The database adapter exposes read-only byte export in the browser; native builds use their existing on-disk file.
