import Phaser from 'phaser';
import { K, W, LH, px, COLORS, FONT_PS, FONT_VT } from '../config.js';
import { LEVELS, FIRST_LEVEL } from '../levels.js';
import { registerMars } from '../sprites.js';
import { drawBackdrop, drawLabelStrip, textTexture, Bubble, blinkText } from '../ui.js';
import { attachFx } from '../fx.js';
import { TEXTS, pick } from '../texts.js';
import { getCtx, preload } from '../audio.js';

// Title screen: a BIOS boot log, then the title slams in and MARS.EXE shows up.
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    registerMars(this);
    drawBackdrop(this);
    this.fx = attachFx(this);
    drawLabelStrip(this, TEXTS.ui.label);
    this.glitch = 0;
    const first = LEVELS[FIRST_LEVEL];
    if (first.track) preload(first.track.url); // download the clip while the title is up

    // giant outlined type drifting behind everything
    const key = textTexture(this, 'type-overdrive', 'OVERDRIVE ', { size: 46, stroke: '#ff2a2a', strokeW: 1.5 });
    const th = this.textures.get(key).getSourceImage().height;
    this.rows = [LH - 414, LH - 344, LH - 274, LH - 204].map((y, i) =>
      this.add.tileSprite(0, px(y), W, th, key).setOrigin(0, 0.5).setAlpha(0.13).setDepth(-8).setData('dir', i % 2 ? -1 : 1),
    );

    // boot log, one line at a time
    const log = TEXTS.bootLog;
    log.forEach((line, i) => {
      const t = this.add
        .text(px(16), px(18 + i * 17), line, {
          fontFamily: FONT_VT,
          fontSize: px(17) + 'px',
          color: line.endsWith('NEGATO') ? '#ff2a2a' : '#c0c0c0',
        })
        .setVisible(false);
      this.time.delayedCall(140 + i * 170, () => t.setVisible(true));
    });

    // title, printed slightly off-register like a cheap flyer
    const title = (dx, dy, color, depth) =>
      this.add
        .text(W / 2 + px(dx), px(184 + dy), 'OVERDRIVE', { fontFamily: FONT_PS, fontSize: px(36) + 'px', color })
        .setOrigin(0.5)
        .setDepth(depth)
        .setVisible(false);
    const parts = [title(4, 4, '#3a0508', 1), title(-3, 0, '#f4f1ea', 2), title(0, 0, '#ff2a2a', 3)];
    const exe = this.add.container(W / 2, px(232)).setDepth(3).setVisible(false);
    const tag = this.add.graphics();
    tag.fillStyle(COLORS.paper, 1).fillRect(-px(42), -px(13), px(84), px(26));
    exe.add([
      tag,
      this.add.text(0, px(1), '.EXE', { fontFamily: FONT_PS, fontSize: px(14) + 'px', color: '#0b0507' }).setOrigin(0.5),
    ]);
    exe.setAngle(-4);
    const sub = this.add
      .text(W / 2, px(268), TEXTS.ui.subtitle, { fontFamily: FONT_VT, fontSize: px(24) + 'px', color: '#e9e4dc' })
      .setOrigin(0.5)
      .setVisible(false);

    // MARS stands between the speech box and the call to action, as big as fits
    const feet = LH - 132;
    const marsScale = Phaser.Math.Clamp(Math.floor((feet - 392) / 58), 2, 6);
    const mars = this.add
      .image(W / 2, px(feet), 'mars-neutral')
      .setOrigin(0.5, 1)
      .setScale(K * marsScale)
      .setDepth(4)
      .setVisible(false);
    const bubble = new Bubble(this, px(36), px(300), W - px(72), { tail: false, anchor: 'top', size: 24 });
    const cta = blinkText(this, W / 2, px(LH - 92), TEXTS.ui.start, 10).setVisible(false);
    const cuffie = this.add
      .text(W / 2, px(LH - 58), TEXTS.ui.headphones, { fontFamily: FONT_VT, fontSize: px(20) + 'px', color: '#b8bcc6' })
      .setOrigin(0.5)
      .setDepth(30)
      .setVisible(false);

    const reveal = 140 + log.length * 170 + 120;
    this.time.delayedCall(reveal, () => {
      [...parts, exe, sub].forEach((o) => o.setVisible(true));
      parts.forEach((p) => {
        p.setScale(1.7);
        this.tweens.add({ targets: p, scale: 1, duration: 140, ease: 'Back.Out' });
      });
      this.glitch = 1;
      this.cameras.main.shake(200, 0.01);
    });
    this.time.delayedCall(reveal + 350, () => {
      mars.setVisible(true);
      bubble.show(pick(TEXTS.boot), 0);
      cta.setVisible(true);
      cuffie.setVisible(true);
    });
    // MARS blinks into his glitched self now and then
    this.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => {
        if (!mars.visible) return;
        mars.setTexture('mars-glitch');
        this.glitch = 0.6;
        this.time.delayedCall(120, () => mars.setTexture('mars-neutral'));
      },
    });

    let started = false;
    this.input.on('pointerdown', () => {
      if (started) return;
      started = true;
      getCtx(); // audio can only start after a user gesture
      this.glitch = 1;
      this.cameras.main.fadeOut(250);
      this.time.delayedCall(260, () =>
        this.scene.start('Story', { id: 'intro', next: { scene: 'Play', data: { level: FIRST_LEVEL } } }),
      );
    });
  }

  update(time, delta) {
    this.glitch = Math.max(0, this.glitch - delta / 400);
    if (this.fx) {
      this.fx.glitch = this.glitch;
      this.fx.ab = 0.35 + this.glitch * 1.5;
      this.fx.pump = 0;
      this.fx.invert = 0;
      this.fx.grain = 0.06;
    }
    for (const r of this.rows) r.tilePositionX += r.getData('dir') * 0.04 * delta * K;
  }
}
