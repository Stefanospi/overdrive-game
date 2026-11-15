import Phaser from 'phaser';
import { W, px, COLORS } from './config.js';
import { TEXTS } from './texts.js';
import { BOSS_TUNING as T } from './bossTuning.js';

// The spectacle of the boss fight: everything the level `server` has on top of a normal
// level. It lives next to the Play scene and is driven by it (onHit, onBreak, update).
// Nothing here stops the notes, the judgements or the music: freezes are visual only.
const CX = W / 2;
const ATTACK_MS = { riff: 420, drop: 380, root: 620 };
export const GOLD = 0xffc83a; // the stun colour (the Minister's cane)

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
  }

  // ---- stage A: combo attacks ---------------------------------------------------
  // Called after a note is hit, with the combo already counted.
  onHit(n, key) {
    const s = this.s;
    const sb = s.songBeat();
    this.addGuard(T.guardGain[key] || 0, sb);
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
    s.flashWord(TEXTS.boss.words[tier.key], 800, 2);
    s.cameras.main.shake(120 + i * 110, 0.006 + i * 0.005);
    if (i === 2) s.flash = 1;
    if (!this.reduced) this.freeze = Math.max(this.freeze, T.hitstop);
    if (navigator.vibrate) navigator.vibrate(20 + i * 20);
  }

  // The combo broke (`combo` = what it was). A long one gives the boss an opening.
  onBreak(combo, lane) {
    this.armed.fill(true);
    if (!this.stunned()) this.guard = Math.max(0, this.guard - T.guardMiss);
    if (combo < T.counterFrom) return;
    if (!this.stunned()) this.guard *= 1 - T.counterGuardLoss;
    this.counter.lane = lane;
    this.counter.from = this.s.songBeat();
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

  // Where the attacks land: the middle of whoever is fighting now.
  aim() {
    const s = this.s;
    const live = s.fighters.filter((f) => s.level.boss.fighters[s.boss.phase].includes(f.who));
    const x = live.reduce((sum, f) => sum + f.x, 0) / Math.max(1, live.length);
    return { x, y: s.feetY - px(50) };
  }

  // ---- frame ---------------------------------------------------------------------
  update(sb, dt) {
    const frozen = this.freeze > 0;
    this.freeze = Math.max(0, this.freeze - dt * 1000);
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
    this.drawAttacks(vdt);
    this.drawCounter(sb);
  }

  drawAttacks(vdt) {
    const g = this.g;
    const s = this.s;
    const to = this.aim();
    const y0 = px(s.coneY);
    for (const a of this.attacks) {
      if (a.t >= 1) continue;
      a.t = Math.min(1, a.t + (vdt * 1000) / ATTACK_MS[a.kind]);
      const p = a.t;
      for (const side of [-1, 1]) {
        const x0 = CX + side * px(s.coneDx);
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
    this.dark.destroy();
  }
}
