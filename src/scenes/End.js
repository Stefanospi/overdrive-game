import Phaser from 'phaser';
import { K, W, H, LH, px, COLORS, FONT_PS, FONT_VT } from '../config.js';
import { LEVELS, FIRST_LEVEL } from '../levels.js';
import { accuracy, rank } from '../rank.js';
import { registerMars } from '../sprites.js';
import { drawBackdrop, drawLabelStrip, Bubble, blinkText } from '../ui.js';
import { attachFx } from '../fx.js';
import { TEXTS, pick } from '../texts.js';

// Result screen: an official report from the Ministero del Basso, stamped.
export class End extends Phaser.Scene {
  constructor() {
    super('End');
  }

  init(data) {
    this.result = {
      level: FIRST_LEVEL,
      score: 0,
      maxCombo: 0,
      counts: { perfect: 0, good: 0, ok: 0, miss: 0 },
      total: 1,
      odPeak: 0,
      ...data,
    };
  }

  create() {
    registerMars(this);
    drawBackdrop(this);
    this.fx = attachFx(this);
    drawLabelStrip(this, TEXTS.ui.label);
    this.cameras.main.fadeIn(300);
    this.glitch = 0;

    const { score, maxCombo, counts, total, odPeak, level } = this.result;
    const acc = accuracy(this.result);
    const tier = rank(this.result);
    const expr = tier === 'high' ? 'win' : tier === 'mid' ? 'neutral' : 'sad';
    const R = TEXTS.report;
    const L = LEVELS[level] || LEVELS[FIRST_LEVEL];

    // ---- the report: a paper slip with a torn bottom edge ----
    // On short screens the whole slip shrinks to leave room for MARS below it.
    const cw = px(318);
    const ch = px(418);
    const fit = Math.min(1, (LH - 250) / 440);
    const cardY = px(44 + 209 * fit);
    const card = this.add.container(W / 2, cardY).setDepth(5).setScale(fit);
    const g = this.add.graphics();
    g.fillStyle(COLORS.red, 1).fillRect(-cw / 2 + px(7), -ch / 2 + px(7), cw, ch);
    g.fillStyle(COLORS.paper, 1).fillRect(-cw / 2, -ch / 2, cw, ch);
    g.fillStyle(COLORS.bg, 1);
    const teeth = 26;
    const tw = cw / teeth;
    for (let i = 0; i < teeth; i++) {
      const x = -cw / 2 + i * tw;
      g.fillTriangle(x, ch / 2 + px(8), x + tw / 2, ch / 2 - px(5), x + tw, ch / 2 + px(8));
    }
    card.add(g);

    const ps = (size, color = '#15121a') => ({ fontFamily: FONT_PS, fontSize: px(size) + 'px', color });
    const vt = (size, color = '#15121a') => ({ fontFamily: FONT_VT, fontSize: px(size) + 'px', color });
    const left = -cw / 2 + px(18);
    const right = cw / 2 - px(18);
    const put = (x, y, str, style, ox = 0) => {
      const t = this.add.text(x, -ch / 2 + px(y), str, style).setOrigin(ox, 0);
      card.add(t);
      return t;
    };
    const rule = (y) => {
      g.fillStyle(COLORS.ink, 1);
      for (let x = left; x < right; x += px(8)) g.fillRect(x, -ch / 2 + px(y), px(4), px(1));
    };
    const row = (y, label, value) => {
      put(left, y, label, vt(22));
      put(right, y, value, vt(22), 1);
    };

    put(0, 18, R.ministry, ps(9), 0.5);
    put(0, 36, `${R.title}  ${R.number}`, vt(18, '#5a5560'), 0.5);
    put(0, 54, `${TEXTS.ui.level}${L.n} // ${L.title}`, vt(18, '#5a5560'), 0.5);
    rule(80);
    put(0, 92, R.score, ps(7, '#5a5560'), 0.5);
    put(0, 108, String(score).padStart(7, '0'), ps(24, '#b8121a'), 0.5);
    rule(146);
    row(156, R.accuracy, `${Math.round(acc * 100)}%`);
    row(180, R.combo, String(maxCombo));
    row(204, R.peak, `${Math.round(odPeak)}%`);
    rule(236);
    row(246, R.grades.perfect, String(counts.perfect));
    row(270, R.grades.good, String(counts.good));
    row(294, R.grades.ok, String(counts.ok));
    row(318, R.grades.miss, String(counts.miss));
    rule(350);
    put(0, 362, R.footer, { ...vt(15, '#5a5560'), align: 'center', wordWrap: { width: cw - px(40) } }, 0.5);

    card.setAngle(-2).setY(-ch);
    this.tweens.add({ targets: card, y: cardY, duration: 420, ease: 'Back.Out' });

    // ---- the stamp, pressed onto the slip ----
    const stamp = this.add.container(px(20), px(76)).setAngle(-12).setVisible(false);
    card.add(stamp);
    const label = this.add.text(0, px(1), R.stamps[tier], ps(15, '#ff2a2a')).setOrigin(0.5);
    const sg = this.add.graphics();
    const sw = label.width + px(26);
    const sh = px(40);
    sg.lineStyle(px(4), COLORS.red, 1).strokeRect(-sw / 2, -sh / 2, sw, sh);
    sg.lineStyle(px(1), COLORS.red, 1).strokeRect(-sw / 2 + px(5), -sh / 2 + px(5), sw - px(10), sh - px(10));
    stamp.add([sg, label]).setAlpha(0.9);
    this.time.delayedCall(700, () => {
      stamp.setVisible(true).setScale(3);
      this.tweens.add({ targets: stamp, scale: 1, duration: 120, ease: 'Quad.In' });
      this.time.delayedCall(120, () => {
        this.cameras.main.shake(160, 0.012);
        this.glitch = 0.8;
        if (navigator.vibrate) navigator.vibrate(30);
      });
    });

    // ---- MARS.EXE and what comes next ----
    this.add
      .image(px(12), H - px(28), 'mars-' + expr)
      .setOrigin(0, 1)
      .setScale(K * 3)
      .setDepth(6);
    const bx = px(12) + 36 * K * 3 + px(20);
    const bubble = new Bubble(this, bx, H - px(116), W - bx - px(14));
    this.time.delayedCall(1000, () => bubble.show(pick(TEXTS.ranks[tier]), 0));

    this.add.text(bx, H - px(98), TEXTS.ui.soon, ps(10, '#ff2a2a')).setDepth(6);
    this.add.text(bx, H - px(80), TEXTS.ui.soonSub, vt(20, '#e9e4dc')).setDepth(6);

    const again = blinkText(this, bx + (W - bx - px(14)) / 2, H - px(42), TEXTS.ui.again, 7).setVisible(false);
    this.time.delayedCall(1200, () => {
      again.setVisible(true);
      this.input.once('pointerdown', () => {
        this.cameras.main.fadeOut(250);
        this.time.delayedCall(260, () => this.scene.start('Play', { level }));
      });
    });
  }

  update(time, delta) {
    this.glitch = Math.max(0, this.glitch - delta / 400);
    if (this.fx) {
      this.fx.glitch = this.glitch;
      this.fx.ab = 0.3 + this.glitch * 1.5;
      this.fx.pump = 0;
      this.fx.invert = 0;
      this.fx.grain = 0.06;
    }
  }
}
