# Scoring rules

## General ledger behavior

Every scoring action creates an immutable event with a UUID, session, timestamp, trip day, event type, positive whole-number magnitude, optional source team, optional destination team, optional operator, optional saved reason snapshot, optional free-form note, and optional reversed-event reference.

Direction is generic:

- A source team loses the event magnitude.
- A destination team gains the event magnitude.
- Add: destination only.
- Deduct: source only.
- Transfer: source and destination.
- Tithe and Atonement: Judah or Israel is the source and Levi is the destination.

Negative team scores are allowed. Current-score KPIs on the projector, dashboard, and organizer always include every event in the active scoring session, regardless of the selected recording day.

## Days

There are exactly eight trip days. The organizer selects the active day solely as an input attached to new actions and undo compensations. Switching it must not rewind the public view, analytics, or current-score KPIs. History is grouped by day and shows each team’s closing cumulative total after that day. Older databases are migrated with existing events assigned to Day 1.

## Undo

Undo never deletes the original event. It creates a new `undo` event with source and destination reversed and `reverses_event_id` pointing to the original. An event can only be undone once, and undo events cannot themselves be undone.

Analytics exclude an undone original together with its compensation so dashboard gross totals describe the currently effective scoreboard. The immutable history still shows both records.

## Persistent award/deduction reasons

Organizers add reasons directly from the Saved reason selector. New reasons are created as `both`, so the same concise catalogue appears for awards and deductions. Legacy saved reasons retain their prior applicability/status safely; active reasons appear in the scoring dropdown.

The selected reason label is copied onto each event as an immutable snapshot. A later catalogue status change therefore does not rewrite history. Free-form notes remain separate from the saved reason.

## Atonement

Atonement is a consequence for poor behaviour or missed duties. It always transfers from either Judah or Israel to Levi. The offering dropdown is fixed:

- Turtle Dove — 2 points
- Ram — 3 points
- Ox — 4 points

The selected offering is saved as the event reason. The organizer UI provides a prominent optional “Names / behaviour reason” note field for who was involved and what happened.

## Daily Tithe

Daily Tithe is applied to the active day, once per day unless every active Tithe event for that day is undone. The organizer selects 5% or 10%, previews both houses, and one click creates up to two Tithe events atomically:

- Judah → Levi
- Israel → Levi

The base for each house is its positive net points earned on that active day before Tithe events. Opening seed balances are excluded. Ordinary additions, deductions, transfers, and Atonement affect the net base. If a house’s eligible net is zero or negative, that house owes zero and no zero-point event is created.

Each house’s percentage result is rounded independently to the nearest whole point. Levi receives the sum of those rounded amounts. The selected percentage is stored in the event reason, for example `Daily tithe · 10%`.

Tithe is intended as an end-of-day action. If later events are recorded for that day, the existing Tithe is not automatically recalculated; undo the Tithe events and apply it again if needed.

## Atonement decision wheel

The projector wheel is a facilitation prompt, not a scoring action. It offers 10% Tithe, Turtle Dove, Ram, Ox, Free pass, and Spin again. An organizer starts the wheel, lets it run indefinitely, and presses Stop; the randomly selected visible segment beneath the pointer is the result shown in text. An organizer must manually record any resulting score event from the existing score desk, preserving the immutable ledger and its normal confirmation rules. Each outcome has a persisted 0–5 relative weight configured from Organizer settings; zero removes that outcome from the wheel and at least one outcome must remain enabled. Each weight unit becomes one equal-sized ticket, and repeated outcome colours are distributed around the circle where possible.
