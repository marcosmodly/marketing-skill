# Example: a full pipeline run, start to finish

This is one continuous run of `full-pipeline`, shown as an actual
conversation transcript rather than a spec. It uses the same fictional
"Northwind Cloud" competitor already referenced in
[`skills/competitor-research/SKILL.md`](skills/competitor-research/SKILL.md)
and [`skills/full-pipeline/SKILL.md`](skills/full-pipeline/SKILL.md), so
you can see the whole shape of a run without installing anything first.

Stages 1–3 are trimmed here for length (each one's real output follows
that skill's own documented structure in full). **Stage 4 is shown in
full**, because it's the part worth actually reading before you trust
this — or any — tool with your accounts.

---

## The request

> **You:** "Research Northwind Cloud as a competitor and run the full
> pipeline on it end to end — repurpose the findings, get a visual brief,
> and publish the LinkedIn post when it's ready."

Note that this message already says "publish it." Keep that in mind for
Stage 4.

## Stage 1: Competitor Research (abbreviated)

```markdown
## Bottom Line
Northwind Cloud shifted from SMB to mid-market pricing last quarter and is
now messaging heavily around "compliance-ready" workflows — overlapping
our own Q3 push and worth a messaging review.

## Recent Moves (last 90 days)
- **2026-08-14** — Launched a SOC 2 compliance dashboard add-on.
- **2026-07-02** — Raised pricing tiers ~20% for new customers.

## Recommendations
1. Audit our messaging for a compliance/security gap, since Northwind's
   new positioning directly targets that white space.
```

*(Full brief includes Company Overview, Messaging Analysis, a complete
SWOT table, and Sources — see `competitor-research`'s own output
structure.)*

## Stage 2: Repurposed Content

```markdown
## LinkedIn Post
Speed got us here. It won't be the only thing that keeps us here.

We built this platform so teams could stop losing afternoons to manual
workflows — that part isn't changing. But "fast" and "audit-ready" don't
have to be a tradeoff, so we've been quietly building out the controls,
logs, and permission model that let security teams say yes without
slowing anyone else down.

More on that soon. For now: if compliance requirements have ever blocked
your team from adopting a faster tool, we'd genuinely like to hear the
story.

#WorkflowAutomation #B2BSaaS #ProductUpdate

## Newsletter Blurb
**Subject line:** Fast doesn't have to mean "not yet, security review pending"

We've heard it before: a team wants to switch to something faster, and a
compliance review stalls it for a quarter.

- Speed is still the reason teams pick us first
- We're actively closing the gap on audit/compliance requirements without
  slowing the core product down
- If a compliance review has ever blocked a tool switch for your team, we
  want to hear about it

[Tell us what your review process actually checks for →]
```

## Stage 3: Visual Brief (abbreviated, no visual-gen tool connected)

```markdown
## Brief Overview
Goal: LinkedIn teaser image pairing with the post above.
Platform: LinkedIn. Format: single image.

## Shot List
| Shot # | Description | Camera/Framing notes |
|---|---|---|
| 1 | Split frame: a cluttered manual workflow on the left, a single clean audit-log entry on the right | Centered, even split |

## Generation Status / Next Steps
No connected image-generation tool was available in this session, so no
asset was generated — this brief is the deliverable. Paste the full
per-scene prompt (see the skill's own output structure) into your tool of
choice, or connect a visual-gen MCP tool and re-run this skill.
```

## Stage 4: the approval checkpoint

This is where it matters that the opening request already said "publish
it." `full-pipeline` and `publish-pipeline` both treat that as
authorization to *run the chain up to this point* — not as a yes on
sending anything. So instead of sending, it stops and shows the exact
payload:

> **Claude:** Ready to send the above. Here's the exact payload and
> destination — reply here to confirm, or tell me what to change first.
>
> ```
> === DRY RUN: no request sent ===
> Method: POST
> URL: https://your-n8n-host/webhook/abc123
> Headers:
>   Content-Type: application/json
> Body (application/json):
> {
>   "run_id": "2026-09-25T16-42-00",
>   "timestamp": "2026-09-25T16:42:00Z",
>   "source_skill": "publish-pipeline",
>   "content": {
>     "linkedin_post": "Speed got us here. It won't be the only thing that keeps us here...",
>     "newsletter_blurb": "Subject: Fast doesn't have to mean \"not yet, security review pending\"..."
>   },
>   "metadata": {
>     "campaign": "northwind-compliance-response",
>     "brand_voice_version": "2026-09-20"
>   }
> }
> === END DRY RUN ===
> ```

Nothing has been sent yet. If the conversation ended right here —
timeout, you close the laptop, whatever — **nothing would ever send.**
That's true even though the very first message said "publish it."

Only a real, specific reply moves it forward:

> **You:** "Yes — send the LinkedIn post and newsletter blurb."

> **Claude:**
> ```
> Sent to https://your-n8n-host/webhook/abc123
> Status: 200 OK
> Response: (empty body)
> ```
> Sent successfully (200 OK) to your n8n webhook. The matching row in
> `state/content-calendar.md` is now marked `Sent`.

## What happens if you never reply

No row in `state/content-calendar.md` can be marked `Approved` by
anything except this exact exchange — a real human reply, shown the real
content, in that conversation. `content-calendar` itself is not allowed
to write `Approved` under any circumstance, and neither is a scheduled
run with nobody there to answer.

So if this had been a scheduled trigger firing on a timer with nobody
around to reply, Stage 4 would instead write the LinkedIn post and
newsletter blurb to `state/posts/2026-09-25-linkedin.md` and
`state/posts/2026-09-25-newsletter.md`, add a row to
`state/content-calendar.md` with Status `Ready for Approval`, and stop —
content queued for you to review whenever you're back, not sent on your
behalf. See the README's "Running this on a schedule" section for why
that's the intended behavior, not a limitation to work around.
