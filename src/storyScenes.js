import { K, px, COLORS, FONT_PS } from './config.js';

// Procedural illustrations for the story: the quiet city, the unheard protest, the
// chaos, Mars's wall of monitors. Drawn every frame into one Graphics object; nothing
// here is an image file. `kind` picks the picture (see TEXTS.story panels `scene`).
//   city_lit  city_off  city_dark  city_on    the neighbourhood and its soundsystem
//   protest                                    a crowd shouting at a closed ministry
//   chaos                                      drones, sirens, the crowd scattering
//   monitors                                   Mars's rooftop: six screens of the night

const rnd = (i) => {
  const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
  return x - Math.floor(x);
};
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const SKY = [0x0b0507, 0x12060a, 0x1a080c, 0x220a0e, 0x2a0b10, 0x330d12];
const SIGNS = ['BASSO', 'VOCE', 'DIRITTI', 'ASCOLTATECI'];

export class StoryScene {
  constructor(scene, kind, rect) {
    this.scene = scene;
    this.kind = kind;
    this.y0 = rect.y0;
    this.hl = rect.h / K; // height in logical px
    this.t = 0;
    this.texts = [];
    if (kind === 'protest') {
      SIGNS.forEach((s) => {
        const t = scene.add
          .text(0, 0, s, { fontFamily: FONT_PS, fontSize: px(5) + 'px', color: '#15121a' })
          .setOrigin(0.5)
          .setDepth(-3);
        this.texts.push(t);
      });
    }
  }

  R(g, x, y, w, h, color, a = 1) {
    g.fillStyle(color, a).fillRect(px(x), this.y0 + px(y), px(w), px(h));
  }

  update(g, dt) {
    this.t += dt;
    const k = this.kind;
    this.sky(g);
    if (k.startsWith('city')) this.city(g);
    else if (k === 'protest' || k === 'chaos') this.crowdScene(g, k === 'chaos');
    else if (k === 'monitors') this.monitors(g);
  }

  sky(g) {
    const bh = this.hl / SKY.length;
    SKY.forEach((c, i) => this.R(g, 0, i * bh, 390, bh + 1, c));
    for (let i = 0; i < 34; i++) {
      const tw = 0.25 + 0.5 * Math.abs(Math.sin(this.t * (0.6 + rnd(i + 70)) + i));
      this.R(g, rnd(i + 31) * 386, rnd(i + 57) * this.hl * 0.42, 2, 2, COLORS.paper, tw * 0.6);
    }
  }

  skyline(g, lit, flicker) {
    const hl = this.hl;
    for (let i = 0; i < 14; i++) {
      const bw = 22 + rnd(i) * 14;
      const bx = i * 29 - 6 + rnd(i + 50) * 6;
      const bh = 60 + rnd(i + 9) * hl * 0.4;
      const by = hl - 26 - bh;
      this.R(g, bx, by, bw, bh + 26, 0x120609);
      this.R(g, bx, by, bw, 1, COLORS.red, 0.35);
      const cols = Math.floor(bw / 8);
      const rows = Math.floor(bh / 11);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const on = rnd(i * 100 + r * 10 + c + 3) < lit;
          const blink = flicker && on && rnd(Math.floor(this.t * 6) + i * 7 + r + c) < 0.06;
          this.R(g, bx + 3 + c * 8, by + 5 + r * 11, 4, 6, on && !blink ? COLORS.red : 0x1d0b0f, on && !blink ? 0.9 : 1);
        }
      }
    }
  }

  city(g) {
    const t = this.t;
    const hl = this.hl;
    const k = this.kind;
    let lit = 0.8;
    let speaker = true;
    let spark = false;
    let plugGap = 0;
    if (k === 'city_off') {
      lit = 0.8 * (1 - clamp((t - 0.4) / 2.4));
      speaker = t < 0.9;
      spark = t > 0.9 && t < 1.8;
      plugGap = t > 0.9 ? 26 : 0;
    } else if (k === 'city_dark') {
      lit = 0.04;
      speaker = false;
      plugGap = 26;
    } else if (k === 'city_on') {
      lit = 0.04 + 0.8 * clamp(t / 3);
      speaker = t > 0.4;
    }
    this.skyline(g, lit, k === 'city_lit');

    this.soundsystem(g, speaker);
    this.cable(g, plugGap, spark);
  }

  // The neighbourhood soundsystem, left foreground. Also drawn on its own by the boss finale.
  soundsystem(g, speaker) {
    const t = this.t;
    const hl = this.hl;
    const sx = 18;
    const sy = hl - 112;
    this.R(g, sx, sy, 78, 112, 0x050304);
    this.R(g, sx, sy, 78, 2, COLORS.silver, 0.5);
    for (const [cx, cy, r] of [[sx + 39, sy + 30, 20], [sx + 39, sy + 80, 24]]) {
      const pulse = speaker ? 0.5 + 0.5 * Math.sin(t * 14) : 0;
      g.fillStyle(0x1a0c10, 1).fillCircle(px(cx), this.y0 + px(cy), px(r));
      g.fillStyle(COLORS.red, 0.25 + pulse * 0.6).fillCircle(px(cx), this.y0 + px(cy), px(r * 0.55));
      g.lineStyle(px(2), COLORS.silver, 0.6).strokeCircle(px(cx), this.y0 + px(cy), px(r));
    }
  }

  // Cable to the wall socket; `plugGap` (logical px) is how far out the plug is.
  cable(g, plugGap, spark, color = 0x44444c) {
    const hl = this.hl;
    const sx = 18;
    const sy = hl - 112;
    g.lineStyle(px(3), color, 1).beginPath();
    g.moveTo(px(sx + 78), this.y0 + px(sy + 100));
    g.lineTo(px(260 - plugGap), this.y0 + px(hl - 12));
    g.strokePath();
    this.R(g, 262 - plugGap, hl - 16, 10, 8, COLORS.silver);
    this.R(g, 330, hl - 20, 16, 16, 0x2a2a30);
    this.R(g, 335, hl - 15, 2, 6, 0x000000);
    this.R(g, 340, hl - 15, 2, 6, 0x000000);
    if (spark) {
      for (let i = 0; i < 10; i++) this.R(g, 262 - plugGap + (Math.random() - 0.3) * 40, hl - 20 + (Math.random() - 0.7) * 22, 2, 2, 0xffffff, 0.9);
    }
  }

  person(g, x, y, s, c, i) {
    // a dark silhouette with a thin red edge, arms up for some
    const armsUp = rnd(i + 21) < 0.55;
    const arm = armsUp ? Math.sin(this.t * 6 + i) * 3 : 0;
    this.R(g, x - 5 * s - 1, y - 1, 10 * s + 2, 18 * s + 1, COLORS.red, 0.4);
    this.R(g, x - 5 * s, y, 10 * s, 18 * s, 0x050304);
    this.R(g, x - 4 * s, y - 9 * s, 8 * s, 9 * s, 0x050304);
    this.R(g, x - 4 * s - 1, y - 9 * s - 1, 8 * s + 2, 1, COLORS.red, 0.4);
    if (armsUp) {
      this.R(g, x - 8 * s, y - 10 * s + arm, 3 * s, 12 * s, 0x050304);
      this.R(g, x + 5 * s, y - 10 * s - arm, 3 * s, 12 * s, 0x050304);
    }
  }

  crowdScene(g, chaos) {
    const t = this.t;
    const hl = this.hl;
    const c = chaos ? clamp(t / 1.6) : 0;

    // the ministry: columns, shuttered windows, loudspeakers
    const fx = 45;
    const fw = 300;
    const fy = 30;
    g.fillStyle(0x180a0e, 1).fillTriangle(px(fx - 6), this.y0 + px(fy), px(fx + fw + 6), this.y0 + px(fy), px(195), this.y0 + px(4));
    this.R(g, fx, fy, fw, 118, 0x180a0e);
    this.R(g, fx - 6, fy, fw + 12, 3, COLORS.silver, 0.45);
    const closed = chaos ? 1 : clamp((t - 1.2) / 2.5);
    for (let r = 0; r < 2; r++) {
      for (let col = 0; col < 6; col++) {
        const wx = fx + 14 + col * 48;
        const wy = fy + 14 + r * 50;
        this.R(g, wx, wy, 28, 34, 0x3a1218);
        this.R(g, wx, wy, 28, 34 * closed, 0x0b0507); // the blinds come down
        this.R(g, wx, wy + 34 * closed - 1, 28, 1, COLORS.silver, 0.5);
        this.R(g, wx - 1, wy - 1, 30, 1, COLORS.silver, 0.3);
      }
    }
    for (let col = 0; col <= 6; col++) this.R(g, fx + 6 + col * 48 - 2, fy + 3, 4, 115, 0x2a1a1f);
    for (const hx of [fx + 20, fx + fw - 20]) {
      g.fillStyle(0x2a2a30, 1).fillTriangle(px(hx - 10), this.y0 + px(fy - 2), px(hx + 10), this.y0 + px(fy - 2), px(hx), this.y0 + px(fy - 18));
    }

    // the crowd's voice rises and dies before it reaches the building
    if (!chaos) {
      for (let q = 0; q < 4; q++) {
        const p = ((t * 0.42 + q * 0.25) % 1);
        const y = hl - 105 - p * (hl - 105 - fy - 130);
        g.lineStyle(px(3), COLORS.red, 0.55 * (1 - p)).beginPath();
        g.arc(px(195), this.y0 + px(y), px(80 + p * 40), Math.PI * 1.15, Math.PI * 1.85);
        g.strokePath();
      }
    }

    // people, three rows
    const rows = [[hl - 112, 13, 0.8], [hl - 74, 12, 0.95], [hl - 34, 11, 1.1]];
    let signN = 0;
    rows.forEach(([ry, n, s], ri) => {
      for (let i = 0; i < n; i++) {
        const id = ri * 40 + i;
        let x = (i + 0.5) * (390 / n) + (rnd(id) - 0.5) * 14;
        let y = ry + Math.sin(t * 4 + id) * (chaos ? 0 : 1.4);
        if (chaos) {
          x += (rnd(id + 7) - 0.5) * c * 150;
          y += rnd(id + 3) * c * 12;
        }
        if (chaos && rnd(id + 11) > 0.72 && c > 0.8) {
          this.R(g, x - 9, y + 12, 18, 7, 0x050304); // knocked down
          this.R(g, x + 8, y + 10, 7, 7, 0x050304);
        } else {
          this.person(g, x, y, s, c, id);
        }
        if (!chaos && ri < 2 && rnd(id + 33) < 0.22) {
          this.R(g, x - 13, y - 31, 26, 16, COLORS.paper);
          this.R(g, x - 1, y - 15, 2, 8, 0x050304);
          if (signN < this.texts.length && ri < 2) {
            this.texts[signN].setPosition(px(x), this.y0 + px(y - 23)).setVisible(true);
            this.texts[signN].setScale(s > 0.9 ? 1 : 0.9);
            signN++;
          }
        }
      }
    });
    for (let i = signN; i < this.texts.length; i++) this.texts[i].setVisible(false);

    if (chaos) {
      // drones with searchlights
      for (let d = 0; d < 3; d++) {
        const dx = 70 + d * 125 + Math.sin(t * 1.3 + d) * 22;
        const dy = 56 + Math.sin(t * 2 + d * 2) * 6;
        g.fillStyle(COLORS.red, 0.1 + 0.1 * Math.sin(t * 9 + d)).fillTriangle(px(dx), this.y0 + px(dy + 6), px(dx - 55), this.y0 + px(hl), px(dx + 55), this.y0 + px(hl));
        this.R(g, dx - 14, dy - 4, 28, 9, 0x2a2a30);
        this.R(g, dx - 14, dy - 4, 28, 1, COLORS.silver, 0.6);
        this.R(g, dx - 2, dy, 4, 4, COLORS.red, Math.sin(t * 12 + d) > 0 ? 1 : 0.3);
        this.R(g, dx - 22, dy - 6, 10, 2, 0x44444c);
        this.R(g, dx + 12, dy - 6, 10, 2, 0x44444c);
      }
      // flyers falling, siren wash
      for (let f = 0; f < 22; f++) {
        const fy2 = ((rnd(f) * hl + t * (22 + rnd(f + 4) * 30)) % hl);
        this.R(g, rnd(f + 8) * 380 + Math.sin(t * 2 + f) * 6, fy2, 4, 3, COLORS.paper, 0.8);
      }
      this.R(g, 0, 0, 390, hl, COLORS.red, 0.07 + 0.08 * (Math.sin(t * 12) > 0 ? 1 : 0));
    }
  }

  monitors(g) {
    const t = this.t;
    const hl = this.hl;
    this.R(g, 0, 0, 390, hl, 0x060304, 0.8);
    const cols = 3;
    const rows = 2;
    const mw = 108;
    const mh = Math.min(84, (hl - 110) / rows - 8);
    const gap = 10;
    const ox = (390 - (cols * mw + (cols - 1) * gap)) / 2;
    for (let m = 0; m < cols * rows; m++) {
      const mx = ox + (m % cols) * (mw + gap);
      const my = 14 + Math.floor(m / cols) * (mh + gap);
      this.R(g, mx - 4, my - 4, mw + 8, mh + 8, 0x2a2a30);
      this.R(g, mx - 4, my - 4, mw + 8, 2, COLORS.silver, 0.5);
      this.R(g, mx, my, mw, mh, 0x050304);
      const feed = m % 6;
      for (let q = 0; q < 14; q++) {
        this.R(g, mx + Math.random() * (mw - 6), my + Math.random() * (mh - 3), 2 + Math.random() * 8, 1, COLORS.red, 0.25 + Math.random() * 0.5);
      }
      if (feed === 0 || feed === 3) {
        for (let p = 0; p < 9; p++) this.R(g, mx + 8 + p * 11, my + mh - 18 + Math.sin(t * 5 + p) * 2, 6, 12, 0x2a0b10);
      } else if (feed === 1) {
        // drone cam: crosshair
        this.R(g, mx + mw / 2 - 1, my + 8, 2, mh - 16, COLORS.red, 0.7);
        this.R(g, mx + 8, my + mh / 2 - 1, mw - 16, 2, COLORS.red, 0.7);
      } else if (feed === 2) {
        for (let b = 0; b < 12; b++) this.R(g, mx + 6 + b * 8, my + mh - 6 - Math.abs(Math.sin(t * 6 + b)) * (mh - 14), 5, 4 + Math.abs(Math.sin(t * 6 + b)) * (mh - 14), COLORS.red, 0.7);
      } else {
        this.R(g, mx, my + ((t * 40 + m * 17) % mh), mw, 3, 0xffffff, 0.18);
      }
      this.R(g, mx, my + ((t * 55 + m * 31) % mh), mw, 2, COLORS.red, 0.35);
    }
    // the desk
    this.R(g, 0, hl - 30, 390, 30, 0x0d0406);
    this.R(g, 0, hl - 30, 390, 2, COLORS.silver, 0.4);
    this.R(g, 120, hl - 24, 150, 8, 0x2a2a30);
  }

  destroy() {
    this.texts.forEach((t) => t.destroy());
    this.texts = [];
  }
}
