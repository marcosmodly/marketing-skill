# Hooks

The first second decides whether anyone watches the rest. `short-form-video`
reads this file when it writes a hook, and offers the user three, each of a
different type below, so the choice is real. With the renderer's hook
variants (`data-variant`, see `video-rendering.md`), all three can be
rendered and tested. `scripts/video/hook.js` checks a hook (or three, or a
whole script) against this file before anything is rendered, and
`hook.js --goal <goal>` lists the types to try first for a video's job, with
the templates below.

A hook is not just the first sentence. It's what the viewer sees, reads, and
hears in the first second, and the question or feeling that makes them stay.
It doesn't have to be loud: a quiet, specific, unusual opening can stop the
scroll as well as a fast zoom.

## What every hook needs

- **It works with the sound off.** It's on screen from the first frame, as
  text, because many viewers decide before the audio registers. The first
  frame is also the default cover, so it stays clean and readable even when
  the visual hook moves right after it.
- **Short.** Under about 8 words on screen; readable in a second.
- **Specific.** A number, a named situation, a concrete result. "3 invoice
  mistakes" beats "tips for freelancers".
- **One promise, kept.** The hook raises one question or makes one promise,
  and the video answers it, early. Know which line does before writing the
  rest (see "The promise and where it's kept"). A hook the video doesn't pay
  off is how a post gets swiped away at second three, and how an account
  loses trust. No made-up statistics, results, or offers.
- **In the brand's voice.** Banned words in `brand-voice.md` apply.
  Lowercase and slang only if the voice is that casual.

## The three layers

A hook works on three layers at once, and the strongest use all three, each
doing a different job in the same first second, all about the same idea:

| Layer | What it is | In a script |
|---|---|---|
| Text | The words on screen from frame 0 | `hook:` in the frontmatter (or line 1, in the bold look) |
| Audio | The first thing heard: the first spoken line, starting at once, and the sound under it (the music building, a cue, or silence) | Line 1, `hook-audio:`, a `[sfx: ...]` on line 1 |
| Visual | What moves or changes in the first half second | `hook-fx:`, and line 1's picture |

The text and the spoken line shouldn't just repeat each other: the text
names the problem, the voice asks about it, and the picture shows it.
For a software ad:
- Visual: the screen glitches into the product (`hook-fx: glitch`).
- Text: "you're doing this the hard way".
- Spoken: "Too many tools, too many tasks?"
- Then the product solving it, on screen, by second three.

In the bold look the text and the first spoken line are the same words on
purpose (the line is the caption); the visual and the sound still apply.

## Hook types

| Type | Shape | Example (fictional invoicing app) | Best for |
|---|---|---|---|
| Pattern interrupt | An unexpected picture, sound, or edit breaks the scroll; always paired with a text hook, and about the topic, never random | The screen glitches, then: "your invoice just paid itself" | Ads in a busy feed |
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

## Pick by the video's goal

Start from what the video is for, not from what's trending. The `goal:` in a
script's frontmatter also picks its look (`visual-design.md`); the last four
rows have no look of their own, so `hook.js --goal` takes them but a script
sets `look:` for them instead.

| `goal:` | The job | Try first |
|---|---|---|
| teach | Teach something | Problem-solution, Question, Warning, Listicle, Demonstration |
| trust | Build trust | Demonstration, Social proof, Statistic, Storytelling |
| entertain | Entertain | POV, Reaction, Pattern interrupt, Question |
| story | Tell a personal or brand story | Storytelling, Curiosity, Before and after |
| sell | Promote an app or product | Demonstration, Problem-solution, Offer, Social proof |
| suspense | Build suspense | Curiosity, Storytelling, Pattern interrupt |
| inspire | Inspire | Storytelling, Before and after, Contrarian |
| review | Analyze or review | Contrarian, Question, Statistic, Before and after |
| comedy | Make people laugh | POV, Reaction, Pattern interrupt |
| music | Music content | Pattern interrupt, Before and after, Reaction |
| transform | Show a transformation | Before and after, Curiosity, Demonstration |
| opinion | Share an opinion | Contrarian, Question, Statistic |
| series | Build a series | Storytelling, Curiosity, Before and after |
| discuss | Start a discussion | Question, Contrarian, POV |

Then, in order:

1. Write the video's message in one sentence, and the viewer's reason to care.
2. Pick one primary type from the row, and one visual technique that supports it.
3. Write the opening line in plain words; make the first shot understandable
   without sound.
4. Name the line that pays the hook off, and cut anything that delays the hook.

## Templates

Starting points, one row per type. Fill the brackets with the real topic and
situation; specific, honest wording beats any template. `hook.js --goal`
prints these for the types that fit.

| Type | Templates |
|---|---|
| Pattern interrupt | (a picture, not words) open on [the unexpected moment], then the text hook names it · the [empty room / blank screen] first, then [the finished result] · silence, then [the line that matters] |
| Problem-solution | still [doing the frustrating thing]? · if [problem], try this · a simpler way to [task] |
| Curiosity | I didn't expect [specific result] · the one thing about [topic] people miss · watch what happens when [action] |
| Before and after | from [starting state] to [result] · same [place or thing], completely different [feeling] · here's what changed when I [action] |
| POV | pov: you finally [relatable event] · pov: [recognizable situation] again · pov: you thought [expectation] |
| Contrarian | you don't need [common assumption] to [outcome] · the problem isn't [obvious answer], it's [alternative] · stop focusing on [less useful thing] |
| Warning | before you [action], check this · don't make this mistake with [topic] · this small detail causes [specific consequence] |
| Demonstration | here's what [tool] actually does · a faster way to [task] · watch this change |
| Storytelling | I almost gave up when [event] · it started with [small event] · I thought [belief], until [turning point] |
| Statistic | [real number] [what it measures] · one number in [real result] surprised me: [fact] |
| Social proof | here's what people noticed after trying [thing] · we asked [group] to test [thing] · the feedback that changed our next update |
| Question | why does [situation] happen? · which one would you pick? · what would you change first? |
| Listicle | [number] ways to [result] · [number] mistakes when [task] · [number] things I wish I knew about [topic] |
| Reaction | I wasn't ready for this result · I had to look at it twice · wait, it [does the surprising thing]? |
| Offer | how to [benefit] without [common frustration] · [the live offer, plainly] · if you need [result], start here |
| Callout | [who it's for] who [their situation]: · if you're a [role], this one's for you |

## Story shapes

Ways to frame a story that sit inside the types above. They're structures,
not scripts to copy: adapt each to the subject and audience.

| Shape | Opening | Reads as | Made here with |
|---|---|---|---|
| Confession | "I need to admit something..." | Storytelling | `storytime` template, or a narrated video with `hook-audio: silence` |
| Contradiction | "I wanted to be productive, so I did everything except the work" | POV | `pov`, `nobody-me` |
| Emotional turn | Starts funny, then a sincere line | Storytelling | `storytime`; the turn on a `[cut: fade]` |
| Delayed reveal | "I didn't understand it until later" | Curiosity | `reveal` template; a narrated video that answers it in the last third |
| Read receipt | A message read and not answered | POV | `text-chat` template |
| Relationship moment | "when you tell your partner you'll be ready in five minutes..." | POV | `pov`, `expectation-reality` |
| Mental reply | "the conversation I had in my head was completely different" | POV | `expectation-reality`, `text-chat` |
| Comment driver | "which version would you choose?" | Question | `this-or-that`, `tier-list`, `rating` |
| Progression | "day one looked like this. here's where it ended" | Before and after | `before-after`, `day-in-life`, a series (`series: week 2`) |

## Combinations

The strongest openings often pair two types, one on the text layer and one on
the visual or audio layer. Two clear ideas beat five competing effects.

| Pair | Example | Good for | Here |
|---|---|---|---|
| Pattern interrupt + curiosity | A sudden close-up, "what is this detail doing here?" | Visual reveals | `hook-fx: zoom` on a detail shot, a curiosity `hook:` |
| Problem-solution + demonstration | "tired of doing this by hand?", then the automated process | Software and tools | The problem as `hook:`, the screen recording behind line 2 |
| Question + before and after | "what if this room felt twice as large?", then the redesign | Design, transformations | `before-after` template, or a question `hook:` and the result on line 2 |
| Contrarian + explanation | "more effects won't fix a boring video", then better pacing | Education | `hot-take`, or a narrated video |
| Statistic + story | "we got 100 people to try it. here's what surprised us" (real numbers only) | Product and research stories | `[card: ...]` with `[source: ...]`, then the story |
| POV + comedy | "pov: you said this was a five-minute task" | Relatable entertainment | `pov` template, `look: playful` |
| Warning + demonstration | "don't make this export mistake", then the setting | Tutorials | `how-to` template, the setting in the phone frame |
| Offer + social proof | The benefit, then real user feedback | Product marketing | `promo`, then `testimonial` lines (real, with permission) |

`hook.js --script` names the pair a script's hook makes.

## Visual hooks

What moves in the first half second, set with `hook-fx:` in a script (or
`--hook-fx` on `cut.js`). Every one leaves frame 0 clean, since it's the cover.
Pick one that's about the subject: a glitch on a software ad, not on a
bakery's. Effects never rescue a weak idea.

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
| Demonstration / screen recording | (the picture) | The user's screen recording or product shot behind line 1 (`[bg: assets/screen.mp4]`), the cursor moving with purpose |
| Unusual close-up | (the picture) | Line 1 shows a detail that's hard to place (the user's close-up, or a "macro" stock query); line 2 reveals the whole. In a montage, `pull-out` from the detail does it in one move |
| Match cut | (the order) | Two shots whose shapes or motion line up, cut between with `[transition: cut]` in a montage |
| Freeze frame | `[ramp: 0.6:0,1.4:1]` on a montage clip | The clip stops on the moment that matters, for a label, then runs on |
| Reverse reveal | (the order) | Line 1 is the finished result; "here's how it started" goes back to the beginning |

## Audio hooks

What's heard in the first second. Sound should explain, emphasize, or add
feeling, never fill a gap because an edit feels empty.

| Technique | Setting | When |
|---|---|---|
| Direct voice | Line 1, which starts at once (0.15s) on the most interesting sentence | Always: no greeting, no "in this video" (`hook.js` fails one) |
| Music build | `hook-audio: build` (the default): the intro chord builds under the hook and the beat drops on the cut out of it | Most videos |
| Sound drop | `hook-audio: silence`: line 1 is heard alone, then the music lands all at once on the drop (a licensed track is held back too, its lift still on the drop) | A confession, a serious line, a reveal: the contrast makes it matter |
| Sound effect | `[sfx: ping]` on line 1 (a `click`, `ping`, `cash`, `typing`...); `hook-fx:` brings its own (a glitch, an impact, a whoosh in styles with cut sounds) | When the sound is the picture: a notification, a tap, a sale |
| Natural sound | The clip's own sound: `[sound]` in a montage, `cut.js` on a take | Real footage: a pour, keys, a door, a room |
| Voice over action | Line 1's picture is already moving (a clip, a screen recording) while the voice explains it | Demos, processes |

## After the hook

- **Pay it off early.** A number promise ("3 mistakes") delivers the first
  one by about 40% of the way in, and all of them.
- **Re-hook a longer video.** Past about 20 seconds, a line around the
  middle ("but here's the part nobody tells you") holds the viewers who'd
  leave there.
- **One call to action**, matched to the goal: follow, comment a word, try it.
- The 15-second ad structure (hook, problem, demonstration, call to action)
  is in `editing-techniques.md`, with the edit for each part.

### The promise and where it's kept

Before editing, fill this in and show it with the three hooks:

| Item | Answer |
|---|---|
| Video topic, and who it's for | |
| What the viewer cares about | |
| Main message, in one sentence | |
| Primary hook type (and its pair, if any) | |
| On-screen text, and the first spoken line | |
| First visual, and the sound under it | |
| The question or promise the hook makes | |
| The line that answers it | |
| Call to action | |

A curiosity, question, or story hook that's never answered in the video
(only "in part 2") is false curiosity: answer it here, and make part 2 a new
question.

## Avoid

- Clickbait the video doesn't pay off ("you won't believe...").
- Throat-clearing: "hey guys", "so today I want to talk about", a logo
  intro before the point.
- A weak first frame: blank, a loading screen, a logo, or footage the viewer
  can't read at a glance.
- Generic openers that fit any video: "here are some tips", "did you know".
- Generic questions that give no reason to care: "do you like this?",
  "what do you think?", "thoughts?".
- Too much text: a paragraph on screen can't be read while scrolling.
- Effects unrelated to the message, or every hook type at once: three layers
  about one idea, not five ideas competing.
- Manufactured statistics, invented testimonials, or an offer that isn't live.
- Claims about competitors, or about people's identity, health, or money
  worries meant to scare.
- A question with an obvious "no" ("want to waste money?").

## Checking hooks

```
node scripts/video/hook.js "you're losing money on every late invoice"
node scripts/video/hook.js "hook one" "hook two" "hook three"
node scripts/video/hook.js --goal sell                      # the types to try first, with templates
node scripts/video/hook.js --goal sell "one" "two" "three"  # and which of these fit the goal
node scripts/video/hook.js --script state/videos/<date>-<slug>.md
```

It names each hook's type, fails one with a real problem (over 8 words on
screen, throat-clearing, a generic opener or question, clickbait, an
obvious-"no" question, a banned word), gives advice on the rest (nothing
specific, not about the viewer, a type that doesn't suit the goal), and flags
every number, result, testimonial, or offer to confirm with the user. Given
three, it checks they're three different types. Given a script, it checks
all three layers (the text, what's heard first, and what moves), names the
pair they make, how long line 1 takes to say, the payoff of a number promise,
where a question gets answered, a single call to action, and a re-hook in a
longer video. `compose.js` runs the same check on `hook:` and prints any
problem.

## Testing hooks

- Write three, each of a different type, and let the user pick, or render
  all three as variants of one page: everything after the hook stays the
  same (the footage, length, and call to action), so the hook is the only
  thing being tested.
- Instagram's trial reels show a reel to non-followers first, which suits
  testing variants; posting a different variant to each platform also
  works. Compare the share of viewers still watching after three seconds
  (each platform's own analytics shows it) rather than likes; then average
  watch time and completion, and the number the goal cares about (shares
  and saves for useful posts, comments for a discussion, clicks for an ad).
- One upload proves little: reach, timing, and the topic all move the
  numbers. `scripts/results.py` compares medians over several posts and says
  when there are too few to tell.
- Log which hook ran where in `state/video-log.md`, with its type and its
  visual hook, so the next video can start from what worked for this account.
