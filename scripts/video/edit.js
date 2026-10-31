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
// line word by word as it's spoken; fade is soft and quiet, for a cinematic cut.
const CAPTION_FX = ['pop', 'bounce', 'kinetic', 'fade'];

// The editing styles (references/editing-techniques.md, "Editing styles"). Each sets the cuts it
// rotates through, the cut out of the hook (`drop`), the camera moves, how hard the camera
// punches in on *keywords* (0 for none), the visual hook, the longest a picture holds before a
// new one or a reframe (the b-roll cadence, 0 to never split), how far the next line's voice
// leads its picture (a J-cut, in seconds), the caption style, the finishing (grain, vignette, a
// color grade), and which sounds it adds (on cuts, a riser into the drop, an impact on it).
const EDIT_STYLES = {
  clean: {
    about: 'crossfades and slow zooms, no extra sounds (the look before edit styles)',
    cuts: ['fade'], drop: 'fade', dropFx: 'none', moves: ['kbIn'], punch: 0, hook: 'none', maxHold: 0, jcut: 0,
    captions: 'pop', grain: false, vignette: false, grade: '', cutSfx: false, riser: false, impact: false,
  },
  ugc: {
    about: 'creator-style: hard cuts and punch-ins on the beat, a fast zoom on the hook, bouncing captions',
    cuts: ['cut', 'punch', 'cut', 'whip'], drop: 'punch', dropFx: 'punch', moves: ['kbIn', 'kbLeft', 'kbDyn', 'kbRight', 'kbOut'],
    punch: 1.08, hook: 'zoom', maxHold: 3.2, jcut: 0.12,
    captions: 'bounce', grain: false, vignette: false, grade: 'saturate(1.06) contrast(1.05)', cutSfx: true, riser: false, impact: true,
  },
  kinetic: {
    about: 'typography-led, for apps and SaaS: slides, masks, and wipes, words building as they are said',
    cuts: ['slide', 'mask', 'wipe', 'zoom'], drop: 'zoom', dropFx: 'punch', moves: ['kbDyn', 'kbRight', 'kbDynOut', 'kbLeft'],
    punch: 1.06, hook: 'bounce', maxHold: 3.6, jcut: 0.1,
    captions: 'kinetic', grain: false, vignette: false, grade: 'saturate(1.04) contrast(1.06)', cutSfx: true, riser: false, impact: false,
  },
  fast: {
    about: 'high energy: micro-cuts, whips, glitches, and flashes on the beat, a rapid-montage hook, a riser into a flash on the drop',
    cuts: ['punch', 'whip', 'glitch', 'cut', 'spin', 'flash'], drop: 'flash', dropFx: 'shake', moves: ['kbDyn', 'kbIn', 'kbDynOut', 'kbRight', 'kbLeft'],
    punch: 1.12, hook: 'montage', maxHold: 2.2, jcut: 0,
    captions: 'bounce', grain: false, vignette: false, grade: 'saturate(1.14) contrast(1.08)', cutSfx: true, riser: true, impact: true,
  },
  cinematic: {
    about: 'slow and atmospheric: blurs, light leaks, a film burn on the drop, grain, a vignette, a warm grade, J-cuts',
    cuts: ['fade', 'blur', 'leak', 'fade'], drop: 'burn', dropFx: 'none', moves: ['kbIn', 'kbLeft', 'kbOut', 'kbRight'],
    punch: 0, hook: 'none', maxHold: 4.5, jcut: 0.25,
    captions: 'fade', grain: true, vignette: true, grade: 'saturate(.86) contrast(1.12) brightness(.92) sepia(.12)', cutSfx: false, riser: true, impact: false,
  },
  meme: {
    about: 'comedic timing: hard cuts, exaggerated punch-ins that shake on the keywords, a shaking hook with an impact',
    cuts: ['cut', 'punch', 'cut'], drop: 'punch', dropFx: 'shake', moves: ['kbIn', 'kbOut'],
    punch: 1.16, punchFx: 'shake', hook: 'shake', maxHold: 3, jcut: 0,
    captions: 'bounce', grain: false, vignette: false, grade: 'saturate(1.1) contrast(1.06)', cutSfx: true, riser: false, impact: true,
  },
};

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
function resolveStyle(meta = {}, sound = {}) {
  let name = String(meta.edit || 'auto').trim().toLowerCase();
  const picked = name === 'auto';
  if (picked) name = autoStyle({ music: sound.music, energy: parseFloat(sound.energy) });
  const base = EDIT_STYLES[name];
  if (!base) throw new Error(`edit: ${name}? Use auto, ${Object.keys(EDIT_STYLES).join(', ')}.`);
  const style = { ...base, name, picked };
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
  }
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
  return style;
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

module.exports = { TRANSITIONS, MOVES, HOOK_FX, DROP_FX, CAPTION_FX, EDIT_STYLES, autoStyle, resolveStyle, parsePunch, cameraAnimation, slotTimes, transitionClass, overlayAt };
