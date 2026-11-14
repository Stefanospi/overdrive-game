import Phaser from 'phaser';
import { W, LH, px, COLORS, FONT_PS, FONT_VT } from '../config.js';
import { drawBackdrop, drawLabelStrip, button } from '../ui.js';
import { attachFx } from '../fx.js';
import { TEXTS } from '../texts.js';
import { settings, calibration } from '../settings.js';
import * as A from '../audio.js';

// Latency calibration. Phones report audio latency badly (Bluetooth most of all), so
// the player taps along to a metronome and we measure how late they land.
//
// Play judges a hit as (tap time - note time - latency). If taps land d seconds after
// the click on the audio clock, the extra compensation to apply is d - latency.
const CLICKS = 12;
const GAP = 0.5; // seconds: 120 BPM
const SKIP = 3; // the first clicks are for getting into the groove

export class Calibrate extends Phaser.Scene {
  constructor() {
    super('Calibrate');
  }

  init(data) {
    // `next` = { scene, data }: set when this runs automatically on first launch
    this.next = data && data.next ? data.next : null;
  }

  create() {
    drawBackdrop(this);
    this.fx = attachFx(this);
    drawLabelStrip(this, TEXTS.ui.label);
    this.cameras.main.fadeIn(250);
    const C = TEXTS.calibrate;
    const ps = (n, color = '#ffffff') => ({ fontFamily: FONT_PS, fontSize: px(n) + 'px', color });
    const vt = (n, color = '#c0c0c0') => ({ fontFamily: FONT_VT, fontSize: px(n) + 'px', color });

    this.add.text(W / 2, px(48), C.title, ps(14)).setOrigin(0.5);
    this.add
      .text(W / 2, px(96), C.body, { ...vt(24), align: 'center', wordWrap: { width: px(300) } })
      .setOrigin(0.5, 0);
    this.pulse = this.add.circle(W / 2, px(LH / 2 - 10), px(60), COLORS.red, 0.2).setStrokeStyle(px(4), 0xffffff);
    this.status = this.add.text(W / 2, px(LH / 2 + 90), C.start, ps(10)).setOrigin(0.5);
    this.tweens.add({ targets: this.status, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    this.value = this.add.text(W / 2, px(LH / 2 + 126), '', vt(24, '#ff7a7a')).setOrigin(0.5);
    this.showValue();

    this.state = 'idle';
    this.taps = [];
    this.clicks = [];
    this.input.on('pointerdown', () => this.onTap());

    // manual fine tuning and exit
    if (!this.next) {
      button(this, W / 2 - px(80), px(LH - 120), px(56), px(30), '-5', () => this.nudge(-5), { size: 10, depth: 6 });
      button(this, W / 2 + px(80), px(LH - 120), px(56), px(30), '+5', () => this.nudge(5), { size: 10, depth: 6 });
      button(this, W / 2, px(LH - 120), px(84), px(30), C.redo, () => this.reset(), { size: 8, depth: 6 });
    }
    // on first launch the same button skips, then becomes CONTINUA
    this.okBtn = button(this, W / 2, px(LH - 76), px(150), px(32), this.next ? C.skip : C.ok, () => this.leave(), { primary: true, size: 10, depth: 6 });
  }

  showValue() {
    const v = calibration();
    this.value.setText(`${v > 0 ? '+' : ''}${v} ms`);
  }

  nudge(d) {
    settings.set('offsetMs', Phaser.Math.Clamp(calibration() + d, -250, 250));
    this.showValue();
  }

  reset() {
    this.state = 'idle';
    this.status.setText(TEXTS.calibrate.start);
  }

  onTap() {
    A.getCtx();
    if (this.state === 'idle') {
      this.start();
    } else if (this.state === 'run') {
      this.taps.push(A.clock());
      this.pulse.setScale(0.85);
      this.tweens.add({ targets: this.pulse, scale: 1, duration: 120 });
    }
  }

  start() {
    this.state = 'run';
    this.taps = [];
    const t0 = A.clock() + 1;
    this.clicks = Array.from({ length: CLICKS }, (_, i) => t0 + i * GAP);
    this.clicks.forEach((t, i) => A.tick(t, i % 4 === 0 ? 1800 : 1200));
    this.status.setText('...');
    this.runEnd = this.clicks[CLICKS - 1] + 0.4;
    this.cursor = 0;
  }

  finish() {
    this.state = 'done';
    const ds = [];
    for (const tap of this.taps) {
      let best = 0;
      for (let i = 1; i < CLICKS; i++) if (Math.abs(this.clicks[i] - tap) < Math.abs(this.clicks[best] - tap)) best = i;
      const d = tap - this.clicks[best];
      if (best >= SKIP && Math.abs(d) < 0.22) ds.push(d);
    }
    if (ds.length < 5) {
      this.status.setText('TROPPO POCHI TAP. RIPROVA.');
      this.state = 'idle';
      return;
    }
    ds.sort((a, b) => a - b);
    const med = ds[Math.floor(ds.length / 2)];
    const offset = Phaser.Math.Clamp(Math.round((med - A.latency()) * 1000), -250, 250);
    settings.set('offsetMs', offset);
    this.status.setText(TEXTS.calibrate.done(offset));
    this.showValue();
    settings.set('calibrated', true);
    if (this.next) {
      this.okBtn.label.setText(TEXTS.calibrate.go);
      this.time.delayedCall(1600, () => this.leave());
    }
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    settings.set('calibrated', true); // skipping counts: do not nag again
    this.cameras.main.fadeOut(220);
    this.time.delayedCall(230, () => (this.next ? this.scene.start(this.next.scene, this.next.data) : this.scene.start('Boot')));
  }

  update() {
    if (this.state === 'run') {
      const now = A.clock();
      // flash the circle on every scheduled click
      while (this.cursor < CLICKS && this.clicks[this.cursor] <= now - A.latency()) {
        this.pulse.setFillStyle(COLORS.red, 0.9);
        this.tweens.add({ targets: this.pulse, fillAlpha: 0.2, duration: 220 });
        this.cursor++;
      }
      if (now > this.runEnd) this.finish();
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
