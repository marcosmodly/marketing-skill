# Sound guide

How a project gets its sound in videos rendered by `scripts/video/render.js`.
`short-form-video` and `/marketing-skill:marketing-setup` read this file to
propose a **sonic identity**: one genre, tempo, key, energy, and signature
hook, saved in `references/brand-voice.md` and used for every video. Hearing
the same hook and sound video after video is what makes it recognizable,
the way a jingle works.

## The genres

The renderer composes original music in eight genres (`<body data-music>`).

| Genre | What it sounds like | Tempo (default) | Mode | Fits |
|---|---|---|---|---|
| `pop` | Bright plucked synth chords, punchy kick and clap, a plucked lead | 110–124 (118) | major | Consumer apps, DTC brands, lifestyle, broad audiences |
| `house` | Four-on-the-floor kick, offbeat open hats, organ stabs, offbeat bass | 120–126 (124) | minor | Fitness, fashion, nightlife, launches, energetic 18–34 audiences |
| `hiphop` | Half-time trap groove, 808 bass, hi-hat rolls, a bell lead | 130–150 (140) | minor | Gen Z, streetwear, gaming, creators, music |
| `acoustic` | Strummed guitar, shaker, snaps, a harp-like lead | 90–110 (100) | major | Food and drink, local business, wellness, travel, handmade |
| `cinematic` | String swells, low impacts, toms, a slow build | 70–100 (90) | minor | Big launches, brand stories, nonprofits, fundraising |
| `tech` | Clean arpeggios, steady kick, an electric-piano lead | 105–120 (112) | major | B2B SaaS, developer tools, fintech, productivity, explainers |
| `lofi` | Dusty electric piano, swung boom-bap drums, vinyl crackle | 75–90 (84) | minor | Study and productivity, creators, coffee and cozy brands |
| `calm` | Soft keys and pad, a held bass, light shaker, a bell lead | 80–96 (88) | major | Testimonials, healthcare, finance, team intros, sensitive topics |

`data-music="none"` keeps only the sound effects.

## Picking a sonic identity from the project

Read the project's audience, tone, and product (from `brand-voice.md` and
the project's README) and match them:

| Signal in the project | Leans toward |
|---|---|
| Young, trend-driven audience (Gen Z, gaming, streetwear) | `hiphop` or `house`, energy 4 |
| Broad consumer audience, playful or upbeat tone | `pop`, energy 3–4 |
| Professional or technical buyers, "confident, plain-spoken" tone | `tech`, energy 3 |
| Warm, human, local, or handmade | `acoustic`, energy 2–3 |
| Trust-first (health, money, care) or a reassuring tone | `calm`, energy 2 |
| Relaxed, cozy, or creator-focused | `lofi`, energy 2 |
| Mission-driven, or a big moment | `cinematic`, energy 3 |

- **Mode:** major reads upbeat and warm; minor reads serious, driven, or
  edgy. Use the genre's default unless the tone clearly says otherwise.
- **Energy (1–5):** 1–2 is sparse, sitting under talking-head-style text;
  3 is the default; 4–5 adds hats, open hats, fills, and doubles the hook
  for hype. A single video can move energy up or down one step for its
  type, e.g. +1 for an announcement. The rest of the identity stays fixed.
- **Key:** any; pick one and keep it. Changing key between videos weakens
  recognition more than any other setting.
- **Testimonials and sensitive topics** use `calm` whatever the identity
  says, so the music never undercuts what someone said. Keep the
  project's key and hook.

Propose two identities, each with one line on why it fits. Render a
preview of each so the user can listen before choosing:

```
node scripts/video/render.js --sample tech preview-a.m4a --motif "1 5 3 5 | 6 5 3 2" --key C --mode major --energy 3
node scripts/video/render.js --sample acoustic preview-b.m4a --motif "1 2 3 5 | 3 2 1 -" --key A --energy 2
```

Each preview takes a few seconds. Claude can't hear audio, so the user's
ear decides; never call a hook "catchy" on Claude's say-so.

## The hook (`data-motif`)

Two bars of scale degrees. Each bar's notes share it equally, so four
notes are quarter notes and eight are eighths. `'` raises a note an octave,
`,` lowers it, `-` holds the previous note, and `.` is a rest. Bars are
separated by `|`.

The hook is the melody at the drop, answered by a variation every four
bars. It closes every video as a sonic logo: its first three notes, then
home on the final beat. What makes a hook stick:
- Short (two bars), and heard more than once.
- Mostly steps, with one leap for character.
- A rhythm you could clap: a rest or held note helps.
- It ends on a stable note (1, 3, or 5), or on 2 if it should feel
  unresolved until the logo.

A library to start from (each genre's default is marked):

| Hook | Character |
|---|---|
| `1 3 5 3 \| 6 5 3 -` | Bright, rising, friendly (`pop` default) |
| `1 . 3 5 \| 4 3 1 -` | Driving, club (`house` default) |
| `5 . 3 1 \| 2 . 1 -` | Dark, laid back (`hiphop` default) |
| `1 2 3 5 \| 3 2 1 -` | Warm, simple, folk (`acoustic` default) |
| `1 - 5 4 \| 3 - 2 -` | Epic, open-ended (`cinematic` default) |
| `1 5 3 5 \| 6 5 3 2` | Busy, optimistic (`tech` default) |
| `3 . 1 5, \| 1 - . .` | Lazy, nostalgic (`lofi` default) |
| `5 3 2 1 \| 2 - 1 -` | Gentle, reassuring (`calm` default) |
| `1 1 5 5 \| 6 6 5 -` | Playful, sing-song (kids, games) |
| `5 6 5 3 \| 2 3 1 -` | Confident, jingle-like (retail, food) |
| `3 5 6 1' \| 6 5 3 -` | Soaring, aspirational (education, travel) |
| `1 3 2 4 \| 3 5 4 -` | Curious, stepwise (explainers, science) |

Write your own if none fits. The renderer warns and falls back to the
genre's default if a hook can't be read.

## Licensed tracks instead

For real produced music, put the file in the page's `assets/` folder and
set `<body data-music-src="assets/track.mp3" data-music-start="12">`
(seconds into the track). The renderer trims it to the video, fades it in
and out, dips it a few dB under each sound effect, and mixes it to the same
loudness as everything else.

Only use a track the user has a license for, and record where it came
from, so the credits stay with the video:

```
node scripts/video/media.js credit assets/track.mp3 --source "Pixabay Music" --license "Pixabay Content License" --link "<track page>"
```

Places to get one (check each track's own terms; they vary):
- **YouTube Audio Library:** free, in YouTube Studio. Some tracks require a
  credit line, and the license is meant for YouTube.
- **Pixabay Music:** free under the Pixabay Content License, including
  commercial use.
- **Paid libraries** (Epidemic Sound, Artlist, Musicbed): a subscription
  covers social posting for the subscribed accounts.
- **AI music services** (Suno, Udio, ElevenLabs Music): commercial use
  depends on the plan; free tiers often exclude it.
- **Creative Commons** (ccMixter, Free Music Archive, Openverse): needs a
  credit line, and avoid NC (non-commercial) licenses for a business
  account.

Never use a popular song without a license. Platforms mute or claim the
video, even if the clip is short.

**Trending sounds** only exist inside each app. If the user would rather
post with one, they add it in the app and turn the video's own audio down.
Posting through an API can't add one.
