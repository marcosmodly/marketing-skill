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
 *
 * Needs: Node 18+, ffmpeg (with libx264 and aac) on PATH, and Playwright
 * (`npm install` in this folder, then `npx playwright install chromium`, or
 * an installed Google Chrome, which is used as a fallback).
 */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSoundtrack, wavBuffer, SOUNDS, STYLES } = require('./soundtrack');

const WIDTH = 1080;
const HEIGHT = 1920;
// -14 LUFS is what YouTube, Instagram, and TikTok normalize to; the limiter
// shaves the click/pluck transients so the gain needed to get there doesn't
// push the true peak past -1.5 dBTP. The low-pass goes first: the noise-based
// sounds carry energy right up to 24 kHz, which makes inter-sample peaks a
// sample-peak limiter can't see (and phone speakers can't play anyway).
const LIMITER = 'lowpass=f=16000:poles=2,alimiter=limit=0.25:attack=5:release=60:level=false';
const LOUDNORM = 'loudnorm=I=-14:TP=-1.5:LRA=11';

function fail(message) {
  console.error(message);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--silent') args.silent = true;
    else if (['--duration', '--fps', '--stills', '--outdir'].includes(a)) args[a.slice(2)] = argv[++i];
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

// Pause every animation on the page and jump it to `seconds`.
async function seek(page, seconds) {
  await page.evaluate((ms) => {
    for (const a of document.getAnimations()) {
      a.pause();
      a.currentTime = ms;
    }
    return new Promise(requestAnimationFrame);
  }, seconds * 1000);
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
    return {
      cues,
      problems,
      duration: parseFloat(d.duration),
      drop: d.drop !== undefined ? parseFloat(d.drop) : undefined,
      bpm: d.bpm !== undefined ? parseFloat(d.bpm) : undefined,
      key: d.key,
      music: d.music || 'lofi',
    };
  }, SOUNDS);
}

function muxSoundtrack(videoOnly, wav, out) {
  const measure = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-i', wav, '-af', `${LIMITER},${LOUDNORM}:print_format=json`, '-f', 'null', '-'],
    { encoding: 'utf8' }
  );
  const json = measure.stderr.slice(measure.stderr.lastIndexOf('{'), measure.stderr.lastIndexOf('}') + 1);
  const m = JSON.parse(json);
  const filter =
    `${LIMITER},${LOUDNORM}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}` +
    `:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  ffmpeg(['-i', videoOnly, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', filter,
    '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
}

function muxSilence(videoOnly, out) {
  // some uploaders reject a file with no audio stream at all, so --silent still gets one
  ffmpeg(['-i', videoOnly, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out]);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
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
  const settings = await readPage(page);
  if (settings.music !== 'none' && !STYLES[settings.music]) {
    settings.problems.push(`unknown data-music="${settings.music}" (use ${Object.keys(STYLES).join(', ')}, or none); using lofi`);
    settings.music = 'lofi';
  }
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
  if (!args.silent) {
    const { L, R, silent } = buildSoundtrack(settings.cues, { ...settings, duration });
    if (silent) {
      muxSilence(videoOnly, outPath);
    } else {
      const wav = path.join(tmp, 'soundtrack.wav');
      fs.writeFileSync(wav, wavBuffer(L, R));
      muxSoundtrack(videoOnly, wav, outPath);
      const counts = {};
      for (const c of settings.cues) counts[c.sound] = (counts[c.sound] || 0) + 1;
      const summary = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ');
      const music = settings.music === 'none' ? '' : `${settings.music} music + `;
      audio = `soundtrack (${music}${summary || 'no sound effects'})`;
    }
  } else {
    muxSilence(videoOnly, outPath);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`Wrote ${outPath}: ${WIDTH}x${HEIGHT}, ${duration}s at ${fps}fps, ${audio}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
