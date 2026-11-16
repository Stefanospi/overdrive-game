// Every balance number of the boss fight (level `server`) lives here. Change these by hand;
// nothing else in the code holds a boss number. Beats count from bar 1 (4 beats per bar),
// so bar N starts on beat (N - 1) * 4. "Total health" means the whole boss = 1.
export const BOSS_TUNING = {
  // ---- damage of a single note ---------------------------------------------------
  // A phase's notes, all perfect with no bonus at all, take 1 / base of that phase's
  // segment. Above 1 the notes alone are not enough: combo attacks, stuns and the
  // districts do the rest. Lower = easier boss.
  base: 1.3,
  grade: { perfect: 1, good: 0.7, ok: 0.4 }, // weight of each judgement
  comboMin: 0.9, // damage multiplier with no combo...
  comboMax: 2, // ...and from `comboFull` notes in a row (linear in between)
  comboFull: 40,
  forgeDmg: 1.5, // while Gabriel's ID FALSA is on
  rootDmg: 2, // while root access is open

  // ---- stage A: the combo is the weapon -----------------------------------------
  // Reaching each combo fires an attack worth `dmg` of the TOTAL health.
  tiers: [
    { combo: 10, dmg: 0.03, key: 'riff' }, // bass wave
    { combo: 25, dmg: 0.06, key: 'drop' }, // beam
    { combo: 40, dmg: 0.1, key: 'root' }, // full-screen hit (with Mars's cut-in)
  ],
  tierCooldown: 8, // beats (2 bars) before the same attack can fire again
  hitstop: 80, // ms the sprites freeze on an attack (visual only)
  counterFrom: 10, // breaking a combo this long makes the boss hit back...
  counterGuardLoss: 0.5, // ...and takes this share of the guard you had built

  // ---- stage B: guard and stun ----------------------------------------------------
  guardMax: 10, // points needed to break the guard
  guardGain: { perfect: 1, good: 0.5, ok: 0 },
  guardMiss: 2, // points lost on a miss
  stunBeats: 16, // 4 bars, or until the phase ends
  stunDmg: 3, // damage multiplier while the boss is stunned
  stunZoom: 1.08, // camera zoom during a stun (1 = none)
  stunsPerPhase: [1, 1, 2],

  // ---- stage C: the giant ----------------------------------------------------------
  // The boss stands on the speaker stack, in front of the player, above the highway.
  // There is no speaker stack in this level: the boss takes its place and the notes come out
  // from under its feet.
  bustRows: 32, // rows of the 58-row sprite that show: head to waist, so the boss is huge
  giantTop: 124, // logical y of its head (just under the boss strip)
  giantFloor: 6, // logical px left between its feet and the slot the notes come out of
  // Your hits are glitches: red fragments of corrupted data (Blackwall style) leave the lane
  // you hit and fly at the boss, in jumps, and tear a bit of it on impact.
  glitchTravel: 0.3, // s from your lane to the boss
  glitchSteps: 7, // jumps per flight (the stutter)
  glitchTears: 6, // red tears that stay on the boss when its segment is empty (flicker)
  impactMs: 240,

  // ---- the bosses' powers (they change the game; each one has a one-word warning) -------
  droneBeats: 4, // DRONE: breaking a combo of `counterFrom`+ puts a drone on that lane, hiding its far notes
  healFrom: 2, // RIPRISTINO: from this phase (0-based), the same break also heals the boss...
  healBreak: 0.03, // ...by this share of the TOTAL health
  decreeScore: 250, // DECRETO: striped notes you must NOT tap. Letting one pass gives this, +guard
  decreeGuard: 1,
  lockPerfects: 3, // BLOCCO: the crew's buttons come locked from phase 2; this many PERFECTs open them
  lockMs: 9000, // how long a locked button waits
  giantAlpha: 1,
  roadAlpha: 0.93, // highway floor opacity (as in the other levels)
  holes: 16, // pieces missing from the giant when its segment is empty

  // ---- stage E: the districts help ------------------------------------------------
  districtDmg: 0.08, // of the total health, at full power
  districtPower: { high: 1, mid: 0.5, low: 0 }, // lit / unstable / off
  districtDelay: 4, // beats after the phase starts (so it does not cover the transition)

  // ---- stage F: phase changes ------------------------------------------------------
  transitionFreeze: 500, // ms the sprites and particles stop (visual only)

  // ---- stage G: ESEGUI ---------------------------------------------------------------
  // In the track the break is bar 20 alone and the drop comes back on bar 21.
  resultBeat: 76, // end of bar 19: the result (high / mid / low) is taken here
  chargeBeat: 76, // the ESEGUI ring starts filling (start of bar 20)
  unlockBeat: 80, // ring full: the button waits for the tap, the last beat of the riser loops
  codaLoop: [92, 108], // bars 24-27 loop under the EP screen
  tapGuard: 0.02, // s: a tap this close to the next beat goes to the one after
  autoTap: 2, // beats the debug bot (?auto) waits before tapping
  boomBeats: 4, // beats of explosion before the EP screen comes in
};
