# marketing-skill

A Claude Code plugin that packages a marketing workflow as five composable
skills: research a competitor, repurpose the findings across channels,
brief out a visual asset, and hand the finished content off to your own
automation for scheduling and publishing.

## Skills

| Skill | Triggers on | Does |
|---|---|---|
| `competitor-research` | "research a competitor," "analyze a rival," "build a battlecard" | Full analytical competitor brief: overview, recent moves, messaging analysis, SWOT, recommendations, sources |
| `content-repurposer` | "repurpose this," "turn this into a LinkedIn post/thread/newsletter" | One source → a LinkedIn post, a Twitter/X thread, and a newsletter blurb, in one pass |
| `visual-brief-generator` | "visual brief," "video brief," "shot list," "image prompts for X" | A structured shot list, per-scene prompts, aspect ratios, and style guide; generates the actual asset only if a visual-gen tool is connected |
| `publish-pipeline` | "publish this," "send to n8n/Make," "fire the webhook" | Packages finished content/assets into JSON and hands off to your automation via webhook, after showing you the exact payload |
| `full-pipeline` | "run the full pipeline," "research X and publish it," "do the whole thing end to end" | Chains all four skills above into one run, with a mandatory pause before anything actually publishes |

Plus one setup command: `/marketing-skill:marketing-setup`.

## Using your own project as source material

`competitor-research`, `content-repurposer`, and `visual-brief-generator`
can pull from the project they're installed in instead of requiring you to
paste content every time. If you reference "our product," "our feature,"
"our changelog," etc. without providing the text, they'll check `README*`,
`CHANGELOG*`, `docs/**/*.md`, and `package.json`/`pyproject.toml` at the
project root first, and ask you directly only if nothing relevant turns
up. They only read documentation-oriented files this way — never arbitrary
source code — so install this in your product's own repo to get the most
out of it.

## Install

**Plugin method (recommended):**

```
claude plugin marketplace add marcosmodly/marketing-skill
claude plugin install marketing-skill@marketing-skill
```

This works once the plugin's branch is merged to the repo's default
branch, since `marketplace add` tracks a repo's default branch. To try it
before merging (e.g. against a feature branch), clone the repo locally and
point at your checkout instead — this is verified to work regardless of
which branch is checked out:

```
git clone https://github.com/marcosmodly/marketing-skill.git
cd marketing-skill && git checkout <branch-name>   # if not already on it
claude plugin marketplace add .
claude plugin install marketing-skill@marketing-skill
```

**Manual fallback:** no confirmed minimum Claude Code version exists for
the plugin system — if `claude plugin` isn't available on your install
(check with `claude plugin --help`), copy the skills in by hand instead:

```
cp -r skills/* ~/.claude/skills/        # personal, all projects
# or
cp -r skills/* /your/project/.claude/skills/   # project-scoped
```

The manual copy skips the setup command and `${CLAUDE_PLUGIN_ROOT}`
path substitution — see "Configure" below for the equivalent manual step,
and swap `${CLAUDE_PLUGIN_ROOT}` for the actual absolute path in
`scripts/publish_webhook.py` references inside each skill if you go this
route.

## Configure

Every skill reads `references/brand-voice.md` before producing output —
your task priority, target audience, tone, output format, banned words,
and formatting constraints, defined once and reused everywhere.

- **Guided setup:** run `/marketing-skill:marketing-setup` any time
  (first-run or to update your answers).
- **Automatic:** if you skip setup, the first skill you actually use will
  ask the same 3 questions itself before proceeding, and save your answers
  for next time.
- **Manual:** edit `references/brand-voice.md` directly — keep its
  section headings intact so every skill can still find them.

## Automation handoff

`publish-pipeline` and `full-pipeline` send a JSON payload to your own
automation (n8n, Make, or anything else with an incoming webhook) via
`scripts/publish_webhook.py`. Point it at your webhook:

```
export MARKETING_WEBHOOK_URL="https://your-n8n-or-make-webhook-url"
```

or pass `--url` directly. Test with `--dry-run` first — it prints the
exact request without sending anything:

```
echo '{"hello": "world"}' | python3 scripts/publish_webhook.py --dry-run
```

If you have a **Make** MCP connector connected in your session (tools
like `scenarios_run`), `publish-pipeline` can call it directly instead of
the webhook script — mention that preference when the skill asks how to
send.

## Connecting a visual-generation tool

`visual-brief-generator` checks your currently connected tools for an
image/video-generation MCP connector at runtime — it doesn't assume a
specific one. As of this writing, none of Higgsfield, Runway, or
Midjourney has a known official MCP server, so there's nothing to
hardcode; a **Canva** connector does exist (requires connecting via OAuth
in your Claude settings) as one real option for visual asset work. If
none is connected, the skill still produces the full written brief and
prompts — just paste them into whatever tool you use.

## Repo layout

```
.claude-plugin/
  plugin.json         # plugin metadata
  marketplace.json     # lets this repo install itself via `marketplace add`
skills/                 # the 5 skills, one SKILL.md each
commands/
  marketing-setup.md    # the /marketing-skill:marketing-setup command
references/
  brand-voice.md         # shared config every skill reads
scripts/
  publish_webhook.py     # stdlib-only webhook sender (see --help)
```
