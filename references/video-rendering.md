# Rendering a video locally

How `short-form-video` makes the finished video on the user's machine with
`scripts/video/render.js`. The skill reads this file when the user opts in
to a local render (its steps 3 and 6). `${CLAUDE_PLUGIN_ROOT}` is the
plugin folder, resolved the way the skill describes.

## What it makes

Motion graphics (kinetic text, shapes, UI mockups) over stock photos, stock
video clips, or AI images, with an original soundtrack in the project's
sonic identity and sound effects synced to what's on screen. It's not
filmed footage of the user's product or people, and the only voiceover is
one the user records or supplies (or a free generated one, below). It
suits the types `video-types.md` marks Render or Render + your assets, not
anything that needs real people or places on camera. It costs nothing to
run.

Check it's usable with `node --version` (18+), `ffmpeg -version`, and
`node -e "require('playwright')"` run from `scripts/video`. If anything is
missing, give the user the one-time setup from README's "Rendering a
short-form video locally" section rather than installing it unasked.

## Start the page

Copy the template `video-types.md` or `fyp-formats.md` names, from
`${CLAUDE_PLUGIN_ROOT}/scripts/video/templates/`, to
`${CLAUDE_PLUGIN_ROOT}/state/videos/<date>-<slug>.html`. There are six
marketing templates (`promo`, `how-to`, `testimonial`, `faq`,
`announcement`, `team`) and 22 everyday ones (`pov`, `tier-list`,
`text-chat`, `storytime`, and the rest listed in `fyp-formats.md`). Put any
images the user supplied in `state/videos/assets/`.

Rewrite its scenes to the script: one scene per beat, the hook readable
within the first second, and every line of text inside the `.scene` box
(each platform's UI covers the bottom quarter and right edge). Keep the
template's colors and type unless `brand-voice.md` says otherwise.
Everyday templates use TikTok Sans, the platform's own caption font, and
the shared pieces (captions, stickers, stamps, chat and notification
mockups, tier lists, polls, timers) documented at the top of `promo.html`.

## The sound

Set the `<body>` music attributes from the Sonic Identity in
`brand-voice.md`: `data-music`, `data-bpm`, `data-key`, `data-mode`,
`data-energy`, `data-motif`.
- Testimonials and sensitive topics use `data-music="calm"`, keeping the
  project's key and hook.
- An announcement can raise energy one step.
- An everyday post can take its template's genre (`phonk` under a
  "nobody: / me:", `lofi` under a text skit), keeping the identity's key
  and hook, within what the brand voice allows (see "Everyday and FYP
  posts" in `sound-guide.md`). Its meme cues (`scratch`, `boom`,
  `rimshot`, `ding`, `buzzer`, and the rest) are listed there; one or two
  per video is plenty.
- Add `data-break="<start>-<end>"` under a quote or any moment the words
  should carry alone.
- **No identity saved yet:** propose two from
  `${CLAUDE_PLUGIN_ROOT}/references/sound-guide.md`, each with one line on
  why it fits. Render a preview of each (`node
  ${CLAUDE_PLUGIN_ROOT}/scripts/video/render.js --sample <genre> <out.m4a>
  --motif ... --key ... --mode ... --energy ...`, a few seconds each). Send
  both to the user to listen to, and save their pick to `brand-voice.md`
  before rendering. You can't hear audio, so their ear decides.
- **The user has a licensed track they'd rather use:** put it in
  `assets/`, set `data-music-src` and `data-music-start`, and record its
  license with `node ${CLAUDE_PLUGIN_ROOT}/scripts/video/media.js credit
  <file> --source ... --license ...`. Don't use a track without a license
  note. Then read its rhythm: `node
  ${CLAUDE_PLUGIN_ROOT}/scripts/video/beats.js assets/<file> --align <end
  of the hook, s> --duration <length>`. If the confidence is 0.5 or more,
  use the `data-music-start` it prints and move scene changes and key cues
  onto its bar (or beat) times; if it's lower, don't snap anything and time
  scenes to the voice or reading pace. Tell the user what you did ("104
  BPM, started at 0:32 so the drop hits as the hook ends, cuts on the
  bar"), and send an `--audio-only` render to check the sync, since you
  can't hear it.
- **Longer than about 45 seconds:** the generated music repeats the same
  few bars and wears thin, so ask for a licensed track instead. The
  renderer warns about it.

## A voiceover

The user's own recording, a free generated voice from
`${CLAUDE_PLUGIN_ROOT}/scripts/video/voice.js` (Kokoro, runs locally, no
key or cost; see "A free generated voice" in `sound-guide.md` for setup,
and send the user `--audition` samples to pick a voice, since you can't
hear them), or a voice they generate with a service they have their own
key for.

Write the script line by line, ask them to record each line as its own
file (`voice-1.m4a`, `voice-2.m4a`, ...), and put the files in `assets/`.
Add `data-voice="assets/voice-1.m4a"` to the element each line belongs
to; it plays at that element's `--voice` time, or `--in`. For one
continuous take, use `<body data-voice-src="..." data-voice-start="...">`
instead. Time each scene to its line's length (`ffprobe` the file). The
renderer trims the silence before each line, levels the lines to match,
and ducks the music and effects under the voice. Under a voice, keep sound
effects to scene changes; the renderer warns past one every 3 seconds.

Never imitate a real person's voice without their permission, and if the
voice is AI-generated, have the user check whether the platform asks for
an AI-content label.

## The backgrounds

Every scene has an empty `.bg` slot timed to it.
- **What to search for:** for each scene, pick a setting or mood that fits
  the beat and the project's audience (e.g. "small bakery counter
  morning", "city at night aerial"). Not the product, a person, or a
  result.
- **Stock photos and clips:** `node
  ${CLAUDE_PLUGIN_ROOT}/scripts/video/media.js search "<query>" --out
  ${CLAUDE_PLUGIN_ROOT}/state/videos/assets [--type video]` searches Pexels
  (`PEXELS_API_KEY`) and Pixabay (`PIXABAY_API_KEY`), both free keys, and
  Openverse (photos only, no key). It downloads into `assets/` and records
  each file's license and required credit in `CREDITS.md` there. With no
  keys set, say that Openverse is the only source and it has no video
  clips, and point to the free keys rather than going without.
- **AI-generated images:** only with a connected image tool. That's Figma
  Weave once the user's Figma account is linked (find the model with
  `weave_find_model`, then `weave_run_model`, which quotes a cost first),
  or Higgsfield. Show the quoted cost and get an explicit yes before every
  run, since it spends the user's credits. Download each result into
  `assets/` and record it with `node
  ${CLAUDE_PLUGIN_ROOT}/scripts/video/media.js credit <file> --ai "<tool /
  model>" --prompt "<prompt>"`.
- **Placing:** put `<img class="bg-media" src="assets/<file>" alt="">`, or
  `<video class="bg-media" src="assets/<clip>">`, in the slot.
- **Look:** a consistent set reads as produced. Prefer the same light and
  palette across scenes. Use `class="bg blur"` on busy images, and
  `class="bg tint"` to pull mismatched ones toward the brand color. The
  renderer darkens bright backgrounds automatically; for a busy one, add
  `blur` or a heavier `--shade` on the slot.
- **People and real things:** a testimonial's or team video's person is
  always their own photo, never stock or AI.

## Timing and cues

Set `<body data-duration>` to the script's length and `data-drop` to when
the hook ends, so the beat drops as the body starts. Put `data-sfx` cues
only on moments that should land: words popping in, list items, a
checkmark, a button press, a scene change. A sound on everything reads as
noise. The comment at the top of `promo.html` documents the sounds, music
settings, background slots, and attributes, and each template's own
comment says what to replace. Replace every bracketed placeholder; never
ship one.

## Preview, then render

The full render takes a couple of minutes, so preview first:
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/video/render.js <page> --check` lints
  the whole timeline in seconds: text outside the safe area, spilling out
  of its box, clipped, or running into other text or a card. Fix
  everything it lists (usually by shortening the line) and run it again
  until it's clean.
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/video/render.js <page> --slides`
  writes each scene's settled frame as a PNG to a `slides/` folder next to
  the page (`--stills <times>` picks the moments instead). Look at every
  one for what a lint can't judge: legibility over the background, emoji,
  and whether the joke reads.
- Those `--slides` PNGs double as a photo carousel (TikTok photo mode, an
  Instagram carousel). Offer that for `slideshow` and any list-style post.

Render: `node ${CLAUDE_PLUGIN_ROOT}/scripts/video/render.js <page>
${CLAUDE_PLUGIN_ROOT}/state/videos/<date>-<slug>.mp4`. The output is
1080×1920, 30fps H.264 with AAC audio mixed to about −14 LUFS, which is
what all three platforms expect. That file is what `--platform youtube`
uploads directly.

## Credits and labels

Copy the credit line from `assets/CREDITS.md` into every platform's
caption or description when it says one is required (Pexels, CC BY
photos, some tracks). If any AI image is photorealistic, tell the user to
switch on the platform's AI-content label when posting. TikTok, YouTube,
and Instagram all ask for it for realistic synthetic scenes.
