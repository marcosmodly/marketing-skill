#!/usr/bin/env node
'use strict';
/*
 * Checks hooks before a video is made: what type each one is (references/hooks.md has the
 * table), and what would make it lose the viewer in the first second. With several hooks, it
 * checks they're different types, so a test between them means something. With a goal, it lists
 * the types that suit the video's job, with templates to write from, or says which of the hooks
 * given fit it. With a script, it checks all three layers of the hook (the words on screen, what's
 * heard first, and what moves in the first half second), names the pair of types they make, and
 * checks the shape of the video behind it.
 *
 * Usage:
 *   node hook.js "you're losing money on every late invoice"
 *   node hook.js "hook one" "hook two" "hook three"     # three to offer: each a different type?
 *   node hook.js --goal sell                            # the types to try first, with templates
 *   node hook.js --goal sell "one" "two" "three"        # and which of these suit the goal
 *   node hook.js --script state/videos/2026-10-31-invoices.md
 *   add --json for the findings as JSON
 *
 * The goals, the types for each, and the templates are read from references/hooks.md.
 *
 * It reads the words only, so it can't tell whether a number is true: every statistic, result,
 * or offer it finds is flagged to confirm with the user. Exits 1 when a hook has a problem (not
 * just advice).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MAX_WORDS = 8; // on screen, readable in about a second
const MAX_CHARS = 48;
const WORDS_PER_SECOND = 2.7; // a voiceover's pace, for estimating how long a line takes to say

// The hook types (references/hooks.md), most specific first, each with the words that mark it.
const OFFER_WORDS = /\b(free|trial|discount|\d+% off|off today|promo|coupon|code|deal|giveaway)\b/i;
const TYPES = [
  ['pov', 'POV', /^pov\b/i],
  ['storytelling', 'Storytelling', /^(\w+|\d+) (days?|weeks?|months?|years?) ago\b|^(last|this) (week|month|year)\b|^(when|the day) i\b|^i (almost|nearly|once|quit|lost|tried)\b|^(confession|i need to (admit|confess)|i have to (admit|confess)|i owe)\b|^it (all )?started with\b|^i thought\b/i],
  ['before-after', 'Before and after', /\bbefore (and|&|\/) after\b|\bused to\b.*\bnow\b|\bnow (it'?s|it takes|i)\b|\bfrom \S+ to \S+|^day (\d+|one)\b|\bsame \w+,? (completely )?different\b|\bwhat changed when\b/i],
  // an offer, or the plain benefit an offer hook states ("how to X without Y")
  ['offer', 'Offer', new RegExp(`${OFFER_WORDS.source}|^how to .+ without\\b|\\bstart here\\b`, 'i')],
  ['social-proof', 'Social proof', /\b(customers|clients|users|teams?|people|companies|creators|founders)\b.*\b(switched|started using|love|swear by|use)\b|\bwhy (our|my) (team|clients|customers|users)\b|\b(reviews?|testimonials?|rated)\b|\bwhat (people|users|customers|clients) (noticed|said|thought)\b|^we asked\b|\bthe feedback\b/i],
  ['statistic', 'Statistic', /\b\d+(\.\d+)?\s*(%|percent|x\b|times\b|hours?|minutes?|days?|weeks?|\$)|\$\s?\d|\b\d{2,}\b.*\b(lose|lost|spend|waste|save|saved|earn|made)\b|\bone number\b|\bthe (data|numbers?) (says?|shows?)\b/i],
  ['listicle', 'Listicle', /^(\d+|two|three|four|five|six|seven|eight|nine|ten)\s+\w+/i],
  // before Warning, so "stop focusing on..." reads as a belief challenged rather than a mistake
  ['contrarian', 'Contrarian', /\byou don'?t need\b|\bnobody needs\b|\bunpopular opinion\b|\bis (dead|overrated|a lie|a scam|a trap)\b|\b(forget|ignore) (about )?(everything|what)\b|\bactually (bad|wrong)\b|\bthe problem isn'?t\b|^stop (focusing on|worrying about|obsessing over)\b/i],
  ['warning', 'Warning', /^(stop|don'?t|never|quit|avoid)\b|\bmistakes?\b|\b(doing|writing|using) (it|this|your \w+) wrong\b|\bwrong\b|^before you\b|\bcheck this\b|\bthis (small )?(detail|setting|step) (causes|can cause|costs?)\b/i],
  // before Reaction, so "here's what it actually does" reads as showing it
  ['demonstration', 'Demonstration', /^(watch|look|see) (this|how|me|what (it|this) (does|can do))\b|\bin (\d+|one|two|three|five|ten) (seconds|clicks|taps|steps)\b|\bhere'?s (it|this) (working|in action)\b|^here'?s what .+ (actually )?does\b|\b(a )?faster way to\b/i],
  ['reaction', 'Reaction', /^(wait|no way|wow|omg|hold on|bro|okay but|ok but)\b|\bcan actually\b|\bactually (do|does|works?)\b|^i wasn'?t ready\b|\bhad to look (at it )?twice\b|^this was my reaction\b/i],
  ['callout', 'Callout', /^(attention|calling all|if you'?re an?|for (all )?(the )?\w+ who)\b|^[\w' -]{3,48}:\s*$/i],
  ['curiosity', 'Curiosity', /\bhere'?s (why|how|what)\b|\bthe (reason|real reason|secret|trick)\b|\bnobody (tells|told) you\b|\bi (found|discovered|figured out)\b|\bwhat happened\b|\bchanged (how|the way|everything)\b|\b(until|then) (i|this)\b|^i (didn'?t|did not|never) expect\b|\bthe one thing\b|\bpeople (miss|overlook)\b|^watch what happens\b/i],
  ['problem-solution', 'Problem-solution', /\b(still|tired of|sick of|struggling|hate|losing|wasting|spending (hours|days)|can'?t (get|stop|find)|too many)\b|^if .+,? try this\b|\b(a )?(simpler|easier|smarter|better) way to\b|\bthe hard way\b/i],
  ['question', 'Question', /\?\s*$|^(what|which|why|how|do|does|did|is|are|can|could|should|would|will|have|what if)\b/i],
];
// The pattern interrupt is the visual layer's type: a hook-fx that breaks the scroll.
const INTERRUPTS = ['glitch', 'shake', 'flash', 'montage'];
const TYPE_NAMES = new Map([...TYPES.map(([id, name]) => [name.toLowerCase(), id]), ['pattern interrupt', 'pattern-interrupt']]);
const nameOf = (id) => (id === 'pattern-interrupt' ? 'Pattern interrupt' : (TYPES.find((t) => t[0] === id) || [])[1] || id);

const THROAT_CLEARING = /^(hey|hi|hello|so,? |ok(ay)?,? |um|uh|today|welcome|what'?s up|in this video|let me (tell|show) you|i want(ed)? to (talk|share|show))/i;
const GENERIC = /^(here are (some|a few)|did you know|tips (for|on)|a few things|some tips|things you should know|let'?s talk about)\b/i;
// questions that would fit any video, and give no reason to care
const GENERIC_QUESTION = /^(do you (like|love) (this|it|these)|what do you think( about (this|it))?|thoughts|can you relate|isn'?t (this|it) (cool|great|nice|amazing)|any (thoughts|ideas))\W*$/i;
const CLICKBAIT = /\b(you won'?t believe|will blow your mind|mind[- ]?blowing|shocking|doctors hate|gone wrong|not clickbait|insane trick)\b/i;
const OBVIOUS_NO = /^(do you|want to|would you like to|are you ready to)\s+(waste|lose|fail|be broke|stay poor|overpay|look bad)/i;
const SPECIFIC = /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|first|last|every|never|mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?|today|tonight|mornings?|weekends?)\b|:/i;
const VIEWER = /\b(you|your|you'?re|you'?ll|you'?ve|yourself)\b|^pov\b|:\s*$/i;
const NUMBER_CLAIM = /\d+(\.\d+)?\s*(%|percent|x\b|times\b)|\$\s?\d|\b\d+\s*(hours?|minutes?|days?|weeks?)\b.*\b(faster|sooner|saved?|less|more)\b|\b(saved?|earned|made|grew|doubled|tripled)\b.*\d/i;
const CTA_VERBS = /\b(follow|subscribe|comment|link in bio|click|tap|download|sign up|try|book|buy|shop|join|dm|save this|share)\b/gi;
const REHOOK = /\b(but|here'?s the (thing|catch|part)|the best part|wait|and that'?s not all|the catch|here'?s where|plot twist|turns out|until)\b/i;

const plain = (s) => String(s || '').replace(/\*([^*]+)\*/g, '$1').replace(/~([^~\s](?:[^~]*[^~\s])?)~/g, '$1').trim();
const words = (s) => plain(s).split(/\s+/).filter(Boolean);

// Banned words from the Brand Voice (references/brand-voice.md), quoted one per bullet.
function bannedWords(file = path.join(ROOT, 'references', 'brand-voice.md')) {
  if (!fs.existsSync(file)) return [];
  const section = (/^## Banned Words[^\n]*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(fs.readFileSync(file, 'utf8')) || [])[1] || '';
  return [...section.matchAll(/^-\s*"?([^"\n]+?)"?\s*$/gm)].map((m) => m[1].trim().toLowerCase()).filter(Boolean);
}

// The rows of the Markdown table under a "## <heading>" in references/hooks.md, as arrays of cells.
function tableUnder(text, heading) {
  const section = (new RegExp(`^## ${heading}[^\\n]*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm').exec(text) || [])[1] || '';
  return section.split('\n').filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l)).slice(1)
    .map((l) => l.replace(/^\||\|\s*$/g, '').split('|').map((c) => c.trim().replace(/^`|`$/g, '')));
}

// From references/hooks.md: the hook types to try first for each goal ("Pick by the video's
// goal"), each type's shape ("Hook types"), and its templates ("Templates"). One source, so the
// file and this script can't disagree.
function readGuide(file = path.join(ROOT, 'references', 'hooks.md')) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const id = (name) => TYPE_NAMES.get(name.trim().toLowerCase());
  const goals = new Map(tableUnder(text, 'Pick by the video\'s goal').map(([goal, job, list]) => [goal.toLowerCase(), {
    job, types: (list || '').split(',').map((n) => id(n)).filter(Boolean),
  }]));
  const shapes = new Map(tableUnder(text, 'Hook types').map(([name, shape]) => [id(name), shape]).filter(([k]) => k));
  const templates = new Map(tableUnder(text, 'Templates').map(([name, list]) => [id(name), (list || '').split(' · ').map((s) => s.trim()).filter(Boolean)]).filter(([k]) => k));
  return { goals, shapes, templates };
}

// The goal's hook types, or a thrown error naming the goals there are.
function goalTypes(goal, guide = readGuide()) {
  const g = guide.goals.get(String(goal || '').trim().toLowerCase());
  if (!g) throw new Error(`goal: ${goal}? The goals with hook types are ${[...guide.goals.keys()].join(', ')}.`);
  return g;
}

// The type(s) a hook reads as, most specific first.
function classify(hook) {
  const text = plain(hook);
  return TYPES.filter(([, , re]) => re.test(text)).map(([id, name]) => ({ id, name }));
}

// One hook's findings: { hook, types, problems, advice, confirm }.
function checkHook(hook, { banned = bannedWords() } = {}) {
  const text = plain(hook);
  const n = words(text).length;
  const types = classify(text);
  const problems = [];
  const advice = [];
  const confirm = [];
  if (!text) return { hook, types, problems: ['empty'], advice, confirm };
  if (n > MAX_WORDS) problems.push(`${n} words on screen; keep it to ${MAX_WORDS} or fewer so it reads in a second (say the rest)`);
  else if (text.length > MAX_CHARS) advice.push(`${text.length} characters; under ${MAX_CHARS} reads faster`);
  if (THROAT_CLEARING.test(text)) problems.push('opens by clearing its throat; start on the point');
  if (GENERIC.test(text)) problems.push('a generic opener that fits any video; name the problem, the number, or the result');
  if (GENERIC_QUESTION.test(text)) problems.push('a generic question that fits any video and gives no reason to care; ask one about this video\'s problem or choice ("which one would you pick?")');
  if (CLICKBAIT.test(text)) problems.push('clickbait the video can\'t pay off; say what it actually shows');
  if (OBVIOUS_NO.test(text)) problems.push('a question with an obvious "no"; ask one the viewer answers "yes", or doesn\'t know');
  for (const w of banned) if (text.toLowerCase().includes(w)) problems.push(`"${w}" is on the Brand Voice's banned list`);
  if (!SPECIFIC.test(text) && !types.some((t) => ['pov', 'question', 'contrarian', 'reaction'].includes(t.id))) {
    advice.push('nothing specific in it: a number, a named situation, a day, or a concrete result makes it stop the scroll');
  }
  // (an imperative, "stop doing this", already talks to the viewer)
  if (!VIEWER.test(text) && !/^(stop|don'?t|never|quit|avoid|try|watch|look|see|meet|steal|use)\b/i.test(text)
      && !types.some((t) => ['storytelling', 'reaction', 'curiosity', 'demonstration'].includes(t.id))) {
    advice.push('it isn\'t about the viewer: a "you", a POV, or a callout of who it\'s for pulls the right people in');
  }
  if (NUMBER_CLAIM.test(text) || types.some((t) => t.id === 'statistic')) confirm.push('it states a number or a result: use it only if it\'s real and the user\'s to share');
  if (types.some((t) => t.id === 'offer') && OFFER_WORDS.test(text)) confirm.push('it leads with an offer: check the offer is live, and say its terms in the caption');
  if (types.some((t) => t.id === 'social-proof')) confirm.push('it leans on other people: only real customers or users, with their permission');
  if (!types.length) advice.push('it doesn\'t read as any one hook type; references/hooks.md has a table of types to borrow a shape from');
  return { hook, types, problems, advice, confirm };
}

// Several hooks to offer: each checked, and checked against each other (and, given a goal,
// against the types that suit it).
function compareHooks(hooks, { goal } = {}) {
  const results = hooks.map((h) => checkHook(h));
  const notes = [];
  const seen = new Map();
  results.forEach((r, i) => {
    const t = r.types[0] ? r.types[0].id : '';
    if (t && seen.has(t)) notes.push(`hooks ${seen.get(t) + 1} and ${i + 1} are both ${r.types[0].name}; a test between them only says which wording won. Make one a different type`);
    else if (t) seen.set(t, i);
  });
  if (goal) {
    const g = goalTypes(goal);
    results.forEach((r, i) => {
      if (r.types.length && !r.types.some((t) => g.types.includes(t.id))) {
        r.advice.push(`reads as ${r.types.map((t) => t.name).join(', ')}; to ${g.job.toLowerCase()}, ${g.types.map(nameOf).join(', ')} usually work better`);
      }
    });
    if (!results.some((r) => r.types.some((t) => g.types.includes(t.id)))) notes.push(`none of these is a type that suits goal: ${goal}; make at least one ${g.types.map(nameOf).join(', or ')} (hook.js --goal ${goal})`);
  }
  return { results, notes };
}

// The hook types to try first for a goal, each with its shape and templates, for writing three.
function suggest(goal) {
  const guide = readGuide();
  const g = goalTypes(goal, guide);
  return { goal, job: g.job, types: g.types.map((id) => ({ id, name: nameOf(id), shape: guide.shapes.get(id) || '', templates: guide.templates.get(id) || [] })) };
}

// A script's hook in all three layers, and the shape of what follows it.
function checkScript(file) {
  const { parseFrontmatter } = require('./compose');
  const { parseScript } = require('./voice');
  const EDIT = require('./edit');
  const { meta, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  const lines = parseScript(body).map((l) => ({ ...l, text: l.text.replace(/\s*\[(bg|shot|cut|card|source|sfx):[^\]]*\]/gi, '').trim(), raw: l.text })).filter((l) => l.text);
  const bold = String(meta.captions || '').toLowerCase() === 'bold';
  const out = { file, layers: {}, problems: [], advice: [], confirm: [] };
  if (!lines.length) {
    out.problems.push('no numbered lines');
    return out;
  }
  // the text on screen at frame 0
  const textHook = meta.hook || (bold ? lines[0].text : '');
  if (!textHook) out.problems.push('no hook: on screen: frame 0 is the cover and the swipe decision, and most viewers start muted');
  else {
    const r = checkHook(textHook);
    out.layers.text = r;
    out.problems.push(...r.problems.map((p) => `text hook: ${p}`));
    out.advice.push(...r.advice.map((p) => `text hook: ${p}`));
    out.confirm.push(...r.confirm.map((p) => `text hook: ${p}`));
  }
  // the first thing said
  const spoken = lines[0].text;
  const said = checkHook(spoken);
  out.layers.spoken = { line: spoken, types: said.types, seconds: Math.round((words(spoken).length / WORDS_PER_SECOND) * 10) / 10 };
  if (THROAT_CLEARING.test(plain(spoken))) out.problems.push('spoken hook: the first line clears its throat; start on the point');
  if (out.layers.spoken.seconds > 3.5) out.advice.push(`spoken hook: line 1 takes about ${out.layers.spoken.seconds}s to say; the hook should land in under 3, so split it`);
  if (textHook && !bold && plain(textHook).toLowerCase() === plain(spoken).toLowerCase()) {
    out.advice.push('the spoken hook repeats the text hook word for word; a spoken line that adds to it ("too many tools?" under "you\'re doing this the hard way") covers more ground');
  }
  // what moves in the first half second
  let edit = null;
  let look = null;
  try {
    look = require('./look').resolveLook(meta);
    edit = EDIT.resolveStyle(meta, { music: meta.music, energy: parseFloat(meta.energy) }, look);
  } catch (e) {
    out.problems.push(e.message);
  }
  const style = String(meta.style || 'photo').toLowerCase();
  const firstShot = (/\[shot:\s*([^\]]+)\]/i.exec(lines[0].raw) || [])[1] || '';
  out.layers.visual = { hookFx: edit ? edit.hook : 'unknown', edit: edit ? `${edit.name}, motion ${edit.motion}${look ? `, look ${look.name}${look.goal && !meta.look ? ` for goal: ${look.goal}` : ''}` : ''}` : 'unknown', firstShot: firstShot || (style === 'photo' ? 'a background' : `the ${style} style's first shot`) };
  if (edit && edit.hook === 'none' && edit.motion !== 'low') out.advice.push('visual hook: nothing moves in the first half second; set hook-fx: (zoom, shake, glitch, flash, bounce, or montage)');
  const types = [...(out.layers.text ? out.layers.text.types : []), ...said.types].map((t) => t.id);
  if (types.includes('demonstration') && style === 'photo' && !/\[bg:\s*assets\//i.test(lines[0].raw)) {
    out.advice.push('a demonstration hook should open on the product working: put the user\'s screen recording or screenshot behind line 1');
  }
  // what's heard first: the voice, and the sound under it (references/hooks.md, "Audio hooks")
  const hookAudio = String(meta['hook-audio'] || 'build').trim().toLowerCase();
  if (!['build', 'silence'].includes(hookAudio)) out.problems.push(`hook-audio: ${hookAudio}? Use build (the music builds into the drop) or silence (the voice alone, then the music lands)`);
  const noMusic = String(meta.music || '').trim().toLowerCase() === 'none';
  const fxSound = edit ? ({ shake: 'impact', glitch: 'glitch', flash: 'impact', zoom: edit.impact ? 'whoosh' : '' }[edit.hook] || '') : '';
  const lineSfx = ((/\[sfx:\s*([^\]]+)\]/i.exec(lines[0].raw) || [])[1] || '').trim();
  out.layers.audio = {
    voice: `line 1, from the first frame (about ${out.layers.spoken.seconds}s)`,
    under: noMusic ? 'no music' : hookAudio === 'silence' ? 'silence, then the music lands on the drop' : 'the music building into the drop',
    sfx: [fxSound, lineSfx].filter(Boolean),
  };
  // the pair the layers make, and whether it suits the video's job
  const layerTypes = [...new Set([
    edit && INTERRUPTS.includes(edit.hook) ? 'pattern-interrupt' : '',
    out.layers.text && out.layers.text.types[0] ? out.layers.text.types[0].id : '',
    said.types[0] ? said.types[0].id : '',
  ].filter(Boolean))];
  out.combination = layerTypes.map(nameOf).join(' + ');
  const goal = String(meta.goal || '').trim().toLowerCase();
  const g = goal && readGuide().goals.get(goal);
  if (g && layerTypes.length && !layerTypes.some((t) => g.types.includes(t))) {
    out.advice.push(`goal: ${goal}: the hook reads as ${out.combination}; to ${g.job.toLowerCase()}, ${g.types.map(nameOf).join(', ')} usually work better (hook.js --goal ${goal})`);
  }
  // a question the hook opens has to be answered in this video
  const opens = layerTypes.find((t) => ['curiosity', 'question', 'storytelling'].includes(t));
  if (opens && lines.length > 1) out.confirm.push(`the hook opens a question (${nameOf(opens)}): name the line that answers it, in this video rather than a part 2`);
  // a number on screen or in the voice needs its source on screen (references/visual-design.md)
  for (const l of lines) {
    if ((NUMBER_CLAIM.test(plain(l.text)) || classify(l.text).some((t) => t.id === 'statistic')) && !/\[source:/i.test(l.raw)) {
      out.confirm.push(`line ${l.n} states a number or a result: use it only if it's real, and add [source: ...] so the viewer sees where it's from`);
    }
  }
  // the shape behind it: the payoff early, one call to action, a re-hook in a longer video
  const total = lines.reduce((a, l) => a + words(l.text).length / WORDS_PER_SECOND + 0.35, 0);
  out.seconds = Math.round(total);
  const promise = /^(\d+|two|three|four|five|six|seven|eight|nine|ten)\b/i.exec(plain(textHook || spoken));
  if (promise) out.advice.push(`the hook promises ${promise[1]}: deliver every one, the first by about 40% of the way in`);
  const last = lines[lines.length - 1].text;
  const asks = new Set((`${last} ${meta.cta || ''}`.match(CTA_VERBS) || []).map((v) => v.toLowerCase()));
  if (!asks.size) out.advice.push('no call to action in the last line or cta:; end on one ask (follow, comment a word, try it)');
  if (asks.size > 2) out.advice.push(`the ending asks for ${[...asks].join(', ')}; one ask converts better than several`);
  if (total > 20 && !lines.slice(1, -1).some((l) => REHOOK.test(l.text))) {
    out.advice.push(`about ${out.seconds}s long with no re-hook: around the middle, a line like "but here's the part nobody tells you" holds the viewers who'd leave there`);
  }
  return out;
}

function printHook(r, label) {
  console.log(`${label}"${plain(r.hook)}"`);
  console.log(`  type: ${r.types.length ? r.types.map((t) => t.name).join(', ') : 'none clear'}`);
  for (const p of r.problems) console.log(`  ✗ ${p}`);
  for (const a of r.advice) console.log(`  · ${a}`);
  for (const c of r.confirm) console.log(`  ? ${c}`);
  if (!r.problems.length && !r.advice.length) console.log('  ✓ ready');
}

function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json');
  const si = argv.indexOf('--script');
  const gi = argv.indexOf('--goal');
  const goal = gi === -1 ? '' : argv[gi + 1] || '';
  const hooks = argv.filter((a, i) => a !== '--json' && (gi === -1 || (i !== gi && i !== gi + 1)));
  if (argv.includes('-h') || argv.includes('--help') || (si === -1 && !hooks.length && gi === -1)) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^[\s\S]*?\/\*/, '').replace(/^ \* ?/gm, ''));
    process.exit(argv.length ? 0 : 2);
  }
  if (si !== -1) {
    const file = argv[si + 1];
    if (!file || !fs.existsSync(file)) {
      console.error(`No script at ${file}`);
      process.exit(2);
    }
    const r = checkScript(file);
    if (json) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(`${path.basename(file)}, about ${r.seconds}s`);
      if (r.layers.text) console.log(`  text hook (frame 0):  "${plain(r.layers.text.hook)}"  ${r.layers.text.types.map((t) => t.name).join(', ') || ''}`);
      console.log(`  spoken hook (line 1): "${plain(r.layers.spoken.line)}"  ${[r.layers.spoken.types.map((t) => t.name).join(', '), `about ${r.layers.spoken.seconds}s`].filter(Boolean).join(', ')}`);
      if (r.layers.audio) console.log(`  heard under it:       ${r.layers.audio.under}${r.layers.audio.sfx.length ? `, with ${r.layers.audio.sfx.join(' and ')}` : ''}`);
      if (r.layers.visual) console.log(`  visual hook:          ${r.layers.visual.hookFx} (edit: ${r.layers.visual.edit}) over ${r.layers.visual.firstShot}`);
      if (r.combination) console.log(`  together:             ${r.combination}`);
      for (const p of r.problems) console.log(`  ✗ ${p}`);
      for (const a of r.advice) console.log(`  · ${a}`);
      for (const c of r.confirm) console.log(`  ? ${c}`);
      if (!r.problems.length && !r.advice.length) console.log('  ✓ ready');
    }
    process.exit(r.problems.length ? 1 : 0);
  }
  if (goal && !hooks.length) {
    let r;
    try {
      r = suggest(goal);
    } catch (e) {
      console.error(e.message);
      process.exit(2);
    }
    if (json) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(`goal: ${r.goal} (${r.job}). Write three hooks, each a different one of these types:`);
      for (const t of r.types) {
        console.log(`\n  ${t.name}${t.shape ? `: ${t.shape}` : ''}`);
        for (const tpl of t.templates) console.log(`    - ${tpl}`);
      }
      console.log('\nFill the brackets with the real situation, then check them: node hook.js --goal ' + `${r.goal} "one" "two" "three"`);
    }
    process.exit(0);
  }
  let compared;
  try {
    compared = compareHooks(hooks, { goal });
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  const { results, notes } = compared;
  if (json) console.log(JSON.stringify({ results, notes }, null, 2));
  else {
    results.forEach((r, i) => printHook(r, hooks.length > 1 ? `${i + 1}. ` : ''));
    for (const n of notes) console.log(`· ${n}`);
  }
  process.exit(results.some((r) => r.problems.length) ? 1 : 0);
}

if (require.main === module) main();

module.exports = { TYPES, classify, checkHook, compareHooks, checkScript, bannedWords, readGuide, goalTypes, suggest };
