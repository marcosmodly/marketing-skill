#!/usr/bin/env node
'use strict';
/*
 * A widescreen video (a product demo, a screen recording, an explainer) made into a vertical short
 * without cropping its picture away: the video plays as a card in the middle of the frame, cut into
 * beats, each with its own zoom into the part that matters (cut sharp from the full-resolution
 * source), its line set big above the card, and graphics over it (graphics.js). Around it: a moving
 * background, the brand's chip with a progress bar at the top, and an end card with the logo,
 * a tagline, and the call to action. The video's own sound plays throughout.
 *
 * Usage:
 *   node card.js <script.md> [--out page.html] [--no-check]
 *   node card.js where <script.md> <beat> <x> <y>   # a pixel of the video, in that beat's zoom, as x%,y% of the frame
 *
 * The script:
 *   ---
 *   video: assets/explainer.mp4     # the widescreen video (copy it into assets/ next to the script)
 *   from: 2.4                       # the stretch it plays, in seconds into the video (default all of it)
 *   to: 39.95
 *   outro: 50.2-54.75               # a later stretch whose sound plays under the end card (optional)
 *   crop-top: 100                   # pixels left off the top of every shot: the video's own caption bar
 *   hook: Will it *fit*?            # on screen from the first frame (the cover)
 *   brand: ModlyAI                  # the chip at the top and the end card (default: the Visual Identity's Handle)
 *   logo: assets/logo.png           # (default: the Visual Identity's Logo)
 *   tagline: See it in your room, built the way you want it.   # *words* take the accent
 *   cta: See it work, no signup
 *   url: modlyai.tech/demo
 *   accent: #2350d8                 # (default: the Visual Identity's Accent)
 *   theme: light                    # light (a warm cream) or dark
 *   font: Fraunces 600              # the headlines' font: a Google Fonts family and weight, or a font file in assets/
 *   music: none                     # none (the default when the video has sound), a genre, or assets/track.mp3;
 *                                   # a silent screen recording gets the Sonic Identity's music
 *   sounds: yes                     # the graphics' own sounds (a stamp's impact, a cursor's click); no turns them off
 *   ---
 *   1. 0 [zoom: 110,125,1680,945] [gfx: measure 12%,47% 54%,47% "88″ wide" @0.45]
 *   2. 3 A photo can't answer it. [zoom: 160,140,1671,940] [gfx: icon ? 74%,47% @0.25]
 *   3. 5 They leave. Or they *return* it. [anim: pop] [gfx: icon cross 72%,44% @0.75 color=red]
 *   4. 8 - [shake]
 *
 * Each numbered beat: when it starts, in seconds into the stretch; then its line, set big above the
 * card from then until the next line (a beat without one keeps the line before; "-" clears it); then
 * its tags:
 *   [zoom: x,y,w,h]   the part of the video it shows, in the video's pixels (grown to the card's
 *                     16:9 shape); without one, the whole picture. A new zoom punches in with a flash.
 *   [anim: rise]      how the line comes in: rise (default), pop, slam, wave, type, stretch, or glitch
 *   [gfx: ...]        a graphic, timed from the beat's start (graphics.js has them all); any number of them.
 *                     Its position is a point of the whole frame: `node card.js where` turns a point
 *                     of the video into one.
 *   [sfx: ping]       a sound as the beat starts
 *   [shake]           the card shakes as the beat starts; [leak] a light leak sweeps across it
 * Find the moments and the parts to zoom into on a frame sheet first:
 *   node montage.js frames assets/explainer.mp4 --every 1
 * The page goes next to the script, its clips in assets/; then render.js renders it.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const GFX = require('./graphics');
const EDIT = require('./edit');
const { parseScript } = require('./voice');
const { parseFrontmatter, sonicIdentity } = require('./compose');
const { visualIdentity, onAccent } = require('./brand');
const { GENRES } = require('./soundtrack');

const W = 1080;
const H = 1920;
const CARD = { x: 40, y: 640, w: 1000, h: 562 };
const ASPECT = CARD.w / CARD.h;
const TEXT_AT = '47.2%,24%';
const OUTRO_SECONDS = 4.5; // the end card's length when there's no outro
const ANIMS = ['rise', 'pop', 'slam', 'wave', 'type', 'stretch', 'glitch'];
const r2 = (t) => Math.round(t * 100) / 100;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lit = (s) => esc(s).replace(/\*([^*]+)\*/g, '<b class="hi">$1</b>');
const even = (n) => 2 * Math.round(n / 2);

function fail(message) {
  console.error(message);
  process.exit(2);
}

function ffmpeg(args) {
  const run = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { encoding: 'utf8' });
  if (run.status !== 0) fail(`ffmpeg failed: ${run.stderr}`);
}

function probe(file) {
  const run = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height:format=duration', '-of', 'json', file], { encoding: 'utf8' });
  if (run.status !== 0) fail(`Can't read ${file}: ${run.stderr.trim()}`);
  const data = JSON.parse(run.stdout);
  const video = (data.streams || []).find((s) => s.codec_type === 'video');
  if (!video) fail(`${file} has no picture.`);
  return { w: video.width, h: video.height, duration: parseFloat(data.format.duration) || 0, audio: (data.streams || []).some((s) => s.codec_type === 'audio') };
}

// Whether a stretch has sound worth keeping: a screen recording's track is often all silence.
function hasSound(file, from, to) {
  const run = spawnSync('ffmpeg', ['-hide_banner', '-ss', String(from), '-to', String(to), '-i', file, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  const max = parseFloat((/max_volume:\s*(-?[\d.]+|-inf) dB/.exec(run.stderr) || [])[1]);
  return Number.isFinite(max) && max > -50;
}

// A region grown to the card's shape around its middle, kept inside the picture (below the
// cropped top); shrunk to fit when the picture is too small for it.
function fitRegion([x, y, w, h], info, top) {
  const area = { x: 0, y: top, w: info.w, h: info.h - top };
  if (w / h > ASPECT) { const nh = w / ASPECT; y -= (nh - h) / 2; h = nh; } else { const nw = h * ASPECT; x -= (nw - w) / 2; w = nw; }
  if (w > area.w) { const k = area.w / w; x += (w - area.w) / 2; w = area.w; const nh = h * k; y += (h - nh) / 2; h = nh; }
  if (h > area.h) { const k = area.h / h; y += (h - area.h) / 2; h = area.h; const nw = w * k; x += (w - nw) / 2; w = nw; }
  x = Math.min(Math.max(x, area.x), area.x + area.w - w);
  y = Math.min(Math.max(y, area.y), area.y + area.h - h);
  return [Math.round(x), Math.round(y), even(w), even(h)];
}

// "1. 3.0 The line. [zoom: ...] [gfx: ...]" -> a beat
const TAG = /\[([a-z][\w-]*)(?::\s*([^\]]*))?\]/gi;
function parseBeat({ n, text }) {
  const m = /^(\d+(?:\.\d+)?)s?\b\s*(.*)$/.exec(text);
  if (!m) fail(`Beat ${n}: start it with when it starts, in seconds ("${n}. 3.5 The line.").`);
  const beat = { n, at: parseFloat(m[1]), gfx: [], zoom: null, anim: null, sfx: null, shake: false, leak: false };
  for (const t of m[2].matchAll(TAG)) {
    const key = t[1].toLowerCase();
    const value = (t[2] || '').trim();
    if (key === 'gfx') beat.gfx.push(value);
    else if (key === 'zoom') {
      const z = value.split(/[\s,]+/).map(Number);
      if (z.length !== 4 || z.some((v) => !Number.isFinite(v) || v < 0) || !z[2] || !z[3]) fail(`Beat ${n}: [zoom: x,y,w,h] in the video's pixels.`);
      beat.zoom = z;
    } else if (key === 'anim') {
      if (!ANIMS.includes(value)) fail(`Beat ${n}: [anim: ${value}]? Use ${ANIMS.join(', ')}.`);
      beat.anim = value;
    } else if (key === 'sfx') beat.sfx = value;
    else if (key === 'shake') beat.shake = true;
    else if (key === 'leak') beat.leak = true;
    else fail(`Beat ${n}: [${key}]? The tags are zoom, anim, gfx, sfx, shake, and leak.`);
  }
  beat.line = m[2].replace(TAG, '').replace(/\s+/g, ' ').trim();
  return beat;
}

function readScript(file) {
  if (!fs.existsSync(file)) fail(`No script at ${file}`);
  const { meta, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  const dir = path.dirname(path.resolve(file));
  if (!meta.video) fail('The script needs video: (the widescreen video, in assets/).');
  const video = path.resolve(dir, meta.video);
  if (!fs.existsSync(video)) fail(`No video at ${video}`);
  const info = probe(video);
  if (info.w / info.h < 1.2) console.warn(`Note: ${meta.video} is ${info.w}x${info.h}, not widescreen; a vertical video fits the frame as it is (cut.js or montage.js).`);
  const from = parseFloat(meta.from) || 0;
  const to = Math.min(info.duration, parseFloat(meta.to) || info.duration);
  if (!(to - from > 1)) fail(`from: ${from} to: ${to} leaves nothing to play.`);
  info.sound = info.audio && hasSound(video, from, to);
  const top = Math.max(0, Math.min(info.h / 3, parseFloat(meta['crop-top']) || 0));
  const beats = parseScript(body).map(parseBeat).sort((a, b) => a.at - b.at);
  if (!beats.length) fail(`No beats in ${file}; number them "1. 0 The line.", one per beat.`);
  const length = r2(to - from);
  for (const b of beats) if (b.at >= length) fail(`Beat ${b.n} starts at ${b.at}s, after the stretch ends (${length}s).`);
  beats.forEach((b, i) => { b.end = i + 1 < beats.length ? beats[i + 1].at : length; });
  let outro = null;
  if (meta.outro) {
    const o = /^\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*$/.exec(meta.outro);
    if (!o || !(parseFloat(o[2]) > parseFloat(o[1]))) fail('outro: is a stretch of the video, start-end in seconds ("50.2-54.75").');
    outro = { from: parseFloat(o[1]), to: Math.min(info.duration, parseFloat(o[2])) };
  }
  return { meta, dir, video, info, from, to, top, beats, length, outro };
}

// The region a beat shows, and a point of the video in it as a point of the frame.
const regionOf = (s, beat) => fitRegion(beat.zoom || [0, s.top, s.info.w, s.info.h - s.top], s.info, s.top);
function toFrame(region, sx, sy) {
  const [rx, ry, rw, rh] = region;
  return [CARD.x + ((sx - rx) / rw) * CARD.w, CARD.y + ((sy - ry) / rh) * CARD.h];
}

// ---------------------------------------------------------------- where

function where(file, n, sx, sy) {
  const s = readScript(file);
  const beat = s.beats.find((b) => b.n === Number(n));
  if (!beat) fail(`No beat ${n} in ${file}.`);
  const [x, y] = toFrame(regionOf(s, beat), Number(sx), Number(sy));
  const inCard = x >= CARD.x && x <= CARD.x + CARD.w && y >= CARD.y && y <= CARD.y + CARD.h;
  console.log(`${(x / W * 100).toFixed(1)}%,${(y / H * 100).toFixed(1)}%${inCard ? '' : '   (outside the card: that point isn\'t in this beat\'s zoom)'}`);
}

// ---------------------------------------------------------------- the page

function build(file, args) {
  const s = readScript(file);
  const { meta, dir, beats, length } = s;
  const page = path.resolve(args.out || file.replace(/\.md$/i, '') + '.html');
  const pageDir = path.dirname(page);
  const assets = path.join(pageDir, 'assets');
  fs.mkdirSync(assets, { recursive: true });
  const slug = path.basename(page, '.html');
  const rel = (f) => path.relative(pageDir, f).split(path.sep).join('/');
  const notes = [];

  // the brand: the script's own settings, else the Visual Identity's
  const id = visualIdentity() || {};
  const accent = /^#[0-9a-f]{3,6}$/i.test(meta.accent || '') ? meta.accent : id.accent || '#db7350';
  const brand = meta.brand || id.handle || '';
  let logo = '';
  const logoFile = meta.logo || id.logo;
  if (logoFile) {
    const found = [path.resolve(dir, logoFile), path.resolve(logoFile)].find((f) => fs.existsSync(f));
    if (found) logo = rel(found);
    else notes.push(`logo ${logoFile} not found; the chip and end card show the name only`);
  }
  const dark = String(meta.theme || 'light').toLowerCase() === 'dark';
  const font = meta.font || id.head || 'Fraunces 600';
  let fontHead = '';
  let fontFamily = '';
  const fontFile = path.resolve(dir, font);
  if (/\.(woff2?|ttf|otf)$/i.test(font) && fs.existsSync(fontFile)) {
    fontFamily = 'Card Head';
    fontHead = `  @font-face { font-family: "Card Head"; src: url("${esc(rel(fontFile))}"); font-weight: 100 900; font-display: block; }\n`;
  } else {
    const [, family, weight] = /^(.*?)(?:\s+(\d{3}))?$/.exec(font.trim());
    fontFamily = family;
    fontHead = `@import url("https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight || 600}&display=block");\n`;
  }
  const headWeight = (/(\d{3})\s*$/.exec(font) || [])[1] || 600;

  // ---- the clips: the stretch with its sound, a silent cut per zoom, and the outro's sound
  const key = (...parts) => crypto.createHash('sha1').update(`${s.video}|${fs.statSync(s.video).mtimeMs}|${parts.join('|')}`).digest('hex').slice(0, 10);
  const base = regionOf(s, { zoom: null });
  const mainFile = path.join(assets, `${slug}-${key('main', s.from, s.to, base)}.mp4`);
  if (!fs.existsSync(mainFile)) {
    ffmpeg(['-ss', String(s.from), '-to', String(s.to), '-i', s.video, '-vf', `crop=${base[2]}:${base[3]}:${base[0]}:${base[1]}`,
      ...(s.info.sound ? ['-af', `afade=t=out:st=${Math.max(0, length - 0.35)}:d=0.35`, '-c:a', 'aac', '-b:a', '192k'] : ['-an']),
      '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', mainFile]);
  }
  // beats showing the same zoom in a row play as one shot, with no cut between them
  const same = (a, b) => !!(a && b && a.zoom && b.zoom && a.zoom.join() === b.zoom.join());
  beats.forEach((b, i) => { if (same(beats[i - 1], b)) { b.cont = true; } });
  const runEnd = (i) => { let j = i; while (beats[j + 1] && beats[j + 1].cont) j++; return beats[j].end; };
  const shots = [];
  for (const [i, b] of beats.entries()) {
    if (!b.zoom || b.cont) continue;
    const region = regionOf(s, b);
    const end = runEnd(i);
    const f = path.join(assets, `${slug}-${key('zoom', s.from + b.at, end - b.at, region)}.mp4`);
    if (!fs.existsSync(f)) {
      ffmpeg(['-ss', String(r2(s.from + b.at)), '-t', String(r2(end - b.at + 0.1)), '-i', s.video, '-an', '-vf', `crop=${region[2]}:${region[3]}:${region[0]}:${region[1]}`,
        '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-pix_fmt', 'yuv420p', f]);
    }
    shots.push({ at: b.at, end, src: rel(f) });
  }
  let outroSrc = '';
  let outroLength = OUTRO_SECONDS;
  if (s.outro && s.info.sound) {
    outroLength = r2(s.outro.to - s.outro.from);
    const f = path.join(assets, `${slug}-${key('outro', s.outro.from, s.outro.to)}.m4a`);
    if (!fs.existsSync(f)) {
      ffmpeg(['-ss', String(s.outro.from), '-to', String(s.outro.to), '-i', s.video, '-vn', '-af', `afade=t=in:d=0.12,afade=t=out:st=${Math.max(0, outroLength - 0.5)}:d=0.5`,
        '-c:a', 'aac', '-b:a', '192k', f]);
    }
    outroSrc = rel(f);
  } else if (s.outro) notes.push('outro: is ignored, since the video has no sound');
  const END = length;
  const DURATION = r2(END + outroLength + 0.15);

  // ---- the music: none under the video's own sound unless asked; a silent recording gets the brand's sound
  let music = String(meta.music || (s.info.sound ? 'none' : 'identity')).trim();
  const sound = sonicIdentity() || {};
  const musicAttrs = [];
  if (music === 'identity') music = sound.music || 'tech';
  if (/\.(mp3|m4a|wav|aac|ogg)$/i.test(music)) {
    const f = path.resolve(dir, music);
    if (!fs.existsSync(f)) fail(`No music at ${f}`);
    musicAttrs.push(`data-music-src="${esc(rel(f))}"`, 'data-music="none"');
  } else {
    if (music !== 'none' && !GENRES[music]) fail(`music: ${music}? Use none, a genre (${Object.keys(GENRES).join(', ')}), or a track in assets/.`);
    musicAttrs.push(`data-music="${music}"`, ...['bpm', 'key', 'mode', 'motif'].filter((k) => sound[k] !== undefined).map((k) => `data-${k}="${esc(String(sound[k]))}"`));
    if (music !== 'none') musicAttrs.push(`data-energy="${Math.max(1, (sound.energy || 3) - (s.info.sound ? 1 : 0))}"`, 'data-drop="0.5"');
  }
  const sounds = !/^(no|off|false)$/i.test(String(meta.sounds || 'yes'));

  // ---- the lines above the card, and every beat's graphics
  const gfx = [];
  const lined = beats.filter((b) => b.line);
  const hookOut = meta.hook ? r2(Math.max(1.2, (lined.find((b) => b.line !== '-') || { at: Math.min(3, END) }).at - 0.25)) : 0;
  lined.forEach((b, i) => {
    if (b.line === '-') return;
    if (meta.hook && b.at < hookOut) notes.push(`beat ${b.n}'s line starts under the hook; the hook stays to ${hookOut}s`);
    const next = lined[i + 1];
    const out = next ? next.at - 0.3 : END - 0.05;
    const anim = b.anim || 'rise';
    gfx.push(`text "${b.line.replace(/"/g, '”')}" ${TEXT_AT} @${Math.max(b.at, meta.hook ? hookOut + 0.25 : 0)} +${r2(Math.max(0.5, out - Math.max(b.at, meta.hook ? hookOut + 0.25 : 0)))} anim=${anim} size=m sfx=${anim === 'slam' && sounds ? 'impact' : 'none'}`);
  });
  const { items, problems } = GFX.placeAll(gfx, { base: 0, end: DURATION });
  if (problems.length) fail(problems.join('\n'));
  // each beat's graphics, timed from the beat's start
  for (const b of beats) {
    for (const line of b.gfx) {
      const g = GFX.parse(line);
      if (g.error) fail(`Beat ${b.n}: ${g.error}`);
      if (g.word) fail(`Beat ${b.n}: [gfx: ${line}] is timed to a word; time it in seconds from the beat's start (@1.2).`);
      const placed = GFX.place(g, { base: b.at, end: DURATION });
      if (placed.error) fail(`Beat ${b.n}: ${placed.error}`);
      items.push(placed);
    }
  }
  const gfxHtml = GFX.layer(items, { W, H, sounds });

  // ---- the card: the stretch underneath with its sound, each zoom cut over it, a flash at each cut
  const shotHtml = shots.map((x) => `    <div class="shot${x.at === 0 ? ' first' : ''}" style="--in:${x.at}s; --out:${x.end}s"><video class="bg-media" src="${esc(x.src)}" data-loop="false"></video></div>`).join('\n');
  const changes = beats.filter((b, i) => i > 0 && !b.cont && (b.zoom || beats[i - 1].zoom)).map((b) => `    <i class="flashcut" style="--in:${b.at}s"></i>`).join('\n');
  const cues = [];
  const cue = (t, sfx) => cues.push(`  <i class="cue" hidden style="--in:${r2(t)}s" data-sfx="${esc(sfx)}"></i>`);
  for (const b of beats) if (b.sfx) cue(b.at, b.sfx);
  const shakes = beats.filter((b) => b.shake).map((b) => `hkJolt .45s linear ${b.at}s both`);
  const leaks = beats.filter((b) => b.leak).map((b) => `  <div class="leak" style="--in:${r2(Math.max(0, b.at - 0.1))}s" data-lint="off"${sounds ? ' data-sfx="whoosh"' : ''}></div>`).join('\n');

  // ---- the end card
  const tagWords = String(meta.tagline || '').split(/\s+/).filter(Boolean);
  let hiOpen = false;
  const tagHtml = tagWords.map((w, k) => {
    const starts = w.startsWith('*');
    const ends = /\*[^\w]*$/.test(w);
    const hi = hiOpen || starts;
    hiOpen = (hiOpen || starts) && !ends;
    return `<span${hi ? ' class="hi"' : ''} style="--k:${k}">${esc(w.replace(/\*/g, ''))}</span>`;
  }).join('');
  const markHtml = logo || brand ? `<div class="mark">${logo ? `<img src="${esc(logo)}" alt="">` : ''}${brand ? `<b>${esc(brand)}</b>` : ''}</div>` : '';
  const endHtml = `  <div class="endc"${outroSrc ? ` data-voice="${esc(outroSrc)}" style="--voice:${END}s"` : ''}>
    ${markHtml}
    ${tagHtml ? `<h2>${tagHtml}</h2>` : ''}
    ${meta.cta ? `<div class="cta"><b>${esc(meta.cta)}</b></div>` : ''}
    ${meta.url ? `<div class="url"><span style="--n:${meta.url.length}">${esc(meta.url)}</span></div>` : ''}
  </div>`;
  const endGfx = GFX.layer(GFX.placeAll([
    ...(markHtml ? [`shapes rings 50%,33.6% @${r2(END + 0.2)} +1.2 size=260 sfx=none`] : []),
    ...(meta.confetti === 'no' ? [] : [`shapes confetti @${r2(END + 0.15)} +2.2 sfx=none`]),
    ...(meta.cta ? [`cursor 64%,56% @${r2(END + 2.6)} +${r2(Math.max(0.8, outroLength - 2.7))} sfx=${sounds ? 'click' : 'none'}`] : []),
  ], { base: 0, end: DURATION }).items, { W, H, sounds });

  const theme = dark
    ? '--page: #0f0f13; --page2: #17171d; --page3: #0b0b0e; --ink: #f3f2ee; --sub: #a9a6b0; --dot: rgba(255,255,255,.08); --chip: rgba(255,255,255,.08); --track: rgba(255,255,255,.14); --shadow: rgba(0,0,0,.55);'
    : '--page: #fffaf2; --page2: #f4ecdf; --page3: #efe5d5; --ink: #171411; --sub: #6d655b; --dot: rgba(23,20,17,.13); --chip: rgba(255,255,255,.78); --track: rgba(23,20,17,.1); --shadow: rgba(35,50,120,.24);';
  const css = `<style>
${fontHead}  :root { --accent: ${accent}; --on-accent: ${onAccent(accent)}; ${theme} }
  html, body { background: var(--page2); }
  body { color: var(--ink); background: radial-gradient(ellipse 90% 55% at 50% 48%, var(--page) 0%, var(--page2) 70%, var(--page3) 100%); }
  /* the moving background: the accent's light drifting, and a slow dot field */
  .cbg { position: absolute; inset: 0; overflow: hidden; }
  .cbg .glow { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 1; }
  .cbg .b1 { width: 760px; height: 760px; left: -300px; top: 80px; background: radial-gradient(circle, color-mix(in srgb, var(--accent) 40%, transparent), transparent 68%); animation: cDrift1 9s ease-in-out 0s infinite alternate; }
  .cbg .b2 { width: 860px; height: 860px; right: -360px; top: 1000px; background: radial-gradient(circle, color-mix(in srgb, var(--accent) 34%, transparent), transparent 68%); animation: cDrift2 11s ease-in-out 0s infinite alternate; }
  .cbg .b3 { width: 520px; height: 520px; right: -160px; top: -120px; background: radial-gradient(circle, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%); animation: cDrift1 13s ease-in-out 0s infinite alternate-reverse; }
  @keyframes cDrift1 { to { translate: 220px 300px; } }
  @keyframes cDrift2 { to { translate: -240px -260px; } }
  .cbg .dots { position: absolute; inset: -88px; background-image: radial-gradient(var(--dot) 2.2px, transparent 2.8px); background-size: 44px 44px;
               -webkit-mask-image: radial-gradient(ellipse 75% 60% at 50% 45%, transparent 35%, #000 85%); mask-image: radial-gradient(ellipse 75% 60% at 50% 45%, transparent 35%, #000 85%);
               animation: cDots 12s linear 0s infinite; }
  @keyframes cDots { to { translate: 44px 88px; } }
  /* the brand's chip and the story's progress, coming in just after the cover frame */
  .ctop { position: absolute; left: 90px; right: 150px; top: 196px; display: flex; flex-direction: column; align-items: center; gap: 16px;
          animation: fadeIn .35s ease-out .3s both, fadeOut .25s ease-in ${r2(END - 0.1)}s forwards; }
  .ctop .chip { display: flex; align-items: center; gap: 12px; padding: 8px 22px; border-radius: 999px; background: var(--chip); box-shadow: 0 6px 20px rgba(0,0,0,.12);
                font-size: 32px; font-weight: 700; }
  .ctop .chip img { height: 34px; }
  .ctop .bar { width: 420px; height: 7px; border-radius: 4px; background: var(--track); overflow: hidden; }
  .ctop .bar i { display: block; height: 100%; background: var(--accent); transform-origin: 0 50%; animation: cFill ${END}s linear 0s both; }
  @keyframes cFill { from { scale: 0 1; } to { scale: 1 1; } }
  /* the lines: the headline font, a marker swiping in under the key words */
  .hook, .gx-text .gx-tx { font-family: "${fontFamily}", Georgia, serif; font-weight: ${headWeight}; color: var(--ink); text-shadow: none;
                           font-size: 84px; line-height: 1.1; letter-spacing: -.015em; }
  .ta-slam .gx-tx { font-size: 100px; }
  .gx-text .gx-hi { color: var(--accent); position: relative; z-index: 0; }
  .gx-text .gx-hi::after { content: ''; position: absolute; left: -.05em; right: -.05em; bottom: .02em; height: .26em; z-index: -1; border-radius: .08em;
                           background: color-mix(in srgb, var(--accent) 26%, transparent); transform-origin: 0 50%; scale: 0 1;
                           animation: cSwipe .45s cubic-bezier(.6,0,.3,1) calc(var(--in) + .55s) forwards; }
  @keyframes cSwipe { to { scale: 1 1; } }
  .hook { position: absolute; left: 90px; width: 840px; top: 320px; height: 260px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 116px; }
  .hook .hi { display: inline-block; color: var(--accent); font-weight: inherit; transform-origin: 50% 80%; animation: cWiggle .5s ease-in-out .55s 2; }
  @keyframes cWiggle { 0%, 100% { rotate: 0deg; scale: 1; } 30% { rotate: -7deg; scale: 1.08; } 70% { rotate: 6deg; scale: 1.08; } }
  /* the video, as a floating card that punches in on every zoom; the graphics float with it */
  @keyframes cFloat { from { translate: 0 0; } to { translate: 0 -8px; } }
  .cwrap { position: absolute; left: ${CARD.x}px; top: ${CARD.y}px; width: ${CARD.w}px; height: ${CARD.h}px; animation: cFloat 3.2s ease-in-out .4s infinite alternate; }
  .gx-layer { animation: cFloat 3.2s ease-in-out .4s infinite alternate; }
  .card { position: absolute; inset: 0; border-radius: 28px; overflow: hidden; box-shadow: 0 34px 90px var(--shadow), 0 8px 22px rgba(0,0,0,.14), inset 0 0 0 1px rgba(0,0,0,.05);
          animation: ${[...shakes, `fadeOut .2s ease-in ${r2(END - 0.05)}s forwards`].join(', ')}; }
  .card .bg-media { animation: none; filter: none; transform: none; }
  .card .shot { position: absolute; inset: 0; animation: fadeIn .01s linear var(--in) both, cPunch .4s cubic-bezier(.2,.8,.2,1) var(--in) both, fadeOut .01s linear var(--out) forwards; }
  .card .shot.first { animation: fadeOut .01s linear var(--out) forwards; }
  @keyframes cPunch { from { scale: 1.14; } to { scale: 1; } }
  .flashcut { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; animation: cFlash .28s ease-out var(--in) both; }
  @keyframes cFlash { 0% { opacity: 0; } 10% { opacity: .55; } 100% { opacity: 0; } }
  .bars i:nth-child(3) { background: var(--ink); }
  /* the end card */
  .endc { position: absolute; left: 90px; right: 150px; top: 0; height: 1920px; animation: gxShow .01s linear ${END}s both; }
  .endc .mark, .endc h2, .endc .cta, .endc .url { position: absolute; left: 0; right: 0; display: flex; justify-content: center; text-align: center; }
  .endc .mark { top: 580px; align-items: center; gap: 22px; animation: popIn .55s cubic-bezier(.2,.9,.3,1.25) ${r2(END + 0.15)}s both; }
  .endc .mark img { height: 100px; }
  .endc .mark b { font-size: 88px; font-weight: 800; letter-spacing: -2px; }
  .endc h2 { top: 740px; flex-wrap: wrap; column-gap: .26em; font-family: "${fontFamily}", Georgia, serif; font-weight: ${headWeight}; font-size: 80px; line-height: 1.12; letter-spacing: -.015em; }
  .endc h2 span { display: inline-block; animation: riseIn .5s cubic-bezier(.2,.8,.2,1) calc(${r2(END + 0.45)}s + var(--k) * .09s) both; }
  .endc h2 span.hi { color: var(--accent); }
  .endc .cta { top: 1030px; }
  .endc .cta b { position: relative; overflow: hidden; padding: 24px 48px 26px; border-radius: 999px; background: var(--ink); color: var(--page); font-size: 46px; font-weight: 800;
                 box-shadow: 0 18px 40px rgba(0,0,0,.25); animation: popIn .5s cubic-bezier(.2,.9,.3,1.25) ${r2(END + 1.6)}s both, cPulse 1.2s ease-in-out ${r2(END + 2.2)}s infinite; }
  .endc .cta b::after { content: ''; position: absolute; top: 0; bottom: 0; left: -40%; width: 30%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent);
                        skew: -20deg; animation: cShine .8s ease-in-out ${r2(END + 2.0)}s both; }
  @keyframes cShine { from { translate: 0 0; } to { translate: 520% 0; } }
  @keyframes cPulse { 0%, 100% { box-shadow: 0 18px 40px rgba(0,0,0,.25), 0 0 0 0 color-mix(in srgb, var(--accent) 55%, transparent); }
                      60% { box-shadow: 0 18px 40px rgba(0,0,0,.25), 0 0 0 22px transparent; } }
  .endc .url { top: 1160px; }
  .endc .url span { display: inline-block; white-space: nowrap; font-size: 42px; font-weight: 700; color: var(--sub);
                    animation: cType .9s steps(var(--n), end) ${r2(END + 2.0)}s both; }
  @keyframes cType { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0); } }
</style>
`;
  const template = fs.readFileSync(path.join(__dirname, 'templates', 'narrated.html'), 'utf8');
  const head = template.slice(template.indexOf('<html>'), template.indexOf('</head>'));
  const hookHtml = meta.hook ? `  <!-- 0–${hookOut}s: the hook, on screen from the first frame -->\n  <div class="hook now" style="--out:${hookOut}s"><span>${lit(meta.hook)}</span></div>\n` : '';
  const doc = `<!doctype html>
<!--
  A widescreen video as a vertical short, written by scripts/video/card.js from ${path.relative(pageDir, path.resolve(file))}.
  Edit the script and run card.js again rather than editing this page.
  Page conventions: see the comment at the top of templates/promo.html.
-->
${head}${css}</head>
<body data-duration="${DURATION}" ${musicAttrs.join(' ')}>
  <div class="cbg" data-lint="off"><i class="glow b1"></i><i class="glow b2"></i><i class="glow b3"></i><i class="dots"></i></div>
${brand || logo ? `  <div class="ctop"><div class="chip">${logo ? `<img src="${esc(logo)}" alt="">` : ''}${esc(brand)}</div>${meta.progress === 'no' ? '' : '<div class="bar" data-lint="off"><i></i></div>'}</div>` : ''}
  <!-- the video, ${s.from}–${s.to}s of ${path.basename(s.video)}, in a floating card: its own sound throughout, each zoom cut over it -->
  <div class="cwrap"><div class="card">
    <div class="shot first" style="--in:0s; --out:${END}s"><video class="bg-media" id="video" src="${esc(rel(mainFile))}"${s.info.sound ? ' data-audio' : ''} data-loop="false"></video></div>
${shotHtml}
${changes}
  </div></div>

${gfxHtml}${cues.join('\n')}
${leaks}
${hookHtml}
  <!-- the cut to the end card, under the accent's bands -->
${EDIT.overlayAt('bars', END).replace('data-lint="off"', `data-lint="off"${sounds ? ' data-sfx="whoosh"' : ''}`)}

  <!-- ${END}s: the end card${outroSrc ? ', over the video\'s closing words' : ''} -->
${endHtml}
${endGfx}</body>
</html>
`;
  fs.writeFileSync(page, doc);
  console.log(`Wrote ${page}: ${DURATION}s (${length}s of ${path.basename(s.video)}, then ${r2(outroLength)}s of end card)`);
  for (const b of beats) {
    const [x, y, w, h] = regionOf(s, b);
    console.log(`  ${String(b.n).padStart(2)}. ${String(b.at).padStart(5)}–${String(b.end).padEnd(5)}s  ${b.zoom ? `zoom ${x},${y} ${w}x${h}` : 'whole picture'}${b.line ? `  "${b.line.slice(0, 44)}"` : ''}`);
  }
  for (const g of items) if (g.kind !== 'text') console.log(`  graphic: ${GFX.describe(g)}`);
  console.log(`  sound: ${s.info.sound ? 'the video\'s own' : 'none in the video'}${music !== 'none' ? `, music ${music}` : ''}${outroSrc ? ', its outro under the end card' : ''}${sounds ? '' : '; no graphic sounds'}`);
  for (const n of notes) console.warn(`Note: ${n}`);
  if (!args.noCheck) {
    const check = spawnSync(process.execPath, [path.join(__dirname, 'render.js'), page, '--check'], { stdio: 'inherit' });
    if (check.status !== 0) console.warn('Fix what --check lists (usually a graphic placed over a line), then run card.js again.');
  }
  const shown = path.relative(process.cwd(), page);
  console.log(`Next: node ${path.join(__dirname, 'render.js')} ${shown.startsWith('..') ? page : shown} <out.mp4> --cover 0`);
}

function main() {
  const argv = process.argv.slice(2);
  const args = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--no-check') args.noCheck = true;
    else if (argv[i] === '-h' || argv[i] === '--help') args.help = true;
    else args.positional.push(argv[i]);
  }
  const [first, ...rest] = args.positional;
  if (args.help || !first) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^[\s\S]*?\/\*/, '').replace(/^ \* ?/gm, ''));
    process.exit(args.help ? 0 : 2);
  }
  if (first === 'where') {
    if (rest.length !== 4) fail('node card.js where <script.md> <beat> <x> <y>');
    return where(...rest);
  }
  return build(first, args);
}

if (require.main === module) main();

module.exports = { fitRegion, parseBeat };
