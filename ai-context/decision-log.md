# Decision log

## Implemented decisions

- Browser development uses actual SQLite compiled to WebAssembly, with database bytes in IndexedDB, rather than localStorage score counters.
- Tauri and browser storage share a database abstraction; Tauri packaging is scaffolded but Rust is not installed in the current development environment.
- Scores are derived from source/destination event deltas. This naturally guarantees equal reduction/increase for transfers.
- Reset creates a new scoring session rather than erasing history.
- The eight days are explicit integer fields, not inferred from calendar dates.
- Selecting a day chooses where new events and undo compensations are recorded; it does not filter current scores or public analytics.
- Saved reason labels are snapshotted onto events so later hiding/restoring a catalogue option cannot alter history.
- Atonement offerings are fixed product values: Turtle Dove 2, Ram 3, Ox 4.
- Daily Tithe is a batch UI action represented by separate immutable source-team events so each transfer remains auditable.
- “That day’s points” for Tithe means positive net points earned on that day before Tithe, excluding seeds. This avoids re-tithing previous days’ cumulative balances.
- Tithe results round independently per house to the nearest integer.
- The dashboard uses effective events (undone pairs removed) for understandable gross analytics, while the ledger continues to expose every record.
- The normal projector includes compact analytics; the expanded dashboard is a separate hash route for a denser data story.
- The 2026 printed-material design handoff supersedes the initial dark sports-dashboard palette. All routes now share a parchment/navy/gold noticeboard shell.
- House presentation is resolved from the semantic team map: Israel royal blue, Judah parchment gold with navy foreground, and Levi crimson/wine.
- Projector mobile layout keeps the leader expanded and renders the other houses as compact cards.
- Git commit `4582acd` is the complete pre-redesign restore point requested by the user.
- The printed-material theme has two modes: parchment Light is the predictable default; Dark is a dark-linen/navy interpretation using the same house identities and gold ornament system.
- Theme preference is local UI state, not score data. It persists in localStorage, applies before first render, and synchronizes between open tabs.
- Active day is now a recording input only. This supersedes the earlier decision that day selection also filtered public/current scores; all current KPIs and analytics cover the complete event.
- The projector and dashboard use a fixed horizontal activity ticker to keep recent changes visible without consuming a vertical panel.
- The dashboard's generic top KPI cards and separate day-total panel were replaced by a score-over-time line chart, per-house award-source bars, and gained-versus-taken donut charts.
- Current placeholder SVG banners no longer embed house names, preventing duplicate labels when the interface renders the house name.
- Future supplied artwork has a documented offline drop zone under `public/assets/`.
- The organizer permits natural document scrolling on smaller laptop displays rather than clipping controls; its header prioritizes the three current-score KPIs over an event title.
- New saved reasons are always available to both awards and deductions and are created inline from the score desk selector. Legacy reason rows retain their original database shape for backup compatibility.
- Backup/import/reset and wheel configuration are contained in the organizer's top-right settings popover, leaving the ledger to occupy the recovered layout space.
- The organizer ledger is scoped to the active recording day only; full event history remains in JSON/CSV exports and can be viewed by changing the active day.
- The projector activity ticker duplicates its latest items into a continuous, pause-on-hover crawl.
- The Atonement decision wheel is a non-scoring facilitation control. It uses persisted relative weights in `settings`, and any outcome must be manually recorded through the existing immutable score desk.
- Low-opacity Hebrew alphabet characters replace the isolated lower-right ornament as the shared parchment/linen background field; no external font is required.

## Product choices that may be revisited explicitly

- Whether Atonement notes should become required rather than encouraged.
- Whether Tithe should use gross awards rather than net daily points.
- Whether fractional percentage results should use floor, ceiling, or banker’s rounding instead of nearest integer.
- Whether a Tithe batch should have a single group-level undo button.
- Whether the public dashboard needs its own day selector independent from the organizer’s active day.
- Whether structured participant/duty entities should replace free-form notes.
