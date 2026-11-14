import Phaser from 'phaser';
import { K, W, H, LH, px, COLORS, FONT_PS, FONT_VT, PARAMS } from '../config.js';
import { registerMars } from '../sprites.js';
import { drawBackdrop, drawLabelStrip } from '../ui.js';
import { attachFx } from '../fx.js';
import { TEXTS } from '../texts.js';
import { LEVELS, FIRST_LEVEL } from '../levels.js';
import { getCtx, preload, blip, typeClick, sfx } from '../audio.js';
import { StoryScene } from '../storyScenes.js';

// Cutscene: one chapter of TEXTS.story, a panel per tap. Started with
//   { id: <chapter key>, next: { scene, data } }   where `next` runs when it ends.
const BOX_H = 150; // dialogue box height
// Typing sound per speaker: [pitch Hz, waveform]. Anyone else (decree, narration) gets a typewriter click.
const VOICES = { mars: [330, 'square'], ministro: [110, 'sawtooth'], girl: [560, 'triangle'], quiete: [920, 'square'] };
const STAGE_COLORS = { mars: COLORS.red, ministro: COLORS.silver, decree: COLORS.paper, girl: COLORS.red, quiete: COLORS.silver };

export class Story extends Phaser.Scene {
  constructor() {
    super('Story');
  }

  init(data) {
    this.chapterId = (data && data.id) || PARAMS.get('story') || 'intro';
    this.next = (data && data.next) || { scene: 'Play', data: { level: FIRST_LEVEL } };
  }

  create() {
    const chapter = (this.chapter = TEXTS.story[this.chapterId]);
    registerMars(this);
    drawBackdrop(this);
    this.fx = attachFx(this);
    drawLabelStrip(this, TEXTS.ui.label);
    this.cameras.main.fadeIn(250);
    this.glitch = 0.6;
    this.spin = 0;
    this.who = null;

    // the next level's clip downloads while the player reads
    const nextLevel = this.next.data && LEVELS[this.next.data.level];
    if (nextLevel && nextLevel.track) preload(nextLevel.track.url);

    const ps = (size, color) => ({ fontFamily: FONT_PS, fontSize: px(size) + 'px', color });
    this.add.text(px(18), px(22), chapter.chapter, ps(8, '#ff2a2a')).setDepth(6);
    this.add.text(px(18), px(40), chapter.title, ps(14, '#ffffff')).setDepth(6).setShadow(px(3), px(3), '#3a0508', 0, false, true);
    this.dots = this.add.text(px(18), px(66), '', ps(6, '#c0c0c0')).setDepth(6);
    const skip = this.add
      .text(W - px(14), px(22), TEXTS.story.skip + ' >>', ps(7, '#c0c0c0'))
      .setOrigin(1, 0)
      .setDepth(6)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (p, x, y, e) => {
        e.stopPropagation();
        this.finish();
      });
    skip.input.hitArea.setTo(-px(20), -px(16), skip.width + px(40), skip.height + px(32));

    // stage: rays behind the speaker, speaker (or the decree) on top
    this.stageY = px(LH - BOX_H - 46); // where the speaker's feet are
    this.stageG = this.add.graphics().setDepth(-5);
    this.sceneG = this.add.graphics().setDepth(-4);
    this.sceneRect = { y0: px(96), h: px(LH - BOX_H - 34 - 96) };
    this.picture = null;
    const room = LH - BOX_H - 46 - 96;
    this.actorScale = K * Phaser.Math.Clamp(Math.floor(room / 58), 3, 7);
    this.actor = this.add.image(W / 2, this.stageY, 'mars-neutral').setOrigin(0.5, 1).setScale(this.actorScale).setDepth(2);
    this.actorScaleSmall = K * Math.max(2, Math.floor((this.actorScale / K) * 0.6));
    this.paper = this.buildDecree().setVisible(false);
    this.paperY = this.paper.y;

    // dialogue box
    const by = px(LH - BOX_H - 34);
    const bw = W - px(28);
    const g = this.add.graphics().setDepth(10);
    g.fillStyle(COLORS.red, 1).fillRect(px(14) + px(6), by + px(6), bw, px(BOX_H));
    g.fillStyle(COLORS.paper, 1).fillRect(px(14), by, bw, px(BOX_H));
    g.lineStyle(px(3), 0x000000, 1).strokeRect(px(14), by, bw, px(BOX_H));
    this.tagG = this.add.graphics().setDepth(11);
    this.tag = this.add.text(px(26), by - px(9), '', ps(8, '#ffffff')).setOrigin(0, 0.5).setDepth(12);
    this.tagY = by;
    this.body = this.add
      .text(px(28), by + px(22), '', {
        fontFamily: FONT_VT,
        fontSize: px(25) + 'px',
        color: '#15121a',
        wordWrap: { width: bw - px(28) },
        lineSpacing: -px(3),
      })
      .setDepth(11);
    this.more = this.add
      .text(px(14) + bw - px(12), by + px(BOX_H) - px(12), TEXTS.story.next + ' >', ps(6, '#b8121a'))
      .setOrigin(1, 1)
      .setDepth(11);
    this.tweens.add({ targets: this.more, alpha: 0.2, duration: 480, yoyo: true, repeat: -1 });

    this.index = -1;
    this.done = false;
    this.advance();
    this.input.on('pointerdown', () => {
      getCtx(); // any tap here also unlocks audio for the level that follows
      if (this.done) return;
      if (this.typer && this.typer.getOverallProgress() < 1) {
        this.typer.remove(false);
        this.body.setText(this.full);
        this.more.setVisible(true);
      } else {
        this.advance();
      }
    });
    this.input.keyboard.on('keydown-SPACE', () => this.input.emit('pointerdown'));
  }

  // The decree: a typed sheet with the Ministry's letterhead and a seal.
  buildDecree() {
    const w = px(230);
    const h = px(Phaser.Math.Clamp(LH - BOX_H - 46 - 110, 190, 300));
    const c = this.add.container(W / 2, this.stageY - h / 2 - px(6)).setDepth(2);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.6).fillRect(-w / 2 + px(8), -h / 2 + px(8), w, h);
    g.fillStyle(COLORS.paper, 1).fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle(COLORS.ink, 1).fillRect(-w / 2 + px(16), -h / 2 + px(40), w - px(32), px(2));
    for (let y = 58; y < h / K - 70; y += 13) {
      const short = (y * 7) % 5 === 0 ? 0.6 : 1;
      g.fillStyle(COLORS.ink, 0.55).fillRect(-w / 2 + px(16), -h / 2 + px(y), (w - px(32)) * short, px(3));
    }
    g.lineStyle(px(3), COLORS.red, 1).strokeCircle(w / 2 - px(46), h / 2 - px(44), px(26));
    g.lineStyle(px(1), COLORS.red, 1).strokeCircle(w / 2 - px(46), h / 2 - px(44), px(21));
    g.lineStyle(px(4), COLORS.red, 1).lineBetween(w / 2 - px(62), h / 2 - px(60), w / 2 - px(30), h / 2 - px(28));
    const head = this.add
      .text(0, -h / 2 + px(22), TEXTS.report.ministry, { fontFamily: FONT_PS, fontSize: px(8) + 'px', color: '#15121a' })
      .setOrigin(0.5);
    c.add([g, head]);
    c.setAngle(-3);
    return c;
  }

  advance() {
    this.index++;
    const panels = this.chapter.panels;
    if (this.index >= panels.length) return this.finish();
    const p = panels[this.index];
    this.dots.setText(`${this.index + 1}/${panels.length}`);

    // picture behind the speaker (a drawn scene), if the panel has one
    if (p.scene) {
      if (!this.picture || this.picture.kind !== p.scene) {
        if (this.picture) this.picture.destroy();
        this.picture = new StoryScene(this, p.scene, this.sceneRect);
        this.glitch = 0.9;
      }
    } else if (this.picture) {
      this.picture.destroy();
      this.picture = null;
      this.sceneG.clear();
    }
    if (p.sfx) sfx(p.sfx);
    if (p.shake) this.cameras.main.shake(p.shake, 0.012);

    // speaker
    const hasActor = !!p.who && p.who !== 'decree';
    const changed = p.who !== this.who;
    this.who = p.who || 'narr';
    const isPaper = p.who === 'decree';
    this.actor.setVisible(hasActor);
    this.paper.setVisible(isPaper);
    if (hasActor) this.actor.setTexture(`${p.who}-${p.expr}`);
    const target = isPaper ? this.paper : this.actor;
    const baseScale = p.scene ? this.actorScaleSmall : this.actorScale;
    this.tweens.killTweensOf(target);
    const home = isPaper ? this.paperY : this.stageY;
    target.setScale(isPaper ? 1 : baseScale).setAlpha(1).setY(home);
    if (hasActor || isPaper) {
      if (changed) {
        target.y = home + px(40);
        target.setAlpha(0);
        this.tweens.add({ targets: target, y: home, alpha: 1, duration: 180, ease: 'Back.Out' });
        this.glitch = 0.7;
      } else {
        this.tweens.add({ targets: target, scaleY: target.scaleY * 1.04, duration: 70, yoyo: true });
      }
    }
    const loud = p.expr === 'angry' || p.expr === 'shout';
    if (loud) this.cameras.main.shake(160, p.expr === 'shout' ? 0.01 : 0.006);
    if (navigator.vibrate && loud) navigator.vibrate(15);

    // name tag: the speaker, or the place and time for narration
    const name = p.who ? TEXTS.names[p.who] : p.caption || '';
    this.tag.setText(name).setVisible(!!name);
    this.tagG.clear();
    if (name) {
      const tagColor = p.who === 'mars' ? COLORS.redDark : COLORS.ink;
      this.tagG.fillStyle(tagColor, 1).fillRect(px(18), this.tagY - px(20), this.tag.width + px(16), px(22));
      this.tagG.lineStyle(px(2), 0x000000, 1).strokeRect(px(18), this.tagY - px(20), this.tag.width + px(16), px(22));
    }
    this.voice = VOICES[p.who] || null;

    // text, typed
    this.full = this.body.getWrappedText(p.text).join('\n');
    this.body.setText('');
    this.more.setVisible(false);
    if (this.typer) this.typer.remove(false);
    let n = 0;
    this.typer = this.time.addEvent({
      delay: 20,
      repeat: this.full.length - 1,
      callback: () => {
        n++;
        this.body.setText(this.full.slice(0, n));
        const ch = this.full[n - 1];
        if (ch && ch.trim() && n % 2 === 0) {
          if (this.voice) blip(this.voice[0], this.voice[1]);
          else typeClick();
        }
        if (n >= this.full.length) this.more.setVisible(true);
      },
    });
  }

  finish() {
    if (this.done) return;
    this.done = true;
    getCtx();
    this.glitch = 1;
    this.cameras.main.fadeOut(250);
    this.time.delayedCall(260, () => this.scene.start(this.next.scene, this.next.data));
  }

  update(time, delta) {
    this.glitch = Math.max(0, this.glitch - delta / 400);
    this.spin += delta * (this.who === 'ministro' || this.who === 'quiete' ? 0 : 0.00012);
    if (this.picture) this.picture.update(this.sceneG, delta / 1000);
    if (this.fx) {
      this.fx.glitch = this.glitch;
      this.fx.ab = 0.3 + this.glitch * 1.4;
      this.fx.pump = 0;
      this.fx.invert = 0;
      this.fx.grain = 0.06;
    }

    // backdrop of the stage: slow sunburst for Mars, rigid bars for the Minister
    const g = this.stageG;
    g.clear();
    if (this.picture) return; // a drawn scene replaces the sunburst
    const cx = W / 2;
    const cy = this.stageY - px(150);
    const color = STAGE_COLORS[this.who] || COLORS.red;
    if (this.who === 'ministro' || this.who === 'quiete') {
      g.fillStyle(color, 0.1);
      for (let x = px(20); x < W; x += px(44)) g.fillRect(x, px(90), px(18), this.stageY - px(90));
    } else {
      const rays = 14;
      const far = H;
      g.fillStyle(color, 0.1);
      for (let i = 0; i < rays; i++) {
        const a0 = this.spin + (i / rays) * Math.PI * 2;
        const a1 = a0 + Math.PI / rays;
        g.fillTriangle(cx, cy, cx + Math.cos(a0) * far, cy + Math.sin(a0) * far, cx + Math.cos(a1) * far, cy + Math.sin(a1) * far);
      }
    }
    g.fillStyle(0x000000, 0.45).fillEllipse(cx, this.stageY, px(190), px(18));
  }
}
