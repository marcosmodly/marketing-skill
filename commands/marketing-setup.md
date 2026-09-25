---
description: Asks the 4 setup questions and saves task priority, content types, audience, tone, and output-format defaults to references/brand-voice.md.
allowed-tools: Read, Write
---

# Marketing Skill Setup

## Purpose

One-shot (or run-anytime) conversational setup that fills in
`references/brand-voice.md`, the shared config every other skill in this
plugin reads before producing output. This is what lets you define your
task priority, audience, and tone once instead of repeating it every time
you invoke a skill.

## Process

1. Read `${CLAUDE_PLUGIN_ROOT}/references/brand-voice.md`.
2. If its first line is already
   `<!-- MARKETING-SKILL:CONFIGURED (last updated: ...) -->`, show the
   user its current Priority Task, Content Types, Target Audience, Brand
   Voice & Tone, and Default Output Format values before asking anything —
   this command doubles as an "update my settings" flow, not just
   first-run setup. Ask whether they want to update everything or just
   specific fields.
3. Ask the following four questions (skip any the user already answered
   in step 2's "just specific fields" case):
   1. "Which marketing task should this plugin prioritize/automate for you
      first?" (e.g. weekly newsletters, competitor research, converting
      blogs to social posts, video briefs, publishing automation)
   2. "What type(s) of content do you actually want to produce?" (e.g.
      short-form video scripts for Reels/TikTok/Shorts, long-form video
      scripts, text/social posts, email, images — name one or a mix; this
      is what lets skills like `content-calendar` default to the right
      medium instead of assuming text posts)
   3. "Who's your target audience, and what tone of voice should content
      use?"
   4. "What output format or structure do you want by default?" (e.g. a
      short hook + bullets + CTA, a full long-form draft, a numbered
      thread)
4. Optionally ask if they want to customize the banned-words list or
   formatting constraints; if they decline or don't answer, leave the
   existing placeholder values in place.
5. Write the answers into `references/brand-voice.md`:
   - Keep the exact heading structure already in the file (`## Priority
     Task`, `## Content Types`, `## Target Audience`, `## Brand Voice &
     Tone`, `## Default Output Format`, `## Banned Words & Phrases`, `##
     Formatting Constraints`, `## Do / Don't Examples`) so every skill's
     reads keep working — replace the placeholder body text under each
     heading with the user's actual answer, don't add or rename sections.
   - Replace the first line of the file with
     `<!-- MARKETING-SKILL:CONFIGURED (last updated: YYYY-MM-DD) -->`
     using today's date.
6. Confirm back what was saved as a short summary, not a formatted report:
   `Saved: priority=<...>, content_types=<...>, audience=<...>, tone=<...>,
   format=<...>`. Note that they can re-run this command anytime, or
   hand-edit the file directly.

## Formatting rules

- Ask the 4 questions conversationally, one at a time — don't dump all
  four into a single wall of text.
- Never invent an answer on the user's behalf; if they skip a question,
  leave that section's placeholder text untouched rather than guessing.
- Keep the final confirmation to one line — this command's job is to save
  preferences, not to produce a deliverable.
