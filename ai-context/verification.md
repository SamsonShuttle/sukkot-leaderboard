# Verification and operations

## Commands

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
npm run tauri:dev
npm run tauri:build
```

Default development URL is `http://localhost:5173/`.

## Current automated coverage

Vitest covers:

- add, deduct, and transfer score deltas;
- Tithe/Atonement conservation of total points;
- compensating undo behavior;
- eight-day cumulative summaries;
- daily Tithe base exclusions and active-rate detection;
- analytics gain/loss reason grouping;
- exclusion of undone pairs from dashboard analytics;
- dashboard analytics when an explicit reporting-day scope is requested by a caller;
- line-chart day domain ending at the latest day with recorded events.
- Atonement inventory acquisition, spent-token retention, token-funded score protection, compensating undo restoration, and dynamic 10% Tithe-token payouts.

## Browser verification completed during development

- Database initialization and ready status.
- Projector and organizer layouts at 1600×1000.
- Award, Daily Tithe, and Atonement score movement.
- Day switching and day-grouped closing totals.
- Browser persistence after full reload.
- Cross-tab organizer-to-projector synchronization.
- Persistent saved reason creation and dropdown appearance.
- Historical ledger reason annotation from a saved dropdown or an inline new reason, with the effective reason reflected in Point Story and the recent-activity ticker; no browser console errors.
- 10% Tithe preview and atomic transfers from both Judah and Israel.
- Duplicate daily Tithe protection.
- Ox Atonement with a person/duty note retained in history.
- Printed-material projector, dashboard, and organizer theme at 1600×1000.
- Matching light parchment and dark linen modes across all three routes, with persisted preference.
- Compact 1600×1000 projector, organizer, and expanded dashboard layouts without document scrolling.
- Whole-event KPIs remaining unchanged when the active recording day is switched.
- Chart-led dashboard with cumulative score lines, award-source bars, gain/deduction rings, and the shared recent-activity ticker.
- Compact organizer at 1440×900 with natural scrolling available, an inline reason-creation selector, settings popover, and active-day-only ledger.
- Persisted wheel-odds changes after reload, plus projector wheel spin/reveal behavior without score mutation.
- Exhaustive wheel-geometry tests confirm every ticket is centred under the pointer from multiple starting rotations; browser verification confirms indefinite spin-until-stop and DOM pointer/result agreement after deceleration.
- Browser verification at 1440×900 confirms all weighted wheel ticket callouts fit, sparks/friction effects remain outside the score graphic, and the enlarged result stays within the modal. Pointer and announced result matched after the dramatic stop sequence.
- A one-event activity feed renders 16 repeated crawl cards across a 4,147px track at desktop size, with 259px cards and a 96-second loop, eliminating the previous empty lane without speeding up the ticker.
- Mobile projector layout at 390×844, including expanded leader and compact trailing houses.
- Mobile Atonement wallet at 390×844, including the expanded leader's ready/found counts and retained greyscale spent token.
- Populated leaderboard re-ranking and recent activity under the new theme.
- Native select controls verified at a minimum 48–52px height in WebKit.
- No browser console errors during the design verification flow.
- At 1440×900, the organizer adds an Ox to Judah, previews automatic owned-Ox use, then applies it with Judah remaining at 10 and Levi increasing to 4. The projector shows the Ox at `0 / 1` in Judah's wallet with greyscale artwork, while the organizer ledger retains the acquisition as `Used`. Undo returns Levi to 0 and the Ox to `1 ready · 1 found` without deleting either historical event.
- At 1440×900, Levi is absent from the found-offering team selector. A point-funded Turtle Dove from Judah increments Levi's organizer and projector receipt totals to 1 while leaving Judah and Israel's wallet presentation unchanged.
- At 1440×900, a 10% Tithe Atonement applied to Judah at 10 points transfers 1 point to Levi and increments Levi's dedicated 10% Tithe receipt count in both the organizer and projector; the browser console remains error-free.
- At 1440×900, the organizer adds a 10% Tithe inventory token to Judah at 100 points and previews its automatic use. Applying it leaves Judah at 100, awards Levi 10, increments Levi's Tithe receipt total, and retains Judah's token as a greyscale `0 / 1` entry on the projector. The activity feed explicitly reports the owned-token payment and the browser console remains error-free.
- At 1440×900, adding two Turtle Doves to Judah renders one wallet image with a `2 / 2` count rather than duplicate artwork. After both are used, the same single image is greyscale at `0 / 2`; the browser console reports no errors or warnings.
- At 1440×900, the Score desk displays an Add Atonement tab beside the five score-action tabs. It records found offerings and retains Levi's receipt summary. With 17 active-day ledger events, the immutable ledger stays contained in its own overflowing scroll panel and the browser console remains error-free.
- At 1440×900 with 22 active-day events, the Immutable Ledger has a 1,232px scroll height inside a 567px viewport. Mouse-wheel scrolling reaches the lower ledger entries, with no browser console errors.
- At 1440×900, adding and undoing a Judah score leaves one visible original ledger row with struck-through action text and an inline `Undone [time]` marker; the browser console reports no errors.
- Unit coverage confirms that undoing an undo restores the root score, Atonement inventory, and Levi receipt derivations while the event chain remains append-only.
- Unit coverage confirms the latest historical reason annotation wins without mutating the original score event, and invalid annotation backups are rejected.
- At 1440×900, the projector Point story follows the ranked card order and shows the active day’s per-house gained/deducted reason rows, including distinct award, Daily Tithe, and Atonement contributions; it no longer presents a whole-event top-source/net duplicate.
- JSON, CSV, and raw SQLite exports create non-empty files from the browser organizer. JSON contained all expected tables, CSV contained the immutable event row, and `PRAGMA integrity_check` returned `ok` for the downloaded SQLite snapshot.
- A malformed JSON backup is rejected inline before replacement. A freshly exported valid JSON backup completes a browser import/reload round trip with scores preserved and no console errors.

## Environment note

Node.js and npm are available. Rust/Cargo were not installed when the Tauri shell was scaffolded, so web builds are verified but native packaging has not yet been executed on this machine.
