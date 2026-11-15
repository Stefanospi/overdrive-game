import Phaser from 'phaser';
import { W, K, px, COLORS, FONT_PS } from './config.js';
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
const CUBES = 100; // pixel cubes: one fixed pool, nothing is allocated while playing
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
    this.buildGiant();
    this.buildCutIn();
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

  // ---- stage C: the giant -------------------------------------------------------------
  // The boss of the current phase stands behind the highway, as tall as the screen, and
  // shows through it. Its state follows the health of that phase's segment: pieces go
  // missing as it drops, below half it switches to the `broken` sprite, and at zero (or
  // while stunned) it is on its knees. It only dies at ESEGUI (crumble).
  buildGiant() {
    const s = this.s;
    this.sc = K * T.giantScale; // screen px per sprite pixel
    this.topY = px(s.stackBottom + 2);
    this.who = s.level.boss.giant[0];
    this.key = IDLE[this.who];
    this.giant = s.add.image(CX, this.topY, this.key).setOrigin(0.5, 0).setScale(this.sc).setDepth(-4.5).setAlpha(T.giantAlpha);
    this.holesG = s.add.graphics().setDepth(-4.45);
    this.cubesG = s.add.graphics().setDepth(-4.4);
    this.hurtAt = -99;
    this.atkAt = -99;
    this.bob = 0;
    this.holesShown = 0;
    this.gone = false; // crumbled
    // where the pieces go missing: fixed spots on the body, in sprite pixels
    this.holes = [];
    for (let i = 0; i < T.holes; i++) this.holes.push({ x: 7 + Math.floor(rnd(i + 3) * 19), y: 5 + Math.floor(rnd(i + 40) * 44), w: 3 + Math.floor(rnd(i + 80) * 3) });
    this.cubes = [];
    for (let i = 0; i < CUBES; i++) this.cubes.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, size: 0, color: 0, life: 0, wait: 0 });
    this.cubeAt = 0;
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
    const y = px(s.stackBottom + 64);
    t.setText('-' + Math.max(1, Math.round(taken * 1000)))
      .setColor(strong ? '#ffffff' : '#ff7a7a')
      .setPosition(CX + px(Phaser.Math.Between(-78, 78)), y)
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
      this.who = who;
      this.holesShown = 0;
    }
    const kneel = seg.hp === 0 || this.stunned(sb);
    const hurt = Phaser.Math.Clamp(1 - (this.vis - this.hurtAt) / 0.17, 0, 1);
    const atk = Phaser.Math.Clamp(1 - (this.vis - this.atkAt) / 0.34, 0, 1);
    const key = kneel ? who + '-ko' : hurt > 0 ? who + '-hurt' : atk > 0 ? who + '-attack' : seg.hp < seg.cap * 0.5 ? who + '-broken' : IDLE[who];
    const g = this.giant;
    if (key !== this.key) {
      this.key = key;
      g.setTexture(key);
    }
    if (vdt > 0) this.bob = kneel ? 0 : Math.abs(Math.sin(sb * Math.PI)) * px(4); // frozen: the pose holds
    const lunge = Math.sin(atk * Math.PI) * px(18); // it leans down the highway at you
    const shake = this.reduced ? 0 : Math.sin(this.vis * 90) * hurt * px(3);
    g.setPosition(CX + shake, this.topY + (kneel ? px(64) : 0) - this.bob + lunge);
    g.setScale(this.sc * (1 + atk * 0.05));
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
      const band = Math.floor((y / SPRITE_H) * 4);
      const size = Math.min(px(14), Math.max(w, h, 2) * g.scaleX * 0.6);
      this.cube(x0 + (x + w / 2) * g.scaleX, g.y + (y + h / 2) * g.scaleX, px(-200 + Math.random() * 400) * power, px(-260 - Math.random() * 240) * power, size, parseInt(PALETTE[c].slice(1), 16), 1.6, band * gap);
    }
  }

  drawCubes(vdt) {
    const g = this.cubesG.clear();
    const grav = px(1300) * vdt;
    for (const c of this.cubes) {
      if (!c.on) continue;
      if (c.wait > 0) {
        c.wait -= vdt; // still part of the giant
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
    if (s.badge) return; // the badge owns that spot: the word alone is enough
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
    this.updateGiant(sb, vdt);
    this.drawCubes(vdt);
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
    this.holesG.destroy();
    this.cubesG.destroy();
    this.dark.destroy();
  }
}
