#!/usr/bin/env node
'use strict';
/*
 * Free voiceover: turns a script into one WAV per line with Kokoro, an open-weight
 * text-to-speech model (Apache-2.0) that runs on this machine. No account, no API key,
 * no per-use cost. The files plug straight into render.js (data-voice on each scene).
 *
 * Usage:
 *   node voice.js <script> --out <dir> [--voice am_michael] [--speed 1] [--line 3] [--prefix voice-]
 *   node voice.js --voices                                   # every voice, with its quality grade
 *   node voice.js --audition <dir> "a line" [--voices af_heart,af_bella,am_michael,am_fenrir]
 *                                                           # the same line in several voices, to pick one
 *
 * The user's own voice, cloned, also free and local, through Voicebox (github.com/jamiepine/voicebox,
 * MIT), a desktop app that runs open voice models on their machine and answers on
 * http://127.0.0.1:17493 while it's open. A voice named "voicebox:<profile>" is spoken by it:
 *   node voice.js --voices voicebox                         # is it running, and the voice profiles in it
 *   node voice.js --clone "Maya" --sample me.m4a --my-voice [--transcript "what the sample says"] [--language en]
 *                                                           # a profile from 2 to 30 seconds of the user's speech
 *   node voice.js --design "Juno" --describe "a warm woman in her thirties, low and unhurried, a slight smile"
 *                                                           # a new voice that is nobody's, from a description (Qwen VoiceDesign)
 *   node voice.js --presets kokoro                          # Voicebox's ready-made voices (kokoro, qwen_custom_voice)
 *   node voice.js --preset "Aiden" --from qwen_custom_voice:Aiden   # one of them as a profile
 *   node voice.js <script> --out <dir> --voice voicebox:Maya
 *   node voice.js --audition <dir> "a line" --voices voicebox:Maya,af_heart
 * [--model chatterbox] picks one of Voicebox's engines instead of the profile's own, and
 * [--instructions "calm, a little slower"] is a delivery note for the engines that take one (Qwen).
 * VOICEBOX_URL points somewhere else (its Docker image answers on http://127.0.0.1:17600).
 *
 * <script> is a text or Markdown file. Numbered lines ("1. ...") become voice-1.wav,
 * voice-2.wav, ...; with no numbered lines, each paragraph is a line. Anything after the
 * first "## " heading is ignored, so notes can follow the script. Each WAV gets a .json next
 * to it with its sentences' start and end times, which captions.js uses to time captions.
 *
 * One-time setup, from this folder: `npm install kokoro-js` (about 600 MB, mostly the ONNX
 * runtime). The first run also downloads the model (about 90 MB) from Hugging Face and
 * caches it; after that it works offline.
 *
 * Kokoro's are synthetic stock voices, not clones of anyone. A Voicebox profile can be a
 * clone: only of the user, or of someone who agreed to it (--clone asks for --my-voice to say
 * so). Either way, if a platform asks whether a video uses AI-generated audio, say yes.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const DEFAULT_VOICE = 'af_heart';
const SENTENCE_GAP = 0.12; // seconds of silence between sentences of one line
const VOICEBOX_URL = (process.env.VOICEBOX_URL || 'http://127.0.0.1:17493').replace(/\/+$/, '');
const SAMPLE_TYPES = ['.wav', '.mp3', '.m4a', '.ogg', '.flac', '.aac', '.webm', '.opus'];

function fail(message) {
  console.error(message);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--voices' && (argv[i + 1] === undefined || argv[i + 1].startsWith('--'))) args.listVoices = true;
    else if (a === '--voices' && argv[i + 1].toLowerCase() === 'voicebox') { args.listVoices = 'voicebox'; i++; }
    else if (a === '--my-voice') args.myVoice = true;
    else if (['--out', '--voice', '--speed', '--line', '--prefix', '--audition', '--voices', '--quality', '--clone', '--sample', '--design', '--describe', '--presets', '--preset', '--from', '--transcript', '--language', '--model', '--instructions'].includes(a)) args[a.slice(2)] = argv[++i];
    else if (a === '-h' || a === '--help') args.help = true;
    else args.positional.push(a);
  }
  return args;
}

// The lines to speak: numbered lines if there are any, otherwise paragraphs.
function parseScript(text) {
  const body = text.split(/\n## /)[0];
  const numbered = [...body.matchAll(/^\s*(\d+)[.)]\s+(.+)$/gm)].map((m) => ({ n: Number(m[1]), text: m[2].trim() }));
  if (numbered.length) return numbered;
  return body.split(/\n\s*\n/).map((p) => p.replace(/^#.*$/gm, '').replace(/\s+/g, ' ').trim()).filter(Boolean)
    .map((t, i) => ({ n: i + 1, text: t }));
}

// 16-bit mono WAV from float samples.
function wav(samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buf;
}

async function loadKokoro() {
  let mod;
  try {
    mod = await import('kokoro-js');
  } catch (e) {
    if (e.code !== 'ERR_MODULE_NOT_FOUND' && e.code !== 'MODULE_NOT_FOUND') throw e;
    fail('The free voice needs kokoro-js. From this folder (scripts/video) run, once:\n  npm install kokoro-js\n(about 600 MB, mostly the ONNX runtime it runs on).');
  }
  return mod.KokoroTTS;
}

// The voice list ships inside kokoro-js, so it's readable without loading the model.
async function voiceList() {
  const KokoroTTS = await loadKokoro();
  return new KokoroTTS(null, null).voices;
}

async function loadModel(quality) {
  const KokoroTTS = await loadKokoro();
  try {
    return await KokoroTTS.from_pretrained(MODEL, { dtype: quality || 'q8', device: 'cpu' });
  } catch (e) {
    fail(`Couldn't load the voice model (${e.message.split('\n')[0]}).\n` +
      'The first run downloads it once (about 90 MB) from huggingface.co and caches it; check the connection, or that huggingface.co is allowed on this network.');
  }
}

// Speaks one line, sentence by sentence (the model handles a few hundred characters at a
// time), with a short pause between sentences. Returns { samples, rate, sentences }, where
// sentences holds each sentence's text and start and end in seconds (captions.js uses them as
// exact boundaries when timing word-by-word captions).
async function speak(tts, text, voice, speed) {
  const chunks = [];
  const texts = [];
  let rate = 24000;
  for await (const { text: said, audio } of tts.stream(text, { voice, speed })) {
    rate = audio.sampling_rate;
    chunks.push(audio.audio);
    texts.push(typeof said === 'string' ? said.trim() : null);
  }
  return joinSentences(chunks, texts, rate);
}

// ---- Voicebox: the user's own (cloned) voice, from the Voicebox app running on this machine

// "voicebox:Maya" -> "Maya"; "voicebox:" -> "" (Voicebox's own default voice); anything else -> null.
function voiceboxProfile(voice) {
  const m = /^voicebox:(.*)$/i.exec(String(voice || '').trim());
  return m ? m[1].trim() : null;
}

// One request to the Voicebox app. Plain http, not fetch: a first line on a slow machine can
// take minutes while the model loads, and fetch gives up after five.
function voicebox(method, route, { json, body, headers } = {}) {
  const url = new URL(VOICEBOX_URL + route);
  const data = json !== undefined ? Buffer.from(JSON.stringify(json)) : body;
  const head = { 'X-Voicebox-Client-Id': 'marketing-skill', ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers };
  if (data) head['Content-Length'] = data.length;
  return new Promise((resolve) => {
    const req = (url.protocol === 'https:' ? https : http).request(url, { method, headers: head }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode >= 200 && res.statusCode < 300) return resolve(buf);
        let why = buf.toString('utf8').slice(0, 400);
        try {
          const j = JSON.parse(buf.toString('utf8'));
          why = (j.error && j.error.message) || (typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail || j));
        } catch (e) { /* not JSON: the text as it is */ }
        fail(`Voicebox said no (${res.statusCode}, ${method} ${route}): ${why}`);
      });
    });
    req.on('error', (e) => fail(`Voicebox isn't answering at ${VOICEBOX_URL} (${e.code || e.message}).\n` +
      'It\'s a free desktop app (github.com/jamiepine/voicebox) and serves voices only while it\'s open, on the machine this runs on:\n' +
      'install it, open it, download a voice model in it (Models), and try again. If it runs somewhere else\n' +
      '(its Docker image answers on http://127.0.0.1:17600), set VOICEBOX_URL. Or use a Kokoro voice: node voice.js --voices'));
    if (data) req.write(data);
    req.end();
  });
}

async function voiceboxProfiles() {
  return JSON.parse((await voicebox('GET', '/profiles')).toString('utf8'));
}

// The profile a "voicebox:<name>" voice means (by name, any case, or by id), or a stop that lists the ones there are.
async function findProfile(name) {
  const profiles = await voiceboxProfiles();
  const hit = profiles.find((p) => p.id === name || p.name.toLowerCase() === name.toLowerCase());
  if (hit) return hit;
  fail(`No voice profile "${name}" in Voicebox. ${profiles.length ? `It has: ${profiles.map((p) => p.name).join(', ')}.` : 'It has none yet.'}\n` +
    'Make one from a recording of the user: node voice.js --clone "<name>" --sample <recording> --my-voice');
}

// Float samples from a WAV file's bytes: 16-, 24- or 32-bit PCM or 32-bit float, any channel count (mixed to mono).
function decodeWav(buf) {
  if (buf.length < 12 || buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WAVE') throw new Error('not a WAV file');
  let fmt = null;
  let at = 12;
  while (at + 8 <= buf.length) {
    const id = buf.toString('latin1', at, at + 4);
    let size = buf.readUInt32LE(at + 4);
    const start = at + 8;
    if (id === 'fmt ') {
      fmt = { code: buf.readUInt16LE(start), channels: buf.readUInt16LE(start + 2), rate: buf.readUInt32LE(start + 4), bits: buf.readUInt16LE(start + 14) };
      if (fmt.code === 0xfffe && size >= 26) fmt.code = buf.readUInt16LE(start + 24); // WAVE_FORMAT_EXTENSIBLE: the real format is in the subformat
    } else if (id === 'data') {
      if (!fmt) throw new Error('WAV data before its format');
      if (start + size > buf.length) size = buf.length - start; // a streamed file that never wrote its length
      const bytes = fmt.bits / 8;
      const read = fmt.code === 3 && fmt.bits === 32 ? (o) => buf.readFloatLE(o)
        : fmt.code === 1 && fmt.bits === 16 ? (o) => buf.readInt16LE(o) / 32768
          : fmt.code === 1 && fmt.bits === 24 ? (o) => buf.readIntLE(o, 3) / 8388608
            : fmt.code === 1 && fmt.bits === 32 ? (o) => buf.readInt32LE(o) / 2147483648
              : null;
      if (!read || !fmt.channels) throw new Error(`a WAV encoding this doesn't read (format ${fmt.code}, ${fmt.bits}-bit)`);
      const frames = Math.floor(size / (bytes * fmt.channels));
      const samples = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let sum = 0;
        for (let c = 0; c < fmt.channels; c++) sum += read(start + (i * fmt.channels + c) * bytes);
        samples[i] = sum / fmt.channels;
      }
      return { samples, rate: fmt.rate };
    }
    at = start + size + (size % 2);
  }
  throw new Error('WAV file with no audio in it');
}

// A line's sentences, so each can be timed. "Dr. Lee", "3.5 seconds", and '"Yes!" she said' stay whole.
function splitSentences(text) {
  const parts = text.trim().split(/(?<=[.!?…]["')\]]?)\s+(?=[^\p{Ll}\s])/u);
  const out = [];
  for (const p of parts) {
    if (out.length && /(?:^|\s)(?:Mr|Mrs|Ms|Dr|Prof|St|vs|etc|No|e\.g|i\.e)\.$/i.test(out[out.length - 1])) out[out.length - 1] += ` ${p}`;
    else out.push(p);
  }
  return out.filter(Boolean);
}

// The quiet a model leaves before and after a sentence, cut to 20 ms, so the sentence times are the speech's.
function trimQuiet(samples, rate) {
  const floor = 0.01;
  let a = 0;
  let b = samples.length;
  while (a < b && Math.abs(samples[a]) < floor) a++;
  while (b > a && Math.abs(samples[b - 1]) < floor) b--;
  if (a === b) return samples;
  const pad = Math.round(0.02 * rate);
  return samples.subarray(Math.max(0, a - pad), Math.min(samples.length, b + pad));
}

// Chunks of samples joined with a pause between them, and where each one starts and ends.
function joinSentences(chunks, texts, rate) {
  const gap = Math.round(SENTENCE_GAP * rate);
  const total = chunks.reduce((n, c) => n + c.length, 0) + gap * Math.max(0, chunks.length - 1);
  const samples = new Float32Array(total);
  const sentences = [];
  let at = 0;
  chunks.forEach((c, i) => {
    samples.set(c, at);
    sentences.push({ text: texts[i], start: +(at / rate).toFixed(3), end: +((at + c.length) / rate).toFixed(3) });
    at += c.length + (i < chunks.length - 1 ? gap : 0);
  });
  return { samples, rate, sentences: sentences.every((x) => x.text) ? sentences : [] };
}

// One line in a Voicebox voice, a sentence per request, in the same shape speak() returns.
async function speakVoicebox(profile, text, speed, { model, instructions } = {}) {
  const texts = splitSentences(text);
  const chunks = [];
  let rate = 0;
  for (const input of texts) {
    const body = { model: model || 'tts-1', input, response_format: 'wav', speed };
    if (profile) body.voice = profile;
    if (instructions) body.instructions = instructions;
    const got = await voicebox('POST', '/v1/audio/speech', { json: body });
    let audio;
    try {
      audio = decodeWav(got);
    } catch (e) {
      fail(`Voicebox answered with something that isn't speech (${e.message}).`);
    }
    if (rate && audio.rate !== rate) fail(`Voicebox changed its sample rate mid-line (${rate} then ${audio.rate} Hz).`);
    rate = audio.rate;
    chunks.push(trimQuiet(audio.samples, rate));
  }
  return joinSentences(chunks, texts, rate);
}

function multipart(fields, file) {
  const boundary = `----marketing-skill-${Date.now().toString(16)}`;
  const parts = [];
  for (const [k, v] of Object.entries(fields)) parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="sample${path.extname(file).toLowerCase()}"\r\nContent-Type: application/octet-stream\r\n\r\n`));
  parts.push(fs.readFileSync(file), Buffer.from(`\r\n--${boundary}--\r\n`));
  return { body: Buffer.concat(parts), headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` } };
}

// A voice profile in Voicebox from a recording of the user (or one more sample for a profile that's there).
async function clone(args) {
  const name = String(args.clone || '').trim();
  const usage = 'node voice.js --clone "<name>" --sample <recording> --my-voice [--transcript "what the recording says"] [--language en]';
  if (!name || !args.sample) fail(`Usage: ${usage}`);
  if (!args.myVoice) {
    fail('A cloned voice is only for the user\'s own voice, or the voice of someone who agreed to it.\n' +
      `Ask whose voice the recording is. If it's theirs or they have that person's permission, add --my-voice:\n  ${usage}`);
  }
  if (!fs.existsSync(args.sample)) fail(`No recording at ${args.sample}`);
  if (!SAMPLE_TYPES.includes(path.extname(args.sample).toLowerCase())) fail(`${args.sample}: Voicebox takes ${SAMPLE_TYPES.join(', ')}. Convert it first, e.g. ffmpeg -i ${args.sample} sample.wav`);
  const profiles = await voiceboxProfiles();
  let transcript = String(args.transcript || '').trim();
  if (!transcript) {
    console.log('No --transcript, so Voicebox is transcribing the recording (Whisper)...');
    const form = multipart(args.language ? { language: args.language } : {}, args.sample);
    transcript = JSON.parse((await voicebox('POST', '/transcribe', form)).toString('utf8')).text.trim();
    if (!transcript) fail('Voicebox heard no words in the recording. Pass them with --transcript "..."');
    console.log(`Heard: "${transcript}"\nIf that's not what was said, delete the profile in Voicebox and run this again with --transcript.`);
  }
  if (transcript.length > 1000) fail('The transcript is over 1,000 characters; use a shorter recording (2 to 30 seconds).');
  let profile = profiles.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (profile && profile.voice_type !== 'cloned') fail(`"${profile.name}" in Voicebox is a ${profile.voice_type} voice, not a cloned one; pick another name.`);
  if (!profile) {
    profile = JSON.parse((await voicebox('POST', '/profiles', { json: { name, language: args.language || 'en', voice_type: 'cloned', description: 'Made by marketing-skill from the user\'s own recording.' } })).toString('utf8'));
    console.log(`Made the voice profile "${profile.name}" in Voicebox.`);
  }
  await voicebox('POST', `/profiles/${encodeURIComponent(profile.id)}/samples`, multipart({ reference_text: transcript }, args.sample));
  console.log(`Added ${args.sample} to "${profile.name}". Use it as:  --voice "voicebox:${profile.name}"  (or voice: voicebox:${profile.name} in a script)\n` +
    `Hear it first:  node voice.js --audition samples "A line from the script." --voices "voicebox:${profile.name}"`);
}

const PRESET_ENGINES = ['kokoro', 'qwen_custom_voice'];

async function presetVoices(engine) {
  if (!PRESET_ENGINES.includes(engine)) fail(`Voicebox's ready-made voices come from: ${PRESET_ENGINES.join(', ')}. e.g. node voice.js --presets kokoro`);
  return JSON.parse((await voicebox('GET', `/profiles/presets/${engine}`)).toString('utf8')).voices || [];
}

// A new profile, unless the name is taken (Voicebox keeps names unique).
async function newProfile(name, fields) {
  const taken = (await voiceboxProfiles()).find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (taken) fail(`Voicebox already has a voice called "${taken.name}" (${taken.voice_type}). Use it as voicebox:${taken.name}, pick another name, or delete it in the app first.`);
  const profile = JSON.parse((await voicebox('POST', '/profiles', { json: { name, ...fields } })).toString('utf8'));
  console.log(`Made the voice "${profile.name}" in Voicebox. Use it as:  --voice "voicebox:${profile.name}"  (or voice: voicebox:${profile.name} in a script)\n` +
    `Hear it first:  node voice.js --audition samples "A line from the script." --voices "voicebox:${profile.name}"`);
  return profile;
}

// A voice that is nobody's, made from a description of how it should sound.
async function design(args) {
  const name = String(args.design || '').trim();
  const describe = String(args.describe || '').trim();
  if (!name || !describe) fail('Usage: node voice.js --design "<name>" --describe "<how the voice sounds: who, age, pitch, pace, mood, accent>" [--language en]');
  if (describe.length > 2000) fail('Keep the description under 2,000 characters.');
  await newProfile(name, { language: args.language || 'en', voice_type: 'designed', design_prompt: describe, description: describe.slice(0, 500) });
  console.log('It speaks with the Qwen VoiceDesign model: download it in Voicebox (Models) if the first line says it isn\'t there.\n' +
    'To change how it sounds, make another under a new name with a different description.');
}

async function presets(engine) {
  const voices = await presetVoices(String(engine).toLowerCase());
  for (const v of voices) console.log(`${`${String(engine).toLowerCase()}:${v.voice_id}`.padEnd(30)} ${String(v.name).padEnd(12)} ${String(v.language).padEnd(4)} ${v.gender}`);
}

async function preset(args) {
  const name = String(args.preset || '').trim();
  const m = /^([a-z_]+):(.+)$/i.exec(String(args.from || '').trim());
  if (!name || !m) fail('Usage: node voice.js --preset "<name>" --from <engine>:<voice id>   (node voice.js --presets kokoro lists them)');
  const engine = m[1].toLowerCase();
  const voice = (await presetVoices(engine)).find((v) => v.voice_id.toLowerCase() === m[2].trim().toLowerCase());
  if (!voice) fail(`No ready-made voice "${m[2]}" in ${engine}; node voice.js --presets ${engine} lists them.`);
  await newProfile(name, { language: args.language || voice.language || 'en', voice_type: 'preset', preset_engine: engine, preset_voice_id: voice.voice_id });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.listVoices && !args.audition && !args.clone && !args.design && !args.preset && !args.presets && !args.positional.length)) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^[\s\S]*?\/\*/, '').replace(/^ \* ?/gm, ''));
    process.exit(args.help ? 0 : 2);
  }

  if (args.clone) return clone(args);
  if (args.design) return design(args);
  if (args.presets) return presets(args.presets);
  if (args.preset) return preset(args);

  if (args.listVoices === 'voicebox') {
    const profiles = await voiceboxProfiles();
    console.log(`Voicebox is running at ${VOICEBOX_URL}.`);
    if (!profiles.length) console.log('No voice profiles in it yet. Make one from a recording of the user:\n  node voice.js --clone "<name>" --sample <recording> --my-voice');
    for (const p of profiles) {
      const kind = p.voice_type === 'cloned' ? `cloned, ${p.sample_count} sample${p.sample_count === 1 ? '' : 's'}` : p.voice_type;
      console.log(`${`voicebox:${p.name}`.padEnd(28)} ${p.language.padEnd(4)} ${kind}${p.default_engine || p.preset_engine ? `, ${p.default_engine || p.preset_engine}` : ''}`);
    }
    return;
  }

  if (args.listVoices) {
    const voices = await voiceList();
    for (const [id, v] of Object.entries(voices)) {
      console.log(`${id.padEnd(14)} ${v.name.padEnd(10)} ${v.language.padEnd(6)} ${v.gender.padEnd(7)} grade ${v.overallGrade}`);
    }
    return;
  }

  const speed = args.speed ? Number(args.speed) : 1;
  if (!(speed > 0.5 && speed < 2)) fail('--speed should be between 0.5 and 2.');
  const how = { model: args.model, instructions: args.instructions };

  if (args.audition) {
    const text = args.positional.join(' ').trim();
    if (!text) fail('Give the line to audition, e.g. node voice.js --audition samples "Here is how it works."');
    const ids = (args.voices || 'af_heart,af_bella,am_michael,am_fenrir').split(',').map((v) => v.trim()).filter(Boolean);
    const stock = ids.filter((id) => voiceboxProfile(id) === null);
    const known = stock.length ? await voiceList() : {};
    for (const id of stock) if (!known[id]) fail(`Unknown voice "${id}"; node voice.js --voices lists them.`);
    for (const id of ids) if (voiceboxProfile(id)) await findProfile(voiceboxProfile(id));
    const tts = stock.length ? await loadModel(args.quality) : null;
    fs.mkdirSync(args.audition, { recursive: true });
    for (const id of ids) {
      const profile = voiceboxProfile(id);
      const { samples, rate } = profile === null ? await speak(tts, text, id, speed) : await speakVoicebox(profile, text, speed, how);
      const file = path.join(args.audition, `${id.replace(/[^\w.-]+/g, '-')}.wav`);
      fs.writeFileSync(file, wav(samples, rate));
      console.log(`${file}: ${(samples.length / rate).toFixed(2)}s`);
    }
    return;
  }

  const scriptFile = args.positional[0];
  if (!fs.existsSync(scriptFile)) fail(`No script at ${scriptFile}`);
  if (!args.out) fail('Pass --out <dir> for the voice files (usually the page\'s assets/ folder).');
  const lines = parseScript(fs.readFileSync(scriptFile, 'utf8')).filter((l) => !args.line || l.n === Number(args.line));
  if (!lines.length) fail(args.line ? `No line ${args.line} in ${scriptFile}` : `No lines found in ${scriptFile}`);
  const voice = args.voice || DEFAULT_VOICE;
  const profile = voiceboxProfile(voice);
  if (profile) await findProfile(profile);
  else if (profile === null && !(await voiceList())[voice]) fail(`Unknown voice "${voice}"; node voice.js --voices lists them.`);
  const tts = profile === null ? await loadModel(args.quality) : null;
  fs.mkdirSync(args.out, { recursive: true });
  for (const { n, text } of lines) {
    const { samples, rate, sentences } = profile === null ? await speak(tts, text, voice, speed) : await speakVoicebox(profile, text, speed, how);
    const file = path.join(args.out, `${args.prefix || 'voice-'}${n}.wav`);
    fs.writeFileSync(file, wav(samples, rate));
    // sentence timings for captions.js, next to the clip
    fs.writeFileSync(file.replace(/\.wav$/, '.json'), JSON.stringify({ text, voice, speed, sentences }, null, 2) + '\n');
    console.log(`${file}: ${(samples.length / rate).toFixed(2)}s  ${text.slice(0, 50)}${text.length > 50 ? '...' : ''}`);
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { parseScript, wav, speak, decodeWav, splitSentences, voiceboxProfile };
