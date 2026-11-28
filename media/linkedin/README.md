# The LinkedIn cut

A 30-second video of the plugin made for LinkedIn's feed: 1080x1350 (4:5,
the shape that takes the most room on a phone), no voiceover, with the words
on screen carrying it, since LinkedIn autoplays videos muted. It's cut to an
original 120 BPM score, with every cut and word landing on the beat.

| Time | What's on screen |
|---|---|
| 0–4s | The hook, on screen from the first frame: "You ship code every day. Your marketing doesn't." The plugin as a coral cube with a terminal prompt, charging up |
| 4–8s | The drop: "Now it does." The cube bursts into its 14 skills, as two rings of app tiles orbiting it |
| 8–12s | "Research your rivals." A competitor brief on the made-up Acme writes itself under a magnifying glass, and its sources fly out ticked |
| 12–16s | "It writes the posts. / ads. / emails. / whole week." A carousel of what it writes turns on every beat |
| 16–18s | The break: "And the videos?" One dark phone |
| 18–22s | The second drop: "It makes those too." A helix of phones playing the templates' real frames |
| 22–25s | "Nothing posts until you say yes." A cursor presses Approve on the beat, and the publish queue ticks green |
| 25–27s | "Open source." FREE in 3D letters, one per eighth note, on a glossy floor |
| 27–30s | The mascot waves inside an orbit of its skills; the name, the repo, and "Link in the comments" |

- `body.html`: the timeline: the shots, the words and when each lands,
  the flashes on the cuts, and the sound cues.
- `shots.js`: the seven 3D shots, written against the engine in
  `scripts/video/templates/3d.html` (its mascot, materials, and helpers),
  each with a bloom pass.
- `overlay.css`: the look of the words: Inter Display headlines rising out
  of a mask, slams on the drops, and the end card.
- `build.py`: splices those three into the 3D template and writes
  `linkedin.html`. Don't edit `linkedin.html` by hand.
- `assets/`: the templates' real frames (from `docs/gallery/`), the mascot
  icon, and Inter Display Black as a three.js typeface for the 3D letters
  (Inter is under the SIL Open Font License).
- `marketing-skill-linkedin.mp4` and `marketing-skill-linkedin.jpg`: the
  video and its cover.

## The sound

An original score from `scripts/video/soundtrack.js`, nothing licensed, so
there's no credit line to add: the `tech` genre at 120 BPM in D major,
energy 4, with the plugin's hook (`1 5 3 5 | 6 5 3 2`). A riser builds into
the drop at 4s, a break thins the beat out under "And the videos?" (16–18s),
a second riser lands on the second drop at 18s, and the hook resolves on
the last beat. The effects land on what's on screen: a sub hit on frame 0,
ticks under the hook's words, impacts on the drops and on each letter of
FREE, a click and a ding on Approve. Mixed to -14 LUFS.

## Making it again

From this folder:

```
python3 build.py
node ../../scripts/video/render.js linkedin.html --stills 0,4.3,9.4,13.6,18.8,23.4,25.9,28.6
node ../../scripts/video/render.js linkedin.html marketing-skill-linkedin.mp4 --cover 0 --workers 4
```

The render takes about an hour on a 4-core machine without a graphics card
(every frame is 3D with bloom); with a GPU it's minutes. To use a licensed
track instead, put it in `assets/` and add `data-music-src="assets/track.mp3"`
to the `<body>` in `body.html` (see "The sound" in
`references/video-rendering.md` for lining its beat up with the cuts).
