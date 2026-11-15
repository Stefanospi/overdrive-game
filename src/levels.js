// Level data: one level per track. A level is a list of bars; each bar names a
// section (which decides how notes sound) and a pattern (which decides the notes).
//
// A pattern is one 16-step string per lane (16ths of a 4/4 bar):
//   x  tap note
//   h  start of a hold note, continued by every following '-'
//   .  nothing
//
// A level either plays a real clip (`track`, with `synth: false`) or, when the
// track is not in yet, generates its music from the chart itself.

import brazilianTiming from './charts/brazilian-dub.js';
import brazilianClip from './music/brazilian-dub.clip.mp3';
import acidTiming from './charts/acid.js';
import acidClip from './music/acid.clip.mp3';
import topOneTiming from './charts/top-one.js';
import topOneClip from './music/top-one.clip.mp3';

const EM = [164.81, 196.0, 246.94];
const C = [130.81, 164.81, 196.0];
const D = [146.83, 185.0, 220.0];
// 4-bar loop: bass root (Hz) and skank chord for each bar.
const HARMONY = [
  { root: 82.41, chord: EM },
  { root: 82.41, chord: EM },
  { root: 65.41, chord: C },
  { root: 73.42, chord: D },
];

const DUB_PATTERNS = {
  //    lane 0 (kick)       lane 1 (snare/skank)  lane 2 (bass)
  i1: ['x...............', '........x.......', '................'],
  i2: ['x...............', '........x.......', '..........h-----'],
  a: ['x.........x.....', '........x.......', '....h--.....h---'],
  b: ['x...............', '....x...x...x...', '................'],
  c: ['x.....x.........', '........x.....x.', '..........h--...'],
  d: ['x...x...x...x...', '..x...x...x...x.', '................'],
  k1: ['................', '........x.......', 'h-----------....'],
  k2: ['....x.......x...', '................', 'h-----------....'],
  k3: ['................', '....x...x...x...', 'h---------------'],
  k4: ['x...x...x.x.x.x.', '................', '................'],
  e: ['x.....x.........', '........x.......', '..........h-----'],
  f: ['x.........x.....', '....x...x...x...', '................'],
  g: ['x.....x.........', '........x.....x.', '..h---....h---..'],
  h: ['x...x...x...x...', '..x...x...x...x.', '................'],
  z: ['x...............', 'x...............', 'x...............'],
};

// BRAZILIAN DUB, 0:27 to 1:08 of the track: 6 playable bars of build-up, then 16 of drop.
// The drop is charted on what is heard (tools: spectrogram + per-band analysis of the clip):
//   lane 1  the dubstep synth stabs (strongest ones, never two lanes on one step)
//   lane 2  the dubstep bass: a hold for every sustained bass block (0-7, 8-15, 12-15 ...)
//   lane 0  kick thumps, only where the bass is silent
// Grid checked: onsets sit within a few ms of the 16th grid, so timing problems are not
// in the clip timing. m1..m13 were drafted from the signal and still need an ear check.
const BRAZILIAN_PATTERNS = {
  //    lane 0 (kick)       lane 1 (synth stabs)   lane 2 (bass holds)
  b1: ['x...............', '........x.......', '................'],
  b2: ['x...............', '........x.......', '.............x..'],
  b3: ['x...............', '........x.......', '.............x.x'],
  b4: ['............x...', 'x.......x.......', '..............x.'],
  m1: ['................', '..x...x.x.......', 'h-------....h---'],
  m2: ['................', '..x...x.x...x...', 'h------.........'],
  m3: ['................', '..x...x.x.....x.', 'h-------....h---'],
  m4: ['................', '..x...x...x..x..', 'h-------h-------'],
  m5: ['................', 'x.....x.x.....x.', '...h----....h---'],
  m6: ['................', 'x.x...x.x.......', '................'],
  m7: ['................', '..x...x......x..', 'h-------h-------'],
  m8: ['................', '..x...x.x...x...', 'h-------........'],
  m9: ['...x............', 'x....x..x...x...', '................'],
  m10: ['...x..........x.', 'x....x..x...x...', '................'],
  m11: ['................', '..........x.x.x.', 'h-------h-------'],
  m12: ['..........x..x..', 'x.x...x.x.......', '................'],
  m13: ['................', '...x..x...x.x...', 'h-------h-------'],
  z: ['x..x..x.........', '........x.......', '................'],
};

// ACID (techno), 2:50 to 3:45 of the track: 6 playable bars of build-up, then 22 of drop.
// Read from the spectrogram: from the drop a straight kick lands on every beat (steps 0, 4,
// 8, 12) and the acid bass answers on the off-beats (steps 2, 6, 10, 14).
//   a  the kick alone                                  (calm bars)
//   b  the kick, plus the off-beat on steps 6 and 14   (the groove)
//   f  fill: kick on 1 and 3, the off-beat on all four (phrase ends, bars 13 and 21 of the clip)
// Easy on purpose: one note per beat at most, and the two lanes never share a step.
const ACID_PATTERNS = {
  //    lane 0 (kick)       lane 1 (off-beat acid)  lane 2 (unused)
  b1: ['x...............', '................', '................'],
  b2: ['x.......x.......', '................', '................'],
  b3: ['x...x...x...x...', '................', '................'],
  b4: ['x...x...x...x...', '................', '................'],
  b5: ['x...x...x...x...', '..............x.', '................'],
  b6: ['x...x...x...x...', '................', '................'],
  a: ['x...x...x...x...', '................', '................'],
  b: ['x...x...x...x...', '......x.......x.', '................'],
  f: ['x.......x.......', '..x...x...x...x.', '................'],
  z: ['x...............', '................', '................'],
};

// TOP ONE: the boss fight of chapter 3 (SERVER, QUIETE.SYS and the Minister). Speed house /
// UK groove, 147 BPM; the clip starts on the first drop (1:25 of the master) and runs 22
// bars, numbered from 1 here.
//   phase 1 CENSURA  bars 1-6    QUIETE.SYS, lanes censored, Adriana's shield (giftBeat)
//   phase 2 DECRETO  bars 7-12   the Minister, decrees; Gabriel's ID FALSA x2 on bars 9-12 (forgeBeat)
//   phase 3 ROOT     bars 13-19  Minister+Quiete fused, all lanes, root at 100%; REWIND fires on its own
//   outro            bars 20-22  cut and rise, few notes; victory on the last bar
// TODO: the note map. The author writes it: no notes on the kick in any lane, put them on
// the off-beat bass. Until then every bar is empty.
// TODO (mechanics not in the engine yet): censored lanes (black bars), decrees as special
// notes, forced root at 100% in phase 3, the payload screen after the ending.
const TOPONE_PATTERNS = {
  e: ['................', '................', '................'], // TODO: replace with the real patterns
};

export const LEVELS = {
  server: {
    id: 'server',
    n: 3,
    title: 'TOP ONE',
    boss: true,
    bpm: topOneTiming.bpm,
    lanes: 3,
    approach: 3,
    synth: false,
    giftBeat: 12, // phase 1: Adriana's BONUS ROOT + shield (bar 4)
    forgeBeat: 32, // phase 2: Gabriel's ID FALSA, 16 beats = bars 9-12
    autoRewindBeat: 48, // phase 3 (bar 13): the miss counter resets, the audio does not rewind
    track: {
      url: topOneClip,
      lead: topOneTiming.lead,
      length: topOneTiming.length,
      fadeIn: 0,
      fadeOut: 0.3,
    },
    patterns: TOPONE_PATTERNS,
    bars: Array.from({ length: 22 }, () => ['drop', 'e']),
  },

  acid: {
    id: 'acid',
    n: 2,
    title: 'ACID',
    bpm: acidTiming.bpm,
    lanes: 3,
    approach: 3,
    synth: false,
    giftBeat: 56, // beat where Adriana offers her free BONUS ROOT
    forgeBeat: 84, // beat where Gabriel offers ID FALSA
    track: {
      url: acidClip,
      lead: acidTiming.lead,
      length: acidTiming.length,
      fadeIn: 3.4,
      fadeOut: 0.9,
    },
    patterns: ACID_PATTERNS,
    bars: [
      ['build', 'b1'], ['build', 'b2'], ['build', 'b3'], ['build', 'b4'], ['build', 'b5'], ['build', 'b6'],
      ['drop', 'a'], ['drop', 'a'], ['drop', 'b'], ['drop', 'a'],
      ['drop', 'b'], ['drop', 'a'], ['drop', 'b'], ['drop', 'f'],
      ['drop', 'a'], ['drop', 'b'], ['drop', 'a'], ['drop', 'b'],
      ['drop', 'a'], ['drop', 'b'], ['drop', 'b'], ['drop', 'f'],
      ['drop', 'a'], ['drop', 'b'], ['drop', 'b'], ['drop', 'a'],
      ['drop', 'b'], ['drop', 'z'],
    ],
  },

  brazilian: {
    id: 'brazilian',
    n: 1,
    title: 'BRAZILIAN DUB',
    bpm: brazilianTiming.bpm,
    lanes: 3,
    approach: 3,
    synth: false,
    giftBeat: 44, // beat where the helper offers her free BONUS ROOT
    track: {
      url: brazilianClip,
      lead: brazilianTiming.lead, // seconds of clip before bar 1: the fade-in
      length: brazilianTiming.length,
      fadeIn: 3.4,
      fadeOut: 0.9,
    },
    patterns: BRAZILIAN_PATTERNS,
    bars: [
      ['build', 'b1'], ['build', 'b2'], ['build', 'b3'], ['build', 'b3'], ['build', 'b3'], ['build', 'b4'],
      ['drop', 'm1'], ['drop', 'm2'], ['drop', 'm3'], ['drop', 'm4'],
      ['drop', 'm5'], ['drop', 'm6'], ['drop', 'm7'], ['drop', 'm8'],
      ['drop', 'm9'], ['drop', 'm10'], ['drop', 'm10'], ['drop', 'm11'],
      ['drop', 'm7'], ['drop', 'm12'], ['drop', 'm7'], ['drop', 'z'],
    ],
  },

  // Synth demo level from before the first real track. Reach it with ?level=dub.
  dub: {
    id: 'dub',
    n: 0,
    title: 'DUB',
    bpm: 140,
    lanes: 3,
    approach: 3, // beats a note is visible before it reaches the line
    harmony: HARMONY,
    patterns: DUB_PATTERNS,
    bars: [
      ['intro', 'i1'], ['intro', 'i1'], ['intro', 'i2'], ['intro', 'i2'],
      ['groove', 'a'], ['groove', 'b'], ['groove', 'a'], ['groove', 'c'],
      ['groove', 'a'], ['groove', 'b'], ['groove', 'a'], ['groove', 'd'],
      ['break', 'k1'], ['break', 'k2'], ['break', 'k3'], ['build', 'k4'],
      ['drop', 'e'], ['drop', 'f'], ['drop', 'g'], ['drop', 'f'],
      ['drop', 'e'], ['drop', 'f'], ['drop', 'g'], ['drop', 'h'],
      ['end', 'z'],
    ],
  },
};

export const FIRST_LEVEL = 'brazilian';

export const COUNT_IN = 4; // beats of count-in before bar 1

// Turns a level into { notes, cues, end }, all timed in beats from bar 1.
//   notes: { b, lane, len, root }   len 0 = tap, otherwise a hold of len beats
//   cues:  { b, type, ... }         sounds to schedule (also drive the visuals)
export function buildChart(level) {
  const notes = [];
  const cues = [];
  const synth = level.synth !== false;
  for (let i = COUNT_IN; i > 0; i--) cues.push({ b: -i, type: 'count', n: i });

  level.bars.forEach(([section, pat], bar) => {
    const lanes = level.patterns[pat];
    const harmony = synth ? level.harmony[bar % level.harmony.length] : { root: 0, chord: [] };
    const prev = bar > 0 ? level.bars[bar - 1][0] : null;
    const b0 = bar * 4;

    lanes.forEach((row, lane) => {
      for (let s = 0; s < 16; s++) {
        const ch = row[s];
        if (ch !== 'x' && ch !== 'h') continue;
        const b = b0 + s / 4;
        if (ch === 'h') {
          let n = 1;
          while (s + n < 16 && row[s + n] === '-') n++;
          notes.push({ b, lane, len: n / 4, root: harmony.root });
          if (!synth) cues.push({ b, type: 'kick' });
          continue;
        }
        notes.push({ b, lane, len: 0, root: 0 });
        if (!synth) {
          cues.push({ b, type: ['kick', 'snare', 'skank'][lane] });
          continue;
        }
        if (section === 'end') continue;
        if (section === 'build') cues.push({ b, type: 'snare', gain: 0.5 + s / 32 });
        else if (section === 'break') cues.push({ b, type: 'skank', chord: harmony.chord });
        else if (lane === 0) cues.push({ b, type: 'kick' });
        else if (s === 8) cues.push({ b, type: 'snare', gain: 1 });
        else cues.push({ b, type: 'skank', chord: harmony.chord });
      }
    });

    // with a real track only the drop is marked: it drives the flash on screen
    if (!synth) {
      if (section === 'drop' && prev !== 'drop') cues.push({ b: b0, type: 'drop' });
      return;
    }
    // hats and transitions that are not tied to a note
    if (section === 'intro') [4, 12].forEach((s) => cues.push({ b: b0 + s / 4, type: 'hat', gain: 0.08 }));
    if (section === 'groove' || section === 'drop') {
      [2, 6, 10, 14].forEach((s) => cues.push({ b: b0 + s / 4, type: 'hat', gain: 0.13 }));
    }
    if (section === 'drop') {
      for (let s = 1; s < 16; s += 2) cues.push({ b: b0 + s / 4, type: 'hat', gain: 0.045 });
    }
    if (section === 'build') cues.push({ b: b0, type: 'riser', len: 4 });
    if (section === 'drop' && prev !== 'drop') cues.push({ b: b0, type: 'drop' });
    if (section === 'end') cues.push({ b: b0, type: 'drop' });
    const next = level.bars[bar + 1] ? level.bars[bar + 1][0] : null;
    if (next && next !== section && section !== 'intro' && section !== 'build') {
      cues.push({ b: b0 + 3, type: 'siren', len: 0.9 });
    }
  });

  notes.sort((a, b) => a.b - b.b);
  cues.sort((a, b) => a.b - b.b);
  return { notes, cues, end: level.bars.length * 4 + (synth ? 3 : 1.5) };
}

// The three layers of the Ministry's system: two tracks, then the boss fight. `id: null`
// means the track is not out yet: the map shows it as locked. Fill in `id` when a
// level is added to LEVELS above.
export const ROADMAP = [
  { layer: 'FIREWALL', id: 'brazilian' },
  { layer: 'PROXY', id: 'acid' },
  { layer: 'SERVER', id: null }, // boss fight vs QUIETE.SYS
];
