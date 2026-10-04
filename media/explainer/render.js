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
 *   node render.js explainer.html --check [--min-text 40]                   # any visible text under 40px, over the whole timeline
 *   node render.js --voice-lengths assets                                    # LINES for the page, from assets/voice-1.m4a ... voice-N.m4a
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
    else if (a === '--check') args.check = true;
    else if (a === '--voice-lengths') args.voiceLengths = argv[++i];
    else if (a === '--silent') args.silent = true;
    else if (['--fps', '--workers', '--stills', '--outdir', '--from', '--to', '--every', '--crf', '--min-text'].includes(a)) args[a.slice(2)] = argv[++i];
    else args.positional.push(a);
  }
  return args;
}

// Visible text smaller than `min` px: on a phone a 1920px-wide video shows at about a fifth of
// its size, so small type stops being readable at all.
async function smallText(page, t, min) {
  return page.evaluate(([time, minPx]) => {
    const found = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      let o = 1;
      for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden') { o = 0; break; }
        o *= parseFloat(cs.opacity);
      }
      if (o < 0.5) continue;
      const r = el.getBoundingClientRect();
      if (r.right < 0 || r.left > 1920 || r.bottom < 0 || r.top > 1080) continue;
      // scaled-down ancestors shrink text too
      const size = parseFloat(getComputedStyle(el).fontSize) * (r.height ? Math.min(1, r.height / el.offsetHeight || 1) : 1);
      if (size < minPx - 0.5) found.push({ t: time, size: Math.round(size), text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) });
    }
    return found;
  }, [t, min]);
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

// How long each recorded line actually speaks: from the first sound to the last, ignoring the
// silence a phone recording starts and ends with. The page's LINES takes these numbers.
function voiceLengths(dir) {
  const files = fs.readdirSync(dir).filter((f) => /^voice-\d+\.\w+$/.test(f)).sort((a, b) => parseInt(a.slice(6), 10) - parseInt(b.slice(6), 10));
  if (!files.length) throw new Error(`no voice-1.m4a, voice-2.m4a, ... in ${dir}`);
  const lengths = files.map((f) => {
    const file = path.join(dir, f);
    const run = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'highpass=f=80,silencedetect=n=-45dB:d=0.25', '-f', 'null', '-'], { encoding: 'utf8' });
    const total = parseFloat(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout);
    const starts = [...run.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
    const ends = [...run.stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
    const begin = starts[0] !== undefined && starts[0] < 0.05 && ends[0] !== undefined ? ends[0] : 0;
    // trailing silence: the last one, if it runs to the end of the file (ffmpeg closes it at EOF)
    const lastStart = starts[starts.length - 1];
    const lastEnd = ends[starts.length - 1];
    const last = lastStart !== undefined && lastStart > begin && (lastEnd === undefined || lastEnd >= total - 0.1) ? lastStart : total;
    console.log(`${f}: ${total.toFixed(2)}s file, speech ${begin.toFixed(2)}-${last.toFixed(2)}s`);
    return +(last - begin).toFixed(2);
  });
  console.log(`const LINES = [${lengths.join(', ')}];`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.voiceLengths) return voiceLengths(args.voiceLengths);
  const [pagePath, outPath] = args.positional;
  if (!pagePath || (!outPath && !args.stills && !args.sheet && !args.check)) {
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
  for (const p of video.checkMix(settings, duration)) console.warn(`Warning: ${p}`);

  if (args.check) {
    const min = Number(args['min-text'] || 40);
    const seen = new Map();
    for (let t = 0; t < duration; t += 0.25) {
      await video.seek(page, t);
      for (const f of await smallText(page, t, min)) if (!seen.has(f.text)) seen.set(f.text, f);
    }
    await browser.close();
    for (const f of seen.values()) console.warn(`Small text: ${f.t.toFixed(2)}s "${f.text}" at ${f.size}px`);
    console.log(seen.size ? `${seen.size} text element(s) under ${min}px` : `No visible text under ${min}px`);
    process.exit(seen.size ? 1 : 0);
  }

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
