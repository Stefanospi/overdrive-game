import Phaser from 'phaser';
import { W, LH, px, COLORS, FONT_PS, FONT_VT } from '../config.js';
import { LEVELS, ROADMAP } from '../levels.js';
import { drawBackdrop, drawLabelStrip, button } from '../ui.js';
import { attachFx } from '../fx.js';
import { TEXTS } from '../texts.js';
import { EP } from '../campaign.js';
import { fragments, bestOf } from '../progress.js';

// Map of the Ministry's system: five layers, one per track. Cleared layers light up
// their district; the rest wait for the next single.
export class Hub extends Phaser.Scene {
  constructor() {
    super('Hub');
  }

  create() {
    drawBackdrop(this);
    this.fx = attachFx(this);
    drawLabelStrip(this, TEXTS.ui.label);
    this.cameras.main.fadeIn(250);
    const H = TEXTS.hub;
    const cleared = fragments();

    this.add.text(W / 2, px(34), H.title, { fontFamily: FONT_PS, fontSize: px(13) + 'px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(W / 2, px(58), H.hint, { fontFamily: FONT_VT, fontSize: px(19) + 'px', color: '#ff7a7a' }).setOrigin(0.5);

    const top = 92;
    const step = Math.min(96, (LH - top - 120) / ROADMAP.length);
    const g = this.add.graphics();
    ROADMAP.forEach((node, i) => {
      const y = top + i * step;
      const level = node.id && LEVELS[node.id];
      const lit = node.id && cleared.includes(node.id);
      const x = px(52);
      // wire to the next node
      if (i < ROADMAP.length - 1) g.fillStyle(lit ? COLORS.red : COLORS.grey, 1).fillRect(x - px(1), px(y + 38), px(3), px(step - 38));
      // the district: a small tower block, windows lit when cleared
      g.fillStyle(0x000000, 1).fillRect(x - px(24), px(y), px(48), px(40));
      g.lineStyle(px(2), lit ? COLORS.red : level ? COLORS.silver : COLORS.grey, 1).strokeRect(x - px(24), px(y), px(48), px(40));
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          const on = !!lit;
          g.fillStyle(on ? COLORS.red : 0x2a2a30, 1).fillRect(x - px(18) + c * px(10), px(y + 6) + r * px(10), px(6), px(6));
        }
      }
      const color = level ? '#ffffff' : '#6a6a74';
      this.add.text(px(96), px(y + 2), `${i + 1}. ${H.layers[i]}`, { fontFamily: FONT_PS, fontSize: px(11) + 'px', color });
      const sub = level ? level.title : '???';
      this.add.text(px(96), px(y + 20), sub, { fontFamily: FONT_VT, fontSize: px(20) + 'px', color: level ? '#c0c0c0' : '#6a6a74' });
      let status = H.locked;
      if (level) {
        const b = bestOf(node.id);
        status = lit ? `OK  ${b ? String(b.score).padStart(7, '0') : ''}` : 'DA INFETTARE';
      }
      this.add.text(px(96), px(y + 36), status, { fontFamily: FONT_VT, fontSize: px(17) + 'px', color: lit ? '#ff2a2a' : '#8a8a94' });
      if (level) {
        button(this, W - px(58), px(y + 22), px(86), px(30), lit ? TEXTS.ui.again : 'ENTRA', () => this.enter(node.id), { primary: !lit, size: 8, depth: 6 });
      }
    });

    this.add
      .text(W / 2, px(LH - 74), `${TEXTS.campaign.epLine} // ${EP.dateLabel}${EP.indicative ? ' (' + TEXTS.campaign.indicative + ')' : ''}`, {
        fontFamily: FONT_VT,
        fontSize: px(18) + 'px',
        color: '#e9e4dc',
      })
      .setOrigin(0.5);
    button(this, W / 2, px(LH - 46), px(150), px(28), TEXTS.ui.back, () => this.go('Boot'), { size: 8, depth: 6 });
  }

  // A level with a chapter of its own (`<id>_intro`) plays the story first.
  enter(id) {
    const chapter = id + '_intro';
    const play = { scene: 'Play', data: { level: id } };
    if (TEXTS.story[chapter]) this.go('Story', { id: chapter, next: play });
    else this.go(play.scene, play.data);
  }

  go(scene, data) {
    this.cameras.main.fadeOut(220);
    this.time.delayedCall(230, () => this.scene.start(scene, data));
  }

  update() {
    if (this.fx) {
      this.fx.glitch = 0;
      this.fx.ab = 0.3;
      this.fx.pump = 0;
      this.fx.invert = 0;
      this.fx.grain = 0.06;
    }
  }
}
