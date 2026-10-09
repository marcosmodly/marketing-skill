# r/opensource post

The post is in [`reddit-post.md`](reddit-post.md): the rules research, the
Go, the title and body, and a checklist to run before posting.

[`video.mp4`](video.mp4) goes with it. It's 1920x1080, 44 seconds at
60fps, readable with the sound off (nothing on screen is under 40px).
The video is about how it was made: [`video.html`](video.html) rendered
by `scripts/video/render.js`, with the generated "tech" music from
`scripts/video/soundtrack.js` instead of a licensed track. So there are no
credits to add, and anyone can rebuild it from the repo. The phone
screens in it are frames from the plugin's own templates, shared with
the explainer (`../explainer/assets/frames/`).

## Rendering it again

Same setup as `scripts/video/` (Node 18+, ffmpeg, and Playwright), with
the landscape wrapper from the explainer:

```
node ../explainer/render.js video.html --check                 # no visible text under 40px
node ../explainer/render.js video.html --sheet --every 1.5     # contact sheet of the whole timeline
node ../explainer/render.js video.html video.mp4 --fps 60
```

Scenes cut on the music's bar lines (`START` in the page, in bars of
four beats at 112 BPM). Keep the whole video under 45 seconds: the
generated music repeats a few bars, and the renderer warns past that.
