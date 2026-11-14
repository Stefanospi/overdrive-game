// Tiny Web Audio synth: a placeholder soundsystem so the game is playable
// before the real tracks are plugged in. Every sound takes an absolute time on
// the audio clock, which is also the game's master clock (see scenes/Play.js).

let ctx = null;
let master = null;
let noise = null;
let analyser = null;
let echoIn = null;
let echoDelay = null;
let freq = null;
const bands = new Float32Array(6);
const BAND_EDGES = [0, 2, 5, 12, 30, 70, 160];

export function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    // Freezing the audio clock when the tab is hidden pauses the whole game.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) ctx.suspend();
      else ctx.resume();
    });
  }
  if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
  return ctx;
}

// Read-only clock: never resumes the context, safe to call every frame.
export const clock = () => (ctx ? ctx.currentTime : 0);

// How long a scheduled sound takes to reach the ears, in seconds.
export const latency = () => (ctx ? ctx.outputLatency || ctx.baseLatency || 0 : 0);

function out() {
  const c = getCtx();
  if (!master) {
    master = c.createGain();
    master.gain.value = 0.8;
    const comp = c.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(c.destination);

    analyser = c.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.6;
    master.connect(analyser);
    freq = new Uint8Array(analyser.frequencyBinCount);

    // dub echo: filtered feedback delay
    echoIn = c.createGain();
    echoIn.gain.value = 0.5;
    echoDelay = c.createDelay(1.5);
    echoDelay.delayTime.value = 0.32;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 320;
    const fb = c.createGain();
    fb.gain.value = 0.46;
    echoIn.connect(echoDelay);
    echoDelay.connect(lp);
    lp.connect(hp);
    hp.connect(fb);
    fb.connect(echoDelay);
    hp.connect(master);

    noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return master;
}

export function setEcho(seconds) {
  out();
  echoDelay.delayTime.value = seconds;
}

// Six frequency bands, 0..1, low to high. Reuses one array: do not keep it.
export function levels() {
  if (!analyser) return bands;
  analyser.getByteFrequencyData(freq);
  for (let b = 0; b < 6; b++) {
    let sum = 0;
    for (let i = BAND_EDGES[b]; i < BAND_EDGES[b + 1]; i++) sum += freq[i];
    bands[b] = sum / ((BAND_EDGES[b + 1] - BAND_EDGES[b]) * 255);
  }
  return bands;
}

// ---- real tracks ---------------------------------------------------------------
const files = new Map(); // url -> Promise<ArrayBuffer>
const buffers = new Map(); // url -> Promise<AudioBuffer>

// Starts the download. Needs no audio context, so it can run before the first tap.
export function preload(url) {
  if (!files.has(url)) files.set(url, fetch(url).then((r) => r.arrayBuffer()));
  return files.get(url);
}

export function loadTrack(url) {
  if (!buffers.has(url)) {
    buffers.set(
      url,
      preload(url).then((data) => new Promise((ok, fail) => getCtx().decodeAudioData(data.slice(0), ok, fail))),
    );
  }
  return buffers.get(url);
}

// Plays a clip starting at audio-clock time `when`, from `offset` seconds into it.
// Fade times are positions inside the clip. The track skips the synth's
// compressor so the master is heard as it was made.
export function playTrack(buffer, when, offset = 0, { fadeIn = 0, fadeOutAt = Infinity, fadeOut = 1, gain = 0.9, ramp = 0 } = {}) {
  const c = getCtx();
  out();
  const src = c.createBufferSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  src.buffer = buffer;
  f.type = 'lowpass';
  f.frequency.value = 20000;
  src.connect(f);
  f.connect(g);
  g.connect(c.destination);
  g.connect(analyser);

  const zero = when - offset; // audio-clock time of the clip's first sample
  if (offset < fadeIn) {
    g.gain.setValueAtTime(gain * (offset / fadeIn) ** 2, when);
    // a curve, not a line: loudness is not linear, a straight ramp sounds abrupt
    const steps = 24;
    for (let i = 1; i <= steps; i++) {
      const p = offset / fadeIn + (1 - offset / fadeIn) * (i / steps);
      g.gain.linearRampToValueAtTime(gain * p * p, zero + fadeIn * p);
    }
  } else if (ramp > 0) {
    // restarting mid-track (rewind): a very short fade so the cut does not click
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain, when + ramp);
  } else {
    g.gain.setValueAtTime(gain, when);
  }
  if (fadeOutAt < buffer.duration) {
    g.gain.setValueAtTime(gain, Math.max(when, zero + fadeOutAt));
    g.gain.linearRampToValueAtTime(0.0001, zero + fadeOutAt + fadeOut);
  }
  src.start(when, offset);

  return {
    stop() {
      try {
        src.stop();
      } catch (e) {
        /* already stopped */
      }
      g.disconnect();
    },
    // the tape slows to a halt (rewind power-up)
    tapeStop(dur = 0.45) {
      const t = c.currentTime;
      src.playbackRate.cancelScheduledValues(t);
      src.playbackRate.setValueAtTime(1, t);
      src.playbackRate.exponentialRampToValueAtTime(0.12, t + dur);
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      try {
        src.stop(t + dur + 0.02);
      } catch (e) {
        /* already stopped */
      }
    },
    // a missed note dunks the track under water for a moment
    muffle() {
      const t = c.currentTime;
      f.frequency.cancelScheduledValues(t);
      f.frequency.setValueAtTime(600, t);
      f.frequency.exponentialRampToValueAtTime(20000, t + 0.45);
    },
  };
}

function noiseSource(loop = false) {
  const c = getCtx();
  out();
  const s = c.createBufferSource();
  s.buffer = noise;
  s.loop = loop;
  return s;
}

export function kick(t, gain = 1) {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  o.connect(g);
  g.connect(out());
  o.start(t);
  o.stop(t + 0.4);
}

export function hat(t, gain = 0.14) {
  const c = getCtx();
  const s = noiseSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  f.type = 'highpass';
  f.frequency.value = 8000;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  s.connect(f);
  f.connect(g);
  g.connect(out());
  s.start(t);
  s.stop(t + 0.06);
}

export function clap(t, gain = 0.45) {
  const c = getCtx();
  const s = noiseSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  f.type = 'bandpass';
  f.frequency.value = 1500;
  f.Q.value = 1.2;
  g.gain.setValueAtTime(0.0001, t);
  [0, 0.012, 0.024].forEach((o) => {
    g.gain.setValueAtTime(gain, t + o);
    g.gain.exponentialRampToValueAtTime(0.05, t + o + 0.01);
  });
  g.gain.setValueAtTime(gain * 0.9, t + 0.036);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  s.connect(f);
  f.connect(g);
  g.connect(out());
  s.start(t);
  s.stop(t + 0.25);
}

// Halftime snare: clap plus a short tonal body, with a touch of echo.
export function snare(t, gain = 1) {
  const c = getCtx();
  clap(t, 0.45 * gain);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(230, t);
  o.frequency.exponentialRampToValueAtTime(150, t + 0.1);
  g.gain.setValueAtTime(0.5 * gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  o.connect(g);
  g.connect(out());
  g.connect(echoIn);
  o.start(t);
  o.stop(t + 0.16);
}

// Offbeat dub chord stab, fed into the echo.
export function skank(t, chord, gain = 0.2) {
  const c = getCtx();
  out();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  f.type = 'bandpass';
  f.frequency.value = 1100;
  f.Q.value = 0.9;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  chord.forEach((hz) => {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = hz * 2;
    o.connect(f);
    o.start(t);
    o.stop(t + 0.2);
  });
  f.connect(g);
  g.connect(master);
  g.connect(echoIn);
}

// Dub siren: wobbling square wave falling in pitch, drowned in echo.
export function siren(t, dur = 0.8) {
  const c = getCtx();
  out();
  const o = c.createOscillator();
  const lfo = c.createOscillator();
  const depth = c.createGain();
  const g = c.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(1100, t);
  o.frequency.exponentialRampToValueAtTime(520, t + dur);
  lfo.frequency.value = 9;
  depth.gain.value = 220;
  lfo.connect(depth);
  depth.connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.06, t + 0.02);
  g.gain.setValueAtTime(0.06, t + dur - 0.05);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  g.connect(echoIn);
  o.start(t);
  lfo.start(t);
  o.stop(t + dur + 0.02);
  lfo.stop(t + dur + 0.02);
}

// Count-in blip.
export function tick(t, hz = 1200) {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'square';
  o.frequency.value = hz;
  g.gain.setValueAtTime(0.09, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  o.connect(g);
  g.connect(out());
  o.start(t);
  o.stop(t + 0.07);
}

export function riser(t, dur) {
  const c = getCtx();
  const s = noiseSource(true);
  const f = c.createBiquadFilter();
  const g = c.createGain();
  f.type = 'bandpass';
  f.Q.value = 4;
  f.frequency.setValueAtTime(300, t);
  f.frequency.exponentialRampToValueAtTime(7000, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.28, t + dur);
  g.gain.setValueAtTime(0.0001, t + dur + 0.001);
  s.connect(f);
  f.connect(g);
  g.connect(out());
  s.start(t);
  s.stop(t + dur + 0.02);
}

export function dropHit(t) {
  const c = getCtx();
  kick(t, 1.2);
  // noise burst
  const s = noiseSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  f.type = 'lowpass';
  f.frequency.value = 3000;
  g.gain.setValueAtTime(0.5, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  s.connect(f);
  f.connect(g);
  g.connect(out());
  s.start(t);
  s.stop(t + 0.45);
  // sub tail
  const o = c.createOscillator();
  const og = c.createGain();
  o.type = 'sine';
  o.frequency.value = 42;
  og.gain.setValueAtTime(0.9, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
  o.connect(og);
  og.connect(out());
  o.start(t);
  o.stop(t + 1.05);
}

// The bassline is played by the player: it sounds only while a hold note is
// held. Sub sine plus a wobbling filtered saw so it also reads on phone speakers.
export function startSub(hz, wobbleHz = 4.67) {
  const c = getCtx();
  const t = c.currentTime;
  const g = c.createGain();
  g.gain.value = 0;
  g.gain.setTargetAtTime(1, t, 0.02);

  const sub = c.createOscillator();
  const subG = c.createGain();
  sub.type = 'sine';
  sub.frequency.value = hz / 2;
  subG.gain.value = 0.5;
  sub.connect(subG);
  subG.connect(g);

  const saw = c.createOscillator();
  const f = c.createBiquadFilter();
  const sawG = c.createGain();
  const lfo = c.createOscillator();
  const depth = c.createGain();
  saw.type = 'sawtooth';
  saw.frequency.value = hz;
  f.type = 'lowpass';
  f.frequency.value = 520;
  f.Q.value = 7;
  lfo.frequency.value = wobbleHz;
  depth.gain.value = 380;
  lfo.connect(depth);
  depth.connect(f.frequency);
  sawG.gain.value = 0.3;
  saw.connect(f);
  f.connect(sawG);
  sawG.connect(g);

  g.connect(out());
  sub.start();
  saw.start();
  lfo.start();
  return {
    stop() {
      const now = c.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setTargetAtTime(0, now, 0.025);
      sub.stop(now + 0.2);
      saw.stop(now + 0.2);
      lfo.stop(now + 0.2);
    },
  };
}

// Tape-rewind sweep, for the helper's REWIND power-up.
export function rewind(t = getCtx().currentTime) {
  const c = getCtx();
  const o = c.createOscillator();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(2200, t);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.42);
  f.type = 'lowpass';
  f.frequency.setValueAtTime(5000, t);
  f.frequency.exponentialRampToValueAtTime(300, t + 0.42);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.16, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  o.connect(f);
  f.connect(g);
  g.connect(out());
  o.start(t);
  o.stop(t + 0.5);
}

// The rewind you hear: the stretch that just played, reversed and sped up like a tape
// being wound back. `startSec`/`endSec` are positions inside the clip. The reversed copy
// of the whole clip is built once (prepareRewind) so a tap never stalls a frame.
const reversedCache = new WeakMap();

export function prepareRewind(buffer) {
  if (reversedCache.has(buffer)) return reversedCache.get(buffer);
  const c = getCtx();
  const rev = c.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = rev.getChannelData(ch);
    const n = src.length;
    for (let i = 0; i < n; i++) dst[i] = src[n - 1 - i];
  }
  reversedCache.set(buffer, rev);
  return rev;
}

export function rewindSound(buffer, startSec, endSec, dur = 0.9) {
  const c = getCtx();
  const rev = prepareRewind(buffer);
  const total = buffer.duration;
  const from = Math.max(0, Math.min(total, endSec));
  const span = Math.max(0.2, Math.min(from, endSec - startSec));
  const t = c.currentTime;
  const s = c.createBufferSource();
  s.buffer = rev;
  s.playbackRate.value = Math.min(16, span / dur);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 280;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.75, t + 0.05);
  g.gain.setValueAtTime(0.75, t + dur - 0.14);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  s.connect(hp);
  hp.connect(g);
  g.connect(out());
  s.start(t, total - from, span);
  // a thin tape whir riding on top
  const o = c.createOscillator();
  const og = c.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(500, t);
  o.frequency.exponentialRampToValueAtTime(2400, t + dur);
  og.gain.setValueAtTime(0.0001, t);
  og.gain.linearRampToValueAtTime(0.05, t + 0.1);
  og.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(og);
  og.connect(out());
  o.start(t);
  o.stop(t + dur + 0.05);
}

// ---- story sounds -----------------------------------------------------------------------
// Typing: a short blip per character, pitched per speaker, or a typewriter click.
export function blip(hz, type = 'square', gain = 0.045) {
  const c = getCtx();
  if (c.state !== 'running') return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = hz * (0.94 + Math.random() * 0.12);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
  o.connect(g);
  g.connect(out());
  o.start(t);
  o.stop(t + 0.05);
}

export function typeClick() {
  const c = getCtx();
  if (c.state !== 'running') return;
  const t = c.currentTime;
  const s = noiseSource(false);
  const f = c.createBiquadFilter();
  const g = c.createGain();
  f.type = 'bandpass';
  f.frequency.value = 2200 + Math.random() * 900;
  f.Q.value = 3;
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
  s.connect(f);
  f.connect(g);
  g.connect(out());
  s.start(t);
  s.stop(t + 0.04);
}

// Scene sounds for the story: siren, crowd, thud, zap (the plug), static.
export function sfx(kind) {
  const c = getCtx();
  if (c.state !== 'running') return;
  const t = c.currentTime;
  if (kind === 'siren') {
    const o = c.createOscillator();
    const lfo = c.createOscillator();
    const lg = c.createGain();
    const g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 700;
    lfo.frequency.value = 2.2;
    lg.gain.value = 220;
    lfo.connect(lg);
    lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.2);
    g.gain.linearRampToValueAtTime(0.0001, t + 1.8);
    o.connect(g);
    g.connect(out());
    o.start(t);
    lfo.start(t);
    o.stop(t + 1.9);
    lfo.stop(t + 1.9);
  } else if (kind === 'crowd') {
    const s = noiseSource(true);
    const f = c.createBiquadFilter();
    const g = c.createGain();
    f.type = 'bandpass';
    f.frequency.value = 650;
    f.Q.value = 0.8;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + 2.2);
    s.connect(f);
    f.connect(g);
    g.connect(out());
    s.start(t);
    s.stop(t + 2.3);
  } else if (kind === 'thud') {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.35);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g);
    g.connect(out());
    o.start(t);
    o.stop(t + 0.45);
  } else if (kind === 'zap' || kind === 'static') {
    const s = noiseSource(false);
    const f = c.createBiquadFilter();
    const g = c.createGain();
    f.type = 'highpass';
    f.frequency.value = kind === 'zap' ? 1800 : 900;
    g.gain.setValueAtTime(kind === 'zap' ? 0.3 : 0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (kind === 'zap' ? 0.3 : 0.5));
    s.connect(f);
    f.connect(g);
    g.connect(out());
    s.start(t);
    s.stop(t + 0.6);
    if (kind === 'zap') sfx('thud');
  }
}
