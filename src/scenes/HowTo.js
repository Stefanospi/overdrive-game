import Phaser from 'phaser';
import { W, K, LH, px, COLORS, FONT_PS, FONT_VT } from '../config.js';
import { drawBackdrop, drawLabelStrip, button } from '../ui.js';
import { attachFx } from '../fx.js';
import { TEXTS } from '../texts.js';
import { settings, reducedFx } from '../settings.js';
import { registerMars } from '../sprites.js';
import * as A from '../audio.js';

// How to play: four cards, each with a small animated drawing, shown once before the first
// level and again from the title screen. Nobody reads while playing, so everything the game
// needs explained is explained here: tap in time, hold, the goal, the crew's buttons.
// `data.next` = { scene, data } to go to afterwards (the title screen if there is none).
const LANE_W = 60; // logical px
const TOP = 96; // where the drawing starts
const HIT = 250; // its hit line
const CARDS = 4;

export class HowTo extends Phaser.Scene {
  constructor() {
    super('HowTo');
  }

  init(data) {
    this.next = data && data.next ? data.next : null;
  }

  create() {
    registerMars(this);
    drawBackdrop(this);
    this.fx = attachFx(this);
    drawLabelStrip(this, TEXTS.ui.label);
    this.cameras.main.fadeIn(250);
    this.reduced = reducedFx();
    const C = TEXTS.howto;
    this.card = 0;
    this.t0 = 0;
    this.g = this.add.graphics().setDepth(2);

    this.title = this.add.text(W / 2, px(48), '', { fontFamily: FONT_PS, fontSize: px(14) + 'px', color: '#ffffff' }).setOrigin(0.5).setDepth(3);
    this.body = this.add
      .text(W / 2, px(322), '', { fontFamily: FONT_VT, fontSize: px(24) + 'px', color: '#e9e4dc', align: 'center', wordWrap: { width: px(310) } })
      .setOrigin(0.5, 0)
      .setDepth(3);
    this.say = this.add.text(0, 0, '', { fontFamily: FONT_PS, fontSize: px(9) + 'px', color: '#ffffff' }).setOrigin(0.5).setDepth(3);

    // the crew's buttons, as in a level (card 4)
    const slot = (x, face, name, act) => {
      const w = px(164);
      const h = px(64);
      const c = this.add.container(x, px(190)).setDepth(3);
      const bg = this.add.graphics();
      bg.fillStyle(0x000000, 0.92).fillRect(-w / 2, -h / 2, w, h);
      bg.lineStyle(px(3), COLORS.silver, 1).strokeRect(-w / 2, -h / 2, w, h);
      const img = this.add.image(-w / 2 + px(8), 0, face).setOrigin(0, 0.5).setScale(K * 1.25).setCrop(0, 0, 36, 26);
      const n = this.add.text(-w / 2 + px(58), -px(10), name, { fontFamily: FONT_PS, fontSize: px(7) + 'px', color: '#ffffff' }).setOrigin(0, 0.5);
      const a = this.add.text(-w / 2 + px(58), px(7), act, { fontFamily: FONT_PS, fontSize: px(8) + 'px', color: '#ff2a2a' }).setOrigin(0, 0.5);
      c.add([bg, img, n, a]);
      return c;
    };
    this.slots = [slot(px(90), 'girl-happy', TEXTS.helper.spawn, TEXTS.helper.rewind), slot(W - px(90), 'grafico-happy', TEXTS.forger.spawn, TEXTS.forger.forge)];

    this.dots = this.add.graphics().setDepth(3);
    this.skipBtn = button(this, W / 2 - px(100), px(LH - 76), px(96), px(32), C.skip, () => this.leave(), { size: 8, depth: 6 });
    this.nextBtn = button(this, W / 2 + px(48), px(LH - 76), px(150), px(32), C.next, () => this.advance(), { primary: true, size: 10, depth: 6 });
    this.input.on('pointerdown', () => this.advance());
    this.show(0);
  }

  show(i) {
    const C = TEXTS.howto;
    this.card = i;
    this.t0 = this.time.now;
    this.title.setText(C.cards[i].title);
    this.body.setText(C.cards[i].body);
    this.say.setText('');
    this.slots.forEach((s) => s.setVisible(i === 3));
    const last = i === CARDS - 1;
    this.nextBtn.label.setText(last ? C.play : C.next);
    this.skipBtn.setVisible(!last);
    if (!last) this.skipBtn.setInteractive();
    else this.skipBtn.disableInteractive();
    this.dots.clear();
    for (let k = 0; k < CARDS; k++) this.dots.fillStyle(k === i ? COLORS.red : COLORS.grey, 1).fillRect(W / 2 + (k - 1.5) * px(16) - px(4), px(LH - 118), px(8), px(8));
  }

  advance() {
    if (this.leaving) return;
    A.getCtx();
    if (this.card < CARDS - 1) this.show(this.card + 1);
    else this.leave();
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    settings.set('howtoDone', true);
    this.cameras.main.fadeOut(220);
    this.time.delayedCall(230, () => (this.next ? this.scene.start(this.next.scene, this.next.data) : this.scene.start('Boot')));
  }

  // three lanes, the hit line and the lane flash: the stage of cards 1 and 2
  lanes(g, lit) {
    const x0 = W / 2 - px(LANE_W * 1.5);
    g.fillStyle(0x0a0305, 0.95).fillRect(x0, px(TOP), px(LANE_W * 3), px(HIT + 30 - TOP));
    for (let l = 0; l < 3; l++) if (lit[l] > 0) g.fillStyle(COLORS.red, 0.3 * lit[l]).fillRect(x0 + l * px(LANE_W), px(TOP), px(LANE_W), px(HIT + 30 - TOP));
    for (let k = 0; k <= 3; k++) g.lineStyle(px(k % 3 ? 1 : 2), COLORS.red, k % 3 ? 0.3 : 0.9).lineBetween(x0 + k * px(LANE_W), px(TOP), x0 + k * px(LANE_W), px(HIT + 30));
    g.fillStyle(0xffffff, 0.9).fillRect(x0, px(HIT - 1), px(LANE_W * 3), px(2));
    return x0;
  }

  finger(g, x, y, press) {
    const r = px(15) * (press ? 0.8 : 1);
    g.fillStyle(0xffffff, press ? 0.55 : 0.25).fillCircle(x, y, r);
    g.lineStyle(px(2), 0xffffff, 0.9).strokeCircle(x, y, r);
  }

  update(time) {
    const g = this.g.clear();
    const t = (time - this.t0) / 1000;
    const c = this.card;
    const pulse = this.reduced ? 1 : 0.5 + 0.5 * Math.sin(time / 110);
    const lit = [0, 0, 0];
    this.say.setText('');
    if (c === 0) {
      // a note falls down the middle lane, lands on the line, PERFETTO
      const p = (t % 1.9) / 1.9;
      const landed = p > 0.72;
      if (landed) lit[1] = 1 - (p - 0.72) / 0.28;
      const x0 = this.lanes(g, lit);
      const cx = x0 + px(LANE_W * 1.5);
      const y = px(TOP + 10 + Math.min(1, p / 0.72) * (HIT - TOP - 10));
      if (!landed || p < 0.78) g.fillStyle(COLORS.red, 1).fillRect(cx - px(22), y - px(7), px(44), px(14)).fillStyle(0xffffff, 1).fillRect(cx - px(22), y - px(7), px(44), px(3));
      this.finger(g, cx, px(HIT + 18), p > 0.66 && p < 0.84);
      if (landed) this.say.setText(TEXTS.ui.grades.perfect).setPosition(cx, px(HIT - 40));
    } else if (c === 1) {
      // a long note: the head lands, the finger stays down while the tail runs in
      const p = (t % 3) / 3;
      const len = 90;
      const holding = p > 0.4 && p < 0.85;
      if (holding) lit[1] = 0.8 + 0.2 * pulse;
      const x0 = this.lanes(g, lit);
      const cx = x0 + px(LANE_W * 1.5);
      let head = TOP + Math.min(1, p / 0.4) * (HIT - TOP);
      let tail = head - len;
      if (p >= 0.4) tail = HIT - len * (1 - Math.min(1, (p - 0.4) / 0.45));
      if (p < 0.88 && tail < HIT) {
        const top = Math.max(TOP, tail);
        g.fillStyle(holding ? 0xffffff : COLORS.red, holding ? 0.9 : 0.6).fillRect(cx - px(7), px(top), px(14), px(Math.min(head, HIT) - top));
        g.fillStyle(COLORS.red, 1).fillRect(cx - px(22), px(Math.min(head, HIT) - 7), px(44), px(14));
      }
      this.finger(g, cx, px(HIT + 18), holding);
      if (holding) this.say.setText(TEXTS.ui.hold).setPosition(cx + px(66), px(HIT - 20));
    } else if (c === 2) {
      // the infection bar fills up and opens root access
      const p = Math.min(1, (t % 4.5) / 3.6);
      const x = W / 2 - px(105);
      const w = px(210);
      const y = px(150);
      const h = px(26);
      g.fillStyle(0x000000, 1).fillRect(x, y, w, h);
      g.lineStyle(px(2), COLORS.silver, 1).strokeRect(x, y, w, h);
      const segs = 18;
      const lit2 = Math.round(p * segs);
      for (let i = 0; i < segs; i++) g.fillStyle(i < lit2 ? (i >= 11 ? (pulse > 0.5 ? 0xffffff : COLORS.redSoft) : COLORS.red) : COLORS.redDeep, 1).fillRect(x + px(4) + (i * (w - px(8))) / segs, y + px(5), (w - px(8)) / segs - px(2), h - px(10));
      const lim = x + w * 0.6;
      g.fillStyle(COLORS.silver, 1).fillRect(lim - px(1), y - px(6), px(2), h + px(12));
      const full = p >= 1;
      this.say
        .setText(full ? TEXTS.ui.root : `${TEXTS.ui.overdrive} ${String(Math.round(p * 100)).padStart(3, '0')}%`)
        .setColor(full ? '#ff2a2a' : '#ffffff')
        .setPosition(W / 2, y - px(26));
      // the legal limit: the Ministry sees you from here
      g.lineStyle(px(1), COLORS.silver, 0.6).lineBetween(lim, y + h + px(6), lim, y + h + px(22));
      this.limitLabel = this.limitLabel || this.add.text(lim, y + h + px(34), TEXTS.ui.limit, { fontFamily: FONT_VT, fontSize: px(17) + 'px', color: '#b8bcc6' }).setOrigin(0.5).setDepth(3);
      this.limitLabel.setPosition(lim, y + h + px(34));
    } else {
      // the crew's buttons: they pulse, a thumb taps one after the other
      const side = Math.floor(t / 1.6) % 2;
      this.slots.forEach((s, i) => {
        g.lineStyle(px(3), COLORS.red, i === side ? 0.35 + 0.65 * pulse : 0.2).strokeRect(s.x - px(85), s.y - px(35), px(170), px(70));
      });
      const target = this.slots[side];
      this.finger(g, target.x + px(30), target.y + px(6), (t % 1.6) > 0.9);
    }
    if (this.limitLabel) this.limitLabel.setVisible(c === 2);
    if (this.fx) {
      this.fx.glitch = 0;
      this.fx.ab = 0.3;
      this.fx.pump = 0;
      this.fx.invert = 0;
      this.fx.grain = 0.05;
    }
  }
}
