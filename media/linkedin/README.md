# The LinkedIn cut

A 33-second video of the plugin made for LinkedIn's feed: 1080x1350 (4:5,
the shape that takes the most room on a phone), no voiceover, with the words
on screen carrying it, since LinkedIn autoplays videos muted. It's cut to
Funky Diesel by 21 On The Block (108 BPM), with every cut and word landing on
its beat.

| Time | What's on screen |
|---|---|
| 0–4.4s | The hook, on screen from the first frame: "You ship code every day. Your marketing doesn't." The plugin as a coral cube with a terminal prompt, charging up |
| 4.4–8.9s | The track's lift: "Now it does." The cube bursts into its 14 skills, as two rings of app tiles orbiting it |
| 8.9–13.3s | "Research your rivals." A competitor brief on the made-up Acme writes itself under a magnifying glass, and its sources fly out ticked |
| 13.3–17.8s | "It writes the posts. / ads. / emails. / whole week." A carousel of what it writes turns on every other beat |
| 17.8–20s | A bar of the track's breakdown: "And the videos?" One dark phone |
| 20–24.4s | The full groove again: "It makes those too." A helix of phones playing the templates' real frames |
| 24.4–27.8s | "Nothing posts until you say yes." A cursor presses Approve on the beat, and the publish queue ticks green |
| 27.8–30s | "Open source." FREE in 3D letters, one per eighth note, on a glossy floor |
| 30–33.3s | The mascot waves inside an orbit of its skills; the name, the repo, and "Link in the comments" |

- `body.html`: the timeline: the shots, the words and when each lands,
  the flashes on the cuts, and the sound cues.
- `shots.js`: the seven 3D shots, written against the engine in
  `scripts/video/templates/3d.html` (its mascot, materials, and helpers),
  each with a bloom pass.
- `overlay.css`: the look of the words: Inter Display headlines rising out
  of a mask, slams on the drops, and the end card.
- `build.py`: cuts the music edit from the track, stretches the page's timing
  to the track's tempo, splices those three into the 3D template, and writes
  `linkedin.html` (don't edit it by hand); `--master` levels the final mix.
- `assets/`: the templates' real frames (from `docs/gallery/`), the mascot
  icon, and Inter Display Black as a three.js typeface for the 3D letters
  (Inter is under the SIL Open Font License).
- `marketing-skill-linkedin.mp4` and `marketing-skill-linkedin.jpg`: the
  video and its cover.

## The sound

The music is Funky Diesel by 21 On The Block, from Uppbeat. Its credit goes
in the post (Uppbeat's free license requires it), and the file isn't in the
repo (git-ignored; the license doesn't allow sharing it):

```
Music from #Uppbeat (free for Creators!): https://uppbeat.io/music/tracks/21-on-the-block/funky-diesel License code: WKCBH1LMDV3AQDIE
```

`build.py` cuts an edit from it in whole bars of its beat (`beats.js`: 108
BPM): the groove building for the hook, so the track's big lift lands on "Now
it does." at 4.4s; a bar of its breakdown under "And the videos?"; and its
full section again on "It makes those too." at 20s, fading out under the end
card. `body.html` is written on a 120 BPM grid (a beat every 0.5s), and
`build.py` stretches every time on it by 120/108, so the cuts stay on the
track's beats; the 3D runs on the same stretched clock.

A few unpitched effects sit on top, so nothing clashes with the track's key:
impacts on the two drops and the first letter of FREE, whooshes on the cuts,
swishes on the carousel, a reverse swell into the break and a riser into the
second drop, and a click on Approve. The track ducks a little under each.
The final mix is leveled to -18 LUFS, quieter than the -14 the renderer
aims for, so the music sits back.

## Making it again

From this folder, with the track at `assets/funky-diesel.mp3`:

```
python3 build.py
node ../../scripts/video/render.js linkedin.html --stills 0,4.8,10.4,15.1,20.9,26,28.8,31.8
node ../../scripts/video/render.js linkedin.html marketing-skill-linkedin.mp4 --cover 0 --workers 4
python3 build.py --master marketing-skill-linkedin.mp4 --lufs -18
```

The render takes about 15 minutes on a 4-core machine without a graphics
card (every frame is 3D with bloom). To use a different
track, put it in `assets/`, read its beat with `scripts/video/beats.js`, and
change `TRACK`, `FIRST_BEAT`, `BEAT`, and `PIECES` in `build.py` and
`data-bpm` in `body.html`. For louder or quieter sound, change `--lufs`.
