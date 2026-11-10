#!/usr/bin/env python3
"""The release for the version in .claude-plugin/plugin.json: its tag, its
title, and its notes (that version's section of CHANGELOG.md).

.github/workflows/release.yml runs this on every push to main and publishes
the release when the version isn't tagged yet; CI runs it on every pull
request, so a release that couldn't be published fails before it merges.

Usage: python3 scripts/ci/release_notes.py [--out notes.md]

Prints version=, tag=, title=, and publish= lines (GitHub Actions step
outputs). publish=false while the section is still "(unreleased)": only a
dated section, "## 0.8.1 (2026-11-10)", is released. Exits 1 when
CHANGELOG.md has no section for the version, or the section is empty.
Standard library only.
"""
import argparse
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def release(root=ROOT):
    """(version, date or None, notes) for the version in plugin.json."""
    with open(os.path.join(root, ".claude-plugin", "plugin.json"), encoding="utf-8") as f:
        version = str(json.load(f).get("version", ""))
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise ValueError(f"plugin.json's version {version!r} isn't x.y.z")
    with open(os.path.join(root, "CHANGELOG.md"), encoding="utf-8") as f:
        text = f.read()
    heading = re.search(rf"^## {re.escape(version)}(?: \(([^)\n]*)\))?[ \t]*$", text, re.M)
    if not heading:
        raise ValueError(f"CHANGELOG.md has no '## {version} (YYYY-MM-DD)' section for plugin.json's version")
    rest = text[heading.end():]
    following = re.search(r"^## ", rest, re.M)
    notes = (rest[:following.start()] if following else rest).strip()
    if not notes:
        raise ValueError(f"CHANGELOG.md's {version} section is empty; add what changed")
    when = (heading.group(1) or "").strip()
    return version, (when if re.fullmatch(r"\d{4}-\d{2}-\d{2}", when) else None), notes


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--out", help="write the release notes to this file")
    args = parser.parse_args()
    try:
        version, when, notes = release()
    except (OSError, ValueError) as e:
        print(f"release_notes.py: {e}", file=sys.stderr)
        sys.exit(1)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(notes + "\n")
    if not when:
        print(f"release_notes.py: {version} isn't dated yet ('## {version} (YYYY-MM-DD)'), so it won't be released",
              file=sys.stderr)
    print(f"version={version}")
    print(f"tag=v{version}")
    print(f"title={version} ({when})" if when else f"title={version}")
    print(f"publish={'true' if when else 'false'}")


if __name__ == "__main__":
    main()
