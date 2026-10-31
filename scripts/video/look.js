'use strict';
/*
 * Visual styles ("looks") for a narrated video: the palette treatment, the type, the captions,
 * the texture, and how much things move, chosen together so a video has one coherent style
 * rather than a pile of effects. compose.js takes "look:" (or "goal:", which picks one for the
 * video's job) in a script's frontmatter; cut.js takes --look. The CSS is in the editing block of
 * templates/build.py (body classes look-<name>, tx-<texture>, cap-<captions>);
 * references/visual-design.md says when to use each, and maps the rest of the common styles.
 *
 * Each look sets:
 *   edit      the editing style it cuts in (edit.js), unless the script sets edit:
 *   motion    low, medium, or high (how much moves; edit.js applyMotion)
 *   head      the headline font (the hook, text cards), from Google Fonts, and its weight;
 *             the body font stays the template's (or the Visual Identity's)
 *   captions  the caption style (pop, bounce, kinetic, fade, or panel)
 *   grade     the color treatment on every picture (a CSS filter)
 *   texture   finishing over the frame: grain, vignette, scanlines, grid, paper
 *   accent    an accent color for the look, used only when the brand has no Visual Identity accent
 */

const LOOKS = {
  social: {
    about: 'social-native short-form: big high-contrast captions, purposeful punch-ins, one bold accent',
    edit: 'ugc', motion: 'medium', head: null, captions: 'bounce', grade: 'saturate(1.06) contrast(1.05)', texture: [],
  },
  minimal: {
    about: 'a neutral base and one accent, clean compositions, short slides and gentle scale',
    edit: 'clean', motion: 'low', head: ['Inter', 800], captions: 'panel', grade: 'saturate(.88) contrast(1.02) brightness(1.02)', texture: [], accent: '#2f6fed',
  },
  explainer: {
    about: 'educational: high contrast, one relationship at a time, keywords in consistent colors',
    edit: 'kinetic', motion: 'medium', head: ['Space Grotesk', 700], captions: 'kinetic', grade: 'saturate(1.02) contrast(1.06)', texture: [],
  },
  documentary: {
    about: 'credible and restrained: natural color, captions on a solid panel, sources on screen, steady movement',
    edit: 'clean', motion: 'low', head: ['Inter', 800], captions: 'panel', grade: 'saturate(.96) contrast(1.02)', texture: [], transitions: 'cut',
  },
  corporate: {
    about: 'professional: brand colors and neutrals, legible panels, smooth predictable motion',
    edit: 'clean', motion: 'low', head: ['Inter', 800], captions: 'panel', grade: 'saturate(.95) contrast(1.04)', texture: [], transitions: 'cut',
  },
  cinematic: {
    about: 'a brand film: a deliberate warm grade, restrained serif titles, atmospheric transitions, grain and a vignette',
    edit: 'cinematic', motion: 'low', head: ['Playfair Display', 700], captions: 'fade', grade: 'saturate(.86) contrast(1.12) brightness(.92) sepia(.12)', texture: ['grain', 'vignette'],
  },
  editorial: {
    about: 'magazine: curated neutrals and one accent, a large serif headline, crop reveals and slides',
    edit: 'clean', motion: 'low', head: ['DM Serif Display', 400], captions: 'panel', grade: 'saturate(.9) contrast(1.08)', texture: [], transitions: 'cut', accents: ['slide', 'wipe'], accent: '#d4452f',
  },
  luxury: {
    about: 'premium: restrained and spacious, slow confident movement, sparse refined type, a metallic accent',
    edit: 'cinematic', motion: 'low', head: ['Playfair Display', 600], captions: 'fade', grade: 'saturate(.82) contrast(1.14) brightness(.94)', texture: ['vignette'], accent: '#c8a96a',
  },
  tech: {
    about: 'futuristic: dark neutrals, a luminous cyan accent, a faint grid, scanning reveals and glitches only on the turns',
    edit: 'kinetic', motion: 'medium', head: ['Space Grotesk', 700], captions: 'kinetic', grade: 'saturate(.9) contrast(1.1) brightness(.88) hue-rotate(-8deg)', texture: ['grid', 'vignette'], accents: ['glitch', 'mask'], accent: '#22d3ee',
  },
  retro: {
    about: 'VHS and analog: faded warm color, scanlines and grain, a terminal headline, restrained jitter',
    edit: 'ugc', motion: 'medium', head: ['VT323', 400], captions: 'pop', grade: 'saturate(.78) contrast(.94) brightness(1.02) sepia(.28)', texture: ['scanlines', 'grain', 'vignette'], accents: ['glitch'], accent: '#ff6b35',
  },
  suspense: {
    about: 'mystery and horror: controlled darkness with meaningful highlights, slow reveals, held frames, no flashes',
    edit: 'cinematic', motion: 'low', head: ['Oswald', 600], captions: 'fade', grade: 'saturate(.55) contrast(1.18) brightness(.78)', texture: ['vignette', 'grain'], accents: ['blur'], accent: '#b33a3a',
  },
  cozy: {
    about: 'lo-fi and calm: muted warm color, soft captions, slow drifts, a little grain',
    edit: 'clean', motion: 'low', head: ['Fraunces', 700], captions: 'fade', grade: 'saturate(.8) contrast(.96) brightness(1.03) sepia(.18)', texture: ['grain'], accent: '#d9a066',
  },
  handmade: {
    about: 'tactile: a paper texture, a handwritten headline, warm material color, small playful moves',
    edit: 'clean', motion: 'medium', head: ['Caveat', 700], captions: 'bounce', grade: 'saturate(.92) sepia(.1)', texture: ['paper'], accent: '#e2574c',
  },
  playful: {
    about: 'comedy and entertainment: bright contrasting color in a limited system, clear setup and payoff, punchy timing',
    edit: 'meme', motion: 'high', head: null, captions: 'bounce', grade: 'saturate(1.12) contrast(1.05)', texture: [],
  },
};

// The video's job (references/visual-design.md, "Match the style to the job") -> a look and how much moves.
const GOALS = {
  teach: { look: 'explainer', motion: 'medium' },
  trust: { look: 'documentary', motion: 'low' },
  entertain: { look: 'social', motion: 'high' },
  story: { look: 'cinematic', motion: 'low' },
  sell: { look: 'social', motion: 'medium' },
  suspense: { look: 'suspense', motion: 'low' },
  inspire: { look: 'cinematic', motion: 'medium' },
  review: { look: 'minimal', motion: 'medium' },
  comedy: { look: 'playful', motion: 'high' },
  music: { look: 'social', motion: 'high' },
};

// The look for a script's look: or goal:, or null for none (the template's own look). Throws
// with the choices on an unknown name.
function resolveLook(meta = {}) {
  const goal = String(meta.goal || '').trim().toLowerCase();
  if (goal && !GOALS[goal]) throw new Error(`goal: ${goal}? Use ${Object.keys(GOALS).join(', ')}.`);
  const name = String(meta.look || (goal ? GOALS[goal].look : '') || '').trim().toLowerCase();
  if (!name || name === 'none') return null;
  if (!LOOKS[name]) throw new Error(`look: ${name}? Use ${Object.keys(LOOKS).join(', ')}.`);
  return { name, ...LOOKS[name], motion: String(meta.motion || (goal && !meta.look ? GOALS[goal].motion : '') || LOOKS[name].motion).toLowerCase(), goal: goal || null };
}

// The look's headline font as a Google Fonts stylesheet link, or '' (Inter and TikTok Sans are
// already on every page).
function fontLink(look) {
  if (!look || !look.head || ['Inter', 'TikTok Sans'].includes(look.head[0])) return '';
  const [family, weight] = look.head;
  return `<link id="look-font" rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${weight}&display=block">\n`;
}

// The body classes and inline variables a look puts on the page.
function lookClasses(look) {
  if (!look) return { classes: [], vars: [] };
  const classes = [`look-${look.name}`, ...look.texture.map((t) => (t === 'grain' || t === 'vignette' ? `fx-${t}` : `tx-${t}`))];
  const vars = [];
  if (look.head) vars.push(`--font-head: '${look.head[0]}'`, `--head-weight: ${look.head[1]}`); // single quotes: this goes in a style="" attribute
  return { classes, vars };
}

// The look's accent and the text color that reads on it, as inline variables (only when the
// brand has no accent of its own).
function accentVars(look, identity) {
  if (!look || !look.accent || (identity && identity.accent)) return [];
  return [`--accent: ${look.accent}`, `--on-accent: ${require('./brand').onAccent(look.accent)}`];
}

module.exports = { LOOKS, GOALS, resolveLook, fontLink, lookClasses, accentVars };
