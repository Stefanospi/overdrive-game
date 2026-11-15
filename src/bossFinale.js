import Phaser from 'phaser';
import { W, H, LH, px, COLORS, FONT_PS, FONT_VT, PARAMS } from './config.js';
import { TEXTS } from './texts.js';
import { BOSS_TUNING as T } from './bossTuning.js';
import { StoryScene } from './storyScenes.js';
import { button } from './ui.js';
import { EP, openLink, track } from './campaign.js';
import { rank } from './rank.js';
import { recordResult } from './progress.js';
import { shareResult } from './share.js';
import * as A from './audio.js';

// The end of the boss fight: the player presses ESEGUI, and right after the blast the EP
// is on screen.
//   charge  (bar 20, the break)   the cable and the plug appear, the ring around ESEGUI
//                                 fills in time; the button cannot be pressed yet
//   armed   (ring full)           the button waits for ONE tap, anywhere. Nothing fires by
//                                 itself: the last beat of the riser loops with a kick
//   fired   (after the tap)       the blast lands on the next beat: the plug goes in, the
//                                 giant crumbles, ROOT TOTALE, and the drop of bar 21
//                                 starts at that instant on the audio clock
//   ep      (4 beats later)       the EP screen: cover, ASCOLTA, share, board, CONTINUA
// How well the tap sits on the beat only changes how big the blast is, never the result.
const CX = W / 2;
const GAP = 26; // logical px between the plug and the socket while it is out
const CYAN = '#33e0ff'; // only as the fringe of the chromatic aberration

export class BossFinale {
  constructor(scene) {
    this.s = scene;
    this.reduced = scene.reduced;
    this.state = 'idle';
    this.fireBeat = 0;
    this.tapBeat = 0;
    this.power = 1;
    this.kickAt = T.unlockBeat; // next beat that gets a kick while waiting
    this.boomed = false;
    this.loop = null;
  }

  // ---- charge ---------------------------------------------------------------------
  start() {
    const s = this.s;
    this.state = 'charge';
    // the play field steps back: no more notes, the giant comes out in full
    s.tweens.add({ targets: [s.roadG, s.censorG, ...s.playUi], alpha: 0.12, duration: 500 });
    s.tweens.add({ targets: s.show, ga: 1, duration: 500 });
    // the neighbourhood soundsystem, its cable and the plug that was pulled (story art)
    this.art = new StoryScene(s, 'city_dark', { y0: px(LH - 20 - 132), h: px(124) });
    this.artG = s.add.graphics().setDepth(3).setAlpha(0);
    s.tweens.add({ targets: this.artG, alpha: 1, duration: 400 });

    const r = px(56);
    this.r = r;
    const disc = s.add.graphics();
    disc.fillStyle(0x000000, 1).fillCircle(px(5), px(5), r);
    disc.fillStyle(COLORS.redDark, 1).fillCircle(0, 0, r);
    disc.fillStyle(COLORS.red, 1).fillCircle(0, -px(3), r - px(6));
    disc.lineStyle(px(3), 0x000000, 1).strokeCircle(0, 0, r);
    const label = s.add.text(0, 0, TEXTS.boss.words.exec, { fontFamily: FONT_PS, fontSize: px(13) + 'px', color: '#ffffff' }).setOrigin(0.5);
    label.setShadow(px(2), px(2), '#000000', 0, false, true);
    label.setScale(Math.min(1, (r * 1.7) / label.width));
    this.ring = s.add.graphics();
    this.btn = s.add.container(CX, px(LH - 238), [this.ring, disc, label]).setDepth(32).setScale(0.3).setAlpha(0);
    s.tweens.add({ targets: this.btn, scale: 1, alpha: 0.75, duration: 260, ease: 'Back.Out' });
    this.hint = s.add
      .text(CX, px(LH - 238) - r - px(26), TEXTS.boss.words.loading, { fontFamily: FONT_PS, fontSize: px(8) + 'px', color: '#c0c0c0' })
      .setOrigin(0.5)
      .setDepth(32)
      .setBackgroundColor('#000000')
      .setPadding(px(6), px(4), px(6), px(4));
  }

  drawRing(frac, armed) {
    const g = this.ring.clear();
    const r = this.r + px(11);
    g.lineStyle(px(6), COLORS.redDeep, 1).strokeCircle(0, 0, r);
    g.lineStyle(px(6), armed ? 0xffffff : COLORS.red, 1);
    g.beginPath();
    g.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    g.strokePath();
  }

  // ---- the tap ----------------------------------------------------------------------
  // Returns true when the tap was the ESEGUI tap (Play then ignores it as a lane press).
  tap() {
    if (this.state !== 'armed') return this.state === 'charge' || this.state === 'fired';
    const s = this.s;
    const now = A.clock();
    // the next beat of the grid, at least `tapGuard` away
    const k = Math.max(T.unlockBeat, Math.ceil((now + T.tapGuard - s.t0) / s.beat));
    const when = s.t0 + k * s.beat;
    const tr = s.level.track;
    if (this.loop) this.loop.stop(when);
    if (s.buffer) {
      // the drop of bar 21 starts on that beat, then bars 24-27 go round under the EP screen
      s.track = A.playTrack(s.buffer, when, tr.lead + T.unlockBeat * s.beat, {
        loop: [tr.lead + T.codaLoop[0] * s.beat, tr.lead + T.codaLoop[1] * s.beat],
      });
    }
    // how close to a beat the finger landed: 1 = on it, 0.6 = as far off as possible
    const ph = (((now - s.lat - s.t0) / s.beat) % 1 + 1) % 1;
    this.power = 1 - Math.min(ph, 1 - ph) * 0.8;
    this.state = 'fired';
    this.fireBeat = k;
    this.tapBeat = s.songBeat();
    s.flashWord(TEXTS.boss.words.exec, 700, 5);
    s.setMars('shout');
    this.hint.setVisible(false);
    s.tweens.killTweensOf(this.btn);
    this.btn.setAlpha(1);
    s.tweens.add({ targets: this.btn, scale: 0.86, duration: 70 });
    if (navigator.vibrate) navigator.vibrate(30);
    track('boss_execute', { rank: rank(s.bossResult), power: Math.round(this.power * 100) });
    if (!s.auto) recordResult(s.bossResult); // the run counts from here, whatever is tapped next
    return true;
  }

  // ---- frame -------------------------------------------------------------------------
  update(sb, dt) {
    const s = this.s;
    if (this.state === 'idle') {
      if (sb >= T.chargeBeat && s.bossResult) this.start();
      return;
    }
    if (this.state === 'ep') return this.updateEp(sb, dt);

    const phase = sb - Math.floor(sb);
    if (this.state === 'charge') {
      this.drawRing(Phaser.Math.Clamp((sb - T.chargeBeat) / (T.unlockBeat - T.chargeBeat), 0, 1), false);
      // hold the last beat of the riser from the unlock on (scheduled a little ahead)
      if (!this.loop && s.buffer && sb >= T.unlockBeat - 1) {
        const tr = s.level.track;
        this.loop = A.playLoop(s.buffer, s.t0 + T.unlockBeat * s.beat, tr.lead + (T.unlockBeat - 1) * s.beat, tr.lead + T.unlockBeat * s.beat);
      }
      if (sb >= T.unlockBeat) {
        this.state = 'armed';
        this.hint.setText(TEXTS.boss.words.tap).setColor('#ffffff');
        this.btn.setAlpha(1);
        s.flash = 0.3;
      }
    }
    if (this.state === 'armed' || (this.state === 'fired' && !this.boomed)) {
      // a kick on every beat keeps the tension up while the button waits
      const until = this.state === 'fired' ? this.fireBeat : Infinity;
      while (this.kickAt < until && s.t0 + this.kickAt * s.beat < A.clock() + 0.2) {
        const t = s.t0 + this.kickAt * s.beat;
        if (t > A.clock()) A.kick(t, 0.8);
        this.kickAt++;
      }
    }
    if (this.state === 'armed') {
      this.drawRing(1, true);
      const beatIn = (1 - phase) * (1 - phase);
      if (this.reduced) this.btn.setAlpha(0.7 + 0.3 * beatIn);
      else this.btn.setScale(1 + 0.1 * beatIn);
      this.hint.setAlpha(0.4 + 0.6 * beatIn);
      if (s.auto && !PARAMS.has('notap') && sb >= T.unlockBeat + T.autoTap) this.tap();
    }

    // the cable: the plug slides home between the tap and the beat it lands on
    let gap = GAP;
    let spark = false;
    const fb = sb - this.fireBeat;
    if (this.state === 'fired') {
      gap = fb >= 0 ? 0 : GAP * Phaser.Math.Clamp(-fb / Math.max(0.05, this.fireBeat - this.tapBeat), 0, 1);
      spark = fb >= 0 && fb < 1.5;
      if (fb >= 0 && !this.boomed) this.boom();
      if (fb >= T.boomBeats) this.showEp();
    }
    this.art.t += dt;
    const g = this.artG.clear();
    this.art.soundsystem(g, this.boomed);
    this.art.cable(g, gap, spark, COLORS.silver);
  }

  boom() {
    const s = this.s;
    this.boomed = true;
    s.show.ko(s.beat * 0.5, this.power);
    s.flashWord(TEXTS.boss.words.ko, 600, 5);
    s.setMars('win');
    s.kickEnv = 1;
    s.spike = 1;
    for (let i = 0; i < 3; i++) s.burst(CX + px(-90 + i * 90), this.btn.y, i === 1 ? 0xffffff : COLORS.red, Math.round(12 * this.power), 1.5);
    s.tweens.add({ targets: this.btn, scale: this.reduced ? 1 : 2.4, alpha: 0, duration: 260 });
    if (navigator.vibrate) navigator.vibrate([40, 30, 40, 30, 120]);
  }

  // ---- the EP screen ------------------------------------------------------------------
  showEp() {
    const s = this.s;
    this.state = 'ep';
    const E = TEXTS.boss.ep;
    const result = s.bossResult;
    const tier = rank(result);
    const D = 60; // above everything the level drew
    const ps = (size, color) => ({ fontFamily: FONT_PS, fontSize: px(size) + 'px', color });
    this.btn.destroy();
    this.hint.destroy();
    s.show.koType.forEach((t) => s.tweens.add({ targets: t, alpha: 0, duration: 300 }));

    const bg = s.add.graphics().setDepth(D).setAlpha(0);
    bg.fillStyle(0x060203, 0.94).fillRect(0, 0, W, H);
    s.tweens.add({ targets: bg, alpha: 1, duration: 260 });
    // the city coming back on: fully lit on a high result, partly otherwise
    const cityH = Math.round(LH * 0.24);
    this.city = new StoryScene(s, 'city_on', { y0: 0, h: px(cityH) });
    this.cityG = s.add.graphics().setDepth(D + 1);
    this.cityStop = tier === 'high' ? Infinity : tier === 'mid' ? 1.6 : 0.7; // seconds of lighting up

    // the cover: a photocopied flyer until Gabriel delivers the real one
    const cs = px(132); // drawn at this size, then scaled to the screen
    const big = Phaser.Math.Clamp((LH - 470) / (132 * 1.75), 1, 1.5);
    const coverY = px(cityH + 20 + 66 * (big - 1));
    const cover = s.add.container(CX, coverY - px(LH), []).setDepth(D + 2).setAngle(-5).setScale(big);
    const cg = s.add.graphics();
    cg.fillStyle(COLORS.red, 1).fillRect(-cs / 2 + px(5), -cs / 2 + px(5), cs, cs);
    cg.fillStyle(COLORS.paper, 1).fillRect(-cs / 2, -cs / 2, cs, cs);
    cg.fillStyle(COLORS.red, 0.55);
    for (let j = 0; j < 11; j++) for (let i = 0; i < 11; i++) cg.fillCircle(-cs / 2 + px(6 + i * 12 + (j % 2) * 6), -cs / 2 + px(6 + j * 12), px(0.6 + (j / 11) * 4.2));
    cg.lineStyle(px(2), COLORS.ink, 1).strokeRect(-cs / 2, -cs / 2, cs, cs);
    const type = (y, str, size, color) => s.add.text(0, px(y), str, ps(size, color)).setOrigin(0.5);
    cover.add([cg, type(-40, 'OVER', 22, '#ff2a2a'), type(-39, 'OVER', 22, '#15121a').setX(-px(2)), type(-12, 'DRIVE', 22, '#15121a'), type(18, EP.artist, 7, '#15121a')]);
    cover.add(s.add.text(0, px(46), E.cover, { fontFamily: FONT_VT, fontSize: px(15) + 'px', color: '#15121a' }).setOrigin(0.5));
    s.tweens.add({ targets: cover, y: coverY, duration: 420, ease: 'Back.Out', delay: 150 });

    const titleY = coverY + (cs / 2) * big + px(30);
    const title = s.add.text(CX, titleY, E.title, ps(19, '#ffffff')).setOrigin(0.5).setDepth(D + 2).setAlpha(0);
    title.setShadow(px(3), px(3), '#ff2a2a', 0, false, true);
    s.tweens.add({ targets: title, alpha: 1, delay: 400, duration: 200 });

    // how it went: the Ministry's stamp and the score, if the screen has room
    if (px(LH - 196 - 31) - titleY > px(96)) {
      const sy = (titleY + px(LH - 196 - 31)) / 2 + px(4);
      const st = s.add.text(0, px(1), TEXTS.report.stamps[tier], ps(11, '#ff2a2a')).setOrigin(0.5);
      const sg = s.add.graphics();
      const sw = st.width + px(22);
      sg.lineStyle(px(3), COLORS.red, 1).strokeRect(-sw / 2, -px(15), sw, px(30));
      const stamp = s.add.container(CX, sy - px(10), [sg, st]).setDepth(D + 2).setAngle(-6).setAlpha(0).setScale(2.5);
      s.tweens.add({ targets: stamp, alpha: 0.95, scale: 1, delay: 800, duration: 130, ease: 'Quad.In' });
      const sc = s.add.text(CX, sy + px(24), `${TEXTS.report.score} ${String(result.score).padStart(7, '0')}`, { fontFamily: FONT_VT, fontSize: px(19) + 'px', color: '#c0c0c0' });
      sc.setOrigin(0.5).setDepth(D + 2).setAlpha(0);
      s.tweens.add({ targets: sc, alpha: 1, delay: 900, duration: 200 });
    }

    // ASCOLTA: the one thing this screen is for
    const link = EP.links.listen || EP.links.presave;
    const label = EP.links.listen ? TEXTS.ui.listen : EP.links.presave ? TEXTS.ui.presave : TEXTS.ui.linkSoon;
    const lw = W - px(44);
    const lh = px(62);
    const ly = px(LH - 196);
    const lg = s.add.graphics();
    lg.fillStyle(0x000000, 1).fillRect(-lw / 2 + px(6), -lh / 2 + px(6), lw, lh);
    lg.fillStyle(COLORS.red, 1).fillRect(-lw / 2, -lh / 2, lw, lh);
    lg.fillStyle(0xffffff, 0.25).fillRect(-lw / 2, -lh / 2, lw, px(5));
    lg.lineStyle(px(3), 0x000000, 1).strokeRect(-lw / 2, -lh / 2, lw, lh);
    const mk = (color) => {
      const t = s.add.text(0, px(1), label, ps(15, color)).setOrigin(0.5);
      return t.setScale(Math.min(1, (lw - px(24)) / t.width));
    };
    this.fringe = [mk(CYAN), mk('#7a0d12')];
    this.listen = s.add.container(CX, ly + px(LH), [lg, ...this.fringe, mk('#ffffff')]).setDepth(D + 3);
    this.listen.setSize(lw, lh).setInteractive({ useHandCursor: true });
    this.listen.on('pointerdown', (p, lx, lyy, ev) => {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      s.tweens.add({ targets: this.listen, scale: 0.95, duration: 60, yoyo: true });
      openLink(link, EP.links.listen ? 'listen' : 'presave');
    });
    s.tweens.add({ targets: this.listen, y: ly, duration: 380, ease: 'Back.Out', delay: 550 });
    const sub = `${TEXTS.campaign.release} ${EP.dateLabel}${EP.indicative ? ' (' + TEXTS.campaign.indicative + ')' : ''}`;
    s.add.text(CX, ly + lh / 2 + px(14), sub, { fontFamily: FONT_VT, fontSize: px(17) + 'px', color: '#e9e4dc' }).setOrigin(0.5).setDepth(D + 3);

    // smaller: share, board, and on to the last panels of the story
    const leave = (scene, data) => {
      if (this.left) return;
      this.left = true;
      if (s.track && s.track.fade) s.track.fade(0.3);
      s.cameras.main.fadeOut(300);
      s.time.delayedCall(320, () => s.scene.start(scene, data));
    };
    const bw = (lw - px(10)) / 2;
    const by = px(LH - 112);
    const shareBtn = button(s, CX - bw / 2 - px(5), by, bw, px(30), TEXTS.ui.share, async () => {
      shareBtn.label.setText('...');
      await shareResult(result);
      shareBtn.label.setText(TEXTS.ui.share);
    }, { size: 8, depth: D + 3 });
    button(s, CX + bw / 2 + px(5), by, bw, px(30), TEXTS.ui.board, () => leave('Board', { from: 'End', result }), { size: 8, depth: D + 3 });
    const chapter = `${s.level.id}_${tier}`;
    const end = { scene: 'End', data: result };
    button(s, CX, px(LH - 66), px(150), px(26), E.next + ' >>', () => (TEXTS.story[chapter] ? leave('Story', { id: chapter, next: end }) : leave(end.scene, end.data)), { size: 7, depth: D + 3 });
    track('ep_screen', { rank: tier });
  }

  updateEp(sb, dt) {
    if (this.city.t < this.cityStop) this.city.t += dt;
    this.city.update(this.cityG.clear(), 0);
    // chromatic aberration on ASCOLTA: the fringes breathe with the beat
    const beatIn = 1 - (sb - Math.floor(sb));
    const off = px(1.5) + px(this.reduced ? 0 : 3) * beatIn * beatIn;
    this.fringe[0].setX(-off);
    this.fringe[1].setX(off);
  }

  destroy() {
    if (this.loop) this.loop.kill();
    if (this.art) this.art.destroy();
    if (this.city) this.city.destroy();
  }
}
