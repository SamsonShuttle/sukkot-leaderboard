# Verification and operations

## Commands

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
npm run tauri:dev
npm run tauri:build
```

Default development URL is `http://localhost:5173/`.

## Current automated coverage

Vitest covers:

- add, deduct, and transfer score deltas;
- Tithe/Atonement conservation of total points;
- compensating undo behavior;
- eight-day cumulative summaries;
- daily Tithe base exclusions and active-rate detection;
- analytics gain/loss reason grouping;
- exclusion of undone pairs from dashboard analytics;
- dashboard analytics when an explicit reporting-day scope is requested by a caller.

## Browser verification completed during development

- Database initialization and ready status.
- Projector and organizer layouts at 1600×1000.
- Award, Daily Tithe, and Atonement score movement.
- Day switching and day-grouped closing totals.
- Browser persistence after full reload.
- Cross-tab organizer-to-projector synchronization.
- Persistent saved reason creation and dropdown appearance.
- 10% Tithe preview and atomic transfers from both Judah and Israel.
- Duplicate daily Tithe protection.
- Ox Atonement with a person/duty note retained in history.
- Printed-material projector, dashboard, and organizer theme at 1600×1000.
- Matching light parchment and dark linen modes across all three routes, with persisted preference.
- Compact 1600×1000 projector, organizer, and expanded dashboard layouts without document scrolling.
- Whole-event KPIs remaining unchanged when the active recording day is switched.
- Chart-led dashboard with cumulative score lines, award-source bars, gain/deduction rings, and the shared recent-activity ticker.
- Mobile projector layout at 390×844, including expanded leader and compact trailing houses.
- Populated leaderboard re-ranking and recent activity under the new theme.
- Native select controls verified at a minimum 48–52px height in WebKit.
- No browser console errors during the design verification flow.

## Environment note

Node.js and npm are available. Rust/Cargo were not installed when the Tauri shell was scaffolded, so web builds are verified but native packaging has not yet been executed on this machine.
