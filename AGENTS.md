# Sukkot Leaderboard agent instructions

Before changing this project, read `ai-context/AGENTS.md` and the documents it identifies as relevant to the task.

Non-negotiable project rules:

- Preserve the immutable score ledger. Corrections are compensating events; never delete or mutate historical score events.
- Keep the app local-first and fully usable without internet access.
- Maintain both browser SQLite (`sql.js` persisted to IndexedDB) and Tauri native SQLite adapters.
- Treat the active trip day as the display and recording scope. Scores shown for a selected day are cumulative through that day.
- Keep the projector UI high-contrast, legible at distance, and usable in full screen.
- Add analytics by deriving them from ledger events rather than creating separate mutable totals.
- Update the appropriate files in `ai-context/` when product behavior, schema, or architectural decisions change.
- Run `npm test` and `npm run build` after implementation. Visually verify meaningful UI changes in a real browser.

