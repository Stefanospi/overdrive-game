import Phaser from 'phaser';
import { W, LH, px, FONT_PS, FONT_VT } from '../config.js';
import { LEVELS, FIRST_LEVEL } from '../levels.js';
import { drawBackdrop, button } from '../ui.js';
import { attachFx } from '../fx.js';
import { setLang } from '../texts.js';
import { getCtx, preload } from '../audio.js';

// First screen, before anything loads: the player picks a language. The choice is kept
// on the device; the title screen has a small link to change it later.
export class Lang extends Phaser.Scene {
  constructor() {
    super('Lang');
  }

  create(data) {
    drawBackdrop(this);
    this.fx = attachFx(this);
    this.cameras.main.fadeIn(250);
    this.next = (data && data.next) || 'Boot';

    // the clip starts downloading while the player chooses
    const first = LEVELS[FIRST_LEVEL];
    if (first.track) preload(first.track.url);

    const cy = px(LH * 0.36);
    this.add
      .text(W / 2, cy - px(52), 'OVERDRIVE', { fontFamily: FONT_PS, fontSize: px(30) + 'px', color: '#ff2a2a' })
      .setOrigin(0.5);
    this.add
      .text(W / 2, cy, 'LINGUA // LANGUAGE', { fontFamily: FONT_VT, fontSize: px(26) + 'px', color: '#e9e4dc' })
      .setOrigin(0.5);

    const pick = (code) => {
      getCtx(); // audio can only start after a user gesture
      setLang(code);
      this.cameras.main.fadeOut(200);
      this.time.delayedCall(210, () => this.scene.start(this.next));
    };
    button(this, W / 2, cy + px(70), px(230), px(46), 'ITALIANO', () => pick('it'), { primary: true, size: 13, depth: 6 });
    button(this, W / 2, cy + px(134), px(230), px(46), 'ENGLISH', () => pick('en'), { size: 13, depth: 6 });
    this.glitch = 0.6;
  }

  update(time, delta) {
    this.glitch = Math.max(0, this.glitch - delta / 400);
    if (this.fx) {
      this.fx.glitch = this.glitch;
      this.fx.ab = 0.3 + this.glitch;
      this.fx.pump = 0;
      this.fx.invert = 0;
      this.fx.grain = 0.06;
    }
  }
}
