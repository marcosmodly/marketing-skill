---
name: full-pipeline
description: Chains research, repurposing, visual briefs, and publishing into one run, pausing before the publish step fires. Use for one-shot 'full campaign' or 'do everything' requests.
allowed-tools: WebSearch, WebFetch, Read, Grep, Glob, Write, Edit, Bash
---

# Full Marketing Pipeline

## Purpose

Orchestrate all four other skills in this plugin — research, repurposing,
visual brief, and publishing — into one end-to-end run, for requests that
want the whole thing done in one shot rather than one skill at a time.

## Step-by-step process

1. **Check onboarding status (once, up front).** Read
   `${CLAUDE_PLUGIN_ROOT}/references/brand-voice.md`. If it doesn't exist,
   or its first line is `<!-- MARKETING-SKILL:UNCONFIGURED -->`, ask the
   user this plugin's 3 setup questions (priority task; target audience +
   tone; default output format — same as `/marketing-skill:marketing-setup`)
   before continuing, then save the answers and flip the marker to
   `CONFIGURED` with today's date. Because this happens before Stage 1,
   none of the individual stages below will re-trigger their own
   onboarding check in the same run.

2. **Confirm scope for all stages up front**, to avoid repeated
   back-and-forth mid-chain:
   - Competitor or topic to research.
   - Which repurposed formats are wanted (LinkedIn / Twitter thread /
     newsletter — default: all three).
   - Whether a visual brief is wanted, and for which platform(s).
   - Publish destination (webhook URL, or confirm `MARKETING_WEBHOOK_URL`
     is set) — but do not send anything yet.

3. **Stage 1 — Competitor Research.** Read
   `${CLAUDE_PLUGIN_ROOT}/skills/competitor-research/SKILL.md` and follow
   its process in full to produce the research brief.

4. **Stage 2 — Content Repurposing.** Read
   `${CLAUDE_PLUGIN_ROOT}/skills/content-repurposer/SKILL.md` and follow
   its process, feeding in the Stage 1 brief's key sections as source
   content.

5. **Stage 3 — Visual Brief.** Read
   `${CLAUDE_PLUGIN_ROOT}/skills/visual-brief-generator/SKILL.md` and
   follow its process, feeding in the Stage 2 content. Only actually
   generate assets if the user opts in and a visual-gen tool is connected
   — otherwise produce the brief only, per that skill's own rules.

6. **Stage 4 — Mandatory checkpoint.** Before anything is actually
   published, stop and show the user the full assembled payload (per
   `publish-pipeline`'s payload structure) and destination. Require an
   explicit go/no-go. A request phrased as "do everything end to end"
   authorizes running the chain up to this point — it does not authorize
   skipping this confirmation. Silence, a timeout, or no reply is never a
   go — that holds whether this run started from an interactive chat or
   from a scheduled/automated trigger; if no actual affirmative reply
   arrives in this conversation, stop here and leave Stage 3's output
   queued in `state/content-calendar.md` (Status `Ready for Approval`)
   instead of sending it, rather than treating the trigger itself as
   authorization.

7. **Stage 5 — Publish.** Only after explicit confirmation, read
   `${CLAUDE_PLUGIN_ROOT}/skills/publish-pipeline/SKILL.md` and follow its
   process to send the payload.

## When to use this skill

Trigger on requests like:
- "Run the full pipeline on [competitor/topic]"
- "Research X and publish it"
- "Do the whole thing end to end"

## Output structure (required)

One end-of-run report, as Markdown `##` headings:

1. **Pipeline Summary** — what was run, for what topic, which stages
   executed.
2. **Stage 1: Competitor Research** — the brief (or a link to it if very
   long).
3. **Stage 2: Repurposed Content** — the requested formats.
4. **Stage 3: Visual Brief** — the brief, and whether an asset was
   actually generated.
5. **Stage 4: Publish Result** — the dry-run preview shown, confirmation
   received (or declined), and the final send result if it happened.

## Formatting rules

- Never skip the Stage 4 checkpoint, regardless of how the original
  request was phrased, and never treat silence or no reply as the go/no-go
  decision — only an actual affirmative reply moves the run to Stage 5.
- Label which stage produced each piece of output in the final report.
- Brand-voice compliance (tone, banned words, formatting constraints)
  carries forward from Stage 2 onward.

## Example output

> Abbreviated worked example — each stage's real output follows that
> stage's own SKILL.md structure; only the orchestration flow is shown
> here.

```markdown
## Pipeline Summary
Ran the full pipeline for "Northwind Cloud" → LinkedIn post + newsletter
blurb + a 1-platform visual brief → publish pending confirmation.

## Stage 1: Competitor Research
[full competitor-research brief per that skill's output structure]

## Stage 2: Repurposed Content
[LinkedIn post and newsletter blurb per content-repurposer's structure]

## Stage 3: Visual Brief
[shot list and prompts per visual-brief-generator's structure; no
connected tool, so brief-only]

## Stage 4: Publish Result
Payload and destination shown to user:
"Ready to send the above to https://your-n8n-host/webhook/abc123 — confirm
to proceed, or say what to change first."
→ User confirmed.
Sent successfully (200 OK).
```
