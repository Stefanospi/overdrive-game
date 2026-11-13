import Phaser from 'phaser';
import { K, W, H, px, COLORS, FONT_PS, FONT_VT } from '../config.js';
import { registerMars } from '../sprites.js';
import { drawBackdrop, drawScanlines, Bubble, blinkText } from '../ui.js';
import { TEXTS, pick } from '../texts.js';
import { getCtx } from '../audio.js';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    registerMars(this);
    drawBackdrop(this);
    drawScanlines(this);

    this.add
      .text(W / 2, px(120), 'OVERDRIVE', { fontFamily: FONT_PS, fontSize: px(30) + 'px', color: '#ff2a2a' })
      .setOrigin(0.5)
      .setShadow(px(4), px(4), '#3a0508', 0, false, true);
    this.add
      .text(W / 2, px(166), '.EXE', { fontFamily: FONT_PS, fontSize: px(16) + 'px', color: '#ffffff' })
      .setOrigin(0.5);
    this.add
      .text(W / 2, px(204), 'STEPHEN MARS / EP', { fontFamily: FONT_VT, fontSize: px(24) + 'px', color: '#e9e4dc' })
      .setOrigin(0.5);

    const bubble = new Bubble(this, px(36), px(372), W - px(72), { tail: false });
    bubble.show(pick(TEXTS.boot), 0);

    this.add
      .image(W / 2, px(690), 'mars-neutral')
      .setOrigin(0.5, 1)
      .setScale(K * 6);

    blinkText(this, W / 2, px(742), 'TOCCA PER AVVIARE', 10);
    this.add
      .text(W / 2, px(790), 'meglio con le cuffie', { fontFamily: FONT_VT, fontSize: px(20) + 'px', color: '#b8bcc6' })
      .setOrigin(0.5)
      .setDepth(30);

    let started = false;
    this.input.on('pointerdown', () => {
      if (started) return;
      started = true;
      getCtx(); // audio can only start after a user gesture
      this.cameras.main.fadeOut(250);
      this.time.delayedCall(260, () => this.scene.start('Dub'));
    });
  }
}
