# Cold outreach

## How the emails are written, and checked

`email-outreach` writes each email the way
[`references/cold-email.md`](../references/cold-email.md) describes. The
short version:

- **The email's job is a reply**, not a sale. Four parts, a sentence or
  two each: why this person and why now (one thing from their own
  research), what that usually means, what you do about it, one ask.
- **Short.** 50 to 120 words for a first email, 30 to 80 for a
  follow-up, plain text, no bullets or bold.
- **One ask, reply-sized**: "Worth a look?" before "30 minutes
  Thursday?".
- **A subject like a colleague's**: two to five words, lowercase or
  sentence case, never a fake "Re:". The A/B pair differs in one thing so
  the reply rates mean something.
- **Follow-ups are replies in the same thread** that say one new thing,
  never "just checking in"; the last one says it's the last.
- **Only real proof.** A customer, number, or result appears only if
  it's in the Proof section of `references/outreach-strategy.md`. With
  none on file, the email explains how the product works and cites
  nobody.
- **Only real addresses.** It never guesses first.last@company.com. A
  prospect with no published address is still drafted, logged by
  LinkedIn or name + company, and reported as needing one.
- **Only the regions you chose.** The strategy's Regions section
  (default: United States) says whose prospects to email; anyone else is
  reported, not drafted.

Then every batch goes through `scripts/email_check.py` before it's
queued:

```
python3 scripts/email_check.py state/outreach/2026-11-13-*.md
```

```
PASS  state/outreach/2026-11-13-dana-kim-fernbank.md (first email): 64 words, subject "sales-ops hiring at Fernbank"
FAIL  state/outreach/2026-11-13-lee-park-quarry.md (first email): 163 words, subject "Quick question, Lee!"
  FAIL  exclamation mark in the subject
  FAIL  163 words; a first email over 150 doesn't get read (aim for under 120)
  FAIL  opens with "hope this finds you well": says nothing, and it's what the preview shows
  note  3 questions; one ask per email
```

It fails a draft that's too long, has a subject that shouts or fakes a
thread, opens with filler, has a leftover `[First Name]`, uses spam
wording or a word banned in `brand-voice.md`, carries more than one
link, has no opt-out line, is missing your mailing address, or opens
with the same sentence as another draft in the batch. A draft that fails
isn't marked `Ready for Approval`. You can run it on your own drafts
too, and `--sequence` checks an `email-sequence` document (subjects,
preview text, one CTA).

What it can't check is whether a hook is true; that's the research, and
you reading the draft before you send it. The limits are common
cold-email practice, not numbers this plugin has measured. Your own
reply rates are in `python3 scripts/results.py`.

Before the first real send, two things only you can do: put a real
mailing address in `references/outreach-strategy.md`, and confirm with
your email provider that SPF, DKIM, and DMARC pass on the sending domain.
The skill reminds you in every run until both are done.

## Who presses send: three modes

By default nothing is sent for you. You choose, on the `- Sending mode:`
line of `references/outreach-strategy.md` (or by telling `email-outreach`
in a conversation):

| Mode | What a run sends | Who reads each email first |
|---|---|---|
| `drafts` (default) | Nothing. You send each draft yourself | You |
| `approve` | The emails you approved by name, each at its send time | You |
| `auto` | Every email that passes the checks, at its send time | Nobody |

`approve` is the daily routine most people want: a scheduled run finds
prospects and drafts in the morning, you reply naming the ones to send,
and later runs send each when its time comes. `auto` takes you out of
the loop; the skill asks you to confirm it once, in plain words, and a
scheduled run can never switch it on.

In both sending modes, `scripts/outreach_queue.py` decides what goes, the
same way every time, and the skill sends only what it lists:

```
python3 scripts/outreach_queue.py
```

```
Sending mode: approve. Sent today: 0 of 10.

Send now (1):
  SEND  dana@fernbank.example  state/outreach/2026-11-12-dana-kim-fernbank.md  draft:r-1

Waiting (2):
  wait  lee@quarry.example: not approved yet
  wait  kit@dune.example: send time hasn't come
```

An email is sent only to a real address that isn't a role or personal
one, only if its draft passes `email_check.py` and carries your mailing
address, only once its send time has come, and never past the daily cap
(`- Daily send cap:`, default 10). `auto` also needs
`- Sending domain checked: yes`, and pauses itself when 2 of the last 20
sends bounced or 2 unsubscribed, until you've looked and set
`- Auto-send reviewed:` to that day's date.

Timing: there's no schedule-send tool, so an email goes out on the first
run after its send time. If you want sends close to their times, add a
second, light scheduled run during your send window with the prompt
"send due outreach". A scheduled run also needs Gmail connected and
permission to send without asking; if it has to ask and nobody's there,
nothing is sent.

Automatic sending is your decision and your risk: the emails go out
under your name, and the law on cold email depends on where the
recipient is (see "Opt-out and the law" in `references/cold-email.md`).

## Outreach log & suppression model

`email-outreach` batch-generates cold emails and queues them in
`state/outreach-log.md` — a plain Markdown table that's both the daily
queue and the permanent contact history (rows accumulate; nothing gets
cleared out). It's safe to hand-edit directly, including to log an
unsubscribe request that arrived outside email. Same separation as the
content calendar: each row's Notes column points at the file under
`state/outreach/` that holds that email's full content, and Status can
only reach `Approved` immediately after a human sees the real email in a
live conversation and names it — never in a scheduled run. Whether a run
then sends anything is the sending mode above; in the default `drafts`
mode it never calls Gmail's `send_message`. A handful of
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
`Recommended Send Time` computed from each prospect's own region — in
`drafts` mode you send at that time yourself (or with Gmail's own
scheduled-send feature); in `approve` and `auto` it's when a run may
send it. Same numbered-approval
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

Either way, by default `email-outreach` only creates drafts or queues
content. It sends (Gmail's `send_message`) only in the `approve` or
`auto` mode you chose (see "Who presses send"). It never has a
scheduled-send tool to call: the per-prospect "Recommended Send Time" it
computes (from the prospect's own region, inside your configured
send-time window) is there for you to act on manually, or by pointing
Gmail's own scheduled-send feature at that time yourself.
