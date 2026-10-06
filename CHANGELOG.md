# Changelog

What changed in each version of the plugin (`.claude-plugin/plugin.json`).
Skills that read "our changelog" for source material read this file too.

## 0.8.0 (unreleased)

- **Narrated videos with synced captions.** `scripts/video/compose.js`
  turns a script of numbered lines into a finished page: a voiceover
  (Kokoro or your own takes), a background per line, scenes timed to the
  voice with cuts on the beat, the hook on screen from the first frame, and
  word-by-word captions synced to the voice. New `narrated.html` template.
- `scripts/video/captions.js`: when each word of a voice line is said,
  from the clip's pauses and the words' lengths (no service; about 50 ms
  from the true word starts on average against synthesized speech), with
  Whisper as an option. `<div class="say auto" data-voice>` gets captions
  in any template, and renders with captions write an `.srt`.
- The renderer prepares voice clips before capturing frames: silence is
  trimmed from both ends, `--voice-lengths` lists each line's start, length,
  and room in its scene, and a line running past its scene is reported.
- `voice.js` writes each line's sentence timings next to its WAV.
- `short-form-video`'s local-render steps moved to
  `references/video-rendering.md`, and its worked example to
  `references/short-form-video-example.md`, so script-only runs load less.
  `community-post-generator`'s per-platform research moved to
  `references/community-research.md` and its examples to
  `references/community-post-examples.md`.
- `/marketing-skill:marketing-setup` is under 4 KB again, so Codex turns
  it into a skill.
- CI: repo checks (skill frontmatter, command size, paths the skills point
  at), dry-run smoke tests for both publish scripts, templates in sync
  with `build.py`, and `check.js` over every template.

## 0.7.0 (2026-10-03)

- 22 everyday FYP templates (POV, tier list, text-message skit, storytime,
  and more), meme sound effects, and `check.js`, the QA pass.
- Codex support.
- Voiceover support in the renderer, free local voices with Kokoro
  (`voice.js`), and beat analysis for licensed tracks (`beats.js`).
- A 16:9 explainer video of the plugin (`media/explainer/`).

## 0.6.0 (2026-10-02)

- Real backgrounds (stock photos and clips via `media.js`, or AI images)
  and a per-project sonic identity for rendered videos.

## 0.5.0 (2026-10-02)

- A local video renderer with an original soundtrack (`scripts/video/`).

## 0.4.1 (2026-10-02)

- Better discoverability in skill search and plugin directories.

## 0.4.0 (2026-09-26)

- `short-form-video` for YouTube Shorts, Instagram Reels, and TikTok.

## 0.3.0 (2026-09-26)

- `email-outreach`: personalized daily cold outreach with prospect
  research and deduplication.

## 0.2.0 (2026-09-25)

- Content calendar, three more content skills, and the approval-gated
  publish step.
- `community-post-generator` for Reddit, Product Hunt, Hacker News, Indie
  Hackers, Discord, Slack, Telegram, and dev.to.

## 0.1.0 (2026-09-25)

- The first five marketing skills as a Claude Code plugin.
