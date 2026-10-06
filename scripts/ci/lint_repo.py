#!/usr/bin/env python3
"""Repo checks that need no network or browser: skill frontmatter, command
size, plugin manifests, and file paths the skills point at.

Run from anywhere: python3 scripts/ci/lint_repo.py
Exits 1 and lists every problem found.
"""
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
# Agent Skills limit for a skill's description
MAX_DESCRIPTION = 1024
# Codex only turns commands smaller than this into skills
MAX_COMMAND_BYTES = 4096

problems = []


def rel(path):
    return os.path.relpath(path, ROOT)


def frontmatter(path):
    text = open(path, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return None, text
    fields = {}
    for line in m.group(1).splitlines():
        k, sep, v = line.partition(":")
        if sep:
            v = v.strip()
            if len(v) >= 2 and v[0] == v[-1] == '"':
                v = v[1:-1]
            fields[k.strip()] = v
    return fields, text


def check_skills():
    skills_dir = os.path.join(ROOT, "skills")
    for name in sorted(os.listdir(skills_dir)):
        path = os.path.join(skills_dir, name, "SKILL.md")
        if not os.path.isfile(path):
            problems.append(f"skills/{name}: no SKILL.md")
            continue
        fields, _ = frontmatter(path)
        if fields is None:
            problems.append(f"{rel(path)}: no frontmatter")
            continue
        if fields.get("name") != name:
            problems.append(f"{rel(path)}: name is {fields.get('name')!r}, should match its folder {name!r}")
        desc = fields.get("description", "")
        if not desc:
            problems.append(f"{rel(path)}: no description")
        elif len(desc) > MAX_DESCRIPTION:
            problems.append(f"{rel(path)}: description is {len(desc)} characters, over the {MAX_DESCRIPTION} limit")
        if re.search(r"<[a-zA-Z/][^>]*>", desc):
            problems.append(f"{rel(path)}: description contains an XML/HTML tag")


def check_commands():
    commands_dir = os.path.join(ROOT, "commands")
    for name in sorted(os.listdir(commands_dir)):
        path = os.path.join(commands_dir, name)
        size = os.path.getsize(path)
        if size >= MAX_COMMAND_BYTES:
            problems.append(f"{rel(path)}: {size} bytes; Codex only converts commands under {MAX_COMMAND_BYTES}")
        fields, _ = frontmatter(path)
        if not fields or not fields.get("description"):
            problems.append(f"{rel(path)}: no description in frontmatter")


def check_manifests():
    versions = {}
    for name in ("plugin.json", "marketplace.json"):
        path = os.path.join(ROOT, ".claude-plugin", name)
        try:
            data = json.load(open(path, encoding="utf-8"))
        except (OSError, ValueError) as e:
            problems.append(f"{rel(path)}: {e}")
            continue
        if name == "plugin.json":
            versions["plugin"] = data.get("version")
            if not re.match(r"^\d+\.\d+\.\d+$", str(data.get("version", ""))):
                problems.append(f"{rel(path)}: version {data.get('version')!r} isn't x.y.z")
    changelog = os.path.join(ROOT, "CHANGELOG.md")
    if versions.get("plugin") and os.path.isfile(changelog):
        if f"## {versions['plugin']}" not in open(changelog, encoding="utf-8").read():
            problems.append(f"CHANGELOG.md has no '## {versions['plugin']}' section for plugin.json's version")


# ${CLAUDE_PLUGIN_ROOT}/some/path and `references/x.md`-style mentions that should exist.
# Paths under state/ are created at runtime, and anything with a placeholder is skipped.
PLUGIN_PATH = re.compile(r"\$\{CLAUDE_PLUGIN_ROOT\}/([A-Za-z0-9_./-]+)")
SKIP = re.compile(r"(^state/|<|\*|\.\.\.|\{)")


def check_paths():
    for base in ("skills", "commands", "references"):
        for dirpath, _, files in os.walk(os.path.join(ROOT, base)):
            for f in files:
                if not f.endswith(".md"):
                    continue
                path = os.path.join(dirpath, f)
                text = open(path, encoding="utf-8").read()
                for m in PLUGIN_PATH.finditer(text):
                    target = m.group(1).rstrip(".,)`'")
                    if SKIP.search(target):
                        continue
                    if not os.path.exists(os.path.join(ROOT, target)):
                        problems.append(f"{rel(path)}: points at {target}, which doesn't exist")


def main():
    check_skills()
    check_commands()
    check_manifests()
    check_paths()
    for p in problems:
        print(f"- {p}")
    print(f"{len(problems)} problem(s)" if problems else "Repo checks passed")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
