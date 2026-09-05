# Product brief

## Event and audience

This is a local-first leaderboard for an eight-day church glamping/Sukkot trip. It is operated live by an organizer and shown publicly on a projector. It should feel celebratory and polished without letting animation obscure scores or slow rapid scoring.

The three teams are fixed:

- House of Judah
- House of Israel
- House of Levi

## Application surfaces

- `#/` — compact public projector leaderboard with large current-event rankings, scores, offline animated banners, compact analytics, database status, full-screen control, navigation, an always-visible scrolling recent-activity strip, and a non-scoring Atonement decision wheel overlay.
- `#/dashboard` — one-screen projector data dashboard led by visual analysis: a score-over-time line chart, per-team award-source bars, inflow/outflow donut charts, and the shared activity ticker.
- `#/organizer` — compact control desk for active-day selection, scoring, Tithe, Atonement, inline saved-reason creation, active-day immutable history, and a top-right settings menu for backup/import, CSV export, reset, and wheel odds.

No authentication is required in the first version. Route separation is intentional rather than a security boundary.

## Operational requirements

- Must work without a network connection at runtime.
- Scores and configuration must survive browser/app closure.
- Large click/touch targets are required.
- Larger deductions/transfers require confirmation.
- JSON backup/import and CSV ledger export are required.
- The UI must clearly show successful database loading.
- Browser projector and organizer tabs synchronize locally.
- The organizer-selected day is a ledger input for new events, not a filter for current totals or public visuals.
- Tauri is scaffolded for eventual macOS packaging while browser development remains first-class.

## Visual identity

- A warm parchment digital noticeboard derived from the 2026 printed event materials, with a dark-navy header and antique-gold framing.
- Israel uses royal blue, Judah parchment gold with navy ink, and Levi crimson/wine. Antique gold unifies all three houses.
- Serif display headings pair with accessible sans-serif controls and tabular score numerals.
- Distinctive placeholder banners live in `public/banners/` and are designed for easy replacement.
- Flag movement is CSS/SVG-based and offline.
- Framer Motion drives brief count, celebration, and transfer animations with reduced-motion support.
- `design-handoff.md` is authoritative for tokens, house treatment, responsive behavior, and accessibility.
