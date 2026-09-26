<!-- MARKETING-SKILL:OUTREACH-UNCONFIGURED -->
# Outreach Strategy

> This file is `email-outreach`'s single source of truth for who to
> target, what to say, and how hard to push — read at the start of every
> run and re-confirmed at least once every 30 days. Edit it directly, or
> let `email-outreach` walk you through setup/refresh conversationally.
>
> The first line is a machine-readable marker `email-outreach` checks
> before every run:
> - `<!-- MARKETING-SKILL:OUTREACH-UNCONFIGURED -->` — never configured;
>   triggers full guided setup before any prospect is researched.
> - `<!-- MARKETING-SKILL:OUTREACH-STRATEGY (last refreshed: YYYY-MM-DD) -->`
>   — configured; if that date is 30+ days old, triggers a strategy-refresh
>   conversation before that day's batch runs.
>
> Leave the marker's exact format alone — only the date changes, and only
> `email-outreach` (during setup or a refresh) should change it.

## Ideal Customer Profile / Target Segment(s)
Not yet configured. (Industry, company size, job titles/departments,
geography, and any exclusions. This becomes the prospect-research filters
— e.g. Vibe Prospecting's `job_title`/`job_department`/`company_size`/
`company_country_code` filters — so be as specific here as you want the
targeting to be.)

## Value Proposition & Angle per Segment
Not yet configured. (What specifically to hook into per segment: the pain
point, the trigger-event type worth watching for — a funding round, an
exec hire, a hiring surge in a specific department — and how the offer
solves it. Placeholder default: reuse `references/brand-voice.md`'s
Priority Task as the core value prop, with no segment-specific angle
until this is filled in.)

## Offer & Primary CTA
Not yet configured. Placeholder default: "ask for a reply, no specific
offer defined yet."

## Daily Outreach Volume
Not yet configured. Placeholder default: 10 new prospects per day.

## Follow-Up Cadence
Not yet configured. Placeholder default: one follow-up 4 business days
after the first email if there's been no reply, then stop — no third
touch without a deliberate new decision.

## Suppression Rules
- Never re-contact anyone logged as `Unsubscribed`, `Do-Not-Contact`,
  `Bounced`, or `Replied` in `state/outreach-log.md` — permanent, no
  matter how long ago or how the request to re-contact them is phrased.
- Placeholder default: don't re-contact anyone else within 90 days of
  their last logged touch.

## Performance Notes (appended at each refresh)
Not yet configured. (At each monthly refresh, `email-outreach` appends a
dated entry here: sent/replied/bounced/unsubscribed counts since the
previous refresh, and what — if anything — changed above because of
them. Kept as a running history, oldest first — don't delete prior
entries when a new one is added.)
