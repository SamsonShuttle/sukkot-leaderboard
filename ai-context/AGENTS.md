# Agent context entrypoint

This folder is the durable handoff for AI agents and future development chats. Read the smallest relevant set, but always read `product-brief.md` and `decision-log.md` before making behavior changes.

## Reading order

1. `product-brief.md` — audience, goals, routes, and feature expectations.
2. `scoring-rules.md` — authoritative scoring, day, reason, Atonement, Tithe, and undo behavior.
3. `data-model.md` — SQLite tables, event semantics, migrations, backup behavior, and analytics derivation.
4. `architecture.md` — React structure, persistence adapters, synchronization, and extension points.
5. `dashboard-and-ux.md` — projector, organizer, compact insights, and full dashboard behavior.
6. `decision-log.md` — explicit decisions and interpretations made during implementation.
7. `verification.md` — test coverage, operational commands, and known environment constraints.

## Agent working rules

- Do not infer scores from mutable counters. Source all scores and dashboard numbers from `score_events`.
- Do not silently change Tithe eligibility or rounding; those rules are product decisions documented in `scoring-rules.md`.
- Do not remove old columns or events during browser migrations. Existing installations must upgrade in place.
- A hidden reason remains valid historical data; hiding only removes it from new dropdowns.
- New dashboard dimensions should be added in typed analytics structures in `src/lib/analytics.ts`.
- Keep dashboard summaries reconcilable with the selected day’s leaderboard score.
- Prefer small, testable pure functions for new score and analytics calculations.

