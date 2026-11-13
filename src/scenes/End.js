import Phaser from 'phaser';
import { K, W, H, px, FONT_PS, FONT_VT } from '../config.js';
import { registerMars } from '../sprites.js';
import { drawBackdrop, drawScanlines, Bubble, buildWindow, blinkText } from '../ui.js';
import { TEXTS, pick } from '../texts.js';

export class End extends Phaser.Scene {
  constructor() {
    super('End');
  }

  init(data) {
    this.result = { score: 0, overdrive: 0, perfects: 0, rounds: 5, ...data };
  }

  create() {
    registerMars(this);
    drawBackdrop(this);
    drawScanlines(this);
    this.cameras.main.fadeIn(300);

    const { score, overdrive, perfects, rounds } = this.result;
    const tier = overdrive >= 60 ? 'high' : overdrive >= 25 ? 'mid' : 'low';
    const expr = tier === 'high' ? 'win' : tier === 'mid' ? 'neutral' : 'surprised';

    const ww = W - px(60);
    const win = buildWindow(this, ww, px(210), 'RISULTATO.exe');
    win.setPosition(px(30), px(60)).setDepth(5);
    const ps = (size, color) => ({ fontFamily: FONT_PS, fontSize: px(size) + 'px', color });
    const vt = (size, color) => ({ fontFamily: FONT_VT, fontSize: px(size) + 'px', color });
    win.add([
      this.add.text(ww / 2, px(62), 'PUNTEGGIO', ps(8, '#404040')).setOrigin(0.5),
      this.add.text(ww / 2, px(96), String(score).padStart(6, '0'), ps(26, '#b8121a')).setOrigin(0.5),
      this.add.text(ww / 2, px(146), `OVERDRIVE ${Math.round(overdrive)}%`, vt(28, '#000000')).setOrigin(0.5),
      this.add.text(ww / 2, px(176), `perfetti ${perfects}/${rounds}`, vt(24, '#000000')).setOrigin(0.5),
    ]);

    this.add
      .image(px(14), H - px(16), 'mars-' + expr)
      .setOrigin(0, 1)
      .setScale(K * 4);
    const bx = px(14) + 36 * K * 4 + px(22);
    new Bubble(this, bx, H - px(150), W - bx - px(14)).show(pick(TEXTS.ranks[tier]), 0);

    this.add
      .text(W / 2, px(330), 'EP IN ARRIVO', ps(12, '#ff2a2a'))
      .setOrigin(0.5)
      .setDepth(5);
    this.add
      .text(W / 2, px(366), 'link e ascolto: presto qui', vt(24, '#e9e4dc'))
      .setOrigin(0.5)
      .setDepth(5);

    const again = blinkText(this, W / 2, px(470), 'TOCCA PER RIGIOCARE', 10);
    again.setVisible(false);
    this.time.delayedCall(700, () => {
      again.setVisible(true);
      this.input.once('pointerdown', () => {
        this.cameras.main.fadeOut(250);
        this.time.delayedCall(260, () => this.scene.start('Dub'));
      });
    });
  }
}
