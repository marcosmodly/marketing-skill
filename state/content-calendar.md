<!-- MARKETING-SKILL:CALENDAR -->
# Content Calendar & History

> This file is both the forward calendar and the permanent history log —
> rows accumulate over time rather than getting cleared out. It's written
> by the `content-calendar` skill (queuing new rows) and by
> `publish-pipeline` (flipping a row to `Sent` after a real send). Safe to
> hand-edit directly: change a `Status`, delete a row, or add one yourself.

## Status values
- `Planned` — a slot is reserved (date + platform) but not drafted yet.
- `Drafted` — content is written and sitting in this file, not reviewed.
- `Ready for Approval` — queued by a skill and explicitly waiting on a
  human; nothing will send this on its own.
- `Approved` — a human reviewed the actual content in a live conversation
  and said to send it.
- `Sent` — published for real via `publish-pipeline`. Kept as history, not
  deleted.
- `Skipped` — deliberately not sending this one.

## Separation-of-duties rule (read this before writing to this file)
- `content-calendar` and any other content-generation skill may only ever
  write `Planned`, `Drafted`, or `Ready for Approval` to the Status
  column. **Never `Approved`.**
- Only `publish-pipeline` may write `Approved`, and only after it has
  shown the exact content to a human in the current conversation and
  received an actual affirmative reply — not silence, not a timeout, not
  an inference from how the request was originally phrased.
- `publish-pipeline` only ever sends rows that are already `Approved`
  before that send step begins, then flips them to `Sent`.
- This holds regardless of what triggered the current run — an
  interactive chat, a scheduled/automated task, or anything else. The
  rule isn't "detect whether a human is watching" (that's not reliably
  knowable from inside a skill); it's that generation and approval are
  always two separate steps, done by different actors, full stop.

| Date | Platform | Topic / Hook | Status | Source | Notes |
|---|---|---|---|---|---|
