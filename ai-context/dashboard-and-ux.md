# Dashboard and UX behavior

## Default projector analytics

The normal leaderboard includes a compact “Point story” section below the team cards. For each team it shows:

- effective net movement through the selected day;
- gross points gained;
- gross points taken away;
- the largest incoming reason/source.

The strip contains a clear Full data dashboard button, and the projector header also contains a dashboard icon button.

## Full dashboard

The `#/dashboard` route is a high-contrast public display with:

- trip totals for new awards, direct deductions, transfers, and effective event count;
- one panel per team with current cumulative score, gross gained, gross taken, and net movement;
- “Where points came from” bars grouped by saved reason/source;
- “Why points were taken” bars grouped by saved reason, Tithe percentage, Atonement offering, or transfer description;
- cumulative day-by-day score progression;
- recent free-form explanatory notes with day and operator context.

Dashboard data is scoped from Day 1 through the organizer-selected active day. Undone actions are excluded from dashboard gross analytics, while the organizer history remains the complete audit record.

## Future dashboard data

Likely extensions include participant names as structured entities, duty/activity categories, event locations, attendance, per-person contributions, awards by ministry/activity, and filters for day/team/reason. Add these as typed data rather than parsing free-form notes whenever they become required.

Charts currently use semantic HTML, CSS bars, and Framer Motion to remain offline and avoid a charting dependency. Introduce a chart library only when richer interaction materially warrants the bundle cost.

