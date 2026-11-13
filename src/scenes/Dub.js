import Phaser from 'phaser';
import { K, W, H, px, COLORS, FONT_PS, FONT_VT } from '../config.js';
import { registerMars } from '../sprites.js';
import { drawBackdrop, drawScanlines, Bubble, buildWindow } from '../ui.js';
import { TEXTS, pick } from '../texts.js';
import * as A from '../audio.js';

// Microgame 1 (DUB): hold the screen while the ring closes, release exactly on the drop.
const BPM = 140;
const BEAT = 60 / BPM; // seconds
const CYCLE = 8; // beats of build-up, drop at the end
const SPAN = 10; // beats per round (8 + 2 of rest)
const ROUNDS = 5;
const LEAD_IN = 1.6; // seconds before the first round

const CX = W / 2;
const CY = px(400);
const R_TARGET = px(65);
const R_START = px(135);

const GRADES = {
  perfect: { win: 0.07, points: 300, od: 22, label: 'PERFETTO', mars: 'win' },
  good: { win: 0.14, points: 200, od: 14, label: 'BUONO', mars: 'neutral' },
  ok: { win: 0.25, points: 100, od: 7, label: 'OK', mars: 'neutral' },
  miss: { win: Infinity, points: 0, od: -12, label: 'MANCATO', mars: 'surprised' },
};

export class Dub extends Phaser.Scene {
  constructor() {
    super('Dub');
  }

  create() {
    registerMars(this);
    drawBackdrop(this);
    drawScanlines(this);
    this.cameras.main.fadeIn(250);

    this.gfx = this.add.graphics().setDepth(2);
    this.hud = this.add.graphics().setDepth(3);

    const ps = (size, color) => ({ fontFamily: FONT_PS, fontSize: px(size) + 'px', color });
    const vt = (size, color, extra = {}) => ({ fontFamily: FONT_VT, fontSize: px(size) + 'px', color, ...extra });

    this.add.text(px(20), px(22), 'LIV.1 / DUB', ps(10, '#c0c0c0')).setDepth(4);
    this.scoreText = this.add.text(W - px(20), px(22), '000000', ps(10, '#ffffff')).setOrigin(1, 0).setDepth(4);
    this.add.text(px(20), px(50), 'OVERDRIVE', ps(8, '#ff7a7a')).setDepth(4);
    this.comboText = this.add.text(px(20), px(98), 'combo x0', vt(20, '#e9e4dc')).setDepth(4);
    this.roundText = this.add.text(W - px(20), px(98), `ROUND 0/${ROUNDS}`, vt(20, '#e9e4dc')).setOrigin(1, 0).setDepth(4);

    this.centerText = this.add
      .text(CX, CY, 'PRONTO', vt(34, '#ffffff', { align: 'center', lineSpacing: -px(6) }))
      .setOrigin(0.5)
      .setDepth(4);
    this.subText = this.add.text(CX, CY + px(168), '', vt(24, '#ff7a7a')).setOrigin(0.5).setDepth(4);

    this.mars = this.add
      .image(px(14), H - px(16), 'mars-neutral')
      .setOrigin(0, 1)
      .setScale(K * 4)
      .setDepth(10);
    const bx = px(14) + 36 * K * 4 + px(22);
    this.bubble = new Bubble(this, bx, H - px(50), W - bx - px(14));

    // game state
    this.score = 0;
    this.combo = 0;
    this.overdrive = 0;
    this.perfects = 0;
    this.round = -1;
    this.resolved = true;
    this.holding = false;
    this.sub = null;
    this.pulse = null;
    this.glitched = false;
    this.ending = false;
    this.dropDone = true;
    this.cycleStart = 0;
    this.dropTime = 0;

    // audio is the master clock: schedule every round up front
    const c = A.getCtx();
    this.t0 = c.currentTime + LEAD_IN;
    for (let i = 0; i < ROUNDS; i++) A.scheduleCycle(this.t0 + i * SPAN * BEAT, BEAT);

    // input: touch/mouse + space bar on desktop
    this.input.on('pointerdown', () => this.down());
    this.input.on('pointerup', () => this.up());
    this.input.on('gameout', () => this.up());
    this.input.keyboard.on('keydown-SPACE', (e) => {
      if (!e.repeat) this.down();
    });
    this.input.keyboard.on('keyup-SPACE', () => this.up());
    this.events.once('shutdown', () => {
      if (this.sub) this.sub.stop();
    });
  }

  // ---- input -------------------------------------------------------------
  down() {
    const t = A.getCtx().currentTime;
    if (this.resolved || this.holding) return;
    if (t < this.cycleStart || t > this.dropTime + 0.2) return;
    this.holding = true;
    this.sub = A.startSub();
    this.centerText.setText('RILASCIA\nSUL DROP');
  }

  up() {
    if (!this.holding || this.resolved) return;
    this.resolve(A.getCtx().currentTime);
  }

  // ---- scoring -----------------------------------------------------------
  resolve(releaseT) {
    this.resolved = true;
    this.holding = false;
    if (this.sub) {
      this.sub.stop();
      this.sub = null;
    }

    let grade = 'miss';
    let label = GRADES.miss.label;
    let line = 'miss';
    let delta = null;
    if (releaseT !== null) {
      delta = releaseT - this.dropTime;
      const a = Math.abs(delta);
      if (a < GRADES.perfect.win) grade = 'perfect';
      else if (a < GRADES.good.win) grade = 'good';
      else if (a < GRADES.ok.win) grade = 'ok';
      if (grade === 'miss') {
        label = delta < 0 ? 'TROPPO PRESTO' : 'TROPPO TARDI';
        line = delta < 0 ? 'early' : 'late';
      } else {
        label = GRADES[grade].label;
        line = grade;
      }
    }

    const g = GRADES[grade];
    this.combo = grade === 'miss' ? 0 : this.combo + 1;
    this.score += Math.round(g.points * (1 + Math.max(0, this.combo - 1) * 0.2));
    if (grade === 'perfect') this.perfects++;
    const before = this.overdrive;
    this.overdrive = Phaser.Math.Clamp(this.overdrive + g.od, 0, 100);

    this.centerText.setText(label);
    this.subText.setText(delta === null ? '' : `${delta >= 0 ? '+' : ''}${Math.round(delta * 1000)}ms`);
    this.time.delayedCall(800, () => {
      if (this.resolved) {
        this.centerText.setText(this.round < ROUNDS - 1 ? 'PRONTO' : 'FINE');
        this.subText.setText('');
      }
    });

    if (grade !== 'miss') {
      this.pulse = { at: A.getCtx().currentTime, color: grade === 'perfect' ? 0xffffff : COLORS.red };
      if (navigator.vibrate) navigator.vibrate(grade === 'perfect' ? 25 : 12);
    }

    // MARS reacts; crossing 60% overdrive triggers the glitch line once
    if (!this.glitched && before < 60 && this.overdrive >= 60) {
      this.glitched = true;
      this.say('overdrive', 'glitch', 3200);
    } else {
      this.say(line, g.mars, 2600);
    }
    if (this.overdrive >= 30 && Math.random() < 0.55) this.spawnPopup();
  }

  say(key, expr, ms) {
    this.mars.setTexture('mars-' + expr);
    this.bubble.show(pick(TEXTS[key]), ms);
    if (this.marsTimer) this.marsTimer.remove(false);
    this.marsTimer = this.time.delayedCall(ms, () => this.mars.setTexture('mars-neutral'));
  }

  spawnPopup() {
    const w = px(176);
    const h = px(104);
    const win = buildWindow(this, w, h, 'AVVISO.exe');
    const body = this.add.text(px(8), px(34), pick(TEXTS.popups), {
      fontFamily: FONT_VT,
      fontSize: px(19) + 'px',
      color: '#000000',
      wordWrap: { width: w - px(16) },
      lineSpacing: -px(3),
    });
    win.add(body);
    win.setPosition(Phaser.Math.Between(px(14), W - w - px(24)), Phaser.Math.Between(px(150), px(250)));
    win.setRotation(Phaser.Math.FloatBetween(-0.06, 0.06)).setDepth(8);
    this.tweens.add({
      targets: win,
      alpha: 0,
      delay: 2200,
      duration: 400,
      onComplete: () => win.destroy(),
    });
  }

  // ---- frame loop --------------------------------------------------------
  update() {
    const t = A.getCtx().currentTime;

    // start the next round when its time comes
    const next = this.round + 1;
    if (next < ROUNDS && t >= this.t0 + next * SPAN * BEAT) {
      this.round = next;
      this.cycleStart = this.t0 + next * SPAN * BEAT;
      this.dropTime = this.cycleStart + CYCLE * BEAT;
      this.resolved = false;
      this.holding = false;
      this.dropDone = false;
      this.roundText.setText(`ROUND ${this.round + 1}/${ROUNDS}`);
      this.centerText.setText('TIENI\nPREMUTO');
      this.subText.setText('');
      if (this.round === 0) this.say('tutorial', 'neutral', 3600);
    }

    // screen shake exactly on the drop
    if (!this.dropDone && t >= this.dropTime) {
      this.dropDone = true;
      this.cameras.main.shake(170, 0.004 + this.overdrive * 0.00012);
    }

    // never released (or never pressed): it's a miss
    if (!this.resolved && t > this.dropTime + 0.28) this.resolve(this.holding ? t : null);

    // after the last round + rest, go to the result screen
    if (!this.ending && this.round === ROUNDS - 1 && this.resolved && t > this.cycleStart + SPAN * BEAT) {
      this.ending = true;
      this.cameras.main.fadeOut(500);
      this.time.delayedCall(520, () =>
        this.scene.start('End', { score: this.score, overdrive: this.overdrive, perfects: this.perfects, rounds: ROUNDS }),
      );
    }

    this.drawField(t);
    this.drawHud(t);
  }

  drawField(t) {
    const g = this.gfx;
    g.clear();
    g.lineStyle(px(2), 0xffffff, 0.25).strokeCircle(CX, CY, R_START);
    g.fillStyle(COLORS.red, this.holding ? 0.45 : 0.22).fillCircle(CX, CY, R_TARGET);
    g.lineStyle(px(4), COLORS.red, 1).strokeCircle(CX, CY, R_TARGET);

    if (!this.resolved && t >= this.cycleStart) {
      const p = Phaser.Math.Clamp((t - this.cycleStart) / (CYCLE * BEAT), 0, 1);
      const r = R_START + (R_TARGET - R_START) * p;
      g.lineStyle(px(4), this.holding ? COLORS.redSoft : 0xffffff, 1).strokeCircle(CX, CY, r);
      if (this.holding && this.sub) this.sub.setPitch(p);
    }

    if (this.pulse) {
      const age = t - this.pulse.at;
      if (age > 0.5) this.pulse = null;
      else g.lineStyle(px(6), this.pulse.color, 1 - age / 0.5).strokeCircle(CX, CY, R_TARGET + age * px(220));
    }
  }

  drawHud(t) {
    const g = this.hud;
    g.clear();
    const x = px(20);
    const y = px(66);
    const w = W - px(40);
    const h = px(24);
    g.fillStyle(0x000000, 1).fillRect(x, y, w, h);
    g.lineStyle(px(2), COLORS.silver, 1).strokeRect(x, y, w, h);
    const inner = w - px(8);
    const fill = (this.overdrive / 100) * inner;
    const hot = this.overdrive >= 60 && Math.floor(t * 8) % 2 === 0;
    g.fillStyle(hot ? COLORS.redSoft : COLORS.red, 1);
    for (let sx = 0; sx + px(10) <= fill; sx += px(12)) g.fillRect(x + px(4) + sx, y + px(4), px(10), h - px(8));

    this.scoreText.setText(String(this.score).padStart(6, '0'));
    this.comboText.setText(`combo x${this.combo}`);
  }
}
