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

// BRAZILIAN DUB, 0:27 to 1:08 of the track: 6 playable bars of build-up, then 16
// of drop. Written by hand on top of what tools/analyze_track.py measured:
//   build        stabs on steps 0 and 8, answered on 13 and 15
//   drop, part 1 sub-bass held for half a bar, hits on 5, 8, 12-13
//   drop, part 2 the kick switches to a 3-3-2 pattern (steps 0, 3, 6)
const BRAZILIAN_PATTERNS = {
  //    lane 0 (low)        lane 1 (mid)          lane 2 (bass / answers)
  b1: ['x...............', '........x.......', '................'],
  b2: ['x...............', '........x.......', '.............x..'],
  b3: ['x...............', '........x.......', '.............x.x'],
  b4: ['............x...', 'x.......x.......', '..............x.'],
  d1: ['............x...', '.....x..x....x..', 'h-------........'],
  d2: ['x..x....x...x...', '.....x.......x..', '................'],
  f1: ['........x...x...', '..........x...x.', 'h-------........'],
  f2: ['x.......x...x...', '....x.....x...x.', '................'],
  t1: ['x..x..x.....x...', '........x.....x.', '................'],
  t2: ['x..x..x...x.x...', '........x.....x.', '................'],
  br: ['..........x...x.', '............x...', 'h---------......'],
  z: ['x..x..x.........', '........x.......', '................'],
};

// ACID (techno), 2:50 to 3:45 of the track: 6 playable bars of build-up, then 22 of
// drop. Deliberately easy: lane 0 is the kick (mostly one per beat), lane 1 only answers on
// the offbeats after beats 2 and 4, lane 2 is a single hold, and the lanes never stack.
const ACID_PATTERNS = {
  //    lane 0 (kick)       lane 1 (offbeat acid)  lane 2 (sub holds)
  b1: ['x...............', '................', '................'],
  b2: ['x.......x.......', '................', '................'],
  b3: ['x...x...x...x...', '................', '................'],
  b4: ['x...x...x...x...', '................', '................'],
  b5: ['x...x...x...x...', '..............x.', '................'],
  b6: ['x...x...x...x...', '................', '................'],
  d1: ['x...x...x...x...', '................', '................'],
  d2: ['x.......x.......', '......x.......x.', '................'],
  d3: ['x...x...x...x...', '......x.......x.', '................'],
  d4: ['x...............', '................', '....h-------....'],
  f1: ['x...x...x...x...', '............x.x.', '................'],
  z: ['x...............', 'x...............', 'x...............'],
};

export const LEVELS = {
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
      ['drop', 'd1'], ['drop', 'd2'], ['drop', 'd1'], ['drop', 'd3'],
      ['drop', 'd2'], ['drop', 'd4'], ['drop', 'd2'], ['drop', 'f1'],
      ['drop', 'd1'], ['drop', 'd2'], ['drop', 'd3'], ['drop', 'd4'],
      ['drop', 'd2'], ['drop', 'd3'], ['drop', 'd2'], ['drop', 'f1'],
      ['drop', 'd4'], ['drop', 'd2'], ['drop', 'd3'], ['drop', 'd1'],
      ['drop', 'd2'], ['drop', 'z'],
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
      ['drop', 'd1'], ['drop', 'd2'], ['drop', 'd1'], ['drop', 'f1'],
      ['drop', 'd1'], ['drop', 'd2'], ['drop', 'd1'], ['drop', 'f2'],
      ['drop', 't1'], ['drop', 't2'], ['drop', 't1'], ['drop', 'br'],
      ['drop', 't1'], ['drop', 't2'], ['drop', 't1'], ['drop', 'z'],
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
