# r/opensource post, with video

Drafted with `community-post-generator` on 2026-10-09. The video is
[`video.mp4`](video.mp4) in this folder (1920x1080, 44 s, 60 fps, 5.1 MB),
rendered from [`video.html`](video.html).

## Community Research Summary

**Source Confidence: Mixed.** reddit.com was blocked by this run's network
policy (every path on the domain, including the `.json` endpoints), and
neither the Reddit mirrors nor archive.org was reachable, so everything
below comes from search results:

- **Secondary (official), but old:** r/opensource's own moderator post
  "New post-flairs" (Sept 30, 2022), seen through a search snippet of a
  Reddit mirror, says promotional posts must use the **Promotional**
  flair and still get the same scrutiny as before. These are the
  subreddit's own words, but they're four years old.
- **Secondary (third-party):** two rules-checker sites (Thread Otter,
  checked July 2026; okara.ai, August 2026) say the sub allows sharing
  open-source projects with the Promotional flair. They say it follows
  Reddit's guideline of keeping self-promotion under about 10% of your
  activity, expects you to engage in the comments, and removes drive-by
  promotion, low-effort posts, memes, and sensational titles. A community
  directory (The Hive Index) lists the flairs as Promotional, Discussion,
  Community, and Alternatives.
- **Not found:** any karma or account-age minimum. I also couldn't find
  any rule on AI-generated posts or projects. One Lemmy user complained
  that r/opensource had been flooded with AI-made posts, which is an
  opinion and not a rule, but it tells you the mood. I couldn't check
  whether the sub accepts video uploads either.
- **The usual post:** I couldn't sample recent posts myself. The same
  directory's snapshot (date unknown) had Promotional as the most common
  flair, 8 posts in a month, with examples like a prompt-to-video AI
  tool and an MIT-licensed engine simulator.

Searches run this session: `r/opensource subreddit rules self-promotion`,
`"r/opensource" rules "Promotional" flair moderators 2026`,
`r/opensource subreddit AI generated posts rule`, and an r/opensource
flair-list search.

## Go / No-Go

**Go, but this is a lean, not a confirmed rule.** The one rule I have in
r/opensource's own words (use the Promotional flair) is a 2022 mod post
seen through a search snippet. Everything else comes from third-party
summaries. Open the live rules page before posting, and check two things
in particular: that there's no rule against AI-assisted projects or
posts, and that video posts are allowed.

## Drafted Post

**Post type:** Video, with body text (the "Images & Video" tab). If the
sub has no video tab, make it a Text post and drag `video.mp4` into the
top of the body.

**Flair:** Promotional

**Disclosure:** you're the author, and the body says so in the first
person. It also says the code was written mostly with Claude Code (see the
checklist).

**Title:**

> This video is one HTML file rendered frame by frame, with music from a zero-dependency JS synth (MIT)

**Body:**

```markdown
The video above is `media/opensource-post/video.html` in the repo, rendered by the repo's own `scripts/video/render.js`. No screen recording, no video editor, no stock music.

How it works, since that's probably the interesting part here:

- Every animation on the page is a Web Animation with an absolute start time. The renderer opens the page in headless Chromium through Playwright, pauses everything, and seeks to each frame's timestamp before it takes the screenshot. So the output is frame-exact even on a slow machine, and it can split the frames across a few browsers in parallel.
- The music comes from `soundtrack.js`, about 1,200 lines with zero dependencies. It synthesizes drums, bass, chords, and a short hook from a genre spec (there are 11, from lofi to phonk) in whatever key and tempo you give it. Sound effects land on cues the page declares, and they stay in the music's key. ffmpeg muxes it all and mixes to -14 LUFS, which is what YouTube, Instagram, and TikTok normalize to.
- The page knows the tempo (112 BPM here), so the scene cuts sit on bar lines.

The renderer is one piece of a bigger project: 12 marketing skills for Claude Code that also load in Codex. Competitor research, content calendars, SEO briefs, cold email drafts, Reddit and HN posts that read the community's rules first, and short-form video. Each skill is a plain SKILL.md. The shared config and the drafts are Markdown files, and the two publish scripts are stdlib-only Python. There's no backend and nothing of mine running anywhere.

The rule I care most about: nothing posts or sends until a person replies in the conversation naming what to send. If a scheduled run fires with nobody around, the drafts just wait.

Disclosure, since it comes up here a lot: most of the code was written with Claude Code, with me directing and reviewing it, and the commit history shows that. The skills need an AI agent to run. The renderer and the publish scripts don't. They run on their own with Node, Playwright, ffmpeg, and Python. This post started as a draft from the plugin's own community-post skill, and I edited it.

Repo (MIT): https://github.com/marcosmodly/marketing-skill

Two things I'd like opinions on:

1. Is seeking Web Animations in headless Chromium a sane way to do this, or is there an open-source tool I should have used instead?
2. Would the renderer be more useful as its own package, split out from the plugin?
```

Self-check: Promotional flair is from the flair list above, and the
author is disclosed. The title is specific, not sensational, and doesn't
ask for upvotes. No em dashes, no throat-clearing opener, no triadic
padding, and nothing from the banned-words list. Every claim in the post
and the video was checked against the repo: `soundtrack.js` is 1,233
lines with no `require`, it has 11 genres, there are 29 templates, the
license is MIT, the publish scripts are stdlib-only, and Claude is the
author of most commits.

## Compliance Checklist

- [ ] Open reddit.com/r/opensource/about/rules and the sidebar. Confirm
      the Promotional flair is still the rule and that there's no ban on
      AI-assisted projects or posts. If AI-assisted projects are banned
      outright, this is a No-Go.
- [ ] Check that the submit form has an "Images & Video" tab. If it
      doesn't, use the Text-post fallback above.
- [ ] Your self-promotion should be well under about 10% of the
      account's activity. This repo has already been posted to
      r/claudeskills, so if this account mostly posts about this repo,
      comment around the sub for a while first. Never use a second
      account or ask for upvotes.
- [ ] Edit the body into your own words before posting, so the "I edited
      it" line is true. Change "with me directing and reviewing it" if
      that isn't how you built it. Remove the disclosure only if you
      really wrote the post yourself.
- [ ] Stay around to answer comments for the first couple of hours. The
      sub removes drive-by promotion.
- [ ] Don't cross-post this same text to other subreddits. Each one gets
      its own rules check and its own angle.

## Next Step

Post it by hand: upload `video.mp4`, paste the title and body, pick the
Promotional flair. The direct-post path in `publish_direct.py` can only
send Reddit self-posts (`kind: self`), so it can't upload the video.
It also needs a Reddit API app, and since late 2025 those go through a
manual approval queue. Once it's up, add a row to `state/video-log.md`
with the link, and paste its numbers back in later.
