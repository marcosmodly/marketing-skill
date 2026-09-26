# marketing-skill

A Claude Code plugin that packages a marketing workflow as eleven
composable skills: research a competitor, batch-plan a content calendar,
repurpose findings across channels (including SEO, paid ads, and email),
run a steady daily batch of researched, individually personalized cold
outreach emails (deduplicated against a permanent contact log, with its
own monthly strategy refresh), brief out a visual asset, research a
specific subreddit's, Product Hunt's, Hacker News's, Indie Hackers',
dev.to's, Discord server's, Slack workspace's, or Telegram
channel's/group's own rules before drafting a post for it (asking you
directly for Discord, Slack, and any private Telegram target, since those
have no public page to check), and hand the finished content off to your
own automation — or, with real credentials you provide, straight to a
platform API — for publishing.

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
| `community-post-generator` | "post this to r/[subreddit]," "help me post on Product Hunt," "write a Show HN/Show IH for this," "post this on dev.to," "post this in our Discord/Slack/Telegram" | Live-researches that specific subreddit's, Product Hunt's, Hacker News's, Indie Hackers', dev.to's, or a public Telegram channel's/group's actual rules and typical post style first (verifying each source is actually about that target, not a similarly-named one); for Discord, Slack, and private Telegram targets, asks you for the rules instead, since it can't research those. Gives a plain Go/No-Go either way, and only drafts a post (shaped for that platform — title+body, title+URL+first comment for Show HN, dev.to's title+body+tags, or a single chat message in Discord's, Slack's, or Telegram's own formatting for the chat platforms) if it's actually welcome there, written to read like a person wrote it |
| `publish-pipeline` | "publish this," "send to n8n/Make," "fire the webhook," "send the queued post for [date]" | Packages finished content/assets into JSON and hands off to your automation via webhook (or, optionally, straight to a platform API) after showing you the exact payload |
| `full-pipeline` | "run the full pipeline," "research X and publish it," "do the whole thing end to end" | Chains research, repurposing, visual brief, and publish into one run, with a mandatory pause before anything actually publishes |

Plus one setup command: `/marketing-skill:marketing-setup`.

## Using your own project as source material

`competitor-research`, `content-calendar`, `content-repurposer`,
`seo-brief`, `ad-copy-generator`, `email-sequence`, `email-outreach`,
`visual-brief-generator`, and `community-post-generator` can pull from
the project they're installed in instead of requiring you to paste
content every time. If you reference
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
claude plugin marketplace add .
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

The manual copy skips the setup command and `${CLAUDE_PLUGIN_ROOT}`
path substitution — see "Configure" below for the equivalent manual step,
and swap `${CLAUDE_PLUGIN_ROOT}` for the actual absolute path in
`scripts/publish_webhook.py` references inside each skill if you go this
route.

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
or via Gmail's own native scheduled-send feature.

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
Page), Reddit, Discord, Slack, Telegram, or dev.to instead of going
through your own automation — `python3 scripts/publish_direct.py --help`
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
post yourself before trusting it in anything automated. It's text-only —
no media attachments, and Instagram isn't supported at all since it has no
text-only post endpoint. Same `--dry-run`/`--confirmed` safety pattern as
the webhook script, including credential redaction in `--dry-run` output —
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

## Connecting a visual-generation tool

`visual-brief-generator` checks your currently connected tools for an
image/video-generation MCP connector at runtime — it doesn't assume a
specific one. As of this writing, none of Higgsfield, Runway, or
Midjourney has a known official MCP server, so there's nothing to
hardcode; a **Canva** connector does exist (requires connecting via OAuth
in your Claude settings) as one real option for visual asset work. If
none is connected, the skill still produces the full written brief and
prompts — just paste them into whatever tool you use.

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

## Repo layout

```
.claude-plugin/
  plugin.json         # plugin metadata
  marketplace.json     # lets this repo install itself via `marketplace add`
skills/                 # the 11 skills, one SKILL.md each
commands/
  marketing-setup.md    # the /marketing-skill:marketing-setup command
references/
  brand-voice.md         # shared config every skill reads (hand-edited)
  outreach-strategy.md   # email-outreach's own config: ICP, angle, offer, cadence (hand-edited or guided setup)
state/
  content-calendar.md    # calendar/history index (generated + appended to, hand-editable)
  posts/                  # one file per queued post's full content, linked from the index above
  outreach-log.md         # outreach queue/history + permanent suppression list (generated + appended to, hand-editable)
  outreach/               # one file per drafted email's full content, linked from the log above
scripts/
  publish_webhook.py     # stdlib-only webhook sender (see --help)
  publish_direct.py      # stdlib-only direct-to-platform scaffold (LinkedIn/X/Meta/Reddit/Discord/Slack/Telegram/dev.to), needs your own API credentials (see --help)
```

## Contributors

- [marcosmodly](https://github.com/marcosmodly)
