# Dashboard and UX behavior

## Default projector analytics

The normal leaderboard includes a compact “Point story” section below the team cards and a continuously moving, stock-style recent-activity ticker. Its values cover the complete current event. For each team it shows:

- effective net movement across the complete current event;
- gross points gained;
- gross points taken away;
- the largest incoming reason/source.

The strip contains a clear Full data dashboard button, and the projector header also contains a dashboard icon button.

The projector also exposes a bottom-right Spin the wheel control. Its modal fits within the projector page, places a colour legend above an uncluttered wheel, spins continuously until Stop is clicked, and produces a clearly labelled facilitation result only; it never mutates the score ledger. Organizer settings controls each outcome's relative chance. Weighted outcomes appear as equal-sized, colour-coded tickets distributed around the wheel, so the segment under the fixed pointer always reconciles with the announced result.

## Full dashboard

The `#/dashboard` route is a compact, one-screen, high-contrast public display organized around data visualization rather than generic KPI callouts:

- a primary multi-series line chart showing cumulative Judah, Israel, and Levi scores across all eight days;
- a side bar chart grouped by house showing the leading reasons/sources of awarded points;
- one donut/flow visualization per team comparing gross points gained with points taken;
- top source and top deduction labels per team;
- an always-visible horizontal recent-activity ticker.

Dashboard data covers the complete active event. The selected day only tags new organizer entries. Undone actions are excluded from dashboard gross analytics, while the organizer history remains the complete audit record.

All public and organizer routes include a persistent Light/Dark theme toggle. Light uses parchment and cream surfaces; Dark uses dark navy/linen surfaces while preserving the same antique-gold framing, serif typography, house colours, labels, and accessibility behavior.

The organizer is intentionally dense at desktop size but permits natural page scrolling on smaller MacBook screens. The header is limited to back navigation, current team totals, connection/theme status, and settings. Saved reasons are created inline from the scoring selector; backup/import/reset and wheel odds live in the top-right settings menu. The ledger fills the recovered side space and only displays events for the selected active recording day.

## Future dashboard data

Likely extensions include participant names as structured entities, duty/activity categories, event locations, attendance, per-person contributions, awards by ministry/activity, and filters for day/team/reason. Add these as typed data rather than parsing free-form notes whenever they become required.

Charts currently use semantic HTML, CSS bars, and Framer Motion to remain offline and avoid a charting dependency. Introduce a chart library only when richer interaction materially warrants the bundle cost.
