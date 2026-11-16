import Phaser from 'phaser';
import { K, W, LH, px, COLORS, FONT_PS, FONT_VT } from '../config.js';
import { LEVELS, FIRST_LEVEL, ROADMAP } from '../levels.js';
import { accuracy, rank } from '../rank.js';
import { registerMars } from '../sprites.js';
import { drawBackdrop, drawLabelStrip, button } from '../ui.js';
import { EP, openLink } from '../campaign.js';
import { recordResult, fragments, TOTAL_FRAGMENTS } from '../progress.js';
import { shareResult } from '../share.js';
import { attachFx } from '../fx.js';
import { TEXTS } from '../texts.js';

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
    const fit = Math.min(1, (LH - 310) / 440);
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
      .image(px(10), px(LH - 26), 'mars-' + expr)
      .setOrigin(0, 1)
      .setScale(K * 2)
      .setDepth(6);
    const x0 = px(98);
    const cw2 = W - x0 - px(12);
    const cx = x0 + cw2 / 2;

    // the EP packets: one per finished track
    const prog = this.result.auto ? { tier, gotFragment: false, count: fragments().length, isBest: false } : recordResult(this.result);
    const fy = px(LH - 238);
    this.add
      .text(x0, fy, tier === 'low' ? TEXTS.campaign.fragmentBad : TEXTS.campaign.fragmentOk, ps(7, tier === 'low' ? '#b8121a' : '#ff2a2a'))
      .setDepth(6);
    const fg = this.add.graphics().setDepth(6);
    for (let i = 0; i < TOTAL_FRAGMENTS; i++) {
      const bx = x0 + i * px(22);
      fg.lineStyle(px(2), COLORS.silver, 1).strokeRect(bx, fy + px(14), px(18), px(14));
      if (i < prog.count) fg.fillStyle(COLORS.red, 1).fillRect(bx + px(2), fy + px(16), px(14), px(10));
    }
    this.add
      .text(x0 + TOTAL_FRAGMENTS * px(22) + px(6), fy + px(13), `${prog.count}/${TOTAL_FRAGMENTS}`, vt(18, '#c0c0c0'))
      .setDepth(6);
    this.add
      .text(x0, fy + px(36), `${TEXTS.campaign.release} ${EP.dateLabel}${EP.indicative ? ' (' + TEXTS.campaign.indicative + ')' : ''}`, vt(16, '#e9e4dc'))
      .setDepth(6);
    this.add
      .text(x0, fy + px(52), `${TEXTS.campaign.prize} ${EP.prize.top}: ${TEXTS.campaign.prizeText}`, vt(17, '#ff7a7a'))
      .setDepth(6);

    const bw = (cw2 - px(10)) / 2;
    const bh = px(30);
    const hasLink = !!(EP.links.listen || EP.links.presave);
    button(
      this,
      cx,
      px(LH - 150),
      cw2,
      bh,
      EP.links.listen ? TEXTS.ui.listen : EP.links.presave ? TEXTS.ui.presave : TEXTS.ui.linkSoon,
      () => openLink(EP.links.listen || EP.links.presave, EP.links.listen ? 'listen' : 'presave'),
      { primary: true, size: 8, depth: 6, disabled: !hasLink },
    );
    const go = (scene, data) => {
      this.cameras.main.fadeOut(250);
      this.time.delayedCall(260, () => this.scene.start(scene, data));
    };
    const shareBtn = button(this, x0 + bw / 2, px(LH - 112), bw, bh, TEXTS.ui.share, async () => {
      shareBtn.label.setText('...');
      await shareResult(this.result);
      shareBtn.label.setText(TEXTS.ui.share);
    }, { size: 8, depth: 6 });
    button(this, x0 + bw * 1.5 + px(10), px(LH - 112), bw, bh, TEXTS.ui.board, () => go('Board', { from: 'End', result: this.result }), { size: 8, depth: 6 });
    // the next layer of the map, if there is one: its intro chapter plays first
    const at = ROADMAP.findIndex((n) => n.id === level);
    const nextId = at >= 0 && ROADMAP[at + 1] ? ROADMAP[at + 1].id : null;
    const goNext = () => {
      const intro = nextId + '_intro';
      let play = { scene: 'Play', data: { level: nextId } };
      if (LEVELS[nextId].boss) play = { scene: 'HowTo', data: { set: 'boss', next: play } }; // the boss explains its powers first
      if (TEXTS.story[intro]) go('Story', { id: intro, next: play });
      else go(play.scene, play.data);
    };
    const rowY = px(LH - 74);
    if (nextId) {
      const tw = (cw2 - px(12)) / 3;
      const tx = (i) => x0 + tw / 2 + i * (tw + px(6));
      button(this, tx(0), rowY, tw, bh, TEXTS.ui.map, () => go('Hub'), { size: 8, depth: 6 });
      button(this, tx(1), rowY, tw, bh, TEXTS.ui.again, () => go('Play', { level }), { size: 8, depth: 6 });
      button(this, tx(2), rowY, tw, bh, TEXTS.ui.next, goNext, { primary: true, size: 8, depth: 6 });
    } else {
      button(this, x0 + bw / 2, rowY, bw, bh, TEXTS.ui.map, () => go('Hub'), { size: 8, depth: 6 });
      button(this, x0 + bw * 1.5 + px(10), rowY, bw, bh, TEXTS.ui.again, () => go('Play', { level }), { primary: true, size: 8, depth: 6 });
    }
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
