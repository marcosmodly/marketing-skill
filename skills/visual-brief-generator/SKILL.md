---
name: visual-brief-generator
description: "Writes an image or video generation brief: a shot list, per-scene prompts for AI image and video tools, aspect ratios, and a style guide. Use whenever someone wants a visual or creative brief, a storyboard, a shot list, or prompts for Midjourney, DALL-E, Runway, or similar, even for a few product shots."
allowed-tools: Read, Grep, Glob, Write
---

# Visual Brief Generator

## Purpose

Turn a piece of content or campaign idea into a structured, copy-paste-ready
visual generation brief — a shot list, per-scene prompts, aspect ratios per
platform, and a style/mood guide. If a connected image- or video-generation
MCP tool is available in the current session and the user wants to generate
now, use it. Otherwise the written brief itself is the deliverable.

**Important:** Higgsfield launched an official hosted MCP server in 2026
(Runway and Midjourney still have no known official one as of this
writing), so it's no longer accurate to assume none of the major
image/video-gen tools has one — but having an MCP server available in
general doesn't mean it's connected in any given session. This skill
checks whatever tools are actually available at runtime instead of
hardcoding a tool name, the same as it always has. For short-form vertical
video specifically (YouTube Shorts/Instagram Reels/TikTok), see the more
targeted `short-form-video` skill instead, which checks for the same
connectors and also produces platform-specific captions, hashtags, and
posting-time guidance this skill doesn't.

## Step-by-step process

**Plugin root:** if a path below still shows an unexpanded
`CLAUDE_PLUGIN_ROOT` placeholder (Claude Code fills it in; other agents
such as Codex don't), resolve it before using any of them: take the
output of `printenv CLAUDE_PLUGIN_ROOT` if it prints a path, otherwise
walk up from this file's folder to the first folder that contains
`references/brand-voice.md`, and if neither works, ask the user where
this plugin lives. Use that absolute path in every file path and shell
command below.

1. **Check onboarding status.** Read
   `${CLAUDE_PLUGIN_ROOT}/references/brand-voice.md`. If it doesn't exist,
   or its first line is `<!-- MARKETING-SKILL:UNCONFIGURED -->`, pause and
   ask the user this plugin's 4 setup questions (priority task; content
   types to produce; target audience + tone; default output format — same
   as `/marketing-skill:marketing-setup`) before continuing, then save the
   answers into that file and flip the marker to `CONFIGURED` with today's
   date. Otherwise, read it for mood/tone consistency below.
   If the file is unconfigured but the user already said to skip setup
   or use the defaults, don't ask: use its placeholder defaults for this
   run, say so in one line, and leave the marker as it is.

2. **Confirm scope.**
   - Source content or campaign this brief is for. If the user references
     a project feature/launch without describing it, look for it first —
     Glob for `README*`, `CHANGELOG*`, and `docs/**/*.md` at the project
     root, then Read whichever look relevant — before asking them to
     describe it. Use the Project section of `references/brand-voice.md`
     when it's filled in (its Material line says which real screenshots
     and logos exist). Only check documentation-oriented files this way,
     not arbitrary source code. If nothing relevant turns up, ask
     directly.
   - Deliverable type: video, image, or both.
   - Target platform(s) — this determines aspect ratio (e.g. Reels/TikTok
     9:16, LinkedIn 1:1 or 16:9, YouTube 16:9).
   - Roughly how many scenes/shots, and total duration if video.
   - Any existing brand assets, colors, or style references to match.

3. **Look for a connected visual-generation tool.** Check the tools
   actually available in this session for one whose name or description
   indicates image or video generation (for example, a connected Canva
   connector, or any other connected MCP server for this purpose — do not
   assume any specific one is present).
   - If found: ask the user whether to actually generate the asset(s) now
     using that tool, with the per-scene prompts below as input.
   - If not found: proceed to produce the written brief only.

4. **Draft the brief** using the exact section structure below, applying
   brand voice/tone from `references/brand-voice.md`. Read
   `${CLAUDE_PLUGIN_ROOT}/references/visual-design.md` first: "Start from
   one feeling" for the direction, "Starting palettes" when the brand has no
   colors yet, the style recipes for a timed sequence to start from, and
   "Prompting AI pictures" for how every prompt is built. Write the direction
   as one sentence before any shot: after seeing this, the viewer should
   understand or feel ___.

5. **Report status honestly.** Never claim an asset was generated if no
   tool call actually happened. If no visual-gen tool is connected, say so
   plainly and point to this plugin's `docs/video.md` ("Connecting a
   visual-generation tool").

## When to use this skill

Trigger on requests like:
- "Make a visual brief / video brief for..."
- "I need a shot list for..."
- "Write image/video prompts for..."

## Output structure (required)

Use this exact section order, as Markdown `##` headings:

### Brief Overview
Goal, the one-sentence direction, the one feeling, source reference, target
platform(s), total duration or frame count.

### Shot List
A table: `Shot # | Description | Duration/Frames | Camera/Framing notes`.

### Per-Scene Prompts
Open with the shared visual spec: the character, clothing, place, time of
day, palette, light direction, camera angle, and art style, written once and
repeated word for word in every prompt, so the scenes match. Then one block
per shot. Each prompt must be self-contained (no dangling pronouns like "it"
referring to a previous scene), built in this order: subject, action,
environment, composition (including where the calm space for on-screen text
goes), lighting, palette, style, aspect ratio, and exclusions (no text, no
logos, no watermark). Each block includes:
- The generation prompt itself.
- A negative prompt, if relevant to the target tool.
- Aspect ratio for that shot.
- Style/mood keywords.

Pixel-art and 3D prompts add the fields "Prompting AI pictures" lists (pixel
scale, palette limit, outline, sprite-sheet cells; or material, lighting, and
render style). A shot of the product's real interface, logo, or any exact
words is never generated: say "use the real screen recording / logo here"
and add the words in the edit, since models garble text, logos, and UI.

### Aspect Ratio & Format per Platform
A table: `Platform | Aspect Ratio | File Type`.

### Style & Mood Guide
Color palette, tone, pacing, and sound/music direction (if video).

### Generation Status / Next Steps
State plainly whether a connected tool was used to actually generate
anything. If not, note how to connect a visual-gen MCP tool (see this
plugin's `docs/video.md`) or how to paste these prompts into a tool manually.

## Formatting rules

- Keep style/mood keywords consistent across scenes unless variation is
  intentional and called out.
- Before calling generated assets done, check each for anatomy, object
  details, perspective, and garbled text, and replace weak ones; grade and
  crop them all the same way.
- Respect brand-voice constraints (including any banned words/imagery).
- Never fabricate an asset URL or claim generation succeeded when it
  didn't.

## Example output

> Fictional example: a 3-scene, 15-second product-teaser brief for
> Instagram Reels, brief-only (no visual-gen tool connected).

```markdown
## Brief Overview
Goal: teaser for the "one-click export" feature launch.
Direction: after watching, the viewer should feel that exporting is now one
calm click instead of a mess.
Feeling: relief (from cluttered to calm).
Source: content-repurposer LinkedIn post draft.
Platform: Instagram Reels.
Total duration: 15 seconds (3 scenes, 5s each).

## Shot List
| Shot # | Description | Duration | Camera/Framing notes |
|---|---|---|---|
| 1 | A desk buried in printed reports and sticky notes, someone's hands sorting them | 5s | Overhead close-up, clutter in the lower two-thirds |
| 2 | The real product: the cursor clicks "Export" once | 5s | Screen recording of the actual app, zoomed on the button |
| 3 | The same desk, cleared, one neat report on it | 5s | Same overhead angle as shot 1, so the change reads at once |

## Per-Scene Prompts
Visual spec (repeated in every prompt): "a light oak desk in a small home
office at dusk, seen from directly overhead, warm desk-lamp light from the
upper left, cool blue-gray and white with one warm orange accent, clean
editorial photography."

**Scene 1:** "Two hands sorting a messy pile of printed reports and yellow
sticky notes on a light oak desk in a small home office at dusk, seen from
directly overhead, the clutter filling the lower two-thirds with calm empty
desk in the top fifth for a title, warm desk-lamp light from the upper left,
cool blue-gray and white with one warm orange accent, clean editorial
photography, vertical 9:16, no readable text, no logos, no watermark."
Negative prompt: "readable words, brand names, extra fingers." Aspect ratio:
9:16. Style/mood: busy, warm, slightly comedic.

**Scene 2:** Not generated: use the real screen recording of the export
button, since a model would invent the interface and garble its text. Add
"one click" as on-screen text in the edit.

**Scene 3:** "A single neat printed report squared up on an otherwise empty
light oak desk in a small home office at dusk, seen from directly overhead,
the report centered low with open desk above it for a title, warm desk-lamp
light from the upper left, cool blue-gray and white with one warm orange
accent, clean editorial photography, vertical 9:16, no readable text, no
logos, no watermark." Negative prompt: "clutter, readable words." Aspect
ratio: 9:16. Style/mood: calm, resolved, confident.

## Aspect Ratio & Format per Platform
| Platform | Aspect Ratio | File Type |
|---|---|---|
| Instagram Reels | 9:16 | MP4 |

## Style & Mood Guide
Color: cool blue-gray and white as the base, one warm orange accent kept
for the key detail. Tone: light, a little playful, resolves into calm and
confident. Pacing: quick cuts, no scene longer than 5s; shots 1 and 3 share
an angle so the before and after read as a match cut. Sound: upbeat,
minimal, a single "click" on scene 2's button and a soft "ding" on scene 3.

## Generation Status / Next Steps
No connected image/video-generation tool was available in this session, so
no asset was generated — this brief is the deliverable. To generate
directly, connect a visual-gen MCP tool and re-run this skill (see this
plugin's `docs/video.md`), or paste the per-scene prompts above into your tool of
choice.
```
