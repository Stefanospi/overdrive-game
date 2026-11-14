import Phaser from 'phaser';
import { K, W, H, LH, px, COLORS, FONT_PS, FONT_VT, PARAMS } from '../config.js';
import { registerMars } from '../sprites.js';
import { drawBackdrop, drawLabelStrip, textTexture, buildWindow } from '../ui.js';
import { attachFx } from '../fx.js';
import { TEXTS, EGG, pick } from '../texts.js';
import { settings, reducedFx, calibration } from '../settings.js';
import { EP, track } from '../campaign.js';
import { LEVELS, FIRST_LEVEL, COUNT_IN, buildChart } from '../levels.js';
import { rank } from '../rank.js';
import * as A from '../audio.js';

// Lane rhythm game: notes leave the soundsystem at the top and travel down a
// perspective highway to the hit line. One scene plays any level in levels.js.

// ---- highway geometry ---------------------------------------------------------
// Vertical positions depend on the screen height and are worked out in layout().
const DEPTH = 2; // perspective strength
const LANE_W = 110; // lane width at the hit line, logical px
const S_FAR = 1 / (1 + DEPTH); // scale where notes appear
const CX = W / 2;
const STACK_TOP = 122;

// ---- scoring ----------------------------------------------------------------
const GRADES = [
  { key: 'perfect', win: 0.055, points: 300, od: 2.4 },
  { key: 'good', win: 0.1, points: 200, od: 1.5 },
  { key: 'ok', win: 0.15, points: 100, od: 0.6 },
];
const OK_WIN = GRADES[2].win;
const MISS_OD = -5;
const HOLD_GRACE = 0.3; // beats: releasing this close to the end still counts
const OD_MODE_BEATS = 16;
const LANE_COLORS = [COLORS.red, COLORS.paper, COLORS.red];
const JUDGE_COLORS = { perfect: '#ffffff', good: '#ff2a2a', ok: '#c0c0c0', miss: '#b8121a', broken: '#b8121a' };
const KEYS = { A: 0, S: 1, D: 2, J: 0, K: 1, L: 2, LEFT: 0, DOWN: 1, RIGHT: 2 };

// Tower blocks either side of the stack; their windows are the spectrum.
// `rise` is how far above the base each one reaches on a tall screen.
const TOWERS = [
  { x: 4, w: 22, rise: 138 },
  { x: 28, w: 26, rise: 184, aerial: true },
  { x: 56, w: 20, rise: 106 },
  { x: 314, w: 20, rise: 120 },
  { x: 336, w: 26, rise: 170 },
  { x: 364, w: 22, rise: 94 },
];

function quad(g, x1, y1, x2, y2, x3, y3, x4, y4) {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.lineTo(x3, y3);
  g.lineTo(x4, y4);
  g.closePath();
  g.fillPath();
}

export class Play extends Phaser.Scene {
  constructor() {
    super('Play');
  }

  init(data) {
    this.levelId = (data && data.level) || PARAMS.get('level') || FIRST_LEVEL;
    if (!LEVELS[this.levelId]) this.levelId = FIRST_LEVEL;
  }

  // Splits the screen height between HUD, speaker stack, highway and thumb zone.
  // Short screens (a phone browser with its bars showing) get a smaller stack.
  layout() {
    const t = Phaser.Math.Clamp((LH - 665) / (844 - 665), 0, 1);
    this.hitY = LH - Phaser.Math.Linear(150, 194, t); // hit line
    this.stackScale = Phaser.Math.Linear(0.68, 1, t);
    this.stackBottom = STACK_TOP + 210 * this.stackScale;
    this.span = (this.hitY - this.stackBottom) / (1 - S_FAR); // notes appear right under the stack
    this.horizon = this.hitY - this.span; // vanishing point
    this.sNear = (LH - this.horizon) / this.span; // scale at the bottom edge
  }

  yOf(s) {
    return px(this.horizon + this.span * s);
  }

  create() {
    const L = (this.level = LEVELS[this.levelId]);
    this.beat = 60 / L.bpm;
    const chart = buildChart(L);
    this.notes = chart.notes.map((n) => ({ ...n, st: 'wait', sub: null }));
    this.cues = chart.cues;
    this.endBeat = chart.end;
    this.script = [...(TEXTS.script[L.id] || [])].sort((a, b) => a.bar - b.bar);
    this.layout();

    registerMars(this);
    drawBackdrop(this);
    this.fx = attachFx(this);
    this.cameras.main.fadeIn(300);

    this.buildSideType();
    this.bgG = this.add.graphics().setDepth(-6);
    this.roadG = this.add.graphics().setDepth(-4);
    this.fxG = this.add.graphics().setDepth(-2).setBlendMode(Phaser.BlendModes.ADD);
    this.hudG = this.add.graphics().setDepth(5);
    this.buildHud();
    drawLabelStrip(this, TEXTS.ui.label);

    // ---- state ----
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.counts = { perfect: 0, good: 0, ok: 0, miss: 0 };
    this.od = 0;
    this.odPeak = 0;
    this.odMode = false;
    this.odEnd = 0;
    this.glitched = false;
    this.over = false;
    this.ready = false;
    this.track = null;
    this.inv = { v: 0 };
    this.down = new Array(L.lanes).fill(false);
    this.held = new Array(L.lanes).fill(null);
    this.laneFx = new Array(L.lanes).fill(0);
    this.beam = new Array(L.lanes).fill(0);
    this.parts = [];
    this.rings = [];
    this.tw = new Array(TOWERS.length).fill(0);
    this.kickEnv = 0;
    this.snareEnv = 0;
    this.skankEnv = 0;
    this.hatEnv = 0;
    this.flash = 0;
    this.missEnv = 0;
    this.hitBurst = 0;
    this.spike = 0;
    this.lastBeat = -99;
    this.quietUntil = 0;
    this.shown = { score: -1, od: -1, combo: -1, mult: -1 };
    this.ci = 0; // next cue to schedule as sound
    this.vi = 0; // next cue to show
    this.si = 0; // next scripted line
    this.auto = PARAMS.has('auto');
    this.reduced = reducedFx();
    if (this.reduced) this.cameras.main.shake = () => {};
    this.tutorial = L.n === 1 && !settings.get('tutorialDone', false) && !this.auto;
    this.missRun = 0;
    track('level_start', { level: L.id });
    this.t0 = 0;
    this.lat = 0;

    // ---- input: one lane per third of the screen, multi-touch ----
    this.ptrLane = new Map();
    const laneAt = (p) => Phaser.Math.Clamp(Math.floor(p.x / (W / L.lanes)), 0, L.lanes - 1);
    const lift = (p) => {
      const l = this.ptrLane.get(p.id);
      if (l === undefined) return;
      this.ptrLane.delete(p.id);
      this.release(l);
    };
    this.input.on('pointerdown', (p) => {
      const l = laneAt(p);
      this.ptrLane.set(p.id, l);
      this.press(l);
    });
    this.input.on('pointerup', lift);
    this.input.on('pointerupoutside', lift);
    this.input.on('gameout', () => {
      for (const l of this.ptrLane.values()) this.release(l);
      this.ptrLane.clear();
    });
    for (const [key, l] of Object.entries(KEYS)) {
      this.input.keyboard.on('keydown-' + key, (e) => {
        if (!e.repeat) this.press(l);
      });
      this.input.keyboard.on('keyup-' + key, () => this.release(l));
    }
    this.events.once('shutdown', () => {
      this.stopSubs();
      if (this.track) this.track.stop();
    });

    // ---- start: straight away with the synth, after decoding with a real track ----
    A.getCtx();
    if (L.track) {
      this.loading.setVisible(true);
      A.loadTrack(L.track.url).then(
        (buffer) => this.begin(buffer),
        (err) => {
          console.error('track failed to load', err);
          this.begin(null);
        },
      );
    } else {
      this.begin(null);
    }
  }

  // Sets the clock. The audio context is the only source of time: t0 is the
  // moment, on its clock, when bar 1 starts.
  begin(buffer) {
    if (!this.sys.isActive() || this.ready) return;
    const L = this.level;
    const c = A.getCtx();
    const seek = Number(PARAMS.get('seek')) || 0;
    this.lat = A.latency() + (calibration() + (Number(PARAMS.get('offset')) || 0)) / 1000;
    this.loading.setVisible(false);

    if (buffer) {
      const tr = L.track;
      const when = c.currentTime + 0.25;
      const offset = seek ? Math.max(0, tr.lead + seek * this.beat - 0.5) : 0;
      this.t0 = when - offset + tr.lead;
      this.track = A.playTrack(buffer, when, offset, { fadeIn: tr.fadeIn, fadeOutAt: tr.length - tr.fadeOut, fadeOut: tr.fadeOut });
    } else {
      A.setEcho(this.beat * 0.75);
      this.t0 = c.currentTime + 0.4 + (seek ? -seek : COUNT_IN) * this.beat;
    }
    if (seek) {
      this.notes.forEach((n) => {
        if (n.b < seek) n.st = 'done';
      });
      while (this.ci < this.cues.length && this.cues[this.ci].b < seek) this.ci++;
      this.vi = this.ci;
      while (this.si < this.script.length && this.script[this.si].bar * 4 < seek) this.si++;
    }
    this.ready = true;
    if (!seek) this.showLowerThird();
  }

  // ---- static pieces ---------------------------------------------------------
  buildSideType() {
    const L = this.level;
    const style = { size: 46, stroke: '#ff2a2a', strokeW: 1.5 };
    const k1 = textTexture(this, 'type-overdrive', 'OVERDRIVE ', style);
    const k2 = textTexture(this, 'type-' + L.id, `${L.title}//${L.bpm}BPM `, style);
    const h = this.textures.get(k1).getSourceImage().height;
    const len = px(LH - this.stackBottom);
    const cy = px((this.stackBottom + LH) / 2);
    this.typeL = this.add.tileSprite(px(34), cy, len, h, k1).setAngle(-90).setAlpha(0.22).setDepth(-8);
    this.typeR = this.add.tileSprite(W - px(34), cy, len, h, k2).setAngle(90).setAlpha(0.22).setDepth(-8);
  }

  buildHud() {
    const L = this.level;
    const ps = (size, color) => ({ fontFamily: FONT_PS, fontSize: px(size) + 'px', color });
    const vt = (size, color) => ({ fontFamily: FONT_VT, fontSize: px(size) + 'px', color });
    const hit = this.hitY;

    // MARS.EXE in a small "codec" window
    const win = buildWindow(this, px(78), px(84), 'MARS.EXE', { bar: 14, font: 5 });
    win.setPosition(px(8), px(8)).setDepth(6);
    const screen = this.add.graphics();
    screen.fillStyle(0x1a0507, 1).fillRect(px(3), px(17), px(72), px(64));
    screen.fillStyle(COLORS.red, 0.14);
    for (let y = 19; y < 81; y += 4) screen.fillRect(px(3), px(y), px(72), px(1));
    this.mars = this.add.image(px(3), px(17), 'mars-neutral').setOrigin(0).setScale(K * 2).setCrop(0, 0, 36, 32);
    // title strip shown when the helper takes over the window
    const hbar = this.add.graphics().fillStyle(COLORS.redDark, 1).fillRect(px(2), px(2), px(70), px(12));
    const htxt = this.add.text(px(6), px(4), EGG.name.slice(0, 10) + '.exe', ps(5, '#ffffff'));
    this.helperBar = this.add.container(0, 0, [hbar, htxt]).setVisible(false);
    this.helper = false;
    win.add([screen, this.mars, this.helperBar]);
    // one or two giant words near the speaker stack: the only text during play
    this.wordText = this.add.text(CX, px(this.stackBottom - 34), '', ps(22, '#ffffff')).setOrigin(0.5).setDepth(9).setAlpha(0);
    this.wordText.setShadow(px(4), px(4), '#ff2a2a', 0, false, true);
    this.wordBar = this.add.graphics().setDepth(8.5).setAlpha(0);
    this.buildLowerThird(ps, vt);

    this.add.text(px(96), px(13), `${TEXTS.ui.level}${L.n} // ${L.title}`, ps(7, '#c0c0c0')).setDepth(6);
    this.scoreText = this.add.text(W - px(8), px(9), '', ps(12, '#ffffff')).setOrigin(1, 0).setDepth(6);
    this.odText = this.add.text(px(96), px(63), '', ps(6, '#ff7a7a')).setDepth(6);
    this.add
      .text(px(96 + 5) + px(276) * 0.6, px(60), TEXTS.ui.limit, vt(14, '#c0c0c0'))
      .setOrigin(0.5, 0)
      .setDepth(6);

    // marquee strip
    const t0 = textTexture(this, 'ticker-0', TEXTS.ticker[0], { font: FONT_VT, size: 14, fill: '#ff2a2a' });
    textTexture(this, 'ticker-1', TEXTS.ticker[1], { font: FONT_VT, size: 14, fill: '#ffffff' });
    const th = this.textures.get(t0).getSourceImage().height;
    this.ticker = this.add.tileSprite(0, px(105), W, th, t0).setOrigin(0, 0.5).setDepth(5.5).setAlpha(0.3);

    // combo (left of the highway) and multiplier (right)
    const cy = this.stackBottom + 28;
    this.add.text(px(12), px(cy), TEXTS.ui.combo, ps(6, '#c0c0c0')).setDepth(6);
    this.comboText = this.add.text(px(12), px(cy + 12), '', ps(22, '#ffffff')).setDepth(6);
    this.add.text(W - px(12), px(cy), TEXTS.ui.mult, ps(6, '#c0c0c0')).setOrigin(1, 0).setDepth(6);
    this.multText = this.add.text(W - px(12), px(cy + 12), '', ps(22, '#ff2a2a')).setOrigin(1, 0).setDepth(6);

    // judgements: one text per grade, shown in turn
    this.judgeTexts = {};
    for (const [key, color] of Object.entries(JUDGE_COLORS)) {
      const t = this.add.text(CX, px(hit - 110), TEXTS.ui.grades[key], ps(16, color)).setOrigin(0.5).setDepth(7).setAlpha(0);
      t.setShadow(px(3), px(3), key === 'perfect' ? '#ff2a2a' : '#000000', 0, false, true);
      this.judgeTexts[key] = t;
    }
    this.judgeSub = this.add.text(CX, px(hit - 84), '', vt(20, '#ffffff')).setOrigin(0.5).setDepth(7).setAlpha(0);

    this.countText = this.add.text(CX, px(hit - 180), '', ps(64, '#ffffff')).setOrigin(0.5).setDepth(7).setAlpha(0);
    this.countText.setShadow(px(6), px(6), '#ff2a2a', 0, false, true);
    this.banner = this.add.text(CX, px(hit - 210), TEXTS.ui.root, ps(26, '#ffffff')).setOrigin(0.5).setDepth(30).setAlpha(0);
    this.banner.setShadow(px(5), px(5), '#ff2a2a', 0, false, true);
    this.loading = this.add.text(CX, px(hit - 150), TEXTS.loading, ps(9, '#ffffff')).setOrigin(0.5).setDepth(7).setVisible(false);
    this.tweens.add({ targets: this.loading, alpha: 0.25, duration: 400, yoyo: true, repeat: -1 });
  }

  // ---- time ------------------------------------------------------------------
  songBeat() {
    if (!this.ready) return -99;
    return (A.clock() - this.t0 - this.lat) / this.beat;
  }

  laneX(lane, s) {
    return CX + (lane - (this.level.lanes - 1) / 2) * px(LANE_W) * s;
  }

  // Scale of something `dt` beats away from the hit line (negative = already past).
  sOf(dt) {
    return 1 / (1 + (DEPTH * dt) / this.level.approach);
  }

  // ---- input -----------------------------------------------------------------
  press(l) {
    this.down[l] = true;
    this.laneFx[l] = 1;
    if (this.over || !this.ready) return;
    const sb = this.songBeat();
    let best = null;
    let bestD = Infinity;
    for (const n of this.notes) {
      if (n.b - sb > 2) break;
      if (n.st !== 'wait' || n.lane !== l) continue;
      const d = Math.abs(n.b - sb) * this.beat;
      if (d < bestD) {
        best = n;
        bestD = d;
      }
    }
    if (best && bestD <= OK_WIN) this.hit(best, (sb - best.b) * this.beat);
  }

  release(l) {
    this.down[l] = false;
    const n = this.held[l];
    if (n) this.finishHold(n, this.songBeat() >= n.b + n.len - HOLD_GRACE);
  }

  // ---- scoring ---------------------------------------------------------------
  hit(n, delta) {
    const g = GRADES.find((x) => Math.abs(delta) <= x.win) || GRADES[2];
    this.counts[g.key]++;
    this.missRun = 0;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.addScore(g.points);
    this.addOd(g.od);
    if (n.len > 0) {
      n.st = 'hold';
      this.held[n.lane] = n;
      // with the synth the bassline is yours: it only sounds while you hold
      if (this.level.synth !== false) n.sub = A.startSub(n.root, 2 / this.beat);
    } else {
      n.st = 'done';
    }

    const perfect = g.key === 'perfect';
    const x = this.laneX(n.lane, 1);
    const y = px(this.hitY);
    this.beam[n.lane] = 1;
    this.hitBurst = perfect ? 1 : 0.5;
    this.rings.push({ x, life: 1, color: perfect ? 0xffffff : COLORS.red });
    this.burst(x, y, perfect ? 0xffffff : LANE_COLORS[n.lane], perfect ? 14 : 7);
    if (perfect) this.burst(x, y, COLORS.red, 6, 1.3);
    this.showJudge(g.key, perfect ? '' : delta < 0 ? TEXTS.ui.early : TEXTS.ui.late);
    if (navigator.vibrate) navigator.vibrate(perfect ? 10 : 5);
    this.tweens.killTweensOf(this.comboText);
    this.comboText.setScale(1.3);
    this.tweens.add({ targets: this.comboText, scale: 1, duration: 120 });
    if ([10, 25, 50, 75, 100].includes(this.combo)) this.react('combo', 'win');
  }

  finishHold(n, ok) {
    if (n.sub) n.sub.stop();
    n.sub = null;
    this.held[n.lane] = null;
    if (ok) {
      n.st = 'done';
      this.addScore(150);
      this.addOd(1.5);
      this.beam[n.lane] = 1;
      this.burst(this.laneX(n.lane, 1), px(this.hitY), 0xffffff, 10);
    } else {
      n.st = 'broken';
      this.fail('broken', -3);
    }
  }

  miss(n) {
    n.st = 'miss';
    this.counts.miss++;
    this.fail('miss', MISS_OD);
  }

  fail(key, od) {
    if (this.combo >= 8) this.react('miss', Math.random() < 0.5 ? 'sad' : 'angry');
    this.combo = 0;
    this.addOd(od);
    // four misses in a row: the helper steps in once in a while
    this.missRun = (this.missRun || 0) + 1;
    if (this.missRun >= 4 && this.time.now > (this.nextHelp || 0) && !this.odMode) {
      this.missRun = 0;
      this.nextHelp = this.time.now + 25000;
      this.addOd(12);
      this.time.delayedCall(350, () => !this.over && this.helperSay(pick(TEXTS.helper.rescue), 'wink', 1200));
    }
    this.missEnv = 1;
    this.showJudge(key, '');
    this.cameras.main.shake(90, 0.003);
    if (this.track) this.track.muffle();
  }

  addScore(points) {
    const mult = Math.min(4, 1 + Math.floor(this.combo / 10)) * (this.odMode ? 2 : 1);
    this.score += points * mult;
  }

  addOd(v) {
    if (this.odMode) return;
    const before = this.od;
    this.od = Phaser.Math.Clamp(this.od + v, 0, 100);
    this.odPeak = Math.max(this.odPeak, this.od);
    // crossing the legal limit: the disguise starts to slip
    if (!this.glitched && before < 60 && this.od >= 60) {
      this.glitched = true;
      this.ticker.setTexture('ticker-1');
      this.say(pick(TEXTS.overdrive), 'glitch', 1200);
    }
    if (this.od >= 100) this.startOdMode();
  }

  startOdMode() {
    this.odMode = true;
    this.odEnd = this.songBeat() + OD_MODE_BEATS;
    this.flash = 1;
    this.cameras.main.shake(300, 0.012);
    this.tweens.add({ targets: this.inv, v: this.reduced ? 0 : 1, duration: 160 });
    this.banner.setAlpha(1).setScale(2.2);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 160, ease: 'Back.Out' });
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1100, duration: 300 });
    this.say(pick(TEXTS.overdriveMode), 'shout', 1000);
    this.time.delayedCall(1700, () => {
      if (this.odMode && !this.over) this.helperSay(pick(TEXTS.helper.root), 'happy', 1200);
    });
  }

  // ---- MARS.EXE --------------------------------------------------------------
  setMars(expr) {
    this.mars.setTexture('mars-' + expr).setCrop(0, 0, 36, 32);
  }

  // The helper (Easter egg) borrows the Mars window for a moment.
  helperSay(word, expr, ms) {
    this.helper = true;
    this.helperBar.setVisible(true);
    this.mars.setTexture('girl-' + expr).setCrop(0, 0, 36, 32);
    this.flashWord(word, ms);
    this.quietUntil = this.time.now + ms + 1500;
    if (this.marsTimer) this.marsTimer.remove(false);
    this.marsTimer = this.time.delayedCall(ms, () => {
      this.setMars('neutral');
      this.endHelper();
    });
    if (navigator.vibrate) navigator.vibrate([10, 40, 10]);
  }

  endHelper() {
    this.helper = false;
    this.helperBar.setVisible(false);
  }

  // Giant word with a dark strip behind it: readable at a glance, never a sentence.
  flashWord(word, ms = 1100) {
    const t = this.wordText;
    this.tweens.killTweensOf([t, this.wordBar]);
    t.setText(word).setAlpha(1).setScale(1.5);
    const w = t.width + px(24);
    const h = t.height + px(14);
    this.wordBar.clear().fillStyle(0x000000, 0.78).fillRect(CX - w / 2, t.y - h / 2, w, h);
    this.wordBar.fillStyle(COLORS.red, 1).fillRect(CX - w / 2, t.y + h / 2 - px(3), w, px(3));
    this.wordBar.setAlpha(1);
    this.tweens.add({ targets: t, scale: 1, duration: 120, ease: 'Back.Out' });
    this.tweens.add({ targets: [t, this.wordBar], alpha: 0, delay: ms, duration: 260 });
  }

  say(word, expr, ms = 1100) {
    this.endHelper();
    this.setMars(expr);
    this.flashWord(word, ms);
    this.quietUntil = this.time.now + ms + 1500;
    if (this.marsTimer) this.marsTimer.remove(false);
    this.marsTimer = this.time.delayedCall(ms, () => this.setMars('neutral'));
  }

  // Short optional reaction: dropped if something was shown recently.
  react(key, expr) {
    if (this.time.now < this.quietUntil) return;
    this.say(pick(TEXTS.react[key]), expr, 900);
    this.quietUntil = this.time.now + 6000;
  }

  // Radio-style credit at the start: who is playing, and what to listen to.
  buildLowerThird(ps, vt) {
    const L = this.level;
    const y = px(this.hitY - 150);
    const x = px(14);
    const w = W - px(28);
    const h = px(64);
    const c = this.add.container(0, y).setDepth(9).setAlpha(0);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.82).fillRect(x, 0, w, h);
    g.fillStyle(COLORS.red, 1).fillRect(x, 0, px(5), h);
    c.add(g);
    c.add(this.add.text(x + px(14), px(7), TEXTS.ui.nowPlaying, vt(15, '#ff7a7a')));
    c.add(this.add.text(x + px(14), px(21), EP.artist + ' - ' + L.title, ps(10, '#ffffff')));
    c.add(this.add.text(x + px(14), px(42), `${TEXTS.campaign.epLine} // ${EP.dateLabel}`, vt(17, '#c0c0c0')));
    this.lowerThird = c;
  }

  showLowerThird() {
    const c = this.lowerThird;
    c.setAlpha(1).setX(-W);
    this.tweens.add({ targets: c, x: 0, duration: 260, ease: 'Cubic.Out' });
    this.tweens.add({ targets: c, alpha: 0, delay: 3000, duration: 400 });
  }

  spawnPopup() {
    const w = px(176);
    const h = px(104);
    const win = buildWindow(this, w, h, 'AVVISO.exe');
    const body = this.add.text(px(8), px(34), pick(TEXTS.popups), {
      fontFamily: FONT_VT,
      fontSize: px(19) + 'px',
      color: '#000000',
      wordWrap: { width: w - px(16) },
      lineSpacing: -px(3),
    });
    win.add(body);
    const maxY = Math.max(130, this.stackBottom - 122);
    win.setPosition(Phaser.Math.Between(px(14), W - w - px(24)), Phaser.Math.Between(px(126), px(maxY)));
    win.setRotation(Phaser.Math.FloatBetween(-0.06, 0.06)).setDepth(8).setScale(0.6);
    this.tweens.add({ targets: win, scale: 1, duration: 110, ease: 'Back.Out' });
    this.tweens.add({ targets: win, alpha: 0, delay: 2200, duration: 400, onComplete: () => win.destroy() });
  }

  // ---- feedback --------------------------------------------------------------
  showJudge(key, sub) {
    const y = this.hitY - 110;
    for (const [k, t] of Object.entries(this.judgeTexts)) {
      this.tweens.killTweensOf(t);
      t.setAlpha(k === key ? 1 : 0);
    }
    const t = this.judgeTexts[key];
    t.setScale(1.5).setY(px(y));
    this.tweens.add({ targets: t, scale: 1, duration: 90, ease: 'Back.Out' });
    this.tweens.add({ targets: t, alpha: 0, y: px(y - 18), delay: 260, duration: 200 });
    this.tweens.killTweensOf(this.judgeSub);
    this.judgeSub.setText(sub).setAlpha(sub ? 1 : 0);
    if (sub) this.tweens.add({ targets: this.judgeSub, alpha: 0, delay: 260, duration: 200 });
  }

  showCount(n) {
    const t = this.countText;
    this.tweens.killTweensOf(t);
    t.setText(String(n)).setAlpha(1).setScale(1.6);
    this.tweens.add({ targets: t, scale: 1, duration: 110, ease: 'Back.Out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 220, duration: 160 });
  }

  burst(x, y, color, n, power = 1) {
    for (let i = 0; i < n && this.parts.length < 260; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const v = px(140 + Math.random() * 320) * power;
      const life = 0.3 + Math.random() * 0.4;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, size: px(2 + Math.floor(Math.random() * 3)), color });
    }
  }

  stopSubs() {
    for (const n of this.notes) {
      if (n.sub) n.sub.stop();
      n.sub = null;
    }
  }

  // ---- cues: sound scheduling and what they trigger on screen ----------------
  playCue(ev, t) {
    if (this.level.synth === false) return; // the track is the music
    switch (ev.type) {
      case 'kick': A.kick(t, 0.95); break;
      case 'snare': A.snare(t, ev.gain); break;
      case 'skank': A.skank(t, ev.chord); break;
      case 'hat': A.hat(t, ev.gain); break;
      case 'riser': A.riser(t, ev.len * this.beat); break;
      case 'drop': A.dropHit(t); break;
      case 'siren': A.siren(t, ev.len * this.beat); break;
      case 'count': A.tick(t, ev.n === 1 ? 1600 : 1200); break;
    }
  }

  showCue(ev) {
    switch (ev.type) {
      case 'kick': this.kickEnv = 1; break;
      case 'snare': this.snareEnv = 1; break;
      case 'skank': this.skankEnv = 1; break;
      case 'hat': this.hatEnv = Math.max(this.hatEnv, ev.gain * 6); break;
      case 'count': this.showCount(ev.n); break;
      case 'drop':
        this.kickEnv = 1;
        this.flash = 1;
        this.cameras.main.shake(260, 0.012);
        break;
    }
  }

  onBeat(bi) {
    if (this.over || bi < 0) return;
    if (this.od >= 60 && Math.random() < 0.3) {
      this.spike = 0.5;
      if (this.time.now > this.quietUntil - 1500) {
        this.setMars('glitch');
        this.time.delayedCall(140, () => {
          if (this.time.now > this.quietUntil - 1500) this.setMars('neutral');
        });
      }
    }
    if (bi % 8 === 4 && this.od >= 30 && Math.random() < 0.5) this.spawnPopup();
  }

  // First run only: a ring and one word on the lane of each of the first notes.
  drawTutorial(sb) {
    if (!this.tutG) {
      this.tutG = this.add.graphics().setDepth(9);
      this.tutText = this.add
        .text(0, 0, '', { fontFamily: FONT_PS, fontSize: px(11) + 'px', color: '#ffffff' })
        .setOrigin(0.5)
        .setDepth(9.1);
    }
    const g = this.tutG;
    g.clear();
    this.tutText.setVisible(false);
    if (!this.tutorial || this.over || !this.ready) return;
    const idx = this.notes.findIndex((n) => n.st === 'wait');
    if (idx < 0 || idx >= 10) return;
    const n = this.notes[idx];
    if (n.b - sb > 1.6) return;
    const x = this.laneX(n.lane, 1);
    const y = px(this.hitY);
    const pulse = 1 + 0.18 * Math.sin(this.time.now / 90);
    g.lineStyle(px(3), 0xffffff, 0.9).strokeCircle(x, y, px(38) * pulse);
    g.fillStyle(0xffffff, 0.9).fillTriangle(x, y + px(46), x - px(10), y + px(62), x + px(10), y + px(62));
    this.tutText.setText(n.len > 0 ? TEXTS.ui.hold : TEXTS.ui.tap).setPosition(x, y + px(76)).setVisible(true);
  }

  finishLevel() {
    this.over = true;
    this.stopSubs();
    this.cameras.main.fadeOut(500);
    const result = {
      level: this.level.id,
      score: this.score,
      maxCombo: this.maxCombo,
      counts: this.counts,
      total: this.notes.length,
      odPeak: this.odPeak,
      auto: this.auto,
    };
    if (!this.auto) settings.set('tutorialDone', true);
    track('level_complete', { level: this.level.id, rank: rank(result) });
    // the story reacts to how it went, then hands over to the report
    const chapter = `${this.level.id}_${rank(result)}`;
    const next = TEXTS.story[chapter]
      ? ['Story', { id: chapter, next: { scene: 'End', data: result } }]
      : ['End', result];
    this.time.delayedCall(520, () => this.scene.start(...next));
  }

  // ---- frame loop ------------------------------------------------------------
  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    const now = A.clock();
    const sb = this.songBeat();
    const L = this.level;

    if (this.ready) {
      // schedule sounds a little ahead; drop anything already in the past
      while (this.ci < this.cues.length && this.t0 + this.cues[this.ci].b * this.beat < now + 0.25) {
        const ev = this.cues[this.ci++];
        const t = this.t0 + ev.b * this.beat;
        if (t >= now - 0.02) this.playCue(ev, Math.max(t, now));
      }
      while (this.vi < this.cues.length && this.cues[this.vi].b <= sb) this.showCue(this.cues[this.vi++]);
      while (this.si < this.script.length && this.script[this.si].bar * 4 <= sb) {
        const s = this.script[this.si++];
        this.say(s.word, s.expr, 1100);
      }
      const bi = Math.floor(sb);
      if (bi !== this.lastBeat) {
        this.lastBeat = bi;
        this.onBeat(bi);
      }
    }

    // notes that resolve on their own
    for (const n of this.notes) {
      if (n.b - sb > 1) break;
      if (n.st === 'wait') {
        if (this.auto && sb >= n.b) {
          this.laneFx[n.lane] = 1;
          this.hit(n, 0);
        } else if ((sb - n.b) * this.beat > OK_WIN) this.miss(n);
      } else if (n.st === 'hold') {
        if (sb >= n.b + n.len) this.finishHold(n, true);
        else {
          this.score += Math.round(delta * 0.1) * (this.odMode ? 2 : 1);
          if (Math.random() < 0.5) this.burst(this.laneX(n.lane, 1), px(this.hitY), COLORS.red, 1, 0.7);
        }
      }
    }
    if (this.odMode && sb >= this.odEnd) {
      this.odMode = false;
      this.od = 55;
      this.tweens.add({ targets: this.inv, v: 0, duration: 400 });
    }
    if (!this.over && sb >= this.endBeat) this.finishLevel();

    // envelopes
    const fall = (v, rate) => Math.max(0, v - dt * rate);
    this.kickEnv = fall(this.kickEnv, 4.5);
    this.snareEnv = fall(this.snareEnv, 5);
    this.skankEnv = fall(this.skankEnv, 6);
    this.hatEnv = fall(this.hatEnv, 9);
    this.flash = fall(this.flash, 2.6);
    this.missEnv = fall(this.missEnv, 4);
    this.hitBurst = fall(this.hitBurst, 7);
    this.spike = fall(this.spike, 3);
    for (let l = 0; l < L.lanes; l++) {
      this.laneFx[l] = this.down[l] ? 1 : fall(this.laneFx[l], 8);
      this.beam[l] = this.held[l] ? 0.7 : fall(this.beam[l], 5);
    }

    const od = this.od / 100;
    const bands = A.levels();
    // a real track has no kick cue on every kick: let its low end drive the pump
    const bass = L.track ? Math.max(this.kickEnv, Math.min(1, bands[0] * 1.3)) : this.kickEnv;
    if (this.fx) {
      const soft = this.reduced ? 0.25 : 1; // reduced effects: gentler glitch, no strobing
      this.fx.ab = (0.2 + od * 0.6 + this.hitBurst * 0.4 + this.flash * 3) * soft;
      this.fx.glitch = Math.min(1, this.missEnv * 0.7 + this.spike + (this.odMode ? 0.12 : 0)) * soft;
      this.fx.pump = (L.track ? bass * 0.7 : this.kickEnv) * (0.6 + od * 0.8) * soft;
      this.fx.invert = this.reduced ? 0 : this.inv.v;
      this.fx.grain = 0.05 + od * 0.07;
    }
    const speed = (0.03 + od * 0.09) * delta * K;
    this.typeL.tilePositionX += speed;
    this.typeR.tilePositionX += speed;
    this.ticker.tilePositionX += 0.05 * delta * K;

    this.drawTutorial(sb);
    this.drawStage(sb, dt, bands, bass);
    this.drawRoad(sb);
    this.drawFx(dt);
    this.drawHud(time);
  }

  // Towers (spectrum in the windows) and the speaker stack the notes come from.
  drawStage(sb, dt, bands, bassLevel) {
    const g = this.bgG;
    g.clear();
    const fake = [this.kickEnv, this.kickEnv * 0.7, this.snareEnv, this.skankEnv, this.hatEnv, this.hatEnv * 0.7];
    const phase = sb - Math.floor(sb);
    const sc = this.stackScale;
    const base = this.stackBottom + 4;

    TOWERS.forEach((tw, i) => {
      const target = this.odMode ? 0.7 + Math.random() * 0.3 : Math.min(1, Math.max(bands[i] * 1.5, fake[i] * 0.8));
      this.tw[i] += (target - this.tw[i]) * Math.min(1, dt * 14);
      const h = Math.round(tw.rise * sc);
      const top = base - h;
      g.fillStyle(0x12070a, 1).fillRect(px(tw.x), px(top), px(tw.w), px(h));
      g.lineStyle(px(1), 0x4a1015, 1).strokeRect(px(tw.x), px(top), px(tw.w), px(h));
      const cols = Math.floor((tw.w - 4) / 6);
      const rows = Math.floor((h - 6) / 8);
      const lit = Math.round(this.tw[i] * rows);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const home = (i * 31 + r * 17 + c * 7) % 11 === 0; // someone is in
          const on = rows - r <= lit;
          g.fillStyle(on ? COLORS.red : home ? COLORS.paper : COLORS.redDeep, on || home ? 1 : 0.9);
          g.fillRect(px(tw.x + 4 + c * 6), px(top + 5 + r * 8), px(3), px(4));
        }
      }
      if (tw.aerial) {
        // pirate radio aerial: blinking light, waves on every beat
        const ax = px(tw.x + tw.w / 2);
        const ay = px(top - 24);
        g.lineStyle(px(1), COLORS.silver, 0.8).lineBetween(ax, px(top), ax, ay);
        g.fillStyle(COLORS.red, phase < 0.3 ? 1 : 0.25).fillRect(ax - px(2), ay - px(2), px(4), px(4));
        for (let k = 0; k < 2; k++) {
          const r = px(6 + (phase + k) * 9);
          g.lineStyle(px(1), COLORS.red, Math.max(0, 0.7 - (phase + k) * 0.35));
          g.beginPath();
          g.arc(ax, ay, r, Phaser.Math.DegToRad(205), Phaser.Math.DegToRad(335));
          g.strokePath();
        }
      }
    });

    // speaker stack, scaled around the centre line
    const u = (n) => px(n * sc);
    const w = u(230);
    const x0 = CX - w / 2;
    const y0 = px(STACK_TOP);
    const holding = this.held.some(Boolean);
    const bass = Math.max(bassLevel, holding ? 0.45 + 0.25 * Math.sin(sb * Math.PI * 4) : 0);
    const mid = Math.max(this.snareEnv, this.skankEnv, this.level.track ? Math.min(1, bands[3] * 1.4) : 0);
    const top = Math.max(Math.min(1, this.hatEnv), this.level.track ? Math.min(1, bands[5] * 2.2) : 0);
    const box = (x, y, bw, bh) => {
      g.fillStyle(COLORS.box, 1).fillRect(x, y, bw, bh);
      g.lineStyle(px(2), COLORS.redDark, 1).strokeRect(x + px(1), y + px(1), bw - px(2), bh - px(2));
      g.fillStyle(COLORS.silver, 0.5);
      g.fillRect(x + px(4), y + px(4), px(2), px(2)).fillRect(x + bw - px(6), y + px(4), px(2), px(2));
      g.fillRect(x + px(4), y + bh - px(6), px(2), px(2)).fillRect(x + bw - px(6), y + bh - px(6), px(2), px(2));
    };
    const cone = (cx, cy, r, env) => {
      const rr = r * (1 + env * 0.06);
      g.fillStyle(0x1a0709, 1).fillCircle(cx, cy, rr);
      g.lineStyle(px(2), COLORS.redDark, 1).strokeCircle(cx, cy, rr);
      g.lineStyle(px(1), COLORS.red, 0.35 + env * 0.5).strokeCircle(cx, cy, r * 0.72 * (1 + env * 0.1));
      g.fillStyle(COLORS.red, 0.25 + env * 0.75).fillCircle(cx, cy, r * 0.36 * (1 + env * 0.35));
      if (env > 0.6) g.fillStyle(0xffffff, env).fillCircle(cx, cy, r * 0.14);
    };
    for (let i = 0; i < 3; i++) {
      const bx = x0 + (i * w) / 3;
      box(bx, y0, w / 3, u(40));
      g.fillStyle(COLORS.red, 0.15 + top * 0.85).fillRect(bx + u(12), y0 + u(15), w / 3 - u(24), u(10));
    }
    for (let i = 0; i < 4; i++) {
      const bx = x0 + (i * w) / 4;
      box(bx, y0 + u(42), w / 4, u(60));
      cone(bx + w / 8, y0 + u(72), u(20), mid);
    }
    for (let i = 0; i < 2; i++) {
      const bx = x0 + (i * w) / 2;
      box(bx, y0 + u(104), w / 2, u(106));
      cone(bx + w / 4, y0 + u(152), u(40), bass);
    }
    // the slot the notes come out of
    const slotY = px(this.stackBottom - 12);
    g.fillStyle(0x000000, 1).fillRect(CX - px(58), slotY, px(116), px(12));
    g.fillStyle(COLORS.red, 0.5 + bass * 0.5).fillRect(CX - px(58), slotY, px(116), px(2));
  }

  drawRoad(sb) {
    const g = this.roadG;
    g.clear();
    const L = this.level;
    const n = L.lanes;
    const ap = L.approach;
    const half = (px(LANE_W) * n) / 2;
    const sN = this.sNear;
    const hit = px(this.hitY);
    const yF = this.yOf(S_FAR);
    const yN = this.yOf(sN);
    const edge = (k, s) => CX + (k - n / 2) * px(LANE_W) * s;

    g.fillStyle(0x0a0305, 0.93);
    quad(g, edge(0, S_FAR), yF, edge(n, S_FAR), yF, edge(n, sN), yN, edge(0, sN), yN);
    for (let l = 0; l < n; l++) {
      if (this.laneFx[l] <= 0) continue;
      g.fillStyle(COLORS.red, 0.14 * this.laneFx[l]);
      quad(g, edge(l, S_FAR), yF, edge(l + 1, S_FAR), yF, edge(l + 1, sN), yN, edge(l, sN), yN);
    }

    // beat lines travel with the notes; pylons mark them along the edges
    const past = (ap * (1 / sN - 1)) / DEPTH; // beats past the line at the bottom edge (negative)
    if (this.ready) {
      for (let b = Math.ceil(sb + past); b <= sb + ap; b++) {
        const s = this.sOf(b - sb);
        const y = this.yOf(s);
        const bar = ((b % 4) + 4) % 4 === 0;
        const fade = Phaser.Math.Clamp((1 - (b - sb) / ap) / 0.15, 0, 1);
        g.lineStyle(px(bar ? 2 : 1), COLORS.red, (bar ? 0.5 : 0.2) * fade);
        g.lineBetween(CX - half * s, y, CX + half * s, y);
        const ex = (half + px(12)) * s;
        const ph = px(bar ? 46 : 22) * s;
        g.lineStyle(px(2), COLORS.red, 0.55 * fade);
        g.lineBetween(CX - ex, y, CX - ex, y - ph).lineBetween(CX + ex, y, CX + ex, y - ph);
      }
    }
    for (let k = 0; k <= n; k++) {
      const outer = k === 0 || k === n;
      g.lineStyle(px(outer ? 2 : 1), COLORS.red, outer ? 0.9 : 0.22);
      g.lineBetween(edge(k, S_FAR), yF, edge(k, sN), yN);
    }

    // hit line and receptors
    const pulse = this.ready ? 1 - (sb - Math.floor(sb)) : 0;
    g.fillStyle(COLORS.red, 0.2 + 0.25 * pulse).fillRect(CX - half, hit - px(5), half * 2, px(10));
    g.fillStyle(0xffffff, 0.9).fillRect(CX - half, hit - px(1), half * 2, px(2));
    for (let l = 0; l < n; l++) {
      const x = this.laneX(l, 1);
      const w = px(LANE_W * 0.8);
      const h = px(30);
      const on = this.laneFx[l];
      if (on > 0) g.fillStyle(COLORS.red, 0.4 * on).fillRect(x - w / 2, hit - h / 2, w, h);
      g.fillStyle(on > 0.5 ? 0xffffff : COLORS.silver, 0.6 + 0.4 * on);
      const c = px(10);
      const t = px(3);
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          const cx = x + (sx * w) / 2;
          const cy = hit + (sy * h) / 2;
          g.fillRect(sx < 0 ? cx : cx - c, sy < 0 ? cy : cy - t, c, t);
          g.fillRect(sx < 0 ? cx : cx - t, sy < 0 ? cy : cy - c, t, c);
        }
      }
    }

    // notes, far to near
    const gone = past * 1.25; // a little below the bottom edge
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const nt = this.notes[i];
      if (nt.st === 'done' || nt.st === 'broken') continue;
      const dt = nt.b - sb;
      if (dt > ap || dt + nt.len < gone) continue;
      const dead = nt.st === 'miss';
      const holding = nt.st === 'hold';
      const hd = holding ? 0 : Math.max(dt, gone);
      const s = this.sOf(hd);
      const x = this.laneX(nt.lane, s);
      const y = this.yOf(s);
      const fade = Phaser.Math.Clamp((1 - dt / ap) / 0.12, 0, 1);

      if (nt.len > 0) {
        // hold body: a strip of tape from the head back to the tail
        const td = Math.max(hd, Math.min(dt + nt.len, ap));
        const st = this.sOf(td);
        const xt = this.laneX(nt.lane, st);
        const yt = this.yOf(st);
        const bw = px(LANE_W * 0.34);
        const hot = holding && Math.floor(sb * 8) % 2 === 0;
        g.fillStyle(dead ? 0x4a1216 : hot ? 0xffffff : COLORS.red, (dead ? 0.5 : holding ? 0.9 : 0.6) * fade);
        quad(g, xt - (bw * st) / 2, yt, xt + (bw * st) / 2, yt, x + (bw * s) / 2, y, x - (bw * s) / 2, y);
        for (let q = nt.b + 0.25; q < nt.b + nt.len; q += 0.25) {
          const qd = q - sb;
          if (qd <= hd || qd > ap) continue;
          const qs = this.sOf(qd);
          const qx = this.laneX(nt.lane, qs);
          g.fillStyle(0x000000, 0.55 * fade).fillRect(qx - (bw * qs) / 2, this.yOf(qs), bw * qs, Math.max(px(1), px(3) * qs));
        }
        g.fillStyle(dead ? 0x4a1216 : COLORS.paper, fade).fillRect(xt - (bw * st) / 2, yt - px(2) * st, bw * st, px(4) * st);
      }

      const w = px(LANE_W * 0.72) * s;
      const h = px(18) * s;
      const col = dead ? 0x4a1216 : holding ? 0xffffff : LANE_COLORS[nt.lane % LANE_COLORS.length];
      g.fillStyle(0x000000, 0.6 * fade).fillRect(x - w / 2 + px(3) * s, y - h / 2 + px(3) * s, w, h);
      g.fillStyle(col, (dead ? 0.6 : 1) * fade).fillRect(x - w / 2, y - h / 2, w, h);
      if (!dead) {
        g.fillStyle(0xffffff, 0.85 * fade).fillRect(x - w / 2, y - h / 2, w, h * 0.22);
        g.fillStyle(0x000000, 0.35 * fade).fillRect(x - w / 2, y + h * 0.28, w, h * 0.22);
        g.fillStyle(nt.len > 0 ? COLORS.redDark : COLORS.bg, fade).fillRect(x - h * 0.3, y - h * 0.12, h * 0.6, h * 0.3);
      }
    }
  }

  // Additive layer: glow, beams, rings, sparks, flashes.
  drawFx(dt) {
    const g = this.fxG;
    g.clear();
    const n = this.level.lanes;
    const hit = px(this.hitY);
    const yF = this.yOf(S_FAR);
    const yN = this.yOf(this.sNear);
    const edge = (k, s) => CX + (k - n / 2) * px(LANE_W) * s;

    g.lineStyle(px(7), COLORS.red, 0.12 + this.kickEnv * 0.22);
    g.lineBetween(edge(0, S_FAR), yF, edge(0, this.sNear), yN).lineBetween(edge(n, S_FAR), yF, edge(n, this.sNear), yN);

    for (let l = 0; l < n; l++) {
      if (this.beam[l] <= 0) continue;
      g.fillStyle(LANE_COLORS[l], 0.3 * this.beam[l]);
      quad(g, edge(l, S_FAR), yF, edge(l + 1, S_FAR), yF, edge(l + 1, 1), hit, edge(l, 1), hit);
    }

    this.rings = this.rings.filter((r) => (r.life -= dt * 4) > 0);
    for (const r of this.rings) {
      const grow = 1 + (1 - r.life) * 0.9;
      const w = px(LANE_W * 0.8) * grow;
      const h = px(30) * grow;
      g.lineStyle(px(3), r.color, r.life).strokeRect(r.x - w / 2, hit - h / 2, w, h);
    }

    this.parts = this.parts.filter((p) => (p.life -= dt) > 0);
    for (const p of this.parts) {
      p.vy += px(900) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      g.fillStyle(p.color, p.life / p.max).fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }

    if (this.flash > 0) g.fillStyle(0xffffff, this.flash * (this.reduced ? 0.1 : 0.5)).fillRect(0, 0, W, H);
  }

  drawHud(time) {
    const g = this.hudG;
    g.clear();
    // marquee band
    g.fillStyle(0x000000, 1).fillRect(0, px(96), W, px(18));
    g.fillStyle(COLORS.redDark, 1).fillRect(0, px(96), W, px(1)).fillRect(0, px(113), W, px(1));

    // overdrive bar: sunken Y2K well, LED segments, legal limit marker at 60%
    const x = px(96);
    const y = px(32);
    const w = px(286);
    const h = px(24);
    g.fillStyle(0x000000, 1).fillRect(x, y, w, h);
    g.fillStyle(COLORS.grey, 1).fillRect(x, y, w, px(2)).fillRect(x, y, px(2), h);
    g.fillStyle(COLORS.silver, 1).fillRect(x, y + h - px(2), w, px(2)).fillRect(x + w - px(2), y, px(2), h);
    const segs = 23;
    const lit = Math.round((this.od / 100) * segs);
    const blink = Math.floor(time / 90) % 2 === 0;
    for (let i = 0; i < segs; i++) {
      const hot = i >= 14;
      const color = i >= lit ? COLORS.redDeep : hot ? (blink ? 0xffffff : COLORS.redSoft) : COLORS.red;
      g.fillStyle(color, 1).fillRect(x + px(5) + i * px(12), y + px(5), px(10), h - px(10));
    }
    g.fillStyle(COLORS.silver, 1).fillRect(x + px(5) + px(276) * 0.6 - px(2), y - px(3), px(2), h + px(6));

    const s = this.shown;
    if (s.score !== this.score) this.scoreText.setText(String((s.score = this.score)).padStart(7, '0'));
    const odInt = Math.round(this.od);
    if (s.od !== odInt) this.odText.setText(`${TEXTS.ui.overdrive} ${String((s.od = odInt)).padStart(3, '0')}%`);
    if (s.combo !== this.combo) this.comboText.setText(String((s.combo = this.combo)));
    const mult = Math.min(4, 1 + Math.floor(this.combo / 10)) * (this.odMode ? 2 : 1);
    if (s.mult !== mult) this.multText.setText('x' + (s.mult = mult));
  }
}
