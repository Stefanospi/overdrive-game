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
// The first level, so it stays readable (rewritten after playtests: it was too busy and
// felt out of time). Grid checked on the signal: onsets sit within 4 ms of the 16th grid,
// so a "late" feeling came from the note choice, not the clip timing. Rules of the drop:
//   lane 2  a hold for each sustained bass block (steps 0-7, 8-15, 3-7, 12-15)
//   lane 1  the dubstep synth stabs (2, 6, 8, 12, 14), only the strong ones
//   lane 0  the odd sub hit (step 3, 10), nothing else
//   never a tap while a hold is down (the hold is the rhythm), taps at least 2 steps apart
const BRAZILIAN_PATTERNS = {
  //    lane 0 (kick)       lane 1 (synth stabs)   lane 2 (bass holds)
  b1: ['x...............', '........x.......', '................'],
  b2: ['x...............', '........x.......', '.............x..'],
  b3: ['x...............', '........x.......', '.............x.x'],
  b4: ['............x...', 'x.......x.......', '..............x.'],
  m1: ['................', '........x.......', 'h-------....h---'],
  m2: ['................', '........x...x...', 'h------.........'],
  m3: ['................', '........x.......', 'h-------....h---'],
  m4: ['................', '................', 'h-------h-------'],
  m5: ['................', 'x.......x.......', '...h----....h---'],
  m6: ['................', 'x.x...x.........', '................'],
  m7: ['................', '................', 'h-------h-------'],
  m8: ['................', '........x...x...', 'h-------........'],
  m9: ['...x............', 'x.......x...x...', '................'],
  m10: ['...x............', 'x.......x...x...', '................'],
  m11: ['................', '..........x.x.x.', 'h-------........'],
  m12: ['..........x.....', 'x.x.....x.......', '................'],
  m13: ['................', '...x..x...x.x...', 'h-------h-------'],
  z: ['x..x..x.........', '........x.......', '................'],
};

// ACID (techno), 2:50 to 3:45 of the track: 6 playable bars of build-up, then 22 of drop.
// Read from the signal (onset peaks of the clip, bars 8, 9 and 22 of the clip):
//   kick        a straight kick on every beat (steps 0, 4, 8, 12)
//   acid bass   on the off-beat (steps 6 and 14)
//   synth       stabs at steps 7 and 15 (the answer to the bass), and at 1 and 9 on the busiest bars
// The kick is lane 0, the acid lane 1, the synth lane 2; nothing shares a step.
//   a  the kick alone                                     (rest)
//   b  kick + acid on 6 and 14                            (the groove)
//   c  kick + synth on 7 and 15                           (a pinch harder: a hit right before the next kick)
//   d  kick + synth on 7 and 15 + stabs on 1 and 9        (the hardest bar)
//   f  fill: kick on 1 and 3, the off-beat on all four    (phrase ends, bars 13 and 21 of the clip)
const ACID_PATTERNS = {
  //    lane 0 (kick)       lane 1 (acid)           lane 2 (synth)
  b1: ['x...............', '................', '................'],
  b2: ['x.......x.......', '................', '................'],
  b3: ['x...x...x...x...', '................', '................'],
  b4: ['x...x...x...x...', '................', '................'],
  b5: ['x...x...x...x...', '..............x.', '................'],
  b6: ['x...x...x...x...', '................', '................'],
  a: ['x...x...x...x...', '................', '................'],
  b: ['x...x...x...x...', '......x.......x.', '................'],
  c: ['x...x...x...x...', '................', '.......x.......x'],
  d: ['x...x...x...x...', '.x.......x......', '.......x.......x'],
  f: ['x.......x.......', '..x...x...x...x.', '................'],
  z: ['x...............', '................', '................'],
};

// TOP ONE: the boss fight of chapter 3 (SERVER, QUIETE.SYS and the Minister). Speed house /
// UK groove, 147 BPM; the clip starts on the first drop (1:25 of the master) and runs 22
// bars, numbered from 1 here.
//   phase 1 CENSURA  bars 1-6    QUIETE.SYS: lanes get censored (black bars hide the far notes)
//   phase 2 DECRETO  bars 7-12   the Minister: more notes; Gabriel's ID FALSA on bars 9-12 (forgeBeat)
//   phase 3 ROOT     bars 13-19  Minister+Quiete fused: all lanes, root forced at the start
//   outro            bars 20-22  cut and rise, few notes
// Every correct hit hurts the boss (see `boss` in the level and Play.damageBoss).
// Note map: no notes on the kick (steps 0, 4, 8, 12), everything on the off-beat bass
// (steps 2, 6, 10, 14) with a few 16th pick-ups (5, 7, 11, 13, 15). Built on the signal's
// off-beat pulse (bar 8 of the clip is exactly 2, 6, 10, 14), NOT yet checked by ear.
// P turns [step, lane] pairs into a pattern.
const P = (...hits) => {
  const rows = [0, 1, 2].map(() => Array(16).fill('.'));
  hits.forEach(([step, lane]) => (rows[lane][step] = 'x'));
  return rows.map((r) => r.join(''));
};
const TOPONE_PATTERNS = {
  // phase 1: one hit per off-beat, slowly changing lanes
  c1: P([2, 1], [6, 1], [10, 1], [14, 1]),
  c2: P([2, 0], [6, 2], [10, 0], [14, 2]),
  c3: P([2, 1], [6, 0], [10, 1], [14, 2]),
  c4: P([2, 0], [6, 1], [10, 2], [14, 1]),
  // phase 2: a pick-up before the next bar
  d1: P([2, 0], [6, 1], [10, 2], [14, 1]),
  d2: P([2, 2], [6, 1], [10, 0], [14, 1], [15, 0]),
  d3: P([2, 1], [6, 2], [7, 0], [10, 1], [14, 0]),
  d4: P([2, 0], [6, 1], [10, 0], [11, 1], [14, 2], [15, 1]),
  // phase 3: all three lanes, pick-ups on 7 and 15
  e1: P([2, 0], [6, 1], [7, 2], [10, 1], [14, 0], [15, 1]),
  e2: P([2, 2], [6, 1], [10, 0], [11, 1], [14, 2]),
  e3: P([2, 0], [6, 2], [7, 1], [10, 2], [14, 1], [15, 0]),
  e4: P([2, 1], [5, 0], [6, 2], [10, 1], [13, 2], [14, 0]),
  // outro: it thins out, the last bar leaves room for the fade
  o1: P([2, 1], [6, 1], [10, 1], [14, 1]),
  o2: P([2, 0], [6, 2], [10, 0]),
  o3: P([2, 1], [6, 1]),
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
    autoRewindBeat: 48, // phase 3 (bar 13): the miss counter resets...
    rootBeat: 48, // ...and root access opens by itself
    // The fight. A phase starts on each of these beats and has its own share of the boss's
    // health (1 = the whole boss) and its own portrait. A phase is emptied by
    // its notes plus the combo attacks and the stuns. Every balance number is in
    // src/bossTuning.js (BOSS_TUNING); the spectacle is in src/bossShow.js.
    boss: {
      starts: [0, 24, 48],
      share: [0.3, 0.3, 0.4],
      faces: ['quiete-smile', 'ministro-calm', 'fusion-idle'],
      // the giant behind the highway in each phase (sprites `<who>-*` from tools/make_sprites.py)
      giant: ['quiete', 'ministro', 'fusion'],
      // the districts that help: district i fires its charge soon after phase i + 1 starts,
      // as strong as that level went (progress.js districtState)
      districts: ['brazilian', 'acid'],
      // black bars over a lane: the far part of the highway is hidden, notes show up late.
      // { from, to } in beats from bar 1.
      censor: [
        { from: 8, to: 16, lane: 2 },
        { from: 16, to: 24, lane: 0 },
      ],
    },
    track: {
      url: topOneClip,
      lead: topOneTiming.lead,
      length: topOneTiming.length,
      fadeIn: 0,
      fadeOut: 0.3,
    },
    patterns: TOPONE_PATTERNS,
    bars: [
      ['drop', 'c1'], ['hold', 'c2'], ['hold', 'c1'], ['hold', 'c3'], ['hold', 'c2'], ['hold', 'c4'],
      ['drop', 'd1'], ['hold', 'd2'], ['hold', 'd1'], ['hold', 'd3'], ['hold', 'd2'], ['hold', 'd4'],
      ['drop', 'e1'], ['hold', 'e2'], ['hold', 'e3'], ['hold', 'e1'], ['hold', 'e2'], ['hold', 'e3'], ['hold', 'e4'],
      ['out', 'o1'], ['out', 'o2'], ['out', 'o3'],
    ],
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
      ['drop', 'a'], ['drop', 'b'], ['drop', 'a'], ['drop', 'b'],
      ['drop', 'c'], ['drop', 'b'], ['drop', 'c'], ['drop', 'f'],
      ['drop', 'c'], ['drop', 'b'], ['drop', 'c'], ['drop', 'd'],
      ['drop', 'c'], ['drop', 'd'], ['drop', 'c'], ['drop', 'f'],
      ['drop', 'c'], ['drop', 'b'], ['drop', 'd'], ['drop', 'c'],
      ['drop', 'd'], ['drop', 'z'],
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
  { layer: 'SERVER', id: 'server' }, // boss fight vs QUIETE.SYS and the Minister
];
