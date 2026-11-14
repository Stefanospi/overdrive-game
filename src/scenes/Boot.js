import Phaser from 'phaser';
import { K, W, LH, px, COLORS, FONT_PS, FONT_VT } from '../config.js';
import { LEVELS, FIRST_LEVEL } from '../levels.js';
import { registerMars } from '../sprites.js';
import { drawBackdrop, drawLabelStrip, textTexture, buildWindow, button } from '../ui.js';
import { settings, reducedFx } from '../settings.js';
import { EP, track } from '../campaign.js';
import { attachFx } from '../fx.js';
import { TEXTS } from '../texts.js';
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

    // release line under the subtitle
    const rel = this.add
      .text(W / 2, px(292), `USCITA ${EP.dateLabel}${EP.indicative ? ' (' + TEXTS.campaign.indicative + ')' : ''}`, {
        fontFamily: FONT_VT,
        fontSize: px(19) + 'px',
        color: '#ff7a7a',
      })
      .setOrigin(0.5)
      .setVisible(false);

    // ---- the fake mandatory update: installing it is "starting the game" ----
    const I = TEXTS.installer;
    const ww = px(330);
    const wh = px(170);
    const wx = (W - ww) / 2;
    const wy = px(322);
    const win = buildWindow(this, ww, wh, I.title, { font: 6 });
    win.setPosition(wx, wy).setDepth(4).setVisible(false);
    const head = this.add.text(px(14), px(36), I.head, { fontFamily: FONT_PS, fontSize: px(9) + 'px', color: '#15121a' });
    const body = this.add.text(px(14), px(54), I.body, {
      fontFamily: FONT_VT,
      fontSize: px(20) + 'px',
      color: '#15121a',
      wordWrap: { width: ww - px(28) },
      lineSpacing: -px(4),
    });
    const barG = this.add.graphics();
    const drawBar = (v) => {
      barG.clear();
      barG.fillStyle(0xffffff, 1).fillRect(px(14), px(98), ww - px(28), px(14));
      barG.lineStyle(px(2), 0x000000, 1).strokeRect(px(14), px(98), ww - px(28), px(14));
      barG.fillStyle(COLORS.red, 1).fillRect(px(16), px(100), (ww - px(32)) * v, px(10));
    };
    drawBar(0);
    win.add([head, body, barG]);
    const installBtn = button(this, W / 2, wy + px(142), px(150), px(32), I.button, () => install(), { primary: true, size: 11, depth: 6 });
    installBtn.setVisible(false);
    const tagline = this.add
      .text(W / 2, px(LH - 84), I.tagline, { fontFamily: FONT_VT, fontSize: px(22) + 'px', color: '#e9e4dc' })
      .setOrigin(0.5)
      .setVisible(false);

    // small links: calibration, leaderboard, effects
    const link = (x, label, fn) => {
      const t = this.add
        .text(x, px(LH - 46), label, { fontFamily: FONT_VT, fontSize: px(19) + 'px', color: '#b8bcc6' })
        .setOrigin(0.5)
        .setDepth(30)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });
      t.on('pointerdown', (p, lx, ly, ev) => {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        getCtx();
        fn();
      });
      return t;
    };
    const go = (scene, data) => {
      this.cameras.main.fadeOut(200);
      this.time.delayedCall(210, () => this.scene.start(scene, data));
    };
    const fxLabel = () => (reducedFx() ? TEXTS.ui.fxReduced : TEXTS.ui.fxFull);
    const links = [
      link(px(62), TEXTS.ui.calibrate, () => go('Calibrate')),
      link(W / 2, TEXTS.ui.board, () => go('Board', { from: 'Boot' })),
      link(W - px(76), fxLabel(), () => {
        settings.set('reduced', !reducedFx());
        links[2].setText(fxLabel());
      }),
    ];

    const reveal = 140 + log.length * 170 + 120;
    this.time.delayedCall(reveal, () => {
      [...parts, exe, sub, rel].forEach((o) => o.setVisible(true));
      parts.forEach((p) => {
        p.setScale(1.7);
        this.tweens.add({ targets: p, scale: 1, duration: 140, ease: 'Back.Out' });
      });
      this.glitch = 1;
      this.cameras.main.shake(200, 0.01);
    });
    this.time.delayedCall(reveal + 350, () => {
      win.setVisible(true);
      installBtn.setVisible(true);
      tagline.setVisible(true);
      links.forEach((l) => l.setVisible(true));
    });

    // installing fails on purpose: the file is not an update, it is MARS
    let started = false;
    const install = () => {
      if (started) return;
      started = true;
      getCtx(); // audio can only start after a user gesture
      track('install_click');
      installBtn.setVisible(false);
      body.setText(I.progress);
      const p = { v: 0 };
      this.tweens.add({
        targets: p,
        v: 0.99,
        duration: 1100,
        ease: 'Quad.In',
        onUpdate: () => drawBar(p.v),
        onComplete: () => {
          this.glitch = 1;
          this.cameras.main.shake(300, 0.012);
          body.setText(I.error).setColor('#b8121a');
          const mars = this.add
            .image(W - px(74), wy + wh + px(70), 'mars-glitch')
            .setOrigin(0.5, 1)
            .setScale(K * 1.8)
            .setDepth(7);
          this.tweens.add({ targets: mars, y: wy + wh + px(40), duration: 180, ease: 'Back.Out' });
          this.time.delayedCall(1300, () => {
            this.cameras.main.fadeOut(250);
            this.time.delayedCall(260, () =>
              this.scene.start('Story', { id: 'intro', next: { scene: 'Play', data: { level: FIRST_LEVEL } } }),
            );
          });
        },
      });
    };
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
