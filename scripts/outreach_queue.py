#!/usr/bin/env python3
"""
Which queued cold emails may be sent right now, and why the others may not.

email-outreach never decides this by itself. The user picks a sending mode in
references/outreach-strategy.md, and this script applies it to the outreach
log the same way every time:

  drafts    nothing is ever sent by a run (the default)
  approve   only rows a person marked Approved are sent, once their
            recommended send time has come
  auto      rows that are Ready for Approval are sent without anyone reading
            them, once their send time has come

In both sending modes a row is sent only if all of these hold: it has a real
address (not a role or free-mail one), nobody with that address is
suppressed, its draft file exists, is addressed to the same person, and
passes email_check.py with no fails, a mailing address is configured, and
today's sends are under the daily cap. Auto mode also needs the sending
domain confirmed, and stops by itself when recent sends bounce or
unsubscribe too often, until the user reviews it.

  python3 scripts/outreach_queue.py              what may be sent now
  python3 scripts/outreach_queue.py --json       the same, for the skill to read
  python3 scripts/outreach_queue.py --now 2026-11-16T15:00:00+00:00

It reads local files and sends nothing. The skill sends exactly the rows
listed under "Send now", and no others. Standard library only.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import email_check  # noqa: E402

PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODES = ("drafts", "approve", "auto")
DEFAULT_CAP = 10
MAX_CAP = 50               # a typo like 500 doesn't become 500 unread emails
WINDOW = 20                # the most recent sends auto mode watches
MAX_BOUNCES, MAX_UNSUBS = 2, 2
SUPPRESSED = {"replied", "bounced", "unsubscribed", "do-not-contact"}
CONTACTED = SUPPRESSED | {"sent"}
ROLE = {"info", "sales", "support", "hello", "contact", "admin", "office", "team", "help", "marketing",
        "billing", "careers", "jobs", "press", "hr", "noreply", "no-reply", "enquiries", "inquiries"}
FREEMAIL = {"gmail.com", "googlemail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com", "icloud.com",
            "me.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "gmx.de", "mail.com", "yandex.com"}


def setting(text, name):
    m = re.search(r"^\s*-\s*\**%s:?\**:?\s*(.+?)\s*$" % re.escape(name), text, re.M | re.I)
    return m.group(1).strip() if m else ""


def read_rows(path):
    rows, headers = [], None
    for line in email_check.read(path).splitlines():
        if not line.lstrip().startswith("|"):
            continue
        cells = [c.strip().replace("\\|", "|") for c in re.split(r"(?<!\\)\|", line.strip().strip("|"))]
        if headers is None:
            headers = cells
        elif not all(re.fullmatch(r":?-+:?", c or "-") for c in cells):
            rows.append(dict(zip(headers, cells)))
    return rows


def send_time(cell):
    """'Tue 2026-09-29, 9:10am America/New_York' as an aware datetime, or None if there's no date."""
    d = re.search(r"(\d{4})-(\d{2})-(\d{2})", cell)
    if not d:
        return None
    t = re.search(r"\b(\d{1,2}):(\d{2})\s*([ap]m)?", cell, re.I)
    hour, minute = (int(t.group(1)), int(t.group(2))) if t else (9, 0)
    if t and t.group(3):
        hour = hour % 12 + (12 if t.group(3).lower() == "pm" else 0)
    zone = dt.timezone.utc
    z = re.search(r"\b([A-Z][A-Za-z_]+/[A-Za-z_]+(?:/[A-Za-z_]+)?)\b", cell)
    if z:
        try:
            from zoneinfo import ZoneInfo
            zone = ZoneInfo(z.group(1))
        except Exception:
            zone = dt.timezone.utc
    try:
        return dt.datetime(int(d.group(1)), int(d.group(2)), int(d.group(3)), hour, minute, tzinfo=zone)
    except ValueError:
        return None


def draft_path(notes, root):
    paths = re.findall(r"state/outreach/[\w./-]+?\.(?:md|txt)", notes)
    return os.path.join(root, paths[-1]) if paths else ""


def queue(root, log_dir, now):
    strategy = email_check.read(os.path.join(root, "references", "outreach-strategy.md"))
    mode = setting(strategy, "Sending mode").lower().split()[0:1]
    mode = mode[0].strip("`*.,") if mode else "drafts"
    if mode not in MODES:
        mode = "drafts"
    try:
        cap = min(int(re.sub(r"\D", "", setting(strategy, "Daily send cap")) or DEFAULT_CAP), MAX_CAP)
    except ValueError:
        cap = DEFAULT_CAP
    address = email_check.strategy_address(root)
    domain_ok = setting(strategy, "Sending domain checked").lower().startswith(("yes", "confirmed", "pass"))
    reviewed = re.search(r"\d{4}-\d{2}-\d{2}", setting(strategy, "Auto-send reviewed"))
    reviewed = reviewed.group(0) if reviewed else ""
    banned = email_check.banned_words(root)

    rows = read_rows(os.path.join(log_dir, "outreach-log.md"))
    status = lambda r: r.get("Status", "").strip().lower()  # noqa: E731
    today = now.date().isoformat()
    sent_today = sum(1 for r in rows if re.search(r"sent:\s*" + today, r.get("Notes", "")))
    suppressed = {r.get("Email", "").strip().lower() for r in rows if status(r) in SUPPRESSED and r.get("Email", "").strip()}

    blocks = []
    if mode == "drafts":
        blocks.append("sending mode is drafts: runs never send; you send each draft yourself")
    else:
        if not address:
            blocks.append("no mailing address in outreach-strategy.md (it must be in every email)")
    recent = [r for r in rows if status(r) in CONTACTED and r.get("Date", "") > reviewed][-WINDOW:]
    bounces = sum(1 for r in recent if status(r) == "bounced")
    unsubs = sum(1 for r in recent if status(r) in ("unsubscribed", "do-not-contact"))
    if mode == "auto":
        if not domain_ok:
            blocks.append("the sending domain's SPF, DKIM, and DMARC aren't confirmed in outreach-strategy.md")
        if bounces >= MAX_BOUNCES or unsubs >= MAX_UNSUBS:
            blocks.append(f"paused: {bounces} bounced and {unsubs} unsubscribed among the last {len(recent)} sends; "
                          "review the list and the emails, then set 'Auto-send reviewed' to today's date to resume")

    wanted = {"approve": ("approved",), "auto": ("ready for approval", "approved")}.get(mode, ())
    send, waiting = [], []
    candidates = [r for r in rows if status(r) in ("drafted", "ready for approval", "approved")]
    candidates.sort(key=lambda r: send_time(r.get("Recommended Send Time", "")) or dt.datetime.max.replace(tzinfo=dt.timezone.utc))
    for r in candidates:
        who = r.get("Email", "").strip() or r.get("LinkedIn / Name + Company", "").strip()
        item = {"who": who, "email": r.get("Email", "").strip(), "status": r.get("Status", "").strip(),
                "send_time": r.get("Recommended Send Time", "").strip(), "file": "", "draft_id": ""}
        m = re.search(r"draft:\s*([\w-]+)", r.get("Notes", ""))
        item["draft_id"] = m.group(1) if m else ""
        why = []
        if status(r) not in wanted:
            why.append("not approved yet" if mode == "approve" else
                       "still Drafted: it didn't pass the check or isn't finished" if mode == "auto" else "drafts mode")
        email = item["email"].lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[a-z]{2,}", email):
            why.append("no real email address")
        else:
            local, domain = email.split("@")
            if local in ROLE:
                why.append(f"a role address ({local}@)")
            if domain in FREEMAIL:
                why.append(f"a personal address ({domain})")
            if email in suppressed:
                why.append("this address is suppressed elsewhere in the log")
        path = draft_path(r.get("Notes", ""), root)
        item["file"] = os.path.relpath(path, root) if path else ""
        if not path or not os.path.isfile(path):
            why.append("no draft file found from Notes")
        else:
            text = email_check.read(path)
            head, _ = email_check.parse_draft(text)
            to = head.get("to", "").strip().lower()
            if to != email:
                why.append(f"the draft is addressed to '{to or 'nobody'}', not this row's address")
            result = email_check.check_cold(path, text, banned, address)
            if result["fails"]:
                why.append("fails email_check.py: " + result["fails"][0])
        when = send_time(item["send_time"])
        if when is None:
            why.append("no recommended send time")
        elif when > now:
            why.append("send time hasn't come")
        if not why and blocks:
            why.append("blocked (see above)")
        if not why and sent_today + len(send) >= cap:
            why.append(f"today's cap of {cap} is reached")
        if why:
            item["why"] = "; ".join(why)
            waiting.append(item)
        else:
            send.append(item)
    return {"mode": mode, "now": now.isoformat(timespec="minutes"), "cap": cap, "sent_today": sent_today,
            "blocked": blocks, "recent": {"sends": len(recent), "bounced": bounces, "unsubscribed": unsubs},
            "send": send, "waiting": waiting}


def main():
    parser = argparse.ArgumentParser(description="Which queued cold emails may be sent now.")
    parser.add_argument("--plugin-root", default=PLUGIN_ROOT, help="Where references/ and state/ live.")
    parser.add_argument("--log-dir", help="Folder holding outreach-log.md (default: <plugin root>/state).")
    parser.add_argument("--now", help="Pretend it's this time (ISO 8601), for testing.")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    now = dt.datetime.fromisoformat(args.now) if args.now else dt.datetime.now(dt.timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=dt.timezone.utc)
    q = queue(args.plugin_root, args.log_dir or os.path.join(args.plugin_root, "state"), now)
    if args.json:
        print(json.dumps(q, indent=2))
        return
    print(f"Sending mode: {q['mode']}. Sent today: {q['sent_today']} of {q['cap']}.")
    for b in q["blocked"]:
        print(f"BLOCKED  {b}")
    print(f"\nSend now ({len(q['send'])}):")
    for i in q["send"]:
        print(f"  SEND  {i['who']}  {i['file']}" + (f"  draft:{i['draft_id']}" if i["draft_id"] else ""))
    print(f"\nWaiting ({len(q['waiting'])}):")
    for i in q["waiting"]:
        print(f"  wait  {i['who']}: {i['why']}")


if __name__ == "__main__":
    main()
