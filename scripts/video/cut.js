#!/usr/bin/env node
'use strict';
/*
 * Jump cuts for a talking-head take filmed on a phone: finds the pauses (from the clip's own
 * loudness, the same way captions.js finds phrases) and cuts them out, keeping a little air
 * around each phrase, so the take moves at the pace short-form viewers expect. Optionally
 * times captions to the cut and writes a page that renders it as a finished video: the clip
 * full-frame with its own sound, word-by-word captions, the hook on screen from the first
 * frame, the project's music under it, and the brand's end card.
 *
 * Usage:
 *   node cut.js <take.mp4> [--out <cut.mp4>] [--min-pause 0.35] [--pad 0.12]
 *   node cut.js <take.mp4> --text "what's said, word for word" --page <page.html>
 *               [--hook "the line on screen from frame 0"] [--cta "follow for part 2"]
 *               [--bold] [--series "week 2"] [--brand "Your Name"]
 *               [--edit ugc|meme|fast|kinetic|cinematic|clean] [--hook-fx zoom|shake|glitch|flash|bounce|none]
 *               [--punch 10%] [--focus 50%,32%] [--broll "assets/app.mp4@invoice+2.5, assets/shot.png@6.2"]
 *
 * --min-pause: pauses at least this long are cut (shorter ones are breathing room and stay).
 * --pad: how much of each pause stays on either side of the cut, so words aren't clipped.
 * Without --out, the cut goes next to the take as <name>-cut.mp4, or into the page's assets/
 * folder with --page. --bold gives it the bold look: heavy capitals boxed in black, a few words
 * at a time, with *words* in asterisks (in --text or --hook) kept yellow; --series and --brand
 * put a tag in each top corner. The script is the person's real words: never edit them into something
 * they didn't say, and only film or post people with their permission.
 *
 * The edit (--edit, default ugc; edit.js has them all): every jump cut changes the framing, wide
 * then punched in, so the cuts read as deliberate rather than as glitches (a dynamic zoom, toward
 * --focus, the point of the frame to keep: where the face is, default 50%,32%); the camera
 * punches in on each *keyword* as it's said (--punch, or no); the hook gets a visual hook in its
 * first half second (--hook-fx); and the captions take the style's animation. --edit clean keeps
 * the take still.
 * --broll cuts away from the take to other footage while the person keeps talking (a cutaway):
 * "file@where+seconds", comma-separated, where "where" is seconds into the cut, or a word or
 * phrase from --text (the first time it's said); "+seconds" is how long (default 2). Use the
 * user's own screen recordings, product shots, or photos; the take's sound plays on under them.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const captions = require('./captions');
const { probeDuration } = require('./render');
const { sonicIdentity } = require('./compose');
const { visualIdentity, applyIdentity } = require('./brand');
const EDIT = require('./edit');

const TEMPLATE = path.join(__dirname, 'templates', 'narrated.html');
const TAIL = 1.2; // after the take ends, room for the sonic logo

function fail(message) {
  console.error(message);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--bold') args.bold = true;
    else if (['--out', '--min-pause', '--pad', '--text', '--page', '--hook', '--cta', '--series', '--brand', '--edit', '--hook-fx', '--punch', '--focus', '--broll'].includes(a)) args[a.slice(2).replace(/-(\w)/g, (m, c) => c.toUpperCase())] = argv[++i];
    else if (a === '-h' || a === '--help') args.help = true;
    else args.positional.push(a);
  }
  return args;
}

function ffmpeg(args) {
  const run = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { encoding: 'utf8' });
  if (run.status !== 0) fail(`ffmpeg failed: ${run.stderr}`);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// *words* in asterisks: kept yellow in the bold look, never part of the words timed to the voice
const plainText = (s) => s.replace(/\*([^*]+)\*/g, '$1');
const lit = (s) => esc(s).replace(/\*([^*]+)\*/g, '<b class="kw">$1</b>');
const keywords = (s) => [...new Set([...s.matchAll(/\*([^*]+)\*/g)].flatMap((m) => m[1].split(/\s+/))
  .map((w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean))];
const r2 = (t) => Math.round(t * 100) / 100;

// The stretches to keep: spoken runs, joined across pauses shorter than minPause, each padded.
function keepSegments(file, minPause, pad) {
  const db = captions.envelope(captions.decode(file));
  const length = probeDuration(file);
  const runs = captions.spokenRuns(db);
  if (!runs.length) return { length, segments: [] };
  const joined = [];
  for (const r of runs) {
    const last = joined[joined.length - 1];
    if (last && r.start - last.end < minPause) last.end = r.end;
    else joined.push({ ...r });
  }
  const segments = joined.map((r) => ({ start: Math.max(0, r.start - pad), end: Math.min(length, r.end + pad) }));
  // padding can make neighbours touch
  const merged = [];
  for (const s of segments) {
    const last = merged[merged.length - 1];
    if (last && s.start <= last.end) last.end = s.end;
    else merged.push(s);
  }
  return { length, segments: merged };
}

function writeCut(file, segments, out) {
  const parts = segments.map((s, i) =>
    `[0:v]trim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},setpts=PTS-STARTPTS[v${i}];` +
    `[0:a]atrim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st=${(s.end - s.start - 0.01).toFixed(3)}:d=0.01[a${i}]`).join(';');
  const inputs = segments.map((_, i) => `[v${i}][a${i}]`).join('');
  ffmpeg(['-i', file, '-filter_complex', `${parts};${inputs}concat=n=${segments.length}:v=1:a=1[v][a]`,
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]);
}

// The dynamic zoom on a jump-cut take: one keyframe list over the whole cut that holds each
// stretch at its own framing (wide, punched in, wide, closer), drifting in a little while it plays,
// and switches at every cut. `bounds` are the cut points in the cut's own time.
function jumpZoomCss(bounds, length, zoom) {
  const scales = [1, zoom, 1.03, zoom + 0.05];
  const pct = (t) => (Math.min(length, Math.max(0, t)) / length * 100).toFixed(3);
  const edges = [0, ...bounds, length];
  const frames = [];
  for (let j = 0; j < edges.length - 1; j++) {
    const base = scales[j % scales.length];
    frames.push(`${pct(edges[j])}% { transform: scale(${base}); }`);
    frames.push(`${pct(Math.max(edges[j], edges[j + 1] - 0.004))}% { transform: scale(${(base + 0.025).toFixed(3)}); }`);
  }
  return `<style>\n  /* the dynamic zoom on the jump cuts (cut.js): a new framing at every cut */\n  @keyframes jumpZoom {\n    ${frames.join('\n    ')}\n  }\n</style>\n`;
}

// Where a b-roll cutaway goes: "file@6.2+2" or "file@a phrase+2.5", against the timed words.
function placeBroll(spec, words, length) {
  const m = /^\s*([^@]+?)\s*@\s*(.+?)\s*(?:\+\s*([\d.]+)\s*s?)?\s*$/.exec(spec);
  if (!m) return { error: `--broll "${spec}"? Write it as file@seconds or file@word, with +seconds for how long.` };
  const [, file, where, len] = m;
  let at = /^[\d.]+s?$/.test(where) ? parseFloat(where) : null;
  if (at === null) {
    if (!words || !words.length) return { error: `--broll "${spec}" points at the word "${where}", so it needs --text` };
    const key = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    const want = where.split(/\s+/).map(key).filter(Boolean);
    const i = words.findIndex((_, k) => want.every((w, j) => words[k + j] && key(words[k + j].text) === w));
    if (i < 0) return { error: `--broll "${spec}": "${where}" isn't in --text` };
    at = words[i].start;
  }
  const dur = Math.max(0.6, parseFloat(len) || 2);
  return { file, at: r2(Math.max(0.3, at)), end: r2(Math.min(length - 0.2, Math.max(0.3, at) + dur)) };
}

// A page that plays the cut full-frame with its own sound, captions, the hook, music, and the brand,
// edited: the framing changing at every jump cut, punch-ins on the keywords, b-roll cutaways.
function writePage(page, clipSrc, length, args, { bounds = [], words = [] } = {}) {
  const html = fs.readFileSync(TEMPLATE, 'utf8');
  let head = html.slice(html.indexOf('<html>'), html.indexOf('</head>') + '</head>'.length);
  const defaults = {};
  for (const m of /<body([^>]*)>/.exec(html.slice(html.indexOf('</head>')))[1].matchAll(/data-([\w-]+)="([^"]*)"/g)) defaults[m[1]] = m[2];
  const id = sonicIdentity();
  const sound = { ...defaults };
  if (id) {
    Object.assign(sound, Object.fromEntries(Object.entries({
      music: id.music, bpm: id.bpm, key: id.key, mode: id.mode,
      energy: Number.isFinite(id.energy) ? Math.max(1, id.energy - 1) : undefined, motif: id.motif,
    }).filter(([, v]) => v !== undefined && v !== '' && !Number.isNaN(v))));
  }
  const edit = EDIT.resolveStyle({ edit: args.edit || 'ugc', 'hook-fx': args.hookFx, punch: args.punch }, sound);
  if (edit.hook === 'montage') edit.hook = 'zoom'; // one take, so no burst of other pictures
  const duration = r2(length + TAIL);
  const fx = [!args.bold && edit.captions !== 'pop' ? `cap-${edit.captions}` : '', edit.grain ? 'fx-grain' : '', edit.vignette ? 'fx-vignette' : ''].filter(Boolean).join(' ');
  const attrs = [`class="fyp${args.bold ? ' bold' : ''}${fx ? ` ${fx}` : ''}"`, `data-duration="${duration}"`, `data-drop="${Math.min(2, r2(length / 3))}"`, `data-edit="${edit.name}"`,
    ...(edit.grade && !args.bold ? [`style="--grade: ${edit.grade}"`] : []),
    ...['music', 'bpm', 'key', 'mode', 'energy', 'motif'].filter((k) => sound[k] !== undefined).map((k) => `data-${k}="${esc(String(sound[k]))}"`)].join(' ');
  // the dynamic zoom: a new framing at every jump cut (not in the clean edit)
  const zoom = edit.name === 'clean' ? 0 : Math.max(1.1, edit.punch || 1.1);
  if (zoom) head = head.replace('</head>', `${jumpZoomCss(bounds, length, zoom)}</head>`);
  const [fx0, fy0] = String(args.focus || '50%,32%').split(',').map((v) => v.trim());
  const takeKb = zoom ? `--kb:jumpZoom; --dur:${r2(length)}s` : `--kb:none; --dur:${duration}s`;
  const parts = [];
  const hookFx = { glitch: 'hk-glitch', shake: 'hk-shake', bounce: 'hk-bounce' }[edit.hook] || '';
  if (args.hook) {
    const inner = edit.hook === 'bounce'
      ? plainText(args.hook).split(/\s+/).map((w, k) => `<i style="--k:${k}">${keywords(args.hook).includes(w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')) ? `<b class="kw">${esc(w)}</b>` : esc(w)}</i>`).join(' ')
      : lit(args.hook);
    parts.push(`    <div class="cap hook${hookFx ? ` ${hookFx}` : ''}"><span>${inner}</span></div>`);
  }
  if (args.cta) parts.push(`    <div class="end"><div class="cap hl pop" style="--in:${r2(Math.max(0, length - 2.5))}s" data-sfx="chime"><span>${esc(plainText(args.cta))}</span></div></div>`);
  if (args.text) {
    const kw = keywords(args.text);
    parts.push(`    <div class="say auto" data-clip="take"${kw.length ? ` data-kw="${esc(kw.join(','))}"` : ''}>${esc(plainText(args.text).trim())}</div>`);
  }
  const corners = [['brand', args.brand], ['series', args.series]].filter(([, v]) => v)
    .map(([k, v]) => `\n  <div class="corner ${k}" style="--out:${r2(length)}s">${esc(v)}</div>`).join('');
  // b-roll cutaways over the take, its sound playing on under them
  const brolls = [];
  const notes = [];
  for (const spec of String(args.broll || '').split(',').map((x) => x.trim()).filter(Boolean)) {
    const b = placeBroll(spec, words, length);
    if (b.error) { notes.push(b.error); continue; }
    if (b.end - b.at < 0.5) { notes.push(`--broll "${spec}" lands too close to the end of the take`); continue; }
    brolls.push(b);
  }
  brolls.sort((a, b) => a.at - b.at);
  const cutList = edit.cuts.filter((c) => EDIT.TRANSITIONS[c].covers || c === 'fade');
  const brollHtml = brolls.map((b, k) => {
    const prev = brolls[k - 1];
    if (prev && b.at < prev.end) b.at = prev.end;
    const tr = cutList[k % cutList.length] || 'cut';
    const src = path.relative(path.dirname(page), path.resolve(path.dirname(page), b.file)).split(path.sep).join('/');
    if (!fs.existsSync(path.resolve(path.dirname(page), b.file))) notes.push(`--broll: ${b.file} not found next to the page; put it in assets/`);
    const media = /\.(mp4|mov|webm|m4v)$/i.test(b.file) ? `<video class="bg-media" src="${esc(src)}" data-loop="false"></video>` : `<img class="bg-media" src="${esc(src)}" alt="">`;
    const move = edit.moves[k % edit.moves.length];
    b.tr = tr;
    return `  <!-- b-roll, ${b.at}–${b.end}s (${tr}), the take's sound under it -->\n  <div class="bg${tr === 'fade' ? '' : ` ${EDIT.transitionClass(tr)}`}" style="--in:${b.at}s; --out:${b.end}s; --dur:${r2(b.end - b.at + 0.5)}s; --kb:${move}; --shade:.2">${media}</div>`;
  }).join('\n');
  const cues = [];
  if (edit.cutSfx) for (const b of brolls) if (EDIT.TRANSITIONS[b.tr].sfx) cues.push(`  <i class="cue" hidden style="--in:${b.at}s" data-sfx="${EDIT.TRANSITIONS[b.tr].sfx}"></i>`);
  const hookSfx = { shake: 'impact', glitch: 'glitch', flash: 'impact' }[edit.hook];
  if (hookSfx) cues.push(`  <i class="cue" hidden style="--in:${edit.hook === 'shake' ? 0.04 : 0.08}s" data-sfx="${hookSfx}"></i>`);
  const overlays = [...brolls.map((b) => EDIT.overlayAt(b.tr, b.at)).filter(Boolean), ...(edit.hook === 'flash' ? ['  <div class="flash" style="--in:.08s" data-lint="off"></div>'] : [])];
  const camAnim = EDIT.cameraAnimation({ hook: edit.hook, drawn: true });
  const camOpen = `  <div class="cam" data-lint="off"${edit.punch ? ` data-punch="${edit.punch}"${edit.punchFx ? ` data-punch-fx="${edit.punchFx}"` : ''}` : ''} style="${edit.punch ? `--punch:${edit.punch}; ` : ''}--cam-x:${esc(fx0)}; --cam-y:${esc(fy0 || '32%')}${camAnim ? `; animation: ${camAnim}` : ''}">`;
  const doc = `<!doctype html>
<!--
  A filmed take, written by scripts/video/cut.js: the jump-cut clip full-frame with its own
  sound (data-audio), captions timed to it (data-clip), and the hook from the first frame,
  edited in the ${edit.name} style (scripts/video/edit.js).
  Page conventions: see the comment at the top of templates/promo.html.
-->
${head}
<body ${attrs}>
${camOpen}
  <div class="glow g1"></div>
  <div class="glow g2"></div>
  <!-- the take, the whole video long; a light scrim so the captions read without hiding faces -->
  <div class="bg now" style="--in:0s; ${takeKb}; --shade:.12"><video class="bg-media" id="take" src="${esc(clipSrc)}" data-audio data-loop="false" style="transform-origin: ${esc(fx0)} ${esc(fy0 || '32%')}"></video></div>
${brollHtml ? `${brollHtml}\n` : ''}  </div>
${overlays.length ? `${overlays.join('\n')}\n` : ''}${cues.length ? `${cues.join('\n')}\n` : ''}${corners}

  <div class="scene narr center">
${parts.join('\n')}
  </div>
</body>
</html>
`;
  const look = visualIdentity();
  const branded = look ? applyIdentity(doc, look, { pageDir: path.dirname(page) }) : { html: doc, changes: [], problems: [] };
  fs.writeFileSync(page, branded.html);
  return { duration, sound, identity: !!id, look: branded, edit, brolls, notes, zoom };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const take = args.positional[0];
  if (args.help || !take) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^[\s\S]*?\/\*/, '').replace(/^ \* ?/gm, ''));
    process.exit(args.help ? 0 : 2);
  }
  if (!fs.existsSync(take)) fail(`No clip at ${take}`);
  if (!/audio/.test(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', take], { encoding: 'utf8' }).stdout)) {
    fail(`${take} has no sound track, so there are no pauses to find.`);
  }
  const minPause = Number(args.minPause || 0.35);
  const pad = Number(args.pad || 0.12);
  const page = args.page ? path.resolve(args.page) : null;
  const out = path.resolve(args.out || (page
    ? path.join(path.dirname(page), 'assets', `${path.basename(take).replace(/\.[^.]+$/, '')}-cut.mp4`)
    : take.replace(/(\.[^./]+)?$/, '-cut.mp4')));
  fs.mkdirSync(path.dirname(out), { recursive: true });

  const { length, segments } = keepSegments(take, minPause, pad);
  if (!segments.length) fail(`No speech found in ${take}.`);
  writeCut(take, segments, out);
  const cutLength = probeDuration(out);
  console.log(`Wrote ${out}: ${length.toFixed(2)}s -> ${cutLength.toFixed(2)}s, ${segments.length} stretch${segments.length === 1 ? '' : 'es'} kept (${segments.length - 1} cut${segments.length === 2 ? '' : 's'})`);
  for (const s of segments) console.log(`  kept ${s.start.toFixed(2)}–${s.end.toFixed(2)}s`);

  let words = [];
  if (args.text) {
    const timing = await captions.alignWords(out, plainText(args.text), { shift: 0 });
    for (const n of timing.notes) console.warn(`Note: ${n}`);
    words = timing.words;
    const chunks = captions.chunkWords(timing.words);
    console.log(`Captions (timed by ${timing.method}):`);
    for (const c of chunks) console.log(`  ${c.start.toFixed(2)}s  ${c.words.map((w) => w.text).join(' ')}`);
  }
  if (page) {
    const src = path.relative(path.dirname(page), out).split(path.sep).join('/');
    // where the jump cuts fall in the cut itself
    const bounds = [];
    let acc = 0;
    for (const sg of segments.slice(0, -1)) bounds.push(r2((acc += sg.end - sg.start)));
    let written;
    try {
      written = writePage(page, src, cutLength, args, { bounds, words });
    } catch (e) {
      fail(e.message);
    }
    const { duration, sound, identity, look, edit, brolls, notes, zoom } = written;
    console.log(`Wrote ${page}: ${duration}s`);
    console.log(`  edit: ${edit.name}: ${zoom ? `a new framing at each of the ${bounds.length} jump cut${bounds.length === 1 ? '' : 's'} (up to ${Math.round((zoom + 0.05 - 1) * 100)}%), ` : ''}punch-ins on *keywords* ${edit.punch ? `${Math.round((edit.punch - 1) * 100)}%` : 'off'}, hook: ${edit.hook}`);
    for (const b of brolls) console.log(`  b-roll ${b.file} ${b.at}–${b.end}s (${b.tr})`);
    for (const n of notes) console.warn(`Note: ${n}`);
    console.log(`  sound: the take's own voice over ${sound.music}${identity ? ' (the Sonic Identity, one energy step lower)' : ' (the template default)'}`);
    console.log(`  look: ${look.changes.length ? look.changes.join('; ') : 'the template default; no Visual Identity saved yet'}`);
    for (const p of look.problems) console.warn(`Note: ${p}`);
    if (!args.text) console.warn('Note: no --text, so no captions. Most people watch muted: pass what\'s said, word for word.');
    if (!args.hook) console.warn('Note: no --hook, so the first frame has no text. Add one to stop the scroll.');
    const check = spawnSync(process.execPath, [path.join(__dirname, 'render.js'), page, '--check'], { stdio: 'inherit' });
    if (check.status !== 0) console.warn('Fix what --check lists, then run cut.js again.');
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { keepSegments, jumpZoomCss, placeBroll };
