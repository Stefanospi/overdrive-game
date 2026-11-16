import Phaser from 'phaser';
import { W, K, LH, px, COLORS, FONT_PS, PARAMS } from './config.js';
import { textTexture } from './ui.js';
import { districtState } from './progress.js';
import { SPRITES, PALETTE, SPRITE_W, SPRITE_H } from './sprites.js';
import { TEXTS } from './texts.js';
import { BOSS_TUNING as T } from './bossTuning.js';

// The spectacle of the boss fight: everything the level `server` has on top of a normal
// level. It lives next to the Play scene and is driven by it (onHit, onBreak, update).
// Nothing here stops the notes, the judgements or the music: freezes are visual only.
const CX = W / 2;
const ATTACK_MS = { riff: 420, drop: 380, root: 620 };
export const GOLD = 0xffc83a; // the stun colour (the Minister's cane)
const IDLE = { quiete: 'quiete-smile', ministro: 'ministro-calm', fusion: 'fusion-idle' };
const TRANSITION = 0.6; // seconds a phase change takes, after the freeze
const SWIRL = 36; // bits in the fusion vortex
const CUBES = 100; // pixel cubes: one fixed pool, nothing is allocated while playing
const SHOTS = 40; // glitch fragments in flight (fixed pool)
const IMPACTS = 16; // glitch tears on the boss (fixed pool)
const CUBE_COLORS = [COLORS.silver, COLORS.red, COLORS.paper, 0x232b4a, 0x0c0c10];
const rnd = (i) => {
  const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
  return x - Math.floor(x);
};

export class BossShow {
  constructor(scene) {
    this.s = scene;
    this.reduced = scene.reduced;
    this.g = scene.add.graphics().setDepth(-1.5).setBlendMode(Phaser.BlendModes.ADD); // light
    this.dark = scene.add.graphics().setDepth(-2.5); // shadows
    this.armed = T.tiers.map(() => true);
    this.fired = T.tiers.map(() => -99); // song beat of the last time each attack fired
    this.attacks = T.tiers.map((t) => ({ kind: t.key, t: 1 })); // one slot per attack, t = 0..1
    this.counter = { lane: 0, from: -99 };
    this.freeze = 0; // ms of visual stop left
    this.guard = 0; // 0..guardMax: full = the boss is stunned
    this.stunUntil = -99; // song beat
    this.stunFrom = -99;
    this.stuns = T.stunsPerPhase.map(() => 0); // stuns used in each phase
    this.wasStunned = false;
    this.vis = 0; // visual clock in seconds: it stops during a freeze
    this.ga = T.giantAlpha; // the giant's opacity
    this.buildGiant();
    this.buildCutIn();
    this.buildDistricts();
  }

  // ---- stage A: combo attacks ---------------------------------------------------
  // Called after a note is hit, with the combo already counted.
  onHit(n, key) {
    const s = this.s;
    const sb = s.songBeat();
    this.addGuard(T.guardGain[key] || 0, sb);
    s.lockStep(key); // a locked crew button opens with PERFECTs
    this.launch(n, key);
    T.tiers.forEach((tier, i) => {
      if (s.combo < tier.combo || !this.armed[i]) return;
      this.armed[i] = false;
      if (sb - this.fired[i] < T.tierCooldown) return;
      this.fired[i] = sb;
      this.fire(i, n);
    });
  }

  fire(i, n) {
    const s = this.s;
    const tier = T.tiers[i];
    s.takeBoss(s.boss.phase, tier.dmg, n, true);
    this.attacks[i].t = 0;
    if (i === 2) this.cutIn('mars', TEXTS.boss.words.root); // MARS ROOT
    else s.flashWord(TEXTS.boss.words[tier.key], 800, 2);
    s.cameras.main.shake(120 + i * 110, 0.006 + i * 0.005);
    if (i === 2) s.flash = 1;
    if (!this.reduced) this.freeze = Math.max(this.freeze, T.hitstop);
    if (navigator.vibrate) navigator.vibrate(20 + i * 20);
  }

  // The combo broke (`combo` = what it was). A long one gives the boss an opening.
  onBreak(combo, lane) {
    this.armed.fill(true);
    if (!this.stunned()) this.guard = Math.max(0, this.guard - T.guardMiss);
    if (!this.stunned() && this.s.boss.segs[this.s.boss.phase].hp > 0) this.atkAt = this.vis; // any miss: it swings at you
    if (combo < T.counterFrom || this.stunned()) return;
    const s = this.s;
    const sb = s.songBeat();
    this.guard *= 1 - T.counterGuardLoss;
    this.counter.lane = lane;
    this.counter.from = sb;
    if (sb >= T.resultBeat) return; // after bar 19 the fight is over
    // RIPRISTINO: from the later phases the boss also takes some health back
    const B = s.boss;
    const seg = B.segs[B.phase];
    if (B.phase >= T.healFrom && seg.hp > 0) {
      seg.hp = Math.min(seg.cap, seg.hp + T.healBreak);
      s.flashWord(TEXTS.boss.words.heal, 900, 2);
    } else {
      s.flashWord(TEXTS.boss.words.drone, 900, 2);
    }
  }

  // DRONE: the drone that came down on a lane after a long combo broke really hides that
  // lane's far notes for `droneBeats`. Returns { lane, a } (a = 0..1 fade) or null.
  drone(sb) {
    const c = this.counter;
    if (c.from < -90 || sb < c.from || sb >= c.from + T.droneBeats) return null;
    return { lane: c.lane, a: Phaser.Math.Clamp(Math.min(sb - c.from, c.from + T.droneBeats - sb), 0, 1) };
  }

  // ---- stage B: guard and stun -----------------------------------------------------
  // Clean hits wear the guard down; when it breaks the boss is stunned: gold notes, more
  // damage. A phase allows only so many stuns, and an empty segment needs none.
  canStun() {
    const B = this.s.boss;
    return this.stuns[B.phase] < T.stunsPerPhase[B.phase] && B.segs[B.phase].hp > 0;
  }

  stunned(sb = this.s.songBeat()) {
    return sb < this.stunUntil;
  }

  dmgMult() {
    return this.stunned() ? T.stunDmg : 1;
  }

  addGuard(v, sb) {
    if (this.stunned(sb) || !this.canStun()) return;
    this.guard += v;
    if (this.guard < T.guardMax) return;
    const s = this.s;
    const B = s.boss;
    const next = B.segs[B.phase + 1];
    this.guard = 0;
    this.stuns[B.phase]++;
    this.stunFrom = sb;
    this.stunUntil = Math.min(sb + T.stunBeats, next ? next.start : Infinity);
    s.flashWord(TEXTS.boss.words.stun, 1000, 3);
    s.flash = 0.6;
    s.cameras.main.shake(200, 0.01);
    if (navigator.vibrate) navigator.vibrate([20, 30, 60]);
  }

  // The guard bar, under the health bar: silver while it fills, gold and draining during
  // a stun, dark when this phase has no stun left.
  drawGuard(g, x, y, w, h) {
    const sb = this.s.songBeat();
    g.fillStyle(COLORS.redDeep, 1).fillRect(x, y, w, h);
    if (this.stunned(sb)) {
      const left = (this.stunUntil - sb) / Math.max(0.01, this.stunUntil - this.stunFrom);
      g.fillStyle(GOLD, Math.floor(sb * 4) % 2 ? 1 : 0.7).fillRect(x, y, w * Phaser.Math.Clamp(left, 0, 1), h);
    } else if (this.canStun()) {
      g.fillStyle(COLORS.silver, 1).fillRect(x, y, w * Math.min(1, this.guard / T.guardMax), h);
    } else {
      g.fillStyle(COLORS.grey, 1).fillRect(x, y, w, h);
    }
  }

  // ---- your hits are glitches ---------------------------------------------------------
  // Every note you hit throws a red fragment of corrupted data from its lane at the boss
  // (two on a perfect). It flies in jumps, leaves torn trails, and tears the boss where it
  // lands. Purely visual: the damage is dealt by `takeBoss`, as before.
  launch(n, key) {
    if (this.gone || !n) return;
    const s = this.s;
    const to = this.aim();
    const count = key === 'perfect' ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const sh = this.shots[this.shotAt++ % SHOTS];
      sh.on = true;
      sh.t = 0;
      sh.seed = Math.floor(Math.random() * 1000);
      sh.big = key === 'perfect';
      sh.x0 = s.laneX(n.lane, 1) + px(Phaser.Math.Between(-5, 5));
      sh.y0 = px(s.hitY) - px(12);
      sh.x1 = to.x + (Math.random() - 0.5) * 16 * this.sc;
      sh.y1 = to.y + Math.random() * 22 * this.sc;
    }
  }

  // Where a fragment lands: a few torn red slices and some loose pixels.
  impact(x, y) {
    const im = this.impacts[this.impAt++ % IMPACTS];
    im.on = true;
    im.t = 0;
    im.x = x;
    im.y = y;
    im.seed = Math.floor(Math.random() * 1000);
    if (this.cubes.length) for (let k = 0; k < 3; k++) this.cube(x, y, px(-110 + Math.random() * 220), px(-120 - Math.random() * 80), px(3 + Math.floor(Math.random() * 3)), k % 2 ? COLORS.red : 0xffffff, 0.45);
  }

  drawGlitches(vdt) {
    const g = this.g;
    const steps = this.reduced ? 24 : T.glitchSteps;
    const jit = this.reduced ? 0 : 1;
    const tick = Math.floor(this.vis * 28);
    for (const sh of this.shots) {
      if (!sh.on) continue;
      sh.t += vdt / T.glitchTravel;
      if (sh.t >= 1) {
        sh.on = false;
        this.impact(sh.x1, sh.y1);
        continue;
      }
      const q = Math.floor(sh.t * steps) / steps; // it moves in jumps
      // torn trail: wide flat slices pushed sideways, further back = thinner and fainter
      for (let i = 3; i >= 1; i--) {
        const e = Math.max(0, q - i * 0.09);
        const k = e * e * 0.65 + e * 0.35; // it speeds up toward the boss
        const tx = sh.x0 + (sh.x1 - sh.x0) * k;
        const ty = sh.y0 + (sh.y1 - sh.y0) * k;
        const dx = (rnd(sh.seed + i * 7 + tick) - 0.5) * px(16) * jit;
        const w = px((sh.big ? 14 : 9) - i * 2);
        g.fillStyle(COLORS.red, 0.7 - i * 0.16).fillRect(tx + dx - w / 2, ty - px(1), w, px(2));
      }
      if (jit && rnd(sh.seed + tick) > 0.88) continue; // it drops out for a frame
      const k = q * q * 0.65 + q * 0.35;
      const x = sh.x0 + (sh.x1 - sh.x0) * k;
      const y = sh.y0 + (sh.y1 - sh.y0) * k;
      const r = px(sh.big ? 5 : 3);
      g.fillStyle(COLORS.red, 1).fillRect(x - r, y - r, r * 2, r * 2);
      g.fillStyle(0xffffff, 1).fillRect(x - r / 2, y - r / 2, r, r);
      g.fillStyle(COLORS.red, 0.9).fillRect(x - r * 3, y - px(1), r * 6, px(2)); // the glitch line
    }
    for (const im of this.impacts) {
      if (!im.on) continue;
      im.t += (vdt * 1000) / T.impactMs;
      if (im.t >= 1) {
        im.on = false;
        continue;
      }
      const a = 1 - im.t;
      for (let i = 0; i < 4; i++) {
        const w = px(10 + rnd(im.seed + i) * 30);
        const dx = (rnd(im.seed + i * 3 + 1) - 0.5) * px(26) * jit;
        g.fillStyle(i % 2 ? 0xffffff : COLORS.red, a * 0.6).fillRect(im.x + dx - w / 2, im.y + (i - 2) * px(4), w, px(2 + (i % 2)));
      }
      g.fillStyle(COLORS.red, a * 0.8).fillRect(im.x - px(5), im.y - px(5), px(10), px(10));
    }
    this.drawTears();
  }

  // Corruption that stays on the boss as its health goes: red tears across the body that
  // flicker (still, with reduced effects).
  drawTears() {
    if (this.gone) return;
    const B = this.s.boss;
    const seg = B.segs[B.phase];
    const lost = 1 - seg.hp / seg.cap;
    const n = Math.ceil(lost * T.glitchTears);
    const g = this.g;
    const gi = this.giant;
    const tick = Math.floor(this.vis * 10);
    for (let i = 0; i < n; i++) {
      if (!this.reduced && rnd(i * 7 + tick) < 0.4) continue;
      const w = (10 + rnd(i + 5) * 26) * this.sc;
      const x = gi.x + (rnd(i + 21) - 0.5) * 20 * this.sc - w / 2;
      const y = gi.y + (6 + rnd(i + 11) * 46) * this.sc;
      g.fillStyle(COLORS.red, 0.3).fillRect(x, y, w, Math.max(px(2), 1.2 * this.sc));
    }
  }

  // ---- stage C: the giant -------------------------------------------------------------
  // The boss of the current phase stands where the speakers used to be, in front of the
  // player, and the notes come out from under its feet. Its state follows the health of that phase's segment: pieces go
  // missing as it drops, below half it switches to the `broken` sprite, and at zero (or
  // while stunned) it is on its knees. It only dies at ESEGUI (crumble).
  buildGiant() {
    const s = this.s;
    // The boss stands on the speaker stack, facing the player, and never reaches the
    // highway: as tall as the room between the boss strip and the slot the notes come out of.
    const room = s.stackBottom - T.giantFloor - T.giantTop;
    // only the top `bustRows` rows of the sprite show (head to waist): a bust, as big as the room allows
    this.rows = Math.min(SPRITE_H, T.bustRows);
    this.kr = 0; // rows given up while kneeling (the bottom edge stays put)
    this.sc = px(Math.max(1.5, Math.floor((room / this.rows) * 4) / 4)); // screen px per sprite pixel
    this.topY = px(T.giantTop);
    this.who = s.level.boss.giant[0];
    this.key = IDLE[this.who];
    this.giant = s.add.image(CX, this.topY, this.key).setOrigin(0.5, 0).setScale(this.sc).setDepth(-4.5).setAlpha(this.ga).setCrop(0, 0, SPRITE_W, this.rows);
    this.holesG = s.add.graphics().setDepth(-4.45);
    this.cubesG = s.add.graphics().setDepth(-4.4);
    this.ghost = s.add.image(CX, this.topY, this.key).setOrigin(0.5, 0).setScale(this.sc).setDepth(-4.6).setVisible(false).setCrop(0, 0, SPRITE_W, this.rows); // the boss that is leaving
    this.tr = { t: 9, fusion: false };
    this.slow = 0; // seconds of slow motion left (final KO)
    this.hurtAt = -99;
    this.atkAt = -99;
    this.bob = 0;
    this.holesShown = 0;
    this.gone = false; // crumbled
    this.koType = [];
    // where the pieces go missing: fixed spots on the body, in sprite pixels
    this.holes = [];
    for (let i = 0; i < T.holes; i++) this.holes.push({ x: 7 + Math.floor(rnd(i + 3) * 19), y: 5 + Math.floor(rnd(i + 40) * (this.rows - 12)), w: 2 + Math.floor(rnd(i + 80) * 2) }); // small: the boss is drawn big
    this.cubes = [];
    for (let i = 0; i < CUBES; i++) this.cubes.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, size: 0, color: 0, life: 0, wait: 0 });
    this.cubeAt = 0;
    this.shots = [];
    for (let i = 0; i < SHOTS; i++) this.shots.push({ on: false, x0: 0, y0: 0, x1: 0, y1: 0, t: 0, seed: 0, big: false });
    this.impacts = [];
    for (let i = 0; i < IMPACTS; i++) this.impacts.push({ on: false, x: 0, y: 0, t: 0, seed: 0 });
    this.shotAt = 0;
    this.impAt = 0;
    // damage numbers: a small pool of texts, reused in turn
    const style = { fontFamily: FONT_PS, fontSize: px(9) + 'px', color: '#ffffff' };
    this.dmgTexts = [];
    for (let i = 0; i < 6; i++) this.dmgTexts.push(s.add.text(0, 0, '', style).setOrigin(0.5).setDepth(7).setAlpha(0).setShadow(px(2), px(2), '#000000', 0, false, true));
    this.dmgAt = 0;
  }

  // Where the attacks land: the giant's face.
  aim() {
    return { x: this.giant.x, y: this.giant.y + 15 * this.sc };
  }

  // The boss took `taken` (1 = the whole boss): it flinches and a number flies out.
  onHurt(i, taken, strong) {
    this.hurtAt = this.vis;
    const s = this.s;
    const t = this.dmgTexts[this.dmgAt++ % this.dmgTexts.length];
    s.tweens.killTweensOf(t);
    const y = px(s.stackBottom - 70);
    t.setText('-' + Math.max(1, Math.round(taken * 1000)))
      .setColor(strong ? '#ffffff' : '#ff7a7a')
      .setPosition(CX + px(Phaser.Math.Between(-44, 44)), y)
      .setScale(strong ? 1.5 : 1)
      .setAlpha(1);
    s.tweens.add({ targets: t, y: y - px(24), alpha: 0, scale: strong ? 1.1 : 0.8, duration: 520, ease: 'Quad.Out' });
  }

  cube(x, y, vx, vy, size, color, life, wait = 0) {
    const c = this.cubes[this.cubeAt++ % CUBES];
    c.on = true;
    c.x = x;
    c.y = y;
    c.vx = vx;
    c.vy = vy;
    c.size = size;
    c.color = color;
    c.life = life;
    c.wait = wait;
  }

  updateGiant(sb, vdt) {
    const s = this.s;
    const B = s.boss;
    const seg = B.segs[B.phase];
    const who = s.level.boss.giant[B.phase];
    if (who !== this.who) {
      this.changePhase(this.who, who, B.phase);
      this.who = who;
      this.holesShown = 0;
    }
    const kneel = seg.hp === 0 || this.stunned(sb);
    const hurt = Phaser.Math.Clamp(1 - (this.vis - this.hurtAt) / 0.17, 0, 1);
    const atk = Phaser.Math.Clamp(1 - (this.vis - this.atkAt) / 0.34, 0, 1);
    const key = kneel ? who + '-ko' : hurt > 0 ? who + '-hurt' : atk > 0 ? who + '-attack' : seg.hp < seg.cap * 0.5 ? who + '-broken' : IDLE[who];
    const g = this.giant;
    const kr = kneel ? 6 : 0;
    if (key !== this.key || kr !== this.kr) {
      this.key = key;
      this.kr = kr;
      g.setTexture(key).setCrop(0, 0, SPRITE_W, this.rows - kr);
    }
    if (vdt > 0) this.bob = kneel ? 0 : Math.abs(Math.sin(sb * Math.PI)) * px(4); // frozen: the pose holds
    const lunge = Math.sin(atk * Math.PI) * 3 * this.sc; // it leans toward you
    const shake = this.reduced ? 0 : Math.sin(this.vis * 90) * hurt * px(3);
    g.setPosition(CX + shake, this.topY + this.kr * this.sc - this.bob + lunge);
    g.setScale(this.sc * (1 + atk * 0.05));
    g.setAlpha(this.ga);
    this.drawTransition(vdt);
    if (hurt > 0.6 && !kneel && !this.reduced) g.setTintFill(0xffffff);
    else g.clearTint();
    g.setVisible(!this.gone);

    // pieces missing: as many as the health lost
    const hg = this.holesG.clear();
    if (this.gone) return;
    const n = Math.floor((1 - seg.hp / seg.cap) * T.holes + 0.001);
    const x0 = g.x - (SPRITE_W / 2) * g.scaleX;
    for (let i = 0; i < n; i++) {
      const h = this.holes[i];
      const hx = x0 + h.x * g.scaleX;
      const hy = g.y + h.y * g.scaleX;
      hg.fillStyle(COLORS.bg, 1).fillRect(hx, hy, h.w * g.scaleX, h.w * g.scaleX);
      hg.lineStyle(px(1), COLORS.red, 0.7).strokeRect(hx, hy, h.w * g.scaleX, h.w * g.scaleX);
      if (i >= this.holesShown) {
        // a new piece comes off
        for (let k = 0; k < 5; k++) this.cube(hx + Math.random() * h.w * g.scaleX, hy, px(-120 + Math.random() * 240), px(-160 - Math.random() * 120), px(4 + Math.floor(Math.random() * 5)), CUBE_COLORS[k % CUBE_COLORS.length], 0.9);
      }
    }
    this.holesShown = Math.max(this.holesShown, n);
  }

  // ---- stage F: phase changes ----------------------------------------------------------
  // Bar 7: QUIETE.SYS falls and the Minister comes down in its place. Bar 13: FUSION, a
  // vortex of pixels pulls the two together. Everything visual stops for half a second
  // first (the notes do not).
  changePhase(from, to, phase) {
    const s = this.s;
    if (!this.reduced) this.freeze = Math.max(this.freeze, T.transitionFreeze);
    this.tr.t = 0;
    this.tr.fusion = to === 'fusion';
    this.ghost.setTexture(from + '-ko').setCrop(0, 0, SPRITE_W, this.rows).setPosition(this.giant.x, this.giant.y).setScale(this.sc).setAngle(0).setAlpha(this.ga).setVisible(true);
    const word = TEXTS.boss.words.phase[phase];
    if (word) {
      s.setMars(phase === 2 ? 'shout' : 'angry');
      s.flashWord(word, 1100, 4);
    }
    s.flash = 0.5;
    s.cameras.main.shake(240, 0.01);
  }

  drawTransition(vdt) {
    const tr = this.tr;
    if (tr.t >= TRANSITION) {
      this.ghost.setVisible(false);
      return;
    }
    tr.t += vdt;
    const e = Phaser.Math.Clamp(tr.t / TRANSITION, 0, 1);
    const g = this.giant;
    const gh = this.ghost;
    if (!tr.fusion) {
      // the old one tips over and drops out, the new one comes down from above
      gh.setY(this.topY + 9 * this.sc + 70 * this.sc * e * e).setAngle(12 * e).setAlpha(this.ga * (1 - e));
      const d = 1 - (1 - e) * (1 - e);
      g.setY(g.y - 30 * this.sc * (1 - d)).setAlpha(this.ga * d);
      return;
    }
    // fusion: the old body is sucked into a vortex, the fused one bursts out of it
    const to = this.aim();
    gh.setScale(this.sc * (1 - e)).setPosition(CX, this.topY + 20 * this.sc * e).setAlpha(this.ga * (1 - e));
    const out = Phaser.Math.Clamp((e - 0.7) / 0.3, 0, 1);
    g.setAlpha(this.ga * out).setScale(this.sc * (1.3 - 0.3 * out));
    const c = this.cubesG;
    for (let i = 0; i < SWIRL; i++) {
      const r = (8 + 60 * rnd(i + 9)) * this.sc * (1 - e);
      const a = i * 0.9 + this.vis * (10 + 6 * rnd(i));
      const size = px(4 + Math.floor(rnd(i + 2) * 6));
      c.fillStyle(CUBE_COLORS[i % CUBE_COLORS.length], 0.9).fillRect(to.x + Math.cos(a) * r - size / 2, to.y + Math.sin(a) * r * 0.8 - size / 2, size, size);
    }
  }

  // The final KO (called by the finale at ESEGUI): the giant crumbles in slow motion, the
  // colours flip for a moment (not with reduced effects) and ROOT TOTALE lands in giant
  // outlined type, flyer style. `gap` = seconds between the bands that let go.
  ko(gap, power = 1) {
    const s = this.s;
    this.crumble(gap, power);
    this.slow = 0.9;
    s.flash = 1;
    s.cameras.main.shake(500, 0.012 + 0.008 * power);
    if (!this.reduced) {
      s.inv.v = 1;
      s.tweens.add({ targets: s.inv, v: 0, delay: 350, duration: 500 });
    }
    TEXTS.boss.ko.split(' ').forEach((word, i) => {
      const key = textTexture(s, 'boss-ko-' + word, word, { size: 48, stroke: '#ffffff', strokeW: 2 });
      const img = s.add.image(CX, px(LH * 0.34 + i * 58), key).setDepth(31).setAlpha(0).setScale(this.reduced ? 1 : 2.4);
      s.tweens.add({ targets: img, alpha: 1, scale: 1, delay: gap * 2000 + i * 120, duration: 160, ease: 'Back.Out' });
      this.koType.push(img);
    });
  }

  // The final KO: the giant falls apart into the pixels it is made of. They let go one
  // band at a time, top first, `gap` seconds apart (half a beat), so it crumbles in time.
  crumble(gap, power = 1) {
    if (this.gone) return;
    this.gone = true;
    const g = this.giant;
    const rects = SPRITES[this.key] || [];
    const step = Math.max(1, Math.ceil(rects.length / CUBES));
    const x0 = g.x - (SPRITE_W / 2) * g.scaleX;
    for (let i = 0; i < rects.length; i += step) {
      const [x, y, w, h, c] = rects[i];
      if (y >= this.rows) continue; // below the waist: not on show
      const band = Math.floor((y / this.rows) * 4);
      const size = Math.min(px(14), Math.max(w, h, 2) * g.scaleX * 0.6);
      this.cube(x0 + (x + w / 2) * g.scaleX, g.y + (y + h / 2) * g.scaleX, px(-200 + Math.random() * 400) * power, px(-260 - Math.random() * 240) * power, size, parseInt(PALETTE[c].slice(1), 16), 1.6, band * gap);
    }
  }

  drawCubes(dt) {
    const g = this.cubesG.clear();
    this.slow = Math.max(0, this.slow - dt);
    const vdt = this.slow > 0 ? dt * 0.3 : dt; // slow motion slows the fall, not when the bands let go
    const grav = px(1300) * vdt;
    for (const c of this.cubes) {
      if (!c.on) continue;
      if (c.wait > 0) {
        c.wait -= dt; // still part of the giant
      } else {
        c.life -= vdt;
        if (c.life <= 0) {
          c.on = false;
          continue;
        }
        c.vy += grav;
        c.x += c.vx * vdt;
        c.y += c.vy * vdt;
      }
      g.fillStyle(c.color, Math.min(1, c.life * 2)).fillRect(c.x - c.size / 2, c.y - c.size / 2, c.size, c.size);
    }
  }

  // ---- stage D: crew cut-ins ----------------------------------------------------------
  // A super move: a slanted band with the portrait cuts across the speakers for 0.6 s while
  // the giant word says what it is. Purely visual; the power itself is the one Play already
  // has (shield, rewind, ID FALSA, root). The band is built once and reused.
  buildCutIn() {
    const s = this.s;
    const h = px(58);
    const lean = px(26);
    const g = s.add.graphics();
    g.fillStyle(0x000000, 0.9);
    g.beginPath();
    g.moveTo(lean, -h / 2);
    g.lineTo(W + lean, -h / 2);
    g.lineTo(W - lean, h / 2);
    g.lineTo(-lean, h / 2);
    g.closePath();
    g.fillPath();
    g.lineStyle(px(3), COLORS.red, 1).lineBetween(lean, -h / 2, W + lean, -h / 2).lineBetween(-lean, h / 2, W - lean, h / 2);
    g.lineStyle(px(1), 0xffffff, 0.5);
    for (let i = 0; i < 7; i++) g.lineBetween(rnd(i + 5) * W, -h / 2 + px(6 + i * 7), rnd(i + 5) * W + px(40 + rnd(i) * 90), -h / 2 + px(6 + i * 7));
    this.cutFace = s.add.image(0, px(4), 'mars-shout').setOrigin(0.5).setScale(K * 3).setCrop(0, 0, 36, 26);
    this.cut = s.add.container(0, px(s.stackBottom - 96), [g, this.cutFace]).setDepth(9.7).setVisible(false);
  }

  cutIn(who, word) {
    const s = this.s;
    s.killPopup();
    s.flashWord(word, 800, 3);
    const side = who === 'grafico' ? 1 : -1; // Gabriel comes in from the right
    this.cutFace.setTexture({ girl: 'girl-wink', grafico: 'grafico-wink', mars: 'mars-shout' }[who]).setCrop(0, 0, 36, 26);
    this.cutFace.setX(CX + side * px(120)).setFlipX(side > 0);
    const c = this.cut.setVisible(true);
    s.tweens.killTweensOf(c);
    if (this.reduced) {
      c.setX(0).setAlpha(0);
      s.tweens.add({ targets: c, alpha: 1, duration: 150 });
    } else {
      c.setX(side * W).setAlpha(1);
      s.tweens.add({ targets: c, x: 0, duration: 110, ease: 'Cubic.Out' });
    }
    s.tweens.add({ targets: c, alpha: 0, delay: 600, duration: 140, onComplete: () => c.setVisible(false) });
  }

  // ---- stage E: the districts help -----------------------------------------------------
  // The districts lit in levels 1 and 2 fire one charge each: district 1 (Firewall) soon
  // after phase 2 starts, district 2 (Proxy) after phase 3. Its soundsystem comes up beside
  // the stack for about a second and shoots. Lit = full power, unstable = half, off = none.
  buildDistricts() {
    const s = this.s;
    const forced = (PARAMS.get('districts') || '').split(',');
    this.districts = s.level.boss.districts.map((level, i) => {
      const state = ['high', 'mid', 'low'].includes(forced[i]) ? forced[i] : districtState(level);
      return { state, power: T.districtPower[state], at: s.level.boss.starts[i + 1] + T.districtDelay, done: false, t: 9, side: i ? 1 : -1, hit: false };
    });
    this.back = s.add.graphics().setDepth(-5.5);
  }

  // Two skyline icons in the boss strip: lit, flickering or dark.
  drawDistrictIcons(g, x, y) {
    this.districts.forEach((d, i) => {
      const on = d.state === 'high' || (d.state === 'mid' && rnd(Math.floor(this.s.time.now / 110) + i * 7) > 0.45);
      g.fillStyle(on ? COLORS.red : COLORS.grey, d.done ? 0.45 : 1);
      const x0 = x + i * px(15);
      [5, 8, 6].forEach((h, k) => g.fillRect(x0 + k * px(4), y + px(8 - h), px(3), px(h)));
    });
  }

  updateDistricts(sb, vdt) {
    const s = this.s;
    const g = this.back.clear();
    for (const d of this.districts) {
      if (!d.done && sb >= d.at && !s.rew) {
        d.done = true;
        if (d.power > 0 && sb < d.at + 4) {
          d.t = 0;
          d.hit = false;
          s.flashWord(TEXTS.hub.layers[this.districts.indexOf(d)], 900, 3);
        }
      }
      if (d.t >= 1.3) continue;
      d.t += vdt;
      const p = d.t;
      // the soundsystem rises beside the stack, plays, and goes back down
      const up = Phaser.Math.Clamp(p / 0.25, 0, 1) * Phaser.Math.Clamp((1.3 - p) / 0.25, 0, 1);
      const bw = px(46);
      const bh = px(70);
      const x = d.side < 0 ? px(6) : W - px(6) - bw;
      const y = px(s.stackBottom) - bh * up;
      g.fillStyle(0x050304, 1).fillRect(x, y, bw, bh);
      g.lineStyle(px(2), COLORS.silver, 0.6).strokeRect(x, y, bw, bh);
      const pulse = 0.5 + 0.5 * Math.sin(this.vis * 30);
      for (const [cy, r] of [[20, 12], [50, 15]]) {
        g.fillStyle(0x1a0c10, 1).fillCircle(x + bw / 2, y + px(cy), px(r));
        g.fillStyle(COLORS.red, 0.3 + 0.7 * pulse * d.power).fillCircle(x + bw / 2, y + px(cy), px(r * 0.55));
      }
      // windows of the district light up above it
      for (let k = 0; k < 12; k++) {
        if (rnd(k + d.side * 5) > up * d.power) continue;
        g.fillStyle(COLORS.red, 0.9).fillRect(x + px(4 + (k % 4) * 10), y - px(12 + Math.floor(k / 4) * 10), px(5), px(6));
      }
      if (p >= 0.55 && !d.hit) {
        d.hit = true;
        s.takeBoss(s.boss.phase, T.districtDmg * d.power, null, true);
        s.cameras.main.shake(180, 0.008);
        if (!this.reduced) this.freeze = Math.max(this.freeze, T.hitstop);
      }
      // the shot: Firewall sends a bass wave, Proxy an acid beam (a zigzag)
      const q = Phaser.Math.Clamp((p - 0.4) / 0.4, 0, 1);
      if (q <= 0 || q >= 1) continue;
      const to = this.aim();
      const fx = x + bw / 2;
      const fy = y + px(35);
      const a = this.g;
      if (d.side < 0) {
        for (let k = 0; k < 4; k++) {
          const r = Phaser.Math.Clamp(q * 1.3 - k * 0.1, 0, 1);
          if (r <= 0 || r >= 1) continue;
          a.lineStyle(px(4), k % 2 ? 0xffffff : COLORS.red, (1 - r) * d.power);
          a.strokeCircle(fx + (to.x - fx) * r, fy + (to.y - fy) * r, px(14 + 40 * r));
        }
      } else {
        a.lineStyle(px(5), COLORS.red, (1 - q) * d.power);
        a.beginPath();
        a.moveTo(fx, fy);
        for (let k = 1; k <= 10; k++) a.lineTo(fx + ((to.x - fx) * k) / 10, fy + ((to.y - fy) * k) / 10 + (k % 2 ? -1 : 1) * px(12) * (k < 10 ? 1 : 0));
        a.strokePath();
        a.lineStyle(px(2), 0xffffff, (1 - q) * d.power).lineBetween(fx, fy, to.x, to.y);
      }
    }
  }

  // ---- frame ---------------------------------------------------------------------
  update(sb, dt) {
    const frozen = this.freeze > 0;
    this.freeze = Math.max(0, this.freeze - this.s.game.loop.rawDelta); // real ms: a slow frame must not stretch it
    const vdt = frozen ? 0 : dt;
    this.vis += vdt;
    // the camera leans in while the boss is stunned
    const st = this.stunned(sb);
    if (st !== this.wasStunned) {
      this.wasStunned = st;
      if (!this.reduced) this.s.tweens.add({ targets: this.s.cameras.main, zoom: st ? T.stunZoom : 1, duration: st ? 180 : 400, ease: 'Quad.Out' });
    }
    this.g.clear();
    this.dark.clear();
    this.drawCubes(vdt);
    this.updateGiant(sb, vdt);
    this.drawAttacks(vdt);
    this.drawGlitches(vdt);
    this.drawCounter(sb);
    this.updateDistricts(sb, vdt);
  }

  drawAttacks(vdt) {
    const g = this.g;
    const s = this.s;
    const to = this.aim();
    const y0 = px(s.hitY) - px(12); // the attacks leave from your side of the highway
    for (const a of this.attacks) {
      if (a.t >= 1) continue;
      a.t = Math.min(1, a.t + (vdt * 1000) / ATTACK_MS[a.kind]);
      const p = a.t;
      for (const side of [-1, 1]) {
        const x0 = CX + side * px(56);
        if (a.kind === 'riff') {
          // bass wave: three rings ride from the cone to the boss, growing
          for (let k = 0; k < 3; k++) {
            const q = Phaser.Math.Clamp(p * 1.3 - k * 0.12, 0, 1);
            if (q <= 0 || q >= 1) continue;
            g.lineStyle(px(3), k ? COLORS.red : 0xffffff, 1 - q);
            g.strokeCircle(x0 + (to.x - x0) * q, y0 + (to.y - y0) * q, px(8 + 34 * q));
          }
        } else {
          // beam: a hot core inside a red glow, thinning as it fades
          const wide = a.kind === 'root' ? 22 : 12;
          const a1 = 1 - p;
          g.lineStyle(px(wide) * a1 + px(2), COLORS.red, 0.55 * a1).lineBetween(x0, y0, to.x, to.y);
          g.lineStyle(px(wide * 0.35) * a1 + px(1), 0xffffff, a1).lineBetween(x0, y0, to.x, to.y);
        }
      }
      // impact
      g.lineStyle(px(3), 0xffffff, 1 - p).strokeCircle(to.x, to.y, px(12 + 60 * p));
      if (a.kind === 'root') {
        // full screen: rays out of the boss
        for (let k = 0; k < 12; k++) {
          const ang = (k / 12) * Math.PI * 2 + 0.26;
          const r0 = px(30 + 200 * p);
          const r1 = r0 + px(120);
          g.lineStyle(px(4), k % 2 ? COLORS.red : 0xffffff, 0.8 * (1 - p));
          g.lineBetween(to.x + Math.cos(ang) * r0, to.y + Math.sin(ang) * r0, to.x + Math.cos(ang) * r1, to.y + Math.sin(ang) * r1);
        }
      }
    }
  }

  // The boss hits back: a shadow comes down one lane for a beat. It hides nothing that
  // matters (the lane stays readable) and changes no judgement.
  drawCounter(sb) {
    const p = sb - this.counter.from;
    if (p < 0 || p >= 1) return;
    const s = this.s;
    const g = this.dark;
    const l = this.counter.lane;
    const far = s.sFar;
    const head = far + (1 - far) * Math.min(1, p * 1.6); // the front of the shadow, sliding down
    const a = 0.5 * (1 - p);
    g.fillStyle(0x000000, a);
    g.beginPath();
    g.moveTo(s.laneEdge(l, far), s.yOf(far));
    g.lineTo(s.laneEdge(l + 1, far), s.yOf(far));
    g.lineTo(s.laneEdge(l + 1, head), s.yOf(head));
    g.lineTo(s.laneEdge(l, head), s.yOf(head));
    g.closePath();
    g.fillPath();
    // the drone at the front: a block with a red eye
    const x = (s.laneEdge(l, head) + s.laneEdge(l + 1, head)) / 2;
    const y = s.yOf(head);
    const w = px(46) * head;
    g.fillStyle(0x2a2a30, 1 - p).fillRect(x - w / 2, y - px(7) * head, w, px(10) * head);
    g.fillStyle(COLORS.red, 1 - p).fillRect(x - px(3) * head, y - px(4) * head, px(6) * head, px(4) * head);
  }

  destroy() {
    this.g.destroy();
    this.holesG.destroy();
    this.ghost.destroy();
    this.back.destroy();
    this.cubesG.destroy();
    this.dark.destroy();
  }
}
