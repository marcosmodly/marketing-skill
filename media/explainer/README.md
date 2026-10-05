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

## Making v2 with your voice and music

The lines can be your own recordings, or a text-to-speech voice through
OpenRouter. For that, the environment needs `OPENROUTER_API_KEY` set and
`openrouter.ai` allowed in its network access. Audition one line first,
then generate all eight as `assets/voice-1.mp3` ... `voice-8.mp3` and use
`VOICE = 'assets/voice-{n}.mp3'` in step 3:

```
node tts.js --model <model id> --voice <voice> --line 1
node tts.js --model <model id> --voice <voice>
```

1. Record the eight lines in `voiceover-script.md` as `assets/voice-1.m4a`
   ... `assets/voice-8.m4a`, and put the licensed track in `assets/`.
2. Measure the lines and paste the printed `LINES` into `explainer.html`:

   ```
   node render.js --voice-lengths assets
   ```

3. In `explainer.html`, set `VOICE = 'assets/voice-{n}.m4a'` and
   `MUSIC = 'assets/<track>'`.
   Record the track's license with `node ../../scripts/video/media.js credit
   assets/<track> --source ... --license ... --link ...`.
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
