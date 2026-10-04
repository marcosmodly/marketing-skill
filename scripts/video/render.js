#!/usr/bin/env node
'use strict';
/*
 * Renders an animated HTML page into a vertical MP4 (1080x1920, 9:16, 30fps,
 * H.264 + AAC) ready for YouTube Shorts, Instagram Reels, or TikTok, with an
 * original soundtrack synced to the page's own animation cues.
 *
 * The page animates with CSS animations (or the Web Animations API). This
 * script pauses every animation and seeks it frame by frame in headless
 * Chromium, so the output is frame-exact no matter how slow the machine is.
 * See templates/promo.html for the page conventions, and the README section
 * "Rendering a short-form video locally".
 *
 * Usage:
 *   node render.js <page.html> <out.mp4> [--duration 24] [--fps 30] [--silent]
 *   node render.js <page.html> --stills 1.5,6,12 [--outdir dir]   # preview PNGs (default: stills/ next to the page)
 *   node render.js <page.html> --slides [--outdir dir]             # each scene's settled frame as a PNG, for
 *                                                                   # TikTok photo mode / Instagram carousels
 *   node render.js <page.html> --check                             # layout lint over the whole timeline only
 *   node render.js <page.html> <out.m4a> --audio-only              # just the soundtrack, in seconds
 *   node render.js --sample <genre> <out.m4a> [--motif "1 3 5 6 | 5 3 2 -"] [--key C] [--mode major]
 *                  [--bpm 118] [--energy 3] [--duration 12]          # audition a sound with no page at all
 *
 * A voiceover goes in with <body data-voice-src="assets/voice.m4a"> (one take, starting at
 * data-voice-start) or data-voice="assets/line-2.m4a" on any element (plays at its --voice
 * or --in time). The music and effects duck under it.
 *
 * Every run lints the layout: text outside the platforms' safe zone,
 * overflowing or clipped, or colliding with other text is reported with its
 * time, which is how copy that runs long gets caught.
 *
 * Needs: Node 18+, ffmpeg (with libx264 and aac) on PATH, and Playwright
 * (`npm install` in this folder, then `npx playwright install chromium`, or
 * an installed Google Chrome, which is used as a fallback).
 */
const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { fileURLToPath, pathToFileURL } = require('url');
const { buildSoundtrack, wavBuffer, parseMotif, SOUNDS, GENRES } = require('./soundtrack');

const WIDTH = 1080;
const HEIGHT = 1920;
// Audio is mixed to -14 LUFS, what YouTube, Instagram, and TikTok normalize
// to, with the true peak at or under -1 dBTP so a platform's re-encode
// doesn't clip it. PRE goes first: a low-pass, because the noise-based
// sounds carry energy right up to 24 kHz (inter-sample peaks a limiter can't
// see, and phone speakers can't play), then a limiter that shaves the click
// and pluck transients so the gain needed for -14 LUFS doesn't push them up
// with it.
const PRE = 'lowpass=f=16000:poles=2,alimiter=limit=0.25:attack=5:release=60:level=false';
const TARGET_LUFS = -14;
const MAX_TRUE_PEAK = -1;
// The final limiter runs at 192 kHz (4x) so it catches peaks between
// samples. AAC encoding can still overshoot unpredictably, so the result is
// measured and re-encoded with the next lower ceiling until it fits.
const CEILINGS = [0.79, 0.75, 0.7, 0.63];

function fail(message) {
  console.error(message);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--silent') args.silent = true;
    else if (a === '--audio-only') args.audioOnly = true;
    else if (a === '--check') args.check = true;
    else if (a === '--slides') args.slides = true;
    else if (['--duration', '--fps', '--stills', '--outdir', '--sample', '--motif', '--key', '--mode', '--bpm', '--energy'].includes(a)) args[a.slice(2)] = argv[++i];
    else if (a === '-h' || a === '--help') args.help = true;
    else args.positional.push(a);
  }
  return args;
}

function loadPlaywright() {
  for (const name of ['playwright', 'playwright-core']) {
    try {
      return require(name);
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') throw e;
    }
  }
  fail(
    'Playwright is not installed. From this folder (scripts/video) run:\n' +
      '  npm install\n  npx playwright install chromium\n' +
      '(The second step can be skipped if Google Chrome is installed; it is used as a fallback.)'
  );
}

async function launchBrowser(chromium) {
  try {
    return await chromium.launch();
  } catch (e) {
    // no Playwright-managed Chromium downloaded: try the user's own Chrome before giving up
    try {
      return await chromium.launch({ channel: 'chrome' });
    } catch {
      fail(`Couldn't start a browser: ${e.message.split('\n')[0]}\nRun \`npx playwright install chromium\` in scripts/video, or install Google Chrome.`);
    }
  }
}

// Web fonts (Google Fonts) are fetched by Node and cached, not by the browser: renders then
// work offline after the first run, and behind proxies the bundled Chromium doesn't trust.
const FONT_HOSTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;
const FONT_CACHE = path.join(os.homedir(), '.cache', 'marketing-skill', 'fonts');

async function routeFonts(page) {
  await page.route(FONT_HOSTS, async (route) => {
    const url = route.request().url();
    const file = path.join(FONT_CACHE, crypto.createHash('sha1').update(url).digest('hex'));
    try {
      if (!fs.existsSync(file)) {
        const res = await fetch(url, { headers: { 'user-agent': route.request().headers()['user-agent'] } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = Buffer.from(await res.arrayBuffer());
        fs.mkdirSync(FONT_CACHE, { recursive: true });
        fs.writeFileSync(`${file}.type`, res.headers.get('content-type') || 'application/octet-stream');
        fs.writeFileSync(file, body);
      }
      await route.fulfill({
        body: fs.readFileSync(file),
        contentType: fs.readFileSync(`${file}.type`, 'utf8'),
        headers: { 'access-control-allow-origin': '*' },
      });
    } catch {
      await route.continue();
    }
  });
}

// Opens a page at the frame size with its fonts loaded. Returns the page and any fonts that
// failed, since a fallback font changes every line break the layout lint checks.
async function openPage(browser, pagePath) {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  await routeFonts(page);
  await page.goto('file://' + path.resolve(pagePath), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const failed = await page.evaluate(() => {
    const out = new Set();
    for (const f of document.fonts) if (f.status === 'error') out.add(f.family.replace(/"/g, ''));
    for (const l of document.querySelectorAll('link[rel="stylesheet"]')) {
      if (/fonts\.googleapis\.com/.test(l.href) && ![...document.fonts].length) out.add('Google Fonts stylesheet');
    }
    return [...out];
  });
  const problems = failed.length
    ? [`web fonts didn't load (${failed.join(', ')}), so text uses a fallback font; connect to the internet once so they cache`]
    : [];
  return { page, problems };
}

function requireFfmpeg() {
  const probe = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) fail('ffmpeg was not found on PATH. Install it (e.g. `brew install ffmpeg` or `apt install ffmpeg`) and retry.');
  for (const enc of ['libx264', 'aac']) {
    if (!probe.stdout.includes(` ${enc} `)) fail(`This ffmpeg build has no ${enc} encoder, which the platforms' upload specs need. Install a full ffmpeg build.`);
  }
}

function ffmpeg(args) {
  const run = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { encoding: 'utf8' });
  if (run.status !== 0) fail(`ffmpeg failed: ${run.stderr}`);
}

// Pause every animation on the page and jump it to `seconds`. Background
// videos (swapped for frame sequences by prepareMedia) jump too: a clip
// starts at its --in time, inherited from its .bg layer, from data-offset
// seconds into the clip, and loops unless data-loop="false".
async function seek(page, seconds) {
  await page.evaluate(async (t) => {
    for (const a of document.getAnimations()) {
      a.pause();
      a.currentTime = t * 1000;
    }
    const toSeconds = (v) => {
      v = (v || '').trim();
      return v.endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v) || 0;
    };
    const decodes = [];
    for (const img of document.querySelectorAll('img[data-frames]')) {
      const count = Number(img.dataset.count);
      let local = Math.max(0, t - toSeconds(getComputedStyle(img).getPropertyValue('--in'))) + toSeconds(img.dataset.offset);
      let frame = Math.floor(local * 30 + 1e-6);
      frame = img.dataset.loop === 'false' ? Math.min(frame, count - 1) : frame % count;
      const src = `${img.dataset.frames}/${String(frame + 1).padStart(5, '0')}.jpg`;
      if (img.getAttribute('src') !== src) {
        img.src = src;
        decodes.push(img.decode().catch(() => null));
      }
    }
    await Promise.all(decodes);
    return new Promise(requestAnimationFrame);
  }, seconds);
}

const hasFfmpeg = () => spawnSync('ffmpeg', ['-version']).status === 0;

// Average brightness of an image, 0 (black) to 1 (white), or null without ffmpeg.
function meanLuma(file) {
  if (!hasFfmpeg()) return null;
  const run = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-frames:v', '1', '-vf', 'scale=36:64,format=gray', '-f', 'rawvideo', '-']);
  if (run.status !== 0 || !run.stdout.length) return null;
  let sum = 0;
  for (const b of run.stdout) sum += b;
  return sum / run.stdout.length / 255;
}

// Background videos become a 1080x1920 30fps JPEG frame sequence (made once,
// cached across runs), and each <video> is swapped for an <img> that seek()
// points at the right frame. That's exact on any frame, and it doesn't depend
// on the browser's video codecs (Playwright's Chromium can't play H.264).
// Images are decoded up front. Returns problems to warn about.
async function prepareMedia(page) {
  const problems = [];
  const videos = await page.evaluate(() => [...document.querySelectorAll('video')].map((v, i) => {
    v.dataset.renderIndex = String(i);
    return v.currentSrc || v.src || v.querySelector('source')?.src || '';
  }));
  const cacheDir = path.join(os.tmpdir(), 'render-video-cache');
  if (videos.length && !hasFfmpeg()) {
    problems.push('ffmpeg is needed to render background videos; they will be blank');
    return problems;
  }
  for (let i = 0; i < videos.length; i++) {
    const src = videos[i];
    if (!src.startsWith('file:')) {
      problems.push(`video ${src || '(no src)'} isn't a local file; download it into assets/ first (media.js does this)`);
      continue;
    }
    const file = fileURLToPath(src);
    if (!fs.existsSync(file)) {
      problems.push(`video not found: ${file}`);
      continue;
    }
    const st = fs.statSync(file);
    const key = crypto.createHash('sha1').update(`${file}|${st.size}|${st.mtimeMs}`).digest('hex').slice(0, 16);
    const dir = path.join(cacheDir, key);
    if (!fs.existsSync(path.join(dir, 'done'))) {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      ffmpeg(['-i', file, '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30',
        '-q:v', '3', path.join(dir, '%05d.jpg')]);
      fs.writeFileSync(path.join(dir, 'done'), '');
    }
    const count = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).length;
    await page.evaluate(([index, framesUrl, n]) => {
      const v = document.querySelector(`video[data-render-index="${index}"]`);
      const img = document.createElement('img');
      for (const { name, value } of v.attributes) if (!['src', 'autoplay', 'loop', 'muted', 'controls', 'playsinline', 'preload', 'data-render-index'].includes(name)) img.setAttribute(name, value);
      img.dataset.frames = framesUrl;
      img.dataset.count = String(n);
      img.src = `${framesUrl}/00001.jpg`;
      img.alt = '';
      v.replaceWith(img);
    }, [i, pathToFileURL(dir).href, count]);
  }
  // Darken each background just enough for white text: brighter media gets a heavier --shade,
  // unless the page set one on the slot itself.
  const slots = await page.evaluate(() => [...document.querySelectorAll('.bg')].map((bg, i) => {
    const media = bg.querySelector('.bg-media');
    if (!media || bg.style.getPropertyValue('--shade')) return null;
    const src = media.dataset.frames ? `${media.dataset.frames}/00001.jpg` : media.currentSrc || media.src;
    return src && src.startsWith('file:') ? { i, src } : null;
  }).filter(Boolean));
  for (const { i, src } of slots) {
    const luma = meanLuma(fileURLToPath(src));
    if (luma === null) continue;
    // grade (x0.9) and the scrim's middle band (x0.8) then bring the area behind text to about 0.22
    const shade = Math.min(0.75, Math.max(0.25, 1 - 0.22 / (0.72 * luma))).toFixed(2);
    await page.evaluate(([index, value]) => document.querySelectorAll('.bg')[index].style.setProperty('--shade', value), [i, shade]);
  }

  const images = await page.evaluate(async () => Promise.all([...document.images].map(async (img) => {
    try { await img.decode(); } catch { /* reported below */ }
    return { src: img.getAttribute('src'), w: img.naturalWidth, h: img.naturalHeight, bg: !!img.closest('.bg') };
  })));
  for (const img of images) {
    if (!img.w) problems.push(`image didn't load: ${img.src}`);
    else if (img.bg && (img.w < 1080 || img.h < 1920)) problems.push(`background ${img.src} is ${img.w}x${img.h}, under 1080x1920; it will look soft`);
  }
  return problems;
}

// Platform UI covers the top ~150px (tabs), the bottom ~470px (caption, sound), and the
// right ~120px (like/comment/share); text has to stay clear of all three.
const SAFE_ZONE = { left: 60, right: 960, top: 150, bottom: 1450 };

// Checks every visible, settled text element at the current moment: inside the safe zone,
// not overflowing its own box, not clipped by an overflow:hidden ancestor, and not
// colliding with other text. Text mid-animation is skipped, since it's moving on purpose.
// Add data-lint="off" to an element to exempt it and everything inside it.
async function lintLayout(page, seconds) {
  return page.evaluate(([t, safe]) => {
    const problems = [];
    const moving = (el) => {
      for (let e = el; e; e = e.parentElement) {
        for (const a of e.getAnimations()) {
          const c = a.effect.getComputedTiming();
          if (c.activeDuration === Infinity || c.localTime === null) continue;
          if (c.localTime > c.delay && c.localTime < c.delay + c.activeDuration) return true;
        }
      }
      return false;
    };
    const opacity = (el) => {
      let o = 1;
      for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
        o *= parseFloat(cs.opacity);
      }
      return o;
    };
    const snippet = (el) => el.textContent.trim().replace(/\s+/g, ' ').slice(0, 48);
    const texts = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (el.closest('.bg, .bg-media, [data-lint="off"], script, style')) continue;
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      if (opacity(el) < 0.5 || moving(el)) continue;
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1);
      if (!rects.length) continue;
      const box = {
        left: Math.min(...rects.map((r) => r.left)), right: Math.max(...rects.map((r) => r.right)),
        top: Math.min(...rects.map((r) => r.top)), bottom: Math.max(...rects.map((r) => r.bottom)),
      };
      // glyph boxes of display type with a tight line-height reach past the line box by design,
      // so vertical checks allow a third of the font size
      const slack = Math.max(4, 0.35 * parseFloat(getComputedStyle(el).fontSize));
      texts.push({ el, box, slack, rects });
      if (box.left < safe.left - 2 || box.right > safe.right + 2 || box.top < safe.top - slack || box.bottom > safe.bottom + slack) {
        problems.push({ t, kind: 'outside the safe zone', text: snippet(el),
          detail: `x ${Math.round(box.left)}-${Math.round(box.right)}, y ${Math.round(box.top)}-${Math.round(box.bottom)}` });
      }
      const own = el.getBoundingClientRect();
      if (box.right > own.right + 4 || box.left < own.left - 4 || box.bottom > own.bottom + slack) {
        problems.push({ t, kind: 'overflows its box', text: snippet(el) });
      }
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflow === 'visible' && cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
        const r = a.getBoundingClientRect();
        if (box.left < r.left - 2 || box.right > r.right + 2 || box.top < r.top - slack || box.bottom > r.bottom + slack) {
          problems.push({ t, kind: 'clipped by its container', text: snippet(el) });
          break;
        }
      }
    }
    // text running into a box it isn't part of (a card, phone frame, image, bubble)
    const boxes = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (el.closest('.bg, .bg-media, .glow, [data-lint="off"], script, style')) continue;
      const cs = getComputedStyle(el);
      const filled = (cs.backgroundColor && !/rgba\(.*,\s*0(\.0*)?\)$|transparent/.test(cs.backgroundColor)) || cs.backgroundImage !== 'none';
      const bordered = ['Top', 'Right', 'Bottom', 'Left'].some((side) => parseFloat(cs[`border${side}Width`]) > 0 && !/rgba\(.*,\s*0(\.0*)?\)$|transparent/.test(cs[`border${side}Color`]));
      if (!(filled || bordered || el.tagName === 'IMG')) continue;
      if (opacity(el) < 0.5 || moving(el)) continue;
      boxes.push({ el, r: el.getBoundingClientRect() });
    }
    // checked line by line: one covered line is a problem however wide the paragraph is
    for (const t0 of texts) {
      const hit = boxes.find((b) => !b.el.contains(t0.el) && !t0.el.contains(b.el) && t0.rects.some((line) => {
        const w = Math.min(line.right, b.r.right) - Math.max(line.left, b.r.left);
        const h = Math.min(line.bottom - t0.slack / 2, b.r.bottom) - Math.max(line.top + t0.slack / 2, b.r.top);
        return w > 30 && h > 6;
      }));
      if (hit) problems.push({ t, kind: 'runs into another element', text: snippet(t0.el), detail: `<${hit.el.tagName.toLowerCase()} class="${hit.el.className}">` });
    }

    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i];
        const b = texts[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const w = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left);
        const h = Math.min(a.box.bottom - a.slack / 2, b.box.bottom - b.slack / 2) - Math.max(a.box.top + a.slack / 2, b.box.top + b.slack / 2);
        if (w <= 0 || h <= 0) continue;
        const smaller = Math.min((a.box.right - a.box.left) * (a.box.bottom - a.box.top), (b.box.right - b.box.left) * (b.box.bottom - b.box.top));
        if (w * h > 0.2 * smaller) problems.push({ t, kind: 'overlaps other text', text: `${snippet(a.el)} / ${snippet(b.el)}` });
      }
    }
    return problems;
  }, [seconds, SAFE_ZONE]);
}

// Lints the page every `step` seconds, and returns each problem once (at its first time).
async function lintTimeline(page, duration, step = 0.25) {
  const seen = new Map();
  for (let t = 0; t <= duration + 1e-6; t += step) {
    await seek(page, Math.min(t, duration - 0.01));
    for (const p of await lintLayout(page, Math.min(t, duration - 0.01))) {
      const key = `${p.kind}|${p.text}`;
      if (!seen.has(key)) seen.set(key, p);
    }
  }
  return [...seen.values()];
}

const describeLint = (p) => `${p.t.toFixed(2)}s: "${p.text}" ${p.kind}${p.detail ? ` (${p.detail})` : ''}`;

// The settled moment of each scene, just before it leaves: one per .scene, .gone, or .swap exit,
// plus the end. <body data-slides="2.6,6.8,..."> overrides. Used for --slides and check.js.
async function slideTimes(page, duration) {
  return page.evaluate((d) => {
    if (document.body.dataset.slides) return document.body.dataset.slides.split(',').map(Number).filter((n) => n >= 0 && n <= d);
    const toSeconds = (v) => {
      v = (v || '').trim();
      return v.endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v);
    };
    const outs = new Set();
    for (const el of document.querySelectorAll('.scene, .gone, .swap')) {
      const out = toSeconds(el.style.getPropertyValue('--out'));
      if (out > 0 && out < d) outs.add(Math.round((out - 0.15) * 100) / 100);
    }
    outs.add(Math.round((d - 0.2) * 100) / 100);
    // exits within 0.3s of each other are the same moment (an item leaving with its scene)
    return [...outs].sort((a, b) => a - b).filter((t, i, all) => i === all.length - 1 || all[i + 1] - t > 0.3);
  }, duration);
}

// Settings from <body data-*>, and sound cues from every [data-sfx] element.
// data-sfx="swish:in tick:tick" plays a swish at the element's --in and a
// tick at its --tick (CSS custom properties, e.g. style="--in:3.4s").
async function readPage(page) {
  return page.evaluate((known) => {
    const toSeconds = (v) => {
      v = (v || '').trim();
      if (!v) return NaN;
      return v.endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v);
    };
    const cues = [];
    const problems = [];
    for (const el of document.querySelectorAll('[data-sfx]')) {
      for (const token of el.dataset.sfx.trim().split(/\s+/)) {
        const [sound, cssVar = 'in'] = token.split(':');
        const time = toSeconds(getComputedStyle(el).getPropertyValue(`--${cssVar}`));
        if (!known.includes(sound)) problems.push(`unknown sound "${sound}" (known: ${known.join(', ')})`);
        else if (Number.isNaN(time)) problems.push(`data-sfx="${token}" but the element has no --${cssVar} time`);
        else cues.push({ sound, time });
      }
    }
    const d = document.body.dataset;
    const num = (v) => (v !== undefined && v !== '' ? parseFloat(v) : undefined);
    // spoken lines: one take on <body>, and/or one clip per element at its --voice (or --in) time
    const voices = [];
    if (d.voiceSrc) voices.push({ src: new URL(d.voiceSrc, location.href).href, time: num(d.voiceStart) || 0 });
    for (const el of document.querySelectorAll('[data-voice]')) {
      const cs = getComputedStyle(el);
      let time = toSeconds(cs.getPropertyValue('--voice'));
      if (Number.isNaN(time)) time = toSeconds(cs.getPropertyValue('--in'));
      if (Number.isNaN(time)) problems.push(`data-voice="${el.dataset.voice}" but the element has no --voice or --in time`);
      else voices.push({ src: new URL(el.dataset.voice, location.href).href, time });
    }
    return {
      cues,
      problems,
      voices,
      duration: num(d.duration),
      drop: num(d.drop),
      bpm: num(d.bpm),
      key: d.key,
      mode: d.mode,
      energy: num(d.energy),
      motif: d.motif,
      breaks: d.break || '',
      music: d.music || 'lofi',
      musicSrc: d.musicSrc ? new URL(d.musicSrc, location.href).href : '',
      musicStart: num(d.musicStart) || 0,
    };
  }, SOUNDS);
}

// Checks the music settings, warning about anything it has to ignore.
function checkMusic(settings) {
  const problems = [];
  if (settings.music !== 'none' && !GENRES[settings.music]) {
    problems.push(`unknown data-music="${settings.music}" (use ${Object.keys(GENRES).join(', ')}, or none); using lofi`);
    settings.music = 'lofi';
  }
  if (settings.motif) {
    try {
      parseMotif(settings.motif);
    } catch (e) {
      problems.push(`data-motif "${settings.motif}" can't be used (${e.message}); using the genre's default hook`);
      settings.motif = undefined;
    }
  }
  if (settings.key && !/^[A-G](#|b)?$/.test(settings.key)) {
    problems.push(`data-key "${settings.key}" isn't a key like C, F#, or Bb; using C`);
    settings.key = 'C';
  }
  if (settings.mode && !['major', 'minor'].includes(settings.mode)) {
    problems.push(`data-mode "${settings.mode}" should be major or minor; using the genre's default`);
    settings.mode = undefined;
  }
  settings.breaks = String(settings.breaks || '').split(',').map((w) => w.trim()).filter(Boolean).map((w) => {
    const m = /^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/.exec(w);
    if (!m) problems.push(`data-break "${w}" should look like 8.5-13.5`);
    return m && [parseFloat(m[1]), parseFloat(m[2])];
  }).filter(Boolean);
  if (settings.musicSrc) {
    const file = settings.musicSrc.startsWith('file:') ? fileURLToPath(settings.musicSrc) : '';
    if (!file || !fs.existsSync(file)) {
      problems.push(`data-music-src not found (${file || settings.musicSrc}); using the generated music instead`);
      settings.musicSrc = '';
    } else {
      settings.musicFile = file;
    }
  }
  settings.voiceClips = [];
  for (const v of settings.voices || []) {
    const file = v.src.startsWith('file:') ? fileURLToPath(v.src) : '';
    if (!file || !fs.existsSync(file)) problems.push(`voice clip not found (${file || v.src}); leaving it out`);
    else settings.voiceClips.push({ file, time: v.time });
  }
  return problems;
}

// Warnings about the mix as a whole, once the video's length is known.
const LONG_FOR_GENERATED_MUSIC = 45;
function checkMix(settings, duration) {
  const problems = [];
  if (!settings.musicFile && settings.music !== 'none' && duration > LONG_FOR_GENERATED_MUSIC) {
    problems.push(`the generated music is written for short videos and repeats the same few bars, so over ${Math.round(duration)}s it gets monotonous; use a licensed track (data-music-src) for a video this long`);
  }
  const cues = settings.cues.filter((c) => c.time < duration).length;
  if ((settings.voiceClips || []).length && cues > duration / 3) {
    problems.push(`${cues} sound effects under a voiceover is one every ${(duration / cues).toFixed(1)}s, and effects compete with speech; keep them to scene changes and key moments (one every 3s or fewer)`);
  }
  return problems;
}

const probeDuration = (file) => parseFloat(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout);

// Mixes a licensed track (trimmed, faded) under the generated sound effects, dipping it a
// few dB on each effect so they still land, and writes the result to `out` as a WAV.
function mixLicensedTrack(trackFile, start, duration, sfxWav, out) {
  const trackLen = probeDuration(trackFile);
  const problems = [];
  if (Number.isFinite(trackLen) && trackLen - start < duration) {
    problems.push(`the track has only ${(trackLen - start).toFixed(1)}s from data-music-start=${start}s for a ${duration}s video, so the music will stop early; pick an earlier data-music-start or a longer track`);
  }
  const fadeOut = Math.max(0, duration - 1.5).toFixed(2);
  ffmpeg(['-ss', String(start), '-t', String(duration), '-i', trackFile, '-i', sfxWav, '-filter_complex',
    `[0:a]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=0:${duration},afade=t=in:d=0.3,afade=t=out:st=${fadeOut}:d=1.5,volume=0.8[m];` +
    '[1:a]asplit=2[fx][key];[m][key]sidechaincompress=threshold=0.04:ratio=2.5:attack=5:release=180[ducked];' +
    '[ducked][fx]amix=inputs=2:normalize=0', '-ar', '48000', '-c:a', 'pcm_s16le', out]);
  return problems;
}

// Integrated loudness (LUFS) and true peak (dBTP) of a file's audio, via ffmpeg's EBU R128 meter.
function measureAudio(file, filter = '') {
  const run = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-map', '0:a',
    '-af', `${filter}${filter ? ',' : ''}ebur128=peak=true`, '-f', 'null', '-'], { encoding: 'utf8' });
  const summary = run.stderr.slice(run.stderr.lastIndexOf('Summary:'));
  const value = (re) => {
    const m = re.exec(summary);
    return m ? (m[1] === '-inf' ? -Infinity : parseFloat(m[1])) : NaN;
  };
  return { lufs: value(/I:\s+(-?[\d.]+|-inf) LUFS/), truePeak: value(/Peak:\s+(-?[\d.]+|-inf) dBFS/) };
}

// The voice is leveled low here so the peak limiter in muxSoundtrack (PRE) leaves speech alone;
// muxSoundtrack then brings the whole mix up to -14 LUFS. The music and effects sit
// BED_UNDER_VOICE dB under it, and duck about 10 dB more while someone is speaking.
const VOICE_LUFS = -26;
const BED_UNDER_VOICE = 7;

// Mixes spoken lines over the music and effects in `bedWav`, and writes the result to `out`
// as a WAV. Returns problems to warn about.
function mixVoice(clips, duration, bedWav, tmp, out) {
  const problems = [];
  const parts = [];
  let prevEnd = -Infinity;
  [...clips].sort((a, b) => a.time - b.time).forEach((clip, i) => {
    // each clip is cleaned up and leveled on its own, so lines recorded at different distances
    // match: low rumble filtered, leading silence trimmed (the line starts at its cue), light
    // compression
    const raw = path.join(tmp, `voice-${i}-raw.wav`);
    ffmpeg(['-i', clip.file, '-af', 'aresample=48000,aformat=channel_layouts=stereo,highpass=f=80,' +
      'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,' +
      'acompressor=threshold=0.1:ratio=2.5:attack=15:release=200', '-c:a', 'pcm_s16le', raw]);
    const { lufs } = measureAudio(raw);
    const leveled = path.join(tmp, `voice-${i}.wav`);
    ffmpeg(['-i', raw, '-af', `volume=${Number.isFinite(lufs) ? (VOICE_LUFS - lufs).toFixed(2) : 0}dB`, '-c:a', 'pcm_s16le', leveled]);
    const len = probeDuration(leveled);
    const name = path.basename(clip.file);
    if (clip.time < prevEnd - 0.05) problems.push(`voice ${name} starts at ${clip.time.toFixed(2)}s, before the previous line ends at ${prevEnd.toFixed(2)}s, so they overlap`);
    if (clip.time + len > duration + 0.05) problems.push(`voice ${name} runs ${(clip.time + len - duration).toFixed(1)}s past the end of the video and will be cut off`);
    prevEnd = clip.time + len;
    parts.push({ file: leveled, time: clip.time });
  });
  const voiceWav = path.join(tmp, 'voice.wav');
  ffmpeg([...parts.flatMap((p) => ['-i', p.file]), '-filter_complex',
    `${parts.map((p, i) => `[${i}:a]adelay=${Math.round(p.time * 1000)}:all=1[v${i}]`).join(';')};` +
    `${parts.map((p, i) => `[v${i}]`).join('')}amix=inputs=${parts.length}:normalize=0,apad,atrim=0:${duration}`,
    '-ar', '48000', '-c:a', 'pcm_s16le', voiceWav]);
  const bed = measureAudio(bedWav).lufs;
  const bedGain = Number.isFinite(bed) ? (VOICE_LUFS - BED_UNDER_VOICE - bed).toFixed(2) : '0';
  ffmpeg(['-i', bedWav, '-i', voiceWav, '-filter_complex',
    `[0:a]volume=${bedGain}dB[bed];[1:a]asplit=2[v][key];` +
    '[bed][key]sidechaincompress=threshold=0.008:ratio=3:attack=40:release=450[ducked];' +
    '[ducked][v]amix=inputs=2:normalize=0', '-t', String(duration), '-ar', '48000', '-c:a', 'pcm_s16le', out]);
  return problems;
}

function muxSoundtrack(videoOnly, wav, out) {
  // with no video, writes an audio-only file (an .m4a preview)
  const inputs = videoOnly ? ['-i', videoOnly, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy'] : ['-i', wav, '-vn'];
  const { lufs } = measureAudio(wav, PRE);
  // capped, so a page with only a few sparse sound effects isn't boosted into a wall of clicks
  const gain = Number.isFinite(lufs) ? Math.min(20, TARGET_LUFS - lufs).toFixed(2) : '0';
  let result;
  for (const ceiling of CEILINGS) {
    const filter = `${PRE},volume=${gain}dB,aresample=192000,alimiter=limit=${ceiling}:attack=5:release=50:level=false,aresample=48000`;
    ffmpeg([...inputs, '-af', filter, '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
    result = measureAudio(out);
    if (result.truePeak <= MAX_TRUE_PEAK) break;
  }
  if (!(result.truePeak <= MAX_TRUE_PEAK)) {
    console.warn(`Warning: the audio's true peak is ${result.truePeak} dBTP, above ${MAX_TRUE_PEAK}; a platform re-encode may clip it slightly.`);
  }
  return result;
}

function muxSilence(videoOnly, out) {
  // some uploaders reject a file with no audio stream at all, so --silent still gets one
  ffmpeg(['-i', videoOnly, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out]);
}

// Builds the page's soundtrack (generated music or a licensed track, plus the sound
// effects) and muxes it into `out`, or writes it alone when there's no video.
function writeSoundtrack(settings, duration, tmp, videoOnly, out) {
  const licensed = !!settings.musicFile;
  const voices = settings.voiceClips || [];
  const { L, R, silent } = buildSoundtrack(settings.cues, { ...settings, music: licensed ? 'none' : settings.music, duration });
  if (silent && !licensed && !voices.length) {
    if (videoOnly) muxSilence(videoOnly, out);
    else ffmpeg(['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', String(duration), '-c:a', 'aac', out]);
    return { audio: 'silent track' };
  }
  let wav = path.join(tmp, 'soundtrack.wav');
  fs.writeFileSync(wav, wavBuffer(L, R));
  if (licensed) {
    const mixed = path.join(tmp, 'mixed.wav');
    for (const p of mixLicensedTrack(settings.musicFile, settings.musicStart, duration, wav, mixed)) console.warn(`Warning: ${p}`);
    wav = mixed;
  }
  if (voices.length) {
    const voiced = path.join(tmp, 'voiced.wav');
    for (const p of mixVoice(voices, duration, wav, tmp, voiced)) console.warn(`Warning: ${p}`);
    wav = voiced;
  }
  const level = muxSoundtrack(videoOnly, wav, out);
  const counts = {};
  for (const c of settings.cues.filter((c) => c.time < duration)) counts[c.sound] = (counts[c.sound] || 0) + 1;
  const summary = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ');
  const music = licensed ? `licensed track ${path.basename(settings.musicFile)} + `
    : settings.music === 'none' ? '' : `${settings.music} music + `;
  const voice = voices.length ? `, voiceover (${voices.length} clip${voices.length === 1 ? '' : 's'})` : '';
  return { audio: `soundtrack (${music}${summary || 'no sound effects'}${voice}; ${level.lufs} LUFS, ${level.truePeak} dBTP)` };
}

// --sample: a short preview of a genre and hook, with no page involved.
function sample(args) {
  const out = args.positional[0];
  if (!out) fail('Usage: node render.js --sample <genre> <out.m4a> [--motif "..."] [--key C] [--mode major] [--bpm 118] [--energy 3]');
  requireFfmpeg();
  const settings = {
    cues: [], music: args.sample, motif: args.motif, key: args.key, mode: args.mode,
    bpm: args.bpm ? Number(args.bpm) : undefined, energy: args.energy ? Number(args.energy) : undefined,
    drop: 2, breaks: '',
  };
  for (const p of checkMusic(settings)) console.warn(`Warning: ${p}`);
  const duration = Number(args.duration || 12);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-'));
  const { audio } = writeSoundtrack(settings, duration, tmp, null, out);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`Wrote ${out}: ${duration}s ${audio}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.sample) return sample(args);
  const [pagePath, outPath] = args.positional;
  if (args.help || !pagePath || (!outPath && !args.stills && !args.check && !args.slides)) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^[\s\S]*?\/\*/, '').replace(/^ \* ?/gm, ''));
    process.exit(args.help ? 0 : 2);
  }
  if (!fs.existsSync(pagePath)) fail(`No page found at ${pagePath}`);
  if (!args.stills && !args.check && !args.slides) requireFfmpeg();

  const { chromium } = loadPlaywright();
  const browser = await launchBrowser(chromium);
  const { page, problems: fontProblems } = await openPage(browser, pagePath);
  const mediaProblems = await prepareMedia(page);
  const settings = await readPage(page);
  settings.problems.push(...fontProblems, ...mediaProblems, ...checkMusic(settings));
  for (const p of settings.problems) console.warn(`Warning: ${p}`);

  if (args.stills) {
    const outdir = args.outdir || path.join(path.dirname(path.resolve(pagePath)), 'stills');
    fs.mkdirSync(outdir, { recursive: true });
    const lint = [];
    for (const t of args.stills.split(',').map(Number)) {
      await seek(page, t);
      lint.push(...await lintLayout(page, t));
      const file = path.join(outdir, `still_${t.toFixed(2)}s.png`);
      await page.screenshot({ path: file });
      console.log(file);
    }
    for (const p of lint) console.warn(`Layout: ${describeLint(p)}`);
    await browser.close();
    return;
  }

  const duration = Number(args.duration || settings.duration);
  if (!(duration > 0)) fail('Set the length with <body data-duration="24"> on the page, or pass --duration.');
  for (const p of checkMix(settings, duration)) console.warn(`Warning: ${p}`);
  if (args.check) {
    const lint = await lintTimeline(page, duration);
    await browser.close();
    for (const p of lint) console.warn(`Layout: ${describeLint(p)}`);
    console.log(lint.length ? `${lint.length} layout problem(s) in ${pagePath}` : `No layout problems in ${pagePath}`);
    process.exit(lint.length || settings.problems.length ? 1 : 0);
  }
  if (args.slides) {
    const outdir = args.outdir || path.join(path.dirname(path.resolve(pagePath)), 'slides');
    fs.mkdirSync(outdir, { recursive: true });
    const lint = [];
    const times = await slideTimes(page, duration);
    for (let i = 0; i < times.length; i++) {
      await seek(page, times[i]);
      lint.push(...await lintLayout(page, times[i]));
      const file = path.join(outdir, `slide_${String(i + 1).padStart(2, '0')}.png`);
      await page.screenshot({ path: file });
      console.log(file);
    }
    for (const p of lint) console.warn(`Layout: ${describeLint(p)}`);
    await browser.close();
    return;
  }
  if (args.audioOnly) {
    await browser.close();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-'));
    const { audio } = writeSoundtrack(settings, duration, tmp, null, outPath);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`Wrote ${outPath}: ${duration}s ${audio}`);
    return;
  }
  const fps = Number(args.fps || 30);
  const frames = Math.round(duration * fps);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-'));
  const videoOnly = path.join(tmp, 'video.mp4');

  const encoder = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(fps),
    '-movflags', '+faststart', videoOnly], { stdio: ['pipe', 'inherit', 'inherit'] });
  const encoded = new Promise((resolve) => encoder.on('close', resolve));
  const lintSeen = new Map();
  for (let i = 0; i < frames; i++) {
    await seek(page, i / fps);
    if (i % 8 === 0) {
      for (const p of await lintLayout(page, i / fps)) if (!lintSeen.has(`${p.kind}|${p.text}`)) lintSeen.set(`${p.kind}|${p.text}`, p);
    }
    const png = await page.screenshot({ type: 'png' });
    if (!encoder.stdin.write(png)) await new Promise((r) => encoder.stdin.once('drain', r));
    if (i % fps === 0) process.stderr.write(`\rframe ${i}/${frames}`);
  }
  encoder.stdin.end();
  if ((await encoded) !== 0) fail('ffmpeg failed while encoding the frames.');
  process.stderr.write(`\rframe ${frames}/${frames}\n`);
  await browser.close();

  let audio = 'silent track';
  if (args.silent) muxSilence(videoOnly, outPath);
  else ({ audio } = writeSoundtrack(settings, duration, tmp, videoOnly, outPath));
  fs.rmSync(tmp, { recursive: true, force: true });
  for (const p of lintSeen.values()) console.warn(`Layout: ${describeLint(p)}`);
  console.log(`Wrote ${outPath}: ${WIDTH}x${HEIGHT}, ${duration}s at ${fps}fps, ${audio}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = {
  WIDTH, HEIGHT, loadPlaywright, launchBrowser, openPage, prepareMedia, readPage, checkMusic, checkMix, mixVoice, seek,
  lintLayout, lintTimeline, describeLint, slideTimes, writeSoundtrack, measureAudio, muxSoundtrack,
};
