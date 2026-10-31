# Hooks

The first second decides whether anyone watches the rest. `short-form-video`
reads this file when it writes a hook, and offers the user three, each of a
different type below, so the choice is real. With the renderer's hook
variants (`data-variant`, see `video-rendering.md`), all three can be
rendered and tested. `scripts/video/hook.js` checks a hook (or three, or a
whole script) against this file before anything is rendered.

## What every hook needs

- **It works with the sound off.** It's on screen from the first frame, as
  text, because many viewers decide before the audio registers. The first
  frame is also the default cover, so it stays clean and readable even when
  the visual hook moves right after it.
- **Short.** Under about 8 words on screen; readable in a second.
- **Specific.** A number, a named situation, a concrete result. "3 invoice
  mistakes" beats "tips for freelancers".
- **True, and kept.** The video delivers what the hook promises, early.
  A hook the video doesn't pay off is how a post gets swiped away at second
  three, and how an account loses trust. No made-up statistics, results, or
  offers.
- **In the brand's voice.** Banned words in `brand-voice.md` apply.
  Lowercase and slang only if the voice is that casual.

## The three layers

A hook can work on three layers at once, and the strongest use all three,
each doing a different job in the same first second:

| Layer | What it is | In a script |
|---|---|---|
| Text | The words on screen from frame 0 | `hook:` in the frontmatter (or line 1, in the bold look) |
| Spoken | The first thing said, starting at once | Line 1 |
| Visual | What moves or changes in the first half second | `hook-fx:`, and line 1's picture |

The text and the spoken line shouldn't just repeat each other: the text
names the problem, the voice asks about it, and the picture shows it.
For a software ad:
- Visual: the screen glitches into the product (`hook-fx: glitch`).
- Text: "you're doing this the hard way".
- Spoken: "Too many tools, too many tasks?"
- Then the product solving it, on screen, by second three.

In the bold look the text and the first spoken line are the same words on
purpose (the line is the caption); the visual layer still applies.

## Hook types

| Type | Shape | Example (fictional invoicing app) | Best for |
|---|---|---|---|
| Pattern interrupt | An unexpected picture, sound, or edit breaks the scroll; always paired with a text hook | The screen glitches, then: "your invoice just paid itself" | Ads in a busy feed |
| Problem-solution | Name the problem the viewer has right now, promise the fix | "you're losing money on every late invoice" | Ads, explainers |
| Curiosity | What happened, without the ending | "a client paid in 4 minutes. here's why" | Storytime, case studies |
| Before and after | The change, stated or shown up front | "14 steps to invoice. now it's 3" (only if true) | Demos, launches |
| POV | The viewer inside a moment they've lived | "pov: the client asks to pay next month" | Everyday posts |
| Contrarian | A belief the brand holds that most don't | "late fees don't get you paid faster" | Hot takes, thought leadership |
| Warning | A mistake to stop making | "stop sending invoices on Fridays" | Tips, how-tos |
| Demonstration | The product doing the job, from the first frame | The invoice sent in one tap, with "sent in 1 tap" on screen | App and product ads |
| Storytelling | An intriguing moment from a story | "three months ago I almost quit freelancing" | Founder stories, brand stories |
| Statistic | A real number that reframes the problem | "most invoices get paid 9 days late" (only with a real source) | Educational ads |
| Social proof | Real customers or results | "why our clients stopped chasing payments" (only real, with permission) | Testimonials, case studies |
| Question | A question the viewer answers in their head | "do you still invoice from a spreadsheet?" | FAQ, comment bait |
| Listicle | A countable payoff | "3 invoice mistakes that cost you a week" | Tips, countdowns |
| Reaction | A real (or clearly acted) surprise | "wait, it chases the payment for you?" | Demos, UGC ads |
| Offer | The offer, plainly | "your first 10 invoices are free" (only if it's live) | Promotions, retargeting |
| Callout | Who it's for, so the right people stop | "freelancers who hate chasing payments:" | Niche audiences |

Results, numbers, testimonials, and offers must be real and the user's to
share. If they aren't, use a different type.

## Visual hooks

What moves in the first half second, set with `hook-fx:` in a script (or
`--hook-fx` on `cut.js`). Every one leaves frame 0 clean, since it's the cover.

| Technique | Setting | What happens |
|---|---|---|
| Fast zoom | `zoom` | The camera pushes in fast toward the subject (the `ugc` default) |
| Glitch | `glitch` | The picture tears and its colors split, the hook's text jitters, under a glitch sound |
| Camera shake | `shake` | The frame and the hook jolt, under an impact (the `meme` default) |
| Flash | `flash` | A white flash and a zoom, under an impact |
| Kinetic typography | `bounce` | The hook's words swell one after another (the `kinetic` default); or the bold look |
| Rapid montage | `montage` | The first line opens on a burst of quick cuts, a picture per beat (the `fast` default) |
| Split screen | (a template) | `expectation-reality`, `before-after`, or `this-or-that` |
| Cinematic opening | `none` with `edit: cinematic` | A slow push, grain, a vignette, a warm grade; the mood is the hook |
| Demonstration | (the picture) | The user's screen recording or product shot behind line 1 |

## After the hook

- **Pay it off early.** A number promise ("3 mistakes") delivers the first
  one by about 40% of the way in, and all of them.
- **Re-hook a longer video.** Past about 20 seconds, a line around the
  middle ("but here's the part nobody tells you") holds the viewers who'd
  leave there.
- **One call to action**, matched to the goal: follow, comment a word, try it.
- The 15-second ad structure (hook, problem, demonstration, call to action)
  is in `editing-techniques.md`, with the edit for each part.

## Avoid

- Clickbait the video doesn't pay off ("you won't believe...").
- Throat-clearing: "hey guys", "so today I want to talk about", a logo
  intro before the point.
- Generic openers that fit any video: "here are some tips", "did you know".
- Manufactured statistics, invented testimonials, or an offer that isn't live.
- Claims about competitors, or about people's identity, health, or money
  worries meant to scare.
- A question with an obvious "no" ("want to waste money?").

## Checking hooks

```
node scripts/video/hook.js "you're losing money on every late invoice"
node scripts/video/hook.js "hook one" "hook two" "hook three"
node scripts/video/hook.js --script state/videos/<date>-<slug>.md
```

It names each hook's type, fails one with a real problem (over 8 words on
screen, throat-clearing, a generic opener, clickbait, an obvious-"no"
question, a banned word), gives advice on the rest (nothing specific, not
about the viewer), and flags every number, result, testimonial, or offer to
confirm with the user. Given three, it checks they're three different
types. Given a script, it checks all three layers, how long line 1 takes to
say, the payoff of a number promise, a single call to action, and a re-hook
in a longer video. `compose.js` runs the same check on `hook:` and prints
any problem.

## Testing hooks

- Write three, each of a different type, and let the user pick, or render
  all three as variants of one page: everything after the hook stays the
  same, so the hook is the only thing being tested.
- Instagram's trial reels show a reel to non-followers first, which suits
  testing variants; posting a different variant to each platform also
  works. Compare the share of viewers still watching after three seconds
  (each platform's own analytics shows it) rather than likes.
- Log which hook ran where in `state/video-log.md`, with its type and its
  visual hook, so the next video can start from what worked for this account.
