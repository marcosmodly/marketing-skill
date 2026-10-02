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
 *   node render.js <page.html> <out.m4a> --audio-only              # just the soundtrack, in seconds
 *   node render.js --sample <genre> <out.m4a> [--motif "1 3 5 6 | 5 3 2 -"] [--key C] [--mode major]
 *                  [--bpm 118] [--energy 3] [--duration 12]          # audition a sound with no page at all
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
  const videos = await page.evaluate(() => [...document.querySelectorAll('video')].map((v) => v.currentSrc || v.src || v.querySelector('source')?.src || ''));
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
    // the index of this video among the ones not yet swapped is always 0, since earlier ones are now <img>s
    await page.evaluate(([framesUrl, n]) => {
      const v = document.querySelector('video');
      const img = document.createElement('img');
      for (const { name, value } of v.attributes) if (!['src', 'autoplay', 'loop', 'muted', 'controls', 'playsinline', 'preload'].includes(name)) img.setAttribute(name, value);
      img.dataset.frames = framesUrl;
      img.dataset.count = String(n);
      img.src = `${framesUrl}/00001.jpg`;
      img.alt = '';
      v.replaceWith(img);
    }, [pathToFileURL(dir).href, count]);
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
    return {
      cues,
      problems,
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
  return problems;
}

// Mixes a licensed track (trimmed, faded) under the generated sound effects, dipping it a
// few dB on each effect so they still land, and writes the result to `out` as a WAV.
function mixLicensedTrack(trackFile, start, duration, sfxWav, out) {
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', trackFile], { encoding: 'utf8' });
  const trackLen = parseFloat(probe.stdout);
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
  const { L, R, silent } = buildSoundtrack(settings.cues, { ...settings, music: licensed ? 'none' : settings.music, duration });
  if (silent && !licensed) {
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
  const level = muxSoundtrack(videoOnly, wav, out);
  const counts = {};
  for (const c of settings.cues.filter((c) => c.time < duration)) counts[c.sound] = (counts[c.sound] || 0) + 1;
  const summary = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ');
  const music = licensed ? `licensed track ${path.basename(settings.musicFile)} + `
    : settings.music === 'none' ? '' : `${settings.music} music + `;
  return { audio: `soundtrack (${music}${summary || 'no sound effects'}; ${level.lufs} LUFS, ${level.truePeak} dBTP)` };
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
  if (args.help || !pagePath || (!outPath && !args.stills)) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^[\s\S]*?\/\*/, '').replace(/^ \* ?/gm, ''));
    process.exit(args.help ? 0 : 2);
  }
  if (!fs.existsSync(pagePath)) fail(`No page found at ${pagePath}`);
  if (!args.stills) requireFfmpeg();

  const { chromium } = loadPlaywright();
  const browser = await launchBrowser(chromium);
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(pagePath), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const mediaProblems = await prepareMedia(page);
  const settings = await readPage(page);
  settings.problems.push(...mediaProblems, ...checkMusic(settings));
  for (const p of settings.problems) console.warn(`Warning: ${p}`);

  if (args.stills) {
    const outdir = args.outdir || path.join(path.dirname(path.resolve(pagePath)), 'stills');
    fs.mkdirSync(outdir, { recursive: true });
    for (const t of args.stills.split(',').map(Number)) {
      await seek(page, t);
      const file = path.join(outdir, `still_${t.toFixed(2)}s.png`);
      await page.screenshot({ path: file });
      console.log(file);
    }
    await browser.close();
    return;
  }

  const duration = Number(args.duration || settings.duration);
  if (!(duration > 0)) fail('Set the length with <body data-duration="24"> on the page, or pass --duration.');
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
  for (let i = 0; i < frames; i++) {
    await seek(page, i / fps);
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
  console.log(`Wrote ${outPath}: ${WIDTH}x${HEIGHT}, ${duration}s at ${fps}fps, ${audio}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { measureAudio, muxSoundtrack };
