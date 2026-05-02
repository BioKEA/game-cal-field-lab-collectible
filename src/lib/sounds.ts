// Procedural sound effects using Web Audio API.
// No asset files — all tones are generated at play time.

let audioCtx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  // Some browsers suspend context until user gesture
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
  try {
    localStorage.setItem('biokea-sound', v ? '1' : '0');
  } catch {}
}

export function isSoundEnabled(): boolean {
  try {
    const v = localStorage.getItem('biokea-sound');
    if (v !== null) enabled = v === '1';
  } catch {}
  return enabled;
}

// Initialize from localStorage
isSoundEnabled();

interface ToneOptions {
  freq: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  attack?: number;
  release?: number;
  freqEnd?: number;
}

function tone({ freq, duration, type = 'sine', volume = 0.15, attack = 0.005, release = 0.05, freqEnd }: ToneOptions, delay = 0) {
  if (!enabled) return;
  const ctx = getCtx();
  if (!ctx) return;

  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + duration);
  }

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + attack);
  gain.gain.setValueAtTime(volume, now + duration - release);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

function noiseBurst(duration: number, volume = 0.08, delay = 0) {
  if (!enabled) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime + delay;

  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  filter.Q.value = 1.2;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.003);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(now);
}

// Playful "pop" when collecting a specimen
export function playCollect() {
  tone({ freq: 440, freqEnd: 880, duration: 0.12, type: 'sine', volume: 0.12 });
  tone({ freq: 660, freqEnd: 1320, duration: 0.1, type: 'triangle', volume: 0.08 }, 0.04);
}

// Mechanical click/whir for lab stage advancement
export function playLabStage() {
  noiseBurst(0.06, 0.05);
  tone({ freq: 220, freqEnd: 330, duration: 0.18, type: 'square', volume: 0.06 });
}

// Bright triumphant chord for species discovery
export function playDiscovery() {
  // Major chord arpeggio — C5, E5, G5, C6
  tone({ freq: 523.25, duration: 0.6, type: 'sine', volume: 0.12, release: 0.3 });
  tone({ freq: 659.25, duration: 0.6, type: 'sine', volume: 0.1, release: 0.3 }, 0.08);
  tone({ freq: 783.99, duration: 0.6, type: 'sine', volume: 0.1, release: 0.3 }, 0.16);
  tone({ freq: 1046.5, duration: 0.8, type: 'sine', volume: 0.12, release: 0.4 }, 0.24);
  // Shimmer
  tone({ freq: 2093, duration: 0.4, type: 'triangle', volume: 0.05, release: 0.3 }, 0.3);
}

// Quick "ding" for achievement unlock
export function playAchievement() {
  tone({ freq: 880, duration: 0.15, type: 'sine', volume: 0.1 });
  tone({ freq: 1318.5, duration: 0.3, type: 'sine', volume: 0.12, release: 0.2 }, 0.1);
}

// Soft tap for navigation / button
export function playTap() {
  tone({ freq: 600, freqEnd: 400, duration: 0.05, type: 'sine', volume: 0.05 });
}

// Error/insufficient resources
export function playError() {
  tone({ freq: 220, freqEnd: 110, duration: 0.2, type: 'sawtooth', volume: 0.08 });
}

// Region unlock fanfare
export function playRegionUnlock() {
  // Ascending fanfare — D5, F#5, A5, D6
  tone({ freq: 587.33, duration: 0.5, type: 'sine', volume: 0.1, release: 0.2 });
  tone({ freq: 739.99, duration: 0.5, type: 'sine', volume: 0.1, release: 0.2 }, 0.12);
  tone({ freq: 880, duration: 0.6, type: 'sine', volume: 0.12, release: 0.3 }, 0.24);
  tone({ freq: 1174.66, duration: 0.8, type: 'sine', volume: 0.14, release: 0.4 }, 0.36);
  // Shimmer
  noiseBurst(0.3, 0.04, 0.4);
  tone({ freq: 2349, duration: 0.5, type: 'triangle', volume: 0.04, release: 0.3 }, 0.5);
}

// ── Ambient sound system ──────────────────────────────────────────────
// Procedural background loops per region. Uses oscillators + filtered noise
// to create a constant but subtle atmosphere. Only one ambient can play at once.

let ambientNodes: { stop: () => void } | null = null;

export function stopAmbient() {
  if (ambientNodes) {
    ambientNodes.stop();
    ambientNodes = null;
  }
}

type RegionAmbientId = 'marin-county' | 'redwood-coast' | 'sierra-nevada' | 'mojave-desert' | 'channel-islands';

export function playAmbient(regionId: RegionAmbientId) {
  stopAmbient();
  if (!enabled) return;
  const ctx = getCtx();
  if (!ctx) return;

  const master = ctx.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 2);
  master.connect(ctx.destination);

  const nodes: AudioNode[] = [master];

  const addOsc = (freq: number, type: OscillatorType, vol: number, detune = 0) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    nodes.push(osc, gain);
    return osc;
  };

  const addNoise = (filterFreq: number, q: number, vol: number, filterType: BiquadFilterType = 'bandpass') => {
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
    nodes.push(src, filter, gain);
  };

  switch (regionId) {
    case 'marin-county':
      // Ocean wash + seabirds
      addNoise(400, 0.5, 0.8, 'lowpass');
      addOsc(180, 'sine', 0.3); // deep wave drone
      addOsc(2200, 'sine', 0.05, 15); // distant bird
      break;
    case 'redwood-coast':
      // Deep forest hum + dripping
      addNoise(200, 0.8, 0.6, 'lowpass');
      addOsc(110, 'sine', 0.4); // forest floor drone
      addOsc(1800, 'triangle', 0.03, 8); // canopy birds
      addOsc(440, 'sine', 0.02); // stream trickle hint
      break;
    case 'sierra-nevada':
      // Alpine wind + distant echo
      addNoise(800, 1.2, 0.5, 'bandpass');
      addOsc(260, 'sine', 0.15, 3); // wind harmonic
      addOsc(520, 'triangle', 0.05); // altitude tone
      break;
    case 'mojave-desert':
      // Hot silence + rattling
      addNoise(2000, 2, 0.2, 'highpass');
      addOsc(80, 'sine', 0.15); // deep heat drone
      addOsc(3000, 'sine', 0.02, 20); // insect buzz
      break;
    case 'channel-islands':
      // Waves + wind + kelp
      addNoise(350, 0.6, 0.7, 'lowpass');
      addOsc(220, 'sine', 0.25); // ocean swell
      addOsc(660, 'triangle', 0.04, 10); // wind across rocks
      addOsc(1400, 'sine', 0.02); // distant sea lion
      break;
  }

  ambientNodes = {
    stop: () => {
      // Fade out
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      setTimeout(() => {
        for (const node of nodes) {
          try {
            if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
              (node as OscillatorNode).stop();
            }
            node.disconnect();
          } catch { /* already stopped */ }
        }
      }, 1200);
    },
  };
}
