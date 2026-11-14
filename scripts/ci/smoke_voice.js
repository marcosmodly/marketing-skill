#!/usr/bin/env node
'use strict';
/*
 * Checks voice.js's Voicebox path against a stand-in for the Voicebox app: the same routes
 * and answers (GET /profiles, GET /profiles/presets/<engine>, POST /profiles, POST /profiles/<id>/samples, POST /transcribe,
 * POST /v1/audio/speech), with a tone where the speech would be. No model, no network.
 *   node scripts/ci/smoke_voice.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFile } = require('child_process');

const VOICE = path.join(__dirname, '..', 'video', 'voice.js');
const { wav, decodeWav, splitSentences, voiceboxProfile } = require(VOICE);

let failed = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'ok' : 'FAIL'}: ${name}${ok || detail === undefined ? '' : `\n${detail}`}`);
  if (!ok) failed++;
}

// 0.2 s of quiet, a tone as long as the text, 0.2 s of quiet: what a model's output looks like.
function tone(text, rate, speed) {
  const quiet = Math.round(0.2 * rate);
  const n = Math.round((0.06 * text.length * rate) / speed);
  const samples = new Float32Array(quiet * 2 + n);
  for (let i = 0; i < n; i++) samples[quiet + i] = 0.4 * Math.sin((2 * Math.PI * 220 * i) / rate);
  return wav(samples, rate);
}

const profiles = [{ id: 'p1', name: 'Morgan', language: 'en', voice_type: 'preset', preset_engine: 'kokoro', default_engine: 'kokoro', sample_count: 0 }];
const seen = [];
const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const json = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    seen.push({ method: req.method, url: req.url, type: req.headers['content-type'] || '', client: req.headers['x-voicebox-client-id'], body });
    if (req.method === 'GET' && req.url === '/profiles') return json(200, profiles);
    if (req.method === 'GET' && req.url === '/profiles/presets/qwen_custom_voice') {
      return json(200, { engine: 'qwen_custom_voice', voices: [{ voice_id: 'Aiden', name: 'Aiden', gender: 'male', language: 'en' }, { voice_id: 'Sohee', name: 'Sohee', gender: 'female', language: 'ko' }] });
    }
    if (req.method === 'POST' && req.url === '/profiles') {
      const q = JSON.parse(body);
      if (profiles.some((p) => p.name === q.name)) return json(400, { detail: `A profile with the name '${q.name}' already exists. Please choose a different name.` });
      if (q.voice_type === 'designed' && !q.design_prompt) return json(400, { detail: 'Designed profiles require a design_prompt' });
      const p = { id: `p${profiles.length + 1}`, sample_count: 0, default_engine: null, preset_engine: null, ...JSON.parse(body) };
      profiles.push(p);
      return json(200, p);
    }
    const sample = /^\/profiles\/([^/]+)\/samples$/.exec(req.url);
    if (req.method === 'POST' && sample) {
      const p = profiles.find((x) => x.id === sample[1]);
      if (!p) return json(404, { detail: 'Profile not found' });
      p.sample_count++;
      return json(200, { id: 's1', profile_id: p.id, audio_path: 'x.wav', reference_text: '' });
    }
    if (req.method === 'POST' && req.url === '/transcribe') return json(200, { text: 'This is my voice, reading a few lines.', duration: 4 });
    if (req.method === 'POST' && req.url === '/v1/audio/speech') {
      const q = JSON.parse(body);
      if (!profiles.some((p) => p.name.toLowerCase() === String(q.voice).toLowerCase())) {
        return json(400, { error: { message: `Voice '${q.voice}' is not a Voicebox voice profile.`, type: 'invalid_request_error', param: 'voice', code: 'voice_not_found' } });
      }
      res.writeHead(200, { 'Content-Type': 'audio/wav' });
      return res.end(tone(q.input, 48000, q.speed));
    }
    return json(404, { detail: 'Not Found' });
  });
});

function run(args, url) {
  return new Promise((resolve) => {
    execFile(process.execPath, [VOICE, ...args], { env: { ...process.env, VOICEBOX_URL: url } }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, out: stdout + stderr });
    });
  });
}

(async () => {
  // ---- the pieces
  check('voicebox:<profile> names a profile, a Kokoro voice does not',
    voiceboxProfile('voicebox:Maya Lee') === 'Maya Lee' && voiceboxProfile('VoiceBox: maya ') === 'maya' && voiceboxProfile('af_heart') === null);
  const s = splitSentences('Dr. Lee saved 3.5 hours. Did you? "Yes!" she said.');
  check('sentences split, abbreviations and decimals whole', s.length === 3 && s[0] === 'Dr. Lee saved 3.5 hours.' && s[1] === 'Did you?', JSON.stringify(s));
  const back = decodeWav(wav(Float32Array.from([0, 0.5, -0.5, 1]), 24000));
  check('a 16-bit WAV reads back', back.rate === 24000 && back.samples.length === 4 && Math.abs(back.samples[1] - 0.5) < 0.001);
  const float = Buffer.alloc(44 + 16);
  wav(new Float32Array(8), 44100).copy(float, 0, 0, 44);
  float.writeUInt16LE(3, 20); float.writeUInt16LE(2, 22); float.writeUInt16LE(32, 34); float.writeUInt32LE(0xffffffff, 40);
  float.writeFloatLE(0.25, 44); float.writeFloatLE(0.75, 48);
  const f = decodeWav(float);
  check('a float, stereo, streamed WAV reads back as mono', f.samples.length === 2 && Math.abs(f.samples[0] - 0.5) < 1e-6, JSON.stringify([...f.samples]));

  // ---- against the stand-in app
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-voice-'));
  const script = path.join(tmp, 'script.md');
  fs.writeFileSync(script, '1. Most invoices go out late. That costs you money.\n2. Send them the day the work ends.\n');
  const sampleFile = path.join(tmp, 'me.wav');
  fs.writeFileSync(sampleFile, tone('a recording of the user speaking', 24000, 1));

  let r = await run(['--voices', 'voicebox'], url);
  check('lists the profiles', r.code === 0 && /voicebox:Morgan\s+en\s+preset, kokoro/.test(r.out), r.out);

  r = await run(['--clone', 'Maya', '--sample', sampleFile], url);
  check('no clone without --my-voice', r.code === 2 && /someone who agreed/.test(r.out) && profiles.length === 1, r.out);

  r = await run(['--clone', 'Maya', '--sample', sampleFile, '--my-voice'], url);
  const up = seen.filter((x) => /\/samples$/.test(x.url)).pop();
  check('clones a voice: transcribes the recording, makes the profile, uploads the sample',
    r.code === 0 && profiles.length === 2 && profiles[1].voice_type === 'cloned' && profiles[1].sample_count === 1 &&
    up && /multipart\/form-data; boundary=/.test(up.type) && up.body.includes('name="reference_text"') &&
    up.body.includes('This is my voice, reading a few lines.') && up.body.includes('filename="sample.wav"'), r.out);

  r = await run(['--clone', 'maya', '--sample', sampleFile, '--my-voice', '--transcript', 'A second take.'], url);
  check('a second recording joins the same profile', r.code === 0 && profiles.length === 2 && profiles[1].sample_count === 2, r.out);

  const out = path.join(tmp, 'assets');
  r = await run([script, '--out', out, '--voice', 'voicebox:Maya', '--speed', '1.1', '--instructions', 'calm'], url);
  const speech = seen.filter((x) => x.url === '/v1/audio/speech').map((x) => JSON.parse(x.body));
  const meta = r.code === 0 ? JSON.parse(fs.readFileSync(path.join(out, 'voice-1.json'), 'utf8')) : {};
  const clip = r.code === 0 ? decodeWav(fs.readFileSync(path.join(out, 'voice-1.wav'))) : { samples: [], rate: 1 };
  check('voices a script: one request per sentence, in the profile, at the speed',
    r.code === 0 && speech.length === 3 && speech.every((q) => q.voice === 'Maya' && q.model === 'tts-1' && q.speed === 1.1 && q.instructions === 'calm' && q.response_format === 'wav') &&
    seen.every((x) => x.client === 'marketing-skill'), r.out);
  check('writes the clips with their sentence times, the model\'s quiet trimmed',
    fs.existsSync(path.join(out, 'voice-2.wav')) && meta.voice === 'voicebox:Maya' && meta.sentences && meta.sentences.length === 2 &&
    meta.sentences[0].start === 0 && meta.sentences[1].text === 'That costs you money.' &&
    Math.abs(meta.sentences[1].start - meta.sentences[0].end - 0.12) < 0.002 &&
    clip.rate === 48000 && Math.abs(clip.samples.length / clip.rate - meta.sentences[1].end) < 0.002 &&
    meta.sentences[0].end < (0.06 * 28) / 1.1 + 0.06, JSON.stringify(meta));

  r = await run(['--audition', path.join(tmp, 'samples'), 'Here is how it works.', '--voices', 'voicebox:Maya,voicebox:Morgan'], url);
  check('auditions Voicebox voices', r.code === 0 && fs.existsSync(path.join(tmp, 'samples', 'voicebox-Maya.wav')) && fs.existsSync(path.join(tmp, 'samples', 'voicebox-Morgan.wav')), r.out);

  r = await run([script, '--out', out, '--voice', 'voicebox:Nobody'], url);
  check('an unknown profile stops with the ones there are', r.code === 2 && /No voice profile "Nobody" in Voicebox. It has: Morgan, Maya\./.test(r.out), r.out);

  r = await run(['--design', 'Juno', '--describe', 'a warm woman in her thirties, low and unhurried'], url);
  const juno = profiles.find((p) => p.name === 'Juno') || {};
  check('designs a voice from a description', r.code === 0 && juno.voice_type === 'designed' && juno.design_prompt === 'a warm woman in her thirties, low and unhurried' && /voicebox:Juno/.test(r.out), r.out);

  r = await run(['--design', 'juno', '--describe', 'another'], url);
  check('a taken name stops before anything is made', r.code === 2 && /already has a voice called "Juno"/.test(r.out) && profiles.filter((p) => /juno/i.test(p.name)).length === 1, r.out);

  r = await run(['--presets', 'qwen_custom_voice'], url);
  check('lists the ready-made voices', r.code === 0 && /qwen_custom_voice:Sohee\s+Sohee\s+ko\s+female/.test(r.out), r.out);

  r = await run(['--preset', 'Seoul', '--from', 'qwen_custom_voice:sohee'], url);
  const seoul = profiles.find((p) => p.name === 'Seoul') || {};
  check('makes a profile from a ready-made voice, in its language', r.code === 0 && seoul.voice_type === 'preset' && seoul.preset_engine === 'qwen_custom_voice' && seoul.preset_voice_id === 'Sohee' && seoul.language === 'ko', r.out);

  r = await run(['--preset', 'X', '--from', 'qwen_custom_voice:Nope'], url);
  check('an unknown ready-made voice stops', r.code === 2 && /No ready-made voice "Nope"/.test(r.out), r.out);

  await new Promise((res) => server.close(res));
  r = await run([script, '--out', out, '--voice', 'voicebox:Maya'], url);
  check('says what to do when Voicebox is not running', r.code === 2 && /Voicebox isn't answering at/.test(r.out) && /only while it's open/.test(r.out), r.out);

  fs.rmSync(tmp, { recursive: true, force: true });
  if (failed) { console.log(`${failed} failed`); process.exit(1); }
})();
