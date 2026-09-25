# marketing-skill

A Claude Code plugin that packages a marketing workflow as ten composable
skills: research a competitor, batch-plan a content calendar, repurpose
findings across channels (including SEO, paid ads, and email), brief out
a visual asset, research a specific subreddit's, Product Hunt's, Hacker
News's, Indie Hackers', dev.to's, Discord server's, Slack workspace's,
Telegram channel's/group's, or a GitHub repository's Discussions rules
before drafting a post for it (asking you directly for Discord, Slack,
and any private Telegram target or repository, since those have no
public page to check), and hand the finished content off to your own
automation — or, with real credentials you provide, straight to a
platform API — for publishing.

**[See a full worked run →](EXAMPLE.md)** — one continuous
`full-pipeline` call from research to the approval checkpoint before
anything actually publishes.

## Skills

| Skill | Triggers on | Does |
|---|---|---|
| `competitor-research` | "research a competitor," "analyze a rival," "build a battlecard" | Full analytical competitor brief: overview, recent moves, messaging analysis, SWOT, recommendations, sources |
| `content-calendar` | "content calendar," "a week of posts," "plan a month of content" | Batch-generates several dated, platform-tagged posts in one pass, checked against `state/content-calendar.md` so it doesn't repeat a recent topic; queues everything for approval, never sends |
| `content-repurposer` | "repurpose this," "turn this into a LinkedIn post/thread/newsletter/YouTube title/TikTok caption/Instagram caption" | One source → a LinkedIn post, a Twitter/X thread, a newsletter blurb, YouTube title+description+tags, a TikTok caption, and an Instagram caption, in one pass |
| `seo-brief` | "SEO brief," "keyword research," "optimize this for search" | Target/secondary keywords, search intent, suggested outline, meta title/description — never fabricates search-volume numbers |
| `ad-copy-generator` | "ad copy," "Meta/Google/LinkedIn/YouTube/TikTok ad variants," "A/B test copy" | Multiple ad variants per platform, each a distinct hook angle, sized to that platform's character limits |
| `email-sequence` | "email sequence," "drip campaign," "welcome series" | A multi-email sequence with send timing, subject lines, and a real narrative arc across emails |
| `visual-brief-generator` | "visual brief," "video brief," "shot list," "image prompts for X" | A structured shot list, per-scene prompts, aspect ratios, and style guide, with platform-specific format conventions (short-form scroll-past hook timing for TikTok/Reels/Shorts vs. long-form/feed pacing); generates the actual asset only if a visual-gen tool is connected |
| `community-post-generator` | "post this to r/[subreddit]," "help me post on Product Hunt," "write a Show HN/Show IH for this," "post this on dev.to," "post an update to our GitHub Discussions," "post this in our Discord/Slack/Telegram" | Live-researches that specific subreddit's, Product Hunt's, Hacker News's, Indie Hackers', dev.to's, a public Telegram channel's/group's, or a public GitHub repository's Discussions actual rules and typical post style first (verifying each source is actually about that target, not a similarly-named one); for Discord, Slack, and private Telegram targets or repositories, asks you for the rules instead, since it can't research those. Gives a plain Go/No-Go either way — for GitHub Discussions specifically, whether Discussions is even enabled and whose repository it is matter as much as any rule — and only drafts a post (shaped for that platform — title+body, title+URL+first comment for Show HN, dev.to's/GitHub's title+body+tags-or-category, or a single chat message in Discord's, Slack's, or Telegram's own formatting for the chat platforms) if it's actually welcome there, written to read like a person wrote it |
| `publish-pipeline` | "publish this," "send to n8n/Make," "fire the webhook," "send the queued post for [date]" | Packages finished content/assets into JSON and hands off to your automation via webhook (or, optionally, straight to a platform API) after showing you the exact payload |
| `full-pipeline` | "run the full pipeline," "research X and publish it," "do the whole thing end to end" | Chains research, repurposing, visual brief, and publish into one run, with a mandatory pause before anything actually publishes |

Plus one setup command: `/marketing-skill:marketing-setup`.

## Using your own project as source material

`competitor-research`, `content-calendar`, `content-repurposer`,
`seo-brief`, `ad-copy-generator`, `email-sequence`,
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
Page), Reddit, Discord, Slack, Telegram, dev.to, GitHub Discussions,
TikTok, or Instagram instead of going through your own automation —
`python3 scripts/publish_direct.py --help` lists what each platform
needs. YouTube is deliberately not included (see below). **Read the
script's module docstring before using it.** It was written without a
connected account or live credentials for any of these platforms to test
against, so it's best-effort against each platform's last publicly
documented API, not a verified integration — confirm the endpoint is
still current against that platform's own developer docs
(developers.linkedin.com, developer.x.com, developers.facebook.com,
Reddit's own API docs, Discord's own API docs, Slack's own API docs,
Telegram's own Bot API docs at core.telegram.org/bots/api,
developers.forem.com/api for dev.to, docs.github.com/en/graphql for
GitHub Discussions, developers.tiktok.com for TikTok, and
developers.facebook.com/docs/instagram-platform for Instagram), confirm
you actually have write-access API scope (X in particular gates this
behind a paid tier, Reddit closed instant self-service app registration
in late 2025 for a manual approval queue — existing approved apps still
work, and Slack may need a Workspace Owner/Admin to approve the app a
webhook requires — see below), and do one manual `--confirmed` test post
yourself before trusting it in anything automated.

Every platform except two is text-only — a single request, no media
involved. TikTok and Instagram are different: both need an image or video
that's *already hosted at a public URL* you provide, since neither
platform's write API accepts raw file upload from a script like this one
— get the asset hosted somewhere public first (your own site, a CDN,
cloud storage), then point these two at that URL. Same
`--dry-run`/`--confirmed` safety pattern as the webhook script either way,
including credential redaction in `--dry-run` output — for Discord and
Slack specifically, the webhook URL itself is the credential (there's no
separate token), so that whole URL gets redacted, not just a header; for
Telegram, only the bot token embedded in the URL path gets redacted, since
the rest of the URL is just the API endpoint shape, not a secret; for
dev.to, GitHub Discussions, TikTok, and Instagram, the credential is a
static API key or access token in a header (`api-key` for dev.to,
`Authorization: Bearer` for the other three), all redacted the same
simple way, no OAuth flow needed to obtain any of the four in the first
place. For Reddit, a successful response doesn't guarantee the post
survives that subreddit's AutoModerator — see "Posting to Reddit, Product
Hunt, Hacker News, Indie Hackers, dev.to, GitHub Discussions, Discord,
Slack & Telegram" below before sending anything for real.

**Discord is one of the easiest to actually set up** — a webhook needs no
OAuth app review at all, just `MANAGE_WEBHOOKS` permission on the channel
to create one (Channel Settings → Integrations → Webhooks). That's one
place this script is easier than the platform it's replacing, not harder:
`community-post-generator` can't independently verify a Discord server's
rules the way it can for the researchable five (see below), so the actual
bottleneck for Discord is research, not access. It's not the unconditional
floor, though — see dev.to and GitHub Discussions below for credentials
that need no target-specific permission to be valid, even though only one
of the two guarantees there's somewhere to actually use it.

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

**dev.to has the simplest access story among the platforms above it — not
just easy, but unconditionally easy.** An API key comes from your own
account settings, full stop; no approval process was found in this
skill's research, and access doesn't depend on any permission over the
specific target either — Discord's webhook still needs `MANAGE_WEBHOOKS`
on that channel, Telegram's bot still needs a chat admin to add it, but a
dev.to API key works under whatever tags your account can post to, which
is all of them. That ease is about access, though, not content: a Tag
Moderator can still strip a tag from the result afterward, and this
skill's research couldn't confirm the Code of Conduct's specific
self-promotion wording (dev.to's own domain was unreachable during that
research) — a 2xx response means the article was accepted, not that it
was welcomed. Posts as a full title+body Markdown article with up to 4
tags (`--tags`), not a short message, and optionally under a dev.to
Organization (`--org-id`) instead of your personal account. No documented
character limit, unlike the four chat platforms above.

**GitHub Discussions' access is just as easy as dev.to's, but easy access
turns out to be the smaller of its two questions.** A Personal Access
Token, generated in your own GitHub account settings with `public_repo`
scope for a public target, needs no app review either — on the
credentials-alone axis, it ties dev.to for the least friction here. What
it doesn't share with dev.to is any guarantee there's somewhere to send
*to*: most repositories never turn Discussions on at all (confirmed by
testing against this very plugin's own repository, which doesn't have it
enabled), and some categories restrict who can start a new discussion to
the repository's own maintainers regardless of the token's validity.
Needs the target repository's and category's GraphQL node IDs
(`--repo-id`/`--category-id`), not `owner/repo` or a category name — this
script doesn't resolve those for you. No character limit confirmed
specifically for Discussions — GitHub's Issues/PR comments cap at 65,536
characters and Discussions likely shares that infrastructure, but this
wasn't independently verified, so treat it as a risk to watch, not a rule
this script enforces.

**TikTok's access is easy the same way dev.to's and GitHub Discussions'
are, but what you actually get for it is smaller than either.** A TikTok
for Developers access token needs no app review to start using. The catch
is real, though: an unaudited app can only post at `SELF_ONLY` privacy —
visible to nobody but the posting account — permanently, even after a
later audit passes; going through TikTok's own audit process is the only
way to actually reach public posting, and nothing this script does
substitutes for that. Posts via the Content Posting API's `PULL_FROM_URL`
mode: provide a public video URL (`--video-url`), TikTok's servers fetch
it themselves, no binary upload from this script.

**Instagram is the one platform here with a genuinely different shape,
not just different friction.** Every other builder here is one request;
Instagram's Graph API is two — create a media container from an image or
video URL (`--media-url`), then publish that container's `creation_id` in
a second invocation (`--publish-container-id`). For video specifically,
the container needs to finish processing before publishing will succeed,
and this script doesn't poll for that status itself — check it yourself
(a plain GET against the same API, documented in the script's NOTES) in
between. Needs an Instagram Business or Creator account linked to a
Facebook Page, and its own credential pair
(`INSTAGRAM_ACCESS_TOKEN`/`INSTAGRAM_USER_ID`) distinct from the `meta`
platform's Facebook Page token above, even though both ride the same
Graph API family.

**YouTube is the one platform in this whole list without a builder, on
purpose.** Community posts have no public write API at all — confirmed:
the endpoint that used to support this (`activities.insert`) was
deprecated in 2020, and Community posts remain Studio-only today. Real
video upload needs a fundamentally different kind of tool than this
script is — a full interactive OAuth 2.0 consent flow just to get a
usable credential in the first place (not a token you generate once and
paste in, the way every other platform here works), resumable/chunked
upload of the actual video bytes, and a verified Google Cloud project
before public videos are even allowed. `content-repurposer` still drafts
YouTube title/description/tags text; there's just nowhere for this script
to send it.

**Product Hunt, Hacker News, and Indie Hackers all have no direct-send
path here, for different reasons.** Product Hunt's write API
(`createPost`, etc.) requires special approval from Product Hunt itself —
the free/default API tier is explicitly read-only, non-commercial (see
below) — so unlike LinkedIn/X/Meta/Reddit/Discord/Slack/Telegram/dev.to/
GitHub Discussions/TikTok/Instagram, there's no "just bring your own API
credentials" option to script against, though that approval process at
least exists. Hacker News has no write API to even
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

## Posting to Reddit, Product Hunt, Hacker News, Indie Hackers, dev.to, GitHub Discussions, Discord, Slack & Telegram

`community-post-generator` treats these nine differently from the
broadcast platforms above: instead of a fixed post template, it does a
live research pass — the target subreddit's actual rules, a sample of
what's currently working there, Product Hunt's own guidelines, HN's
guidelines and Show HN norms, Indie Hackers' group-specific posting
guidelines, dev.to's sitewide Code of Conduct plus its target tag's own
guidelines, or a GitHub repository's own Discussions category plus
GitHub's sitewide Community Guidelines — before drafting anything, and it
will tell you plainly (a "No-Go") when a community's rules would just get
the post removed,
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

**GitHub Discussions adds a gate none of the other eight need: whether the
surface exists at all.** Most repositories never turn Discussions on —
confirmed by testing against this very plugin's own repository, which
doesn't have it enabled — so that has to be checked before anything else,
not assumed the way a subreddit or a dev.to tag is simply always there.
For a public repository with Discussions enabled, research is fully on
the table, the same spectrum as Reddit; for a private one, it collapses
to asking you directly, same as Discord/Slack/a private Telegram target.
But the single biggest question here isn't public-vs-private, it's whose
repository it is: announcing your own project's own update in your own
repository's own Discussions is close to routine maintainer
communication, while posting about your product into someone else's
repository is governed by GitHub's sitewide Community Guidelines and is a
real self-promotion judgment call, closer in spirit to Reddit or Hacker
News than to anything "your own space" implies. One more layer Reddit and
dev.to don't have: some categories (commonly Announcement-style ones)
restrict who can even start a new discussion to the repository's own
maintainers, regardless of whether the repository itself is public.

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
  about, same as Discord/Slack. GitHub Discussions folds in yet another
  layer on top of its own public/private split: GitHub's sitewide
  Community Guidelines apply everywhere, but how heavily they bite depends
  on whose repository it is — light for your own, real judgment-call
  weight for someone else's. None of this is something the skill can
  audit against your actual account history or standing — double-check
  that yourself wherever a minimum or a pattern is at stake.
- **Don't batch-blast the same pitch across subreddits, groups, servers,
  workspaces, repositories, or forums.** Each community gets its own
  research pass (or, for Discord/Slack/a private Telegram target/a private
  repository, its own ask) and its own angle; reusing one pitch verbatim
  across several is against most communities' rules and a fast way to get
  an account banned.
- **API access to actually post varies a lot by platform, and Discord,
  Slack, Telegram, dev.to, and GitHub Discussions land in five different
  places, not one.** Reddit closed instant self-service app registration
  in late 2025 in favor of a manual approval queue (see "Posting directly
  to a platform" above) — you can still get `submit`-scope access, it
  just isn't instant. Product Hunt's write API requires Product Hunt's own
  special approval and isn't meant for individual developers at all.
  Hacker News's official API has **no write/submit endpoint whatsoever** —
  not gated, not approval-only, simply doesn't exist for anyone. Indie
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
  all; Telegram blocks where an already-created bot can post). **dev.to's
  access doesn't depend on the target at all** — an API key from your own
  account settings works under any tag your account can post to, no
  approval process found and no permission check tied to the specific
  destination, unlike Discord's or Telegram's. **GitHub Discussions ties
  dev.to on credential ease** (a Personal Access Token, no app review) but
  diverges on the same axis dev.to doesn't have to worry about: whether
  there's anywhere to send *to* — most repositories never enable
  Discussions, and some categories restrict who can start a new discussion
  regardless of the token's validity, a target-dependent gate dev.to's
  tags simply don't have. For Discord the hard part is research, not
  access; for Slack, both research and access can be real friction; for
  Telegram, research depends on public/private status and access has its
  own two-stage shape; for dev.to, access is close to frictionless but
  content moderation happens after the fact, separate from the API call
  itself; for GitHub Discussions, access is just as frictionless as
  dev.to's but whether the destination exists at all is a real, separate
  question; for the other three with no send path at all, it's the
  reverse of Discord entirely. Either way, the drafted post stands on its
  own — paste it in manually if you'd rather not set up API access.
- **A "Go" from this skill isn't a guarantee.** It's reading the same
  public rules a human would (or, for Discord/Slack/a private Telegram
  target/a private repository, taking your word for them); a subreddit
  can still remove a post for a reason its rules page doesn't spell out,
  AutoModerator can act on something the skill couldn't see (an exact
  karma threshold, a banned domain list), HN or Indie Hackers can flag a
  post for reasons tied to your account's history the skill simply can't
  see, a dev.to Tag Moderator can strip a tag over something this skill's
  research couldn't fully confirm (the Code of Conduct's self-promotion
  wording, in particular), a GitHub repository's owner can disable
  Discussions or change a category's permissions between research and
  send with no notice to this skill, and a Discord server's, Slack
  workspace's, or Telegram channel's/group's actual current rules might
  differ from what you remembered (or what a public preview showed) when
  asked.
- **No dedicated Reddit, Product Hunt, Hacker News, Indie Hackers, dev.to,
  GitHub Discussions, Discord, Slack, or Telegram connector exists to plug
  in here** (checked against Claude's connector directory as of this
  writing) — `community-post-generator` does its research with plain
  WebFetch/WebSearch against each site's own public pages (or, for
  Discord/Slack/a private Telegram target/a private repository, by asking
  you), not a purpose-built API client. If that changes, connecting one
  wouldn't need a code change here, just point the skill at it.

## Connecting a visual-generation tool

`visual-brief-generator` checks your currently connected tools for an
image/video-generation MCP connector at runtime — it doesn't assume a
specific one. As of this writing, none of Higgsfield, Runway, or
Midjourney has a known official MCP server, so there's nothing to
hardcode; a **Canva** connector does exist (requires connecting via OAuth
in your Claude settings) as one real option for visual asset work. If
none is connected, the skill still produces the full written brief and
prompts — just paste them into whatever tool you use.

## Repo layout

```
.claude-plugin/
  plugin.json         # plugin metadata
  marketplace.json     # lets this repo install itself via `marketplace add`
skills/                 # the 10 skills, one SKILL.md each
commands/
  marketing-setup.md    # the /marketing-skill:marketing-setup command
references/
  brand-voice.md         # shared config every skill reads (hand-edited)
state/
  content-calendar.md    # calendar/history index (generated + appended to, hand-editable)
  posts/                  # one file per queued post's full content, linked from the index above
scripts/
  publish_webhook.py     # stdlib-only webhook sender (see --help)
  publish_direct.py      # stdlib-only direct-to-platform scaffold (LinkedIn/X/Meta/Reddit/Discord/Slack/Telegram/dev.to/GitHub Discussions/TikTok/Instagram; YouTube deliberately excluded), needs your own API credentials (see --help)
```

## Contributors

- [marcosmodly](https://github.com/marcosmodly)
