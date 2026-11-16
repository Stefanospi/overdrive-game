import Phaser from 'phaser';
import { W, K, LH, px, COLORS, FONT_PS, FONT_VT, PARAMS } from '../config.js';
import { drawBackdrop, drawLabelStrip, button } from '../ui.js';
import { attachFx } from '../fx.js';
import { TEXTS } from '../texts.js';
import { settings, reducedFx } from '../settings.js';
import { registerMars } from '../sprites.js';
import * as A from '../audio.js';

// How to play: cards, each with a small animated drawing. Nobody reads while playing, so
// everything the game needs explained is explained here.
//   set 'basic' (default): tap in time, hold, the goal, the crew's buttons. Shown once before
//     the first level, and again from the title screen.
//   set 'boss': the boss fight: the three phases, the combo as a weapon, the guard, and the
//     bosses' powers with how to answer them (drone, decree, lock). It shows every time you
//     enter the fight; the first time it cannot be skipped.
// `data.next` = { scene, data } to go to afterwards (the title screen if there is none).
const LANE_W = 60; // logical px
const TOP = 96; // where the drawing starts
const HIT = 250; // its hit line
const KINDS = { basic: ['tap', 'hold', 'goal', 'crew'], boss: ['bosshp', 'combo', 'guard', 'drone', 'decree', 'lock'] };
const GOLD = 0xffc83a;

export class HowTo extends Phaser.Scene {
  constructor() {
    super('HowTo');
  }

  init(data) {
    this.next = data && data.next ? data.next : null;
    this.set = (data && data.set) === 'boss' || PARAMS.get('set') === 'boss' ? 'boss' : 'basic'; // ?scene=howto&set=boss to debug
  }

  create() {
    registerMars(this);
    drawBackdrop(this);
    this.fx = attachFx(this);
    drawLabelStrip(this, TEXTS.ui.label);
    this.cameras.main.fadeIn(250);
    this.reduced = reducedFx();
    this.kinds = KINDS[this.set];
    this.cards = this.set === 'boss' ? TEXTS.howto.boss.cards : TEXTS.howto.cards;
    this.card = 0;
    this.t0 = 0;
    this.g = this.add.graphics().setDepth(2);

    this.title = this.add.text(W / 2, px(48), '', { fontFamily: FONT_PS, fontSize: px(14) + 'px', color: '#ffffff' }).setOrigin(0.5).setDepth(3);
    this.body = this.add
      .text(W / 2, px(322), '', { fontFamily: FONT_VT, fontSize: px(24) + 'px', color: '#e9e4dc', align: 'center', wordWrap: { width: px(310) } })
      .setOrigin(0.5, 0)
      .setDepth(3);
    this.say = this.add.text(0, 0, '', { fontFamily: FONT_PS, fontSize: px(9) + 'px', color: '#ffffff' }).setOrigin(0.5).setDepth(3);
    this.lab = [0, 1, 2].map(() => this.add.text(0, 0, '', { fontFamily: FONT_PS, fontSize: px(7) + 'px', color: '#ffffff' }).setOrigin(0.5).setDepth(3));
    // a boss bust for the boss cards
    this.bust = this.add.image(W / 2, px(146), 'quiete-smile').setOrigin(0.5, 0).setScale(K * 2.4).setCrop(0, 0, 36, 40).setDepth(2).setVisible(false);

    // the crew's buttons, as in a level
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
    this.skipBtn = button(this, W / 2 - px(100), px(LH - 76), px(96), px(32), TEXTS.howto.skip, () => this.leave(), { size: 8, depth: 6 });
    this.nextBtn = button(this, W / 2 + px(48), px(LH - 76), px(150), px(32), TEXTS.howto.next, () => this.advance(), { primary: true, size: 10, depth: 6 });
    this.input.on('pointerdown', () => this.advance());
    this.show(0);
  }

  show(i) {
    const n = this.kinds.length;
    this.card = i;
    this.kind = this.kinds[i];
    this.t0 = this.time.now;
    this.title.setText(this.cards[i].title);
    this.body.setText(this.cards[i].body);
    this.say.setText('');
    this.slots[0].setVisible(this.kind === 'crew').setX(px(90));
    this.slots[1].setVisible(this.kind === 'crew' || this.kind === 'lock').setX(this.kind === 'lock' ? W / 2 : W - px(90));
    this.bust.setVisible(this.kind === 'bosshp' || this.kind === 'guard');
    this.lab.forEach((l) => l.setText(''));
    const last = i === n - 1;
    this.nextBtn.label.setText(last ? TEXTS.howto.play : TEXTS.howto.next);
    // the boss tour cannot be skipped the first time: its powers change how you play
    const canSkip = !last && (this.set === 'basic' || settings.get('bossHowto', 0) >= 1);
    this.skipBtn.setVisible(canSkip);
    if (canSkip) this.skipBtn.setInteractive();
    else this.skipBtn.disableInteractive();
    this.dots.clear();
    for (let k = 0; k < n; k++) this.dots.fillStyle(k === i ? COLORS.red : COLORS.grey, 1).fillRect(W / 2 + (k - (n - 1) / 2) * px(16) - px(4), px(LH - 118), px(8), px(8));
  }

  advance() {
    if (this.leaving) return;
    A.getCtx();
    if (this.card < this.kinds.length - 1) this.show(this.card + 1);
    else this.leave();
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    if (this.set === 'boss') settings.set('bossHowto', settings.get('bossHowto', 0) + 1);
    else settings.set('howtoDone', true);
    this.cameras.main.fadeOut(220);
    this.time.delayedCall(230, () => (this.next ? this.scene.start(this.next.scene, this.next.data) : this.scene.start('Boot')));
  }

  // three lanes, the hit line and the lane flash: the stage of most cards
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
    const k = this.kind;
    const pulse = this.reduced ? 1 : 0.5 + 0.5 * Math.sin(time / 110);
    const lit = [0, 0, 0];
    const BT = TEXTS.boss;
    this.say.setText('').setColor('#ffffff');
    if (k === 'tap') {
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
    } else if (k === 'hold') {
      // a long note: the head lands, the finger stays down while the tail runs in
      const p = (t % 3) / 3;
      const len = 90;
      const holding = p > 0.4 && p < 0.85;
      if (holding) lit[1] = 0.8 + 0.2 * pulse;
      const x0 = this.lanes(g, lit);
      const cx = x0 + px(LANE_W * 1.5);
      const head = TOP + Math.min(1, p / 0.4) * (HIT - TOP);
      let tail = head - len;
      if (p >= 0.4) tail = HIT - len * (1 - Math.min(1, (p - 0.4) / 0.45));
      if (p < 0.88 && tail < HIT) {
        const top = Math.max(TOP, tail);
        g.fillStyle(holding ? 0xffffff : COLORS.red, holding ? 0.9 : 0.6).fillRect(cx - px(7), px(top), px(14), px(Math.min(head, HIT) - top));
        g.fillStyle(COLORS.red, 1).fillRect(cx - px(22), px(Math.min(head, HIT) - 7), px(44), px(14));
      }
      this.finger(g, cx, px(HIT + 18), holding);
      if (holding) this.say.setText(TEXTS.ui.hold).setPosition(cx + px(66), px(HIT - 20));
    } else if (k === 'goal') {
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
      g.lineStyle(px(1), COLORS.silver, 0.6).lineBetween(lim, y + h + px(6), lim, y + h + px(22));
      this.lab[0].setText(TEXTS.ui.limit).setPosition(lim, y + h + px(34));
    } else if (k === 'crew') {
      // the crew's buttons: they pulse, a thumb taps one after the other
      const side = Math.floor(t / 1.6) % 2;
      this.slots.forEach((sl, i) => {
        g.lineStyle(px(3), COLORS.red, i === side ? 0.35 + 0.65 * pulse : 0.2).strokeRect(sl.x - px(85), sl.y - px(35), px(170), px(70));
      });
      const target = this.slots[side];
      this.finger(g, target.x + px(30), target.y + px(6), t % 1.6 > 0.9);
    } else if (k === 'bosshp') {
      // three wells, one per phase; the live one drains and the boss changes with it
      const ph = Math.floor(t / 1.6) % 3;
      const who = ['quiete-smile', 'ministro-calm', 'fusion-idle'][ph];
      if (this.bust.texture.key !== who) this.bust.setTexture(who).setCrop(0, 0, 36, 40);
      const x0 = W / 2 - px(130);
      const full = px(260) - px(8);
      let x = x0;
      [0.3, 0.3, 0.4].forEach((q, i) => {
        const w = full * q;
        const hp = i === ph ? 1 - ((t % 1.6) / 1.6) * 0.8 : i < ph ? 0.1 : 1;
        g.fillStyle(COLORS.redDeep, 1).fillRect(x, px(104), w, px(14));
        g.fillStyle(i === ph ? COLORS.red : COLORS.redDark, 1).fillRect(x, px(104), w * hp, px(14));
        g.lineStyle(px(1), COLORS.silver, 0.9).strokeRect(x, px(104), w, px(14));
        this.lab[i].setText(String(i + 1)).setPosition(x + w / 2, px(131));
        x += w + px(4);
      });
      this.say.setText(BT.phases[ph]).setPosition(W / 2, px(300));
    } else if (k === 'combo') {
      // the combo is the weapon: three marks on the way to 40
      const c = Math.min(42, (t % 5) * 9);
      const x = W / 2 - px(120);
      const w = px(240);
      const y = px(160);
      g.fillStyle(0x000000, 1).fillRect(x, y, w, px(18));
      g.fillStyle(COLORS.red, 1).fillRect(x, y, (w * Math.min(c, 40)) / 40, px(18));
      g.lineStyle(px(2), COLORS.silver, 1).strokeRect(x, y, w, px(18));
      [[10, BT.words.riff], [25, BT.words.drop], [40, BT.words.root]].forEach(([at, word], i) => {
        const mx = x + (w * at) / 40;
        const on = c >= at;
        g.fillStyle(on ? 0xffffff : COLORS.silver, 1).fillRect(mx - px(1), y - px(8), px(3), px(34));
        this.lab[i].setText(word).setColor(on ? '#ff2a2a' : '#c0c0c0').setPosition(Math.min(mx, W - px(30)), y + px(36));
      });
      this.say.setText(`${TEXTS.ui.combo} ${Math.floor(c)}`).setPosition(W / 2, y - px(26));
    } else if (k === 'guard') {
      // PERFECTs wear the guard down; at full the boss is broken and the notes turn gold
      const p = Math.min(1, (t % 4) / 2.6);
      const broken = p >= 1;
      const who = broken ? 'quiete-ko' : 'quiete-smile';
      if (this.bust.texture.key !== who) this.bust.setTexture(who).setCrop(0, 0, 36, broken ? 34 : 40);
      const x = W / 2 - px(110);
      const w = px(220);
      g.fillStyle(COLORS.redDeep, 1).fillRect(x, px(104), w, px(8));
      g.fillStyle(broken ? GOLD : COLORS.silver, 1).fillRect(x, px(104), w * p, px(8));
      g.lineStyle(px(1), COLORS.silver, 0.9).strokeRect(x, px(104), w, px(8));
      if (broken) g.fillStyle(GOLD, 1).fillRect(W / 2 - px(22), px(270), px(44), px(14));
      this.say.setText(broken ? BT.words.stun : TEXTS.ui.grades.perfect).setColor(broken ? '#ffc83a' : '#ffffff').setPosition(W / 2, px(124));
    } else if (k === 'drone') {
      // a long combo breaks: a drone drops on a lane and hides its far notes
      const p = (t % 3.4) / 3.4;
      const a = Phaser.Math.Clamp((p - 0.15) / 0.2, 0, 1) * (p < 0.9 ? 1 : 0);
      const x0 = this.lanes(g, lit);
      g.fillStyle(0x000000, 0.97 * a).fillRect(x0, px(TOP), px(LANE_W), px(110));
      g.lineStyle(px(2), COLORS.red, 0.8 * a).lineBetween(x0, px(TOP + 110), x0 + px(LANE_W), px(TOP + 110));
      const ny = TOP + 10 + ((p * 1.3) % 1) * (HIT - TOP - 10);
      if (!(a > 0.5 && ny < TOP + 110)) g.fillStyle(COLORS.red, 1).fillRect(x0 + px(LANE_W / 2 - 22), px(ny - 7), px(44), px(14));
      if (a > 0.3) this.say.setText(BT.words.drone).setPosition(x0 + px(LANE_W / 2), px(TOP + 55));
    } else if (k === 'decree') {
      // a striped note: let it go by
      const p = (t % 2.6) / 2.6;
      const x0 = this.lanes(g, lit);
      const cx = x0 + px(LANE_W * 1.5);
      const y = px(TOP + 10 + Math.min(1, p / 0.75) * (HIT - TOP - 10));
      if (p < 0.82) {
        g.fillStyle(COLORS.paper, 1).fillRect(cx - px(23), y - px(8), px(46), px(16));
        for (let q = 0; q < 5; q++) g.fillStyle(COLORS.red, 1).fillRect(cx - px(23) + (px(46) * (q * 2 + 0.5)) / 10, y - px(8), px(4.6), px(16));
        g.lineStyle(px(2), 0x000000, 1).strokeRect(cx - px(23), y - px(8), px(46), px(16));
      }
      this.finger(g, cx, px(HIT + 18), false);
      g.lineStyle(px(4), COLORS.red, 1).lineBetween(cx - px(12), px(HIT + 6), cx + px(12), px(HIT + 30)).lineBetween(cx + px(12), px(HIT + 6), cx - px(12), px(HIT + 30));
      this.say.setText(p > 0.75 ? '+' : BT.words.decree).setPosition(cx, px(HIT - 44));
    } else if (k === 'lock') {
      // the crew's button comes locked; three PERFECTs open it, then you tap it
      const slot = this.slots[1];
      const n = Math.max(0, 3 - Math.floor(t / 0.9));
      const w = px(164);
      const h = px(64);
      if (n > 0) {
        g.fillStyle(0x000000, 0.55).fillRect(slot.x - w / 2, slot.y - h / 2, w, h - px(8));
        this.say.setText(`${BT.words.lock}  x${n}`).setPosition(W / 2, px(140));
      } else {
        g.lineStyle(px(3), COLORS.red, 0.35 + 0.65 * pulse).strokeRect(slot.x - px(85), slot.y - px(35), px(170), px(70));
        this.finger(g, slot.x + px(30), slot.y + px(6), t % 1.2 > 0.7);
        this.say.setText(BT.words.unlock).setColor('#ff2a2a').setPosition(W / 2, px(140));
      }
      for (let q = 0; q < 3; q++) g.fillStyle(3 - n > q ? 0xffffff : COLORS.grey, 1).fillRect(W / 2 + px((q - 1) * 30 - 10), px(250), px(20), px(10));
    }
    if (this.fx) {
      this.fx.glitch = 0;
      this.fx.ab = 0.3;
      this.fx.pump = 0;
      this.fx.invert = 0;
      this.fx.grain = 0.05;
    }
  }
}
