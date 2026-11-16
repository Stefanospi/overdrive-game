import Phaser from 'phaser';
import { K, W, H, LH, px, COLORS, FONT_PS, FONT_VT, PARAMS } from '../config.js';
import { registerMars } from '../sprites.js';
import { drawBackdrop, drawLabelStrip, textTexture, buildWindow } from '../ui.js';
import { attachFx } from '../fx.js';
import { TEXTS, EGG, FORGER, pick } from '../texts.js';
import { settings, reducedFx, calibration } from '../settings.js';
import { EP, track } from '../campaign.js';
import { LEVELS, FIRST_LEVEL, COUNT_IN, buildChart } from '../levels.js';
import { rank } from '../rank.js';
import * as A from '../audio.js';
import { BOSS_TUNING } from '../bossTuning.js';
import { BossShow, GOLD } from '../bossShow.js';
import { BossFinale } from '../bossFinale.js';

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
const REWIND_PRE = 2; // beats of run-up before the first replayed note
const REWIND_PAUSE = 0.35; // seconds of silence before the track restarts
const REWIND_ANIM = 1.2; // seconds the tape takes to wind back
const LANE_COLORS = [COLORS.red, COLORS.paper, COLORS.red];
const GRADE_WEIGHT = BOSS_TUNING.grade;
// boss damage: x0.9 with no combo, x2 from combo 40 (numbers in bossTuning.js)
const COMBO_DMG = (combo) =>
  BOSS_TUNING.comboMin + (Math.min(combo, BOSS_TUNING.comboFull) / BOSS_TUNING.comboFull) * (BOSS_TUNING.comboMax - BOSS_TUNING.comboMin);
const CENSOR_S = 0.55; // a censored lane hides everything farther than this scale (about 1.2 beats out)
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
    this.sFar = S_FAR;
  }

  // x of the line between lane k - 1 and lane k, at scale s
  laneEdge(k, s) {
    return CX + (k - this.level.lanes / 2) * px(LANE_W) * s;
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
    // DECRETO: striped notes you must not tap (boss phase 2), kept apart from the real notes
    this.decrees = ((L.boss && L.boss.decrees) || []).map((d) => ({ b: d.bar * 4 + d.step / 4, lane: d.lane, st: 'wait', pts: 0 })).sort((a, b) => a.b - b.b);
    this.script = [...(TEXTS.script[L.id] || [])].sort((a, b) => a.bar - b.bar);
    this.layout();

    registerMars(this);
    drawBackdrop(this);
    this.fx = attachFx(this);
    this.cameras.main.fadeIn(300);

    this.buildSideType();
    this.bgG = this.add.graphics().setDepth(-6);
    this.roadG = this.add.graphics().setDepth(-4);
    this.censorG = this.add.graphics().setDepth(-3);
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
    this.shieldUntil = 0;
    this.forgeUntil = 0;
    this.forgeDone = false;
    this.autoRewindDone = false;
    this.rootDone = false;
    this.boss = L.boss ? this.initBoss() : null;
    this.buildBossHud();
    this.show = this.boss ? new BossShow(this) : null;
    // the stun zoom grows from near the top, so the HUD stays on screen
    if (this.show) this.cameras.main.setOrigin(0.5, 0.08);
    this.finale = this.boss ? new BossFinale(this) : null; // ESEGUI and the EP screen
    this.bossResult = null;
    this.badge = null;
    this.giftDone = false;
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
      if (this.hitBadge(p)) {
        this.useBackup(); // a tap on the power button is not a lane press
        return;
      }
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
    this.input.keyboard.on('keydown-SPACE', () => this.useBackup());
    for (const [key, l] of Object.entries(KEYS)) {
      this.input.keyboard.on('keydown-' + key, (e) => {
        if (!e.repeat) this.press(l);
      });
      this.input.keyboard.on('keyup-' + key, () => this.release(l));
    }
    this.events.once('shutdown', () => {
      if (this.show) this.show.destroy();
      if (this.finale) this.finale.destroy();
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
    // ?finale jumps to just before the ESEGUI charge of the boss
    const seek = Number(PARAMS.get('seek')) || (this.finale && PARAMS.has('finale') ? BOSS_TUNING.chargeBeat - 2 : 0);
    this.lat = A.latency() + (calibration() + (Number(PARAMS.get('offset')) || 0)) / 1000;
    this.loading.setVisible(false);

    this.buffer = buffer;
    // build the reversed copy for the rewind now, while nothing else is happening
    if (buffer) this.time.delayedCall(900, () => A.prepareRewind(buffer));
    if (buffer) {
      const tr = L.track;
      const when = c.currentTime + 0.25;
      const offset = seek ? Math.max(0, tr.lead + seek * this.beat - 0.5) : 0;
      this.t0 = when - offset + tr.lead;
      this.track = A.playTrack(buffer, when, offset, { fadeIn: tr.fadeIn, ...this.trackEnd() });
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

  // How the clip ends: a fade-out, or (boss) a clean cut where the finale takes over.
  trackEnd() {
    const tr = this.level.track;
    if (this.finale) return { stopAt: tr.lead + BOSS_TUNING.unlockBeat * this.beat };
    return { fadeOutAt: tr.length - tr.fadeOut, fadeOut: tr.fadeOut };
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
    const htxt = this.add.text(px(6), px(4), EGG.name, ps(5, '#ffffff'));
    this.helperTitle = htxt;
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
    const comboLabel = this.add.text(px(12), px(cy), TEXTS.ui.combo, ps(6, '#c0c0c0')).setDepth(6);
    this.comboText = this.add.text(px(12), px(cy + 12), '', ps(22, '#ffffff')).setDepth(6);
    const multLabel = this.add.text(W - px(12), px(cy), TEXTS.ui.mult, ps(6, '#c0c0c0')).setOrigin(1, 0).setDepth(6);
    this.multText = this.add.text(W - px(12), px(cy + 12), '', ps(22, '#ff2a2a')).setOrigin(1, 0).setDepth(6);
    this.playUi = [comboLabel, this.comboText, multLabel, this.multText]; // what the boss finale dims

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
    if (this.rew) return this.rewBeat;
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
    if (this.finale && this.finale.tap()) return; // boss: the ESEGUI tap
    this.down[l] = true;
    this.laneFx[l] = 1;
    if (this.over || !this.ready || this.rew) return;
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
    let dec = null;
    let decD = Infinity;
    for (const d of this.decrees) {
      if (d.b - sb > 1) break;
      if (d.st !== 'wait' || d.lane !== l) continue;
      const dd = Math.abs(d.b - sb) * this.beat;
      if (dd <= OK_WIN && dd < decD) {
        dec = d;
        decD = dd;
      }
    }
    if (dec && decD < bestD) {
      this.decreeTap(dec);
      return;
    }
    if (best && bestD <= OK_WIN) this.hit(best, (sb - best.b) * this.beat);
  }

  // DECRETO: tapping a striped note is breaking the law: combo and infection go, the boss swings.
  decreeTap(d) {
    d.st = 'tapped';
    this.failLane = d.lane;
    this.fail('miss', MISS_OD);
    this.flashWord(TEXTS.boss.words.decreeHit, 900, 3);
    if (this.show) this.show.atkAt = this.show.vis;
  }

  // ...and letting it pass is the right call: a little score and some guard.
  decreePass(d) {
    d.st = 'done';
    const s0 = this.score;
    this.addScore(BOSS_TUNING.decreeScore);
    d.pts = this.score - s0;
    this.show.addGuard(BOSS_TUNING.decreeGuard, this.songBeat());
    this.burst(this.laneX(d.lane, 1), px(this.hitY), 0xffffff, 8);
  }

  release(l) {
    this.down[l] = false;
    const n = this.held[l];
    if (n) this.finishHold(n, this.songBeat() >= n.b + n.len - HOLD_GRACE);
  }

  // ---- scoring ---------------------------------------------------------------
  hit(n, delta) {
    const g = GRADES.find((x) => Math.abs(delta) <= x.win) || GRADES[2];
    const s0 = this.score;
    const o0 = this.od;
    if (n.cb === undefined) n.cb = this.combo; // for the rewind: what the combo was before this note
    n.grade = g.key;
    this.counts[g.key]++;
    this.missRun = 0;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.addScore(g.points);
    this.addOd(g.od);
    if (this.boss) this.damageBoss(n, g.key);
    if (this.show) this.show.onHit(n, g.key);
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
    if (!this.boss && [10, 25, 50, 75, 100].includes(this.combo)) this.react('combo', 'win');
    n.pts = (n.pts || 0) + (this.score - s0);
    n.odd = (n.odd || 0) + (this.od - o0);
  }

  finishHold(n, ok) {
    const s0 = this.score;
    const o0 = this.od;
    this.finishHoldInner(n, ok);
    n.pts = (n.pts || 0) + (this.score - s0);
    n.odd = (n.odd || 0) + (this.od - o0);
  }

  finishHoldInner(n, ok) {
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
      this.failLane = n.lane;
      this.fail('broken', -3);
    }
  }

  miss(n) {
    if (this.shielded()) {
      n.st = 'done'; // the shield forgives it: no miss, no penalty
      return;
    }
    n.st = 'miss';
    n.grade = 'miss';
    if (n.cb === undefined) n.cb = this.combo;
    const o0 = this.od;
    this.counts.miss++;
    this.failLane = n.lane;
    this.fail('miss', MISS_OD);
    n.odd = (n.odd || 0) + (this.od - o0);
  }

  // Gabriel's ID FALSA: for a few beats the Ministry takes you for a legitimate user, points x2.
  forged() {
    return this.songBeat() < this.forgeUntil;
  }

  shielded() {
    return this.songBeat() < this.shieldUntil;
  }

  fail(key, od) {
    if (this.shielded()) return;
    if (this.show) this.show.onBreak(this.combo, this.failLane || 0);
    if (this.combo >= 8) this.react('miss', Math.random() < 0.5 ? 'sad' : 'angry');
    // remember what this streak of misses costs: the rewind bonus gives it back
    if (!this.missRun) this.streak = { combo: this.combo, od: 0 };
    this.streak.od += -od;
    this.combo = 0;
    this.addOd(od);
    this.missRun = (this.missRun || 0) + 1;
    if (this.missRun >= 4 && this.time.now > (this.nextHelp || 0) && !this.odMode && !this.badge) {
      this.missRun = 0;
      this.nextHelp = this.time.now + 25000;
      this.spawnBadge('rewind');
    }
    this.missEnv = 1;
    this.showJudge(key, '');
    this.cameras.main.shake(90, 0.003);
    if (this.track) this.track.muffle();
  }

  addScore(points) {
    const mult = Math.min(4, 1 + Math.floor(this.combo / 10)) * (this.odMode ? 2 : 1) * (this.forged() ? 2 : 1);
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
  helperSay(word, expr, ms, who = 'girl') {
    this.helper = true;
    this.helperBar.setVisible(true);
    this.helperTitle.setText(who === 'grafico' ? FORGER.name : EGG.name);
    this.mars.setTexture(who + '-' + expr).setCrop(0, 0, 36, 32);
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
  // One word at a time. `prio`: a word never cuts a more important one that is still up;
  // it waits its turn instead (one slot, dropped if it gets stale).
  //   1 reactions and script   2 combo attacks   3 stun, cut-ins   4 phase changes   5 finale
  flashWord(word, ms = 1100, prio = 1) {
    const now = this.time.now;
    if (now < (this.wordUntil || 0) - 200 && prio < (this.wordPrio || 0)) {
      if (!this.wordNext || prio >= this.wordNext.prio) this.wordNext = { word, ms, prio, by: now + 1600 };
      return;
    }
    this.wordNext = null;
    this.wordPrio = prio;
    this.wordUntil = now + ms;
    if (this.popup) this.popup.setAlpha(0.2); // the word has priority over any old-style window
    const t = this.wordText;
    this.tweens.killTweensOf([t, this.wordBar]);
    t.setText(word).setAlpha(1).setScale(1);
    const fit = Math.min(1, (W - px(44)) / t.width); // a long word shrinks to fit the screen
    t.setScale(1.5 * fit);
    const w = t.width * fit + px(24);
    const h = t.height * fit + px(14);
    this.wordBar.clear().fillStyle(0x000000, 0.78).fillRect(CX - w / 2, t.y - h / 2, w, h);
    this.wordBar.fillStyle(COLORS.red, 1).fillRect(CX - w / 2, t.y + h / 2 - px(3), w, px(3));
    this.wordBar.setAlpha(1);
    this.tweens.add({ targets: t, scale: fit, duration: 120, ease: 'Back.Out' });
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

  // Old-style system window. One at a time, only in the upper part of the speaker stack,
  // and never while a word or a rewind needs the same space.
  spawnPopup() {
    if (this.popup || this.rew || this.boss) return; // the boss stands where windows pop up
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
    // the lower part of the stack belongs to the word and the badge: shrink to fit above it
    const room = this.stackBottom - 70 - 126;
    const sc = Phaser.Math.Clamp(room / 104, 0.55, 1);
    win.setPosition(Phaser.Math.Between(px(14), W - w * sc - px(24)), px(126));
    win.setRotation(Phaser.Math.FloatBetween(-0.05, 0.05)).setDepth(8).setScale(0.6 * sc);
    this.popup = win;
    this.tweens.add({ targets: win, scale: sc, duration: 110, ease: 'Back.Out' });
    this.tweens.add({
      targets: win,
      alpha: 0,
      delay: 1900,
      duration: 350,
      onComplete: () => {
        if (this.popup === win) this.popup = null;
        win.destroy();
      },
    });
  }

  killPopup() {
    const win = this.popup;
    if (!win) return;
    this.popup = null;
    this.tweens.killTweensOf(win);
    this.tweens.add({ targets: win, alpha: 0, duration: 120, onComplete: () => win.destroy() });
  }

  // ---- the crew's powers --------------------------------------------------------------
  // Adriana (REWIND after a streak of misses, or the free BONUS ROOT mid-level) and Gabriel
  // (ID FALSA) show up as a big button in the thumb zone, under the hit line: Adriana in the
  // left corner, Gabriel in the right one. A tap on it (anywhere on it, with a generous margin)
  // never counts as a lane press. Rewind and bonus root also give a shield: misses are
  // forgiven for 8 beats. Space does the same on a keyboard.
  spawnBadge(kind) {
    if (this.badge || this.over) return;
    const forge = kind === 'forge';
    const w = px(164);
    const h = px(64);
    const x = forge ? W - px(90) : px(90);
    const y = px(LH - 64);
    const c = this.add.container(x, y + (this.reduced ? 0 : px(40))).setDepth(9.6).setAlpha(0);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.92).fillRect(-w / 2, -h / 2, w, h);
    bg.lineStyle(px(3), COLORS.silver, 1).strokeRect(-w / 2, -h / 2, w, h);
    const face = this.add.image(-w / 2 + px(8), 0, forge ? 'grafico-happy' : 'girl-happy').setOrigin(0, 0.5).setScale(K * 1.25).setCrop(0, 0, 36, 26);
    const name = this.add.text(-w / 2 + px(58), -px(10), forge ? TEXTS.forger.spawn : TEXTS.helper.spawn, { fontFamily: FONT_PS, fontSize: px(7) + 'px', color: '#ffffff' }).setOrigin(0, 0.5);
    const action = forge ? TEXTS.forger.forge : kind === 'rewind' ? TEXTS.helper.rewind : kind === 'shield' ? TEXTS.helper.shield : TEXTS.helper.gift;
    const act = this.add.text(-w / 2 + px(58), px(7), action, { fontFamily: FONT_PS, fontSize: px(8) + 'px', color: '#ff2a2a' }).setOrigin(0, 0.5);
    const ring = this.add.graphics();
    // BLOCCO: in the boss fight the later buttons come locked and open with PERFECTs
    const lock = this.boss && (kind === 'forge' || kind === 'shield') ? BOSS_TUNING.lockPerfects : 0;
    const lockT = this.add.text(w / 2 - px(8), 0, lock ? 'x' + lock : '', { fontFamily: FONT_PS, fontSize: px(12) + 'px', color: '#ffffff' }).setOrigin(1, 0.5);
    c.add([bg, face, name, act, ring, lockT]);
    if (lock) this.flashWord(TEXTS.boss.words.lock, 900, 2);
    this.tweens.add({ targets: c, y, alpha: 1, duration: 180, ease: 'Back.Out' });
    this.badge = { c, ring, w, h, x, y, kind, lock, lockT, born: this.time.now, ms: lock ? BOSS_TUNING.lockMs : kind === 'rewind' ? 8000 : 7000 };
    if (navigator.vibrate) navigator.vibrate(20);
  }

  // A PERFECT hit opens a locked button a notch.
  lockStep(key) {
    const b = this.badge;
    if (!b || !b.lock || key !== 'perfect') return;
    b.lock--;
    b.lockT.setText(b.lock ? 'x' + b.lock : '');
    if (!b.lock) this.flashWord(TEXTS.boss.words.unlock, 800, 2);
  }

  // Is this touch on the power button? The margin is generous: a thumb should not have to aim.
  hitBadge(p) {
    const b = this.badge;
    if (!b || this.over) return false;
    const m = px(12);
    return Math.abs(p.x - b.x) <= b.w / 2 + m && p.y >= b.y - b.h / 2 - m && p.y <= b.y + b.h / 2 + px(30);
  }

  drawBadge() {
    const b = this.badge;
    if (!b) return;
    const frac = 1 - (this.time.now - b.born) / b.ms;
    if (frac <= 0) {
      this.removeBadge();
      return;
    }
    const blink = frac < 0.25 && Math.floor(this.time.now / 120) % 2 ? 0.45 : 1;
    b.c.setAlpha(blink);
    const pulse = this.reduced ? 1 : 0.5 + 0.5 * Math.sin(this.time.now / 110);
    const r = b.ring.clear();
    r.lineStyle(px(3), COLORS.red, 0.35 + 0.65 * pulse).strokeRect(-b.w / 2 - px(3), -b.h / 2 - px(3), b.w + px(6), b.h + px(6));
    r.fillStyle(COLORS.red, 1).fillRect(-b.w / 2 + px(3), b.h / 2 - px(7), (b.w - px(6)) * frac, px(4)); // time left
    if (b.lock) r.fillStyle(0x000000, 0.55).fillRect(-b.w / 2, -b.h / 2, b.w, b.h - px(8)); // locked: dimmed
  }

  removeBadge() {
    const b = this.badge;
    if (!b) return;
    this.badge = null;
    this.tweens.add({ targets: b.c, alpha: 0, duration: 160, onComplete: () => b.c.destroy() });
  }

  useBackup() {
    const b = this.badge;
    if (!b || this.over) return;
    if (b.lock > 0) {
      // BLOCCO: still locked, it needs PERFECTs
      this.tweens.add({ targets: b.c, x: b.x + px(5), duration: 40, yoyo: true, repeat: 2 });
      return;
    }
    const kind = b.kind;
    this.removeBadge();
    const T = TEXTS.helper;
    if (kind === 'forge') {
      this.forgeUntil = this.songBeat() + 16;
      this.flash = 0.4;
      if (this.show) this.show.cutIn('grafico', TEXTS.boss.words.stamp); // GABRIEL TIMBRO
      else {
        this.helperSay(TEXTS.forger.forge, 'wink', 1300, 'grafico');
        this.time.delayedCall(1400, () => !this.over && this.flashWord(TEXTS.forger.double, 900));
      }
      track('backup_used', { kind });
      return;
    }
    this.shieldUntil = this.songBeat() + 8;
    if (kind === 'rewind' && this.buffer) {
      this.rewindTrack();
      if (this.show) this.show.cutIn('girl', TEXTS.boss.words.backup);
      else this.helperSay(T.rewind, 'wink', 1300);
      track('backup_used', { kind });
      return;
    }
    if (kind === 'rewind') {
      const st = this.streak || { combo: 0, od: 0 };
      this.combo = Math.max(this.combo, st.combo);
      this.addOd(st.od);
      this.missEnv = 0;
      this.spike = 1;
      this.flash = 0.35;
      A.rewind();
    } else if (kind === 'gift') {
      this.addOd(20);
      this.addScore(1000);
      this.flash = 0.5;
    } else {
      this.flash = 0.4; // shield: the Ministry's lock is gone, misses are forgiven
    }
    this.missRun = 0;
    if (this.show) this.show.cutIn('girl', TEXTS.boss.words.backup); // ADRIANA BACKUP
    else {
      this.helperSay(kind === 'rewind' ? T.rewind : T.gift, 'wink', 1300);
      this.time.delayedCall(1400, () => !this.over && this.flashWord(T.shield, 900));
    }
    track('backup_used', { kind });
  }

  // The real rewind (DJ Hero style). Phase 1: the highway runs backwards, so the notes you
  // already played fly back up toward the speakers, while the stretch just played is heard
  // reversed at tape speed. Phase 2 (endRewind): a beat of silence, then the track restarts
  // a few bars back and the notes come again. Whatever the rewound stretch gave or cost is
  // taken back, so replaying it cannot count twice.
  rewindTrack() {
    if (this.rew || !this.buffer) return;
    const tr = this.level.track;
    const sb = this.songBeat();
    const nb = Math.max(0, Math.floor((sb - 6) / 4) * 4); // a clean bar start, 6-10 beats back
    const target = nb - REWIND_PRE;
    if (this.track) this.track.tapeStop(0.12);
    A.rewindSound(this.buffer, tr.lead + target * this.beat, tr.lead + sb * this.beat, REWIND_ANIM);
    this.rewBeat = sb;
    this.rew = { start: A.clock(), dur: REWIND_ANIM, from: sb, to: target - (REWIND_PAUSE + this.lat) / this.beat, nb, target };
    this.held.fill(null);
    for (const n of this.notes) {
      if (n.sub) n.sub.stop();
      n.sub = null;
    }
    this.flashWord('<< REWIND', 1500);
    this.spike = 1;
  }

  endRewind() {
    const R = this.rew;
    const tr = this.level.track;
    const { nb, target } = R;

    // take back what the rewound stretch gave or cost
    let combo = null;
    for (const n of this.notes) {
      if (n.st === 'hold') n.st = 'done';
      if (n.b < nb - 0.01) continue;
      if (combo === null && n.cb !== undefined) combo = n.cb;
      if (n.bd) {
        const seg = this.boss.segs[this.bossAt(n.b)];
        seg.hp = Math.min(seg.cap, seg.hp + n.bd);
        n.bd = 0;
      }
      if (n.grade && this.counts[n.grade] > 0) this.counts[n.grade]--;
      this.score -= n.pts || 0;
      this.od -= n.odd || 0;
      n.st = 'wait';
      n.pts = 0;
      n.odd = 0;
      n.grade = null;
      n.cb = undefined;
    }
    for (const d of this.decrees) {
      if (d.b < nb - 0.01) continue;
      this.score -= d.pts;
      d.pts = 0;
      d.st = 'wait';
    }
    this.score = Math.max(0, this.score);
    this.od = Phaser.Math.Clamp(this.od, 0, 99);
    if (combo !== null) this.combo = combo;
    this.missRun = 0;
    this.missEnv = 0;
    this.odMode = false;
    this.tweens.add({ targets: this.inv, v: 0, duration: 200 });

    // restart the track: silence for REWIND_PAUSE, then from `target`
    const c = A.getCtx();
    const when = c.currentTime + REWIND_PAUSE;
    const offset = Math.max(0, tr.lead + target * this.beat);
    this.t0 = when - offset + tr.lead;
    this.track = A.playTrack(this.buffer, when, offset, { ramp: 0.06, ...this.trackEnd() });
    this.rew = null;

    // cues and script lines follow the new position
    this.ci = this.cues.findIndex((e) => e.b >= target);
    if (this.ci < 0) this.ci = this.cues.length;
    this.vi = this.ci;
    this.si = this.script.findIndex((q) => q.bar * 4 >= nb);
    if (this.si < 0) this.si = this.script.length;
    this.lastBeat = -99;
    this.flash = 0.25;
  }

  // The shield: a bright line across the hit zone while misses are forgiven.
  drawShield(sb) {
    if (!this.shieldG) this.shieldG = this.add.graphics().setDepth(8);
    const g = this.shieldG.clear();
    if (sb >= this.shieldUntil) return;
    const left = this.shieldUntil - sb;
    const a = left < 1.5 ? 0.35 + 0.35 * Math.sin(this.time.now / 60) : 0.8;
    g.lineStyle(px(4), 0xffffff, a).lineBetween(px(10), px(this.hitY + 24), W - px(10), px(this.hitY + 24));
    g.lineStyle(px(1), COLORS.red, a).lineBetween(px(10), px(this.hitY + 30), W - px(10), px(this.hitY + 30));
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
    const cap = this.boss ? 60 : 260; // the boss level has its own particles: keep the total low
    for (let i = 0; i < n && this.parts.length < cap; i++) {
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
    if (bi % 8 === 4 && this.od >= 30 && Math.random() < 0.5 && this.time.now > (this.wordUntil || 0) + 600) this.spawnPopup();
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

  buildResult() {
    return {
      level: this.level.id,
      score: this.score,
      maxCombo: this.maxCombo,
      counts: this.counts,
      total: this.notes.length,
      odPeak: this.odPeak,
      auto: this.auto,
      boss: this.boss ? this.bossLeft() : undefined,
    };
  }

  // Boss: the fight ends with bar 19 and the result is fixed here (what is left of the
  // boss decides). The finale takes over: ESEGUI, the blast, the EP screen, then the story.
  closeFight() {
    this.over = true;
    this.stopSubs();
    this.removeBadge();
    this.killPopup();
    if (this.odMode) {
      this.odMode = false;
      this.tweens.add({ targets: this.inv, v: 0, duration: 300 });
    }
    this.bossResult = this.buildResult();
    track('level_complete', { level: this.level.id, rank: rank(this.bossResult) });
  }

  finishLevel() {
    this.over = true;
    this.stopSubs();
    this.cameras.main.fadeOut(500);
    const result = this.buildResult();
    if (!this.auto) settings.set('tutorialDone', true);
    track('level_complete', { level: this.level.id, rank: rank(result) });
    // the story reacts to how it went, then hands over to the report
    const chapter = `${this.level.id}_${rank(result)}`;
    const next = TEXTS.story[chapter]
      ? ['Story', { id: chapter, next: { scene: 'End', data: result } }]
      : ['End', result];
    this.time.delayedCall(520, () => this.scene.start(...next));
  }

  // The debug bot (?auto). With ?boss=good or ?boss=bad it plays like a person would:
  // seconds off the beat for this note, or null to miss it. The same notes every run.
  botOffset(n) {
    const mode = PARAMS.get('boss');
    if (mode !== 'good' && mode !== 'bad') return 0;
    const x = Math.sin(n.b * 91.7 + n.lane * 13.1) * 43758.5453;
    const r = x - Math.floor(x);
    if (mode === 'good') return r < 0.06 ? null : r < 0.3 ? 0.08 : 0;
    return r < 0.45 ? null : r < 0.75 ? 0.12 : r < 0.9 ? 0.08 : 0;
  }

  // ---- the boss fight ----------------------------------------------------------
  // The level's `boss` block splits the boss's health into one segment per phase. Every note
  // you hit takes some of the segment of the phase it belongs to; what the segments are
  // worth is worked out so that playing a phase at about 85% empties it. ID FALSA hits 1.5x,
  // root access 2x. A note taken back by a rewind gives its damage back.
  initBoss() {
    const B = this.level.boss;
    const hp = PARAMS.has('hp') ? Phaser.Math.Clamp(Number(PARAMS.get('hp')) || 0, 0, 1) : 1; // debug: ?hp=0.4
    const segs = B.starts.map((start, i) => {
      const end = i + 1 < B.starts.length ? B.starts[i + 1] : Infinity;
      const n = this.notes.filter((x) => x.b >= start && x.b < end).length;
      return { start, cap: B.share[i], hp: B.share[i] * hp, n: Math.max(1, n) };
    });
    return { segs, phase: 0, flash: 0, shake: 0, face: B.faces[0], shown: -1 };
  }

  bossAt(b) {
    let at = 0;
    this.boss.segs.forEach((s, i) => {
      if (b >= s.start) at = i;
    });
    return at;
  }

  bossLeft() {
    const left = this.boss.segs.reduce((sum, s) => sum + s.hp, 0);
    return left < 0.001 ? 0 : left;
  }

  damageBoss(n, key) {
    const i = this.bossAt(n.b);
    const seg = this.boss.segs[i];
    const combo = COMBO_DMG(this.combo);
    const mult = (this.odMode ? BOSS_TUNING.rootDmg : 1) * (this.forged() ? BOSS_TUNING.forgeDmg : 1) * combo * this.show.dmgMult();
    const dmg = ((GRADE_WEIGHT[key] || 0.4) / seg.n) * (seg.cap / BOSS_TUNING.base) * mult;
    this.takeBoss(i, dmg, n, combo >= 1.5);
  }

  // Takes `dmg` (1 = the whole boss) from the segment of phase i. `n` is the note that
  // caused it: a rewind of that note gives the damage back.
  takeBoss(i, dmg, n, strong) {
    const B = this.boss;
    const seg = B.segs[i];
    if (seg.hp <= 0 || dmg <= 0) return 0;
    const taken = Math.min(seg.hp, dmg);
    seg.hp = seg.hp - taken < 0.0005 ? 0 : seg.hp - taken;
    if (n) n.bd = (n.bd || 0) + taken;
    B.flash = 1;
    B.shake = 1;
    this.show.onHurt(i, taken, strong);
    if (seg.hp === 0) this.bossDown(i);
    return taken;
  }

  bossDown(i) {
    const T = TEXTS.boss;
    // the boss cannot die here: an empty segment leaves it on its knees until ESEGUI
    this.flash = 0.6;
    this.cameras.main.shake(260, 0.01);
    this.setMars('win');
    this.flashWord(T.phaseDown[i], 1200, 3);
    if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
    track('boss_phase_down', { phase: i });
  }

  // Phase changes: the name, the face and the percentage in the strip under the HUD.
  updateBoss(dt) {
    const B = this.boss;
    const L = this.level.boss;
    const sb = this.songBeat();
    const ph = this.bossAt(Math.max(0, sb));
    if (ph !== B.phase) {
      B.phase = ph;
      this.bossName.setText(TEXTS.boss.phases[ph]);
    }
    const face = this.bossLeft() === 0 ? 'quiete-error' : B.segs[ph].hp === 0 ? 'quiete-error' : L.faces[ph];
    if (face !== B.face) {
      B.face = face;
      this.bossFace.setTexture(face).setCrop(0, 0, 36, 26);
    }
    B.flash = Math.max(0, B.flash - dt * 5);
    B.shake = Math.max(0, B.shake - dt * 6);
    this.bossFace.setX(px(8) + Math.sin(this.time.now / 22) * px(2.5) * B.shake);
    const pct = Math.round(this.bossLeft() * 100);
    if (pct !== B.shown) {
      B.shown = pct;
      this.bossHp.setText(`${TEXTS.boss.hp} ${String(pct).padStart(3, ' ')}%`);
    }
  }

  buildBossHud() {
    this.censorTexts = [];
    const L = this.level;
    if (!L.boss) return;
    const ps = (size, color) => ({ fontFamily: FONT_PS, fontSize: px(size) + 'px', color });
    this.ticker.setVisible(false);
    this.bossFace = this.add.image(px(8), px(98), L.boss.faces[0]).setOrigin(0).setDepth(6.5).setCrop(0, 0, 36, 26).setScale(K * 0.67);
    this.bossName = this.add.text(px(38), px(98), TEXTS.boss.phases[0], ps(6, '#ffffff')).setDepth(6.5);
    this.bossHp = this.add.text(W - px(8), px(98), '', ps(6, '#ff7a7a')).setOrigin(1, 0).setDepth(6.5);
    // the word on a censored lane
    for (let l = 0; l < L.lanes; l++) {
      this.censorTexts.push(this.add.text(0, 0, TEXTS.boss.censored, ps(8, '#ff2a2a')).setOrigin(0.5).setDepth(-2.9).setAlpha(0));
    }
  }

  // The health bar: one well per phase, the live phase in red, a white flash on every hit.
  drawBossBar(g) {
    const B = this.boss;
    const x0 = px(38);
    const y = px(106);
    const h = px(7);
    const gap = px(4);
    this.show.drawGuard(g, x0, px(115), W - px(8) - x0, px(3));
    this.show.drawDistrictIcons(g, W - px(8) - this.bossHp.width - px(36), px(96));
    const total = B.segs.reduce((sum, s) => sum + s.cap, 0);
    const room = W - px(8) - x0 - gap * (B.segs.length - 1);
    let x = x0;
    B.segs.forEach((s, i) => {
      const w = (room * s.cap) / total;
      const live = i === B.phase;
      g.fillStyle(COLORS.redDeep, 1).fillRect(x, y, w, h);
      if (s.hp > 0) {
        g.fillStyle(live ? COLORS.red : COLORS.redDark, 1).fillRect(x, y, w * (s.hp / s.cap), h);
        if (live && B.flash > 0) g.fillStyle(0xffffff, B.flash * 0.75).fillRect(x, y, w * (s.hp / s.cap), h);
      }
      g.lineStyle(px(1), COLORS.silver, live ? 0.95 : 0.5).strokeRect(x, y, w, h);
      x += w + gap;
    });
  }

  // Censorship (boss phase 1): a black bar over one lane hides the far part of the highway,
  // so its notes only show up about a beat before they land. It fades in a beat ahead.
  drawCensor(sb) {
    const g = this.censorG;
    g.clear();
    const B = this.level.boss;
    if (!B) return;
    this.censorTexts.forEach((t) => t.setAlpha(0));
    if (this.rew || !B.censor) return;
    const n = this.level.lanes;
    const edge = (k, s) => CX + (k - n / 2) * px(LANE_W) * s;
    const yF = this.yOf(S_FAR);
    const yC = this.yOf(CENSOR_S);
    const bars = B.censor.map((c) => ({ lane: c.lane, a: Phaser.Math.Clamp(Math.min(sb - (c.from - 1), c.to - sb), 0, 1), word: TEXTS.boss.censored }));
    const d = this.show && this.show.drone(sb);
    if (d) bars.push({ lane: d.lane, a: d.a, word: TEXTS.boss.words.drone });
    for (const c of bars) {
      const a = c.a;
      if (a <= 0) continue;
      g.fillStyle(0x000000, 0.97 * a);
      quad(g, edge(c.lane, S_FAR), yF, edge(c.lane + 1, S_FAR), yF, edge(c.lane + 1, CENSOR_S), yC, edge(c.lane, CENSOR_S), yC);
      g.lineStyle(px(2), COLORS.red, 0.7 * a);
      g.lineBetween(edge(c.lane, CENSOR_S), yC, edge(c.lane + 1, CENSOR_S), yC);
      const sm = (S_FAR + CENSOR_S) / 2;
      this.censorTexts[c.lane]
        .setText(c.word)
        .setPosition(this.laneX(c.lane, sm), this.yOf(sm))
        .setScale(sm * 1.7)
        .setAlpha(a);
    }
  }

  // ---- frame loop ------------------------------------------------------------
  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    const now = A.clock();
    const L = this.level;
    if (this.rew) {
      const R = this.rew;
      const p = Math.min(1, (now - R.start) / R.dur);
      const e = 1 - Math.pow(1 - p, 2.4); // tape: fast at first, slowing into the restart
      this.rewBeat = R.from + (R.to - R.from) * e;
      this.spike = Math.max(this.spike, 0.6);
      this.laneFx.fill(0);
      if (p >= 1) this.endRewind();
    }
    const sb = this.songBeat();

    if (this.ready && !this.rew) {
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
    for (const n of this.rew ? [] : this.notes) {
      if (n.b - sb > 1) break;
      if (n.st === 'wait') {
        if (this.auto && sb >= n.b && !n.skip) {
          const off = this.botOffset(n);
          if (off === null) n.skip = true; // the bot lets this one go
          else {
            this.laneFx[n.lane] = 1;
            this.hit(n, off);
          }
        } else if ((sb - n.b) * this.beat > OK_WIN) this.miss(n);
      } else if (n.st === 'hold') {
        if (sb >= n.b + n.len) this.finishHold(n, true);
        else {
          const tick = Math.round(delta * 0.1) * (this.odMode ? 2 : 1);
          this.score += tick;
          n.pts = (n.pts || 0) + tick;
          if (Math.random() < 0.5) this.burst(this.laneX(n.lane, 1), px(this.hitY), COLORS.red, 1, 0.7);
        }
      }
    }
    for (const d of this.rew ? [] : this.decrees) {
      if (d.b - sb > 1) break;
      if (d.st !== 'wait') continue;
      if (this.auto ? sb >= d.b : (sb - d.b) * this.beat > OK_WIN) this.decreePass(d); // (the debug bot never taps one)
    }
    if (this.decrees.length && !this.decreeWarned && this.decrees[0].b - sb < 4 && !this.over) {
      this.decreeWarned = true;
      this.flashWord(TEXTS.boss.words.decree, 1000, 2);
    }
    if (this.odMode && sb >= this.odEnd) {
      this.odMode = false;
      this.od = 55;
      this.tweens.add({ targets: this.inv, v: 0, duration: 400 });
    }
    if (!this.over && !this.rew && sb >= this.endBeat && !this.finale) this.finishLevel();
    if (this.finale) {
      if (!this.bossResult && this.ready && !this.rew && sb >= BOSS_TUNING.resultBeat) this.closeFight();
      this.finale.update(sb, dt);
    }

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

    if (this.wordNext && time >= (this.wordUntil || 0)) {
      const q = this.wordNext;
      this.wordNext = null;
      if (time < q.by) this.flashWord(q.word, q.ms, q.prio);
    }
    this.drawBadge();
    this.drawShield(sb);
    if (!this.giftDone && L.giftBeat !== undefined && sb >= L.giftBeat && !this.badge && !this.over) {
      this.giftDone = true;
      this.spawnBadge('gift');
    }
    // boss, phase 3: the miss counter resets by itself (the audio is not rewound)
    if (!this.autoRewindDone && L.autoRewindBeat !== undefined && sb >= L.autoRewindBeat && !this.over) {
      this.autoRewindDone = true;
      this.missRun = 0;
    }
    // boss, phase 3: root access opens by itself
    if (!this.rootDone && L.rootBeat !== undefined && sb >= L.rootBeat && !this.over && !this.rew) {
      this.rootDone = true;
      if (!this.odMode) {
        this.od = 100;
        this.odPeak = 100;
        this.startOdMode();
      }
    }
    if (this.boss) this.updateBoss(dt);
    if (this.show) this.show.update(sb, dt);
    if (!this.shieldDone && L.shieldBeat !== undefined && sb >= L.shieldBeat && !this.badge && !this.over) {
      this.shieldDone = true;
      this.spawnBadge('shield');
    }
    if (!this.forgeDone && L.forgeBeat !== undefined && sb >= L.forgeBeat && !this.badge && !this.over) {
      this.forgeDone = true;
      this.spawnBadge('forge');
    }
    this.drawTutorial(sb);
    this.drawStage(sb, dt, bands, bass);
    this.drawRoad(sb);
    this.drawCensor(sb);
    this.drawFx(this.show && this.show.freeze > 0 ? 0 : dt); // a boss freeze also holds the sparks
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
    if (!this.boss) {
      // (in the boss level the boss stands here instead of the speakers)
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

    g.fillStyle(0x0a0305, this.boss ? BOSS_TUNING.roadAlpha : 0.93); // the boss level lets the giant show through
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

    // notes, far to near (gold while the boss is stunned)
    const gold = this.show && this.show.stunned(sb);
    const gone = past * 1.25; // a little below the bottom edge
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const nt = this.notes[i];
      if ((nt.st === 'done' || nt.st === 'broken') && !this.rew) continue;
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
      const col = dead ? 0x4a1216 : holding ? 0xffffff : gold ? GOLD : LANE_COLORS[nt.lane % LANE_COLORS.length];
      g.fillStyle(0x000000, 0.6 * fade).fillRect(x - w / 2 + px(3) * s, y - h / 2 + px(3) * s, w, h);
      g.fillStyle(col, (dead ? 0.6 : 1) * fade).fillRect(x - w / 2, y - h / 2, w, h);
      if (!dead) {
        g.fillStyle(0xffffff, 0.85 * fade).fillRect(x - w / 2, y - h / 2, w, h * 0.22);
        g.fillStyle(0x000000, 0.35 * fade).fillRect(x - w / 2, y + h * 0.28, w, h * 0.22);
        g.fillStyle(nt.len > 0 ? COLORS.redDark : COLORS.bg, fade).fillRect(x - h * 0.3, y - h * 0.12, h * 0.6, h * 0.3);
      }
    }

    // decrees: paper notes with red stripes. Do not tap them.
    for (const d of this.decrees) {
      if (d.st !== 'wait' && !(this.rew && d.st !== 'wait')) continue;
      const dt = d.b - sb;
      if (dt > ap) break;
      if (dt < gone) continue;
      const s = this.sOf(Math.max(dt, gone));
      const x = this.laneX(d.lane, s);
      const y = this.yOf(s);
      const fade = Phaser.Math.Clamp((1 - dt / ap) / 0.12, 0, 1);
      const w = px(LANE_W * 0.78) * s;
      const h = px(20) * s;
      g.fillStyle(0x000000, 0.6 * fade).fillRect(x - w / 2 + px(3) * s, y - h / 2 + px(3) * s, w, h);
      g.fillStyle(COLORS.paper, fade).fillRect(x - w / 2, y - h / 2, w, h);
      g.fillStyle(COLORS.red, fade);
      for (let k = 0; k < 5; k++) g.fillRect(x - w / 2 + (w * (k * 2 + 0.5)) / 10, y - h / 2, w / 10, h);
      g.lineStyle(Math.max(px(1), px(2) * s), 0x000000, fade).strokeRect(x - w / 2, y - h / 2, w, h);
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

    // (fixed-size loops that compact in place: nothing is allocated per frame)
    let keep = 0;
    for (const r of this.rings) if ((r.life -= dt * 4) > 0) this.rings[keep++] = r;
    this.rings.length = keep;
    for (const r of this.rings) {
      const grow = 1 + (1 - r.life) * 0.9;
      const w = px(LANE_W * 0.8) * grow;
      const h = px(30) * grow;
      g.lineStyle(px(3), r.color, r.life).strokeRect(r.x - w / 2, hit - h / 2, w, h);
    }

    keep = 0;
    for (const p of this.parts) if ((p.life -= dt) > 0) this.parts[keep++] = p;
    this.parts.length = keep;
    for (const p of this.parts) {
      p.vy += px(900) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      g.fillStyle(p.color, p.life / p.max).fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }

    if (this.rew) {
      // tape streaks across the highway while it winds back
      for (let i = 0; i < 18; i++) {
        const y = this.yOf(S_FAR) + Math.random() * (px(LH) - this.yOf(S_FAR));
        g.fillStyle(0xffffff, 0.1 + Math.random() * 0.22).fillRect(Math.random() * W * 0.6, y, W * (0.1 + Math.random() * 0.5), px(1 + Math.random() * 2));
      }
    }
    if (this.flash > 0) g.fillStyle(0xffffff, this.flash * (this.reduced ? 0.1 : 0.5)).fillRect(0, 0, W, H);
  }

  drawHud(time) {
    const g = this.hudG;
    g.clear();
    // marquee band
    if (this.boss) {
      g.fillStyle(0x000000, 1).fillRect(0, px(95), W, px(26));
      g.fillStyle(COLORS.redDark, 1).fillRect(0, px(95), W, px(1)).fillRect(0, px(120), W, px(1));
      this.drawBossBar(g);
    } else {
      g.fillStyle(0x000000, 1).fillRect(0, px(96), W, px(18));
      g.fillStyle(COLORS.redDark, 1).fillRect(0, px(96), W, px(1)).fillRect(0, px(113), W, px(1));
    }

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
    const mult = Math.min(4, 1 + Math.floor(this.combo / 10)) * (this.odMode ? 2 : 1) * (this.forged() ? 2 : 1);
    if (s.mult !== mult) this.multText.setText('x' + (s.mult = mult));
  }
}
