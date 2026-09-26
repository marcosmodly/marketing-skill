---
name: publish-pipeline
description: Packages finished content and asset references into JSON and sends it to n8n, Make, or another automation tool via webhook. Use when the user asks to publish, ship, or send content live.
allowed-tools: Read, Write, Edit, Bash
---

# Publish Pipeline

## Purpose

Final handoff step: package finished content and any asset references into
a structured JSON payload, then send it to the user's own automation
system (n8n, Make, or anything else that accepts an incoming webhook) so
it can take over scheduling and posting. By default this skill hands off
to automation the user already owns rather than posting directly — direct
platform posting exists only as an explicit, optional alternate path (see
step 5) for users who've set up their own platform API credentials.

## Step-by-step process

1. **Check onboarding status.** Read
   `${CLAUDE_PLUGIN_ROOT}/references/brand-voice.md`. If it doesn't exist,
   or its first line is `<!-- MARKETING-SKILL:UNCONFIGURED -->`, ask the
   user this plugin's 4 setup questions (priority task; content types to
   produce; target audience + tone; default output format — same as
   `/marketing-skill:marketing-setup`) before continuing, then save the
   answers and flip the marker to `CONFIGURED` with today's date.

2. **Confirm scope.**
   - Which content pieces are ready to send (from `content-repurposer`,
     `visual-brief-generator`, `short-form-video`, `community-post-generator`,
     a row in `state/content-calendar.md`, or pasted directly)?
   - If the source is `community-post-generator`, confirm its Go/No-Go
     section actually said go — never send a draft that skill flagged as
     blocked by the target community's own rules.
   - If the user is pointing at a calendar entry (e.g. "send the queued
     post for Tuesday"), read
     `${CLAUDE_PLUGIN_ROOT}/state/content-calendar.md`, find the matching
     row, then **read the post file named in that row's Notes column**
     (`state/posts/<date>-<platform-slug>.md`) — that file, not the
     calendar table, holds the actual content to send. A row with no
     post-file path in Notes, or whose named file doesn't exist, isn't a
     usable source — say so and stop rather than improvising content
     from the short Topic/Hook label. Refuse to re-send a row already
     marked `Sent` without the user explicitly confirming they want to
     send it again.
   - Destination webhook URL, if not already set via `MARKETING_WEBHOOK_URL`.
   - Is this a real send, or a dry run to inspect the payload first?

3. **Assemble the JSON payload** using the exact structure below.

4. **Always show the assembled payload and destination URL, and get
   explicit user go-ahead before a real send.** This step fires an
   external side effect the user may not be able to easily undo — never
   skip this confirmation, even if the user's original request sounded
   like blanket authorization (e.g. "just publish it"). **Silence, a
   timeout, or no reply in this conversation is never a yes** — only an
   actual affirmative reply from the user counts, and if none arrives,
   stop here without sending. This applies exactly the same way whether
   the run is an interactive chat or something else (a scheduled or
   automated trigger, for instance) invoked this skill — there is no
   framing of "the run itself is standing authorization" that substitutes
   for a real reply.
   - If the source is a `state/content-calendar.md` row, this is the
     point where — and only where — its Status may move to `Approved`,
     immediately after the affirmative reply and immediately before
     sending. No skill in this plugin sets `Approved` at any other time;
     `content-calendar` in particular never writes it.

5. **Send it:**
   - Write the JSON payload to a temporary file (e.g. via `mktemp`).
   - Resolve the webhook URL in this order: an explicit URL the user gave
     > the `MARKETING_WEBHOOK_URL` environment variable > ask the user for
     one if neither is available.
   - Run via Bash:
     `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/publish_webhook.py --payload-file <tmp-path> --dry-run`
     to preview, then, only after step 4's confirmation,
     `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/publish_webhook.py --payload-file <tmp-path> --confirmed`
     to actually send. The script refuses to run without one of those two
     flags — there is no default-sends behavior to be careful about.
   - Remove the temporary file afterward regardless of outcome.
   - If the source was a calendar row, update it to `Sent` in
     `state/content-calendar.md` immediately after a successful send
     (keep the row — this is the history log, don't delete it).
   - **Alternate path (optional, not the default): Make MCP.** If a Make
     MCP connector is connected in this session (tools like
     `scenarios_run`, `scenarios_list`), you may call `scenarios_run`
     directly instead of the webhook script, if the user prefers that.
     Don't assume it's connected — check available tools first.
   - **Alternate path (optional, not the default): direct platform
     posting.** If the user wants to post straight to LinkedIn, X, Meta,
     Reddit, Discord, Slack, Telegram, or dev.to rather than handing off to
     their own automation, see `${CLAUDE_PLUGIN_ROOT}/scripts/publish_direct.py
     --help`. It only works if the user has already set up real API
     credentials for that platform (see the plugin README) — check with
     `--dry-run` first, same confirmation rules as above apply, and be
     explicit that this path is less proven than the webhook path since it
     talks to live platform APIs this plugin's author can't verify from
     here. For Reddit specifically, a successful API response doesn't
     guarantee the post survives that subreddit's AutoModerator — confirm
     the content actually came from a `community-post-generator` go (not a
     no-go) before sending. For Discord, Slack, or Telegram specifically,
     confirm the content came from a go too — and since a Discord or Slack
     go is always `User-Supplied` confidence (this skill never
     independently verified that server's/workspace's rules), and a
     Telegram go is `User-Supplied` for a private channel/group but can be
     `Primary`/`Secondary`/`Mixed` for a public one, check which tier this
     specific draft actually rests on rather than assuming — that's one
     more reason not to skip step 4's confirmation just because the
     request "sounds routine." For Slack in particular, also confirm the
     user actually has (or can get) the workspace permission a webhook
     needs before treating the send as a quick step — it isn't guaranteed
     self-serve the way Discord's is. For Telegram in particular, confirm
     the bot has actually been added to the target chat by one of its
     admins — creating the bot itself needs no approval from anyone, but
     that's only the first of two gates, not the whole thing. For dev.to in
     particular, confirm the content came from a go too, and if
     `community-post-generator`'s research couldn't confirm the Code of
     Conduct's self-promotion wording directly, say so before sending — a
     2xx from dev.to's API means the article was accepted, not that a Tag
     Moderator won't strip a tag from it afterward. **Product Hunt, Hacker
     News, and Indie Hackers have no equivalent direct-send path, for
     different reasons** (see README): Product Hunt's write API requires
     special approval from Product Hunt itself; Hacker News's API has no
     write/submit endpoint at all, for anyone; and Indie Hackers' API
     situation is unverified rather than confirmed either way, so it's
     treated as manual-only too — all three always go out by pasting the
     draft in manually (producthunt.com, news.ycombinator.com, or
     indiehackers.com), never through this script, and that's permanent
     for Hacker News, not a "not yet approved" situation. Discord, Slack,
     Telegram, and dev.to each have a real send path but don't share one
     friction profile — Discord's webhook needs no approval step, Slack's
     app often needs Workspace Owner/Admin approval before creation,
     Telegram's bot needs no approval to create but does need a chat admin
     to add it before it can post, and dev.to's API key needs no approval
     process found in this skill's research at all (the simplest of the
     four, though that's about access, not about whether a Tag Moderator
     is happy with the result) — so don't lump any of the four into "every
     non-Reddit platform here is manual-only," and don't lump them into
     each other's ease either.
   - **YouTube, Instagram, and TikTok (`--platform youtube`/`instagram`/
     `tiktok`)** are a different shape from every platform above — all
     three post actual video, and confirm the content came from
     `short-form-video`, not this skill improvising a caption. Don't
     present any of the three with borrowed ease from another:
     - **YouTube** is the most self-serve of the three: the user's own
       Google Cloud OAuth client, authorized against their own channel, is
       enough — no platform-side approval queue the way Reddit or TikTok
       have. It's also the one platform here that uploads a local file
       (`--video-path`) rather than pointing at a hosted URL; confirm the
       asset entry has a real `path`, not just a `url`, before offering this
       path. `--privacy-status` defaults to `private` in the script itself —
       flag that plainly so "just post it" doesn't quietly mean "post it
       where only you can see it."
     - **Instagram Reels** needs the heaviest setup of the three: a Business
       or Creator IG account linked to a Facebook Page, a Meta app with
       `instagram_business_content_publish` actually approved (not just
       Development Mode), and — unlike YouTube — the video already hosted
       at a public URL, since Instagram's API fetches from a URL rather than
       accepting an upload; confirm the asset entry has a real `url` before
       offering this path, and that step 4's confirmation makes clear this
       is a three-step, several-second-to-minutes process (container
       creation, processing, then publish), not instant.
     - **TikTok** needs an app approved for the `video.publish` scope, and —
       critically — **every post from an app that hasn't passed TikTok's own
       audit is forced to private/self-only visibility, no matter what's
       requested.** Never present a TikTok send as reaching a public
       audience without the user confirming their app's audit status
       directly in TikTok's developer portal first; a 2xx response only
       means TikTok accepted and queued the request, not that the video is
       live, since TikTok fetches and processes it asynchronously
       afterward. Also needs the video at a public URL, same as Instagram,
       with that URL's domain pre-verified in TikTok's developer portal.

6. **Report the result** plainly: exit code, HTTP status if a real send
   was made, and a one-line human-readable summary of what went where.
   Never report success if the script exited non-zero.

## When to use this skill

Trigger on requests like:
- "Publish this"
- "Send this to n8n / Make"
- "Trigger the automation"
- "Fire the webhook"
- "Send the queued post for [date]" / "approve and send calendar item"

## Payload structure (required)

```json
{
  "run_id": "<uuid or timestamp-based id>",
  "timestamp": "<ISO 8601>",
  "source_skill": "publish-pipeline",
  "content": {
    "linkedin_post": "...",
    "twitter_thread": ["...", "..."],
    "newsletter_blurb": "...",
    "reddit_post": { "subreddit": "...", "title": "...", "body": "..." },
    "discord_message": "...",
    "slack_message": "...",
    "telegram_message": "...",
    "devto_post": { "title": "...", "body": "...", "tags": ["...", "..."] },
    "youtube_short": { "title": "...", "description": "...", "tags": ["...", "..."], "privacy_status": "private|unlisted|public" },
    "instagram_reel": { "caption": "..." },
    "tiktok_video": { "caption": "..." }
  },
  "assets": [
    { "type": "image|video", "description": "...", "url": "...or null", "path": "...or null", "prompt_reference": "...", "platform": "youtube_short|instagram_reel|tiktok_video|..." }
  ],
  "metadata": { "campaign": "...", "brand_voice_version": "..." }
}
```

Omit fields that don't apply (e.g. no `assets` if none were generated),
but keep the top-level shape stable so downstream n8n/Make workflows can
rely on it. For a `youtube_short`/`instagram_reel`/`tiktok_video` entry,
the matching `assets` item needs either `path` (a local file — the only
form YouTube's direct-post option in step 5 can use) or `url` (a
publicly-reachable hosted link — required for Instagram's and TikTok's
direct-post options in step 5, which fetch the video themselves rather
than accepting an upload); which one is available depends on whether
`short-form-video` generated the clip via a connected tool (may produce
either) or the user is supplying their own already-hosted video.

## Formatting rules

- Never claim a send succeeded if the script returned a non-zero exit
  code — report the actual failure and exit code instead.
- Never fire a real send without showing the exact payload and getting
  explicit confirmation first — and never pass `--confirmed` without
  having received an actual affirmative reply in this conversation first.
- Keep the payload's top-level keys stable across runs; add new content
  under `content` rather than renaming existing keys.
- Never write `Approved` to `state/content-calendar.md` except in step 4,
  immediately after a real human reply, immediately before sending.
- For `youtube`/`instagram`/`tiktok` sends specifically: never report a
  2xx response as "the video is live" — Instagram and TikTok both process
  the video asynchronously after that response, so report exactly what the
  script itself reported (queued/processing vs. confirmed published), and
  never claim a TikTok send reached a public audience without the user
  having confirmed their app's audit status.

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
