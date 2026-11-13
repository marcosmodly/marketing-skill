# Writing a cold email

How `email-outreach` writes each email, and what
`scripts/email_check.py` then measures. The log, the suppression list,
and the approval rules are in the skill and in `state/outreach-log.md`;
this file is only about the words.

The limits here are common cold-email practice, not numbers this plugin
has measured. What it does measure is your own log:
`python3 scripts/results.py` gives the reply, bounce, and unsubscribe
rates and says whether subject line A or B gets more replies. When your
numbers disagree with this file, your numbers win.

## What the first email is for

One thing: a reply. Not a sale, not a demo, not a click. The reader
doesn't know the sender and owes them nothing, and decides in about two
lines whether this was written to them or at them. So the email is short
enough to read on a phone without scrolling, about the reader until the
last third, and ends on one question that takes a line to answer.

## The four parts

Write them in this order, one or two sentences each:

1. **Why them, why now.** The one thing found in this prospect's
   research (see "The hook" below), stated as a plain observation. No
   compliment, no "I noticed that" wind-up.
2. **What that usually means.** The problem the observation points to,
   in the words someone in their job would use. This is where the
   strategy's angle for their segment goes. Say it as something that
   tends to happen ("teams that grow that fast usually find..."), never
   as a claim about their company you can't know.
3. **What you do about it.** One sentence on the product as a result for
   them, then one piece of proof if a real one exists (next section).
   Not a feature list.
4. **One ask.** A single question, easy to answer (see "The ask").

Then the sign-off (a first name is enough; the full name on the first
email), the opt-out line, and the mailing address.

```
Subject: sales-ops hiring at Fernbank

Dana, Fernbank's careers page lists three sales-ops roles this month.

Most teams that grow that fast find reporting doesn't keep up: every
weekly export is still five clicks and a spreadsheet, now for twice the
reps.

Tidewater exports any report in one click, on a schedule if you want.
Nothing to rebuild when the team changes.

Worth a look before the new hires start?

Sam Okafor
Tidewater

If this isn't relevant, say so and I won't write again.
Tidewater, 500 Harbor St, Suite 4, Portland, OR 97201
```

64 words before the sign-off. Fictional, like every example here.

## Length

| | Aim for | `email_check.py` fails it over |
|---|---|---|
| First email | 50 to 120 words | 150 |
| Follow-up | 30 to 80 words | 110 |

Counted without the sign-off, the opt-out line, and the address. Short
paragraphs, one to three sentences each, a blank line between them. No
bullets, no bold, no headings: it's a note, not a brochure.

## The hook

The hook is the reason this email goes to this person. In order of
strength:

1. **Something that just happened**, with a date: a funding round, a
   launch, a new office, a job posting, a new role for them.
2. **Something they said or wrote**: a talk, a podcast, a post, a line in
   an interview.
3. **Something true of their role at this company**: what their team
   owns, the tools their job ads name, how their pricing page works.
4. **Something true of the whole segment** ("as a RevOps lead at a
   growing SaaS company..."). This alone is not a hook. If it's all the
   research found, say so in the run's report instead of dressing it up.

Two tests, both required:

- **The swap test.** Could the opening line go to someone at another
  company unchanged? Then it isn't personal yet.
- **The "so what" test.** Does the hook lead to the problem in part 2?
  "Congrats on the Series B" passes the swap test and fails this one: it's
  about them and has nothing to do with why you're writing. A hook that's
  only flattery reads as a mail merge with one extra field.

Keep it to what's public and professional. Nothing about their family,
their health, where they live, or what they posted on a personal account.
And only what the research actually found: a hook built on a guess ("you
must be drowning in exports") is an invented fact about a stranger.

## Proof

One piece, and only if it's real and the user gave it: a named customer
they may name, a number with where it's from, a result someone can check.
The strategy file's Proof section lists what may be used. If that section
is empty, don't write "teams like yours see 40% faster reporting" or
"companies such as..."; describe how the product works instead. A
mechanism is believable on its own, and an invented customer is a lie
with the user's name under it.

## The ask

One question. A reply-sized one gets more answers than a calendar-sized
one:

| Instead of | Try |
|---|---|
| "Do you have 30 minutes Thursday?" | "Worth a look?" |
| "Can I send you a calendar link?" | "Want me to send the two-minute version?" |
| "Who's the right person to talk to?" as a second ask | Ask it alone, in a follow-up |
| "Let me know your thoughts" | "Is this something you handle by hand today?" |

Use the strategy file's Offer & Primary CTA; if it names a meeting, ask
whether they're open to one before proposing a time. No calendar link in
the first email.

## Subject lines

- Two to five words, under 40 characters, lowercase or sentence case.
  It should look like the subject of an email from someone in their own
  company.
- About them or the topic: "sales-ops hiring at Fernbank", "Quarry's Q3
  board deck", "exports for new reps".
- Never a fake "Re:" or "Fwd:", their first name as a gimmick, a
  question designed to be opened rather than answered ("Quick
  question?"), capitals, or an exclamation mark.
- It has to be true of the email under it. A misleading subject is also
  what the US CAN-SPAM Act prohibits.
- **A/B variants differ in one thing**, so a difference in replies means
  something: A names the topic ("sales-ops hiring at Fernbank"), B names
  the outcome ("reports for twice the reps"). Two subjects that differ in
  everything teach nothing. Keep the same pair of styles for the whole
  batch and until `results.py` can call it (30 sends a side).

## The first line

The inbox shows the subject and then the start of the body, so the first
line is the preview. It should be the hook. These openers say nothing and
`email_check.py` fails them: "I hope this email finds you well", "My name
is...", "I'm reaching out because", "I wanted to introduce", "Quick
question", "I know you're busy".

Open on them ("Dana, Fernbank's careers page...") rather than on the
sender ("I saw that..."). Count the "I/we/our" against the "you/your":
if the sender wins two to one, the email is about the sender.

## Follow-ups

Plenty of people answer the second email and not the first, so the
follow-up gets the same care. Rules:

- **Reply in the same thread**: the subject is "Re: " plus the original,
  with no new A/B variant. The reader can see the first email under it.
- **Shorter** than the first: 30 to 80 words.
- **One new thing each time**: a second angle on the problem, a piece of
  real proof, a narrower question, a different person to ask about. Never
  a summary of the last email.
- **Never** "just checking in", "bumping this", "circling back", "did you
  see my last email", or any line that makes not replying their fault.
- **The last one closes the loop**: say it's the last, leave the door
  open, no guilt. "I'll leave it here. If exports become a problem with
  the new team, I'm at this address."
- A follow-up still carries the opt-out line and the address.
- Stop at the number of touches in the strategy's Follow-Up Cadence. The
  default is one follow-up. Every extra email to someone who hasn't
  answered is another chance at a spam complaint, so add touches on
  purpose, not by default.

```
Subject: Re: sales-ops hiring at Fernbank

Dana, one more thing that may matter with new hires: exports can be
limited by role, so a new rep sees their own pipeline and nothing else.

Is that something you handle by hand today?

Sam

If it's not, say so and I'll leave it here.
Tidewater, 500 Harbor St, Suite 4, Portland, OR 97201
```

## Getting delivered

An email that lands in spam was never written. What decides it, most
important first:

1. **The sending domain is set up.** SPF, DKIM, and DMARC records on the
   domain the email comes from. Gmail and Yahoo require SPF or DKIM from
   every sender, and all three plus one-click unsubscribe from anyone
   sending 5,000 a day to their users. The user's email provider has a
   page that says whether these pass; `email-outreach` asks at setup and
   can't check it for them.
2. **Real addresses.** A guessed address (first.last@company.com) that
   bounces costs more than an email not sent. Only draft to an address
   that was published, verified by a tool, or given by the user; anything
   else is logged without an address and found before sending. Keep
   bounces under about 2% of sends.
3. **Low complaints.** Google's sender guidelines say to stay under a
   0.1% spam-complaint rate and never reach 0.3%. Relevance and an easy
   opt-out are what keep it there: someone who can reply "not for me"
   doesn't press "Report spam".
4. **Volume that grows slowly.** A new mailbox starts at a handful a day
   (the strategy file's warm-up ramp). Many teams send cold email from a
   separate domain so a mistake doesn't hurt the mail their customers
   get.
5. **Plain text.** No images, no HTML template, no attachment, no
   tracking pixel. Open tracking is unreliable anyway since mail apps
   started loading images themselves, which is why the log counts
   replies. No link in the first email if it can be avoided, one at
   most, and never a link shortener.
6. **The words**, last and least: no "act now", "limited time", "click
   here", "guarantee", money symbols in a row, capitals, or more than one
   exclamation mark.

## Opt-out and the law

Not legal advice; the user decides what applies to them and their
prospects. What the skill does by default:

- **Every email, first or follow-up, has a way out** in plain words ("If
  this isn't relevant, say so and I won't write again") and the sender's
  real mailing address. A reply asking to stop is honored on the next
  inbox sync and for good.
- **United States (CAN-SPAM):** cold B2B email is allowed without prior
  consent if the From and subject are truthful, the mailing address is
  there, and opt-outs are honored within 10 business days.
- **Canada (CASL):** needs consent. Implied consent can cover an address
  the person published themselves without a "no solicitation" note, when
  the email is about their role. Note where the address was found.
- **EU and UK (GDPR, ePrivacy, PECR):** rules differ by country. Some
  allow email to a named person at a company on a legitimate-interest
  basis with an opt-out (the UK treats corporate addresses this way);
  others, Germany among them, expect consent first. Personal addresses
  (gmail.com and the like) need consent almost everywhere.

So: the strategy file's Regions section says which regions the user has
decided to email. A prospect outside it is reported and not drafted, the
same as a duplicate. And never a role address (info@, sales@, support@)
or a personal address for a business pitch.

## Before it's queued

Run `python3 scripts/email_check.py state/outreach/<today's files>` and
rewrite whatever it fails. It checks length, the subject, filler openers,
leftover placeholders, spam wording, banned words from `brand-voice.md`,
links, the opt-out line, the mailing address, and whether two emails in
the batch open with the same sentence. It can't tell whether the hook is
true or the proof is real. That's still on the research.
