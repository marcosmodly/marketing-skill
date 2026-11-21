#!/usr/bin/env node
'use strict';
/*
 * Graphics over the picture: lower thirds, callouts, motion graphics, kinetic type, and HUD
 * elements, each one line of plain words. cut.js (--gfx), compose.js ([gfx: ...] on a line), and
 * montage.js ([gfx: ...] on a shot) all read the same lines through this file, and the CSS for
 * every graphic is in each page (templates/build.py, the "graphics" block). It animates like
 * everything else on a page, so render.js seeks it frame by frame.
 *
 * One graphic:  <kind> [what] [x%,y%] ["text" ...] @<when> [+seconds] [key=value ...]
 *
 *   lower "Maya Lopez" "Founder, Juniper" @0.5 +4      a lower third: name and title, near the
 *        bottom of the picture and above the captions (style=bar|box|line|tech, side=right)
 *   arrow 62%,40% "the new button" @button +2.5          an arrow drawn in to that point of the
 *        frame, with a label at its tail (from=ul|ur|dl|dr: where the tail is; default toward the middle)
 *   circle 62%,40% "this one" @3.2                       a ring drawn around the point (r=130 px)
 *   box 10%,30%,80%,12% "before" @2                      a rectangle drawn around a region (x,y,w,h)
 *   highlight 10%,42%,80%,6% @2                          a marker swipe over a region (yellow)
 *   spot 50%,35% "her reaction" @4 r=240                 everything but a circle dims (a spotlight)
 *   pin 62%,40% "solid oak" @1                           a dot on the point with a label
 *   icon check 78%,30% @done                             an icon popping in on a badge, with a burst:
 *        check, cross, plus, minus, star, heart, bolt, play, clock, up, down, chat, search, bell,
 *        lock, or any emoji or character ("icon 🔥 ...", "icon $ ...")
 *   shapes burst 50%,40% @2                              an accent: burst, rings, lines (speed lines
 *        across the frame), dots, or confetti
 *   text "10x *faster*" @faster anim=slam                kinetic type: big words animated in, in
 *        sync with the video (anim=pop|slam|type|rise|wave|stretch|glitch|count; size=s|m|l|xl;
 *        style=plain|box|outline; x%,y% moves its center). *words* take the accent. count counts a
 *        number up ("text "$12,400" anim=count"); show the user's real numbers only.
 *   hud lock 50%,32% "TARGET ACQUIRED" @0               a targeting reticle locking on, with a readout
 *   hud frame "REC" @0 +6                                a HUD frame around the picture: corners, a
 *        blinking REC dot and label, a ruler, one scan line
 *   hud data "Weekly users" "1,920" "Churn" "2%" @3      a data panel: label/value pairs, numbers
 *        counting up, a percentage as a filling bar (an odd first text is the panel's title)
 *   hud scan 20%,20%,60%,40% "SCANNING" @1              a scan line sweeping a region (default the frame)
 *
 * @when is seconds (into the take for cut.js, into the line or shot for compose.js and
 * montage.js) or a word or "a phrase" that's said: the graphic comes in as it's first said
 * (cut.js times it from --text; compose.js and montage.js leave it to render.js, which times it
 * once the captions are); a number that's said goes in quotes (@"14"), since @14 is seconds.
 * +seconds is how long it stays (each kind has a default). x%,y% is a
 * point of the whole frame (0,0 top left); a region is x%,y%,w%,h%. color=yellow|white|red|
 * green|blue|cyan|black|#hex sets its color (default the accent); sfx=<sound> gives it a sound
 * (kinetic type, icons, and accents have one of their own when the edit wants sounds; sfx=none
 * turns it off). Text in "double quotes".
 *
 *   node graphics.js check 'arrow 62%,40% "the new button" @2'   # parse and describe one line
 */
const { SOUNDS } = require('./soundtrack');

const KINDS = {
  lower: { dur: 4, sfx: '', usage: 'lower "Name" "Title" @2 +4 [style=bar|box|line|tech] [side=right]' },
  arrow: { dur: 2.5, sfx: '', pos: 'point', usage: 'arrow 62%,40% "label" @2 +2.5 [from=ul|ur|dl|dr]' },
  circle: { dur: 2.5, sfx: '', pos: 'point', usage: 'circle 62%,40% "label" @2 [r=130]' },
  box: { dur: 2.5, sfx: '', pos: 'rect', usage: 'box 20%,30%,60%,15% "label" @2' },
  highlight: { dur: 2.5, sfx: '', pos: 'rect', usage: 'highlight 10%,42%,80%,6% @2' },
  spot: { dur: 2.5, sfx: '', pos: 'point', usage: 'spot 50%,35% "label" @2 [r=220]' },
  pin: { dur: 2.5, sfx: '', pos: 'point', usage: 'pin 62%,40% "label" @2' },
  icon: { dur: 1.6, sfx: 'pop', usage: 'icon check 75%,30% @2 [size=170] [style=badge|plain]' },
  shapes: { dur: 1.2, usage: 'shapes burst 50%,40% @2 (burst, rings, lines, dots, confetti)' },
  text: { dur: 2, usage: 'text "10x *faster*" @2 [anim=pop|slam|type|rise|wave|stretch|glitch|count] [size=s|m|l|xl] [style=plain|box|outline]' },
  hud: { dur: 3, usage: 'hud lock 50%,32% "LABEL" @2 | hud frame "REC" @0 | hud data "Label" "Value" ... @2 | hud scan [x%,y%,w%,h%] "SCANNING" @2' },
};
const ALIASES = {
  'lower-third': 'lower', lowerthird: 'lower', l3: 'lower', title: 'text', kinetic: 'text', label: 'pin', callout: 'pin',
  ring: 'circle', rect: 'box', spotlight: 'spot', marker: 'highlight', shape: 'shapes',
};
const SHAPES = { burst: 'pop', rings: 'ping', lines: 'whoosh', dots: 'tick', confetti: 'pop' };
const ANIMS = { pop: 'pop', slam: 'impact', type: 'typing', rise: 'whoosh', wave: 'swish', stretch: 'whoosh', glitch: 'glitch', count: 'tick' };
const HUD = {
  lock: { dur: 2.5, sfx: '', pos: 'point' },
  frame: { dur: 4, sfx: '' },
  data: { dur: 3.5, sfx: '' },
  scan: { dur: 2, sfx: '' },
};
const LOWER_STYLES = ['bar', 'box', 'line', 'tech'];
const SIZES = { s: 1, m: 1, l: 1, xl: 1 };
const TEXT_STYLES = ['plain', 'box', 'outline'];
const COLORS = { accent: 'var(--accent)', white: '#ffffff', yellow: '#ffd84d', red: '#ff4d4d', green: '#3fdc85', blue: '#4da3ff', cyan: '#4df3ff', black: '#121212' };

// Line icons on a 48-unit grid, drawn as one stroke (the star is worked out below).
const star = (() => {
  const pts = [];
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + k * Math.PI / 5;
    const r = k % 2 ? 7 : 16;
    pts.push(`${(24 + r * Math.cos(a)).toFixed(1)} ${(25 + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
})();
const ICONS = {
  check: 'M12 25 L21 34 L37 15',
  cross: 'M15 15 L33 33 M33 15 L15 33',
  plus: 'M24 12 V36 M12 24 H36',
  minus: 'M12 24 H36',
  star,
  heart: 'M24 37 C10 28 8 16 16 13 C20 11.5 23 14 24 17 C25 14 28 11.5 32 13 C40 16 38 28 24 37 Z',
  bolt: 'M27 8 L14 27 H24 L21 40 L34 21 H24 Z',
  play: 'M18 13 L36 24 L18 35 Z',
  clock: 'M24 10 A14 14 0 1 1 23.99 10 Z M24 16 V24 L30 28',
  up: 'M10 33 L20 23 L26 29 L38 17 M30 17 H38 V25',
  down: 'M10 17 L20 27 L26 21 L38 33 M30 33 H38 V25',
  chat: 'M13 13 H35 Q38 13 38 16 V28 Q38 31 35 31 H22 L15 37 V31 H13 Q10 31 10 28 V16 Q10 13 13 13 Z',
  search: 'M21 11 A10 10 0 1 1 20.99 11 Z M28.5 28.5 L37 37',
  bell: 'M14 32 C16 29 16 26 16 22 C16 17 19.5 13.5 24 13.5 C28.5 13.5 32 17 32 22 C32 26 32 29 34 32 Z M21 36 H27',
  lock: 'M15 22 H33 V37 H15 Z M18 22 V17 A6 6 0 0 1 30 17 V22',
};

// The defaults that follow the edit and the look: how kinetic type comes in, and how a lower third is set.
const TEXT_ANIM_FOR_EDIT = { ugc: 'pop', fast: 'slam', meme: 'slam', kinetic: 'rise', cinematic: 'rise', clean: 'rise' };
const LOWER_FOR_LOOK = { tech: 'tech', cinematic: 'line', luxury: 'line', editorial: 'line', minimal: 'line', suspense: 'line', documentary: 'box', corporate: 'box' };
function defaultsFor({ edit, look } = {}) {
  return { textAnim: TEXT_ANIM_FOR_EDIT[edit] || 'pop', lowerStyle: LOWER_FOR_LOOK[look] || 'bar' };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// *words* in asterisks take the graphic's color
const lit = (s) => esc(s).replace(/\*([^*]+)\*/g, '<span class="gx-hi">$1</span>');
const plain = (s) => String(s).replace(/\*([^*]+)\*/g, '$1');
const r2 = (t) => Math.round(t * 100) / 100;
const px = (v) => `${Math.round(v)}px`;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Splits a line into words and "quoted text", with @ kept apart so @"a phrase" and @word both work.
const QUOTES = { '"': '"', '“': '”', '”': '”' };
function tokenize(spec) {
  const s = String(spec);
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    if (/\s/.test(s[i])) { i++; continue; }
    if (s[i] === '@') { tokens.push({ at: true }); i++; continue; }
    const close = QUOTES[s[i]];
    if (close) {
      const end = s.indexOf(close, i + 1);
      if (end < 0) return { error: `a quote opened with ${s[i]} isn't closed` };
      tokens.push({ q: true, v: s.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    let j = i;
    while (j < s.length && !/\s/.test(s[j]) && !(j > i && QUOTES[s[j]] && s[j - 1] !== '=')) j++;
    // key="a value with spaces"
    if (s[j - 1] === '=' && QUOTES[s[j]]) {
      const end = s.indexOf(QUOTES[s[j]], j + 1);
      if (end < 0) return { error: 'a quote isn\'t closed' };
      tokens.push({ v: s.slice(i, j) + s.slice(j + 1, end) });
      i = end + 1;
      continue;
    }
    tokens.push({ v: s.slice(i, j) });
    i = j;
  }
  return { tokens };
}

const POS = /^(-?\d+(?:\.\d+)?)%?,(-?\d+(?:\.\d+)?)%?(?:,(\d+(?:\.\d+)?)%?,(\d+(?:\.\d+)?)%?)?$/;
const isOption = (v) => /^[a-z][\w-]*=/i.test(v);
const isSpecial = (t) => t.at || t.q || POS.test(t.v) || /^\+\d/.test(t.v) || isOption(t.v);

// One line -> { kind, variant, texts, pos, at | word, dur, opts } or { error }.
function parse(spec) {
  const fail = (msg, kind) => ({ error: `gfx "${String(spec).trim()}": ${msg}${kind && KINDS[kind] ? ` Write it as: ${KINDS[kind].usage}` : ''}` });
  const { tokens, error } = tokenize(spec);
  if (error) return fail(error);
  if (!tokens.length) return fail('it\'s empty.');
  if (tokens[0].q || tokens[0].at) return fail(`start with what it is (${Object.keys(KINDS).join(', ')}).`);
  const name = tokens[0].v.toLowerCase();
  const kind = ALIASES[name] || name;
  if (!KINDS[kind]) return fail(`"${tokens[0].v}"? The graphics are ${Object.keys(KINDS).join(', ')}.`);
  const g = { spec: String(spec).trim(), kind, variant: null, texts: [], pos: null, at: null, word: null, dur: null, opts: {} };
  let i = 1;
  if (['icon', 'shapes', 'hud'].includes(kind) && tokens[i] && !isSpecial(tokens[i])) g.variant = tokens[i++].v;
  for (; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.at) {
      const w = tokens[++i];
      if (!w || w.at) return fail('@ needs a time in seconds or a word that\'s said.', kind);
      if (!w.q && /^\d+(\.\d+)?s?$/.test(w.v)) g.at = parseFloat(w.v);
      else g.word = w.v;
      continue;
    }
    if (t.q) { g.texts.push(t.v); continue; }
    let m;
    if ((m = /^\+(\d+(?:\.\d+)?)s?$/.exec(t.v))) { g.dur = parseFloat(m[1]); continue; }
    if ((m = POS.exec(t.v))) { g.pos = m.slice(1).filter((v) => v !== undefined).map(Number); continue; }
    if ((m = /^([a-z][\w-]*)=(.*)$/i.exec(t.v))) { g.opts[m[1].toLowerCase()] = m[2]; continue; }
    return fail(`"${t.v}"? Put text in "double quotes", a point as x%,y%, the time as @seconds or @word, and how long as +seconds.`, kind);
  }
  // what each kind needs
  if (kind === 'icon') {
    if (!g.variant) return fail('which icon?', kind);
    if (/^[a-z]+$/i.test(g.variant) && !ICONS[g.variant.toLowerCase()]) return fail(`no "${g.variant}" icon; the icons are ${Object.keys(ICONS).join(', ')}, or use an emoji.`);
    if (ICONS[g.variant.toLowerCase()]) g.variant = g.variant.toLowerCase();
  }
  if (kind === 'shapes') {
    g.variant = (g.variant || 'burst').toLowerCase();
    if (!SHAPES[g.variant]) return fail(`"${g.variant}"? The shapes are ${Object.keys(SHAPES).join(', ')}.`, kind);
  }
  if (kind === 'hud') {
    g.variant = (g.variant || '').toLowerCase();
    if (!HUD[g.variant]) return fail(`hud what? lock, frame, data, or scan.`, kind);
  }
  const need = kind === 'hud' ? HUD[g.variant].pos : KINDS[kind].pos;
  if (need === 'point' && (!g.pos || g.pos.length !== 2)) return fail('it needs the point it\'s about, as x%,y% of the frame.', kind);
  if (need === 'rect' && (!g.pos || g.pos.length !== 4)) return fail('it needs the region, as x%,y%,w%,h% of the frame.', kind);
  if (g.pos && g.pos.some((v) => v < 0 || v > 100)) return fail('a point or region is in percent of the frame, 0 to 100.', kind);
  if (g.pos && g.pos.length === 4 && (g.pos[2] <= 0 || g.pos[3] <= 0)) return fail('a region needs a width and a height.', kind);
  if (kind === 'hud' && g.variant === 'scan' && g.pos && g.pos.length !== 4) return fail('a scan region is x%,y%,w%,h%.', kind);
  if ((kind === 'lower' || kind === 'text' || kind === 'pin') && !g.texts[0]) return fail('it needs its text in "double quotes".', kind);
  if (kind === 'hud' && g.variant === 'data' && g.texts.length < 2) return fail('a data panel needs at least one "label" "value" pair.', kind);
  if (kind === 'lower' && g.opts.style && !LOWER_STYLES.includes(g.opts.style)) return fail(`style=${g.opts.style}? Use ${LOWER_STYLES.join(', ')}.`);
  if (kind === 'text') {
    if (g.opts.anim && !ANIMS[g.opts.anim]) return fail(`anim=${g.opts.anim}? Use ${Object.keys(ANIMS).join(', ')}.`);
    if (g.opts.size && !SIZES[g.opts.size]) return fail(`size=${g.opts.size}? Use s, m, l, or xl.`);
    if (g.opts.style && !TEXT_STYLES.includes(g.opts.style)) return fail(`style=${g.opts.style}? Use ${TEXT_STYLES.join(', ')}.`);
    if (g.opts.anim === 'count' && !countable(g.texts[0])) return fail('anim=count needs a whole number to count up to ("$12,400", "312%").');
  }
  if (g.opts.from && !['ul', 'ur', 'dl', 'dr'].includes(g.opts.from)) return fail('from= is where the arrow\'s tail is: ul, ur, dl, or dr.', kind);
  if (g.opts.color && !COLORS[g.opts.color.toLowerCase()] && !/^#[0-9a-f]{3,8}$/i.test(g.opts.color)) return fail(`color=${g.opts.color}? Use ${Object.keys(COLORS).join(', ')}, or a #hex.`);
  if (g.opts.sfx && g.opts.sfx !== 'none' && !SOUNDS.includes(g.opts.sfx)) return fail(`sfx=${g.opts.sfx}? The sounds are ${SOUNDS.join(', ')}, or none.`);
  if (g.opts.r !== undefined && !(parseFloat(g.opts.r) > 0)) return fail('r= is a radius in pixels.');
  // text sizes are s, m, l, or xl (checked above); everything else's size is in pixels
  if (g.opts.size !== undefined && kind !== 'text' && !(parseFloat(g.opts.size) > 0)) return fail('size= is a size in pixels.');
  if (g.dur === null) g.dur = kind === 'hud' ? HUD[g.variant].dur : KINDS[kind].dur;
  if (g.dur < 0.4) return fail('+seconds is how long it stays; give it at least 0.4.');
  return g;
}

// The first time a word or phrase is said at or after `from` (seconds), in words [{ text, start }].
const wordKey = (w) => String(w).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
function findWord(words, phrase, from = -Infinity) {
  const want = String(phrase).split(/\s+/).map(wordKey).filter(Boolean);
  if (!want.length || !words) return null;
  for (let k = 0; k < words.length; k++) {
    if (words[k].start < from - 0.05) continue;
    if (want.every((w, j) => words[k + j] && wordKey(words[k + j].text) === w)) return words[k].start;
  }
  return null;
}

// When it shows: base + @seconds, or the word's time (from `words`, or later by render.js when
// there are none yet: anchor). Returns the graphic with in/out, or { error }.
function place(g, { base = 0, words = null, end = Infinity } = {}) {
  let start = base + (g.at || 0);
  let anchor = false;
  if (g.word) {
    if (words) {
      const t = findWord(words, g.word, base);
      if (t === null) return { error: `gfx "${g.spec}": "${g.word}" isn't said${base > 0 ? ` after ${r2(base)}s` : ''}.` };
      start = t;
    } else {
      anchor = true;
      start = base;
    }
  }
  if (start >= end - 0.2) return { error: `gfx "${g.spec}" starts at ${r2(start)}s, after the video ends (${r2(end)}s).` };
  return { ...g, in: r2(Math.max(0, start)), out: r2(Math.min(end - 0.05, start + g.dur)), anchor };
}

// ---------------------------------------------------------------- markup

function countable(v) {
  const m = /^([^\d-]*?)(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?([^\d]*)$/.exec(String(v || '').trim());
  if (!m || m[3]) return null;
  const n = parseInt(m[2].replace(/,/g, ''), 10);
  return n > 0 && n <= 1e9 ? { pre: m[1], digits: m[2], n, suf: m[4] } : null;
}
// A number counting up from 0 (the comma'd figure lands when it's done); d: its delay after --in.
function countHtml(v, d = 0) {
  const c = countable(v);
  if (!c) return esc(v);
  return `${c.pre ? `<span class="gx-pre">${esc(c.pre)}</span>` : ''}<span class="gx-num" style="--d:${d}s; --to:${c.n}"><span class="count"></span>`
    + `<span class="gx-final">${esc(c.digits)}</span></span>${c.suf ? `<span class="gx-suf">${esc(c.suf)}</span>` : ''}`;
}

// Kinetic type's words: *highlighted* ones flagged, with the punctuation right before or after a
// highlight kept on its word ("(*fit*)." is one word, "(fit).", with only "fit" highlighted).
function wordsOf(text) {
  const out = [];
  for (const m of String(text).matchAll(/([^\s*]*)\*([^*]+)\*([^\s*]*)|[^\s*]+/g)) {
    if (m[2] === undefined) { out.push({ w: m[0], hi: false, head: '', tail: '' }); continue; }
    const ws = m[2].trim().split(/\s+/);
    ws.forEach((w, i) => out.push({ w, hi: true, head: i === 0 ? m[1] : '', tail: i === ws.length - 1 ? m[3] : '' }));
  }
  return out;
}

function arrowHtml(g, x, y, F) {
  // the tail goes toward the middle of the frame, above the point unless the point is high up
  const dir = g.opts.from || `${y < F.H * 0.3 ? 'd' : 'u'}${x > F.W * 0.5 ? 'l' : 'r'}`;
  const tx = dir[1] === 'r' ? 260 : -260;
  const ty = dir[0] === 'u' ? -174 : 174;
  const svg = `<svg class="a-${dir}" width="300" height="240" viewBox="0 0 300 240" style="left:-26px; top:-200px">`
    + '<path class="gx-draw" pathLength="1" d="M286 26 C170 18 40 70 26 200"/><polyline class="gx-draw gx-head" pathLength="1" points="56,165 26,200 4,160"/></svg>';
  // the label beside the tail, on the side away from the point
  const flip = dir[1] === 'l';
  const tag = g.texts[0] ? `<span class="gx-tag gx-side${flip ? ' gx-flip' : ''}" style="left:${tx + (flip ? -16 : 16)}px; top:${ty}px">${lit(g.texts[0])}</span>` : '';
  return svg + tag;
}

// A ring drawn by hand: a little more than one turn, its radius drifting, so it reads as marked up.
function circleHtml(g, x, y, F) {
  const r = clamp(parseFloat(g.opts.r) || 130, 40, 600);
  const rx = r * 1.08;
  const ry = r * 0.94;
  const pad = 24;
  const w = 2 * rx * 1.05 + 2 * pad;
  const h = 2 * ry * 1.05 + 2 * pad;
  const pts = [];
  for (let k = 0; k <= 80; k++) {
    const t = k / 80;
    const a = -2 + t * Math.PI * 2 * 1.15;
    const f = 1.05 - 0.1 * t;
    pts.push(`${(w / 2 + rx * f * Math.cos(a)).toFixed(1)} ${(h / 2 + ry * f * Math.sin(a)).toFixed(1)}`);
  }
  const svg = `<svg width="${Math.round(w)}" height="${Math.round(h)}" style="left:${px(-w / 2)}; top:${px(-h / 2)}"><path class="gx-draw" pathLength="1" d="M${pts.join(' L')}"/></svg>`;
  const flip = x > F.W * 0.55;
  const off = Math.round(rx * 1.05 + 26);
  const tag = g.texts[0] ? `<span class="gx-tag gx-side${flip ? ' gx-flip' : ''}" style="left:${flip ? -off : off}px; top:0">${lit(g.texts[0])}</span>` : '';
  return svg + tag;
}

function raysHtml(r1, r2, n = 10, at = 0) {
  const size = 2 * r2 + 20;
  const c = size / 2;
  const lines = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 - Math.PI / 2;
    lines.push(`<line pathLength="1" x1="${(c + r1 * Math.cos(a)).toFixed(1)}" y1="${(c + r1 * Math.sin(a)).toFixed(1)}" x2="${(c + r2 * Math.cos(a)).toFixed(1)}" y2="${(c + r2 * Math.sin(a)).toFixed(1)}"/>`);
  }
  return `<svg class="gx-rays" width="${size}" height="${size}" style="left:${px(-c)}; top:${px(-c)}; --ray-at:${at}s" data-lint="off">${lines.join('')}</svg>`;
}

function iconHtml(g) {
  const S = clamp(parseFloat(g.opts.size) || 170, 60, 600);
  const path = ICONS[g.variant];
  const inner = path
    ? `<svg viewBox="0 0 48 48"><path class="gx-draw" pathLength="1" d="${path}"/></svg>`
    : `<span class="gx-glyph" style="font-size:${Math.round(S * 0.52)}px">${esc(g.variant)}</span>`;
  return `<div class="gx-badge" style="width:${S}px; height:${S}px; left:${px(-S / 2)}; top:${px(-S / 2)}">${inner}</div>${raysHtml(S / 2 + 18, S / 2 + 74, 10, 0.12)}`;
}

// Same every render: a little hash for the confetti's scatter.
const rand = (k, salt) => {
  const v = Math.sin(k * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

function shapesHtml(g, x, y, F) {
  const v = g.variant;
  if (v === 'burst') return raysHtml(clamp(parseFloat(g.opts.size) || 70, 20, 400), clamp(parseFloat(g.opts.size) || 70, 20, 400) + 90, 12);
  if (v === 'rings') {
    const R = clamp(parseFloat(g.opts.size) || 220, 40, 900);
    return [0, 1, 2].map((k) => `<i class="gx-ring" style="--k:${k}; width:${2 * R}px; height:${2 * R}px; left:${-R}px; top:${-R}px" data-lint="off"></i>`).join('');
  }
  if (v === 'dots') {
    const out = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) out.push(`<i style="left:${(c - 2) * 54}px; top:${(r - 1) * 54}px; --d:${r2((c + r) * 0.05)}s"></i>`);
    return out.join('');
  }
  if (v === 'lines') {
    return [0.22, 0.34, 0.5, 0.63, 0.78].map((t, k) => `<i style="top:${Math.round(t * F.H)}px; --d:${r2(k * 0.06 + (k % 2) * 0.05)}s; --t:${k % 2 ? 8 : 14}px"></i>`).join('');
  }
  // confetti, falling from above the frame
  const colors = ['var(--gc)', '#ffffff', '#ffd84d', 'color-mix(in srgb, var(--gc) 50%, #ffffff)'];
  const out = [];
  for (let k = 0; k < 44; k++) {
    out.push(`<i style="left:${(4 + rand(k, 1) * 92).toFixed(1)}%; --w:${Math.round(18 + rand(k, 2) * 18)}px; --c:${colors[k % colors.length]}; `
      + `--d:${r2(rand(k, 3) * 0.45)}s; --t:${r2(1.4 + rand(k, 4) * 0.8)}s; --dx:${Math.round((rand(k, 5) - 0.5) * 220)}px; --rot:${Math.round((rand(k, 6) - 0.5) * 1440)}deg"></i>`);
  }
  return out.join('');
}

function textHtml(g, defaults) {
  const anim = g.opts.anim || defaults.textAnim || 'pop';
  const text = g.texts[0];
  if (anim === 'count') return `<div class="gx-tx">${countHtml(plain(text))}</div>`;
  const words = wordsOf(text);
  let c = 0;
  const letters = (str) => Array.from(str).map((ch) => `<span class="gx-c" style="--c:${c++}">${esc(ch)}</span>`).join('');
  const html = words.map(({ w, hi, head, tail }, k) => {
    const split = ['type', 'rise', 'wave'].includes(anim);
    const part = (str) => (split ? letters(str) : esc(str));
    const style = split ? '' : ` style="--k:${k}"`;
    // a highlight with punctuation on it: the word's own span lit, the punctuation not
    if (hi && (head || tail)) return `<span class="gx-w"${style}>${part(head)}<span class="gx-hi">${part(w)}</span>${part(tail)}</span>`;
    return `<span class="gx-w${hi ? ' gx-hi' : ''}"${style}>${part(w)}</span>`;
  }).join(' ');
  return `<div class="gx-tx${g.opts.style && g.opts.style !== 'plain' ? ` gt-${g.opts.style}` : ''}">${html}</div>`;
}

function lockHtml(g, x, F) {
  const s = clamp(parseFloat(g.opts.size) || 120, 50, 400);
  const corners = [['tl', -1, -1], ['tr', 1, -1], ['bl', -1, 1], ['br', 1, 1]].map(([c, sx, sy]) =>
    `<i class="gx-hb c-${c}" style="--sx:${sx}; --sy:${sy}; left:${sx < 0 ? -s : s - 46}px; top:${sy < 0 ? -s : s - 46}px" data-lint="off"></i>`).join('');
  const ro = Math.round(s * 0.78);
  const orbit = `<svg class="gx-orbit" width="${2 * ro + 8}" height="${2 * ro + 8}" style="left:${-ro - 4}px; top:${-ro - 4}px"><circle cx="${ro + 4}" cy="${ro + 4}" r="${ro}"/></svg>`;
  const t = Math.round(s * 0.42);
  const cross = `<svg class="gx-cross" width="${2 * t}" height="${2 * t}" style="left:${-t}px; top:${-t}px"><line x1="0" y1="${t}" x2="${t - 16}" y2="${t}"/><line x1="${t + 16}" y1="${t}" x2="${2 * t}" y2="${t}"/>`
    + `<line x1="${t}" y1="0" x2="${t}" y2="${t - 16}"/><line x1="${t}" y1="${t + 16}" x2="${t}" y2="${2 * t}"/></svg>`;
  const flip = x > F.W * 0.55;
  const label = g.texts[0] || 'LOCKED';
  const coords = `X ${String(Math.round(g.pos[0])).padStart(3, '0')} · Y ${String(Math.round(g.pos[1])).padStart(3, '0')}`;
  const read = `<div class="gx-read${flip ? ' gx-flip' : ''}" style="${flip ? `right:${s + 34}px` : `left:${s + 34}px`}; top:${-s}px"><b>${esc(label)}</b><small>${coords}</small></div>`;
  return corners + orbit + cross + '<i class="gx-pip" data-lint="off"></i>' + read;
}

function hudFrame(g) {
  const corners = [['tl', -1, -1], ['tr', 1, -1], ['bl', -1, 1], ['br', 1, 1]].map(([c, sx, sy]) => `<i class="gx-hb c-${c}" style="--sx:${sx}; --sy:${sy}"></i>`).join('');
  return `<div class="gx-deco" data-lint="off">${corners}<i class="gx-ruler"></i><i class="gx-sweep"></i></div>`
    + `<div class="gx-htop"><i class="gx-rec"></i><b>${esc(g.texts[0] || 'REC')}</b></div>`;
}

function hudData(g) {
  const texts = [...g.texts];
  const title = texts.length % 2 ? texts.shift() : '';
  const rows = [];
  for (let k = 0; k < texts.length; k += 2) {
    const value = texts[k + 1];
    const c = countable(value);
    const pct = c && /^\s*%/.test(c.suf) && c.n <= 100 && !c.pre ? c.n : null;
    const d = r2(0.35 + (k / 2) * 0.22);
    rows.push(`<div class="gx-row" style="--k:${k / 2}"><span class="gx-k">${esc(texts[k])}</span><span class="gx-v">${c ? countHtml(value, d) : esc(value)}</span>`
      + `${pct !== null ? `<span class="gx-meter"><i style="--pct:${pct}%"></i></span>` : ''}</div>`);
  }
  return `${title ? `<h6>${esc(title)}</h6>` : ''}${rows.join('')}`;
}

function hudScan(g) {
  const corners = [['tl', -1, -1], ['tr', 1, -1], ['bl', -1, 1], ['br', 1, 1]].map(([c, sx, sy]) => `<i class="gx-hb c-${c}" style="--sx:${sx}; --sy:${sy}"></i>`).join('');
  return `<div class="gx-deco" data-lint="off"><i class="gx-grid"></i><i class="gx-sweep"></i>${corners}</div>`
    + (g.texts[0] ? `<div class="gx-read gx-inset"><b>${esc(g.texts[0])}</b></div>` : '');
}

// The sound it makes: its own sfx=, or, when the edit wants sounds, its kind's. Only the hits
// (kinetic type, icons, accents) have one of their own: under a voice, a sound on every callout
// would crowd the speech.
function soundOf(g, sounds) {
  if (g.opts.sfx) return g.opts.sfx === 'none' ? '' : g.opts.sfx;
  if (!sounds) return '';
  if (g.kind === 'text') return ANIMS[g.opts.anim || g.anim || 'pop'];
  if (g.kind === 'shapes') return SHAPES[g.variant];
  if (g.kind === 'hud') return HUD[g.variant].sfx;
  return KINDS[g.kind].sfx || '';
}

// One placed graphic as markup. F: the frame ({ W, H }); sounds: whether to add each kind's sound;
// defaults: from defaultsFor (how text comes in, how a lower third is set).
function markup(g, { W = 1080, H = 1920, sounds = false, defaults = {} } = {}) {
  const F = { W, H };
  const portrait = H > W;
  const [x, y] = g.pos ? [g.pos[0] / 100 * W, g.pos[1] / 100 * H] : [0, 0];
  const rect = g.pos && g.pos.length === 4 ? { l: x, t: y, w: g.pos[2] / 100 * W, h: g.pos[3] / 100 * H } : null;
  const at = (left, top) => `left:${px(left)}; top:${px(top)}`;
  const mods = [];
  let style = '';
  let inner = '';
  let lint = true;
  switch (g.kind) {
    case 'lower': {
      const st = g.opts.style || defaults.lowerStyle || 'bar';
      mods.push(`ls-${st}`, ...(g.opts.side === 'right' ? ['ls-right'] : []));
      if (g.pos) style = `${at(x, y)}; bottom:auto; right:auto`;
      inner = `<i class="gx-bar"></i><div class="gx-lt"><b>${lit(g.texts[0])}</b>${g.texts[1] ? `<small>${lit(g.texts[1])}</small>` : ''}</div>`;
      break;
    }
    case 'arrow': style = at(x, y); inner = arrowHtml(g, x, y, F); break;
    case 'circle': style = at(x, y); inner = circleHtml(g, x, y, F); break;
    case 'box': {
      style = `${at(rect.l, rect.t)}; width:${px(rect.w)}; height:${px(rect.h)}`;
      const below = rect.t < H * (portrait ? 0.2 : 0.14);
      inner = `<svg width="${Math.round(rect.w + 24)}" height="${Math.round(rect.h + 24)}" style="left:-12px; top:-12px"><rect class="gx-draw" pathLength="1" x="12" y="12" width="${Math.round(rect.w)}" height="${Math.round(rect.h)}" rx="16"/></svg>`
        + (g.texts[0] ? `<span class="gx-tag gx-tab${below ? ' gx-below' : ''}" style="left:0; top:${below ? px(rect.h) : '0px'}">${lit(g.texts[0])}</span>` : '');
      break;
    }
    case 'highlight':
      style = `${at(rect.l, rect.t)}; width:${px(rect.w)}; height:${px(rect.h)}`;
      inner = '<i class="gx-mark"></i>';
      lint = false;
      break;
    case 'spot': {
      const r = clamp(parseFloat(g.opts.r) || 220, 60, 900);
      style = `left:0; top:0; width:${W}px; height:${H}px; --px:${px(x)}; --py:${px(y)}; --r:${r}px`;
      const above = y + r + 120 > H * (portrait ? 0.74 : 0.9);
      inner = '<i class="gx-dim" data-lint="off"></i>'
        + (g.texts[0] ? `<span class="gx-tag ${above ? 'gx-up' : 'gx-down'}" style="${at(x, above ? y - r : y + r)}">${lit(g.texts[0])}</span>` : '');
      break;
    }
    case 'pin': {
      style = at(x, y);
      const flip = x > W * 0.55;
      const below = y < H * (portrait ? 0.24 : 0.2);
      inner = `<i class="gx-dot"></i><span class="gx-tag gx-pintag${flip ? ' gx-flip' : ''}${below ? ' gx-below' : ''}">${lit(g.texts[0])}</span>`;
      break;
    }
    case 'icon': {
      const [ix, iy] = g.pos ? [x, y] : [W / 2, H * 0.42];
      style = at(ix, iy);
      if (g.opts.style === 'plain') mods.push('ic-plain');
      inner = iconHtml(g);
      break;
    }
    case 'shapes': {
      mods.push(`sh-${g.variant}`);
      const [sx, sy] = g.pos ? [x, y] : [W / 2, H * 0.42];
      style = ['lines', 'confetti'].includes(g.variant) ? `left:0; top:0; width:${W}px; height:${H}px; --fall:${H + 120}px` : at(sx, sy);
      inner = shapesHtml(g, sx, sy, F);
      lint = false;
      break;
    }
    case 'text': {
      const anim = g.opts.anim || defaults.textAnim || 'pop';
      mods.push(`ta-${anim}`, `ts-${g.opts.size || 'l'}`);
      // the middle of the area clear of the hook and the captions
      const [tx, ty] = g.pos ? [x, y] : portrait ? [510, H * 0.46] : [W / 2, H * 0.42];
      style = `${at(tx, ty)}; width:${portrait ? 840 : 1500}px`;
      inner = textHtml(g, defaults);
      break;
    }
    case 'hud': {
      mods.push(`hv-${g.variant}`);
      if (g.variant === 'lock') { style = at(x, y); inner = lockHtml(g, x, F); }
      if (g.variant === 'frame') {
        const ins = portrait ? { l: 48, r: 48, t: 190, b: 430 } : { l: 40, r: 40, t: 40, b: 40 };
        style = `${at(ins.l, ins.t)}; width:${W - ins.l - ins.r}px; height:${H - ins.t - ins.b}px`;
        inner = hudFrame(g);
      }
      if (g.variant === 'data') {
        const [dx, dy] = g.pos ? [x, y] : portrait ? [90, 560] : [110, 150];
        style = at(dx, dy);
        inner = hudData(g);
      }
      if (g.variant === 'scan') {
        const r = rect || { l: 0, t: 0, w: W, h: H };
        style = `${at(r.l, r.t)}; width:${px(r.w)}; height:${px(r.h)}`;
        inner = hudScan(g);
      }
      break;
    }
    default: break;
  }
  const color = g.opts.color ? `; --gc:${COLORS[g.opts.color.toLowerCase()] || g.opts.color}` : '';
  const sound = soundOf({ ...g, anim: g.opts.anim || defaults.textAnim }, sounds);
  // a graphic timed to a word later (render.js) carries its sound aside, so it plays at the word
  const sfx = sound ? (g.anchor ? ` data-gx-sfx="${sound}"` : ` data-sfx="${sound}"`) : '';
  const anchor = g.anchor ? ` data-word="${esc(g.word)}" data-for="${g.dur}"` : '';
  return `    <div class="gx gx-${g.kind}${mods.length ? ` ${mods.join(' ')}` : ''}"`
    + ` style="--in:${g.in}s; --out:${g.out}s; ${style}${color}"${anchor}${sfx}${lint ? '' : ' data-lint="off"'}>${inner}</div>`;
}

// All of a page's graphics, in one layer over the picture and under the captions.
function layer(items, opts) {
  if (!items.length) return '';
  return `  <!-- graphics (graphics.js) -->\n  <div class="gx-layer">\n${items.map((g) => markup(g, opts)).join('\n')}\n  </div>\n`;
}

// "arrow at 2.1–4.6s: the new button", for the scripts' summaries.
function describe(g) {
  const what = [g.kind, g.variant].filter(Boolean).join(' ');
  const text = g.texts.length ? ` "${g.texts.map(plain).join('" "')}"` : '';
  const when = g.anchor ? `on "${g.word}" (timed by render.js)` : `${g.in}–${g.out}s${g.word ? ` (on "${g.word}")` : ''}`;
  return `${what}${text} ${when}`;
}

// Parses and places a list of lines; returns { items, problems }.
function placeAll(lines, opts) {
  const items = [];
  const problems = [];
  for (const line of lines) {
    const g = parse(line);
    if (g.error) { problems.push(g.error); continue; }
    const p = place(g, opts);
    if (p.error) problems.push(p.error);
    else items.push(p);
  }
  return { items, problems };
}

if (require.main === module) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd !== 'check' || !rest.length) {
    console.log(require('fs').readFileSync(__filename, 'utf8').split('*/')[0].replace(/^[\s\S]*?\/\*/, '').replace(/^ \* ?/gm, ''));
    process.exit(cmd ? 2 : 0);
  }
  let bad = 0;
  for (const line of rest) {
    const g = parse(line);
    if (g.error) { console.error(g.error); bad++; continue; }
    const p = place(g);
    console.log(describe(p));
  }
  process.exit(bad ? 1 : 0);
}

module.exports = { parse, place, placeAll, markup, layer, describe, findWord, defaultsFor, ICONS, KINDS, SHAPES, ANIMS, HUD };
