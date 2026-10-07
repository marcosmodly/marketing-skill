# Cold outreach

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
