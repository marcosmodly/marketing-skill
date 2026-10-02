'use strict';
/*
 * Synthesizes an original soundtrack for a rendered video: a lo-fi music bed
 * (pad, bass, drums) plus sound effects placed on the page's own animation
 * cues. Everything is generated from scratch, so there is nothing to license
 * and it works when posting through an API, where in-app trending sounds
 * can't be added.
 *
 * render.js reads the cues from the page and calls buildSoundtrack(); this
 * module has no dependencies of its own.
 */

const SR = 48000;

const SEMITONES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

// Chords are written in C major and transposed to the page's data-key. The
// intro holds E7 (the dominant of A minor) so the drop resolves onto Am.
const INTRO = ['E3', 'G#3', 'B3', 'D4'];
const PROGRESSION = [
  ['A2', 'C3', 'E3', 'G3'],
  ['F2', 'A2', 'C3', 'E3'],
  ['C3', 'E3', 'G3', 'B3'],
  ['G2', 'B2', 'D3', 'E3'],
];
const PENTATONIC = ['A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6'];

const SOUNDS = ['pop', 'swish', 'tick', 'whoosh', 'click', 'chime'];

function noteFreq(name, transpose) {
  const m = /^([A-G]#?)(-?\d)$/.exec(name);
  const midi = SEMITONES[m[1]] + 12 * (Number(m[2]) + 1) + transpose;
  return 440 * 2 ** ((midi - 69) / 12);
}

function makeRng(seed) {
  let s = seed >>> 0;
  const uniform = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Box-Muller, so noise has the same energy as a standard normal
  return () => Math.sqrt(-2 * Math.log(uniform() + 1e-12)) * Math.cos(2 * Math.PI * uniform());
}

const samples = (dur) => Math.max(0, Math.floor(dur * SR));

function noise(rng, n) {
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = rng();
  return x;
}

// first difference, applied `times` times: a cheap, steep-enough high-pass for noise
function highpass(x, times) {
  for (let k = 0; k < times; k++) {
    let prev = 0;
    for (let i = 0; i < x.length; i++) {
      const cur = x[i];
      x[i] = cur - prev;
      prev = cur;
    }
  }
  return x;
}

function smooth(x, width) {
  const out = new Float64Array(x.length);
  const half = Math.floor(width / 2);
  let sum = 0;
  for (let i = 0; i < x.length + half; i++) {
    if (i < x.length) sum += x[i];
    if (i - width >= 0) sum -= x[i - width];
    if (i - half >= 0 && i - half < x.length) out[i - half] = sum / width;
  }
  return out;
}

class Mix {
  constructor(seconds) {
    this.n = samples(seconds);
    this.L = new Float64Array(this.n);
    this.R = new Float64Array(this.n);
  }

  add(sig, t0, gain = 1, pan = 0) {
    const start = Math.round(t0 * SR);
    const gl = gain * Math.sqrt((1 - pan) / 2);
    const gr = gain * Math.sqrt((1 + pan) / 2);
    for (let i = Math.max(0, -start); i < sig.length && start + i < this.n; i++) {
      this.L[start + i] += sig[i] * gl;
      this.R[start + i] += sig[i] * gr;
    }
  }
}

// ---------- instruments ----------

function padVoice(freqs, dur, detuneCents) {
  const n = samples(dur);
  const out = new Float64Array(n);
  const detune = 2 ** (detuneCents / 1200);
  for (const f0 of freqs) {
    const f = f0 * detune;
    for (let h = 1; h <= 6; h++) {
      const amp = 0.62 ** h / h;
      const w = (2 * Math.PI * f * h) / SR;
      for (let i = 0; i < n; i++) out[i] += Math.sin(w * i + h) * amp;
    }
  }
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.max(0, Math.min(1, t / 0.35, (dur - t) / 0.5));
    out[i] *= env / freqs.length;
  }
  return out;
}

function kick(rng) {
  const n = samples(0.45);
  const out = new Float64Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    phase += (2 * Math.PI * (46 + 120 * Math.exp(-t / 0.035))) / SR;
    out[i] = Math.sin(phase) * Math.exp(-t / 0.2) + rng() * Math.exp(-t / 0.002) * 0.3;
  }
  return out;
}

function clap(rng) {
  const n = samples(0.3);
  const x = highpass(noise(rng, n), 1);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let env = 0;
    for (const off of [0, 0.011, 0.022]) {
      if (t >= off) env += Math.exp(-(t - off) / (off < 0.02 ? 0.012 : 0.09));
    }
    x[i] *= env * 0.45;
  }
  return x;
}

function hat(rng) {
  const n = samples(0.08);
  const x = highpass(noise(rng, n), 2);
  for (let i = 0; i < n; i++) x[i] *= Math.exp(-i / SR / 0.018) * 0.18;
  return x;
}

function crash(rng, dur = 1.6) {
  const n = samples(dur);
  const x = highpass(noise(rng, n), 2);
  for (let i = 0; i < n; i++) x[i] *= Math.exp(-i / SR / 0.5) * 0.12;
  return x;
}

function bass(f, dur) {
  const n = samples(dur);
  const out = new Float64Array(n);
  const w = (2 * Math.PI * f) / SR;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.008) * Math.exp(-t / (dur * 0.6));
    out[i] = (Math.sin(w * i) + 0.35 * Math.sin(2 * w * i) + 0.15 * Math.sin(3 * w * i)) * env;
  }
  return out;
}

function pluck(rng, f, dur = 0.35) {
  const n = samples(dur);
  const out = new Float64Array(n);
  const w = (2 * Math.PI * f) / SR;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = Math.sin(w * i) * Math.exp(-t / 0.12) + 0.35 * Math.sin(2 * w * i) * Math.exp(-t / 0.05) + rng() * Math.exp(-t / 0.003) * 0.15;
  }
  return out;
}

function marimba(f, dur = 0.4) {
  const n = samples(dur);
  const out = new Float64Array(n);
  const w = (2 * Math.PI * f) / SR;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = Math.sin(w * i) * Math.exp(-t / 0.13) + 0.25 * Math.sin(3.93 * w * i) * Math.exp(-t / 0.03);
  }
  return out;
}

function bell(f, dur = 1.4) {
  const partials = [[1, 1.0, 0.6], [2.0, 0.5, 0.35], [2.76, 0.3, 0.2], [5.4, 0.15, 0.08]];
  const n = samples(dur);
  const out = new Float64Array(n);
  for (const [ratio, amp, decay] of partials) {
    const w = (2 * Math.PI * f * ratio) / SR;
    for (let i = 0; i < n; i++) out[i] += amp * Math.sin(w * i) * Math.exp(-i / SR / decay);
  }
  return out;
}

function swish(rng, dur = 0.22, bright = 1) {
  const n = samples(dur);
  const x = highpass(noise(rng, n), bright);
  for (let i = 0; i < n; i++) x[i] *= Math.sin((Math.PI * i) / n) ** 2 * 0.35;
  return x;
}

function whoosh(rng, dur = 0.5) {
  const n = samples(dur);
  const raw = noise(rng, n);
  // sweep from dull to bright by crossfading a smoothed copy into the high-passed noise
  const dull = smooth(raw, 24);
  const bright = highpass(Float64Array.from(raw), 1);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = i / n;
    out[i] = ((1 - p) * dull[i] * 3 + p * bright[i]) * Math.sin(Math.PI * p) ** 3 * 0.4;
  }
  return out;
}

function riser(rng, dur) {
  const n = samples(dur);
  const x = highpass(noise(rng, n), 1);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    phase += (2 * Math.PI * (220 + 900 * p * p)) / SR;
    x[i] = (x[i] * 0.25 + Math.sin(phase) * 0.12) * p ** 2.5;
  }
  return x;
}

function click(rng) {
  const n = samples(0.03);
  const out = new Float64Array(n);
  const w = (2 * Math.PI * 2800) / SR;
  for (let i = 0; i < n; i++) out[i] = (rng() * 0.5 + Math.sin(w * i)) * Math.exp(-i / SR / 0.004);
  return out;
}

// ---------- arrangement ----------

/**
 * @param {Array<{sound: string, time: number}>} cues  sound effects to place, from the page's data-sfx
 * @param {{duration: number, drop?: number, bpm?: number, key?: string, music?: boolean}} opts
 * @returns {{L: Float64Array, R: Float64Array, silent: boolean}}
 */
function buildSoundtrack(cues, opts) {
  const duration = opts.duration;
  const bpm = opts.bpm || 120;
  const beat = 60 / bpm;
  const bar = 4 * beat;
  const drop = Math.max(0, opts.drop || 0);
  const transpose = SEMITONES[opts.key || 'C'] ?? 0;
  const note = (name) => noteFreq(name, transpose);
  const rng = makeRng(7);
  const chordAt = (t) => (t < drop ? INTRO : PROGRESSION[Math.floor((t - drop) / bar) % PROGRESSION.length]);

  const music = new Mix(duration);
  const sfx = new Mix(duration);
  const end = duration - 1.0; // drums stop and the last chord rings out

  if (opts.music !== false) {
    // pad: the intro chord until the drop, then one chord per bar
    const starts = drop > 0 ? [0] : [];
    for (let s = drop; s <= end + 1e-9; s += bar) starts.push(s);
    starts.forEach((s, i) => {
      const e = i + 1 < starts.length ? starts[i + 1] + 0.3 : duration;
      const freqs = chordAt(s + 0.01).map((n) => note(n) * 2);
      const gain = s < drop ? 0.45 : 0.6;
      music.add(padVoice(freqs, e - s, -5), s, gain, -0.35);
      music.add(padVoice(freqs, e - s, +5), s, gain, 0.35);
    });
    if (drop >= 1.5) {
      music.add(riser(rng, 1.5), drop - 1.5, 0.8);
      music.add(crash(rng), drop, 1.0);
    }

    const kicks = [];
    for (let k = 0, b = drop; b < end - 1e-9; k++, b = drop + k * beat) {
      if (k % 4 === 0 || k % 4 === 2) kicks.push(b);
      if (k % 8 === 5) kicks.push(b + beat / 2);
      if (k % 4 === 1 || k % 4 === 3) music.add(clap(rng), b, 0.9);
      music.add(hat(rng), b, 0.6, 0.25);
      music.add(hat(rng), b + beat / 2, 1.0, 0.25);
      if (k % 4 === 0) {
        const root = note(chordAt(b + 0.01)[0]);
        music.add(bass(root, 0.9), b, 0.55);
        music.add(bass(root, 0.3), b + 1.5 * beat, 0.4);
        music.add(bass(root, 0.7), b + 2 * beat, 0.5);
        music.add(bass(root * 2, 0.2), b + 3.5 * beat, 0.3);
      }
    }
    if (end > drop) {
      kicks.push(end);
      music.add(crash(rng, 1.0), end, 0.8);
    }

    // sidechain the bed under each kick for the pumping lo-fi feel, then add the kicks on top
    const duck = new Float64Array(music.n).fill(1);
    for (const kt of kicks) {
      const i0 = Math.round(kt * SR);
      for (let i = i0; i < Math.min(music.n, i0 + samples(0.3)); i++) {
        duck[i] = Math.min(duck[i], 1 - 0.45 * Math.exp(-(i - i0) / SR / 0.12));
      }
    }
    for (let i = 0; i < music.n; i++) {
      music.L[i] *= duck[i];
      music.R[i] *= duck[i];
    }
    for (const kt of kicks) music.add(kick(rng), kt, 1.0);
  }

  // sound effects, placed on the page's own cues
  const sorted = [...cues].sort((a, b) => a.time - b.time);
  let popGroup = 0;
  let lastPop = -Infinity;
  let tickIndex = 0;
  let lastTick = -Infinity;
  let swishCount = 0;
  for (const { sound, time } of sorted) {
    if (sound === 'pop') {
      // words popping in close together climb up the current chord
      popGroup = time - lastPop < 0.6 ? popGroup + 1 : 0;
      lastPop = time;
      const tones = chordAt(time).map((n) => note(n) * 4).sort((a, b) => a - b);
      sfx.add(pluck(rng, tones[popGroup % tones.length]), time + 0.04, 0.55);
      sfx.add(swish(rng, 0.12, 2), time, 0.5);
    } else if (sound === 'tick') {
      // each run of ticks climbs the pentatonic scale
      tickIndex = time - lastTick < 1.5 ? tickIndex + 1 : 0;
      lastTick = time;
      sfx.add(marimba(note(PENTATONIC[tickIndex % PENTATONIC.length])), time, 0.5);
    } else if (sound === 'swish') {
      sfx.add(swish(rng), time, 0.6, swishCount++ % 2 ? 0.4 : -0.4);
    } else if (sound === 'whoosh') {
      sfx.add(whoosh(rng), time - 0.1, 0.9);
    } else if (sound === 'click') {
      sfx.add(click(rng), time + 0.02, 0.6);
      sfx.add(click(rng), time + 0.14, 0.3);
    } else if (sound === 'chime') {
      sfx.add(bell(note('G5')), time, 0.35);
      sfx.add(bell(note('C6')), time + 0.09, 0.4);
    }
  }

  const L = new Float64Array(music.n);
  const R = new Float64Array(music.n);
  const fadeLen = samples(0.3);
  let peak = 0;
  for (let i = 0; i < music.n; i++) {
    const fade = Math.min(1, (music.n - i) / fadeLen);
    L[i] = (music.L[i] * 0.32 + sfx.L[i]) * fade;
    R[i] = (music.R[i] * 0.32 + sfx.R[i]) * fade;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  if (peak > 0) {
    for (let i = 0; i < music.n; i++) {
      L[i] *= 0.89 / peak;
      R[i] *= 0.89 / peak;
    }
  }
  return { L, R, silent: peak === 0 };
}

function wavBuffer(L, R) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(2, 22); // stereo
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  const clamp = (v) => Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(clamp(L[i]), 44 + i * 4);
    buf.writeInt16LE(clamp(R[i]), 46 + i * 4);
  }
  return buf;
}

module.exports = { buildSoundtrack, wavBuffer, SOUNDS, SAMPLE_RATE: SR };
