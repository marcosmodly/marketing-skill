#!/usr/bin/env node
'use strict';
/*
 * Builds a narrated video page from a script, in one step: a voiceover line by line, one
 * background per line, word-by-word captions synced to the voice, the hook on screen from the
 * first frame, and the project's sound. The page is templates/narrated.html's look (or, with a
 * style, 3d.html's or pixel.html's), timed to the voice; render.js turns it into the MP4.
 *
 * Usage:
 *   node compose.js <script.md> [--out <page.html>] [--voice af_heart] [--speed 1]
 *                   [--style photo|3d|pixel] [--format portrait|landscape] [--no-media] [--no-check]
 *
 * The script is Markdown: optional frontmatter, then numbered lines, one per scene. A line can
 * end with a background: [bg: a search query] fetches a stock photo for it (media.js), and
 * [bg: assets/file.jpg] uses a file (a .mp4 or .mov plays as a clip).
 *
 *   ---
 *   title: three invoice mistakes
 *   hook: you're losing money on every late invoice     # on screen from the first frame
 *   cta: one money habit a week                         # on screen in the last scene
 *   voice: af_heart                                     # a voice.js voice, or:
 *   recordings: assets/invoices-{n}.m4a                 # the user's own takes, one per line, instead
 *   bg: freelancer desk                                 # for lines without their own [bg: ...]
 *   bg-type: photo                                      # or video (needs a Pexels or Pixabay key)
 *   music: identity                                     # identity (default), none, a genre, or assets/track.mp3
 *   edit: ugc                                           # how it's cut (below): ugc, kinetic, fast, cinematic, meme, clean
 *   ---
 *   1. Most freelancers lose money on invoices they send late. [bg: stressed laptop night]
 *   2. Clients pay fastest when the invoice lands the day the work ends.
 *
 * Animated styles: "style: 3d" draws each line's background as a 3D scene (templates/3d.html)
 * and "style: pixel" as pixel art (templates/pixel.html, with chiptune music in the identity's
 * key and hook). Each line gets a shot instead of a photo, picked in turn unless the line names
 * one, with the shot's settings as key=value pairs:
 *   1. Every freelancer starts at level one. [shot: walk time=sunset]
 *   2. We built it for this screen. [shot: hero src=assets/app-screen.png]
 *   3. Plan it, film it, post it. [shot: cards items="Plan,Film,Post"]
 * The shots and their settings are listed at the top of each template. With "style: 3d" and no
 * shots named, the brand's 3D mascot presents: it waves, talks with the voice, points, and cheers.
 *   1. We built an editor that edits for you. [shot: desk src=assets/app-screen.png]
 *   2. Here it is. [shot: mascot do=present prop=screen src=assets/app-screen.png]
 *
 * The bold look ("captions: bold"): heavy capitals boxed in black, each word popping as it's
 * said. A short line (up to 8 words) shows whole, a longer one a few words at a time so it
 * doesn't bury the picture, and the first line shows whole from frame 0, so it makes the cover. *Words* in asterisks stay yellow, in the lines and the hook (the asterisks
 * aren't spoken). When the hook is the first line, it shows once, as that line's caption.
 * "series: week 2" and "brand: Your Name" put a tag in each top corner for the whole video.
 *
 * The product demo (a launch video's look): the product's own screens instead of a presenter. A
 * terminal types its real commands, an AI agent's session streams the steps a skill takes and the
 * document it writes, the real things it made float past, and the camera moves from one screen to
 * the next without a cut, starting by pushing into the monitor of a desk at night. "captions:
 * subtitle" keeps the words small and quiet, a phrase at a time, so the screens carry the video.
 *   1. I built a plugin that does my marketing. [shot: desk mascot=no]
 *   2. One command installs it. [shot: terminal lines="$ claude plugin install you@you|Installed"]
 *   3. Ask it for a battlecard. [shot: agent ask="Research Acme" steps="Web Search(acme)" done="Ready."]
 *   4. It made all of these. [shot: wall items="assets/a.jpg,assets/b.jpg"]
 * Show real commands, real output, and the steps the skill really takes (references/
 * video-rendering.md has the recipe).
 *
 * The edit ("edit:", default auto; edit.js and references/editing-techniques.md): how the video is
 * cut, in one word. ugc (hard cuts and punch-ins on the beat, a fast zoom on the hook, bouncing
 * captions), kinetic (slides, masks, and wipes, the words building as they're said), fast
 * (micro-cuts, whips, glitches, and flashes, a rapid-montage hook, a riser into the drop),
 * cinematic (blurs, light leaks, a film burn, grain, a vignette, a warm grade, J-cuts), meme
 * (exaggerated punch-ins that shake on the keywords), or clean (crossfades and slow zooms). auto
 * picks by the sound's genre and energy. Each part can be set on its own:
 *   edit: ugc
 *   hook-fx: glitch          # what moves in the first half second: zoom, shake, glitch, flash, bounce, montage, none
 *   transitions: whip, punch # the cuts between lines, in turn (fade, cut, flash, slide, whip, zoom, punch,
 *                            # wipe, glitch, spin, blur, mask, leak, burn); drop: the one out of the hook
 *   punch: 10%               # the camera punching in on each *keyword* as it's said (no to turn it off)
 *   captions-fx: kinetic     # pop, bounce, kinetic, or fade
 *   grain: yes               # film grain; vignette: yes darkens the edges
 *   max-hold: 3              # the longest one picture holds before a new one or a reframe (0: never split)
 *   j-cut: 0.2               # how far each line's voice leads its picture
 * And per line: [cut: glitch] for how that line comes in, [bg: a | b | c] for several pictures
 * cut between as it's said (b-roll; one query alone fetches as many as the line needs).
 *
 * Your own character: "character: assets/hero.glb" puts the user's rigged 3D character (a .glb
 * from Blender, Ready Player Me, or VRoid, a .vrm, or Mixamo's .fbx) in the robot mascot's place in every shot it
 * appears in; [shot: mascot do=wave character=assets/other.glb] in just one. Its own clips play when
 * their names match the action (Wave, Walking, Dance...), otherwise its skeleton is posed like the
 * robot's, and it lip-syncs through its blend shapes (templates/character.py).
 *
 * Landscape: "format: landscape" (or --format landscape) makes the same video 1920x1080 (16:9)
 * for YouTube, Reddit, and LinkedIn, with the captions low and centered and the 3D sets
 * opened out to the wider frame. Pixel art stays vertical.
 *
 * A screen in a photo: [bg: assets/me-laptop.jpg screen=assets/app.png at=x1,y1,x2,y2,x3,y3,x4,y4]
 * puts the user's screenshot on the laptop or phone screen in their own photo, from the screen's
 * four corners in the photo's pixels (top left, top right, bottom right, bottom left), moving
 * with the photo's zoom. Check the fit with render.js --stills.
 *
 * Voices come from voice.js (Kokoro, free and local; `npm install kokoro-js` once) unless
 * `recordings` points at the user's own files. The music follows the Sonic Identity saved in
 * references/brand-voice.md, one energy step lower so it sits under the voice, with scene
 * changes moved onto its beat, and the look follows its Visual Identity (brand.js), end card
 * included. Without --out, the page goes to state/videos/<date>-<slug>.html,
 * with media and voice files in state/videos/assets/.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { parseScript } = require('./voice');
const { prepareVoice } = require('./render');
const { visualIdentity, applyIdentity } = require('./brand');
const { analyseTrack, alignTrack } = require('./beats');
const EDIT = require('./edit');
const LOOK = require('./look');
const FIT = require('./fit');
const captions = require('./captions');

const ROOT = path.resolve(__dirname, '..', '..');
const LEAD = 0.15; // the first line starts almost at once; the hook is already on screen
const GAP = 0.35; // a beat between one line ending and the next scene
const TAIL = 1.2; // after the last line, room for the sonic logo
const BOLD_WHOLE = 8; // in the bold look, lines of up to this many words show whole
// Landscape (16:9): the same page in a 1920x1080 frame, the text low and centered, as YouTube,
// Reddit, and LinkedIn show it; the 3D shots read the canvas's size and widen their framing.
const LANDSCAPE_CSS = `<style>
  html, body { width: 1920px; height: 1080px; }
  .art { width: 1920px; height: 1080px; }
  .scene, .endcard { left: 170px; right: 170px; top: 70px; bottom: 52px; }
  .say { font-size: 62px; }
  .narr .say { min-height: 0; }
  .hook { font-size: 56px; }
  .bold .say.line, .bold .say.auto:not(.line) { font-size: 54px; }
  .bold .say.line { max-width: 1340px; margin: 0 auto; }
  .bold .hook { font-size: 50px; }
  .corner { top: 42px; font-size: 34px; }
  .corner.brand { left: 64px; }
  .corner.series { right: 64px; }
  .bg-card { left: 170px; right: 170px; top: 70px; bottom: 330px; }
</style>
`;
const MEDIA_EXT = /\.(jpe?g|png|webp|gif|mp4|mov|webm|m4v)$/i;
const VIDEO_EXT = /\.(mp4|mov|webm|m4v)$/i;

// The looks a script can take: photo backgrounds, or a background drawn per line. A drawn style
// opens on `first`, closes on `last`, and takes the middle lines' shots from `cycle` in turn,
// each with the sound it lands on (one per shot, so effects don't crowd the voice). The cycles
// leave out shots that would claim something: a chart without the user's numbers, or a product
// screen without their screenshot.
const STYLES = {
  photo: { template: 'narrated.html' },
  '3d': {
    template: '3d.html', canvas: '<canvas class="art" width="1080" height="1920" data-lint="off"></canvas>',
    shots: ['mascot', 'desk', 'title', 'icons', 'notes', 'button', 'terminal', 'agent', 'wall', 'player', 'comments', 'shapes', 'hero', 'cards', 'chart', 'coin', 'rings', 'globe'],
    // the mascot presents, with a few abstract shots between its lines for pace
    first: 'mascot do=wave', last: 'mascot do=cheer',
    cycle: ['mascot do=talk', 'globe', 'mascot do=point', 'cards', 'mascot do=thumbs', 'rings', 'mascot do=present', 'shapes'],
    sfx: { cards: 'swish:card-1', coin: 'ding:land', 'mascot:cheer': 'pop:land', 'mascot:walk': 'pop:stop', desk: 'whoosh:enter', title: 'pop:done', icons: 'pop:done', notes: 'swish:note-1', button: 'click:click',
      terminal: 'typing:type', agent: 'typing:type', wall: 'swish:done', player: 'click:play', comments: 'typing:type' },
  },
  pixel: {
    template: 'pixel.html', canvas: '<canvas class="art" width="135" height="240" data-lint="off"></canvas>',
    shots: ['walk', 'boss', 'coins', 'levelup', 'city', 'space', 'photo'],
    first: 'walk', last: 'space', cycle: ['boss', 'coins', 'levelup', 'city'], // pixel's own shots, no mascot
    sfx: { boss: 'hurt:hit', coins: 'coin:open', levelup: 'powerup:up' },
    music: 'chiptune', // in the identity's key and hook, the way everyday posts borrow a genre
  },
};

// "[shot: hero src=assets/screen.png]" -> { name: 'hero', attrs: { src: 'assets/screen.png' } }
function parseShot(text) {
  const [name, ...rest] = text.trim().split(/\s+/);
  const attrs = {};
  for (const m of rest.join(' ').matchAll(/([\w-]+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g)) attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4];
  return { name: name.toLowerCase(), attrs };
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-media') args.noMedia = true;
    else if (a === '--no-check') args.noCheck = true;
    else if (['--out', '--voice', '--speed', '--style', '--format'].includes(a)) args[a.slice(2)] = argv[++i];
    else if (a === '-h' || a === '--help') args.help = true;
    else args.positional.push(a);
  }
  return args;
}

function parseFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split('\n')) {
    // a comment starts at " # ", so a value can still hold "#" ("lot #12", "DRE #0123")
    const kv = /^\s*([\w-]+)\s*:\s*(.*?)(?:\s+#\s.*)?\s*$/.exec(line);
    if (kv) meta[kv[1].toLowerCase()] = kv[2].replace(/^["']|["']$/g, '');
  }
  return { meta, body: text.slice(m[0].length) };
}

// "assets/me.jpg screen=assets/app.png at=1,2,3,4,5,6,7,8" -> { query: 'assets/me.jpg', screen, at }
function parseBg(text) {
  const opts = {};
  const query = text.replace(/\s+([\w-]+)=("[^"]*"|\S+)/g, (_, k, v) => { opts[k.toLowerCase()] = v.replace(/^"|"$/g, ''); return ''; }).trim();
  return { query, ...opts };
}

// *keywords* in a line: the text without the asterisks (what's spoken and captioned), and the
// words to keep lit in the bold look
// ~words~ in tildes are the wrong way (struck through in the caution color): "send it on ~Friday~"
const CAUTION = /~([^~\s](?:[^~]*[^~\s])?)~/g;
const plainText = (s) => s.replace(/\*([^*]+)\*/g, '$1').replace(CAUTION, '$1');
const wordKey = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const keywords = (s) => [...s.matchAll(/\*([^*]+)\*/g)].flatMap((m) => m[1].split(/\s+/)).map(wordKey).filter(Boolean);
const cautions = (s) => [...s.matchAll(CAUTION)].flatMap((m) => m[1].split(/\s+/)).map(wordKey).filter(Boolean);

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'narrated';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r2 = (t) => Math.round(t * 100) / 100;

// The Sonic Identity from brand-voice.md (or a client's profile), or null while it's still the placeholder.
function sonicIdentity(file = path.join(ROOT, 'references', 'brand-voice.md')) {
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const section = (/^## Sonic Identity\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(text) || [])[1] || '';
  if (!section.trim() || /not yet configured/i.test(section)) return null;
  const field = (name) => ((new RegExp(`^-\\s*${name}:\\s*(.+)$`, 'mi')).exec(section) || [])[1];
  const key = /([A-G](?:#|b)?)\s*(major|minor)?/i.exec(field('Key') || '');
  const id = {
    music: (field('Genre') || '').trim().toLowerCase(),
    bpm: parseFloat(field('Tempo')),
    key: key ? key[1].toUpperCase() + key[1].slice(1) : undefined,
    mode: key && key[2] ? key[2].toLowerCase() : undefined,
    energy: parseFloat(field('Energy')),
    motif: (field('Hook') || '').trim(),
  };
  return id.music ? id : null;
}

// The template's own body settings, as the fallback for anything the identity doesn't set.
function templateDefaults(html) {
  // the real <body> tag, after </head> (a template's doc comment can mention <body> too)
  const body = /<body([^>]*)>/.exec(html.slice(html.indexOf('</head>')))[1];
  const out = {};
  for (const m of body.matchAll(/data-([\w-]+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

function run(cmd, args, opts = {}) {
  return spawnSync(process.execPath, [path.join(__dirname, cmd), ...args], { encoding: 'utf8', ...opts });
}

// One stock photo or clip for a query, via media.js. Returns a path relative to the page, or null.
function fetchBackground(query, assets, type, count = 1, { landscape = false } = {}) {
  // three candidates for each picture kept, so the one with calm room behind the words wins (fit.js)
  const res = run('media.js', ['search', query, '--out', assets, '--count', String(count), '--pick-from', String(Math.min(10, count * 3)),
    ...(landscape ? ['--landscape'] : []), ...(type === 'video' ? ['--type', 'video'] : [])]);
  if (res.status !== 0) {
    console.warn(`Note: no background for "${query}": ${(res.stderr || '').trim().split('\n').slice(-3).join(' ')}`);
    return count > 1 ? [] : null;
  }
  try {
    const data = JSON.parse(res.stdout.slice(res.stdout.indexOf('{')));
    const files = data.files.map((f) => `assets/${f.file}`);
    return count > 1 ? files : files[0] || null;
  } catch {
    return count > 1 ? [] : null;
  }
}

// The user's screenshot on the screen in their photo: a projective map from the screenshot's own
// corners to the four in data-at (photo pixels, after the photo is cropped to fill the frame),
// set before the first frame. It sits in .bg-insert, which zooms with the photo.
const INSERT_JS = `<script>
window.renderReady = Promise.all([...document.querySelectorAll('.bg-insert')].map(async (box) => {
  const photo = box.parentElement.querySelector('img.bg-media');
  const shot = box.querySelector('img');
  await Promise.all([photo.decode(), shot.decode()]);
  // the frame's size, and where the crop sits (the focus point, centered by default)
  const [W, H] = [box.parentElement.clientWidth, box.parentElement.clientHeight];
  const [px, py] = getComputedStyle(photo).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
  const k = Math.max(W / photo.naturalWidth, H / photo.naturalHeight);
  const [ox, oy] = [(W - photo.naturalWidth * k) * px, (H - photo.naturalHeight * k) * py];
  const at = box.dataset.at.split(/[\\s,]+/).map(Number);
  const [w, h] = [shot.naturalWidth, shot.naturalHeight];
  const rows = [], rhs = [];
  [[0, 0], [w, 0], [w, h], [0, h]].forEach(([x, y], i) => {
    const [u, v] = [ox + at[2 * i] * k, oy + at[2 * i + 1] * k];
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); rhs.push(u);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y]); rhs.push(v);
  });
  for (let c = 0; c < 8; c++) { // Gaussian elimination with partial pivoting
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(rows[r][c]) > Math.abs(rows[p][c])) p = r;
    [rows[c], rows[p]] = [rows[p], rows[c]]; [rhs[c], rhs[p]] = [rhs[p], rhs[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = rows[r][c] / rows[c][c];
      for (let j = c; j < 8; j++) rows[r][j] -= f * rows[c][j];
      rhs[r] -= f * rhs[c];
    }
  }
  const [a, b, c, d, e, f, g, hh] = rhs.map((v, i) => v / rows[i][i]);
  shot.style.width = w + 'px';
  shot.style.height = h + 'px';
  shot.style.transform = 'matrix3d(' + [a, d, 0, g, b, e, 0, hh, 0, 0, 1, 0, c, f, 0, 1].join(',') + ')';
}));
</script>
`;

// One background slot: its picture, when it comes in and goes (edit.js slotTimes), how it comes
// in (a transition class), and its camera move.
function bgSlot(i, shot, slot, extraClass = '') {
  const cls = ['bg', i === 0 ? 'now' : EDIT.transitionClass(shot.transition), shot.card ? 'card' : '', extraClass].filter(Boolean).join(' ');
  // a focus point keeps the subject in frame however the picture is cropped (9:16 or 16:9), and is where its zoom heads
  const [fx, fy] = String(shot.focus || '').split(',').map((v) => v.trim());
  const focus = fx && fy ? `; --ox:${fx}; --oy:${fy}; --fx:${fx}; --fy:${fy}` : '';
  const style = `--in:${slot.into}s; ${slot.out !== null ? `--out:${slot.out}s; ` : ''}--dur:${slot.dur}s${shot.move ? `; --kb:${shot.move}` : ''}${focus}`;
  const media = shot.media;
  const insert = shot.insert;
  const len = shot.card ? plainText(shot.card).length : 0;
  const inner = shot.card ? `<div class="bg-card"><b style="--card-size:${len <= 10 ? 170 : len <= 18 ? 140 : len <= 30 ? 112 : 92}px">${marked(shot.card)}</b></div>`
    : !media ? ''
      : VIDEO_EXT.test(media) ? `<video class="bg-media" src="${esc(media)}"${shot.offset ? ` data-offset="${shot.offset}"` : ''}></video>`
        : `<img class="bg-media" src="${esc(media)}" alt="">${insert ? `<div class="bg-insert" data-at="${esc(insert.at)}"><img src="${esc(insert.screen)}" alt=""></div>` : ''}`;
  return `  <!-- ${shot.card ? 'text card' : 'background'}, ${r2(shot.start)}–${r2(shot.end)}s${i > 0 ? `, ${shot.transition}` : ''} -->\n  <div class="${cls}" style="${style}">${inner}</div>`;
}

// Text with its marks as markup: *keywords* lit in the accent, ~wrong~ struck through in the caution color.
const marked = (text) => esc(text).replace(/\*([^*]+)\*/g, '<b class="kw">$1</b>').replace(CAUTION, '<span class="no">$1</span>');

// Where a line's pictures change, so a long line gets a new picture (or a reframe) every
// maxHold seconds, cut on the beat: the split points between start and end. With the montage
// hook, the first line opens on a burst of quick cuts instead.
function splitPoints(start, end, k, { snapTo, micro, clauses = [] } = {}) {
  const points = [];
  if (micro) {
    for (let j = 1; j < k && start + j * micro < end - 0.9; j++) points.push(r2(start + j * micro));
    return points;
  }
  const reach = (0.45 * (end - start)) / k;
  for (let j = 1; j < k; j++) {
    let p = start + (j * (end - start)) / k;
    // the nearest place the line's idea turns, if there's one close to the even split
    const near = clauses.filter((c) => Math.abs(c - p) <= reach).sort((a, b) => Math.abs(a - p) - Math.abs(b - p))[0];
    if (near !== undefined) p = near;
    if (snapTo) {
      const q = snapTo(p);
      if (near === undefined || Math.abs(q - p) <= 0.2) p = q; // on the beat when it doesn't pull the cut off the clause
    }
    if (p - (points[points.length - 1] ?? start) >= 0.9 && end - p >= 0.9) points.push(r2(p));
  }
  return points;
}

// When each clause of a line starts (after a comma or a full stop, or at "and", "but", "so"...),
// in video time, from its timed words: where a new picture reads as part of the sentence.
const TURNS = new Set(['and', 'but', 'so', 'because', 'then', 'when', 'while', 'or', 'until', 'which', 'if', 'now']);
function clauseStarts(line, words) {
  const out = [];
  words.forEach((w, i) => {
    if (i === 0) return;
    const prev = words[i - 1].text;
    if (/[,;:.!?\u2014\u2013]$/.test(prev) || TURNS.has(wordKey(w.text))) out.push(w.start);
  });
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scriptFile = args.positional[0];
  if (args.help || !scriptFile) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^[\s\S]*?\/\*/, '').replace(/^ \* ?/gm, ''));
    process.exit(args.help ? 0 : 2);
  }
  if (!fs.existsSync(scriptFile)) fail(`No script at ${scriptFile}`);
  const { meta, body } = parseFrontmatter(fs.readFileSync(scriptFile, 'utf8'));
  const styleName = String(args.style || meta.style || 'photo').toLowerCase();
  const style = STYLES[styleName];
  if (!style) fail(`Unknown style "${styleName}" (use ${Object.keys(STYLES).join(', ')}).`);
  const lines = parseScript(body).map(({ n, text }) => {
    // [bg: a | b] gives a line several backgrounds, cut between as it's said (b-roll)
    const bgs = ((/\[bg:\s*([^\]]+)\]/i.exec(text) || [])[1] || meta.bg || '').split('|').map((b) => parseBg(b.trim())).filter((b) => b.query);
    const bg = bgs[0] || parseBg('');
    const shot = /\[shot:\s*([^\]]+)\]/i.exec(text);
    const cut = /\[cut:\s*([^\]]+)\]/i.exec(text);
    // [card: 9 days late] shows the line's key phrase as a text card instead of a picture;
    // [source: ...] puts a source or caveat for its claim on screen while it's said
    const card = /\[card:\s*([^\]]+)\]/i.exec(text);
    const source = /\[source:\s*([^\]]+)\]/i.exec(text);
    const said = text.replace(/\s*\[(bg|shot|cut|card|source):[^\]]*\]/gi, '').trim();
    return {
      n, text: plainText(said), kw: keywords(said), no: cautions(said),
      bg: bg.query, more: bgs.slice(1).map((b) => b.query), screen: bg.screen, at: bg.at, focus: bg.focus, shot: shot ? parseShot(shot[1]) : null,
      cut: cut ? cut[1].trim().toLowerCase() : null, card: card ? card[1].trim() : null, source: source ? source[1].trim() : null,
    };
  }).filter((l) => l.text);
  const badCut = lines.find((l) => l.cut && !EDIT.TRANSITIONS[l.cut]);
  if (badCut) fail(`Line ${badCut.n}: [cut: ${badCut.cut}]? The transitions are ${Object.keys(EDIT.TRANSITIONS).join(', ')}.`);
  if (lines[0] && lines[0].cut) console.warn(`Note: [cut: ...] on line ${lines[0].n} is ignored; it says how a line comes in, and the first is on screen from frame 0.`);
  const bold = String(meta.captions || '').toLowerCase() === 'bold';
  const subtitle = String(meta.captions || '').toLowerCase() === 'subtitle';
  const format = String(args.format || meta.format || 'portrait').toLowerCase();
  const landscape = ['landscape', '16:9', 'wide'].includes(format);
  if (!landscape && !['portrait', '9:16', 'vertical'].includes(format)) fail(`Unknown format "${format}" (use portrait or landscape).`);
  if (landscape && styleName === 'pixel') fail('Pixel art is drawn for a vertical frame; use style 3d or photo for a landscape video.');
  if (!lines.length) fail(`No lines in ${scriptFile}; number them "1. ...", one per scene.`);
  if (style.shots) {
    if (lines.some((l) => l.bg)) console.warn(`Note: [bg: ...] and bg: are for photo backgrounds; style ${styleName} draws each line's background, so they're ignored (use [shot: ...]).`);
    const bad = lines.filter((l) => l.shot && !style.shots.includes(l.shot.name));
    if (bad.length) fail(`Unknown shot${bad.length > 1 ? 's' : ''} for style ${styleName}: ${bad.map((l) => `"${l.shot.name}" (line ${l.n})`).join(', ')}. The shots are ${style.shots.join(', ')}.`);
    let k = 0;
    lines.forEach((l, i) => {
      if (l.shot) return;
      l.shot = parseShot(i === 0 ? style.first : i === lines.length - 1 && lines.length > 1 ? style.last : style.cycle[k++ % style.cycle.length]);
    });
  } else if (lines.some((l) => l.shot)) {
    console.warn('Note: [shot: ...] needs "style: 3d" or "style: pixel" in the frontmatter; ignored for photo backgrounds.');
  }

  // the user's own rigged character in the mascot's place (character.py), from the script or the Visual Identity
  const character = (meta.character || '').trim();
  if (character && styleName !== '3d') console.warn('Note: character: is for style 3d, where it takes the mascot\'s place; ignored.');
  const slug = slugify(meta.title || path.basename(scriptFile, path.extname(scriptFile)));
  const page = path.resolve(args.out || path.join(ROOT, 'state', 'videos', `${new Date().toISOString().slice(0, 10)}-${slug}.html`));
  const dir = path.dirname(page);
  const assets = path.join(dir, 'assets');
  fs.mkdirSync(assets, { recursive: true });
  if (character && !/\.(glb|vrm|fbx)$/i.test(character)) fail(`character: ${character} isn't a .glb, .vrm, or .fbx file; export the rigged character from Blender or VRoid as glTF binary (.glb), which carries its textures inside, or use Mixamo's .fbx download as it is.`);
  if (character && !fs.existsSync(path.join(dir, character))) console.warn(`Note: ${character} (the character) not found next to the page; put it in assets/`);
  for (const l of lines) {
    const src = l.shot && l.shot.attrs.src;
    if (src && !fs.existsSync(path.join(dir, src))) console.warn(`Note: ${src} (line ${l.n}'s ${l.shot.name} shot) not found next to the page; put it in assets/`);
    if (l.screen && !fs.existsSync(path.join(dir, l.screen))) console.warn(`Note: ${l.screen} (line ${l.n}'s screen) not found next to the page; put it in assets/`);
    if (l.screen && !/^(\s*-?[\d.]+\s*,){7}\s*-?[\d.]+\s*$/.test(l.at || '')) fail(`Line ${l.n}: screen= needs at=x1,y1,x2,y2,x3,y3,x4,y4, the screen's corners in the photo's pixels (top left, top right, bottom right, bottom left).`);
  }

  // ---- the voice: the user's recordings, or a generated voice
  let clips;
  if (meta.recordings) {
    clips = lines.map((l) => meta.recordings.replace('{n}', String(l.n)));
    const missing = clips.filter((c) => !fs.existsSync(path.join(dir, c)));
    if (missing.length) fail(`Recordings not found (relative to ${dir}):\n${missing.map((m) => `- ${m}`).join('\n')}`);
  } else {
    const voice = args.voice || meta.voice || 'af_heart';
    const speed = String(args.speed || meta.speed || 1);
    const prefix = `${slug}-`;
    clips = lines.map((l) => `assets/${prefix}${l.n}.wav`);
    const fresh = lines.every((l, i) => {
      const json = path.join(dir, clips[i].replace(/\.wav$/, '.json'));
      if (!fs.existsSync(path.join(dir, clips[i])) || !fs.existsSync(json)) return false;
      const m = JSON.parse(fs.readFileSync(json, 'utf8'));
      return m.text === l.text && m.voice === voice && String(m.speed) === speed;
    });
    if (!fresh) {
      const tmp = path.join(assets, `.${slug}-script.md`);
      fs.writeFileSync(tmp, lines.map((l) => `${l.n}. ${l.text}`).join('\n') + '\n');
      console.log(`Voicing ${lines.length} lines with ${voice} (voice.js)...`);
      const res = run('voice.js', [tmp, '--out', assets, '--voice', voice, '--speed', speed, '--prefix', prefix], { stdio: ['ignore', 'inherit', 'pipe'] });
      fs.rmSync(tmp, { force: true });
      if (res.status !== 0) {
        fail(`${(res.stderr || '').trim()}\n\nOr use the user's own recordings: record each line as its own file in assets/ and add\n"recordings: assets/${slug}-{n}.m4a" to the script's frontmatter.`);
      }
    }
  }

  // ---- timing: each scene is its line plus a beat, with cuts on the music's beat
  const html = fs.readFileSync(path.join(__dirname, 'templates', style.template), 'utf8');
  const defaults = templateDefaults(html);
  const identity = sonicIdentity();
  const music = (meta.music || 'identity').trim();
  const sound = { ...defaults };
  if (identity) {
    Object.assign(sound, Object.fromEntries(Object.entries({
      music: identity.music, bpm: identity.bpm, key: identity.key, mode: identity.mode,
      energy: Number.isFinite(identity.energy) ? Math.max(1, identity.energy - 1) : undefined, motif: identity.motif,
    }).filter(([, v]) => v !== undefined && v !== '' && !Number.isNaN(v))));
  }
  if (style.music && !meta.music) sound.music = style.music; // an explicit music: line, identity included, wins
  let musicSrc = '';
  if (music === 'none') sound.music = 'none';
  else if (MEDIA_EXT.test(music) || /\.(mp3|m4a|wav|aac|ogg|flac)$/i.test(music)) musicSrc = music;
  else if (music !== 'identity') sound.music = music;
  const beat = 60 / (parseFloat(sound.bpm) || 112);
  const snap = !musicSrc && sound.music !== 'none';
  // A licensed track with a steady beat gets the same treatment as the generated music: it starts
  // so its biggest lift lands as the hook ends, and scenes cut on its beats (beats.js). Below 0.5
  // confidence the scenes follow the voice alone.
  let track = null;
  if (musicSrc && fs.existsSync(path.join(dir, musicSrc))) {
    track = analyseTrack(path.join(dir, musicSrc));
    if (track.confidence < 0.5) {
      console.warn(`Note: ${musicSrc}'s beat is unclear (confidence ${track.confidence}), so scenes follow the voice, not the beat.`);
      track = null;
    }
  }
  const trackNotes = [];

  // ---- the edit: cuts, camera, captions, and finishing, from the script's edit style
  let edit;
  let look;
  try {
    // the visual style (look.js): from look:, or picked for the video's job with goal:
    look = LOOK.resolveLook(meta);
    edit = EDIT.resolveStyle(meta, sound, look);
  } catch (e) {
    fail(e.message);
  }
  if (style.shots && edit.hook === 'montage') edit.hook = 'zoom'; // a drawn style has one picture per line
  if (bold && edit.captions !== 'pop' && !meta['captions-fx']) edit.captions = 'pop'; // the bold look animates its own words

  const scenes = [];
  let t = LEAD;
  let drop = 0;
  let voiceEnd = 0;
  lines.forEach((l, i) => {
    const { length } = prepareVoice(path.join(dir, clips[i]));
    const start = t;
    // a J-cut: the next line's voice leads its picture a little (never out of the hook, so the drop lands clean)
    const voiceAt = i >= 2 && edit.jcut ? Math.max(voiceEnd + 0.12, start - edit.jcut) : start;
    voiceEnd = voiceAt + length;
    let end = voiceAt + length + GAP;
    if (i === 0) {
      drop = r2(end);
      if (track) trackNotes.push(...alignTrack(track, { align: drop })); // the length is checked below, once it's known
    } else if (snap) end = drop + Math.ceil((end - drop) / beat - 1e-6) * beat;
    else if (track) end = track.video.beats.find((b) => b >= end - 1e-6 && b - end < 0.7) ?? end;
    scenes.push({ ...l, clip: clips[i], start: r2(start), voiceAt: r2(voiceAt), length, end: r2(end) });
    t = end;
  });
  const duration = r2(scenes[scenes.length - 1].voiceAt + scenes[scenes.length - 1].length + TAIL);
  if (track) sound.bpm = track.bpm; // the page's tempo is the track's, so anything on the beat (the mascot's dance) follows it
  scenes[scenes.length - 1].end = duration;

  // ---- backgrounds (a drawn style draws its own): each line's pictures, cut between as it's
  // said when the line runs longer than the edit style's longest hold, or when it lists several
  const snapTo = snap ? (p) => drop + Math.round((p - drop) / beat) * beat
    : track ? (p) => { const b = track.video.beats.find((x) => Math.abs(x - p) < 0.3); return b ?? p; } : null;
  const micro = Math.min(0.6, Math.max(0.3, beat <= 0.6 ? beat : beat / 2));
  const shots = []; // one per background slot: { start, end, media | card, transition, move, scene }
  const turnState = { cut: 0, accent: 0 };
  // each line's words, timed, for splitting a long line where its idea turns
  const wordCache = new Map();
  const wordsFor = (i) => wordCache.get(i) || [];
  if (!style.shots && edit.maxHold) {
    for (const [i, s] of scenes.entries()) {
      if (s.card || (i === 0 ? s.end : s.end - s.start) <= edit.maxHold * 1.25) continue;
      const v = prepareVoice(path.join(dir, s.clip));
      const timing = await captions.alignWords(v.prepared, s.text, { shift: v.trimmed, sidecarFor: path.join(dir, s.clip) }).catch(() => null);
      if (timing) wordCache.set(i, timing.words.map((w) => ({ ...w, start: s.voiceAt + w.start })));
    }
  }
  let moveN = 0;
  const nextMove = () => edit.moves[moveN++ % edit.moves.length];
  if (!style.shots) {
    scenes.forEach((s, i) => {
      const start = i === 0 ? 0 : s.start;
      const end = s.end;
      const montageHook = i === 0 && edit.hook === 'montage' && !s.card;
      if (s.card) {
        // a text card: the line's key phrase on the brand's base color, no picture to fetch
        shots.push({ start, end, card: s.card, scene: i, first: true, move: 'none',
          transition: i === 0 ? 'fade' : s.cut || EDIT.transitionFor(edit, i, scenes.length, turnState) });
        return;
      }
      const items = [s.bg, ...s.more].filter(Boolean);
      let k = items.length;
      if (k === 1 && edit.maxHold && end - start > edit.maxHold * 1.25) k = Math.min(3, Math.ceil((end - start) / edit.maxHold));
      if (montageHook && items.length <= 1) k = Math.max(k, 4);
      // the pictures: several listed, several stock results for one query, or one file reframed
      let media = [];
      if (items.length > 1) {
        media = items.map((q) => (MEDIA_EXT.test(q) ? q : args.noMedia ? null : fetchBackground(q, assets, meta['bg-type'], 1, { landscape })));
      } else if (items.length === 1 && MEDIA_EXT.test(items[0])) {
        media = Array(k).fill(items[0]);
      } else if (items.length === 1 && !args.noMedia) {
        const found = fetchBackground(items[0], assets, meta['bg-type'], k, { landscape });
        media = k > 1 ? found : [found];
        if (!media.length) media = [null];
      } else media = [null];
      for (const m of media) if (m && MEDIA_EXT.test(m) && !fs.existsSync(path.join(dir, m))) console.warn(`Note: background ${m} not found next to the page`);
      k = Math.max(1, media.length);
      // a new picture where the idea turns (a clause: after a comma, at "and", "but", "so"...), on
      // the beat when one is close, rather than on a timer
      const clauses = k > 1 && !montageHook ? clauseStarts(s, wordsFor(i)) : [];
      const points = splitPoints(start, end, k, montageHook ? { micro } : { snapTo, clauses });
      const bounds = [start, ...points, end];
      const reframe = media.length > 1 && media.every((m) => m === media[0]);
      const pool = [edit.base, ...edit.accents];
      const inner = reframe && pool.includes('punch') && edit.motion !== 'low' ? 'punch' : edit.base === 'fade' ? 'fade' : 'cut';
      for (let j = 0; j < bounds.length - 1; j++) {
        // a clip used twice in one line picks up where it left off
        const offset = j > 0 && media[j] === media[j - 1] && VIDEO_EXT.test(media[j] || '') ? r2(bounds[j] - start) : 0;
        shots.push({
          start: bounds[j], end: bounds[j + 1], media: media[Math.min(j, media.length - 1)], offset, scene: i, first: j === 0,
          transition: i === 0 && j === 0 ? 'fade' : j > 0 ? (montageHook ? 'cut' : inner) : s.cut || EDIT.transitionFor(edit, i, scenes.length, turnState),
          focus: media[j] && media[j] === s.bg ? s.focus : undefined,
          // a reframe of one picture changes its framing at each cut, so the cut reads (a jump cut on a still)
          move: reframe ? ['kbIn', 'kbDynOut', 'kbLeft', 'kbRight'][j % 4] : montageHook && j < bounds.length - 2 ? 'kbDyn' : nextMove(),
          insert: s.screen && media[j] && !VIDEO_EXT.test(media[j]) && media[j] === s.bg ? { screen: s.screen, at: s.at } : null,
        });
      }
    });
  }

  // ---- how each picture works as a background (fit.js): soft, dark, no subject, or busy behind the words
  const fitNotes = [];
  for (const m of [...new Set(shots.map((x) => x.media).filter((m) => m && fs.existsSync(path.join(dir, m))))]) {
    const shot = shots.find((x) => x.media === m);
    const focus = shot.focus ? shot.focus.split(',').map((v) => parseFloat(v) / 100) : [0.5, 0.5];
    const a = FIT.analyse(path.join(dir, m), { landscape, focus });
    if (a.notes && a.notes.length) fitNotes.push(`${m} (line ${scenes[shot.scene].n}): ${a.notes.join('; ')}`);
  }

  // ---- the page
  let head = html.slice(html.indexOf('<html>'), html.indexOf('</head>') + '</head>'.length);
  if (landscape) head = head.replace('</head>', `${LANDSCAPE_CSS}</head>`);
  const bodyClass = (/<body[^>]*\bclass="([^"]*)"/.exec(html.slice(html.indexOf('</head>'))) || [])[1] || 'fyp';
  // the edit's finishing: caption style, grain, vignette, and a color grade (the bold look keeps its own)
  // the look (look.js): its classes and textures, its headline font, and its accent when the brand has none
  const identity0 = visualIdentity();
  const looked = LOOK.lookClasses(look);
  const headFont = identity0 && identity0.head ? null : look && look.head; // the brand's Headline font wins
  if (headFont) head = head.replace('</head>', `${LOOK.fontLink(look)}</head>`);
  const fxClasses = [...new Set([
    !bold && !subtitle && edit.captions !== 'pop' ? `cap-${edit.captions}` : '',
    edit.grain ? 'fx-grain' : '', edit.vignette ? 'fx-vignette' : '', ...looked.classes, headFont ? 'has-head' : '',
  ].filter(Boolean))].join(' ');
  const bodyVars = [
    ...(edit.grade && !bold ? [`--grade: ${edit.grade}`] : []),
    ...(headFont ? looked.vars : []),
    ...LOOK.accentVars(look, identity0),
  ];
  const attrs = [
    `class="${bodyClass}${bold ? ' bold' : ''}${subtitle ? ' sub' : ''}${fxClasses ? ` ${fxClasses}` : ''}"`, ...(landscape ? ['data-size="1920x1080"'] : []), `data-duration="${duration}"`, `data-drop="${drop}"`,
    `data-edit="${edit.name}"`, ...(look ? [`data-look="${look.name}"`, `data-motion="${edit.motion}"`] : []), ...(bodyVars.length ? [`style="${bodyVars.join('; ')}"`] : []),
    ...(character ? [`data-character="${esc(character)}"`] : []),
    ...(musicSrc ? [`data-music-src="${esc(musicSrc)}"`, 'data-music="none"', ...(track ? [`data-music-start="${track.musicStart}"`] : [])] : [`data-music="${sound.music}"`]),
    ...['bpm', 'key', 'mode', 'energy', 'motif'].filter((k) => sound[k] !== undefined).map((k) => `data-${k}="${esc(String(sound[k]))}"`),
  ].join(' ');
  // the bold look shows the first line from frame 0; a hook that is that line isn't shown twice
  const hookIsLine = bold && meta.hook && wordKey(plainText(meta.hook)) === wordKey(scenes[0].text);
  const lit = marked;
  // the hook's text, with its share of the visual hook: a glitch, a jolt, or its words swelling in turn
  const hookFx = { glitch: 'hk-glitch', shake: 'hk-shake', bounce: 'hk-bounce' }[edit.hook] || '';
  const hookHtml = () => {
    if (edit.hook !== 'bounce') return lit(meta.hook);
    const lits = new Set(keywords(meta.hook));
    const nos = new Set(cautions(meta.hook));
    return plainText(meta.hook).split(/\s+/).map((w, k) => `<i style="--k:${k}">${lits.has(wordKey(w)) ? `<b class="kw">${esc(w)}</b>` : nos.has(wordKey(w)) ? `<span class="no">${esc(w)}</span>` : esc(w)}</i>`).join(' ');
  };
  const sceneHtml = scenes.map((s, i) => {
    const last = i === scenes.length - 1;
    const parts = [];
    if (i === 0 && meta.hook && !hookIsLine) parts.push(`    <div class="cap hook${hookFx ? ` ${hookFx}` : ''}"><span>${hookHtml()}</span></div>`);
    if (s.source) parts.push(`    <div class="source">${esc(s.source)}</div>`);
    if (last && meta.cta) parts.push(`    <div class="end"><div class="cap hl pop" style="--in:${s.start}s" data-sfx="chime"><span>${esc(plainText(meta.cta))}</span></div></div>`);
    // bold: a short line shows whole; a long one a few words at a time, so it doesn't bury the picture.
    // The first line is always whole: it's the cover.
    const whole = i === 0 || s.text.split(/\s+/).length <= BOLD_WHOLE;
    const cls = bold ? `say auto${whole ? ' line' : ''}${i === 0 ? ' now' : ''}` : `say auto${subtitle && i === 0 ? ' now' : ''}`;
    const kw = (s.kw.length ? ` data-kw="${esc([...new Set(s.kw)].join(','))}"` : '') + (s.no.length ? ` data-no="${esc([...new Set(s.no)].join(','))}"` : '');
    parts.push(`    <div class="${cls}" data-voice="${esc(s.clip)}" style="--voice:${s.voiceAt}s"${kw}>${esc(s.text)}</div>`);
    return `  <!-- line ${s.n}, ${s.start}–${s.end}s${s.voiceAt < s.start ? ` (its voice leads the cut from ${s.voiceAt}s)` : ''} -->\n  <div class="scene narr center"${last ? '' : ` style="--out:${r2(s.end - 0.15)}s"`}>\n${parts.join('\n')}\n  </div>`;
  }).join('\n\n');

  // ---- sounds and hits that belong to the edit, not to a line: the visual hook's, a riser into
  // the drop and an impact on it, and the sound each cut makes (whoosh, impact, glitch...)
  const cues = [];
  const cue = (t, sfx, note) => cues.push(`  <i class="cue" hidden style="--in:${r2(t)}s" data-sfx="${sfx}"></i>${note ? ` <!-- ${note} -->` : ''}`);
  const hookSfx = { shake: 'impact', glitch: 'glitch', flash: 'impact', zoom: edit.impact ? 'whoosh' : '' }[edit.hook];
  if (hookSfx) cue(edit.hook === 'zoom' ? 0.1 : edit.hook === 'shake' ? 0.04 : 0.08, hookSfx, `the ${edit.hook} hook`);
  const dropShot = style.shots ? null : shots.find((x) => x.scene === 1 && x.first);
  const dropTr = dropShot ? dropShot.transition : style.shots ? 'cut' : null;
  const dropSounds = [edit.riser && drop >= 1.2 ? 'riser' : '', edit.impact && EDIT.TRANSITIONS[dropTr || 'cut'].sfx !== 'impact' ? 'impact' : ''].filter(Boolean);
  if (scenes.length > 1 && dropSounds.length) cue(drop, dropSounds.join(' '), 'the drop');
  if (edit.cutSfx) {
    for (const x of shots) {
      const sfx = x.first && x.scene > 0 && EDIT.TRANSITIONS[x.transition].sfx;
      if (sfx) cue(x.start, sfx, `the ${x.transition} into line ${scenes[x.scene].n}`);
    }
  }
  // overlays dropped on a cut (a flash, a light leak, a film burn), and the flash hook
  const overlays = shots.filter((x, i) => i > 0).map((x) => EDIT.overlayAt(x.transition, x.start)).filter(Boolean);
  if (edit.hook === 'flash') overlays.unshift('  <div class="flash" style="--in:.08s" data-lint="off"></div>');

  // ---- the camera: every picture sits in one layer that punches in, shakes, or glitches on the
  // hook and the drop (and on each *keyword*, added by render.js once the words are timed)
  const camAnim = EDIT.cameraAnimation({ hook: edit.hook, dropFx: dropTr === 'punch' && edit.dropFx === 'punch' ? 'none' : edit.dropFx, drop: scenes.length > 1 ? drop : 0, drawn: !!style.shots });
  const camOpen = `  <div class="cam" data-lint="off"${edit.punch ? ` data-punch="${edit.punch}"${edit.punchFx ? ` data-punch-fx="${edit.punchFx}"` : ''}` : ''} style="${edit.punch ? `--punch:${edit.punch}; ` : ''}${camAnim ? `animation: ${camAnim}` : ''}">`;
  // what's behind the text: a drawn style's canvas and one shot per line, or a photo slot per line
  const slots = EDIT.slotTimes(shots);
  const layers = style.shots
    ? [camOpen, `  ${landscape ? style.canvas.replace('width="1080" height="1920"', 'width="1920" height="1080"') : style.canvas}`, '  <div class="art-scrim" data-lint="off"></div>', '  </div>', '',
      ...scenes.map((s, i) => {
        const settings = Object.entries(s.shot.attrs).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
        const sfxCue = style.sfx[`${s.shot.name}:${s.shot.attrs.do || ''}`] || style.sfx[s.shot.name];
        const sfx = sfxCue ? ` data-sfx="${sfxCue}"` : '';
        return `  <div class="shot" data-shot="${s.shot.name}" style="--in:${i === 0 ? 0 : s.start}s"${settings}${sfx}></div>`;
      })].join('\n')
    : [camOpen, '  <div class="glow g1"></div>', '  <div class="glow g2"></div>',
      ...shots.map((x, i) => bgSlot(i, x, slots[i], i === 0 && ['zoom', 'flash'].includes(edit.hook) ? 'hk-zoom' : '')), '  </div>'].join('\n');
  const corners = [['brand', meta.brand], ['series', meta.series]].filter(([, v]) => v)
    .map(([k, v]) => `  <div class="corner ${k}" style="--out:${duration}s">${esc(v)}</div>`).join('\n');
  const inserts = !style.shots && shots.some((x) => x.insert) ? INSERT_JS : '';
  const doc = `<!doctype html>
<!--
  Narrated video, written by scripts/video/compose.js from ${path.relative(dir, path.resolve(scriptFile))}.
  Edit the script and run compose.js again rather than editing the timing here; it's
  measured from the voice. Page conventions: see the comment at the top of
  templates/promo.html, and templates/${style.template} for this layout${style.shots ? ' and its shots' : ''}.
-->
${head}
<body ${attrs}>
${layers}
${overlays.length ? `${overlays.join('\n')}\n` : ''}${cues.length ? `${cues.join('\n')}\n` : ''}${corners}

${sceneHtml}
${inserts}</body>
</html>
`;
  // the brand's colors, font, and end card, from the Visual Identity
  const branded = identity0 ? applyIdentity(doc, identity0, { pageDir: dir }) : { html: doc, changes: [], problems: [] };
  fs.writeFileSync(page, branded.html);

  console.log(`Wrote ${page}: ${scenes.length} lines, ${duration}s`);
  for (const [i, s] of scenes.entries()) {
    const mine = shots.filter((x) => x.scene === i);
    const pics = mine.length ? `  ${mine[0].card ? `card "${plainText(mine[0].card)}"` : mine[0].media ? `bg ${mine[0].media}` : 'no bg'}${mine.length > 1 ? ` +${mine.length - 1} more` : ''}${i > 0 ? ` (${mine[0].transition})` : ''}${s.source ? ', sourced' : ''}` : '';
    console.log(`  ${String(s.n).padStart(2)}. ${s.start.toFixed(2)}–${s.end.toFixed(2)}s  ${s.clip}${pics}${s.shot && style.shots ? `  shot ${s.shot.name}` : ''}  ${s.text.slice(0, 48)}${s.text.length > 48 ? '...' : ''}`);
  }
  if (look) console.log(`  look: ${look.name}${look.goal && !meta.look ? ` (for goal: ${look.goal})` : ''}: ${look.about}${headFont ? `; headline in ${headFont[0]}` : ''}.`);
  console.log(`  edit: ${edit.name}${edit.picked ? ' (picked to fit the sound; set edit: to choose)' : ''}: ${edit.about}. Motion: ${edit.motion}. Hook: ${edit.hook}; keyword punch-ins: ${edit.punch ? `${Math.round((edit.punch - 1) * 100)}%` : 'off'}${edit.jcut ? `; J-cuts ${edit.jcut}s` : ''}.`);
  for (const n of fitNotes) console.warn(`Note: ${n}`);
  if (style.shots) console.log(`  style: ${styleName} (templates/${style.template})`);
  console.log(`  sound: ${musicSrc ? `licensed track ${musicSrc}${track ? `, ${track.bpm} BPM, started at ${track.musicStart}s so its lift lands as the hook ends, cuts on its beat` : ''}` : `${sound.music}${sound.music !== 'none' ? `, ${sound.bpm} BPM, ${sound.key} ${sound.mode || ''}, energy ${sound.energy}, cuts on the beat` : ''}`}${musicSrc ? '' : identity ? ' (the Sonic Identity)' : ' (the template default; no Sonic Identity saved yet)'}`);
  console.log(`  brand: ${branded.changes.length ? branded.changes.join('; ') : 'the template default; no Visual Identity saved yet'}`);
  for (const p of branded.problems) console.warn(`Note: ${p}`);
  if (!meta.hook && !bold && !subtitle) console.warn('Note: no hook in the frontmatter, so the first frame has no text. Add "hook: ..." to stop the scroll.');
  if (meta.hook) for (const p of require('./hook').checkHook(meta.hook).problems) console.warn(`Note: hook: ${p} (node hook.js --script ${path.basename(scriptFile)} checks all three layers)`);
  for (const n of trackNotes) console.warn(`Note: ${musicSrc}: ${n}`);
  if (track && track.musicStart + duration > track.duration) console.warn(`Note: ${musicSrc} runs out ${r2(track.musicStart + duration - track.duration)}s before the video ends; shorten the script or pick a longer track.`);
  if (musicSrc && !track) console.warn(`Note: set data-music-start from beats.js (node beats.js ${musicSrc} --align ${drop} --duration ${duration}).`);
  const credited = musicSrc && fs.existsSync(path.join(assets, 'CREDITS.md')) && fs.readFileSync(path.join(assets, 'CREDITS.md'), 'utf8').includes(path.basename(musicSrc));
  if (musicSrc && !credited) console.warn(`Note: record the track's license with media.js credit (node media.js credit ${musicSrc} --source ... --license ...), and put any required credit in the post.`);
  if (!args.noCheck) {
    const check = run('render.js', [page, '--check'], { stdio: 'inherit' });
    if (check.status !== 0) console.warn('Fix what --check lists (usually by shortening a line or the hook), then compose again.');
  }
  const show = (f) => (path.relative(process.cwd(), f).startsWith('..') ? f : path.relative(process.cwd(), f));
  console.log(`Next: node ${show(path.join(__dirname, 'render.js'))} ${show(page)} --slides, then render it to an .mp4.`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { parseFrontmatter, sonicIdentity };
