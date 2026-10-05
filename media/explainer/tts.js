#!/usr/bin/env node
'use strict';
/*
 * Generates the voiceover lines in voiceover-script.md with a text-to-speech model through
 * OpenRouter's speech endpoint (OpenAI-compatible /api/v1/audio/speech), as
 * assets/voice-1.mp3 ... voice-8.mp3.
 *
 * Usage:
 *   OPENROUTER_API_KEY=... node tts.js --model <model id> --voice <voice> [--line 3] [--out assets]
 *
 * --line generates just that line, to audition a model and voice before doing all eight.
 * Pick the model from openrouter.ai/collections/text-to-speech-models; each model lists its
 * voices. Use a stock voice, never one cloned from a real person without their permission.
 */
const fs = require('fs');
const path = require('path');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

// the numbered lines under the script's first heading
function lines() {
  const text = fs.readFileSync(path.join(__dirname, 'voiceover-script.md'), 'utf8').split('\n## ')[0];
  return [...text.matchAll(/^(\d+)\. (.+)$/gm)].map((m) => ({ n: Number(m[1]), text: m[2].trim() }));
}

async function speak(key, model, voice, text, file) {
  const res = await fetch('https://openrouter.ai/api/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: text, voice, response_format: 'mp3' }),
  });
  if (!res.ok) throw new Error(`OpenRouter answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const key = process.env.OPENROUTER_API_KEY;
  const model = arg('model');
  const voice = arg('voice');
  if (!key) throw new Error('Set OPENROUTER_API_KEY in the environment (never paste it into a file or a chat).');
  if (!model) throw new Error('Pass --model, a text-to-speech model id from openrouter.ai/collections/text-to-speech-models.');
  const out = path.resolve(__dirname, arg('out') || 'assets');
  fs.mkdirSync(out, { recursive: true });
  const only = arg('line') ? Number(arg('line')) : null;
  for (const { n, text } of lines().filter((l) => only === null || l.n === only)) {
    const file = path.join(out, `voice-${n}.mp3`);
    await speak(key, model, voice, text, file);
    console.log(`${path.relative(process.cwd(), file)}: ${text.slice(0, 60)}${text.length > 60 ? '...' : ''}`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
