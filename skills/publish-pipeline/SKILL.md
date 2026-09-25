---
name: publish-pipeline
description: Packages finished content and asset references into JSON and sends it to n8n, Make, or another automation tool via webhook. Use when the user asks to publish, ship, or send content live.
allowed-tools: Read, Write, Bash
---

# Publish Pipeline

## Purpose

Final handoff step: package finished content and any asset references into
a structured JSON payload, then send it to the user's own automation
system (n8n, Make, or anything else that accepts an incoming webhook) so
it can take over scheduling and posting. This skill never posts to social
platforms directly — it hands off to automation the user already owns.

## Step-by-step process

1. **Check onboarding status.** Read
   `${CLAUDE_PLUGIN_ROOT}/references/brand-voice.md`. If it doesn't exist,
   or its first line is `<!-- MARKETING-SKILL:UNCONFIGURED -->`, ask the
   user this plugin's 3 setup questions (priority task; target audience +
   tone; default output format — same as `/marketing-skill:marketing-setup`)
   before continuing, then save the answers and flip the marker to
   `CONFIGURED` with today's date.

2. **Confirm scope.**
   - Which content pieces are ready to send (from `content-repurposer`,
     `visual-brief-generator`, or pasted directly)?
   - Destination webhook URL, if not already set via `MARKETING_WEBHOOK_URL`.
   - Is this a real send, or a dry run to inspect the payload first?

3. **Assemble the JSON payload** using the exact structure below.

4. **Always show the assembled payload and destination URL, and get
   explicit user go-ahead before a real send.** This step fires an
   external side effect the user may not be able to easily undo — never
   skip this confirmation, even if the user's original request sounded
   like blanket authorization (e.g. "just publish it").

5. **Send it:**
   - Write the JSON payload to a temporary file (e.g. via `mktemp`).
   - Resolve the webhook URL in this order: an explicit URL the user gave
     > the `MARKETING_WEBHOOK_URL` environment variable > ask the user for
     one if neither is available.
   - Run via Bash:
     `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/publish_webhook.py --payload-file <tmp-path> [--dry-run]`
   - Remove the temporary file afterward regardless of outcome.
   - **Alternate path (optional, not the default):** if a Make MCP
     connector is connected in this session (tools like `scenarios_run`,
     `scenarios_list`), you may call `scenarios_run` directly instead of
     the webhook script, if the user prefers that. Don't assume it's
     connected — check available tools first.

6. **Report the result** plainly: exit code, HTTP status if a real send
   was made, and a one-line human-readable summary of what went where.
   Never report success if the script exited non-zero.

## When to use this skill

Trigger on requests like:
- "Publish this"
- "Send this to n8n / Make"
- "Trigger the automation"
- "Fire the webhook"

## Payload structure (required)

```json
{
  "run_id": "<uuid or timestamp-based id>",
  "timestamp": "<ISO 8601>",
  "source_skill": "publish-pipeline",
  "content": {
    "linkedin_post": "...",
    "twitter_thread": ["...", "..."],
    "newsletter_blurb": "..."
  },
  "assets": [
    { "type": "image|video", "description": "...", "url": "...or null", "prompt_reference": "..." }
  ],
  "metadata": { "campaign": "...", "brand_voice_version": "..." }
}
```

Omit fields that don't apply (e.g. no `assets` if none were generated),
but keep the top-level shape stable so downstream n8n/Make workflows can
rely on it.

## Formatting rules

- Never claim a send succeeded if the script returned a non-zero exit
  code — report the actual failure and exit code instead.
- Never fire a real send without showing the exact payload and getting
  explicit confirmation first.
- Keep the payload's top-level keys stable across runs; add new content
  under `content` rather than renaming existing keys.

## Example output

**Dry run:**
```
$ python3 ${CLAUDE_PLUGIN_ROOT}/scripts/publish_webhook.py --payload-file /tmp/payload.json --dry-run
=== DRY RUN: no request sent ===
Method: POST
URL: https://your-n8n-host/webhook/abc123
Headers:
  Content-Type: application/json
Body (application/json, 412 bytes):
{
  "run_id": "2026-09-25T14-30-00",
  "timestamp": "2026-09-25T14:30:00Z",
  ...
}
=== END DRY RUN ===
```
Reported to the user as: "Dry run only — nothing was sent. Here's the
exact payload and destination above; confirm to send for real."

**Real send, success:**
```
Sent to https://your-n8n-host/webhook/abc123
Status: 200 OK
Response: (empty body)
```
Reported as: "Sent successfully (200 OK) to your n8n webhook."

**Real send, failure:**
```
Webhook returned non-2xx status
Status: 500 Internal Server Error
Response: {"error": "workflow disabled"}
```
Reported as: "Send failed — the endpoint returned 500 (workflow
disabled). Nothing further was attempted."
