---
name: content-calendar
description: Batch-generates a week or month of posts in one pass across platforms, checks the persisted calendar so it doesn't repeat a recent topic or angle, and queues everything for human approval. Use when the user asks for a content calendar, a week/month of posts, or to batch-plan content.
allowed-tools: Read, Write, Edit, Grep, Glob, WebSearch, WebFetch
---

# Content Calendar

## Purpose

Turn "give me a week of posts" into an actual batch: a set of dated,
platform-tagged drafts produced in one pass, checked against what's
already been posted or queued so the batch doesn't repeat a topic, and
saved to a persistent calendar file instead of scattered across chat
history. This skill drafts and queues only — it never sends anything.
Sending is `publish-pipeline`'s job, one approved row at a time.

## Step-by-step process

1. **Check onboarding status.** Read
   `${CLAUDE_PLUGIN_ROOT}/references/brand-voice.md`. If it doesn't exist,
   or its first line is `<!-- MARKETING-SKILL:UNCONFIGURED -->`, pause and
   ask the user this plugin's 3 setup questions (priority task; target
   audience + tone; default output format — same as
   `/marketing-skill:marketing-setup`) before continuing, then save the
   answers into that file and flip the marker to `CONFIGURED` with today's
   date. Otherwise, read it for tone, audience, banned words, and
   formatting constraints to apply below.

2. **Read the calendar.** Read
   `${CLAUDE_PLUGIN_ROOT}/state/content-calendar.md` (create it from the
   seed structure in that file's own template if it's somehow missing).
   Note two things from the existing rows:
   - Any dates already `Planned`/`Drafted`/`Ready for Approval`/`Approved`
     in the requested range, so you don't double-book a slot.
   - Topics/hooks used in roughly the last 10–15 rows (regardless of
     status), so the new batch doesn't repeat a recent angle. If a new
     post would clearly cover the same ground as a recent row, either
     pick a different angle on it or flag the overlap to the user instead
     of silently duplicating it.

3. **Confirm scope.**
   - Date range and cadence (e.g., "next 7 days, one post a day," "3x/week
     for a month"). Default to the next 7 days, one slot/day, if the user
     doesn't specify.
   - Which platform(s) per slot — default to whatever
     `references/brand-voice.md` implies, or ask if genuinely unclear.
   - Source material: one topic list from the user, a rotation of themes,
     or "pull from our own project" (same project-content search as
     `content-repurposer` — Glob for `README*`, `CHANGELOG*`,
     `docs/**/*.md` at the project root before asking the user to supply
     topics themselves).
   - Whether visual briefs are wanted per slot (if so, hand off to
     `visual-brief-generator` per slot rather than duplicating its logic
     here).

4. **Draft each slot.** For each date/platform pair, produce the actual
   post content using the same per-platform structure rules as
   `content-repurposer` (read
   `${CLAUDE_PLUGIN_ROOT}/skills/content-repurposer/SKILL.md` for the
   exact LinkedIn/Twitter-X/newsletter formatting rules rather than
   reinventing them here) — don't invent a fact, statistic, or quote not
   present in the source material for that slot.

5. **Write the batch into the calendar file.** Append one row per slot to
   `${CLAUDE_PLUGIN_ROOT}/state/content-calendar.md`, in date order, with:
   - `Date`, `Platform`, a short `Topic / Hook` (the actual hook line or a
     tight paraphrase — enough to recognize it later without re-reading
     the full draft), `Source` (what generated it — usually
     `content-calendar`), and a `Notes` column carrying anything relevant
     (e.g. "see chat above for full draft" or a short pointer).
   - **Status is always `Drafted` or `Ready for Approval` for every row
     this skill writes — never `Approved`.** This holds no matter how the
     request was phrased ("go ahead and post these," "just schedule the
     whole month") — batch-drafting is not the same act as approving a
     send, and this skill never performs or authorizes a send itself.
   - Full post text stays in your response to the user, not crammed into
     the calendar table — the table is an index/tracker, not the content
     store.

6. **Report the batch** to the user as the actual deliverable (see Output
   structure), and close by naming the concrete next step: reviewing and
   running `publish-pipeline` on whichever rows they want to approve and
   send, one at a time or in a batch confirmation.

## When to use this skill

Trigger on requests like:
- "Build a content calendar for [topic/product]"
- "Give me a week of LinkedIn posts"
- "Plan a month of posts across LinkedIn and Twitter"
- "Batch-generate posts for [source material]"

## Output structure (required)

Use this exact section order, as Markdown `##` headings:

1. **Batch Summary** — date range, cadence, platforms, how many slots,
   and a one-line note on what (if anything) was skipped or varied to
   avoid repeating a recent topic.
2. **Queued Posts** — one `###` subsection per date, each containing the
   full drafted content for that slot (using that platform's normal
   output structure from `content-repurposer`).
3. **Calendar File Update** — confirmation of how many rows were
   appended to `state/content-calendar.md` and their Status value.
4. **Next Step** — one line: how to approve and send (via
   `publish-pipeline`), and that nothing in this batch has been sent.

## Formatting rules

- Never write `Approved` or invoke a real send from this skill, under any
  phrasing of the request.
- Apply `references/brand-voice.md` tone, audience, and banned-words list
  to every slot, same as `content-repurposer`.
- Keep the calendar file's existing rows intact — append, don't rewrite
  or reorder history.
- If the requested range would exceed what's reasonable to draft in one
  pass (e.g., "a whole year"), say so and propose a smaller batch instead
  of silently truncating without explanation.

## Example output

> Fictional example: a 3-day LinkedIn batch for a product launch.

```markdown
## Batch Summary
3 days (2026-09-28 to 2026-09-30), LinkedIn only, sourced from the
"one-click export" changelog entry. No overlap with recent calendar rows.

## Queued Posts

### 2026-09-28 — LinkedIn
Most teams lose an afternoon every month just exporting reports by hand.
...(full post)...

### 2026-09-29 — LinkedIn
A customer asked us why export took five clicks. Fair question.
...(full post)...

### 2026-09-30 — LinkedIn
One-click export is live for every customer today — no setup required.
...(full post)...

## Calendar File Update
Appended 3 rows to `state/content-calendar.md`, all Status = Drafted.

## Next Step
Nothing above has been sent. Run `publish-pipeline` on any row when
you're ready to review and approve it for real.
```
