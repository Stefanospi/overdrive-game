// Tiny Web Audio synth: a placeholder beat so the game is playable before the
// real tracks are plugged in. Everything is scheduled on the audio clock, which
// is also the game's master clock (see scenes/Dub.js).

let ctx = null;
let master = null;
let noise = null;

export function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function out() {
  const c = getCtx();
  if (!master) {
    master = c.createGain();
    master.gain.value = 0.8;
    const comp = c.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(c.destination);
    noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return master;
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

export function clap(t) {
  const c = getCtx();
  const s = noiseSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  f.type = 'bandpass';
  f.frequency.value = 1500;
  f.Q.value = 1.2;
  g.gain.setValueAtTime(0.0001, t);
  [0, 0.012, 0.024].forEach((o) => {
    g.gain.setValueAtTime(0.45, t + o);
    g.gain.exponentialRampToValueAtTime(0.05, t + o + 0.01);
  });
  g.gain.setValueAtTime(0.4, t + 0.036);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  s.connect(f);
  f.connect(g);
  g.connect(out());
  s.start(t);
  s.stop(t + 0.25);
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

// One 8-beat build-up ending with the drop at t0 + 8 beats.
export function scheduleCycle(t0, beat) {
  for (let i = 0; i < 8; i++) {
    const t = t0 + i * beat;
    if (i % 2 === 0 && i < 6) kick(t, 0.9);
    if (i === 1 || i === 5) clap(t);
    if (i < 6) {
      hat(t + beat / 2, 0.14);
      if (i >= 1) hat(t, 0.07);
    }
  }
  riser(t0 + 4 * beat, 4 * beat);
  dropHit(t0 + 8 * beat);
}

// Sub-bass that you "play" by holding the screen; pitch follows ring progress.
export function startSub() {
  const c = getCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.value = 48;
  g.gain.value = 0;
  g.gain.setTargetAtTime(0.55, c.currentTime, 0.03);
  o.connect(g);
  g.connect(out());
  o.start();
  return {
    setPitch(p) {
      o.frequency.setTargetAtTime(48 + p * 44, c.currentTime, 0.03);
    },
    stop() {
      const t = c.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(0, t, 0.02);
      o.stop(t + 0.15);
    },
  };
}
