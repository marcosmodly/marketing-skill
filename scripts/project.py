#!/usr/bin/env python3
"""
What the user's project is, read from its own files, before a video (or any
content) is made about it: so Claude can say what it understood and ask the
user to confirm or correct it, instead of guessing.

It looks at the folder the user is working in (not this plugin's folder):

  the name and one-line description   package.json, pyproject.toml, Cargo.toml,
                                      composer.json, a web app manifest, the
                                      README's title and first paragraph
  where it lives                      homepage and repository fields, the git
                                      remote, a landing page's <title> and
                                      meta description
  what's new                          the top of CHANGELOG, the latest git commits
  what's there to show                screenshots, screen recordings, logos, and
                                      other pictures and clips in the project
  what's been decided already         the Project, Target Audience, and Video
                                      Setup sections of references/brand-voice.md,
                                      and how many videos the video log holds

Then it lists what it couldn't find, which is what to ask the user.

  python3 scripts/project.py                 the current folder
  python3 scripts/project.py ~/code/my-app   another folder
  python3 scripts/project.py --json          the same, as JSON for a skill to read

Standard library only; reads local files (and `git log`), never the network.
What it prints is what the files say, not facts about the product: the
skill confirms it with the user before using any of it.
"""
import argparse
import json
import os
import re
import subprocess
import sys

PLUGIN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SKIP_DIRS = {
    ".git", "node_modules", ".venv", "venv", "env", "__pycache__", "dist", "build", ".next", ".nuxt",
    "out", "target", "vendor", ".cache", "coverage", ".turbo", ".idea", ".vscode", "Pods", "DerivedData",
}
IMAGE = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".heic")
VIDEO = (".mp4", ".mov", ".webm", ".m4v")
MAX_FILES = 6000  # stop walking a huge tree; enough to find the obvious assets


def read(path, limit=200_000):
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read(limit)
    except OSError:
        return ""


def first(*values):
    for v in values:
        if isinstance(v, str) and v.strip():
            return v.strip()
    return ""


def manifests(root):
    """Name, description, homepage, and repository from the project's package manifests."""
    found = {}
    pj = os.path.join(root, "package.json")
    if os.path.isfile(pj):
        try:
            data = json.loads(read(pj))
            repo = data.get("repository")
            found["package.json"] = {
                "name": data.get("name", ""), "description": data.get("description", ""),
                "homepage": data.get("homepage", ""), "keywords": data.get("keywords", [])[:8],
                "repository": repo.get("url", "") if isinstance(repo, dict) else repo or "",
            }
        except (ValueError, AttributeError):
            pass
    for name, section in (("pyproject.toml", "project"), ("Cargo.toml", "package")):
        path = os.path.join(root, name)
        if not os.path.isfile(path):
            continue
        text = read(path)
        block = re.search(r"^\[%s\]\s*$(.*?)(?=^\[|\Z)" % re.escape(section), text, re.M | re.S)
        if not block:
            continue
        field = lambda k: (re.search(r'^\s*%s\s*=\s*["\'](.+?)["\']' % k, block.group(1), re.M) or [None, ""])[1]
        found[name] = {"name": field("name"), "description": field("description"), "homepage": field("homepage"), "repository": field("repository")}
    cj = os.path.join(root, "composer.json")
    if os.path.isfile(cj):
        try:
            data = json.loads(read(cj))
            found["composer.json"] = {"name": data.get("name", ""), "description": data.get("description", ""), "homepage": data.get("homepage", "")}
        except ValueError:
            pass
    for rel in ("manifest.json", "public/manifest.json", "static/manifest.json", "app.json"):
        path = os.path.join(root, rel)
        if os.path.isfile(path):
            try:
                data = json.loads(read(path))
                if isinstance(data, dict) and (data.get("name") or data.get("short_name") or data.get("expo")):
                    expo = data.get("expo") or {}
                    found[rel] = {"name": first(data.get("name"), data.get("short_name"), expo.get("name")), "description": first(data.get("description"), expo.get("description"))}
            except ValueError:
                pass
    return found


def readme(root):
    """The README's title and its first real paragraph (badges and images skipped)."""
    for name in sorted(os.listdir(root)):
        if re.match(r"readme(\.(md|markdown|rst|txt))?$", name, re.I):
            text = read(os.path.join(root, name), 60_000)
            title = (re.search(r"^#\s+(.+)$", text, re.M) or [None, ""])[1].strip()
            para = ""
            for block in re.split(r"\n\s*\n", text):
                b = block.strip()
                if not b or b.startswith(("#", "[!", "![", "<", "```", "|", "---", "```")):
                    continue
                if re.fullmatch(r"(\[!\[.*?\]\(.*?\)\]\(.*?\)\s*)+", b):
                    continue
                para = re.sub(r"\s+", " ", re.sub(r"[*_`]|\[([^\]]+)\]\([^)]+\)", r"\1", b))[:400]
                break
            return {"file": name, "title": title, "summary": para}
    return {}


def landing(root):
    """A landing page's <title> and meta description, if the project has one."""
    for rel in ("index.html", "public/index.html", "site/index.html", "docs/index.html", "web/index.html", "src/index.html"):
        path = os.path.join(root, rel)
        if os.path.isfile(path):
            html = read(path, 100_000)
            title = (re.search(r"<title>(.*?)</title>", html, re.I | re.S) or [None, ""])[1].strip()
            desc = (re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', html, re.I | re.S) or [None, ""])[1].strip()
            if title or desc:
                return {"file": rel, "title": re.sub(r"\s+", " ", title), "description": re.sub(r"\s+", " ", desc)}
    return {}


def changelog(root):
    """The newest section of the changelog: its heading and first few bullets."""
    for name in sorted(os.listdir(root)):
        if re.match(r"(changelog|changes|history|releases)(\.md)?$", name, re.I):
            text = read(os.path.join(root, name), 80_000)
            heads = list(re.finditer(r"^##?\s+(.+)$", text, re.M))
            for i, h in enumerate(heads):
                if re.search(r"changelog|^history$", h.group(1), re.I):
                    continue
                end = heads[i + 1].start() if i + 1 < len(heads) else len(text)
                bullets = [re.sub(r"\s+", " ", re.sub(r"[*_`]", "", b)).strip()[:160]
                           for b in re.findall(r"^[-*]\s+(.+(?:\n(?![-*#]).+)*)", text[h.end():end], re.M)][:4]
                return {"file": name, "latest": h.group(1).strip(), "bullets": bullets}
    return {}


def git(root):
    """The remote and the latest commits, when the folder is a git repo."""
    def run(*args):
        try:
            r = subprocess.run(["git", "-C", root, *args], capture_output=True, text=True, timeout=10)
            return r.stdout.strip() if r.returncode == 0 else ""
        except (OSError, subprocess.SubprocessError):
            return ""
    if not run("rev-parse", "--is-inside-work-tree"):
        return {}
    remote = run("remote", "get-url", "origin")
    # never print credentials that a remote URL might carry
    remote = re.sub(r"//[^/@]+@", "//", remote)
    log = [l for l in run("log", "-6", "--pretty=%cs %s").splitlines() if l]
    return {"remote": remote, "commits": log}


def assets(root):
    """Screenshots, screen recordings, logos, and other pictures and clips in the project."""
    out = {"screenshots": [], "recordings": [], "logos": [], "pictures": [], "clips": []}
    seen = 0
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
        rel_dir = os.path.relpath(dirpath, root)
        if rel_dir.startswith(("state/videos", os.path.join("scripts", "video"))) and os.path.samefile(root, PLUGIN_ROOT):
            continue
        for f in files:
            seen += 1
            if seen > MAX_FILES:
                return out
            low = f.lower()
            path = os.path.normpath(os.path.join(rel_dir, f))
            try:
                size = os.path.getsize(os.path.join(dirpath, f))
            except OSError:
                continue
            entry = {"path": path, "kb": round(size / 1024)}
            if low.endswith(IMAGE):
                if re.search(r"logo|brand|icon-?(512|1024)|wordmark", low):
                    out["logos"].append(entry)
                elif re.search(r"screen|shot|capture|demo|preview|dashboard|mockup|(?<![a-z])(ui|app)(?![a-z])", low + " " + rel_dir.lower()):
                    out["screenshots"].append(entry)
                elif size > 30_000 and not re.search(r"favicon|sprite|emoji|badge", low):
                    out["pictures"].append(entry)
            elif low.endswith(VIDEO):
                (out["recordings"] if re.search(r"screen|record|demo|walkthrough|capture", low) else out["clips"]).append(entry)
    for k in out:
        out[k] = sorted(out[k], key=lambda e: -e["kb"])[:8]
    return out


def brand(plugin_root=PLUGIN_ROOT):
    """What brand-voice.md and the video log already say."""
    text = read(os.path.join(plugin_root, "references", "brand-voice.md"))
    def section(name):
        m = re.search(r"^## %s\n(.*?)(?=^## |\Z)" % re.escape(name), text, re.M | re.S)
        body = (m.group(1).strip() if m else "")
        return "" if not body or body.lower().startswith("not yet configured") else re.sub(r"\s+", " ", body)[:300]
    log = read(os.path.join(plugin_root, "state", "video-log.md"))
    rows = [l for l in log.splitlines() if l.startswith("| 20")]
    return {
        "configured": "MARKETING-SKILL:CONFIGURED" in text,
        "project": section("Project"),
        "audience": section("Target Audience"),
        "video_setup": section("Video Setup"),
        "videos_logged": len(rows),
        "formats": sorted({r.split("|")[4].strip() for r in rows if len(r.split("|")) > 4})[:8],
    }


def scan(root):
    root = os.path.abspath(os.path.expanduser(root))
    info = {"folder": root, "is_plugin": os.path.isdir(root) and os.path.samefile(root, PLUGIN_ROOT)}
    if not os.path.isdir(root):
        info["error"] = "not a folder"
        return info
    info.update({"manifests": manifests(root), "readme": readme(root), "landing": landing(root),
                 "changelog": changelog(root), "git": git(root), "assets": assets(root), "brand": brand()})
    m = info["manifests"]
    pick = lambda key: first(*[v.get(key, "") for v in m.values()])
    info["name"] = first(pick("name"), info["readme"].get("title"), info["landing"].get("title"))
    info["description"] = first(pick("description"), info["landing"].get("description"), info["readme"].get("summary"))
    info["links"] = [u for u in dict.fromkeys([pick("homepage"), pick("repository"), info["git"].get("remote", "")]) if u]
    unknown = []
    if not info["name"] and not info["brand"]["project"]:
        unknown.append("what the project is called")
    if not info["description"] and not info["brand"]["project"]:
        unknown.append("what it is and does, in a sentence")
    if not info["brand"]["audience"]:
        unknown.append("who it's for")
    a = info["assets"]
    if not (a["screenshots"] or a["recordings"]):
        unknown.append("screenshots or a screen recording of it working (the product itself, not stock)")
    if not a["logos"]:
        unknown.append("a logo")
    unknown += ["what this video is for (followers, sign-ups, a launch, sales) and the one thing viewers should remember or do",
                "any real numbers, results, or quotes they can share, and where each is from",
                "anything to avoid or that must be said (claims, competitors, legal lines)"]
    info["ask"] = unknown
    return info


def report(info):
    if info.get("error"):
        return f"{info['folder']}: {info['error']}\n"
    out = ["# What this project looks like, from its files", "",
           "Confirm all of this with the user before using it: it's what the files say, not facts about the product.", ""]
    if info["is_plugin"]:
        out += ["**This is the marketing-skill plugin's own folder**, not the user's project. Unless the video is about this plugin, "
                "ask the user which project it's for (and the folder it's in), and run this there.", ""]
    out.append(f"- Folder: {info['folder']}")
    if info["name"]:
        out.append(f"- Name: {info['name']}")
    if info["description"]:
        out.append(f"- What it says it is: \"{info['description']}\"")
    for k, v in info["manifests"].items():
        if v.get("keywords"):
            out.append(f"- Keywords ({k}): {', '.join(v['keywords'])}")
    if info["landing"]:
        l = info["landing"]
        out.append(f"- Landing page ({l['file']}): \"{l['title']}\"" + (f", \"{l['description']}\"" if l["description"] else ""))
    if info["links"]:
        out.append(f"- Links: {', '.join(info['links'])}")
    c = info["changelog"]
    if c:
        out.append(f"- What's new ({c['file']}): {c['latest']}" + "".join(f"\n  - {b}" for b in c["bullets"]))
    g = info["git"]
    if g.get("commits"):
        out.append("- Latest commits:" + "".join(f"\n  - {x}" for x in g["commits"][:5]))
    a = info["assets"]
    labels = {"screenshots": "Screenshots", "recordings": "Screen recordings", "logos": "Logos", "pictures": "Other pictures", "clips": "Other clips"}
    shown = [(labels[k], v) for k, v in a.items() if v]
    if shown:
        out.append("- Material to show (the user's own, so it beats stock):")
        for label, items in shown:
            out.append(f"  - {label}: " + ", ".join(f"{e['path']} ({e['kb']} KB)" for e in items))
    b = info["brand"]
    out.append("- Already decided (brand-voice.md): " + ("; ".join(x for x in [
        f"project: {b['project']}" if b["project"] else "",
        f"audience: {b['audience']}" if b["audience"] else "",
        f"video setup: {b['video_setup']}" if b["video_setup"] else "",
    ] if x) or "nothing yet (not configured)"))
    out.append(f"- Videos made before: {b['videos_logged']}" + (f" ({', '.join(b['formats'])})" if b["formats"] else ""))
    out += ["", "## Ask the user (one message, with what's above as your understanding to confirm)", ""]
    out += [f"{i}. {q}" for i, q in enumerate(info["ask"], 1)]
    return "\n".join(out) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("folder", nargs="?", default=os.getcwd())
    ap.add_argument("--json", action="store_true", help="print the findings as JSON")
    args = ap.parse_args()
    info = scan(args.folder)
    sys.stdout.write(json.dumps(info, indent=2) + "\n" if args.json else report(info))
    return 1 if info.get("error") else 0


if __name__ == "__main__":
    sys.exit(main())
