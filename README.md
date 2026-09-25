# marketing-skill

A Claude Code plugin that packages a marketing workflow as ten composable
skills: research a competitor, batch-plan a content calendar, repurpose
findings across channels (including SEO, paid ads, and email), brief out
a visual asset, research a specific subreddit's or Product Hunt's own
rules before drafting a post for it, and hand the finished content off to
your own automation — or, with real credentials you provide, straight to
a platform API — for publishing.

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
| `visual-brief-generator` | "visual brief," "video brief," "shot list," "image prompts for X" | A structured shot list, per-scene prompts, aspect ratios, and style guide; generates the actual asset only if a visual-gen tool is connected |
| `community-post-generator` | "post this to r/[subreddit]," "help me post on Product Hunt," "write a Reddit post for..." | Live-researches that specific subreddit's (or Product Hunt's) actual rules and typical post style first, gives a plain Go/No-Go, and only drafts a title+body if it's actually welcome there |
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
Page), or Reddit instead of going through your own automation —
`python3 scripts/publish_direct.py --help` lists what each platform
needs. **Read the script's module docstring before using it.** It was
written without a connected account or live credentials for any of these
platforms to test against, so it's best-effort against each platform's
last publicly documented API, not a verified integration — confirm the
endpoint is still current against that platform's own developer docs
(developers.linkedin.com, developer.x.com, developers.facebook.com, and
Reddit's own API docs), confirm you actually have write-access API scope
(X in particular gates this behind a paid tier, and Reddit closed
instant self-service app registration in late 2025 for a manual approval
queue — existing approved apps still work), and do one manual
`--confirmed` test post yourself before trusting it in anything
automated. It's text-only — no media attachments, and Instagram isn't
supported at all since it has no text-only post endpoint. Same
`--dry-run`/`--confirmed` safety pattern as the webhook script, including
credential redaction in `--dry-run` output. For Reddit, a successful
response doesn't guarantee the post survives that subreddit's
AutoModerator — see "Posting to Reddit & Product Hunt" below before
sending anything for real.

**Product Hunt has no direct-send path here, on purpose.** Its write API
(`createPost`, etc.) requires special approval from Product Hunt itself —
the free/default API tier is explicitly read-only, non-commercial (see
below) — so unlike the other four platforms, there's no "just bring your
own API credentials" option to script against. `community-post-generator`
still drafts the post text; you paste it into producthunt.com yourself.

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

## Posting to Reddit & Product Hunt

`community-post-generator` treats Reddit and Product Hunt differently
from the broadcast platforms above: instead of a fixed post template, it
does a live research pass — the target subreddit's actual rules, a
sample of what's currently working there, and Product Hunt's own
guidelines — before drafting anything, and it will tell you plainly (a
"No-Go") when a community's rules would just get the post removed,
rather than drafting something that reads fine but breaks a rule you
didn't know about.

A few things worth knowing going in:
- **Self-promotion is the #1 way this goes wrong.** Most active
  subreddits either ban it outright, cap it, or restrict it to a specific
  thread/day — the skill surfaces whichever applies before drafting, but
  it can't see your account's karma or age, so double-check those
  yourself if the subreddit sets a minimum.
- **Don't batch-blast the same pitch across subreddits.** Each community
  gets its own research pass and its own angle; reusing one pitch
  verbatim across several subreddits is against most subreddits' rules
  and a fast way to get an account banned.
- **API access to actually post isn't as simple as LinkedIn/X/Meta.**
  Reddit closed instant self-service app registration in late 2025 in
  favor of a manual approval queue (see "Posting directly to a platform"
  above) — you can still get `submit`-scope access, it just isn't
  instant. Product Hunt's write API requires Product Hunt's own special
  approval and isn't meant for individual developers at all. Either way,
  the drafted post stands on its own — paste it in manually if you'd
  rather not chase API access.
- **A "Go" from this skill isn't a guarantee.** It's reading the same
  public rules a human would; a subreddit can still remove a post for a
  reason its rules page doesn't spell out, or AutoModerator can act on
  something the skill couldn't see (an exact karma threshold, a banned
  domain list, etc.).
- **No dedicated Reddit or Product Hunt connector exists to plug in
  here** (checked against Claude's connector directory as of this
  writing) — `community-post-generator` does its research with plain
  WebFetch/WebSearch against each site's own public pages, not a
  purpose-built API client. If that changes, connecting one wouldn't
  need a code change here, just point the skill at it.

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
  publish_direct.py      # stdlib-only direct-to-platform scaffold (LinkedIn/X/Meta/Reddit), needs your own API credentials (see --help)
```

## Contributors

- [marcosmodly](https://github.com/marcosmodly)
