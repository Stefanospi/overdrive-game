import { K, W, H, px, COLORS, FONT_PS, FONT_VT } from './config.js';

// Dark red-grid backdrop (static, drawn once per scene).
export function drawBackdrop(scene) {
  const g = scene.add.graphics().setDepth(-10);
  g.fillStyle(COLORS.bg, 1).fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) {
    g.fillStyle(COLORS.red, 0.045).fillCircle(W / 2, H * 0.42, px(300) - i * px(40));
  }
  g.lineStyle(px(1), COLORS.red, 0.08);
  for (let x = 0; x <= W; x += px(32)) g.lineBetween(x, 0, x, H);
  for (let y = 0; y <= H; y += px(32)) g.lineBetween(0, y, W, y);
  return g;
}

// CRT scanlines on top of everything.
export function drawScanlines(scene) {
  const g = scene.add.graphics().setDepth(100);
  g.fillStyle(0x000000, 0.14);
  for (let y = 0; y < H; y += px(3)) g.fillRect(0, y, W, px(1));
  return g;
}

// Y2K silver window. Returns a container whose origin is the window's top-left.
export function buildWindow(scene, w, h, title) {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const bar = px(22);
  g.fillStyle(0x000000, 1).fillRect(px(5), px(5), w, h);
  g.fillStyle(COLORS.silver, 1).fillRect(0, 0, w, h);
  g.fillStyle(0xffffff, 1).fillRect(0, 0, w, px(2)).fillRect(0, 0, px(2), h);
  g.fillStyle(0x404040, 1).fillRect(0, h - px(2), w, px(2)).fillRect(w - px(2), 0, px(2), h);
  g.fillStyle(0x8f0c12, 1).fillRect(px(3), px(3), w - px(6), bar);
  const t = scene.add
    .text(px(8), px(3) + bar / 2, title, { fontFamily: FONT_PS, fontSize: px(7) + 'px', color: '#ffffff' })
    .setOrigin(0, 0.5);
  c.add([g, t]);
  c.setSize(w, h);
  return c;
}

// Speech bubble anchored at (x, y) = bottom-left corner of the box.
export class Bubble {
  constructor(scene, x, y, maxW, { tail = true } = {}) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.maxW = maxW;
    this.tail = tail;
    this.g = scene.add.graphics().setDepth(20);
    this.text = scene.add
      .text(0, 0, '', {
        fontFamily: FONT_VT,
        fontSize: px(24) + 'px',
        color: '#15121a',
        wordWrap: { width: maxW - px(24) },
        lineSpacing: -px(4),
      })
      .setDepth(21);
    this.hide();
  }

  show(str, ms = 2600) {
    const pad = px(12);
    this.text.setText(str).setVisible(true);
    const w = this.maxW;
    const h = this.text.height + pad * 2;
    const left = this.x;
    const top = this.y - h;
    this.text.setPosition(left + pad, top + pad);
    const g = this.g;
    g.clear().setVisible(true);
    g.fillStyle(COLORS.red, 1).fillRect(left + px(5), top + px(5), w, h);
    g.fillStyle(COLORS.paper, 1).fillRect(left, top, w, h);
    g.lineStyle(px(3), 0x000000, 1).strokeRect(left, top, w, h);
    if (this.tail) {
      const ty = this.y - px(26);
      g.fillStyle(COLORS.paper, 1).fillTriangle(left + px(2), ty - px(10), left + px(2), ty + px(10), left - px(12), ty);
      g.lineStyle(px(3), 0x000000, 1)
        .lineBetween(left, ty - px(10), left - px(12), ty)
        .lineBetween(left - px(12), ty, left, ty + px(10));
    }
    if (this.timer) this.timer.remove(false);
    if (ms > 0) this.timer = this.scene.time.delayedCall(ms, () => this.hide());
  }

  hide() {
    this.g.clear().setVisible(false);
    this.text.setVisible(false);
  }
}

// Blinking call-to-action text.
export function blinkText(scene, x, y, str, size = 10) {
  const t = scene.add
    .text(x, y, str, { fontFamily: FONT_PS, fontSize: px(size) + 'px', color: '#ffffff' })
    .setOrigin(0.5)
    .setDepth(30);
  scene.tweens.add({ targets: t, alpha: 0.2, duration: 520, yoyo: true, repeat: -1 });
  return t;
}

export { K };
