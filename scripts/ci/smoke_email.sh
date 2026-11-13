#!/usr/bin/env bash
# Checks scripts/email_check.py against the made-up drafts in
# scripts/ci/fixtures/emails: what it passes and what it fails is what
# email-outreach and email-sequence queue or rewrite, so it's pinned here.
set -euo pipefail
cd "$(dirname "$0")/../.."

c=scripts/email_check.py
f=scripts/ci/fixtures/emails
addr="Tidewater, 500 Harbor St, Suite 4, Portland, OR 97201"
expect() {
  local name=$1 pattern=$2
  grep -qF -- "$pattern" <<<"$out" || { echo "FAIL: $name (expected: $pattern)"; echo "$out"; exit 1; }
  echo "ok: $name"
}
refuse() {
  local name=$1 pattern=$2
  if grep -qF -- "$pattern" <<<"$out"; then echo "FAIL: $name (didn't expect: $pattern)"; echo "$out"; exit 1; fi
  echo "ok: $name"
}

out=$(python3 $c $f/good --address "$addr")
expect "good drafts pass" "3 checked, 0 to rewrite."
expect "length leaves out the sign-off, opt-out line, and address" "dana-kim-fernbank.md (first email): 64 words"
expect "a follow-up may carry Re:" "(follow-up, touch 2): 35 words, subject \"Re: sales-ops hiring at Fernbank\""
refuse "nothing to note on the good drafts" "note  "

out=$(python3 $c $f/good)
expect "says when no mailing address is configured" "no mailing address is configured in outreach-strategy.md"

out=$(python3 $c $f/bad --address "$addr") && { echo "FAIL: bad drafts exited 0"; exit 1; }
expect "bad drafts fail" "3 checked, 3 to rewrite."
expect "faked thread" "subject starts with Re:/Fwd: on a first email"
expect "leftover placeholder" "unfilled placeholder: {{company}}"
expect "too long" "179 words; a first email over 150 doesn't get read"
expect "filler opener" "opens with \"hope this finds you well\""
expect "spam wording" "spam-filter wording: \"Act now\""
expect "banned words from brand-voice.md" "banned in brand-voice.md: \"revolutionary\""
expect "too many links" "2 links; one at most"
expect "no opt-out line" "no opt-out line"
expect "missing mailing address" "the mailing address from outreach-strategy.md isn't in the email"
expect "same opener twice" "opens with the same sentence as 2026-11-10-a.md"
expect "one ask" "3 questions; one ask per email"

out=$(python3 $c --sequence $f/sequence-good.md)
expect "a good sequence passes" "2 checked, 0 to rewrite."

out=$(python3 $c --sequence $f/sequence-bad.md) && { echo "FAIL: bad sequence exited 0"; exit 1; }
expect "shouting subject" "subject shouts"
expect "preview repeats subject" "preview text repeats the subject"
expect "repeated subject" "same subject as Email 1"
expect "missing preview text" "no preview text"
expect "missing CTA" "no CTA"

out=$(python3 $c --json $f/good --address "$addr" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["checked"], d["failed"], d["emails"][0]["words"])')
expect "--json" "3 0 64"

# the examples in the skills and the guide have to pass their own checker
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
python3 - "$tmp" <<'PY'
import re, sys
out = sys.argv[1]
guide = open("references/cold-email.md", encoding="utf-8").read()
blocks = [b for b in re.findall(r"```\n(Subject: .*?)```", guide, re.S)]
assert len(blocks) == 2, f"expected 2 example emails in cold-email.md, found {len(blocks)}"
for i, b in enumerate(blocks, 1):
    touch = 2 if b.startswith("Subject: Re:") else 1
    head, _, body = b.partition("\n\n")
    open(f"{out}/guide-{i}.md", "w", encoding="utf-8").write(f"{head}\nTouch: {touch}\n\n{body}")
skill = open("skills/email-sequence/SKILL.md", encoding="utf-8").read()
open(f"{out}/sequence.md", "w", encoding="utf-8").write(re.search(r"```markdown\n(.*?)```", skill, re.S).group(1))
PY
out=$(python3 $c "$tmp/guide-1.md" "$tmp/guide-2.md" --address "$addr")
expect "cold-email.md's own examples pass" "2 checked, 0 to rewrite."
out=$(python3 $c --sequence "$tmp/sequence.md")
expect "email-sequence's own example passes" "3 checked, 0 to rewrite."

# outreach_queue.py: which queued emails may be sent, by the user's sending mode
qf=scripts/ci/fixtures/queue
now=2026-11-12T20:00:00+00:00
with_mode() { rm -rf "$tmp/q"; cp -r $qf "$tmp/q"; sed -i "s/MODE/$1/" "$tmp/q/references/outreach-strategy.md"; }

with_mode drafts
out=$(python3 scripts/outreach_queue.py --plugin-root "$tmp/q" --now $now)
expect "drafts mode sends nothing" "Send now (0):"
expect "drafts mode says why" "sending mode is drafts: runs never send"

with_mode approve
out=$(python3 scripts/outreach_queue.py --plugin-root "$tmp/q" --now $now)
expect "approve mode sends only the approved row" "Send now (1):"
expect "the approved row, with its draft id" "SEND  dana@fernbank.example  state/outreach/a.md  draft:r-1"
expect "an unapproved row waits" "wait  lee@quarry.example: not approved yet"

with_mode auto
out=$(python3 scripts/outreach_queue.py --plugin-root "$tmp/q" --now $now)
expect "auto mode sends up to the daily cap" "Send now (2):"
expect "the cap holds the next one" "wait  ana@mill.example: today's cap of 2 is reached"
expect "a later send time waits" "wait  kit@dune.example: send time hasn't come"
expect "a role address is never sent to" "wait  info@reef.example: a role address (info@)"
expect "a draft that fails the check is never sent" "wait  max@loch.example: fails email_check.py"
expect "a draft addressed to someone else is never sent" "not this row's address"
expect "a row with no address is never sent" "wait  linkedin.com/in/ray-cove: no real email address"

sed -i "s/^- Sending domain checked: yes/- Sending domain checked: no/" "$tmp/q/references/outreach-strategy.md"
out=$(python3 scripts/outreach_queue.py --plugin-root "$tmp/q" --now $now)
expect "auto mode needs the sending domain confirmed" "BLOCKED  the sending domain's SPF, DKIM, and DMARC aren't confirmed"
expect "and then sends nothing" "Send now (0):"

with_mode auto
sed -i "s/^- Mailing address: .*/- Mailing address: Not yet configured/" "$tmp/q/references/outreach-strategy.md"
out=$(python3 scripts/outreach_queue.py --plugin-root "$tmp/q" --now $now)
expect "no mailing address, no sending" "BLOCKED  no mailing address in outreach-strategy.md"

with_mode auto
sed -i "s/| Sent | A | | | sent:2026-11-10 |/| Bounced | A | | | sent:2026-11-10 |/; s/| Replied | B | | | sent:2026-11-10 |/| Bounced | B | | | sent:2026-11-10 |/" "$tmp/q/state/outreach-log.md"
out=$(python3 scripts/outreach_queue.py --plugin-root "$tmp/q" --now $now)
expect "auto mode pauses itself on bounces" "BLOCKED  paused: 2 bounced and 0 unsubscribed among the last 2 sends"
sed -i "s/^- Auto-send reviewed: none/- Auto-send reviewed: 2026-11-11/" "$tmp/q/references/outreach-strategy.md"
out=$(python3 scripts/outreach_queue.py --plugin-root "$tmp/q" --now $now)
expect "and resumes once the user has reviewed" "Send now (2):"

with_mode "send everything now"
out=$(python3 scripts/outreach_queue.py --plugin-root "$tmp/q" --now $now)
expect "an unknown mode is drafts" "Sending mode: drafts."

out=$(python3 scripts/outreach_queue.py)
expect "the shipped strategy file is drafts mode" "Sending mode: drafts."
