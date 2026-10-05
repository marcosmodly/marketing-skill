# Explainer video

A 1920x1080 (16:9), 60fps explainer of this plugin. v2 reworks v1 after
feedback on r/claudeskills:

- **Music:** a licensed track instead of the generated loop.
- **Voiceover:** your own recording.
- **Readable on a phone:** nothing on screen under 40px.
- **Real content:** the skill folders, `brand-voice.md`, frames from the
  plugin's own templates, and the approval checkpoint from `EXAMPLE.md`,
  instead of mock screens.

`explainer.html` is the animated page. `render.js` renders it with
`scripts/video/render.js` (frame-exact seeking, the music and voice mix at
-14 LUFS), at landscape size and in parallel. v1 is in git history.

## Credits

Put these in the description wherever the video is posted:

```
Music from #Uppbeat (free for Creators!): https://uppbeat.io/music/tracks/21-on-the-block/funky-diesel License code: WKCBH1LMDV3AQDIE
Voiceover: AI voice generated with ElevenLabs (elevenlabs.io)
```

The track and the voice files aren't in the repo (both are git-ignored):
the track's license doesn't allow redistributing the file, and the voice
is one ElevenLabs take split into `assets/voice-1.wav` ... `voice-8.wav`
at the pauses between paragraphs.

## Making v2 with your voice and music

The lines can be your own recordings, or a free generated voice from the
plugin's `scripts/video/voice.js` (Kokoro, runs locally, no key or cost;
it needs `npm install kokoro-js` in `scripts/video` once, and
`huggingface.co` reachable for the first model download). Audition the
first line, then generate all eight as `assets/voice-1.wav` ...
`voice-8.wav` and use `VOICE = 'assets/voice-{n}.wav'` in step 3:

```
node ../../scripts/video/voice.js --audition samples "I wanted Claude Code to handle the marketing work I kept putting off."
node ../../scripts/video/voice.js voiceover-script.md --out assets --voice af_heart
```

1. Record the eight lines in `voiceover-script.md` as `assets/voice-1.m4a`
   ... `assets/voice-8.m4a` (or generate them, above).
2. Measure the lines and paste the printed `LINES` into `explainer.html`:

   ```
   node render.js --voice-lengths assets
   ```

3. In `explainer.html`, set `VOICE = 'assets/voice-{n}.m4a'` (or `.wav`).
   The music is `assets/music/funky-diesel.mp3`, which git ignores because
   its license doesn't allow redistributing the file, so put it there
   before rendering. The page places the track so its ending lands at the
   video's end and moves each scene change onto a beat. For a different
   track, point `TRACK` at it and replace `TRACK_LENGTH`, `TRACK_LIFT`, and
   `TRACK_BEATS` with the output of
   `node ../../scripts/video/beats.js assets/music/<file> --json`.
4. Check and render:

   ```
   node render.js explainer.html --check                 # no visible text under 40px
   node render.js explainer.html --sheet --every 2.5     # contact sheet of the whole timeline
   node render.js explainer.html marketing-skill-explainer.mp4
   ```

Other options: `--stills 12,40` for single frames, and `--from 30 --to 45`
for a silent preview of one stretch. `render.js` finds Playwright in
`scripts/video/node_modules`, or in a global install when `NODE_PATH` points
at it.
