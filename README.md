# Marketing Skills for Claude Code

**12 AI marketing skills in one Claude Code plugin:** competitor research,
social media content calendars, LinkedIn and X posts, SEO content briefs,
ad copy, email sequences, personalized cold email outreach, TikTok / Reels /
YouTube Shorts scripts, Reddit and Hacker News posts, and approval-gated
publishing to n8n, Make, or platform APIs.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-D97757.svg)](#install)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-555.svg)](skills/)

```
claude plugin marketplace add marcosmodly/marketing-skill
claude plugin install marketing-skill@marketing-skill
```

Every skill is a standard `SKILL.md` in [`skills/`](skills/), shares one
brand-voice config, and works on its own or chained together. Nothing
posts or sends without your explicit approval. Using OpenAI Codex? See
[Using with Codex](#using-with-codex).

If it saves you time, a star on the repo helps other people find it.
Made something with it? [Share it in Show and tell](https://github.com/marcosmodly/marketing-skill/discussions/categories/show-and-tell).

## What you can do with it

- **Competitor analysis:** research a rival and get a SWOT, messaging
  breakdown, and sales battlecard with cited sources.
- **Social media content calendar:** batch-write a week or month of dated
  posts for LinkedIn, Twitter/X, newsletters, Reddit, and short-form
  video, without repeating recent topics.
- **Content repurposing:** turn one blog post or announcement into a
  LinkedIn post, an X thread, and a newsletter blurb.
- **SEO content briefs:** target keyword, search intent, related keywords,
  outline, and meta title and description, with no made-up search volumes.
- **Ad copy:** A/B-testable variants for Facebook and Instagram (Meta),
  Google Search (RSA), and LinkedIn Ads, sized to each platform's limits.
- **Email marketing:** drip, nurture, and welcome sequences with timing,
  subject lines, and preview text.
- **Cold email outreach:** a daily batch of researched, 1:1 personalized
  prospecting emails, deduplicated against a permanent contact log that
  syncs replies, bounces, and unsubscribes from Gmail.
- **Short-form video:** hook-first scripts plus caption, hashtags, and
  best time to post for TikTok, Instagram Reels, and YouTube Shorts,
  shaped to the right type of marketing video (how-to, testimonial,
  launch, FAQ, and more) or to an everyday FYP format (POV, tier list,
  text-message skit, storytime, hot take, and 17 more). Also the finished
  vertical video itself, rendered on your machine: animated text over
  stock or AI backgrounds, with music composed in your brand's own sound
  and meme sound effects.
- **Community posts:** Reddit, Product Hunt, Hacker News (Show HN), Indie
  Hackers, dev.to, Discord, Slack, and Telegram posts written to each
  community's actual rules, with a Go/No-Go before drafting.
- **Visual briefs:** shot lists, per-scene image/video prompts, and aspect
  ratios for any AI image or video generator.
- **Publishing:** hand finished content to n8n, Make, or any webhook, or
  post directly to LinkedIn, X, Facebook, Reddit, Discord, Slack,
  Telegram, dev.to, YouTube, Instagram, or TikTok with your own API
  credentials.

**[See a full worked run →](EXAMPLE.md)** — one continuous
`full-pipeline` call from research to the approval checkpoint before
anything actually publishes.

## Skills

| Skill | Triggers on | Does |
|---|---|---|
| `competitor-research` | "research a competitor," "analyze a rival," "build a battlecard" | Full analytical competitor brief: overview, recent moves, messaging analysis, SWOT, recommendations, sources |
| `content-calendar` | "content calendar," "a week of posts," "plan a month of content" | Batch-generates several dated, platform-tagged posts in one pass, checked against `state/content-calendar.md` so it doesn't repeat a recent topic; queues everything for approval, never sends |
| `content-repurposer` | "repurpose this," "turn this into a LinkedIn post/thread/newsletter" | One source → a LinkedIn post, a Twitter/X thread, and a newsletter blurb, in one pass |
| `seo-brief` | "SEO brief," "keyword research," "optimize this for search" | Target/secondary keywords, search intent, suggested outline, meta title/description — never fabricates search-volume numbers |
| `ad-copy-generator` | "ad copy," "Meta/Google/LinkedIn ad variants," "A/B test copy" | Multiple ad variants per platform, each a distinct hook angle, sized to that platform's character limits |
| `email-sequence` | "email sequence," "drip campaign," "welcome series" | A multi-email sequence with send timing, subject lines, and a real narrative arc across emails |
| `email-outreach` | "cold outreach," "prospecting emails," "daily sales outreach," "personalized cold email to [name]" | Researches real prospects against a defined ICP (public-web research by default; a connected prospecting tool only if you ask for verified contact details), checks each one against a permanent contact log so nobody's contacted twice — or ever again once unsubscribed/replied — drafts a genuinely personalized email per prospect, re-confirms strategy monthly, and queues everything for approval (or drafts directly in Gmail if connected); never sends |
| `visual-brief-generator` | "visual brief," "video brief," "shot list," "image prompts for X" | A structured shot list, per-scene prompts, aspect ratios, and style guide; generates the actual asset only if a visual-gen tool is connected |
| `short-form-video` | "TikTok video," "Instagram Reel script," "YouTube Short," "short-form/vertical video for..." | A hook-first script/shot list plus a ready-to-post package per platform (YouTube Shorts/Instagram Reels/TikTok) — title/caption, sized hashtags, and a best-time-to-post window, shaped to one of 23 marketing video types (testimonial, how-to, announcement, and so on) or 22 everyday FYP formats (POV, tier list, text-message skit, storytime, and so on); if you opt in, makes the actual video too, either with a connected tool (Higgsfield, Figma Weave, Canva, or similar) or by rendering it locally (`scripts/video/`): animated text over stock or AI backgrounds, with music in the project's own saved sound; otherwise points to current free tools |
| `community-post-generator` | "post this to r/[subreddit]," "help me post on Product Hunt," "write a Show HN/Show IH for this," "post this on dev.to," "post this in our Discord/Slack/Telegram" | Live-researches that specific subreddit's, Product Hunt's, Hacker News's, Indie Hackers', dev.to's, or a public Telegram channel's/group's actual rules and typical post style first (verifying each source is actually about that target, not a similarly-named one); for Discord, Slack, and private Telegram targets, asks you for the rules instead, since it can't research those. Gives a plain Go/No-Go either way, and only drafts a post (shaped for that platform — title+body, title+URL+first comment for Show HN, dev.to's title+body+tags, or a single chat message in Discord's, Slack's, or Telegram's own formatting for the chat platforms) if it's actually welcome there, written to read like a person wrote it |
| `publish-pipeline` | "publish this," "send to n8n/Make," "fire the webhook," "send the queued post for [date]" | Packages finished content/assets into JSON and hands off to your automation via webhook (or, optionally, straight to a platform API) after showing you the exact payload |
| `full-pipeline` | "run the full pipeline," "research X and publish it," "do the whole thing end to end" | Chains research, repurposing, visual brief, and publish into one run, with a mandatory pause before anything actually publishes |

Plus one setup command: `/marketing-skill:marketing-setup`.

## Using your own project as source material

`competitor-research`, `content-calendar`, `content-repurposer`,
`seo-brief`, `ad-copy-generator`, `email-sequence`, `email-outreach`,
`visual-brief-generator`, `short-form-video`, and `community-post-generator`
can pull from the project they're installed in instead of requiring you to
paste content every time. If you reference
"our product," "our feature," "our changelog," etc. without providing the
text, they'll check `README*`, `CHANGELOG*`, `docs/**/*.md`, and
`package.json`/`pyproject.toml` at the project root first, and ask you
directly only if nothing relevant turns up. They only read
documentation-oriented files this way — never arbitrary source code — so
install this in your product's own repo to get the most out of it.

## Install

**Plugin method (recommended):**

```
claude plugin marketplace add marcosmodly/marketing-skill
claude plugin install marketing-skill@marketing-skill
```

This works once the plugin's branch is merged to the repo's default
branch, since `marketplace add` tracks a repo's default branch. To try it
before merging (e.g. against a feature branch), clone the repo locally and
point at your checkout instead — this is verified to work regardless of
which branch is checked out:

```
git clone https://github.com/marcosmodly/marketing-skill.git
cd marketing-skill && git checkout <branch-name>   # if not already on it
claude plugin marketplace add ./
claude plugin install marketing-skill@marketing-skill
```

**Manual fallback:** no confirmed minimum Claude Code version exists for
the plugin system — if `claude plugin` isn't available on your install
(check with `claude plugin --help`), copy the skills in by hand instead:

```
cp -r skills/* ~/.claude/skills/        # personal, all projects
# or
cp -r skills/* /your/project/.claude/skills/   # project-scoped
```

The manual copy skips the setup command (see "Configure" below for the
equivalent manual step) and `${CLAUDE_PLUGIN_ROOT}` path substitution.
Copied skills can't find `references/`, `state/`, or `scripts/` on their
own, so set `CLAUDE_PLUGIN_ROOT` to your clone of this repo before
starting Claude Code (`export CLAUDE_PLUGIN_ROOT=/path/to/marketing-skill`);
otherwise each skill asks you where the plugin lives.

## Using with Codex

OpenAI's Codex reads Claude Code's plugin files (`.claude-plugin/`), so
the same repo installs there too:

```
codex plugin marketplace add marcosmodly/marketing-skill
codex plugin add marketing-skill@marketing-skill
```

To try a branch, add `--ref <branch-name>` to the first command, or pass
the path to a local clone instead of `marcosmodly/marketing-skill`.

All 12 skills load as-is; Codex ignores the `allowed-tools` line. A few
things differ from Claude Code:

- **Setup command:** Codex turns `/marketing-skill:marketing-setup` into
  a skill, so ask Codex to "run the marketing setup" instead of typing
  the slash command. Codex only converts commands under 4 KB, so keep
  `commands/marketing-setup.md` short when editing it.
- **Plugin folder:** Codex doesn't fill in `${CLAUDE_PLUGIN_ROOT}`. Each
  skill works out the plugin folder itself (from the `CLAUDE_PLUGIN_ROOT`
  environment variable, or by finding the folder that holds
  `references/brand-voice.md`). Setting the variable is the reliable
  option, and it keeps your brand voice and queued posts in a folder you
  control rather than in Codex's installed copy:

  ```
  export CLAUDE_PLUGIN_ROOT=/path/to/marketing-skill   # your clone
  codex
  ```
- **Sandbox:** in its usual `workspace-write` mode, Codex only writes
  inside the folder you started it in and blocks network access from
  shell commands. If the plugin folder is somewhere else, add it to
  `writable_roots` (or approve the writes when asked). Publishing
  (`publish_webhook.py`, `publish_direct.py`) needs network access. Both
  settings go in `~/.codex/config.toml`:

  ```toml
  [sandbox_workspace_write]
  writable_roots = ["/path/to/marketing-skill"]
  network_access = true
  ```
- **Live research:** `competitor-research`, `seo-brief`,
  `community-post-generator`, `content-calendar`, `email-outreach`,
  `short-form-video`, and `full-pipeline` research the web as they run.
  Set `web_search = "live"` in `~/.codex/config.toml` so results are
  current rather than cached.
- **Connected tools:** Gmail drafts, prospecting tools, and video tools
  (Higgsfield, Figma Weave, Canva) work once the matching MCP server is
  set up in Codex. Without one, each skill falls back the same way it
  does in Claude Code.

## Configure

Every skill reads `references/brand-voice.md` before producing output —
your task priority, content types (short-form video, long-form video,
text posts, email, images), target audience, tone, output format, banned
words, and formatting constraints, defined once and reused everywhere.

- **Guided setup:** run `/marketing-skill:marketing-setup` any time
  (first-run or to update your answers).
- **Automatic:** if you skip setup, the first skill you actually use will
  ask the same 4 questions itself before proceeding, and save your answers
  for next time.
- **Manual:** edit `references/brand-voice.md` directly — keep its
  section headings intact so every skill can still find them.

`email-outreach` additionally reads its own
`references/outreach-strategy.md` — ICP/target segment(s), value
proposition and angle per segment, offer and primary CTA, daily volume,
follow-up cadence, and suppression window. It's configured the same way:
guided setup the first time `email-outreach` runs, or hand-edit directly.
Unlike `brand-voice.md`, it also re-opens itself automatically — the
skill checks its "last refreshed" date on every run and walks you through
a strategy-refresh conversation once 30 days have passed, using
`state/outreach-log.md`'s accumulated send/reply/bounce counts to inform
it.

## Content calendar & approval model

`content-calendar` batch-generates posts and queues them in
`state/content-calendar.md` — a plain Markdown table that's both the
forward calendar and the permanent send history (rows accumulate; nothing
gets cleared out). It's safe to hand-edit directly. The table itself is
just an index: each row's Notes column points at the file under
`state/posts/` that actually holds that post's full content —
`publish-pipeline` reads the file, not the table, when it sends.

The file enforces a separation of duties that every skill in this plugin
respects: **generation and approval are always two different steps.**
`content-calendar` (and anything else that drafts content) can only write
`Planned`, `Drafted`, or `Ready for Approval` to a row's Status — never
`Approved`. Only `publish-pipeline` writes `Approved`, and only
immediately after showing the real content to a human in a live
conversation and getting an actual reply back — silence, a timeout, or
the request having been phrased as blanket authorization ("just post
these") never counts as that reply. `publish-pipeline` then flips the row
to `Sent` right after a successful send.

When more than one row is ready at once, `publish-pipeline` lists them
together as a numbered batch (each with its Account/Destination/
Attachments/Final Text spelled out) instead of asking "send this?" one
row at a time — a reply has to name specific numbers to approve them,
since an unqualified "send them all" invites rubber-stamping a list
nobody actually read. It also flags any row more than 14 days old as
Stale right in that listing, and `content-calendar` separately reports
how many rows across the whole calendar have crossed that age every time
it runs — a queue that's easy to lose track of is exactly what turns a
careful approval step into a bulk-approved backlog later.

This matters most the moment you try to run this plugin unattended — see
"Running this on a schedule" below.

## Outreach log & suppression model

`email-outreach` batch-generates cold emails and queues them in
`state/outreach-log.md` — a plain Markdown table that's both the daily
queue and the permanent contact history (rows accumulate; nothing gets
cleared out). It's safe to hand-edit directly, including to log an
unsubscribe request that arrived outside email. Same separation as the
content calendar: each row's Notes column points at the file under
`state/outreach/` that holds that email's full content, and Status can
only reach `Approved` immediately after a human sees the real email in a
live conversation and says to send it — `email-outreach` itself never
writes that value, and never calls Gmail's `send_message` on its own,
even for a scheduled daily run with nobody there to reply. A handful of
Status values are permanent suppression, not just history: `Bounced`,
`Unsubscribed`/`Do-Not-Contact`, and `Replied` all block that person from
ever being re-queued by this skill again, regardless of how a later
request is phrased. When Gmail is connected, these three are also
detected automatically — every run starts with an inbox sync that reads
real replies and bounce notifications for anyone still logged `Sent`, so
the suppression list stays accurate without a human having to remember
to update it (an ambiguous result is reported, never guessed at). Two
more things ride along in the same table: a `Subject Variant` (A/B) per
row so reply rates can eventually be attributed to a subject line, and a
`Recommended Send Time` computed from each prospect's own region — this
skill still never sends on its own, so that time is either sent manually
or via Gmail's own native scheduled-send feature. Same numbered-approval
rule as `publish-pipeline`: an unqualified "send today's batch" doesn't
count as naming any specific row, and every run reports how many rows in
the log have sat unapproved for more than 7 days (shorter than the
content calendar's 14, since personalized prospect research goes stale
faster) so that count can't quietly grow unnoticed.

## Automation handoff

`publish-pipeline` and `full-pipeline` send a JSON payload to your own
automation (n8n, Make, or anything else with an incoming webhook) via
`scripts/publish_webhook.py`. Point it at your webhook:

```
export MARKETING_WEBHOOK_URL="https://your-n8n-or-make-webhook-url"
```

or pass `--url` directly. The script refuses to run at all unless you
pass exactly one of `--dry-run` (prints the exact request, sends nothing)
or `--confirmed` (actually sends) — there's no default-sends behavior:

```
echo '{"hello": "world"}' | python3 scripts/publish_webhook.py --dry-run
```

If you have a **Make** MCP connector connected in your session (tools
like `scenarios_run`), `publish-pipeline` can call it directly instead of
the webhook script — mention that preference when the skill asks how to
send.

### Posting directly to a platform (optional, needs your own credentials)

`scripts/publish_direct.py` posts straight to LinkedIn, X, Meta (Facebook
Page), Reddit, Discord, Slack, Telegram, dev.to, YouTube (Shorts),
Instagram (Reels), or TikTok instead of going through your own automation
— `python3 scripts/publish_direct.py --help`
lists what each platform needs. **Read the script's module docstring
before using it.** It was written without a connected account or live
credentials for any of these platforms to test against, so it's
best-effort against each platform's last publicly documented API, not a
verified integration — confirm the endpoint is still current against that
platform's own developer docs (developers.linkedin.com, developer.x.com,
developers.facebook.com, Reddit's own API docs, Discord's own API docs,
Slack's own API docs, Telegram's own Bot API docs at
core.telegram.org/bots/api, and developers.forem.com/api for dev.to),
confirm you actually have write-access API scope (X in particular gates
this behind a paid tier, Reddit closed instant self-service app
registration in late 2025 for a manual approval queue — existing approved
apps still work, and Slack may need a Workspace Owner/Admin to approve the
app a webhook requires — see below), and do one manual `--confirmed` test
post yourself before trusting it in anything automated. The first eight
platforms (LinkedIn/X/Meta/Reddit/Discord/Slack/Telegram/dev.to) are
text-only — no media attachments, and a plain text-only Instagram post
isn't supported at all since Instagram has no such endpoint. YouTube,
Instagram, and TikTok are the three video exceptions, added specifically
for short-form video from the `short-form-video` skill — see "Posting to
YouTube Shorts, Instagram Reels & TikTok" below for what each actually
needs, since none of the three share a setup cost with each other or with
the eight text platforms above. Same `--dry-run`/`--confirmed` safety
pattern as the webhook script, including credential redaction in
`--dry-run` output —
for Discord and Slack specifically, the webhook URL itself is the
credential (there's no separate token), so that whole URL gets redacted,
not just a header; for Telegram, only the bot token embedded in the URL
path gets redacted, since the rest of the URL is just the API endpoint
shape, not a secret; for dev.to, the API key is a static value in a custom
`api-key` header, redacted the same simple way a bearer token would be —
no OAuth flow, no webhook URL, the simplest credential shape of the eight.
For Reddit, a successful response doesn't guarantee the post survives that
subreddit's AutoModerator — see "Posting to Reddit, Product Hunt, Hacker
News, Indie Hackers, dev.to, Discord, Slack & Telegram" below before
sending anything for real.

**Discord is one of the easiest to actually set up** — a webhook needs no
OAuth app review at all, just `MANAGE_WEBHOOKS` permission on the channel
to create one (Channel Settings → Integrations → Webhooks). That's one
place this script is easier than the platform it's replacing, not harder:
`community-post-generator` can't independently verify a Discord server's
rules the way it can for the researchable five (see below), so the actual
bottleneck for Discord is research, not access. It's not the unconditional
floor, though — see dev.to below for the one platform here whose access
doesn't depend on any permission over the specific target at all.

**Slack looks similar to Discord but isn't as simple, and the difference
matters.** The direct-webhook-URL path is legacy; creating one now means
creating a Slack App, and many workspaces require a Workspace Owner/Admin
to approve new apps before that's even possible — confirm your
workspace's app-approval setting rather than assuming self-serve setup
the way Discord's is. Slack also expects plain text formatted in its own
**mrkdwn** syntax, not standard Markdown — a single asterisk (`*bold*`)
is bold in Slack, the opposite of standard Markdown's italic, and
`community-post-generator` drafts Slack posts in mrkdwn for exactly that
reason. Character limit is shaped differently too: this script hard-caps
at Slack's technical ceiling of 40,000 characters (rejecting, not
truncating, past that) but only warns, doesn't block, between 4,000 and
40,000, since 4,000 is a display recommendation, not a hard limit —
compare Discord's flat 2,000-character rejection.

**Telegram's setup friction is shaped differently from both Discord's and
Slack's — easy at first, then a second gate neither of the others has.**
Creating the bot itself, via Telegram's own @BotFather, needs no approval
from anyone — genuinely as easy as Discord's webhook creation. But a bot
can only post into a chat one of that chat's admins has actually added it
to; creating the bot isn't the same as being authorized to post anywhere,
so budget for that second step separately. Telegram also offers two
formatting modes, HTML and MarkdownV2 — this script defaults to HTML
because MarkdownV2 requires escaping over a dozen characters and a single
missed escape fails the entire send, not just that character's
formatting; `community-post-generator` drafts in HTML for the same
reason. Character limit is a flat 4096, rejected outright like Discord's
limit, not truncated like Slack's.

**dev.to has the simplest access story of the eight — not just easy, but
unconditionally easy.** An API key comes from your own account settings,
full stop; no approval process was found in this skill's research, and
unlike every other platform above, access doesn't depend on any
permission over the specific target either — Discord's webhook still
needs `MANAGE_WEBHOOKS` on that channel, Telegram's bot still needs a chat
admin to add it, but a dev.to API key works under whatever tags your
account can post to, which is all of them. That ease is about access,
though, not content: a Tag Moderator can still strip a tag from the
result afterward, and this skill's research couldn't confirm the Code of
Conduct's specific self-promotion wording (dev.to's own domain was
unreachable during that research) — a 2xx response means the article was
accepted, not that it was welcomed. Posts as a full title+body Markdown
article with up to 4 tags (`--tags`), not a short message, and optionally
under a dev.to Organization (`--org-id`) instead of your personal account.
No documented character limit, unlike the four chat platforms above.

**Product Hunt, Hacker News, and Indie Hackers all have no direct-send
path here, for different reasons.** Product Hunt's write API
(`createPost`, etc.) requires special approval from Product Hunt itself —
the free/default API tier is explicitly read-only, non-commercial (see
below) — so unlike LinkedIn/X/Meta/Reddit/Discord/Slack/Telegram/dev.to,
there's no "just bring your own API credentials" option to script
against, though that approval process at least exists. Hacker News has no write API to even
apply for — its official API is read-only by design, full stop, so this
isn't a "not yet approved" situation, it's "nothing to approve." Indie
Hackers is genuinely unverified rather than confirmed either way — some
sources mention an API, but it looks scoped to read-only product/revenue
data, and nothing confirms a way to submit a post through it.
`community-post-generator` still drafts the post text either way; you
paste it into producthunt.com, news.ycombinator.com, or indiehackers.com
yourself.

### Running this on a schedule

Nothing in this plugin runs on a timer by itself — a skill only executes
when a session invokes it. To get daily/weekly output, schedule the
*session*, not the plugin: Claude Cowork's scheduled tasks (or Claude
Code's own Routines/triggers) can fire a session on a cadence that runs
`content-calendar` or `full-pipeline`.

That solves "run it every day." It does **not** turn this into unattended
auto-posting, on purpose: `content-calendar` only ever queues rows as
`Drafted`/`Ready for Approval`, and `publish-pipeline` only sends a row
already `Approved` by an actual human reply in that conversation — a
scheduled trigger firing with nobody there to reply just leaves content
queued for you to review later, which is the intended behavior, not a
bug to work around. If you deliberately want unattended sending, you'd
need to change that approval step yourself — this plugin doesn't ship a
way to do that, on the theory that a live company account posting
unsupervised is a decision only you should make explicitly, not one a
scheduling tool should make for you by default.

`email-outreach` follows the exact same model, just applied to cold email
instead of social posts: schedule a daily session to get a consistent
daily batch (its own "consistent daily outreach" requirement), and it
queues every draft as `Drafted`/`Ready for Approval` — never `Sent` —
exactly like `content-calendar` does, for the same reason. Its monthly
strategy refresh doesn't need a separate schedule at all: the skill
checks `references/outreach-strategy.md`'s own last-refreshed date on
every run and walks through the refresh conversation itself once 30 days
have passed, so the one daily trigger alone covers both cadences.

## Posting to Reddit, Product Hunt, Hacker News, Indie Hackers, dev.to, Discord, Slack & Telegram

`community-post-generator` treats these eight differently from the
broadcast platforms above: instead of a fixed post template, it does a
live research pass — the target subreddit's actual rules, a sample of
what's currently working there, Product Hunt's own guidelines, HN's
guidelines and Show HN norms, Indie Hackers' group-specific posting
guidelines, or dev.to's sitewide Code of Conduct plus its target tag's own
guidelines — before drafting anything, and it will tell you plainly (a
"No-Go") when a community's rules would just get the post removed,
rather than drafting something that reads fine but breaks a rule you
didn't know about. It also writes the draft itself to read like an
actual person wrote it — no em dashes, no AI-polish tells — since these
communities react to that almost as badly as they react to overt
promotion.

**dev.to belongs with Reddit, Product Hunt, Hacker News, and Indie
Hackers in the always-researchable group — its rules live on the open
web too — but its own shape isn't a copy of any of theirs.** Rules apply
at two levels at once: a sitewide Code of Conduct, plus per-tag
submission guidelines that volunteer Tag Moderators enforce by adding or
stripping a tag from a post that doesn't fit it, separate from the post
itself being removed. A post can also carry up to 4 tags at once, unlike
one-subreddit-per-post or one-group-per-post elsewhere. Its show-your-
project convention, `#showdev`, is dev.to's version of Show HN/Show IH,
but for a real, triable project rather than a tutorial, and shaped like
neither — a single title-plus-body article, not Show HN's three-piece
split, with no required founder-story/stage/questions structure the way
Show IH has one. dev.to also has a sanctioned company-page feature
(Organizations), so posting under a personal account versus one is worth
asking about upfront.

**Discord and Slack both work differently from the other five, and it's
worth understanding why — and why they aren't the same as each other
either.** Reddit, Product Hunt, Hacker News, Indie Hackers, and dev.to all
publish rules on the open web — this skill can, at least in principle,
look them up. Most Discord servers and virtually all Slack workspaces
can't be seen at all without joining first: no public rules page, no
crawlable post history, nothing for WebFetch or WebSearch to find. So for
both, the skill asks *you* — presumably already a member — what the
rules actually say, and labels the result `User-Supplied` rather than
pretending it verified anything independently; if you say you don't know
the rules, it'll ask you to go check rather than draft on a guess. But
they diverge from there: Discord has a narrow exception (a rare large,
Discovery-listed server can be previewed, though never its rules text),
Slack has no research exception at all. Discord's webhook access is close
to always available to a channel member; Slack's often needs workspace
admin approval first. And Discord tolerates something close to standard
Markdown, while Slack requires its own **mrkdwn** syntax where the
formatting actually inverts (`*bold*` is bold, not italic) — so the skill
drafts Slack posts in mrkdwn specifically, not a copy of the Discord
format.

**Telegram doesn't fit cleanly into either bucket — it's genuinely
bimodal, and which side a given target falls on has to be checked before
assuming either.** A public channel or group (one with an `@username`,
not just an invite link) can actually be previewed live via Telegram's
own `t.me/s/<username>` web preview, no login required — real research is
possible there, the same Primary/Secondary spectrum as Reddit or Product
Hunt. A private one (invite-link only) has no public surface at all, same
as Discord and Slack, so it falls back to asking you directly. Telegram
also draws a line Discord and Slack don't need to: a **channel** (only
admins post) versus a **group** (members can post) — a channel you don't
admin gets you pitch text to hand its owner, not a message you'd send
yourself. And its send path has its own two-stage shape: creating a bot
via @BotFather needs no approval at all, but the bot still has to be
added to the specific chat by one of its admins before it can post there
— easier than Slack's app-approval gate to start, but not the
single-step ease of a Discord webhook either.

A few things worth knowing going in:
- **Similarly-named platforms are a real trap, not a hypothetical one.**
  Researching Indie Hackers, one source turned out to be describing
  r/indiehackers — a separate subreddit that happens to share the
  name — not indiehackers.com itself. The skill now verifies a source is
  actually about the named target before trusting it at all, but it's
  worth double-checking yourself if a name could plausibly refer to more
  than one thing.
- **Self-promotion is the #1 way this goes wrong**, and each platform
  enforces it differently. Most active subreddits either ban it outright,
  cap it, or restrict it to a specific thread/day. Product Hunt has a
  dedicated Self-Promotion category, separate from General. Hacker News
  has no cooldown or designated lane at all — its rule is behavioral,
  about whether your account's overall pattern is genuine participation
  or promotion-only. Indie Hackers is the most welcoming of the five
  researchable platforms to the *fact* of self-promotion (it's built for
  founders sharing their own products) but still requires the right shape
  — Show IH specifically wants a founder story, your current stage, and
  real questions, not a pitch. dev.to sits close to Indie Hackers here —
  `#showdev` and its Organizations feature both signal the platform
  welcomes self-promotion structurally — but a post that reads as an ad
  rather than a real project write-up is still what gets a tag stripped or
  a report filed. Discord and Slack both vary entirely by server/workspace
  — some have a dedicated self-promo channel and welcome it, some ban it
  outright — which is exactly why this skill asks rather than guesses for
  either. Telegram varies the same way by channel/group, on top of the
  public/private split itself — a public one might have a pinned
  self-promo rule to actually check, a private one you just have to ask
  about, same as Discord/Slack. None of this is something the skill can
  audit against your actual account history or standing — double-check
  that yourself wherever a minimum or a pattern is at stake.
- **Don't batch-blast the same pitch across subreddits, groups, servers,
  workspaces, or forums.** Each community gets its own research pass (or,
  for Discord/Slack/a private Telegram target, its own ask) and its own
  angle; reusing one pitch verbatim across several is against most
  communities' rules and a fast way to get an account banned.
- **API access to actually post varies a lot by platform, and Discord,
  Slack, Telegram, and dev.to land in four different places, not one.**
  Reddit closed instant self-service app registration in late 2025 in
  favor of a manual approval queue (see "Posting directly to a platform"
  above) — you can still get `submit`-scope access, it just isn't
  instant. Product Hunt's write API requires Product Hunt's own special
  approval and isn't meant for individual developers at all. Hacker
  News's official API has **no write/submit endpoint whatsoever** — not
  gated, not approval-only, simply doesn't exist for anyone. Indie
  Hackers' API situation is genuinely unclear — some sources mention one,
  but it appears scoped to read-only product/revenue data, and there's no
  confirmed way to submit a post through it, so it's treated as
  manual-only rather than assumed either way. **Discord webhooks need no
  approval process at all** — a few clicks in channel settings and you
  have a working send path, no OAuth review, no waiting, though it still
  depends on having `MANAGE_WEBHOOKS` permission on that specific channel.
  **Slack sits in between**: no OAuth review from Slack itself either, but
  many workspaces require a Workspace Owner/Admin to approve the app a
  webhook needs before it can be created — don't assume it's as instant as
  Discord's. **Telegram has its own third shape**: creating a bot needs no
  approval at all, same ease as Discord's webhook step, but the bot then
  has to be added to the specific target chat by one of its admins before
  it can post there — a real second gate Discord doesn't have, and not
  quite the same gate as Slack's either (Slack blocks creating the app at
  all; Telegram blocks where an already-created bot can post). **dev.to is
  the one platform here whose access doesn't depend on the target at
  all** — an API key from your own account settings works under any tag
  your account can post to, no approval process found and no permission
  check tied to the specific destination, unlike Discord's or Telegram's.
  For Discord the hard part is research, not access; for Slack, both
  research and access can be real friction; for Telegram, research depends
  on public/private status and access has its own two-stage shape; for
  dev.to, access is close to frictionless but content moderation happens
  after the fact, separate from the API call itself; for the other three
  with no send path at all, it's the reverse of Discord entirely. Either
  way, the drafted post stands on its own — paste it in manually if you'd
  rather not set up API access.
- **A "Go" from this skill isn't a guarantee.** It's reading the same
  public rules a human would (or, for Discord/Slack/a private Telegram
  target, taking your word for them); a subreddit can still remove a post
  for a reason its rules page doesn't spell out, AutoModerator can act on
  something the skill couldn't see (an exact karma threshold, a banned
  domain list), HN or Indie Hackers can flag a post for reasons tied to
  your account's history the skill simply can't see, a dev.to Tag
  Moderator can strip a tag over something this skill's research couldn't
  fully confirm (the Code of Conduct's self-promotion wording, in
  particular), and a Discord server's, Slack workspace's, or Telegram
  channel's/group's actual current rules might differ from what you
  remembered (or what a public preview showed) when asked.
- **No dedicated Reddit, Product Hunt, Hacker News, Indie Hackers, dev.to,
  Discord, Slack, or Telegram connector exists to plug in here** (checked
  against Claude's connector directory as of this writing) —
  `community-post-generator` does its research with plain
  WebFetch/WebSearch against each site's own public pages (or, for
  Discord/Slack/a private Telegram target, by asking you), not a
  purpose-built API client. If that changes, connecting one wouldn't need
  a code change here, just point the skill at it.

## Posting to YouTube Shorts, Instagram Reels & TikTok

`short-form-video` drafts the script and per-platform package; sending it
for real is `scripts/publish_direct.py`'s job via `--platform youtube`,
`--platform instagram`, or `--platform tiktok`, same as the eight text
platforms above — but these three post actual video, and each one's
access story is genuinely different from the other two, not a shared
"video posting" tier:

**YouTube is the most self-serve of the three.** It uses the standard
YouTube Data API v3 (there's no separate "Shorts API" — a video becomes a
Short by being vertical and short enough, optionally reinforced with a
`#Shorts` tag in the description). All you need is your own Google Cloud
project's OAuth2 client, authorized against the channel you're uploading
to — no platform-side approval queue the way Reddit or TikTok require. A
mid-2026 quota change helps here too: video uploads now draw from their
own ~100-per-day bucket on your project instead of competing with every
other API call against the old shared 10,000-unit pool, so ordinary
personal or small-team posting volume shouldn't need special quota
approval anymore — confirm your project's current bucket size in Google
Cloud Console rather than assuming. It's also the one platform of the
three where the video is actually uploaded (a local file, via a resumable
upload) rather than fetched by the platform from a URL. `publish_direct.py`
defaults `--privacy-status` to `private` specifically so a `--confirmed`
run never goes public by accident.

**Instagram Reels needs the heaviest setup of the three.** You need an
Instagram Business or Creator account linked to a Facebook Page, a Meta
app with the `instagram_business_content_publish` permission actually
approved through Meta's app review (Development Mode alone only lets your
app's own admins/developers/testers post — fine for your own account,
not for anyone else's), and the video already hosted somewhere publicly
reachable: unlike YouTube, the Instagram Graph API has no raw-upload
endpoint at all — it fetches the video from a URL you give it. The real
flow is three steps, not one (create a media container, wait for
Instagram to finish processing the video, then publish it), which
`publish_direct.py` handles by polling rather than assuming it's instant.

**TikTok sits in between, with a real ceiling the other two don't have.**
Its Content Posting API needs an app approved for the `video.publish`
scope, and — this is the one to know before promising "just post it" —
**until your app passes TikTok's own audit, TikTok only accepts posts set
to private (`SELF_ONLY`), on a creator account that is itself set to
private. Anything else is rejected outright, not quietly posted as
private.** Audit review reportedly takes anywhere from a few days to about
two weeks; until it passes, TikTok posting through this script is useful
for testing the pipeline, not for actually reaching an audience. Before
every post, `publish_direct.py` also asks TikTok which privacy levels and
interaction settings the creator currently allows (TikTok requires this
step). It stops if `--privacy-level` isn't one of them, and turns off
duets, comments, or stitching wherever the creator already has. Like Instagram, it
fetches the video from a URL rather than accepting an upload — that URL's
domain also has to be pre-verified for your app in TikTok's developer
portal. And a 2xx response from either Instagram's or TikTok's API means
the request was accepted, not that the video is live yet — both process
the video asynchronously afterward, so confirm the actual result (TikTok's
own status-fetch endpoint, or checking the account directly) before
reporting a send as done.

**Covers:** `--cover-ms` picks the cover frame on TikTok
(`video_cover_timestamp_ms`) and Instagram (`thumb_offset`), and
`--cover-url` gives Instagram a cover image instead; `render.js --cover`
prints the value for the frame it checked. YouTube's Shorts cover is
chosen in its app.

None of this blocks the default path: `short-form-video` always produces
the full script, caption, and hashtags regardless of whether any of this
is set up, and posting it yourself by hand — download or generate the
clip, paste the caption, tap post — works the same as it always has.

## Connecting a visual-generation tool

`visual-brief-generator` checks your currently connected tools for an
image/video-generation MCP connector at runtime — it doesn't assume a
specific one. Higgsfield launched an official hosted MCP server in 2026
(Runway and Midjourney still have no known official one as of this
writing); a **Canva** connector also exists (requires connecting via
OAuth in your Claude settings) as another real option for visual asset
work — neither is hardcoded or assumed present. If none is connected, the
skill still produces the full written brief and prompts — just paste them
into whatever tool you use.

## Connecting a short-form video generation tool

`short-form-video` checks the same way, at runtime, for a connected
image/video-generation tool — it never assumes one is present, the same
rule `visual-brief-generator` follows above.

- **Higgsfield** is a real option if you have it connected: its hosted
  MCP server exposes 30+ image/video models (including Veo, Sora, Kling,
  and Seedance) through one connection, generating clips up to roughly 15
  seconds per generation from a text or image prompt. It isn't a default
  connector for every account, so if you have a Higgsfield account and
  want to use it here, add it yourself as a custom connector: in Claude,
  go to Customize → Connectors → Add custom connector, and give it a name
  plus Higgsfield's own MCP server URL from your Higgsfield account.
  Connecting the MCP server itself is free; **generating through it still
  spends Higgsfield's own credits** (published annual plans currently run
  from about $15/month for 200 credits up to $99/month for 3,000 — new
  accounts get some starter credits free). Being connected doesn't mean
  free generation, the same distinction this plugin's `email-outreach`
  skill already draws about a connected prospecting tool.
- **Figma Weave** is another option if you have the Figma connector: its
  `weave_*` tools can run named AI video models (Veo, for example). It
  spends your Weave credits — the skill shows you the quoted cost and
  waits for a yes before each run — and it only works once your Figma
  account is linked to Weave in Weave's own profile settings.
- **Canva** works here too, the same connector already documented above
  for `visual-brief-generator`.
- **Listed isn't the same as working.** A connector can appear in your
  session but still be waiting on authorization (Canva often is), or
  still need an account linked (Weave). The skill tells you which one and
  the exact fix, rather than just saying nothing is connected.
- **Once a clip is generated**, the skill downloads it to a local file
  right away, because generator links usually expire. That file is what
  `--platform youtube` uploads. For Instagram or TikTok, re-host it on a
  URL you control before posting: TikTok only fetches from a domain
  verified for your own app.
- **No connector at all?** The skill can still render the video itself
  on your machine, for free. See "Rendering a short-form video locally"
  below.
- **If none of these is connected**, the skill still produces the full script
  and per-platform package, and recommends current free tools to actually
  make the video yourself — **CapCut** is the most confident
  recommendation (genuinely free, no watermark on exports, built for
  vertical Shorts/Reels/TikTok-style editing specifically), with Canva's
  free tier as a second solid option. Plenty of other "free AI short-video
  generator" tools advertise themselves online; this plugin's research
  couldn't independently verify most of their actual quality or
  free-ness, so treat any of them beyond these two as something to vet
  yourself before trusting with real content.

## Rendering a short-form video locally

`scripts/video/render.js` turns an animated HTML page into a finished
vertical video, with no video-generation service involved. When you opt
in, `short-form-video` writes the page from its own script and renders
it. You can also run the renderer yourself.

**What it makes:** motion graphics (kinetic text, shapes, UI mockups) over
real backgrounds, with music composed for your project, and a voiceover if
you record one. It doesn't film your product or people. The output is 1080×1920
(9:16), 30fps H.264 with AAC audio mixed to about −14 LUFS, which is what
YouTube Shorts, Instagram Reels, and TikTok all expect.

**One-time setup:** you need Node 18+, ffmpeg (`brew install ffmpeg` or
`apt install ffmpeg`), and Playwright:

```
cd scripts/video
npm install
npx playwright install chromium   # skip if Google Chrome is installed; it's used as a fallback
npm install kokoro-js             # optional: free generated voiceovers (about 600 MB)
```

For stock backgrounds, also get free API keys from
[Pexels](https://www.pexels.com/api/) and [Pixabay](https://pixabay.com/api/docs/)
and set them as `PEXELS_API_KEY` and `PIXABAY_API_KEY`. Without them, only
Openverse photos are available (no video clips).

**Usage:**

```
node render.js templates/promo.html out.mp4             # full render, ~2 minutes for 24s
node render.js templates/promo.html --check             # lint the layout over the whole timeline, in seconds
node render.js templates/promo.html --slides            # each scene's settled frame as a PNG (also a carousel)
node render.js templates/promo.html --stills 1.5,6,12   # preview frames at chosen times
node render.js templates/promo.html out.m4a --audio-only  # just the soundtrack, in seconds
node render.js --sample pop out.m4a --motif "1 3 5 3 | 6 5 3 -" --key D   # audition a sound
node render.js page.html out.mp4 --silent               # silent audio track instead of the soundtrack
node media.js search "cozy coffee shop morning" --out assets --count 3     # stock photos (+ --type video)
node check.js                                            # QA every template: layout, cues, fonts, loudness
node beats.js assets/track.mp3 --align 2 --duration 24   # a track's tempo and beats, started so its drop hits 2s
node voice.js script.md --out assets --voice af_heart     # a free voiceover, one WAV per script line
node voice.js --audition samples "One line to try."       # the same line in four voices, to pick one
node compose.js script.md                                 # a narrated video page from a script: voice, backgrounds, synced captions
node render.js page.html --voice-lengths                  # each voice line's start, length, and room in its scene
node captions.js assets/voice-1.wav --text "the line"     # when each word of a line is said
node brand.js page.html                                   # the Visual Identity: colors, font, a logo end card
node render.js page.html out.mp4 --variants a,b --cover 0 # one video per hook variant, plus the cover frame
```

Every page's hook is on screen from the first frame, which is also the
default cover, and `--check` fails a page whose first frame has no text or
whose text leaves before it can be read. Hook variants (`data-variant`)
render several versions of one video to test, and `--cover` writes the
cover frame, checked against the 3:4 crop the profile grids show.
`brand.js` applies the Visual Identity saved in `brand-voice.md` (colors,
a display font, and an end card with the logo and handle that lands with
the sonic logo), the visual counterpart of the Sonic Identity.

Every render lints its layout as it goes: text outside the area the
platforms' buttons and captions leave clear, text spilling out of its box
or clipped, and text running into other text or a card all get reported
with the time they happen. That's what catches rewritten copy that runs
long. `check.js` runs the same lint over every template (or the pages you
name), checks every sound cue, the music settings, the fonts, and the
loudness, and writes a report with a contact sheet per page to look over.

Fonts (Inter, and TikTok Sans for everyday posts) and color emoji come from
Google Fonts. The renderer fetches and caches them itself, so after the
first run it works offline, and behind proxies the browser doesn't trust.

### Backgrounds

Every scene in a template has an empty background slot already timed to
it. Put a photo or clip in it and it fills the frame, with:
- a slow zoom or pan
- a crossfade to the next scene
- a scrim that keeps text readable (bright images get darkened
  automatically)
- one shared color grade, so mixed sources look like one set

`blur` softens a busy image, and `tint` washes it in your accent color.
An empty slot shows the gradient instead.

Where backgrounds come from:
- **Stock photos and video clips:** `scripts/video/media.js` searches
  Pexels, Pixabay, and Openverse for vertical media. It downloads into the
  page's `assets/` folder and writes `CREDITS.md`, with each file's license
  and the exact credit line to put in your caption when one is required
  (Pexels and CC BY photos need one). Openverse results are limited to
  licenses that allow commercial use and modification.
- **AI-generated images:** made with a connected image tool (Figma Weave
  once your Figma account is linked, or Higgsfield). The skill quotes the
  cost and waits for your yes before every image. If an AI image looks
  photorealistic, switch on the platform's AI-content label when posting;
  TikTok, YouTube, and Instagram all ask for it.

Stock and AI images set the scene only. They never stand in for your
customers, team, product, or results; those are always your own real
photos and screenshots.

### Sound

Every video gets music composed for it in your project's **sonic
identity**: one genre, tempo, key, energy, and signature hook. It's saved
in `references/brand-voice.md` and used for every video, so your sound
becomes recognizable the way a jingle does. There are eleven genres:
`pop`, `house`, `hiphop`, `acoustic`, `cinematic`, `tech`, `lofi`, `calm`,
and three for very online Gen Z and Gen Alpha feeds: `phonk`, `jersey`
(jersey club), and `funk` (Brazilian funk).
The first time you render, the skill proposes two identities that fit your
audience and plays you a short preview of each.
[`references/sound-guide.md`](references/sound-guide.md) explains the
genres and how they map to audiences, and has a library of hooks.

How a video's soundtrack is put together:
- **The hook:** enters as the melody when the beat drops, answered by a
  variation every four bars. Chords are chosen to fit it.
- **The ending:** a **sonic logo**, the hook's first notes resolving
  home on the last beat.
- **Sound effects:** land on the moments the page marks (words popping
  in, list items, checkmarks, a button press, scene changes), in the
  music's key. Everyday posts also get the meme cues: a boom, a record
  scratch, an air horn, a rimshot, a sad trombone, a drumroll, a ding and
  a buzzer, message pings, typing, a camera shutter, a ka-ching, a glitch,
  and a sub drop.
- **No licensing:** it's all synthesized from scratch, so there's nothing
  to license, and it works when posting through an API, where in-app
  trending sounds can't be added.
- **Your own track instead:** add `data-music-src="assets/track.mp3"`.
  The renderer trims it, fades it, and dips it under the sound effects.
  `beats.js` finds the track's tempo, beats, bars, and its biggest lift
  (a drop or chorus), so the skill can start the track where the lift
  lands on your hook and cut scenes on the beat. It says how confident it
  is; on music without a steady beat, scenes follow the voice instead.
  `sound-guide.md` lists where to get licensed tracks; never use a
  popular song without a license.
- **Longer videos:** the generated music is written for shorts and
  repeats the same few bars, so for anything over about 45 seconds use
  your own track. The renderer warns when a long video doesn't.
- **A voiceover:** record each line of the script on your phone, put the
  files in `assets/`, and add `data-voice="assets/voice-1.m4a"` to the
  element each line belongs to (or `<body data-voice-src>` for one
  continuous take). The renderer trims the silence before each line,
  evens out their levels, and ducks the music and effects under your
  voice.
- **A free generated voice instead:** `voice.js` reads the script with
  Kokoro, an open-source voice model (Apache-2.0) that runs on your own
  machine, so there's no account, API key, or cost. It writes one WAV per
  line in any of 28 stock voices. Install it once with `npm install
  kokoro-js`; the first run downloads the model (about 90 MB) and then
  works offline. If a platform asks whether a video uses AI-generated
  audio, say yes.
- **Captions synced to the voice:** most people watch muted. A line in
  `<div class="say auto" data-voice="...">` is shown word by word in short
  chunks, the word being said highlighted, timed to the clip by
  `captions.js` with no service involved (about 50 ms from the true word
  starts on average, checked against synthesized speech). The render also
  writes an `.srt` caption file. `--whisper` uses Whisper's word timing
  instead, if `kokoro-js` is installed.
- **A narrated video in one step:** `compose.js` takes a script of numbered
  lines (each with an optional `[bg: search query]`), voices it or uses
  your takes, fetches a background per line, times every scene to its line
  with cuts on the beat, and writes the page with the hook on screen from
  the first frame.

### Templates by video type

`short-form-video` picks a type from
[`references/video-types.md`](references/video-types.md), a catalog of 23
marketing video types with the beats for each, how it gets made, and what
background and sound suit it. It then starts from the matching template
in `scripts/video/templates/`:

| Template | Length | For | Default sound |
|---|---|---|---|
| `promo.html` | 24s | Ads, brand profile, explainer, educational lists (it's a promo for this plugin) | tech |
| `how-to.html` | 20s | Tutorials, and product demos told as steps on a phone screen | tech |
| `testimonial.html` | 20s | Customer testimonials, case studies with counted-up results, interview pull-quotes | calm |
| `faq.html` | 18s | FAQ replies to a comment, myth vs fact | pop |
| `announcement.html` | 18s | Launches, plus event, webinar, and live-stream promos | house |
| `team.html` | 18s | Meet the team, the people side of a company profile | acoustic |
| `narrated.html` | per script | A voiceover over one background per line, with captions synced to the voice: explainers, tips, text-led brand stories (built by `compose.js`) | the identity, energy −1 |

The skill swaps each template's default sound for your sonic identity.

### Templates for everyday posts

Most of a feed isn't ads. It's the memeable, comment-driven posts in
between: POVs, tier lists, text-message skits, storytimes. There are 22
templates for the formats that have lasted, each 10–18 seconds, written in
TikTok's own caption style (TikTok Sans, boxed captions, stickers, and
stamps):

| Group | Templates |
|---|---|
| Meme captions | `pov`, `nobody-me` (nobody: / me:), `expectation-reality`, `tell-me-without`, `makes-sense` (things that just make sense), `starter-pack` |
| Comment bait | `tier-list`, `this-or-that`, `hot-take` (with a poll), `flags` (green / red), `quiz` (guess it in 3 seconds), `rating` |
| UI skits | `text-chat`, `notifications` (a lock screen filling up), `post-card` (likes and replies), `loading` (a stalled bar and an error) |
| Story & everyday | `storytime` (word-by-word captions), `countdown` (top 5), `day-in-life`, `reveal` (wait for it), `before-after` (a wipe), `slideshow` (also a photo carousel) |

[`references/fyp-formats.md`](references/fyp-formats.md) covers each one:
why it gets engagement, its beats, the sound, a line of copy at a playful
and a professional tone, and when not to use it. It also covers planning a
week of them: about 70% evergreen formats, 20% trends, and 10%
experiments, with no format repeated within a week. `content-calendar`
follows that rotation. The copy follows your brand voice: lowercase,
slang, and emoji only if `brand-voice.md` allows them.

Skits are always fiction: generic roles ("client", "a friend") with emoji
avatars, never a real person's name, post, or messages, never a real
app's look, and never a reply praising the product. There are no
copyrighted meme images, and the jokes are about situations and habits,
never about groups of people. Trending sounds are added in the app when
you post.
Types that need real footage (behind the scenes, vlogs, UGC, on-camera
testimonials) get a phone shot list and edit notes instead; the renderer
doesn't fake real people or events. The testimonial and team templates
ship with bracketed placeholders, which the skill replaces only with real,
permissioned material from you.

A comment at the top of `promo.html` documents how a page works: CSS
animations timed with `animation-delay` (the renderer seeks every one
frame by frame, so output is frame-exact on any machine), the background
slots, the music settings on `<body>`, and `data-sfx` cues. The templates
are built from one shared base by `templates/build.py` (the everyday ones
are defined in `templates/fyp.py`); edit those and run `python3 build.py`
rather than hand-editing 29 copies.

The skill saves its pages and renders under `state/videos/`, with media in
`state/videos/assets/`. Rendered MP4s and downloaded media are git-ignored;
`CREDITS.md` is kept.

## Connecting outreach tools (prospecting + Gmail)

`email-outreach` checks your currently connected tools at runtime for two
different things, the same way `visual-brief-generator` checks for an
image/video-gen connector — it doesn't assume either is present:

- **A prospecting/data-enrichment tool** (e.g. a connected Vibe
  Prospecting MCP server) — used only when you ask for it. **Free
  public-web research (WebSearch/WebFetch) is the default for every
  batch**, connected or not, at lower confidence and without verified
  contact details. Say something like "use Vibe Prospecting" or "get me
  a verified email for this one" to opt a run (or a single prospect)
  into the paid path instead — being connected doesn't switch it on by
  itself, and even after you opt in, any actual credit spend
  (`enrich-prospects`/`export-to-csv`) still shows its cost and waits for
  your go-ahead separately.
- **Gmail** (via a connected Gmail MCP server) for two things: creating
  real drafts you can review and send yourself, and — at the start of
  every run — reading real replies and bounce notifications for anyone
  already logged `Sent`, so `state/outreach-log.md`'s suppression list
  updates itself instead of depending on manual edits. Without it
  connected, `email-outreach` still produces the full email content and
  still checks its local log — it's just saved to `state/outreach/`
  instead of also landing in your Gmail Drafts folder, and the log's
  `Replied`/`Bounced`/`Unsubscribed` statuses only change when you (or
  the prospect, via a reply you paste in) update them.

Either way, `email-outreach` only ever creates drafts or queues content —
actually sending (Gmail's `send_message`) always requires your explicit,
live go-ahead in that conversation, the same rule `publish-pipeline`
follows for every other channel in this plugin. It also never has a
scheduled-send tool to call: the per-prospect "Recommended Send Time" it
computes (from the prospect's own region, inside your configured
send-time window) is there for you to act on manually, or by pointing
Gmail's own scheduled-send feature at that time yourself.

## FAQ

### What are Claude Code skills?

A skill is a folder with a `SKILL.md` file that teaches Claude a
repeatable task. Claude reads each skill's description and uses it
automatically when your request matches ("write an SEO brief for…",
"give me a week of LinkedIn posts"), or you can call one by name, such as
`/marketing-skill:seo-brief`.

### Do I need API keys or paid tools?

No. Research uses Claude's built-in web search and fetch, and every skill
produces its full written output with no connector or API key. Gmail, a
prospecting tool, Higgsfield, Canva, and platform API credentials are
optional extras, and paid ones are used only when you ask. Rendering a
video locally needs only free tools (Node, Playwright, and ffmpeg), plus
free Pexels and Pixabay keys if you want stock backgrounds.
Actually sending content needs your own webhook or credentials.

### Will it post or send emails automatically?

No. Drafts are queued in `state/`, and only `publish-pipeline` sends,
after you approve specific items in a live conversation.
`email-outreach` creates drafts and never sends. See
[Content calendar & approval model](#content-calendar--approval-model).

### Can I use just one skill?

Yes. Ask for what you need and only the matching skill runs. To skip the
plugin system, copy the skill folders in by hand (see [Install](#install)).

## Repo layout

```
.claude-plugin/
  plugin.json         # plugin metadata
  marketplace.json     # lets this repo install itself via `marketplace add` (Claude Code and Codex)
skills/                 # the 12 skills, one SKILL.md each
commands/
  marketing-setup.md    # the /marketing-skill:marketing-setup command
references/
  brand-voice.md         # shared config every skill reads (hand-edited)
  outreach-strategy.md   # email-outreach's own config: ICP, angle, offer, cadence (hand-edited or guided setup)
  video-types.md         # 23 marketing video types: goal, short-form beats, and how each gets made (hand-editable)
  sound-guide.md         # music genres, sound effects, how to pick a project's sonic identity, a hook library, licensed tracks
  hooks.md               # hook patterns by goal, written to work with the sound off, and how to test them
  video-rendering.md     # the local render procedure short-form-video follows
  fyp-formats.md         # 22 everyday / FYP formats: why each works, beats, copy at two tones, weekly mix and rotation
state/
  content-calendar.md    # calendar/history index (generated + appended to, hand-editable)
  posts/                  # one file per queued post's full content, linked from the index above
  outreach-log.md         # outreach queue/history + permanent suppression list (generated + appended to, hand-editable)
  outreach/               # one file per drafted email's full content, linked from the log above
scripts/
  publish_webhook.py     # stdlib-only webhook sender (see --help)
  publish_direct.py      # stdlib-only direct-to-platform scaffold (LinkedIn/X/Meta/Reddit/Discord/Slack/Telegram/dev.to/YouTube/Instagram/TikTok), needs your own API credentials (see --help)
  video/
    render.js            # animated HTML page -> vertical MP4 with an original soundtrack (needs Node, Playwright, ffmpeg)
    soundtrack.js        # the music and sound-effects synthesizer render.js uses (no dependencies)
    media.js             # finds stock photos and clips (Pexels, Pixabay, Openverse) and writes their credits
    check.js             # QA pass over templates: layout lint, cues, fonts, loudness, contact sheets
    voice.js             # free local voiceover (Kokoro): a script -> one WAV per line
    captions.js          # word timing for a voice line, caption chunks, and .srt files
    compose.js           # a narrated video page from a script: voice, backgrounds, synced captions
    brand.js             # applies the Visual Identity to a page: colors, font, logo end card
    beats.js             # a music track's tempo, beats, bars, and drops, to cut a video on its beat
    templates/           # 7 marketing + 22 everyday starting pages, built from templates/build.py and fyp.py
```

## Share what you made

Made a content calendar, a cold email batch, a video, or a launch post
with these skills? Post it in
[Show and tell](https://github.com/marcosmodly/marketing-skill/discussions/categories/show-and-tell),
along with which skills you ran and anything that didn't work the way you
expected. Questions go in
[Q&A](https://github.com/marcosmodly/marketing-skill/discussions/categories/q-a),
and bugs in [Issues](https://github.com/marcosmodly/marketing-skill/issues).

## Contributors

- [marcosmodly](https://github.com/marcosmodly)
