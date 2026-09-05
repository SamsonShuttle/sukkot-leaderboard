# Decision log

## Implemented decisions

- Browser development uses actual SQLite compiled to WebAssembly, with database bytes in IndexedDB, rather than localStorage score counters.
- Tauri and browser storage share a database abstraction; Tauri packaging is scaffolded but Rust is not installed in the current development environment.
- Scores are derived from source/destination event deltas. This naturally guarantees equal reduction/increase for transfers.
- Reset creates a new scoring session rather than erasing history.
- The eight days are explicit integer fields, not inferred from calendar dates.
- Selecting a day both chooses where new events are recorded and changes public/organizer scores to cumulative totals through that day.
- Saved reason labels are snapshotted onto events so later hiding/restoring a catalogue option cannot alter history.
- Atonement offerings are fixed product values: Turtle Dove 2, Ram 3, Ox 4.
- Daily Tithe is a batch UI action represented by separate immutable source-team events so each transfer remains auditable.
- “That day’s points” for Tithe means positive net points earned on that day before Tithe, excluding seeds. This avoids re-tithing previous days’ cumulative balances.
- Tithe results round independently per house to the nearest integer.
- The dashboard uses effective events (undone pairs removed) for understandable gross analytics, while the ledger continues to expose every record.
- The normal projector includes compact analytics; the expanded dashboard is a separate hash route for a denser data story.

## Product choices that may be revisited explicitly

- Whether Atonement notes should become required rather than encouraged.
- Whether Tithe should use gross awards rather than net daily points.
- Whether fractional percentage results should use floor, ceiling, or banker’s rounding instead of nearest integer.
- Whether a Tithe batch should have a single group-level undo button.
- Whether the public dashboard needs its own day selector independent from the organizer’s active day.
- Whether structured participant/duty entities should replace free-form notes.

