# Explainer video

`marketing-skill-explainer.mp4` is a 2-minute, 1920x1080 (16:9), 60fps
explainer of this plugin: the 12 skills, install, the shared brand voice,
a short demo of each skill, the end-to-end pipeline with its approval
checkpoint, and where publishing goes.

It's made with the plugin's own tools. `explainer.html` is an animated
page in the same style as the short-form templates, and `render.js` renders
it with `scripts/video/render.js` (frame-exact seeking, plus the
synthesized soundtrack: the `tech` sonic identity at 112 BPM, with sound
effects on the page's cues). Every scene starts on a bar of the music.

To re-render after editing the page (same setup as `scripts/video`: Node 18+,
ffmpeg, and Playwright):

```
cd media/explainer
node render.js explainer.html marketing-skill-explainer.mp4    # full render, a few minutes per worker
node render.js explainer.html --sheet --every 2                # contact sheet of the whole timeline
node render.js explainer.html --stills 14.5,52.8,91.8          # single frames
node render.js explainer.html preview.mp4 --from 83 --to 97    # one stretch, silent
```

`render.js` picks up Playwright from `scripts/video/node_modules`, or from a
global install when `NODE_PATH` points at it.
