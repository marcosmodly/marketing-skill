#!/usr/bin/env node
'use strict';
/*
 * Checks hooks before a video is made: what type each one is (references/hooks.md has the
 * table), and what would make it lose the viewer in the first second. With several hooks, it
 * checks they're different types, so a test between them means something. With a script, it
 * checks all three layers of the hook (the words on screen, the first spoken line, and what
 * moves in the first half second) and the shape of the video behind it.
 *
 * Usage:
 *   node hook.js "you're losing money on every late invoice"
 *   node hook.js "hook one" "hook two" "hook three"     # three to offer: each a different type?
 *   node hook.js --script state/videos/2026-10-31-invoices.md
 *   add --json for the findings as JSON
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
const TYPES = [
  ['pov', 'POV', /^pov\b/i],
  ['storytelling', 'Storytelling', /^(\w+|\d+) (days?|weeks?|months?|years?) ago\b|^(last|this) (week|month|year)\b|^(when|the day) i\b|^i (almost|nearly|once|quit|lost|tried)\b/i],
  ['before-after', 'Before and after', /\bbefore (and|&|\/) after\b|\bused to\b.*\bnow\b|\bnow (it'?s|it takes|i)\b|\bfrom \S+ to \S+/i],
  ['offer', 'Offer', /\b(free|trial|discount|\d+% off|off today|promo|coupon|code|deal|giveaway)\b/i],
  ['social-proof', 'Social proof', /\b(customers|clients|users|teams?|people|companies|creators|founders)\b.*\b(switched|started using|love|swear by|use)\b|\bwhy (our|my) team\b|\b(reviews?|testimonials?|rated)\b/i],
  ['statistic', 'Statistic', /\b\d+(\.\d+)?\s*(%|percent|x\b|times\b|hours?|minutes?|days?|weeks?|\$)|\$\s?\d|\b\d{2,}\b.*\b(lose|lost|spend|waste|save|saved|earn|made)\b/i],
  ['listicle', 'Listicle', /^(\d+|two|three|four|five|six|seven|eight|nine|ten)\s+\w+/i],
  ['warning', 'Warning', /^(stop|don'?t|never|quit|avoid)\b|\bmistakes?\b|\b(doing|writing|using) (it|this|your \w+) wrong\b|\bwrong\b/i],
  ['contrarian', 'Contrarian', /\byou don'?t need\b|\bnobody needs\b|\bunpopular opinion\b|\bis (dead|overrated|a lie|a scam|a trap)\b|\b(forget|ignore) (about )?(everything|what)\b|\bactually (bad|wrong)\b/i],
  ['reaction', 'Reaction', /^(wait|no way|wow|omg|hold on|bro|okay but|ok but)\b|\bcan actually\b|\bactually (do|does|works?)\b/i],
  ['demonstration', 'Demonstration', /^(watch|look|see) (this|how|me|what)\b|\bin (\d+|one|two|three|five|ten) (seconds|clicks|taps|steps)\b|\bhere'?s (it|this) (working|in action)\b/i],
  ['callout', 'Callout', /^(attention|calling all|if you'?re an?|for (all )?(the )?\w+ who)\b|^[\w' -]{3,48}:\s*$/i],
  ['curiosity', 'Curiosity', /\bhere'?s (why|how|what)\b|\bthe (reason|real reason|secret|trick)\b|\bnobody (tells|told) you\b|\bi (found|discovered|figured out)\b|\bwhat happened\b|\bchanged (how|the way|everything)\b|\b(until|then) (i|this)\b/i],
  ['problem-solution', 'Problem-solution', /\b(still|tired of|sick of|struggling|hate|losing|wasting|spending (hours|days)|can'?t (get|stop|find)|too many)\b/i],
  ['question', 'Question', /\?\s*$|^(what|why|how|do|does|did|is|are|can|could|should|would|will|have|what if)\b/i],
];

const THROAT_CLEARING = /^(hey|hi|hello|so,? |ok(ay)?,? |um|uh|today|welcome|what'?s up|in this video|let me (tell|show) you|i want(ed)? to (talk|share|show))/i;
const GENERIC = /^(here are (some|a few)|did you know|tips (for|on)|a few things|some tips|things you should know|let'?s talk about)\b/i;
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
  if (types.some((t) => t.id === 'offer')) confirm.push('it leads with an offer: check the offer is live, and say its terms in the caption');
  if (types.some((t) => t.id === 'social-proof')) confirm.push('it leans on other people: only real customers or users, with their permission');
  if (!types.length) advice.push('it doesn\'t read as any one hook type; references/hooks.md has a table of types to borrow a shape from');
  return { hook, types, problems, advice, confirm };
}

// Several hooks to offer: each checked, and checked against each other.
function compareHooks(hooks) {
  const results = hooks.map((h) => checkHook(h));
  const notes = [];
  const seen = new Map();
  results.forEach((r, i) => {
    const t = r.types[0] ? r.types[0].id : '';
    if (t && seen.has(t)) notes.push(`hooks ${seen.get(t) + 1} and ${i + 1} are both ${r.types[0].name}; a test between them only says which wording won. Make one a different type`);
    else if (t) seen.set(t, i);
  });
  return { results, notes };
}

// A script's hook in all three layers, and the shape of what follows it.
function checkScript(file) {
  const { parseFrontmatter } = require('./compose');
  const { parseScript } = require('./voice');
  const EDIT = require('./edit');
  const { meta, body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  const lines = parseScript(body).map((l) => ({ ...l, text: l.text.replace(/\s*\[(bg|shot|cut|card|source):[^\]]*\]/gi, '').trim(), raw: l.text })).filter((l) => l.text);
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
  try {
    edit = EDIT.resolveStyle(meta, { music: meta.music, energy: parseFloat(meta.energy) }, require('./look').resolveLook(meta));
  } catch (e) {
    out.problems.push(e.message);
  }
  const style = String(meta.style || 'photo').toLowerCase();
  const firstShot = (/\[shot:\s*([^\]]+)\]/i.exec(lines[0].raw) || [])[1] || '';
  out.layers.visual = { hookFx: edit ? edit.hook : 'unknown', edit: edit ? `${edit.name}, motion ${edit.motion}${meta.look || meta.goal ? `, look ${meta.look || meta.goal}` : ''}` : 'unknown', firstShot: firstShot || (style === 'photo' ? 'a background' : `the ${style} style's first shot`) };
  if (edit && edit.hook === 'none' && edit.motion !== 'low') out.advice.push('visual hook: nothing moves in the first half second; set hook-fx: (zoom, shake, glitch, flash, bounce, or montage)');
  const types = [...(out.layers.text ? out.layers.text.types : []), ...said.types].map((t) => t.id);
  if (types.includes('demonstration') && style === 'photo' && !/\[bg:\s*assets\//i.test(lines[0].raw)) {
    out.advice.push('a demonstration hook should open on the product working: put the user\'s screen recording or screenshot behind line 1');
  }
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
  const hooks = argv.filter((a) => a !== '--json');
  if (argv.includes('-h') || argv.includes('--help') || (si === -1 && !hooks.length)) {
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
      if (r.layers.visual) console.log(`  visual hook:          ${r.layers.visual.hookFx} (edit: ${r.layers.visual.edit}) over ${r.layers.visual.firstShot}`);
      for (const p of r.problems) console.log(`  ✗ ${p}`);
      for (const a of r.advice) console.log(`  · ${a}`);
      for (const c of r.confirm) console.log(`  ? ${c}`);
      if (!r.problems.length && !r.advice.length) console.log('  ✓ ready');
    }
    process.exit(r.problems.length ? 1 : 0);
  }
  const { results, notes } = compareHooks(hooks);
  if (json) console.log(JSON.stringify({ results, notes }, null, 2));
  else {
    results.forEach((r, i) => printHook(r, hooks.length > 1 ? `${i + 1}. ` : ''));
    for (const n of notes) console.log(`· ${n}`);
  }
  process.exit(results.some((r) => r.problems.length) ? 1 : 0);
}

if (require.main === module) main();

module.exports = { TYPES, classify, checkHook, compareHooks, checkScript, bannedWords };
