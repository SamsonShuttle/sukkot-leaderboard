# Decision log

## Certificate awards

Certificates are stored in a separate local SQLite table and are not currently derived from or linked to score points. Winners may remain blank until awards night.

## Implemented decisions

- Browser development uses actual SQLite compiled to WebAssembly, with database bytes in IndexedDB, rather than localStorage score counters.
- Tauri and browser storage share a database abstraction; Tauri packaging is scaffolded but Rust is not installed in the current development environment.
- Scores are derived from source/destination event deltas. This naturally guarantees equal reduction/increase for transfers.
- Reset creates a new scoring session rather than erasing history.
- The eight days are explicit integer fields, not inferred from calendar dates.
- Selecting a day chooses where new events and undo compensations are recorded; it does not filter current scores or public analytics.
- Saved reason labels are snapshotted onto events so later hiding/restoring a catalogue option cannot alter history.
- Atonement offerings are fixed product values: Turtle Dove 2, Ram 3, Ox 4.
- Atonement also offers a separate 10% Tithe option. It transfers 10% of the selected house’s current score, rounded to the nearest whole point; it does not use or mark the active day’s Daily Tithe status.
- Daily Tithe is a batch UI action represented by separate immutable source-team events so each transfer remains auditable.
- “That day’s points” for Tithe means positive net points earned on that day before Tithe, excluding seeds. This avoids re-tithing previous days’ cumulative balances.
- Tithe results round independently per house to the nearest integer.
- The dashboard uses effective events (undone pairs removed) for understandable gross analytics, while the ledger continues to expose every record.
- The normal projector includes a selected-day per-house Point story ordered exactly like the ranked team cards; each story lists effective gained and deducted reasons instead of repeating the current whole-event total. The expanded dashboard remains a separate hash route for a denser data story.
- The Point story omits its title row and uses a small dashboard icon link overlapping the panel's top-right border to preserve space for the breakdown data.
- The 2026 printed-material design handoff supersedes the initial dark sports-dashboard palette. All routes now share a parchment/navy/gold noticeboard shell.
- House presentation is resolved from the semantic team map: Israel royal blue, Judah parchment gold with navy foreground, and Levi crimson/wine.
- Projector mobile layout keeps the leader expanded and renders the other houses as compact cards.
- Git commit `4582acd` is the complete pre-redesign restore point requested by the user.
- The printed-material theme has two modes: parchment Light is the predictable default; Dark is a dark-linen/navy interpretation using the same house identities and gold ornament system.
- Theme preference is local UI state, not score data. It persists in localStorage, applies before first render, and synchronizes between open tabs.
- Active day is now a recording input only. This supersedes the earlier decision that day selection also filtered public/current scores; all current KPIs and analytics cover the complete event.
- The projector and dashboard use a fixed horizontal activity ticker to keep recent changes visible without consuming a vertical panel.
- The dashboard's generic top KPI cards and separate day-total panel were replaced by a score-over-time line chart, per-house award-source bars, and gained-versus-taken donut charts.
- The dashboard line chart domain ends at the last day with ledger events. Empty days before that day remain on the axis so the series stays continuous; later unused days are omitted instead of repeating a flat closing score through Day 8.
- Current placeholder SVG banners no longer embed house names, preventing duplicate labels when the interface renders the house name.
- Future supplied artwork has a documented offline drop zone under `public/assets/`.
- The organizer permits natural document scrolling on smaller laptop displays rather than clipping controls; its header prioritizes the three current-score KPIs over an event title.
- New saved reasons are always available to both awards and deductions and are created inline from the score desk selector. Legacy reason rows retain their original database shape for backup compatibility.
- Historical score rows can receive a saved or newly created reason from the organizer ledger. Late reason changes are append-only annotations resolved as the latest displayed reason, so original score events remain immutable.
- Backup/import/reset and wheel configuration are contained in the organizer's top-right settings popover, leaving the ledger to occupy the recovered layout space.
- The organizer ledger is scoped to the active recording day only; full event history remains in JSON/CSV exports and can be viewed by changing the active day.
- Undo compensations remain append-only records, but the organizer folds each undo/restore chain into its original visible ledger row: original text is struck through while undone, the latest compensation time is shown inline, and one action button targets the latest chain entry (labelled `Undo` or `Undo undo`) instead of rendering a growing list of standalone events.
- Found-offering entry lives in an Add Atonement Score desk tab rather than a separate organizer card; the active-day ledger uses an independent scroll area so long histories do not lengthen the control desk. Its day group retains its natural content height, allowing the ledger viewport—not a clipped inner group—to scroll to every event.
- The projector activity ticker duplicates its latest items into a continuous, pause-on-hover crawl.
- The Atonement decision wheel is a non-scoring facilitation control. It uses persisted relative weights in `settings`, and any outcome must be manually recorded through the existing immutable score desk.
- The projector's non-scoring wheel launcher lives in the header action group so it cannot cover the Point story or ticker.
- Low-opacity Hebrew alphabet characters replace the isolated lower-right ornament as the shared parchment/linen background field; no external font is required.
- Wheel selection is pointer-led: stopping first chooses one equal-sized weighted ticket, computes the exact rotation that centres that ticket beneath the fixed pointer, and announces that ticket only after deceleration completes.
- Wheel outcome text lives in a six-colour legend above the graphic. Repeated weighted tickets reuse their outcome colour but are interleaved around the circle whenever the configured weights permit.
- Wheel tickets also retain short, dynamically sized value callouts for at-a-glance reading. Spin drama uses CSS shake, friction rings, and sparks around the graphic, while the final result receives the dominant animated treatment and reduced-motion preferences suppress continuous effects.
- Sparse activity feeds repeat the latest available entries to fill a full projector-width crawl. The ticker uses narrower cards and a 96-second-or-longer loop so activity remains dense but calm.
- JSON/CSV downloads use an attached temporary link and delayed blob-URL cleanup so WebKit has time to begin reading the file. Data-tool failures are displayed inline instead of surfacing as unhandled async errors or blocking alerts.
- Backup import must validate the complete backup and its active-session/event references before the destructive transaction begins. A failed validation leaves the existing database untouched.
- Browser users can export the exact serialized SQLite bytes as a `.sqlite3` inspection snapshot. This is separate from the portable JSON backup and must not be edited and re-imported as application data.
- The localhost Vite build exposes the live `sql.js` object as `window.db` for the SQLite Explorer DevTools extension. The hook is development-only; the persisted source of truth remains IndexedDB.
- Supplied house crest PNGs are resolved from the central semantic team map and use `object-fit: contain` so the vertical artwork is never cropped. Supplied Tithe and Atonement artwork is centralized in scoring configuration, shown in the wheel while retaining numeric/text callouts, and repeated in offering selectors plus recorded-event cards without becoming ledger data.
- The public projector restores explicit house labels, names, and motifs below the header. The supplied Lion, Menorah, and Priests-with-Ark cutout icons replace the previous banner artwork in the shared team map. The only ambient projector treatment is a restrained, reduced-motion-safe shine on the current leader's coloured header.
- Found Turtle Doves, Rams, Oxen, and 10% Tithes are a team-level second currency derived from append-only score-ledger events, not mutable counters. A matching available token is consumed automatically before Judah or Israel loses points; Levi still receives the offering value as newly awarded points. The value of a Tithe token is 10% of the owning house's current score when used.
- Each Atonement type uses one image on the owning team's public card; ready/found counts represent multiple copies without duplicating artwork. The image turns greyscale when all found copies are used. Undoing a spend makes a copy available again; a spent acquisition cannot be undone until its consuming Atonement is undone.
- Levi is receipts-only for the Atonement currency. Found offerings can be assigned only to Judah or Israel; Levi's component derives and displays receipt totals from effective Atonement events, including both token-funded and point-funded payments.
- Levi's receipt totals include the one-off 10% Tithe Atonement as a fourth category, and Judah or Israel may hold it as a findable inventory token.
- The root route is a central control centre rather than a public display. The projector has a stable `#/projector` route so the organizer can open independent tabs for the projector, organizer, dashboard, and awards surfaces from one starting page.
- The control centre owns a database library separate from scoring sessions. Each library entry is a complete local SQLite ledger; selecting one synchronizes all local tabs, and organizer backup/import/export tools operate only on the selected entry. Whole-database deletion is confirmed, unavailable for the active/final entry, and does not mutate ledger rows.
- Projector scoring moments use a fixed centred frame so Framer Motion scaling cannot displace them from the viewport centre. They remain visible for at least 6.4 seconds; Atonements, Tithes, and 50+-point actions receive an 8.5-second dramatic treatment that is larger and uses a restrained gold flare.
- Fruits of the Spirit is a positive camp-leader recognition feature, not an Atonement inversion in the data model: each of the nine Galatians 5:22–23 choices creates a standard immutable 5-point `add` event for the selected house with a fixed reason snapshot. Its 5-point actions nevertheless receive the extended projector callout so the recognition is visible to the room.
- Fruit selection and the projector reveal use an original bundled 3×3 botanical illustration sprite. The projector's Fruit call-out mirrors the Atonement presentation with the matching centred image above a one-line “Fruit of the Spirit” title; no remote artwork is loaded at runtime.
- Fruits of the Spirit have one shared projector board rather than a per-team wallet. It shows all nine illustrations, then repeats the receiving house's supplied crest for every effective immutable recognition under that fruit. This is a ledger-derived display, so undo and restore automatically remove and return the relevant badge.

## Product choices that may be revisited explicitly

- Whether Atonement notes should become required rather than encouraged.
- Whether Tithe should use gross awards rather than net daily points.
- Whether fractional percentage results should use floor, ceiling, or banker’s rounding instead of nearest integer.
- Whether a Tithe batch should have a single group-level undo button.
- Whether the public dashboard needs its own day selector independent from the organizer’s active day.
- Whether structured participant/duty entities should replace free-form notes.
