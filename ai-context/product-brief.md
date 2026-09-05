# Product brief

## Event and audience

This is a local-first leaderboard for an eight-day church glamping/Sukkot trip. It is operated live by an organizer and shown publicly on a projector. It should feel celebratory and polished without letting animation obscure scores or slow rapid scoring.

The three teams are fixed:

- House of Judah
- House of Israel
- House of Levi

## Application surfaces

- `#/` — public projector leaderboard with large rankings, scores, offline animated banners, recent activity, compact analytics, database status, full-screen control, and links to the dashboard and organizer.
- `#/dashboard` — full projector-friendly data dashboard. It explains where points came from, what was taken away, why, team flows, day progression, and explanatory notes.
- `#/organizer` — simple control desk for active-day selection, scoring, Tithe, Atonement, reason management, immutable history, backup/import, CSV export, and starting a new event.

No authentication is required in the first version. Route separation is intentional rather than a security boundary.

## Operational requirements

- Must work without a network connection at runtime.
- Scores and configuration must survive browser/app closure.
- Large click/touch targets are required.
- Larger deductions/transfers require confirmation.
- JSON backup/import and CSV ledger export are required.
- The UI must clearly show successful database loading.
- Browser projector and organizer tabs synchronize locally.
- Tauri is scaffolded for eventual macOS packaging while browser development remains first-class.

## Visual identity

- High-contrast dark projector surface with oversized typography.
- Judah uses warm red/gold, Israel blue/light blue, and Levi green/lime.
- Placeholder banners live in `public/banners/` and are designed for easy replacement.
- Flag movement is CSS/SVG-based and offline.
- Framer Motion drives brief count, celebration, and transfer animations with reduced-motion support.

