# Dashboard and UX behavior

## Default projector analytics

The normal leaderboard includes a compact “Point story” section below the team cards and a slow continuously moving, stock-style recent-activity ticker. Sparse feeds repeat their available entries to keep the lane visually filled; cards remain close together and pause on hover. The team cards retain complete-event current scores, while Point story uses the selected active recording day and follows the same live score order as the cards. For each house it shows every effective reason contributing points that day and every reason deducting points that day, grouped into gained and deducted sections with event counts and a net day movement.

Each public team card also includes an Atonements component directly beneath its points. Judah and Israel show a wallet with one image for each of Turtle Dove, Ram, Ox, and 10% Tithe alongside ready/found counts. Images are not duplicated as quantity grows; a type's single image turns greyscale when none of its found copies remain ready. Levi instead shows received totals for the same four Atonement categories from Judah and Israel.

The Point story panel uses a small dashboard icon link overlapping its top-right border, and the projector header also contains a dashboard icon button. Undo/restore chains are represented by one root activity card, with the original action struck through while undone and the latest compensation time shown inline.

The projector exposes a Spin the wheel icon in its header action group. Its modal fits within the projector page, places a colour legend above the wheel, and renders a compact value inside every ticket (`10%`, `2`, `3`, `4`, `PASS`, or `↻`). Callout sizing adapts to the number of weighted tickets. The wheel spins continuously until Stop is clicked, with subtle shake, friction rings, and outward sparks building tension; the final facilitation result is a large animated callout. These effects respect reduced-motion preferences. The wheel never mutates the score ledger. Organizer settings controls each outcome's relative chance. Weighted outcomes appear as equal-sized, colour-coded tickets distributed around the wheel, so the segment under the fixed pointer always reconciles with the announced result.

Projector and full-dashboard pages allow natural vertical page scrolling when their content exceeds the viewport. The fixed activity ticker remains visible, and bottom padding keeps the final dashboard content clear of it.

## Full dashboard

The `#/dashboard` route is a compact, one-screen, high-contrast public display organized around data visualization rather than generic KPI callouts:

- a primary multi-series line chart showing cumulative Judah, Israel, and Levi scores from Day 1 through the latest day that has recorded ledger events, without drawing a flat continuation to unused later days;
- a side bar chart grouped by house showing the leading reasons/sources of awarded points;
- one donut/flow visualization per team comparing gross points gained with points taken;
- top source and top deduction labels per team;
- an always-visible horizontal recent-activity ticker.

Dashboard data covers the complete active event. The selected day only tags new organizer entries. Undone actions are excluded from dashboard gross analytics. The organizer keeps the original immutable action visible, strikes through its presentation, and shows the undo time inline; the compensating record remains available in the raw ledger and exports.

All public and organizer routes include a persistent Light/Dark theme toggle. Light uses parchment and cream surfaces; Dark uses dark navy/linen surfaces while preserving the same antique-gold framing, serif typography, house colours, labels, and accessibility behavior.

The organizer is intentionally dense at desktop size but permits natural page scrolling on smaller MacBook screens. The header is limited to back navigation, current team totals, connection/theme status, and settings. The Score desk's Add Atonement tab adds a found Turtle Dove, Ram, Ox, or 10% Tithe to Judah or Israel, shows their ready/found counts, and displays Levi's effective received totals separately. The Atonement score form previews when a selected offering will be consumed and explicitly says that the source house keeps its points while Levi gains the offering value. Saved reasons are created inline from the scoring selector; historical add/deduct/transfer rows in the immutable ledger can also receive a saved or newly created reason through an append-only annotation. Backup/import/reset and wheel odds live in the top-right settings menu. The active-day immutable ledger occupies the side space and has its own scroll area for longer histories.

## Future dashboard data

Likely extensions include participant names as structured entities, duty/activity categories, event locations, attendance, per-person contributions, awards by ministry/activity, and filters for day/team/reason. Add these as typed data rather than parsing free-form notes whenever they become required.

Charts currently use semantic HTML, CSS bars, and Framer Motion to remain offline and avoid a charting dependency. Introduce a chart library only when richer interaction materially warrants the bundle cost.
