#!/usr/bin/env node
'use strict';
/*
 * How well a picture works as a video background, measured rather than guessed: is it sharp
 * enough at the frame's size, is it well exposed, is there a clear subject, and is there calm room
 * where the captions and the hook sit (a busy patch behind the words is what makes them hard to
 * read). media.js uses it to pick the best of several stock results; compose.js uses it to warn
 * about a picture before rendering. No dependencies beyond ffmpeg: the picture is read as a small
 * grayscale grid, cropped the way the frame crops it.
 *
 * Usage:
 *   node fit.js <picture or clip> [...] [--landscape] [--focus 50%,40%]
 *
 * The bands (as shares of the frame's height): the hook at the top, the subject in the middle, and
 * the captions low in the safe area, where narrated.html puts them.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const GRID = { portrait: [108, 192], landscape: [192, 108] };
const BANDS = {
  portrait: { hook: [0.16, 0.31], subject: [0.3, 0.6], captions: [0.6, 0.77] },
  landscape: { hook: [0.06, 0.22], subject: [0.2, 0.7], captions: [0.74, 0.95] },
};
const VIDEO = /\.(mp4|mov|webm|m4v)$/i;

function probe(file) {
  const args = ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', file];
  const r = spawnSync('ffprobe', args, { encoding: 'utf8' });
  if (r.status !== 0) return null;
  const j = JSON.parse(r.stdout);
  const st = (j.streams || [])[0] || {};
  return { w: st.width, h: st.height, duration: parseFloat((j.format || {}).duration) || 0 };
}

// The picture as a grayscale grid, scaled to fill the frame and cropped at the focus point, the
// way the renderer shows it. Returns { gw, gh, px } (px: 0..255 per cell) or null.
function grid(file, { landscape = false, focus = [0.5, 0.5], at = 0 } = {}) {
  const [gw, gh] = landscape ? GRID.landscape : GRID.portrait;
  const vf = `scale=${gw}:${gh}:force_original_aspect_ratio=increase,crop=${gw}:${gh}:(in_w-out_w)*${focus[0]}:(in_h-out_h)*${focus[1]},format=gray`;
  const r = spawnSync('ffmpeg', ['-v', 'error', ...(at ? ['-ss', String(at)] : []), '-i', file, '-frames:v', '1', '-vf', vf, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 22 });
  if (r.status !== 0 || !r.stdout || r.stdout.length < gw * gh) return null;
  return { gw, gh, px: r.stdout };
}

// Mean absolute difference between neighbouring cells in rows [y0, y1) (0..1 of the height), 0..1.
function busy(g, [y0, y1]) {
  let sum = 0;
  let n = 0;
  const r0 = Math.floor(y0 * g.gh);
  const r1 = Math.max(r0 + 1, Math.ceil(y1 * g.gh));
  for (let y = r0; y < r1 && y < g.gh - 1; y++) {
    for (let x = 0; x < g.gw - 1; x++) {
      const v = g.px[y * g.gw + x];
      sum += Math.abs(v - g.px[y * g.gw + x + 1]) + Math.abs(v - g.px[(y + 1) * g.gw + x]);
      n += 2;
    }
  }
  return n ? sum / n / 255 : 0;
}

// The measurements, a score (higher is better, about -1..1), and notes in plain words.
function analyse(file, { landscape = false, focus = [0.5, 0.5] } = {}) {
  if (!fs.existsSync(file)) return { file, error: 'not found' };
  const info = probe(file);
  if (!info || !info.w) return { file, error: 'not a picture or clip ffmpeg can read' };
  const g = grid(file, { landscape, focus, at: VIDEO.test(file) ? Math.min(1.5, info.duration / 2) : 0 });
  if (!g) return { file, error: 'could not be read' };
  const [W, H] = landscape ? [1920, 1080] : [1080, 1920];
  const upscale = Math.round(Math.max(W / info.w, H / info.h) * 100) / 100;
  const n = g.gw * g.gh;
  let sum = 0;
  let dark = 0;
  let bright = 0;
  for (const v of g.px.subarray(0, n)) {
    sum += v;
    if (v < 14) dark++;
    if (v > 245) bright++;
  }
  const bands = landscape ? BANDS.landscape : BANDS.portrait;
  const m = {
    file, width: info.w, height: info.h, upscale,
    luma: Math.round((sum / n / 255) * 100) / 100,
    clipped: Math.round(((dark + bright) / n) * 100) / 100,
    captions: Math.round(busy(g, bands.captions) * 1000) / 1000,
    hook: Math.round(busy(g, bands.hook) * 1000) / 1000,
    subject: Math.round(busy(g, bands.subject) * 1000) / 1000,
    // a 3:2 photo in a 9:16 frame loses most of its width, and with it, often the subject
    cropped: Math.round((1 - Math.min(info.w / info.h, W / H) / Math.max(info.w / info.h, W / H)) * 100) / 100,
  };
  const notes = [];
  let score = 0.6;
  if (upscale > 1.25) { score -= Math.min(0.6, (upscale - 1.25) * 0.8); notes.push(`small for the frame (${info.w}x${info.h}, shown at ${upscale}x), so it will look soft`); }
  if (m.captions > 0.06) { score -= Math.min(0.5, (m.captions - 0.06) * 6); notes.push('busy behind the captions; a calmer picture, a focus point that moves the detail up, or panel captions keep them readable'); }
  if (m.hook > 0.07) { score -= Math.min(0.25, (m.hook - 0.07) * 3); notes.push('busy behind the hook'); }
  if (m.luma < 0.16) { score -= 0.3; notes.push('very dark; details will disappear'); } else if (m.luma > 0.78) { score -= 0.25; notes.push('very bright; white text will need a heavy shade'); }
  if (m.clipped > 0.25) { score -= 0.2; notes.push('large areas clipped to pure black or white'); }
  if (m.subject < 0.015) { score -= 0.2; notes.push('little detail anywhere: no clear subject'); } else if (m.subject > m.captions * 1.2) score += 0.1; // detail where the eye goes, calm under the words
  if (m.cropped > 0.6) { score -= 0.1; notes.push(`a wide picture: the frame keeps ${Math.round((1 - m.cropped) * 100)}% of its width, so set its focus point on the subject`); }
  return { ...m, score: Math.round(score * 100) / 100, notes };
}

// The best `count` of several candidates, best first.
function rank(files, opts = {}) {
  return files.map((f) => analyse(f, opts)).filter((a) => !a.error).sort((a, b) => b.score - a.score);
}

function main() {
  const argv = process.argv.slice(2);
  const landscape = argv.includes('--landscape');
  const fi = argv.indexOf('--focus');
  const focus = fi >= 0 ? argv[fi + 1].split(',').map((v) => parseFloat(v) / (String(v).includes('%') ? 100 : 1)) : [0.5, 0.5];
  const files = argv.filter((a, i) => !a.startsWith('--') && !(fi >= 0 && i === fi + 1));
  if (!files.length || argv.includes('--help')) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^[\s\S]*?\/\*/, '').replace(/^ \* ?/gm, ''));
    process.exit(files.length ? 0 : 2);
  }
  for (const a of rank(files, { landscape, focus }).concat(files.map((f) => analyse(f, { landscape, focus })).filter((a) => a.error))) {
    if (a.error) { console.log(`${path.basename(a.file)}: ${a.error}`); continue; }
    console.log(`${path.basename(a.file)}  score ${a.score}  ${a.width}x${a.height}  brightness ${a.luma}  busy: captions ${a.captions}, hook ${a.hook}, subject ${a.subject}`);
    for (const n of a.notes) console.log(`  · ${n}`);
  }
}

if (require.main === module) main();

module.exports = { analyse, rank, grid, busy };
