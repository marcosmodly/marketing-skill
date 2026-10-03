#!/usr/bin/env node
'use strict';
/*
 * Renders explainer.html into a 1920x1080 (16:9) MP4 with the plugin's own
 * soundtrack. It reuses scripts/video/render.js (frame-exact seeking, the
 * synthesized music and sound effects, and the -14 LUFS mix) and only changes
 * what's different for a landscape explainer: the frame size, a higher frame
 * rate, and rendering in parallel.
 *
 * Usage:
 *   node render.js explainer.html out.mp4 [--fps 60] [--workers 3]
 *   node render.js explainer.html --stills 5,12.5,40 [--outdir stills]
 *   node render.js explainer.html --sheet [--every 2] [--outdir stills]   # a contact sheet of the whole timeline
 *   node render.js explainer.html out.mp4 --from 30 --to 45                  # a preview of one stretch (silent)
 *
 * Needs the same setup as scripts/video/render.js: Node 18+, ffmpeg, and Playwright.
 */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const video = require('../../scripts/video/render.js');

const WIDTH = 1920;
const HEIGHT = 1080;

function parseArgs(argv) {
  const args = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--sheet') args.sheet = true;
    else if (a === '--silent') args.silent = true;
    else if (['--fps', '--workers', '--stills', '--outdir', '--from', '--to', '--every', '--crf'].includes(a)) args[a.slice(2)] = argv[++i];
    else args.positional.push(a);
  }
  return args;
}

async function open(browser, pagePath) {
  const { page, problems } = await video.openPage(browser, pagePath);
  await page.setViewportSize({ width: WIDTH, height: HEIGHT });
  await page.evaluate(() => document.fonts.ready);
  // a script error part way through would silently drop every animation after it
  const errors = await page.evaluate(() => window.__errors || []);
  for (const e of errors) problems.push(`page script error: ${e}`);
  return { page, problems };
}

// One browser per worker: each renders a contiguous run of frames into its own segment.
async function renderSegment(chromium, pagePath, first, last, fps, crf, file, progress) {
  const browser = await video.launchBrowser(chromium);
  const { page } = await open(browser, pagePath);
  const cdp = await page.context().newCDPSession(page);
  const encoder = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-tune', 'animation', '-r', String(fps), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve) => encoder.on('close', resolve));
  for (let i = first; i < last; i++) {
    await video.seek(page, i / fps);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
    if (!encoder.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => encoder.stdin.once('drain', r));
    progress();
  }
  encoder.stdin.end();
  const code = await done;
  await browser.close();
  if (code !== 0) throw new Error(`ffmpeg failed on ${file}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [pagePath, outPath] = args.positional;
  if (!pagePath || (!outPath && !args.stills && !args.sheet)) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^[\s\S]*?\/\*/, '').replace(/^ \* ?/gm, ''));
    process.exit(2);
  }
  const { chromium } = video.loadPlaywright();
  const browser = await video.launchBrowser(chromium);
  const { page, problems } = await open(browser, pagePath);
  const settings = await video.readPage(page);
  settings.problems.push(...problems, ...video.checkMusic(settings));
  for (const p of settings.problems) console.warn(`Warning: ${p}`);
  const duration = settings.duration;

  if (args.stills || args.sheet) {
    const outdir = args.outdir || path.join(path.dirname(path.resolve(pagePath)), 'stills');
    fs.mkdirSync(outdir, { recursive: true });
    const every = Number(args.every || 2);
    const times = args.stills ? args.stills.split(',').map(Number) : Array.from({ length: Math.floor(duration / every) }, (_, i) => (i + 0.5) * every);
    const files = [];
    for (const t of times) {
      await video.seek(page, t);
      const file = path.join(outdir, `still_${t.toFixed(2).padStart(6, '0')}s.png`);
      await page.screenshot({ path: file });
      files.push(file);
      if (args.stills) console.log(file);
    }
    await browser.close();
    if (args.sheet) {
      // 4 columns of 480x270 thumbnails, each stamped with its time
      const list = path.join(outdir, 'sheet.txt');
      fs.writeFileSync(list, files.map((f) => `file '${f}'`).join('\n'));
      const rows = Math.ceil(files.length / 4);
      const run = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf',
        `scale=480:270,drawtext=text='%{eif\\:(n+0.5)*${every}\\:d}s':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6,tile=4x${rows}:padding=6:color=0x222222`,
        '-frames:v', '1', path.join(outdir, 'sheet.png')], { encoding: 'utf8' });
      if (run.status !== 0) console.error(run.stderr);
      for (const f of files) fs.rmSync(f);
      fs.rmSync(list);
      console.log(path.join(outdir, 'sheet.png'));
    }
    return;
  }
  await browser.close();

  const fps = Number(args.fps || 60);
  const crf = Number(args.crf || 16);
  const from = Math.round(Number(args.from || 0) * fps);
  const to = Math.round(Number(args.to || duration) * fps);
  const preview = args.from !== undefined || args.to !== undefined;
  const workers = Math.max(1, Number(args.workers || Math.max(1, os.cpus().length - 1)));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'explainer-'));
  const total = to - from;
  const per = Math.ceil(total / workers);
  let doneFrames = 0;
  const started = Date.now();
  const progress = () => {
    doneFrames++;
    if (doneFrames % fps === 0 || doneFrames === total) {
      const rate = doneFrames / ((Date.now() - started) / 1000);
      process.stderr.write(`\rframe ${doneFrames}/${total} (${rate.toFixed(1)} fps, ~${Math.round((total - doneFrames) / rate)}s left)   `);
    }
  };
  const segments = [];
  const jobs = [];
  for (let w = 0; w < workers; w++) {
    const first = from + w * per;
    const last = Math.min(to, first + per);
    if (first >= last) break;
    const file = path.join(tmp, `seg${w}.mp4`);
    segments.push(file);
    jobs.push(renderSegment(chromium, pagePath, first, last, fps, crf, file, progress));
  }
  await Promise.all(jobs);
  process.stderr.write('\n');

  const list = path.join(tmp, 'segments.txt');
  fs.writeFileSync(list, segments.map((f) => `file '${f}'`).join('\n'));
  const videoOnly = path.join(tmp, 'video.mp4');
  const cat = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', videoOnly], { encoding: 'utf8' });
  if (cat.status !== 0) throw new Error(`ffmpeg concat failed: ${cat.stderr}`);

  let audio = 'silent preview';
  if (preview || args.silent) {
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', videoOnly, '-c', 'copy', '-movflags', '+faststart', outPath]);
  } else {
    ({ audio } = video.writeSoundtrack(settings, duration, tmp, videoOnly, outPath));
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`Wrote ${outPath}: ${WIDTH}x${HEIGHT}, ${(total / fps).toFixed(2)}s at ${fps}fps, ${audio} (${Math.round((Date.now() - started) / 1000)}s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
