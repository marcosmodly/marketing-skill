#!/usr/bin/env python3
"""
Checks drafted emails before anyone is asked to approve them: the things a
cold email gets wrong that a person skims past (too long, a filler opener, a
subject that reads like an ad, two asks, a leftover [First Name], no way to
opt out), measured instead of eyeballed.

  python3 scripts/email_check.py state/outreach/2026-11-13-dana-kim-fernbank.md
  python3 scripts/email_check.py state/outreach/          every draft in a folder
  python3 scripts/email_check.py --sequence welcome.md    an email-sequence document
  python3 scripts/email_check.py --json ...               the same, for a skill to read

A cold draft is a file that starts with header lines, a blank line, then
the email as it would be sent:

  To: dana@fernbank.example
  Subject: sales-ops hiring at Fernbank
  Variant: A
  Touch: 1

  Dana, Fernbank's careers page lists three sales-ops roles...

`Touch: 2` (or more) marks a follow-up, which gets a shorter length limit
and may carry "Re:". Several drafts are also compared with each other: two
emails that open with the same sentence aren't personalized.

It reads the banned words from references/brand-voice.md and the mailing
address from references/outreach-strategy.md (--plugin-root to look
elsewhere, --address to give one). A FAIL is something to rewrite before
the draft is queued; a note is a judgment call. Exits 1 if anything fails.

The limits are common cold-email practice (references/cold-email.md), not
numbers this plugin has measured. Standard library only; reads local
files, never the network.
"""
import argparse
import json
import os
import re
import sys

PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# first touch / follow-up: (note over, fail over), in words, not counting the
# sign-off, the opt-out line, and the mailing address
LENGTH = {"first": (120, 150), "follow": (80, 110)}
SHORT = 25
SUBJECT_NOTE, SUBJECT_FAIL, SUBJECT_WORDS = 40, 60, 6
PREVIEW = (35, 110)

FILLER = [
    (r"hope (this|you|all)[^.?!]{0,40}(finds? you|(is|are) (well|doing))", "\"hope this finds you well\""),
    (r"\bmy name is\b", "\"my name is\" (the From line says it)"),
    (r"\bi(?:'m| am) (?:just )?(?:reaching out|writing to|contacting you)\b", "\"I'm reaching out\""),
    (r"\b(?:i|we) (?:just )?wanted to (?:reach out|introduce|connect|touch base|follow up|check in)\b", "\"I wanted to reach out\""),
    (r"\bjust (?:checking in|following up|bumping|circling back|floating this)\b", "\"just checking in\""),
    (r"\b(?:circling|circle) back\b", "\"circling back\""),
    (r"\btouch(?:ing)? base\b", "\"touching base\""),
    (r"\bbump(?:ing)? this\b", "\"bumping this\""),
    (r"\bdid you (?:get|see|have a chance to (?:read|see|look at)) my\b", "\"did you see my email\""),
    (r"\bfollowing up on my (?:last|previous|earlier) (?:email|note|message)\b", "\"following up on my last email\""),
    (r"\bi know you(?:'re| are) (?:very |super |really )?busy\b", "\"I know you're busy\""),
    (r"\bquick question\b", "\"quick question\""),
]
SPAM = [
    r"\bact now\b", r"\blimited[- ]time\b", r"\bclick here\b", r"\bguarantee[ds]?\b", r"\brisk[- ]free\b",
    r"\b100% (?:free|guaranteed)\b", r"\bno obligation\b", r"\bonce in a lifetime\b", r"\bdouble your\b",
    r"\bbuy now\b", r"\bspecial (?:offer|promotion)\b", r"\bexclusive deal\b", r"\$\$+", r"\bcash bonus\b",
    r"\bcongratulations,? you\b", r"\bwinner\b", r"\burgent\b",
]
PLACEHOLDER = [
    r"\{\{[^}]*\}\}", r"\{[A-Za-z_ ]{2,30}\}", r"<(?:first ?name|name|company|title|role|address)[^>]*>",
    r"\[(?:first ?name|last ?name|name|company|company name|title|role|prospect|hook|link|address|"
    r"mailing address|your name|sender|city|x|n)\]", r"\bTODO\b", r"\bTBD\b", r"\bXX+\b", r"\blorem ipsum\b",
]
OPT_OUT = re.compile(
    r"unsubscribe|opt[- ]?out|(?:won'?t|will not|don'?t|do not|not) (?:email|write|contact|reach out|hear from|bother|follow up)"
    r"|stop (?:emailing|writing|these)|take you off|remove you|leave (?:you alone|it (?:here|there))|"
    r"(?:not|isn'?t|aren'?t) (?:relevant|the right|a fit|interested)[^.?!]{0,60}(?:say|tell|reply|let me know|word)", re.I)
URL = re.compile(r"https?://\S+|\bwww\.\S+|\b[\w-]+\.(?:com|io|co|net|org|app|ai|dev)/\S*", re.I)
SELF = re.compile(r"\b(?:i|i'm|i've|i'd|we|we're|we've|our|my|us)\b", re.I)
THEM = re.compile(r"\b(?:you|your|you're|you've|yours)\b", re.I)


def read(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read()
    except OSError:
        return ""


def words(text):
    return re.findall(r"[A-Za-z0-9][A-Za-z0-9'’%$.,/-]*", text)


def sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.?!])\s+|\n\s*\n", text) if s.strip()]


def squash(text):
    return re.sub(r"[^a-z0-9]", "", text.lower())


def banned_words(root):
    text = read(os.path.join(root, "references", "brand-voice.md"))
    block = re.search(r"^## Banned Words & Phrases\s*$(.*?)(?=^## |\Z)", text, re.M | re.S)
    if not block:
        return []
    return [m.group(1).strip() for m in re.finditer(r'^\s*-\s*["“]?(.+?)["”]?\s*$', block.group(1), re.M) if m.group(1).strip()]


def strategy_address(root):
    """The mailing address in outreach-strategy.md, '' if it isn't set, None if there's no such line."""
    text = read(os.path.join(root, "references", "outreach-strategy.md"))
    m = re.search(r"^\s*-\s*\**Mailing address:?\**:?\s*(.+)$", text, re.M | re.I)
    if not m:
        return None
    value = m.group(1).strip()
    return "" if re.match(r"not yet configured|none|tbd|\(", value, re.I) else value


def parse_draft(text):
    """Header lines (To, Subject, Variant, Touch...), then the body. Also reads **Subject:** style."""
    lines = text.replace("\r\n", "\n").split("\n")
    while lines and (not lines[0].strip() or lines[0].lstrip().startswith(("#", "<!--", "---"))):
        lines.pop(0)
    head = {}
    i = 0
    while i < len(lines):
        m = re.match(r"^\s*\**([A-Za-z][A-Za-z -]{1,24}?)\**\s*:\**\s*(.*)$", lines[i])
        if not m or not lines[i].strip():
            break
        head[m.group(1).strip().lower()] = m.group(2).strip().strip("*").strip()
        i += 1
    body = "\n".join(lines[i:]).strip()
    body = re.sub(r"^\**body:?\**:?\s*", "", body, flags=re.I)
    return head, body


def pitch(body, address):
    """The body without the sign-off, the opt-out line, and the address: what the length limit is about."""
    paras = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    kept = []
    addr = squash(address or "")
    for n, p in enumerate(paras):
        late = n >= max(1, len(paras) - 4)
        if addr and addr[:18] and addr[:18] in squash(p):
            continue
        if late and OPT_OUT.search(p) and len(words(p)) <= 40:
            continue
        if late and n > 0 and not re.search(r"[?.!:]\s*$", p) and all(len(words(line)) <= 5 for line in p.split("\n")):
            continue  # a name, a title, a company: the signature
        kept.append(p)
    return "\n\n".join(kept)


def check_cold(path, text, banned, address):
    head, body = parse_draft(text)
    fails, notes = [], []
    subject = head.get("subject", "")
    try:
        touch = int(re.sub(r"\D", "", head.get("touch", "1")) or 1)
    except ValueError:
        touch = 1
    kind = "first" if touch <= 1 else "follow"
    if not body:
        return {"file": path, "touch": touch, "subject": subject, "words": 0, "fails": ["no email body found"], "notes": []}

    # subject
    if not subject:
        fails.append("no Subject line")
    else:
        bare = re.sub(r"^(?:re|fwd?):\s*", "", subject, flags=re.I)
        if kind == "first" and bare != subject:
            fails.append("subject starts with Re:/Fwd: on a first email: a faked thread")
        if len(bare) > SUBJECT_FAIL:
            fails.append(f"subject is {len(bare)} characters; phones cut it near {SUBJECT_NOTE}")
        elif len(bare) > SUBJECT_NOTE or len(bare.split()) > SUBJECT_WORDS:
            notes.append(f"subject is {len(bare)} characters, {len(bare.split())} words; two to five words reads like a colleague wrote it")
        if "!" in bare:
            fails.append("exclamation mark in the subject")
        if re.search(r"\b[A-Z]{4,}\b", bare) and bare.upper() == bare:
            fails.append("subject is in capitals")
        if len(bare.split()) > 1 and bare == bare.title() and re.search(r"[a-z]", bare):
            notes.append("subject is in Title Case, like a newsletter; sentence case or lowercase reads like a person")
        for pat in SPAM:
            if re.search(pat, bare, re.I):
                fails.append(f"subject has spam-filter wording: \"{re.search(pat, bare, re.I).group(0)}\"")

    # leftovers and formatting
    whole = subject + "\n" + body
    for pat in PLACEHOLDER:
        m = re.search(pat, whole, re.I)
        if m:
            fails.append(f"unfilled placeholder: {m.group(0)}")
            break
    if re.search(r"<(?:img|table|div|span|a |br|p)\b|!\[[^\]]*\]\(", body, re.I):
        fails.append("HTML or an image in the body; a cold email is plain text")
    if re.search(r"\*\*[^*]+\*\*|^#{1,6} ", body, re.M):
        notes.append("Markdown formatting (bold or a heading) won't render in a plain email")
    if len(re.findall(r"^\s*(?:[-*•]|\d+[.)])\s+", body, re.M)) >= 3:
        notes.append("a bulleted list reads like a brochure; say it in a sentence")
    if "—" in body or "—" in subject:
        notes.append("em dash: reads as machine-written to many people; use a comma or a period")

    core = pitch(body, address)
    n = len(words(core))
    note_over, fail_over = LENGTH[kind]
    label = "first email" if kind == "first" else "follow-up"
    if n > fail_over:
        fails.append(f"{n} words; a {label} over {fail_over} doesn't get read (aim for under {note_over})")
    elif n > note_over:
        notes.append(f"{n} words; aim for under {note_over} in a {label}")
    elif n < SHORT and kind == "first":
        notes.append(f"{n} words; is the reason it's this person, and the ask, both in there?")

    opening = " ".join(sentences(core)[:2])
    for pat, name in FILLER:
        if re.search(pat, core, re.I):
            where = "opens with" if re.search(pat, opening, re.I) else "has"
            fails.append(f"{where} {name}: says nothing, and it's what the preview shows" if where == "opens with"
                         else f"{where} {name}: filler; say the new thing instead")
    first = re.sub(r"^(?:hi|hey|hello|dear)\b[^,\n]*,?\s*", "", core.strip(), flags=re.I)
    if re.match(r"(?:i|we|my|our)\b", first, re.I):
        notes.append("opens about the sender (\"I\"/\"We\"); open on them")

    for pat in SPAM:
        m = re.search(pat, body, re.I)
        if m:
            fails.append(f"spam-filter wording: \"{m.group(0)}\"")
    if re.search(r"\bfree\b", body, re.I):
        notes.append("\"free\" is a word spam filters weigh; fine if it's simply true, otherwise reword")
    if body.count("!") > 1:
        fails.append(f"{body.count('!')} exclamation marks")
    shout = [w for w in re.findall(r"\b[A-Z]{5,}\b", body)]
    if len(shout) >= 2:
        notes.append("words in capitals: " + ", ".join(sorted(set(shout))[:4]))
    for w in banned:
        if re.search(r"(?<!\w)" + re.escape(w) + r"(?!\w)", whole, re.I):
            fails.append(f"banned in brand-voice.md: \"{w}\"")

    links = URL.findall(body)
    if len(links) > 1:
        fails.append(f"{len(links)} links; one at most, and none is better in a first email")
    elif links and kind == "first":
        notes.append("a link in a first email costs deliverability; offer to send it instead")
    if re.search(r"\b(?:attached|attachment|see the attached)\b", body, re.I):
        notes.append("mentions an attachment; attachments from a stranger get filtered")

    asks = core.count("?")
    if asks == 0:
        notes.append("no question; end on one ask they can answer in a line")
    elif asks > 2:
        notes.append(f"{asks} questions; one ask per email")
    me, you = len(SELF.findall(core)), len(THEM.findall(core))
    if me > 2 * max(you, 1) and me >= 4:
        notes.append(f"{me} of I/we/our to {you} of you/your; it's about the sender")
    for p in re.split(r"\n\s*\n", core):
        if len(words(p)) > 60:
            notes.append(f"a {len(words(p))}-word paragraph; break it up, phones show three lines at a time")
            break
    lengths = [len(words(s)) for s in sentences(core)]
    if lengths and max(lengths) > 32:
        notes.append(f"a {max(lengths)}-word sentence; split it")

    if not OPT_OUT.search(body):
        fails.append("no opt-out line (a plain sentence is enough: \"if this isn't relevant, say so and I won't write again\")")
    if address:
        if squash(address)[:18] not in squash(body):
            fails.append("the mailing address from outreach-strategy.md isn't in the email")
    elif address == "":
        notes.append("no mailing address is configured in outreach-strategy.md; it's required before this is sent")

    return {"file": path, "touch": touch, "subject": subject, "words": n, "fails": fails, "notes": notes,
            "_opener": squash(sentences(first)[0]) if sentences(first) else ""}


def check_batch(results):
    """Across the first emails of one run: the same opening sentence twice isn't personalization."""
    seen = {}
    for r in results:
        key = r.get("_opener", "")
        if r["touch"] > 1 or len(key) < 25:
            continue
        if key in seen:
            r["fails"].append(f"opens with the same sentence as {os.path.basename(seen[key])}: it would send unchanged to anyone")
        else:
            seen[key] = r["file"]


def check_sequence(path, text, banned):
    """An email-sequence document: one '### Email N' section per email with **Subject:** style fields."""
    results = []
    parts = re.split(r"^#{2,4}\s*(Email\s+\d+[^\n]*)$", text, flags=re.M)
    subjects, ctas = {}, set()
    for k in range(1, len(parts), 2):
        title, block = parts[k].strip(), parts[k + 1]
        field = lambda name: (re.search(r"^\s*[-*]*\s*\**%s\**\s*:\**\s*(.+?)\s*$" % name, block, re.M | re.I) or [None, ""])[1].strip("* ")  # noqa: E731
        subject, alt, preview, cta = field("Subject(?: line)?"), field("Alt(?:ernate)? subject(?: line)?"), field("Preview(?: text)?"), field("CTA")
        body_m = re.search(r"\*\*Body:?\*\*:?\s*(.*?)(?=^\s*[-*]*\s*\*\*CTA|\Z)", block, re.M | re.S | re.I)
        body = body_m.group(1).strip() if body_m else ""
        fails, notes = [], []
        if not subject:
            fails.append("no subject line")
        for name, s in (("subject", subject), ("alternate subject", alt)):
            if not s:
                continue
            if len(s) > SUBJECT_FAIL:
                fails.append(f"{name} is {len(s)} characters; inboxes cut it near {SUBJECT_NOTE} on a phone")
            elif len(s) > SUBJECT_NOTE:
                notes.append(f"{name} is {len(s)} characters; the end is cut off on a phone")
            if s.count("!") or (re.search(r"[a-z]", s) is None and len(s) > 4):
                fails.append(f"{name} shouts (capitals or an exclamation mark)")
            for pat in SPAM:
                if re.search(pat, s, re.I):
                    fails.append(f"{name} has spam-filter wording: \"{re.search(pat, s, re.I).group(0)}\"")
        if not alt:
            notes.append("no alternate subject line to test against")
        elif squash(alt) == squash(subject):
            fails.append("the alternate subject is the same as the subject")
        if subject:
            key = squash(subject)
            if key in subjects:
                fails.append(f"same subject as {subjects[key]}")
            subjects[key] = title
        if not preview:
            fails.append("no preview text; the inbox shows the first line of the body instead")
        else:
            if not PREVIEW[0] <= len(preview) <= PREVIEW[1]:
                notes.append(f"preview text is {len(preview)} characters; {PREVIEW[0]} to {PREVIEW[1]} shows in full")
            if subject and (squash(preview) == squash(subject) or squash(subject) in squash(preview)):
                fails.append("preview text repeats the subject; it should add to it")
        if not cta:
            fails.append("no CTA")
        else:
            ctas.add(re.sub(r"[^a-z0-9 ]", "", cta.lower()).strip())
        if not body:
            fails.append("no body")
        whole = "\n".join((subject, alt, preview, body, cta))
        for pat in PLACEHOLDER:
            m = re.search(pat, whole, re.I)
            if m and not re.search(r"\.\.\.", m.group(0)):
                notes.append(f"placeholder left in: {m.group(0)} (fine if it's your email tool's merge field)")
                break
        for w in banned:
            if re.search(r"(?<!\w)" + re.escape(w) + r"(?!\w)", whole, re.I):
                fails.append(f"banned in brand-voice.md: \"{w}\"")
        for pat in SPAM:
            m = re.search(pat, body, re.I)
            if m:
                notes.append(f"spam-filter wording: \"{m.group(0)}\"")
        n = len(words(body))
        if n > 250:
            notes.append(f"{n} words; most of it won't be read, cut to the one job this email has")
        results.append({"file": f"{path}: {title}", "touch": 0, "subject": subject, "words": n, "fails": fails, "notes": notes})
    if not results:
        results.append({"file": path, "touch": 0, "subject": "", "words": 0,
                        "fails": ["no '### Email 1' sections found"], "notes": []})
    elif len(ctas) > 1:
        results[0]["notes"].append(f"{len(ctas)} different CTAs across the sequence; one, unless that's deliberate")
    return results


def collect(paths):
    files = []
    for p in paths:
        if os.path.isdir(p):
            files += sorted(os.path.join(p, f) for f in os.listdir(p) if f.endswith((".md", ".txt", ".eml")) and f.lower() != "readme.md")
        else:
            files.append(p)
    return files


def main():
    parser = argparse.ArgumentParser(description="Check drafted emails before they're queued for approval.")
    parser.add_argument("paths", nargs="+", help="Draft files, or a folder of them.")
    parser.add_argument("--sequence", action="store_true", help="The files are email-sequence documents (### Email 1, ...).")
    parser.add_argument("--address", help="The sender's mailing address every cold email must carry (default: outreach-strategy.md).")
    parser.add_argument("--plugin-root", default=PLUGIN_ROOT, help="Where references/brand-voice.md lives.")
    parser.add_argument("--json", action="store_true", help="Print the result as JSON.")
    args = parser.parse_args()

    banned = banned_words(args.plugin_root)
    address = args.address if args.address is not None else strategy_address(args.plugin_root)
    results = []
    for path in collect(args.paths):
        text = read(path)
        if not text.strip():
            results.append({"file": path, "touch": 0, "subject": "", "words": 0, "fails": ["empty, or can't be read"], "notes": []})
        elif args.sequence:
            results += check_sequence(path, text, banned)
        else:
            results.append(check_cold(path, text, banned, address))
    if not args.sequence:
        check_batch(results)
    for r in results:
        r.pop("_opener", None)
    failed = sum(1 for r in results if r["fails"])

    if args.json:
        print(json.dumps({"checked": len(results), "failed": failed, "emails": results}, indent=2))
    else:
        for r in results:
            what = "" if args.sequence else (" (first email)" if r["touch"] <= 1 else f" (follow-up, touch {r['touch']})")
            print(f"{'FAIL' if r['fails'] else 'PASS'}  {r['file']}{what}: {r['words']} words, subject \"{r['subject']}\"")
            for f in r["fails"]:
                print(f"  FAIL  {f}")
            for n in r["notes"]:
                print(f"  note  {n}")
        print(f"\n{len(results)} checked, {failed} to rewrite." if results else "Nothing to check.")
    sys.exit(1 if failed or not results else 0)


if __name__ == "__main__":
    main()
