# Visual design

How a video's visuals are chosen: its style, colors, pictures, type,
movement, and pace, for TikTok, Reels, Shorts, and YouTube. `short-form-video`,
`clip-montage`, and `montage-video` read this file before they pick a look or
write a single `[bg: ...]`. The settings it names live in
`scripts/video/look.js` (the looks), `edit.js` (the cut and how much moves),
`fit.js` (how well a picture works behind words), and the shared CSS in
`templates/build.py`. [`editing-techniques.md`](editing-techniques.md) covers
the cutting, [`hooks.md`](hooks.md) the opening.

**The rule:** every visual choice serves at least one job: clarify, attract
attention, create emotion, establish identity, show evidence, or pace the
video. If a visual does none of them, simplify it. Strong visuals are not the
most complicated ones; they're the clearest and most intentional.

## The one-page visual recipe

Fill this in before writing the script's visual lines, and say it to the user
in one short block, so the choices are deliberate and checkable:

| Item | The question | In the script |
|---|---|---|
| Direction | "After watching, the viewer should understand or feel ___." One sentence, written before anything else | the message every choice below serves |
| Purpose | What should this video accomplish? | `goal:` (below) |
| Audience and emotion | Who's watching, and the one feeling it should leave? | picks the look ("Start from one feeling") |
| Dominant style | One look, at most one supporting style | `look:` |
| Palette | Base, accent, text, and what each color means | the Visual Identity, or the look's accent |
| Image rule | What kind of picture proves or explains each point? | each line's `[bg: ...]`, `[card: ...]`, or `[shot: ...]` |
| Typography | A headline font and a body font | the look's headline, or the identity's `Headline font:` |
| Motion rule | What moves, and why? | `motion: low`, `medium`, or `high` |
| Motion plan | Per scene: what moves, which way, how fast, and what the viewer should notice | the table in "Plan the movement" |
| Pacing rule | What causes a cut or a new picture? | an idea changing (see "Pacing") |
| Accessibility | How will it stay readable and comfortable? | `render.js --check` measures it |
| Rights and accuracy | Are the assets usable, and the claims fair? | the user's own material, `[source: ...]` |

## Match the style to the job

`goal:` picks a look and a motion level for the video's job; `look:` and
`motion:` set them directly and win over it. Choose by the topic, audience,
and tone, not because a style is trending.

| `goal:` | The job | Look | Motion | Visual approach |
|---|---|---|---|---|
| `teach` | Teach a concept | `explainer` | medium | Diagrams, labels, a step at a time; high contrast, consistent colors |
| `trust` | Build trust | `documentary` | low | Real footage, legible text, sources on screen, steady movement |
| `entertain` | Entertain | `social` | high | Expressive moments, quick inserts, rhythm-matched cuts |
| `story` | Tell a story | `cinematic` | low | Establishing shots and close-ups; the palette follows the arc |
| `sell` | Sell a product | `social` | medium | Clear product shots, a demonstration, proof, benefit labels |
| `suspense` | Create suspense | `suspense` | low | Selective reveals, shadow, negative space, held frames |
| `inspire` | Inspire | `cinematic` | medium | Strong imagery, a deliberate build, a memorable end |
| `review` | Analyze or review | `minimal` | medium | Screenshots, comparisons, callouts; a neutral base and one highlight |
| `comedy` | Make comedy | `playful` | high | A clear setup and payoff, timing-led cuts |
| `music` | Music content | `social` | high | Beat-aware edits, with a licensed track's beat (`beats.js`) |

The goal also points to the hook types that suit it (`hooks.md`, "Pick by the
video's goal"; `hook.js --goal <goal>`).

### Start from one feeling

Pick one primary feeling and turn it into settings. Tendencies, not laws.

| Feeling | Visual clues | Here |
|---|---|---|
| Calm | Slow movement, open space, soft light, restrained color | `look: cozy` or `minimal`, `motion: low`, `edit: clean`, long holds |
| Excitement | Strong contrast, quicker movement, energetic cuts | `look: social`, `motion: high`, `edit: fast` |
| Sadness | Muted color, still frames, negative space | `look: cinematic`, `motion: low`, `max-hold: 5`, `[cut: fade]`, `hook-audio: silence` |
| Curiosity | Partial reveals, unusual framing, controlled contrast | `look: suspense` or `editorial`; a close-up first and the whole later; `[cut: mask]` on the reveal |
| Trust | Clear layouts, stable movement, readable type | `goal: trust` (`documentary`, low), panel captions, `[source: ...]` |
| Nostalgia | Grain, warm or faded color, retro details | `look: retro` or `cozy`, `grain: yes`; pixel art for a game memory |
| Urgency | A strong focal point, concise text, purposeful pace | `look: social`, `motion: medium`, `max-hold: 2.5`, short lines; a real deadline only |
| Wonder | Scale, depth, atmospheric light, gradual reveals | `look: cinematic` with wide shots; the 3D `globe` or `rings`; a montage photo's `dolly-in` or `rise` |

## Looks

A look sets the whole visual system at once: how the hook is set, the
headline font, the caption style, the color grade, a texture, an accent (used
only when the brand has no Visual Identity accent), the editing style, and
how much moves. One look per video; the brand's own colors and fonts always
win over the look's.

| `look:` | Feels | Headline | Captions | Treatment | Edit, motion |
|---|---|---|---|---|---|
| `social` | Social-native short-form | the template's | bounce | gentle contrast | ugc, medium |
| `minimal` | Neutral base, one accent | Inter | panel | slightly desaturated | clean, low |
| `explainer` | Educational, one idea at a time | Space Grotesk | kinetic | crisp | kinetic, medium |
| `documentary` | Credible, restrained | Inter | panel | natural color, clean cuts | clean, low |
| `corporate` | Professional | Inter | panel | brand colors and neutrals | clean, low |
| `cinematic` | A brand film | Playfair Display | fade | warm grade, grain, vignette | cinematic, low |
| `editorial` | Magazine | DM Serif Display, large | panel | curated contrast, slides and wipes on the turns | clean, low |
| `luxury` | Premium | Playfair Display, spaced capitals | fade | rich contrast, vignette, a metallic accent | cinematic, low |
| `tech` | Futuristic | Space Grotesk, boxed and lit | kinetic | dark cool grade, a faint grid, a cyan accent, glitches only on the turns | kinetic, medium |
| `retro` | VHS and analog | VT323 | pop | faded warm color, scanlines, a tracking band, grain | ugc, medium |
| `suspense` | Mystery and horror | Oswald, capitals | fade | dark, desaturated, vignette, no flashes | cinematic, low |
| `cozy` | Lo-fi and calm | Fraunces | fade | muted warm color, a little grain | clean, low |
| `handmade` | Tactile | Caveat | bounce | paper texture, warm color | clean, medium |
| `playful` | Comedy | the template's, on yellow | bounce | bright, saturated | meme, high |

### The common styles, and how to make each here

| Style | Here |
|---|---|
| Minimalist | `look: minimal` |
| Cinematic | `look: cinematic` |
| Documentary / journalistic | `look: documentary`, with `[source: ...]` on every claim |
| Educational / explainer | `look: explainer`; the 3D `cards`, `icons`, and `chart` shots |
| Corporate / professional | `look: corporate`, with the brand's own photos, never generic stock people |
| Social-native / energetic | `look: social` |
| Meme / internet comedy | `look: playful`, or the everyday templates (`fyp-formats.md`) |
| Retro / VHS / analog | `look: retro` |
| Futuristic / sci-fi / tech | `look: tech`; the 3D product demo's screens |
| Editorial / magazine | `look: editorial` |
| Luxury / premium | `look: luxury` |
| Horror / suspense | `look: suspense` |
| Lo-fi / cozy / ambient | `look: cozy` |
| Stop-motion / handmade | `look: handmade` gives the feel; real stop-motion has to be filmed |
| Glitch / experimental | `look: tech` or `edit: fast`, glitches kept for the turns |
| 2D motion graphics | The marketing templates (`promo`, `how-to`, `announcement`) |
| 3D / product visualization | `style: 3d` (`hero`, `title`, `icons`, the mascot holding the product); never imply a feature the product doesn't have |
| Data / infographic | The 3D `chart` (the user's real numbers), count-ups, `[card: ...]`, `[source: ...]` |
| Slideshow / photo essay | The `slideshow` template, or `montage-video` |
| Photoreal / live action | The user's own footage: `cut.js`, `clip-montage` |
| Travel / adventure, food, beauty and fashion, sports | The user's own footage (`clip-montage`); `look: cinematic` or `minimal`, never a grade that changes the product's, food's, or skin's real color |
| Music video / performance | The user's footage cut on the track's beat (`clip-montage` with `music:`), or `edit: fast` |
| Gaming | Gameplay is the user's footage (`clip-montage`, `cut.js --broll`); `style: pixel` for a game feel |
| Pixel art | `style: pixel` |
| Mixed-media / collage | Not a look: the `starter-pack` template and the 3D `wall` shot come closest |
| Anime / illustrated, fantasy | Not drawn locally: a connected video model (paid, quoted first), never copying a franchise or artist |
| Whiteboard / sketch | Not built: the 3D `notes` shot is the closest |

## Style recipes

Six styles most short-form videos are made in, each with how to build it
here, a timed sequence to start from, and what to avoid. Choose the one that
makes the message clearer, not the one that looks most impressive.

### Cinematic photo montage

Still pictures, a film-like grade, slow controlled camera moves, atmosphere,
and sound, so stills feel like a moving scene. For emotional stories,
reflections, brand stories, mood pieces, short documentaries. Here:
`montage-video` (the user's photos) or `clip-montage`, or a narrated script
with `look: cinematic`. Look for subject separation, light and shadow,
believable places, foreground and background depth, and one grade (warm and
nostalgic, cool and restrained, neutral, dark, or soft) that never shifts skin
or product color.

| Time | Shot | Move (a montage line's `[move: ...]`) |
|---|---|---|
| 0–3s | Wide, establishing | `push-in`, slow |
| 3–6s | Medium, the action | `pan-left` or `pan-right` |
| 6–9s | Close-up, the emotion | `push-in focus=x%,y%` on the face or detail, very slow |
| 9–12s | Detail | `drift`, a short lateral move |
| 12–15s | Wide, the ending | `pull-out`, or `none` with `[hold: 2 bars]` |

Use `orbit` or `dolly-in` (depth) only on a photo with clear near and far
parts; a cut or a dissolve follows the emotional rhythm. Avoid lens flares,
heavy grain, the same move on every picture (`--check` notes it), a dramatic
transition on every cut, and pictures that don't belong to one story.

### Motion graphics and typography

Shapes, text, icons, diagrams, numbers, and animated layouts. For explainers,
statistics, comparisons, app demos, and feature announcements. Here:
`look: explainer` (or `tech`), `edit: kinetic`, `[card: ...]` for the key
phrase, the 3D `cards`, `icons`, and `chart` shots, and the marketing
templates (`promo`, `how-to`, `announcement`). The templates share one graphic
kit, so stroke widths, corners, and spacing stay consistent.

| Time | Beat | Here |
|---|---|---|
| 0–2s | A large question | `hook:`, `hook-fx: bounce` |
| 2–4s | A diagram shows the problem | `[shot: cards ...]` or `[card: ...]` |
| 4–6s | The solution, as a highlighted panel | `[card: ...]` in the accent, `[cut: mask]` |
| 6–8s | Three benefits, one at a time | Three short lines, a `*keyword*` each |
| 8–10s | The takeaway and the brand mark | `cta:` and the end card |

Type moves by fading and rising, a word at a time, or a scale on one keyword;
numbers count up. Avoid many fonts or shapes, random movement, and text that
leaves before it can be read (`--check` measures reading time).

### Pixel art

Visible pixels, simple forms, a limited palette, frame-by-frame movement:
nostalgic, playful, game-like. For short narrative series, everyday stories,
retro themes, and game content. Here: `style: pixel`. The renderer keeps the
rules: one pixel size (each art pixel 8x8 on screen), 16 colors plus the
brand's accent, hard edges (no smoothing), whole-pixel camera moves that jump
rather than glide (`editing-techniques.md`), stepped animation in the dialog
box, and the user's photo pixelated into the same palette (`[shot: photo]`)
rather than pasted in sharp. Give each character a recognizable silhouette
and a few fixed colors, and each place a light source and a few reused props.
Avoid mixing in blurry or detailed artwork, more colors, changing proportions,
busy backgrounds, and movement smoother than the style.

### Minimalist advertising

A clear composition, restrained color, generous negative space, concise
text, and a strong product. For app and software ads, launches, premium
brands, and a simple call to action. Here: `look: minimal` (or `luxury`,
`editorial`), `motion: low`, one accent, the user's own product shot or
screen, and a clean background.

| Time | Visual | Here |
|---|---|---|
| 0–3s | The problem, stated | `hook:` rising in; a calm background |
| 3–6s | The product appears | The user's product shot (`[bg: assets/product.png]`), or the 3D `hero` with their screenshot |
| 6–10s | A feature, demonstrated | Their screen recording, the `how-to` phone frame |
| 10–13s | The main benefit | `[card: ...]` with the benefit in the accent |
| 13–15s | Brand and call to action | `cta:` and the end card, held long enough to read |

Avoid decoration, tiny screenshots, unreadable UI, complicated transitions,
claims the product can't back, and a call to action that's gone in a blink.

### 3D and futuristic

Depth, light, materials, perspective, and moving through space. For technology
products, abstract ideas, product visualization, and science. Here:
`style: 3d` (with `look: tech` for the futuristic version). The sets keep one
material language (glossy and soft, with metal and glowing accents used
sparingly), a key light, and a rim light in the brand's accent. Camera moves
each have a reason: the `desk` push into the screen for emphasis, `rings` and
the moving `globe` for energy and reach, a pull back to show scale, and the
mascot's shots held steady for a clean presentation. Avoid neon on every
surface, reflections and glow everywhere, rotation with no motive, unclear
scale, and detail that's beside the point. Never show a feature the product
doesn't have.

### Mixed styles

Not mixing everything: one style is the foundation and each other one has a
job. Keep one palette (the Visual Identity across all of it), one headline and
body font, matching or deliberately separated lighting, the same line weights
and corners, and a transition that explains each change of style. Return to
the opening style at the end, so it closes where it began.

| Mix | Here |
|---|---|
| Cinematic photo + clean typography | `look: cinematic` with `[card: ...]` on the key lines |
| Real product footage + 2D labels | `clip-montage` with `[callout: ...]`, or `cut.js --broll` |
| 3D object + minimal labels | `style: 3d` with the `hero` or `desk` shot holding their screenshot |
| Documentary photo + an animated chart | `look: documentary` lines with a `[card: ...]` and `[source: ...]`; the 3D `chart` for real numbers |
| Opening problem in photos, product in 3D | Two renders joined in an editor (CapCut): one `compose.js` video is one style |

## Color

### A small palette, with roles

| Role | Where it comes from | Used for |
|---|---|---|
| Base | Visual Identity `Background:` | Text cards, the end card, every empty frame |
| Accent | `Accent:` (or the look's) | `*keywords*`, the CTA, highlights; sparingly |
| Text | `Text:` | Words on the base |
| Headline font | `Headline font:` (or the look's) | The hook and text cards |
| Caution | `Caution:` | `~wrong~` words: the wrong way, struck through |
| Positive | `Positive:` | Checkmarks and good outcomes in the templates |

Start with two to four colors plus neutrals, and give each a stable job for
the whole video: here the accent always marks the key word, and the caution
color always marks the wrong way.

**Proportion.** About 60% base (the background, the environment), 30%
supporting (panels, secondary shapes, the picture's own dominant color), and
10% accent (the keyword, the CTA, the one thing to notice). A guideline, not a
rule: if the accent is everywhere, nothing stands out.

### Starting palettes

For a brand with no Visual Identity yet, these make a coherent start; save the
chosen one as `Background:`, `Accent:`, and `Text:` in `brand-voice.md`. The
contrasts are measured: supporting colors are for shapes and panels, never
text, and text on the accent is picked automatically (white or near-black).

| Style | Base | Supporting | Accent | Text | Contrast | Closest look |
|---|---|---|---|---|---|---|
| Cinematic | `#17191D` | `#77736E` | `#C58B52` | `#F5F5F2` | text 16:1, accent 6:1 | `cinematic` |
| Technology | `#111827` | `#2563EB` | `#FBBF24` | `#F5F5F2` | text 16:1, accent 10.6:1 | `explainer`, `tech` |
| Pixel / retro | `#191310` | `#A65D4E` | `#E8D5AD` | `#F5F5F2` | text 17:1, accent 12.7:1 | `retro` |
| Minimal / premium | `#F5F2EC` | `#B9B3A8` | `#747A5A` | `#1C1C1A` | text 15:1, accent 4:1 (large text only) | `minimal`, `luxury` |
| Futuristic | `#090D18` | `#24245C` | `#67E8F9` | `#F5F5F2` | text 18:1, accent 13.4:1 | `tech` |

Pixel art keeps its own 16-color palette; only the accent follows the brand. Meaning never rests on color alone: a
`~wrong~` word is struck through as well as red, and a keyword is lit and
bigger. Text on the accent (stickers, chips, buttons) is whichever of white
or near-black reads better on it, worked out from the accent.

### Color directions by mood

Tendencies, not laws: color reads differently by culture, subject, and
combination.

| Mood | Direction | Watch for | Closest look |
|---|---|---|---|
| Trustworthy, professional | Navy, blue, white, cool gray | Generic without a distinctive accent | `corporate`, `documentary` |
| Friendly, accessible | Warm neutrals, teal, soft blue, gentle yellow | Pale text on pale backgrounds | `social` |
| Energetic, youthful | Coral, orange, bright blue | Too many saturated colors competing | `social`, `playful` |
| Premium, elegant | Black or deep neutral, cream, a metallic accent | Low contrast, tiny text | `luxury` |
| Nature, sustainability | Greens, earth tones, cream | Green alone proves nothing | `cozy`, `minimal` |
| Calm, wellness | Sage, muted blue, warm beige | Washed-out, low contrast | `cozy` |
| Suspense, mystery | Deep blue, charcoal, selective warm light | Shadows crushed until details disappear | `suspense` |
| Documentary, serious | Natural color, a restrained grade | Over-grading real footage | `documentary` |
| Tech, futuristic | Dark neutrals, cyan, blue, a little neon | Glowing neon everywhere | `tech` |
| Food | Accurate food color, warm neutrals | Over-saturation | `minimal` |
| Beauty, fashion | Chosen for product and skin | A grade that misrepresents the product | `editorial` |

### Contrast, measured

`render.js --check` (and `check.js`) measures every settled text against the
pixels actually behind it: 4.5:1 for small text and 3:1 for large (WCAG's
reference targets, counted at a phone's size). Under 2:1 fails; under the
target is a note with the fix (a panel, an outline, a darker picture). Still
watch the render on a phone at low brightness.

### Grading

The renderer grades every picture the same way so mixed sources match: the
look's grade, or the edit style's. Correct first, stylize second: a dark or
off-color photo is fixed before it comes in (the phone's editor is enough),
not hidden under a strong look. Never grade a product, food, skin, or
evidence into something it isn't.

## Pictures and footage

### What to use, in order

1. The user's own footage or screenshots that show the subject directly
2. Demonstrations and evidence that prove the point
3. Relevant licensed stock (`media.js`)
4. Purpose-made diagrams and charts (the 3D `chart`, `cards`, `icons`), and text cards
5. AI-generated images, only for illustration, labeled, never as evidence
6. Decorative images only when they add something

### The five-question test

For every picture: Is it relevant to what's said on that line? Would a
viewer see why it's there? Does it fit the look? Is the subject clear at
phone size? Is it ours to use, and could it mislead? If it's only pretty,
replace it.

### Shot types, and how to get them

| Shot | Does | How here |
|---|---|---|
| Wide / establishing | Place, scale, context | Stock: "wide", "aerial", "skyline" in the query; a montage's `pan` on a wide photo |
| Medium | A person with context | The user's take (`cut.js`), stock "person working at desk" |
| Close-up | Emotion, detail, an object | Stock "close-up hands", "macro"; a reframe of the user's photo with `focus=` |
| Extreme close-up | A tiny detail, for impact | Sparingly; `punch:` on the keyword pushes in on it |
| Over-the-shoulder | What someone is doing | Stock "over the shoulder laptop" |
| Point of view | The viewer in the action | Stock "first person", the `pov` template |
| Cutaway / insert | Context, evidence, variety | `cut.js --broll` |
| Screen recording | Software, steps, proof | The `how-to` phone frame, the 3D `player`, `[bg: assets/screen.mp4]` |
| Diagram | Relationships, invisible processes | The 3D `cards` and `icons` shots |
| Chart | Quantities, accurately | The 3D `chart` with the user's real numbers, and `[source: ...]` |
| Before and after | A change, fairly compared | The `before-after` template, a montage `[before: ...]` |
| Reaction | Emotion, a punchline | The user's take; everyday templates |
| Texture / atmosphere | Mood, a pause | Stock "texture", "bokeh", "rain on window"; `look: cozy` or `cinematic` |
| Text card | The one thing to remember | `[card: 9 days late]` |

Write stock queries as shots, not topics: "close-up hands typing invoice
laptop night" finds a usable picture; "invoicing" finds a logo.

### Composition, measured

`fit.js` reads each picture as the frame crops it and `compose.js` prints its
notes before rendering: too small for the frame (soft), very dark or bright,
large clipped areas, no clear subject, busy behind the captions or the hook,
or a wide picture that loses most of its width in 9:16. When it fetches stock,
`compose.js` downloads three candidates per picture and keeps the one with
calm room behind the words (`media.js --pick-from`). For the user's own
photos:

- `[bg: assets/shop.jpg focus=30%,40%]` keeps the subject in frame however
  it's cropped (9:16 and 16:9 crop differently), and the slow zoom heads for it.
- A photo busy behind the captions: a calmer one, a focus point that moves the
  detail up, or panel captions (`captions-fx: panel`).
- Keep negative space for the hook (the top band) and captions (the band
  above the bottom quarter); platform buttons cover the bottom and right.
- Vary the shot size from line to line; the same framing for too long reads
  as monotony.

### Truthfulness

Stock and AI pictures set a scene; they never stand in for the user's
customers, team, product, or results. Nothing staged or generated is shown
as real evidence, and every license and credit is kept (`media.js` writes
`CREDITS.md`).

### Prompting AI pictures

For a connected image or video model (always quoted and approved first,
`video-rendering.md`), and for the prompts `visual-brief-generator` writes.
Build every prompt in this order:

**Subject + action + environment + composition + lighting + palette + style +
aspect ratio + exclusions**

> A young adult at a desk using a laptop, seen from a slightly raised rear
> three-quarter angle, a quiet bedroom at night, the subject on the right with
> calm empty space on the left and in the top fifth for the title, soft
> monitor light, muted navy and warm amber, cinematic editorial photography,
> vertical 9:16, no text, no logos, no watermark.

- **Leave room for the words.** Say where the calm space goes: the top band
  for the hook, the band above the bottom quarter for captions (or the side
  the subject isn't on). `fit.js` measures it once the picture is in.
- **Keep scenes consistent.** Write a short visual spec once (the character,
  clothing, place, time of day, palette, light direction, camera angle, art
  style) and repeat it word for word in every prompt; change only what should
  change from scene to scene.
- **Pixel art:** the pixel scale (e.g. "a 135x240 canvas, each pixel crisp"),
  a palette limit ("16 colors"), the outline color, the perspective, the
  character and place, a transparent background if it's an asset, and
  whether it's one picture or a sprite sheet (then the exact cell count, cell
  size, and spacing; check every frame lines up).
- **3D:** the object or scene, the camera angle, one material (matte, glass,
  metal, soft plastic), the lighting (key, fill, rim), the background, the
  palette, the render style, the aspect ratio, and no text or logos.
- **The workflow:** write the spec, generate a few options, pick one
  direction, reuse its description, make the scene variations, then inspect
  each for anatomy, object details, perspective, and garbled text, and
  replace weak ones. Grade and crop them all the same way.
- **Never trust what a model draws as text, a logo, an interface, or a
  fact.** Put real words on in the edit (captions, `[card: ...]`), and the
  real product screens in (`screen=`, the 3D `hero` and `desk` shots).

## Typography

- Two families: a distinctive headline font for the hook and text cards, and
  a readable body font for captions and labels. Hierarchy comes from size and
  weight, not more fonts.
- Sentence case for explanations; capitals only for short labels (the bold
  look and the `luxury` and `suspense` hooks are short on purpose).
- Hierarchy: the hook largest and briefest; then the caption; labels and
  sources small but readable (a `[source: ...]` is 36px, about 13pt on a
  phone, and stays up for the whole line); the CTA visible but not competing.
- Text on a busy picture needs support: an outline (the default captions), a
  panel (`captions-fx: panel`), a soft halo (`fade`), or a darker picture.
- Don't repeat the voiceover word for word in big text: a `[card: ...]` shows
  the key phrase ("9 days late") while the voice says the sentence.

## Motion

Motion should direct attention, show change, explain a relationship, create
rhythm, or express emotion. Without one of those jobs it's noise.

### Intensity

| `motion:` | For | What it allows |
|---|---|---|
| `low` | Interviews, serious explainers, premium products, calm education, motion-sensitive viewers | Cuts, dissolves, blurs, masks; gentle 4% punch-ins; no shakes, flashes, glitches, spins, or whips; calmer captions; longer holds |
| `medium` | Tutorials, commentary, lifestyle, most YouTube | The style's cuts and accents, but shakes only on the drop, and no flashes or spins after it |
| `high` | Comedy, gaming, energetic short-form, music montages | Everything the style does |

Intensity isn't quality: a quiet push-in can do more than ten effects.
`motion: low` is the calmer alternative to offer anyone who finds an energetic
cut uncomfortable.

### Transitions with intention

Most cuts are a clean cut (or a dissolve in a calm look). Each editing style
saves its conspicuous transitions for the moments that mean something: the
drop out of the hook, the payoff, a turn every few cuts, and any line marked
`[cut: ...]` (a time jump, a change of topic, a reveal). A different
transition on every cut reads as random; `--check` notes it.

### Principles

- One thing moves at a time: the picture, or the words, or the graphic. The
  camera layer moves the picture and never the captions.
- Short movements feel snappy, long ones calm; everything eases in and out.
- Similar things move the same way: every keyword gets the same punch-in.
- The most important element gets the clearest movement.
- No more than three flashes in any second (`--check` fails it); keep shakes
  for a few hits.
- Three levels, never all strong at once: the primary move (the camera, the
  big reveal), the secondary (the words, a label), and ambient (grain, a slow
  drift). Alternate stillness and movement, slow and fast, wide and close.

### What each movement says

| Movement | Effect | Here |
|---|---|---|
| Zoom in | Focus, importance, intimacy | `kbIn`, a keyword punch-in, a montage `push-in` |
| Zoom out | Reveal, context, an ending | `kbOut`, `pull-out` |
| Pan | Exploring a wide picture | `kbLeft` / `kbRight`, `pan-left` / `pan-right` |
| Tilt | Height or detail | `kbUp` / `kbDown`, `rise` |
| Slide | An organized entrance | `[cut: slide]`, a template's `.slide` |
| Fade | A gentle arrival or exit | `[cut: fade]`, `captions-fx: fade` |
| Scale pop | Energy on a hook or keyword | `hook-fx: bounce`, `.pop` |
| Rotation | Playful or dimensional | `[cut: spin]` (high motion only) |
| Parallax | Depth from stills | A montage photo's `orbit`, `dolly-in`, `rise` |
| Mask reveal | Discovery | `[cut: mask]` |
| Tracking | Following a subject | A still's own move, a montage `[callout: ...]`; not built for a moving subject in a clip |

### Plan the movement

Before rendering, write one row per scene and show it with the visual recipe:

| Scene | What moves | Direction | Speed | Purpose |
|---|---|---|---|---|
| Opening | The camera | In | Medium | Grab attention |
| Problem | The text | Rises in | Slow | Introduce the idea |
| Explanation | A diagram | Builds | Medium | Show the relationship |
| Product | The product or UI | Scales and slides in | Controlled | Reveal the solution |
| Ending | The camera | Out | Slow | Give closure |

For every move: what moves, why, where it starts and ends, how fast, and does
it compete with the words or the subject? Sound follows the same plan: a soft
`swish` on a panel coming in, a `click` on a tap, a low `boom` on the big
reveal, and none on most moves.

## Pacing

- Change the picture when the idea, the evidence, the action, or the feeling
  changes, not on a timer. A long line gets its next picture where its clause
  turns (after a comma, at "and", "but", "so"), on the beat when one is close.
- Hold a picture long enough to understand it; give the important idea a pause.
- After an intense run, a wider or calmer shot.
- Watch it muted (can it still be followed?) and listen without watching (does
  the audio make sense?).
- Short-form shape: an opening question, result, or surprising picture; one
  idea at a time with its evidence; a pattern change when attention needs a
  reset; the payoff; an ending that summarizes or asks one thing.

## A visual map, line by line

Give every line one visual mode, chosen with the decision below:

| Mode | How to write the line |
|---|---|
| A-roll (the person or the action) | The user's take, `cut.js` |
| B-roll | `[bg: assets/their-clip.mp4]`, or `[bg: a stock shot query]` |
| Screenshot or screen recording | `[bg: assets/screen.png]`; on a device in their photo: `screen=` and `at=` |
| Photograph | `[bg: assets/photo.jpg focus=40%,35%]` |
| Diagram or chart | `style: 3d` with `[shot: cards ...]`, `[shot: chart values=...]` |
| Text card | `[card: the key phrase]` |
| Motion graphic | A template scene, or a 3D shot |
| A pause | A longer hold, a calm picture, `[cut: fade]` |

**For each line, in order:**
1. Does the viewer need to see a real object, action, place, or process?
   Show the user's footage, a demonstration, a screenshot, or an accurate diagram.
2. Is the point emotion or atmosphere? Use composition, light, color, and
   pace: a texture or establishing shot in the look's grade.
3. Is the idea abstract or invisible? A diagram, an analogy, a labeled example,
   or a text card.
4. Is it a number or a comparison? A truthful chart, or a card, with
   `[source: ...]` on screen.
5. Does motion help understanding or feeling? Animate that element; otherwise
   a still picture or a clean cut.

Can a viewer say why each picture is on screen? If not, simplify.

## Platforms

- **Vertical (9:16):** design for the phone; keep the subject, captions, and
  graphics clear of the platform's buttons; make the first frame understandable
  at once; check the first frame (the cover), and the last.
- **YouTube long-form and landscape (16:9):** readable on a laptop and a phone;
  recurring titles, lower thirds, and color roles; alternate talking head,
  demonstration, b-roll, diagrams, and pauses.
- **Both from one script:** compose each format (`--format landscape`), set
  `focus=` on photos so each crop keeps its subject, and check every export.

## The final check

What `render.js --check` and `check.js` measure for you: text inside the safe
area, nothing overflowing or colliding, the hook on the first frame, reading
time, pacing notes, text contrast against the real picture, flashes per
second, constant shaking, every picture moving the same way, and a different
transition on every cut. `compose.js` adds each picture's fit and the hook's
problems; `hook.js --script` checks the hook's three layers and asks for a
source on every number.

What only eyes can judge, on the `--slides` frames and a phone:

- The style fits the topic, audience, and feeling; one dominant style.
- Every picture is relevant, accurate, permitted, and clear at phone size.
- Colors keep their jobs; text is readable at low brightness.
- Motion has a purpose; there are calm moments; the ending is intentional.
- The opening states the topic or promise; the final export was watched end to end.

## Common mistakes

| Mistake | The fix here |
|---|---|
| Colors chosen because they look cool | Start from `goal:` and the brand's identity |
| Too many fonts and colors | One look; two font families; the accent for keywords only |
| Generic stock footage | Shot-specific queries, the user's own material first, a `[card:]` instead |
| Random zooms and transitions | One base cut; accents on the turns (`[cut: ...]`) |
| Tiny text | Captions stay large; sources are 36px; `--check` measures contrast |
| Captions covering the subject | `focus=` moves the subject up; panel captions |
| Every shot looks the same | Vary the shot size; the moves rotate (`--check` notes when they don't) |
| Constant movement | `motion: medium` or `low`; calm shots between hits |
| Over-saturated grade | Pick a natural look (`documentary`, `minimal`) for products and food |
| Misleading charts | The user's real numbers, labeled, with `[source: ...]` |
| AI imagery as evidence | Never; label it, and only for illustration |
| Designed on a big monitor | Look at `--slides` at phone size |
| Looks random | No direction: write the one sentence, then `goal:` or `look:` |
| Pictures don't match | One grade for all (the look's); replace the odd one, or crop it to match |
| A crowded frame | Remove 30%: keep only what carries the message, then compare |
| Product unclear | A clean hero shot (the user's own) and one focused demonstration |
| Pixel art looks blurry | `style: pixel` keeps hard edges; never a smooth zoom or a sharp photo pasted in |
| 3D looks artificial | Fewer materials, the sets' own lighting, one object at a time |
| A mixed style feels messy | One primary style; the others each with a job (see "Mixed styles") |
| Unsure which way to go | Make the same script in three looks (or three palettes), render `--slides` for each, and compare |
