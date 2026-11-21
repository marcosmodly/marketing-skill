# Editing techniques

How each short-form editing technique is made with this plugin's renderer,
for when the user names one ("add a whip pan", "glitch into the demo",
"speed-ramp the pour", "make it feel like a UGC ad") or asks for a look.
`short-form-video`, `clip-montage`, and `montage-video` read this file when
they choose how a video is cut. The settings live in
`scripts/video/edit.js` (the editing styles, transitions, and camera) and
in the shared editing block of `scripts/video/templates/build.py` (their CSS).
Graphics over the picture (lower thirds, callouts, motion graphics, kinetic
type, HUD elements) are in `scripts/video/graphics.js`; see
[Graphics](#graphics) below.

Three words to keep apart, because users mix them:
- A **hook** is the opening that stops the scroll, in up to three layers: the
  words on screen, the first thing said, and what moves in the first half
  second. [`hooks.md`](hooks.md) covers writing it.
- An **editing technique** is one way of cutting or moving the picture, text,
  or sound: a jump cut, a whip pan, a riser.
- An **editing style** is how it's cut, several techniques used together:
  UGC, fast-paced, cinematic. One word in the script sets it (`edit:`). The
  visual style (colors, type, captions, texture) is a **look**
  ([`visual-design.md`](visual-design.md)), which picks an editing style too.

## Editing styles

`compose.js` takes `edit:` in a script's frontmatter. `auto` (the default)
picks by the sound: loud genres (phonk, jersey, funk, house, hip-hop, or
energy 4 and up) get `fast`, quiet ones (cinematic, calm, lo-fi, acoustic)
get `cinematic`, and the rest get `ugc`. Say which one was picked, and offer
the others when the user describes a feel.

| `edit:` | The look | What it does | Good for |
|---|---|---|---|
| `ugc` | A creator's own edit | Clean cuts on the beat, a punch-in or a whip every third turn and on the payoff, a fast zoom on the hook, the camera punching in 8% on each `*keyword*`, a new picture at least every 3.2s, bouncing captions where the word being said swells, short J-cuts, an impact on the drop | Relatable product ads, talking heads (`cut.js` uses it by default), tips |
| `kinetic` | Typography-led | Clean cuts with an iris mask, wipe, or zoom on every other turn, the hook's words hopping one after another, captions that build word by word as they're said, dynamic zooms | Apps, SaaS, and tech explainers |
| `fast` | High energy | Punch-in cuts on the beat, a whip, glitch, or spin on every other turn, a burst of quick cuts in the hook (a rapid montage), a new picture every 2.2s, a riser into a flash on the drop with a shake, 12% punch-ins | Energetic hooks, quick product showcases, launches |
| `cinematic` | Slow and atmospheric | Dissolves, a light leak or blur dissolve every third turn, a film burn on the drop with a riser into it, soft captions on a dark halo, film grain, a vignette, a warm low-contrast grade, longer holds, J-cuts of 0.25s | Brand stories, emotional storytelling, founder stories |
| `meme` | Comedic timing | Hard cuts, exaggerated 16% punch-ins that shake on every keyword, a shaking hook with an impact | Skits, reactions, comment bait |
| `clean` | Plain | Crossfades and slow zooms, no extra sounds (the look before editing styles existed) | Quiet explainers, or when the user wants no effects |

Each style keeps one base cut for most of the video and saves its
conspicuous transitions for the moments that mean something: the drop out of
the hook, the payoff, a turn every few cuts, and any line marked `[cut: ...]`.
A different transition on every cut reads as random (`render.js --check`
notes it). `transitions: whip, punch` sets an explicit rotation instead, for
when the user asks for one.

`motion:` sets how much moves, separately from the style: `low` (no shakes,
flashes, glitches, spins, or whips; gentle punch-ins; calmer captions; longer
holds: for serious, premium, or calm videos, and anyone sensitive to motion),
`medium` (the style, but shakes only on the drop and no flashes or spins after it), or `high`
(the style as it is). A look (`look:`, in `visual-design.md`) sets the edit
and the motion together with the colors, type, and captions.

Two looks are styles of their own rather than edits: **3D motion design** is
`style: 3d` (the mascot, 3D titles, the product demo's screens) and **pixel
art** is `style: pixel`. An `edit:` still applies to them (the hook, punch-ins
on keywords, the drop), since their pictures sit in the same camera layer. In
pixel art the camera keeps the pixel grid: a punch-in is a whole step (12.5%,
so every art pixel grows from 8 to exactly 9 screen pixels), it jumps in and
out instead of gliding, a shake moves by whole pixels without tilting, and
`motion: low` has no punch-ins, since the smallest crisp one isn't gentle.
**Collage** has no preset: the closest are the `starter-pack` and
`slideshow` templates and the 3D `wall` shot.

Any part of a style can be changed on its own, in the frontmatter:

```
edit: ugc
hook-fx: glitch          # the visual hook: zoom, shake, glitch, flash, bounce, montage, or none
hook-audio: silence      # under the hook: build (the music's intro, the default) or silence (the voice alone)
transitions: whip, punch # the cuts between lines, taken in turn
drop: flash              # the cut out of the hook, where the beat comes in
punch: 10%               # punch-ins on each *keyword* (no turns them off)
motion: medium           # low, medium, or high: how much moves
captions-fx: kinetic     # pop, bounce, kinetic, or fade
grain: yes               # vignette: yes too
max-hold: 3              # the longest one picture holds (0: never split a line)
j-cut: 0.2               # how far each line's voice leads its picture
```

And per line: `[cut: glitch]` sets how that line comes in, and
`[bg: assets/a.jpg | assets/b.mp4 | city at night]` gives it several pictures,
cut between as it's said. A single search query on a long line fetches as
many pictures as the line needs; a single file is reframed instead (a jump
cut on a still: the same picture, framed tighter or wider at each cut).

Mark the words that sell the line with asterisks (`lose *money* on every
late invoice`): they stay lit in yellow once said, pop a little bigger, and
the camera punches in on them. One or two per line; a punch on every word is
no punch at all.

## Techniques, and how to make each one

Each technique from the usual short-form editing glossaries, with the
setting that makes it here. "Not built" means the renderer can't do it: say
so, and offer the closest thing it can, or a free editor (CapCut) for that
one step.

### Basic editing

| Technique | How here |
|---|---|
| Jump cut | `cut.js` cuts the pauses out of a filmed take, and every jump cut changes the framing (wide, punched in, wide, closer), so the cuts read as deliberate. On a still, `max-hold` reframes one picture the same way |
| Hard cut | `transitions: cut`, or `[cut: cut]` on a line; `[transition: cut]` in a montage |
| Match cut | Not automatic: it needs two shots whose shapes or motion line up. Order the montage so they do and cut between them with `[transition: cut]`. The 3D `desk` shot pushing into the screen is one built in |
| J-cut | `j-cut: 0.2`: each line's voice starts before its picture (on in `ugc`, `kinetic`, and `cinematic`; never out of the hook, so the drop lands clean) |
| L-cut | `cut.js --broll`: the person keeps talking over the cutaway; in a montage, a `voiceover:` runs under every shot |
| Cutaway | `cut.js --broll "assets/app.mp4@invoice+2"`: at the word "invoice", two seconds of the user's screen recording, then back to the take |
| B-roll | `[bg: a \| b \| c]` on a line, or `max-hold` fetching more for a long line; `--broll` on a filmed take |
| Montage | `clip-montage` (the user's clips) and `montage-video` (their photos); `hook-fx: montage` opens a narrated video on a burst of quick cuts |
| Split screen | The `expectation-reality` (two panes), `before-after` (a wipe), and `this-or-that` templates. Not in `compose.js` |
| Widescreen to vertical | `card.js`: a 16:9 demo, screen recording, or explainer plays as a card in the vertical frame, cut into beats that each zoom into the part that matters (sharp, from the full-resolution source), with its lines big above it and graphics over it ([video-rendering.md](video-rendering.md), "A widescreen video, vertical") |
| Freeze frame | `[ramp: 1.5:0,2.3:1]` on a montage clip (or `data-ramp` on any clip): it freezes at 1.5s for 0.8s. Pair it with a `scratch` sound for the meme freeze |

### Camera movement and zoom

| Technique | How here |
|---|---|
| Punch-in zoom | `punch: 10%` (on each `*keyword*`), `transitions: punch` (a cut that lands zoomed in and snaps back), and the drop in `ugc` and `meme` |
| Punch-out zoom | `--kb: kbDynOut` on a slot, `pull-out` in a montage, `transitions: zoom` |
| Dynamic zoom | `kbDyn` (slow, fast, slow), in `ugc`, `kinetic`, and `fast`; `cut.js`'s framing changes |
| Ken Burns | Every still moves: `kbIn`, `kbOut`, `kbLeft`, `kbRight`, `kbUp`, `kbDown`; a montage's `pan-left`, `push-in`, and the rest |
| Whip pan | `transitions: whip` (the next picture flies in sideways, blurred with the speed, under a whoosh) |
| Dolly zoom | Not built. The closest is a montage photo's 3D `dolly-in` from its depth map |
| Camera shake | `hook-fx: shake`, the drop in `fast` and `meme`, every keyword in `meme`; `.hit` shakes text in a template |
| Motion tracking | Not built for a moving subject in a clip. What's tracked is a still's own camera move: `screen=` keeps a screenshot on the laptop in the user's photo, and a montage `[callout: ...]` stays on its spot. For a subject moving in a clip, CapCut's tracking |
| Parallax | A montage photo with a depth map (`depth.js`) moves in 3D: near things move more than far ones (`orbit`, `dolly-in`, `rise`). The 3D style's sets have real depth |
| Fake camera movement | Ken Burns and the depth moves above; real camera moves from a photo need a connected video model (paid, quoted first) |

### Transitions and visual effects

| Technique | How here |
|---|---|
| Glitch transition | `glitch`: the next picture tears in, in slices, its colors split, under a glitch sound |
| Flash transition | `flash`: a white flash on a hard cut, under an impact |
| Whip transition | `whip` |
| Mask transition | `mask`: the next picture opens out of a circle (`--mx`/`--my` on the slot move its center). A shape cut from an object in the footage is not built |
| Zoom transition | `zoom` (flies in from bigger) and `punch`; the 3D screens push through one into the next |
| Spin transition | `spin` |
| Blur transition | `blur` (a blurred dissolve); `whip` and `spin` carry motion blur |
| RGB split | Inside `glitch` and `hook-fx: glitch` |
| Distortion effect | Partly: `glitch` tears and offsets the picture. Warps and bends are not built |
| Light leak | `leak`: warm light sweeps across the cut |
| Film burn | `burn`: a hot flare that whites out the cut (the `cinematic` drop) |
| Shape transition | `bars` (three slanted bands in the brand's colors sweep across and hide the cut) and `blocks` (tiles in the accent pop in and out in a diagonal wave) |
| Chromatic aberration | Only for a moment, in `glitch`. A steady colored-edge look is not built |

### Text and typography

| Technique | How here |
|---|---|
| Kinetic typography | `text "10x *faster*" @faster anim=slam` (a [graphic](#graphics): big words that slam, pop, rise, wave, stretch, glitch, or type in on a word); `captions-fx: kinetic`, `hook-fx: bounce`, the bold look (`captions: bold`), the 3D `title` shot |
| Word-by-word captions | Every narrated video and filmed take: timed to the voice, the word being said highlighted |
| Subtitle pop-ups | `captions-fx: bounce` (each chunk springs in) or `pop`; `captions: subtitle` for small, quiet ones |
| Text reveal | `text "..." anim=rise` (letters rise out of a mask); `captions-fx: kinetic` (words rise in as said); a template's `.rise` and `.slide` entrances |
| Typewriter effect | `text "..." anim=type`; the 3D `terminal` and `agent` shots type their lines. Captions follow the voice word by word, never letter by letter |
| Text bounce | `hook-fx: bounce`, `captions-fx: bounce`, a template's `.pop` and `.stamp` |
| Text tracking | By hand, in a template's CSS (`letter-spacing`); `.label` is set wide |
| 3D typography | The 3D `title` shot: big 3D letters dropping onto the floor |
| Text masking | Not built (footage inside the letters, or text behind a subject) |
| Callout text | `pin 62%,40% "solid oak"`, or an `arrow`, `circle`, or `box` with a label ([graphics](#graphics)); a montage `[callout: 30%,60% solid oak]`, a `.sticker`, the how-to template's tap ring |
| Text wipe | Not built for text; `.wipe` wipes between two pictures |
| Kinetic subtitles | `captions-fx: bounce` (the word being said swells), with `*keywords*` lit and bigger in every caption style |

### Motion graphics

| Technique | How here |
|---|---|
| UI animation | `cursor` (a tap on the real UI in a recording), `notify` (a notification sliding in); the 3D `terminal`, `agent`, and `button` shots; the how-to phone with taps; the chat, notification, and post mockups in the everyday templates |
| Screen replacement | `[bg: assets/me-laptop.jpg screen=assets/app.png at=...]` puts the user's screenshot on the screen in their photo; 3D props hold it (`prop=phone`, `laptop`, `desk src=`) |
| Device mockup animation | The how-to template's phone, the 3D `hero` (a phone), `desk`, and the mascot holding a laptop or phone |
| Shape animation | `shapes burst`, `rings`, `lines` (speed lines), and `dots` over any picture; the 3D `shapes` and `rings` shots |
| Icon animation | `icon check 78%,30% @done` (an icon drawn on a badge with a burst; or any emoji); the 3D `icons` shot (app tiles dropping into a grid) |
| Logo animation | The end card (`brand.js`): the logo pops in on the sonic logo; the 3D `coin` with the logo on it |
| Lower thirds | `lower "Maya Lopez" "Founder, Juniper"` over any picture, set as a bar, a box, a line, or a tech panel; a montage shot's label (`.lt`); the team template |
| Infographic animation | `hud data` (a panel whose numbers count up, a percentage as a filling bar), `ticker` (a price or count moving from one value to another), `measure` (a dimension counting up as its line draws), `chips` (facts popping in), and `text "$12,400" anim=count`; the 3D `chart`; `.count` count-ups, `.poll`, `.progress`. The user's real numbers only |
| Callout animation | `arrow`, `circle`, `box`, `highlight`, `spot`, and `pin` ([graphics](#graphics)), each drawn in; `[callout: ...]`, the tap ring |
| HUD / UI elements | `hud lock` (a targeting reticle locking on, with a readout), `hud frame` (corner brackets, a blinking REC, a ruler, a scan line), `hud data` (a data panel), `hud scan` (a scan line sweeping a region over a grid) |
| Particle animation | `shapes confetti`; confetti on the mascot's `cheer` and the `button` shot; pixel `coins`; film `grain` |
| Morphing | Not built |
| Rive/Lottie animation | Not built: the pages animate with CSS (and three.js), which the renderer seeks frame by frame |

### Speed and timing

| Technique | How here |
|---|---|
| Speed ramping | `[ramp: 1.2:0.3,2.4:1]` on a montage clip: slows to 0.3x at 1.2s, eased, back to full speed at 2.4s |
| Slow motion | `[speed: 0.5]`. Footage filmed at 60 or 120fps stays smooth (the renderer pulls frames at the faster rate); 30fps footage repeats frames at half speed, so ask for 60fps when filming |
| Fast motion | `[speed: 2]` (a process, a timelapse feel) |
| Time remapping | `[ramp: ...]` with any points; speed 0 holds a frame |
| Beat sync | Every cut lands on the beat: of the generated music, or of a licensed track (`beats.js`) |
| Rhythmic cutting | A montage's `pace: 1 bar` or `[hold: 2 beats]` |
| Micro-cuts | `hook-fx: montage`, `edit: fast` (`max-hold` 2.2), a montage `pace: 2 beats` |
| Hold frame | A montage `[hold: 2 bars]`; a line holds as long as it's said. `render.js --check` notes a hold over 3s without a change |

A clip with its own sound (`[sound]`, `data-audio`) can't change speed: the
sound would drift. The renderer plays it at normal speed and says so.

### Sound design

| Technique | How here |
|---|---|
| Whoosh | `whoosh`, on whips, zooms, and spins (in styles with sounds on their cuts) |
| Impact sound | `impact` (short and tight, for punch-ins and hard cuts) and `boom` (a deep hit with a long tail, for a punchline) |
| Risers | `riser`, cued on the reveal: it builds for 1.4s before it (in `fast` and `cinematic`, into the drop); `drumroll` |
| Bass drop | `bass` (a sub drop); the generated music's beat drops at `data-drop` |
| UI sound effects | `click`, `typing`, `ping`, `pop`, `tick`, `shutter`; in a script, `[sfx: click]` on the line |
| Silence / sound drop | `hook-audio: silence`: the first line alone, then the music lands on the drop (no riser into it) |
| Sound layering | Music, effects, and voice are mixed in one pass; one element can cue several sounds (`data-sfx="riser impact"`) |
| Audio ducking | Automatic: the music and effects dip under every voice line |
| Voiceover processing | Silence trimmed and levels evened per line; the mix lands at about -14 LUFS. EQ and compression aren't applied |
| Sound bridge | J-cuts, the take's voice under b-roll, and a voiceover across a montage's shots |
| Reverse audio | `reverse`: a reversed swell that ends on its cue |

### Color and image treatment

| Technique | How here |
|---|---|
| Color grading | One grade across every picture (`--grade`), set by the look (`visual-design.md`) or the editing style |
| Color correction | Partly: bright backgrounds are darkened enough for white text, `fit.js` (run by `compose.js`) and `montage.js inspect` flag dark, clipped, or low-resolution pictures. Fix white balance before, in the phone's photo editor |
| Film grain | `grain: yes` (on in `cinematic`) |
| Vignette | `vignette: yes` (on in `cinematic`) |
| Glow effect | The colored glows behind a page; the 3D sets' lighting |
| Bloom | Not built for photos |
| Motion blur | On `whip`, `spin`, and `blur` transitions; not on a subject moving in a clip |
| Sharpening | Not built. `render.js` warns when a photo is shown far above its own size, which is what makes it soft |

## Graphics

Graphics go over the picture: the user's own footage (`cut.js --gfx`), a
narrated video (`[gfx: ...]` on a line in `compose.js`), or a montage
(`[gfx: ...]` on a shot in `montage.js`). Each is one line, written the same
way in all three, and `scripts/video/graphics.js` has the full list:

```
<kind> [what] [x%,y%] ["text" ...] @<when> [+seconds] [key=value ...]
```

| Kind | Line | What it does |
|---|---|---|
| Lower third | `lower "Maya Lopez" "Founder, Juniper" @0.5 +4` | The name and title near the bottom of the picture, above the captions. `style=bar` (an accent bar and a dark panel), `box` (the name on the accent, the title on white), `line` (a rule drawn under the name), or `tech` (a HUD panel); the look picks one when `style=` doesn't. `side=right` |
| Arrow | `arrow 62%,40% "the new button" @button` | An arrow drawn in to that point, its label at the tail. `from=ul\|ur\|dl\|dr` puts the tail; by default it comes from the middle of the frame |
| Circle | `circle 62%,40% "this one" @3.2 r=130` | A ring drawn around the point by hand, a little more than once around |
| Box | `box 10%,30%,80%,12% "before"` | A rectangle drawn around a region (x, y, width, height), its label on a tab |
| Highlight | `highlight 10%,42%,80%,6%` | A marker swipe over a region, yellow by default: a line of text in a screen recording |
| Spotlight | `spot 50%,35% "her reaction" r=240` | Everything but a circle dims |
| Pin | `pin 62%,40% "solid oak"` | A dot on the point with a label |
| Icon | `icon check 78%,30% @done` | An icon drawn on a badge, with a burst: `check`, `cross`, `plus`, `minus`, `star`, `heart`, `bolt`, `play`, `clock`, `up`, `down`, `chat`, `search`, `bell`, `lock`, or any emoji (`icon 🔥 ...`). `style=plain` drops the badge |
| Accent | `shapes burst 50%,40%` | `burst` (lines flying out of a point), `rings` (a ping), `lines` (speed lines across the frame), `dots`, or `confetti` |
| Kinetic type | `text "10x *faster*" @faster anim=slam` | Big words animated in on a word. `anim=pop`, `slam` (with a jolt), `type`, `rise`, `wave`, `stretch`, `glitch`, or `count` (a number counting up); `size=s\|m\|l\|xl`; `style=box` or `outline`; `*words*` take the accent; x%,y% moves its center |
| HUD | `hud lock 50%,32% "TARGET ACQUIRED"` | A reticle locking onto the point, with a typed readout |
| | `hud frame "CAM 01" +6` | Corner brackets around the picture, a blinking REC dot and label, a ruler, one scan line |
| | `hud data "This week" "Users" "1,920" "Churn" "2%"` | A data panel: label and value pairs, numbers counting up, a percentage as a filling bar; an odd first text is its title |
| | `hud scan 10%,30%,80%,30% "SCANNING"` | A scan line sweeping a region over a grid |
| Measure | `measure 12%,47% 54%,47% "88″ wide"` | A dimension line drawn from one point to the other, its ends ticked, its label above the middle; a number at the label's start counts up (`count=no` keeps it still) |
| Cursor | `cursor 30%,40%` | A pointer gliding in and tapping the point, a ring spreading from the tap, with a click (`from=dr\|dl\|ur\|ul`) |
| Stamp | `stamp "✓ Fits your wall"` | A verdict slammed on at an angle, green unless `color=` says otherwise |
| Notification | `notify "New quote request" "Sand · Linen · $1,679" app="ModlyAI · now" img=assets/logo.png` | A notification card sliding down into place, with a ping |
| Chips | `chips "88″ W" "38″ D" "33″ H"` | Pills popping in one after another; `style=check` puts a green check on each, ticking as it lands (a checklist) |
| Ticker | `ticker "$1,599" "$1,679"` | A number counting from one value to the other, commas held |

**When:** `@2.5` is seconds (into the cut take for `cut.js`, into the line or
shot for `compose.js` and `montage.js`); `@button` or `@"the new button"`
brings it in as that word is first said, which is how a graphic lands on the
beat of the speech. `cut.js` times words from `--text`; in a narrated video
or a montage, `render.js` times them once the captions are. `+3` is how
long it stays.

**Where:** `x%,y%` is a point of the whole frame, 0,0 at the top left; a
region is `x%,y%,w%,h%`. To point at something in the picture, look at a
frame first (`render.js page.html --stills 2.5`, or `montage.js frames
clip.mp4`) and read off where it is, then check the result the same way.
Keep labels and type clear of the hook at the top and the captions low in
the frame, and in from the right edge on a vertical video; `--check` (which
`cut.js`, `compose.js`, and `montage.js` run) reports a label that runs into
other text or leaves the safe zone. A graphic stays where it's put: on a
clip where the subject moves, keep it short or point at what holds still.

**Color and sound:** `color=yellow|white|red|green|blue|cyan|black|#hex`
(default the accent). Kinetic type, icons, and accents bring a sound when
the edit style wants sounds on its hits (`slam` an impact, `type` typing,
`icon` a pop); callouts, lower thirds, and HUD elements are silent, so they
don't crowd the voice. `sfx=<sound>` gives any graphic one, `sfx=none`
takes it away.

**Taste:** one graphic at a time, each on the word it's about, and only the
ones that help the viewer follow: the speaker's name once, an arrow to the
thing being talked about, the number that matters. Numbers, results, and
names on screen are the user's real ones, like everything else.

## A 15-second software ad, cut by the book

The classic structure, made with the settings above. The words and pictures
are placeholders: the user's own product, screens, and claims replace them.

| Time | Section | Edit | Here |
|---|---|---|---|
| 0–3s | Pattern interrupt and curiosity | A glitch, a punch-in, bold kinetic text | `hook-fx: glitch`, the hook in bold, a keyword punch-in |
| 3–7s | Problem | Quick cuts, captions | `[bg: a \| b \| c]` on the problem line, cut on the beat |
| 7–12s | Demonstration | UI animation, a screen recording, callouts | The user's screen recording behind the line, with `[cut: zoom]` into it |
| 12–15s | Call to action | A logo animation, a clean product shot | `cta:` and the end card, with the logo landing on the sonic logo |

```
---
title: the hard way
edit: kinetic
hook-fx: glitch
captions: bold
hook: you're doing this the *hard way*
cta: try it free · link in bio
---
1. You're doing this the *hard way*. [bg: assets/cluttered-desk.jpg]
2. Too many tools. Too many tasks. Not enough time. [bg: assets/tabs-1.png | assets/tabs-2.png | assets/tabs-3.png]
3. Here's a smarter way to manage everything. [bg: assets/app-demo.mp4] [cut: zoom]
4. Try it free today. [bg: assets/app-home.png]
```

For a demonstration with more motion graphics than a screen recording (a
terminal typing, an agent working, the camera gliding from screen to screen),
use the product demo in `style: 3d` (`video-rendering.md`).

The principle the structure serves: the ad should feel like content worth
watching that happens to show a product, not a sales pitch from the first
frame. Keep the message clear, show real value, and make the one ask easy.
