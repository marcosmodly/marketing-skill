'use strict';
/*
 * The editing vocabulary shared by compose.js, cut.js, and montage.js: how one background
 * slot hands over to the next (transitions), the camera moves on a still, what the camera layer
 * does on the hook, the drop, and each *keyword* (punch-ins, shakes), and the editing styles that
 * combine them into a recognizable look. The CSS for all of it is in templates/build.py (the
 * "editing" block, in every template); references/editing-techniques.md maps every editing term
 * (whip pan, glitch transition, J-cut, speed ramp...) to the setting that makes it.
 */

// How each transition comes in, on the incoming .bg slot. `dur` is how long it takes; `lead` is
// how early the incoming slot starts before the cut (a crossfade starts early, a hard cut on it);
// `covers` means the outgoing slot stays put underneath until the incoming one has covered it;
// `overlay` is a full-frame element dropped on the cut (a flash, a light leak, a film burn); `sfx`
// is the sound that sells it, when the edit style wants sounds on its cuts.
const TRANSITIONS = {
  fade: { dur: 0.45, lead: 0.25, covers: false },
  cut: { dur: 0, lead: 0, covers: true },
  flash: { dur: 0, lead: 0, covers: true, cls: 'cut', overlay: 'flash', sfx: 'impact' },
  slide: { dur: 0.5, lead: 0.25, covers: true, sfx: 'swish' },
  whip: { dur: 0.32, lead: 0.16, covers: true, sfx: 'whoosh' },
  zoom: { dur: 0.5, lead: 0.25, covers: true, sfx: 'whoosh' },
  punch: { dur: 0.32, lead: 0, covers: true, sfx: 'impact' },
  wipe: { dur: 0.6, lead: 0.3, covers: true, sfx: 'swish' },
  glitch: { dur: 0.42, lead: 0, covers: true, sfx: 'glitch' },
  spin: { dur: 0.5, lead: 0.25, covers: true, sfx: 'whoosh' },
  blur: { dur: 0.5, lead: 0.25, covers: true },
  mask: { dur: 0.55, lead: 0.2, covers: true, sfx: 'swish' },
  leak: { dur: 0.5, lead: 0.2, covers: true, overlay: 'leak' },
  burn: { dur: 0.01, lead: 0, covers: true, cls: 'cut', overlay: 'burn' },
};

// Camera moves on a still or a clip (--kb on the slot). The dynamic ones change speed.
const MOVES = ['kbIn', 'kbOut', 'kbLeft', 'kbRight', 'kbDyn', 'kbDynOut', 'kbUp', 'kbDown', 'none'];

// The visual hook: what moves in the first half second. Every one keeps the first frame clean
// and readable, since frame 0 is the cover.
const HOOK_FX = ['none', 'zoom', 'shake', 'glitch', 'flash', 'bounce', 'montage'];

// What the camera does on the drop (the cut out of the hook, where the beat comes in).
const DROP_FX = ['none', 'punch', 'shake', 'flash'];

// Caption animation styles (body class cap-<name>): pop is the platforms' plain word-by-word
// highlight; bounce springs each chunk in and swells the word being said; kinetic builds the
// line word by word as it's spoken; fade is soft and quiet, for a cinematic cut; panel sets each
// phrase in sentence case on a solid dark panel, readable over any footage (documentary, corporate).
const CAPTION_FX = ['pop', 'bounce', 'kinetic', 'fade', 'panel'];

// The editing styles (references/editing-techniques.md, "Editing styles"). Most cuts are the
// style's `base` transition; its conspicuous `accents` are saved for the moments that mean
// something: the drop (the cut out of the hook), the payoff (the last line), every
// `accentEvery`-th cut in between (0: never), and any line marked [cut: ...]. (A different
// transition on every cut reads as random; references/visual-design.md, "Transitions".) Each also
// sets the camera moves, how hard the camera punches in on *keywords* (0 for none), the visual
// hook, the longest a picture holds before a new one or a reframe (0 to never split), how far
// the next line's voice leads its picture (a J-cut, in seconds), the caption style, the
// finishing (grain, vignette, a color grade), which sounds it adds (on cuts, a riser into the
// drop, an impact on it), and how much it moves by default (motion: low, medium, or high).
const EDIT_STYLES = {
  clean: {
    about: 'crossfades and slow zooms, no extra sounds (the look before edit styles)',
    base: 'fade', accents: [], accentEvery: 0, drop: 'fade', dropFx: 'none', moves: ['kbIn', 'kbRight', 'kbOut', 'kbLeft'], punch: 0, hook: 'none', maxHold: 0, jcut: 0,
    captions: 'pop', grain: false, vignette: false, grade: '', cutSfx: false, riser: false, impact: false, motion: 'low',
  },
  ugc: {
    about: 'creator-style: clean cuts on the beat, a punch-in or a whip on the turns, a fast zoom on the hook, bouncing captions',
    base: 'cut', accents: ['punch', 'whip'], accentEvery: 3, drop: 'punch', dropFx: 'punch', moves: ['kbIn', 'kbLeft', 'kbDyn', 'kbRight', 'kbOut'],
    punch: 1.08, hook: 'zoom', maxHold: 3.2, jcut: 0.12,
    captions: 'bounce', grain: false, vignette: false, grade: 'saturate(1.06) contrast(1.05)', cutSfx: true, riser: false, impact: true, motion: 'medium',
  },
  kinetic: {
    about: 'typography-led, for apps and SaaS: clean cuts, a mask, wipe, or zoom on the turns, words building as they are said',
    base: 'cut', accents: ['mask', 'wipe', 'zoom'], accentEvery: 2, drop: 'zoom', dropFx: 'punch', moves: ['kbDyn', 'kbRight', 'kbDynOut', 'kbLeft'],
    punch: 1.06, hook: 'bounce', maxHold: 3.6, jcut: 0.1,
    captions: 'kinetic', grain: false, vignette: false, grade: 'saturate(1.04) contrast(1.06)', cutSfx: true, riser: false, impact: false, motion: 'medium',
  },
  fast: {
    about: 'high energy: punch-in cuts on the beat, a whip or glitch on every other turn, a rapid-montage hook, a riser into a flash on the drop',
    base: 'punch', accents: ['whip', 'glitch', 'spin'], accentEvery: 2, drop: 'flash', dropFx: 'shake', moves: ['kbDyn', 'kbIn', 'kbDynOut', 'kbRight', 'kbLeft'],
    punch: 1.12, hook: 'montage', maxHold: 2.2, jcut: 0,
    captions: 'bounce', grain: false, vignette: false, grade: 'saturate(1.14) contrast(1.08)', cutSfx: true, riser: true, impact: true, motion: 'high',
  },
  cinematic: {
    about: 'slow and atmospheric: dissolves, a light leak on the turns, a film burn on the drop, grain, a vignette, a warm grade, J-cuts',
    base: 'fade', accents: ['leak', 'blur'], accentEvery: 3, drop: 'burn', dropFx: 'none', moves: ['kbIn', 'kbLeft', 'kbOut', 'kbRight'],
    punch: 0, hook: 'none', maxHold: 4.5, jcut: 0.25,
    captions: 'fade', grain: true, vignette: true, grade: 'saturate(.86) contrast(1.12) brightness(.92) sepia(.12)', cutSfx: false, riser: true, impact: false, motion: 'low',
  },
  meme: {
    about: 'comedic timing: hard cuts, exaggerated punch-ins that shake on the keywords, a shaking hook with an impact',
    base: 'cut', accents: ['punch'], accentEvery: 2, drop: 'punch', dropFx: 'shake', moves: ['kbIn', 'kbOut'],
    punch: 1.16, punchFx: 'shake', hook: 'shake', maxHold: 3, jcut: 0,
    captions: 'bounce', grain: false, vignette: false, grade: 'saturate(1.1) contrast(1.06)', cutSfx: true, riser: false, impact: true, motion: 'high',
  },
};

// How much moves (references/visual-design.md, "Motion intensity"). Low is for interviews,
// serious explainers, premium products, and anyone sensitive to motion: no shakes, flashes,
// glitches, spins, or whips, gentle punch-ins, calm captions, longer holds. Medium keeps the
// style, but shakes only on the drop and no flashes or spins after it. High is the style as it
// is. Lowering never adds effects.
const MOTION = ['low', 'medium', 'high'];
const LOUD = ['flash', 'glitch', 'spin', 'burn', 'whip'];
function applyMotion(style, level) {
  const m = String(level || style.motion || 'high').toLowerCase();
  if (!MOTION.includes(m)) throw new Error(`motion: ${m}? Use ${MOTION.join(', ')}.`);
  const s = { ...style, motion: m };
  if (m === 'high') return s;
  const calm = (t) => (LOUD.includes(t) ? (s.base === 'fade' ? 'fade' : 'cut') : t);
  s.accents = s.accents.filter((t) => !['flash', 'spin'].includes(t));
  s.punchFx = undefined;
  if (s.hook === 'shake') s.hook = 'zoom';
  if (m === 'medium') {
    if (s.cuts) s.cuts = s.cuts.map((t) => (['flash', 'spin'].includes(t) ? 'cut' : t));
    return s;
  }
  // low
  s.base = calm(s.base === 'punch' ? 'cut' : s.base);
  s.accents = [...new Set(s.accents.map(calm).filter((t) => !['cut', 'punch'].includes(t)))].filter((t) => t !== s.base);
  s.drop = calm(s.drop === 'punch' ? 'cut' : s.drop);
  if (s.cuts) s.cuts = s.cuts.map((t) => calm(t === 'punch' ? 'cut' : t));
  s.dropFx = 'none';
  s.punch = s.punch ? Math.min(s.punch, 1.04) : 0;
  s.hook = ['bounce'].includes(s.hook) ? s.hook : 'none';
  if (s.captions === 'bounce') s.captions = 'pop';
  s.maxHold = s.maxHold ? Math.round(s.maxHold * 1.4 * 10) / 10 : 0;
  s.moves = s.moves.map((mv) => ({ kbDyn: 'kbIn', kbDynOut: 'kbOut' }[mv] || mv));
  s.impact = false;
  return s;
}

// The transition into line i (of n) when the line doesn't name one: the drop out of the hook,
// the style's explicit rotation (transitions:), an accent on the payoff and every accentEvery-th
// turn, and the base everywhere else. `state` counts accents across calls.
function transitionFor(style, i, n, state = { cut: 0, accent: 0 }) {
  if (i === 1) return style.drop;
  if (style.cuts) return style.cuts[state.cut++ % style.cuts.length];
  const turn = i - 1; // cuts after the drop
  const payoff = i === n - 1 && n > 3;
  if (style.accents.length && (payoff || (style.accentEvery && turn % style.accentEvery === 0))) return style.accents[state.accent++ % style.accents.length];
  return style.base;
}

// How hard a punch-in zooms, as a scale: "10%" or "10" -> 1.1, "1.1" -> 1.1, ".1" -> 1.1, "no" -> 0,
// "yes" -> the style's own (or 1.08). Capped at 30%.
function parsePunch(value, fallback = 1.08) {
  const p = String(value).trim().toLowerCase();
  if (/^(no|off|none|false|0%?)$/.test(p)) return 0;
  if (/^(yes|on|true)$/.test(p)) return fallback || 1.08;
  const v = parseFloat(p);
  if (!Number.isFinite(v) || v <= 0) throw new Error(`punch: ${value}? Use a percentage like 10%, or no.`);
  const amount = p.endsWith('%') || v >= 1.5 ? v / 100 : v >= 1 ? v - 1 : v;
  return Math.round((1 + Math.min(0.3, amount)) * 1000) / 1000;
}

// "auto": the style that fits the sound. Loud genres get the fast cut, quiet ones the cinematic.
function autoStyle({ music = '', energy } = {}) {
  const m = String(music).toLowerCase();
  if (['phonk', 'jersey', 'funk', 'house', 'hiphop'].includes(m) || energy >= 4) return 'fast';
  if (['cinematic', 'calm', 'lofi', 'acoustic'].includes(m) || (Number.isFinite(energy) && energy <= 1)) return 'cinematic';
  return 'ugc';
}

// The edit style for a script's `edit:` setting, with `auto` resolved and per-script overrides
// (hook-fx:, transitions:, punch:, captions-fx:, grain:, vignette:) applied. Returns
// { name, ...settings } or throws with the choices.
function resolveStyle(meta = {}, sound = {}, look = null) {
  let name = String(meta.edit || (look && look.edit) || 'auto').trim().toLowerCase();
  const picked = name === 'auto';
  if (picked) name = autoStyle({ music: sound.music, energy: parseFloat(sound.energy) });
  const base = EDIT_STYLES[name];
  if (!base) throw new Error(`edit: ${name}? Use auto, ${Object.keys(EDIT_STYLES).join(', ')}.`);
  const style = { ...base, name, picked };
  // a look (look.js) brings its own captions, grade, finishing, and transitions; the script's own settings still win
  if (look) {
    Object.assign(style, { captions: look.captions, grade: look.grade, grain: false, vignette: false });
    if (look.transitions) style.base = look.transitions;
    if (look.accents) style.accents = look.accents;
  }
  const on = (v) => /^(yes|on|true|1)$/i.test(String(v).trim());
  if (meta['hook-fx']) {
    style.hook = String(meta['hook-fx']).trim().toLowerCase();
    if (!HOOK_FX.includes(style.hook)) throw new Error(`hook-fx: ${style.hook}? Use ${HOOK_FX.join(', ')}.`);
  }
  if (meta.transitions) {
    const list = String(meta.transitions).split(/[\s,]+/).map((t) => t.toLowerCase()).filter(Boolean);
    const bad = list.filter((t) => !TRANSITIONS[t]);
    if (bad.length) throw new Error(`transitions: ${bad.join(', ')}? Use ${Object.keys(TRANSITIONS).join(', ')}.`);
    style.cuts = list;
  } else style.cuts = null;
  if (meta.drop) {
    style.drop = String(meta.drop).trim().toLowerCase();
    if (!TRANSITIONS[style.drop]) throw new Error(`drop: ${style.drop}? Use ${Object.keys(TRANSITIONS).join(', ')}.`);
  }
  if (meta.punch !== undefined && meta.punch !== '') style.punch = parsePunch(meta.punch, style.punch);
  if (meta['captions-fx']) {
    style.captions = String(meta['captions-fx']).trim().toLowerCase();
    if (!CAPTION_FX.includes(style.captions)) throw new Error(`captions-fx: ${style.captions}? Use ${CAPTION_FX.join(', ')}.`);
  }
  if (meta.grain !== undefined) style.grain = on(meta.grain);
  if (meta.vignette !== undefined) style.vignette = on(meta.vignette);
  if (meta['max-hold'] !== undefined) style.maxHold = Math.max(0, parseFloat(meta['max-hold']) || 0);
  if (meta['j-cut'] !== undefined) style.jcut = Math.min(0.4, Math.max(0, parseFloat(meta['j-cut']) || 0));
  return applyMotion(style, meta.motion || (look && look.motion));
}

// The camera layer's animations, as one CSS animation list for <div class="cam">: the visual
// hook in the first half second (frame 0 stays clean), and a hit on the drop. Keyword punch-ins
// are added at render time, once the words are timed (render.js). Each animation starts and ends
// at rest, so they never fight. A photo's fast-zoom hook is on its first slot (hk-zoom); a drawn
// style has no slots, so its camera does it.
function cameraAnimation({ hook = 'none', dropFx = 'none', drop = 0, drawn = false } = {}) {
  const list = [];
  if (drawn && (hook === 'zoom' || hook === 'flash')) list.push('camKw 1.1s cubic-bezier(.2,.9,.3,1) .02s');
  if (hook === 'shake') list.push('camShake .5s linear .04s');
  if (hook === 'glitch') list.push('camGlitch .46s steps(1, end) .08s');
  if (drop > 0.3) {
    if (dropFx === 'punch') list.push(`camPunch .34s cubic-bezier(.2,.8,.2,1) ${drop}s`);
    // the shake first, so the punch's zoom (later in the list) wins while both run
    if (dropFx === 'shake') list.push(`camShake .45s linear ${drop}s`, `camPunch .34s cubic-bezier(.2,.8,.2,1) ${drop}s`);
  }
  return list.join(', ');
}

// Slot timing for a run of shots with transitions: when slot i comes in and when it may go.
// shots: [{ start, end, transition }]; returns [{ into, out, dur }] (out null for the last).
function slotTimes(shots) {
  const lead = (s) => Math.min(TRANSITIONS[s.transition].lead, Math.max(0, (s.end - s.start) / 3));
  return shots.map((s, i) => {
    const last = i === shots.length - 1;
    const next = shots[i + 1];
    const into = i === 0 ? 0 : r2(s.start - lead(s));
    let out = null;
    if (!last) {
      const t = TRANSITIONS[next.transition];
      const nextIn = r2(next.start - lead(next));
      out = t.covers ? r2(nextIn + t.dur + 0.06) : r2(s.end - 0.2);
    }
    const dur = r2((last ? s.end : (out ?? s.end) + 0.45) - into);
    return { into, out, dur };
  });
}

// The class a transition puts on its slot ('' for the default crossfade).
const transitionClass = (name) => (name === 'fade' ? '' : `t-${TRANSITIONS[name].cls || name}`);

// The full-frame overlay a transition drops on its cut, as markup ('' for none).
function overlayAt(name, t) {
  const o = TRANSITIONS[name] && TRANSITIONS[name].overlay;
  return o ? `  <div class="${o}" style="--in:${r2(o === 'flash' ? t : t - 0.12)}s" data-lint="off"></div>` : '';
}

const r2 = (t) => Math.round(t * 100) / 100;

module.exports = { TRANSITIONS, MOVES, HOOK_FX, DROP_FX, CAPTION_FX, EDIT_STYLES, MOTION, applyMotion, transitionFor, autoStyle, resolveStyle, parsePunch, cameraAnimation, slotTimes, transitionClass, overlayAt };
