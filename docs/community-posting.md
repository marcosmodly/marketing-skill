# Community posts

## Posting to Reddit, Product Hunt, Hacker News, Indie Hackers, dev.to, Discord, Slack & Telegram

`community-post-generator` treats these eight differently from the
broadcast platforms in [Publishing](publishing.md): instead of a fixed post template, it does a
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
  in [Publishing](publishing.md)) — you can still get `submit`-scope access, it just isn't
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
