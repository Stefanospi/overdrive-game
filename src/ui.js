import { W, H, px, COLORS, FONT_PS, FONT_VT } from './config.js';

// Static print-style backdrop: red glow, halftone dots growing toward the
// edges, registration marks. Baked once into a texture, shared by all scenes.
export function drawBackdrop(scene) {
  const key = 'backdrop';
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    g.fillStyle(COLORS.bg, 1).fillRect(0, 0, W, H);
    for (let i = 0; i < 8; i++) g.fillStyle(COLORS.red, 0.035).fillCircle(W / 2, px(250), px(340 - i * 40));

    const step = px(9);
    const cx = W / 2;
    const cy = H * 0.45;
    g.fillStyle(COLORS.red, 0.3);
    for (let j = 0; j * step < H + step; j++) {
      for (let i = 0; i * step < W + step; i++) {
        const x = i * step + (j % 2 ? step / 2 : 0);
        const y = j * step;
        const t = Math.min(1, Math.max(0, (Math.hypot(x - cx, y - cy) - px(230)) / px(330)));
        if (t > 0.12) g.fillCircle(x, y, px(3.4) * t);
      }
    }

    g.lineStyle(px(1), COLORS.silver, 0.5);
    [[px(14), px(126)], [W - px(14), px(126)]].forEach(([x, y]) => {
      g.strokeCircle(x, y, px(5));
      g.lineBetween(x - px(9), y, x + px(9), y).lineBetween(x, y - px(9), x, y + px(9));
    });
    g.generateTexture(key, W, H);
    g.destroy();
  }
  return scene.add.image(0, 0, key).setOrigin(0).setDepth(-10);
}

// Draws a string once into its own canvas texture (for tile sprites: marquees,
// giant outlined type). Pass fill and/or stroke as CSS colours.
export function textTexture(scene, key, str, { font = FONT_PS, size = 16, fill = null, stroke = null, strokeW = 1.5 } = {}) {
  if (scene.textures.exists(key)) return key;
  const css = `${px(size)}px ${font}`;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = css;
  const w = Math.ceil(probe.measureText(str).width);
  const h = Math.ceil(px(size) * 1.3);
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  ctx.font = css;
  ctx.textBaseline = 'middle';
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillText(str, 0, h / 2);
  }
  if (stroke) {
    ctx.lineWidth = px(strokeW);
    ctx.strokeStyle = stroke;
    ctx.strokeText(str, 0, h / 2);
  }
  tex.refresh();
  return key;
}

// Record-label strip along the bottom edge: barcode plus catalogue text.
export function drawLabelStrip(scene, str) {
  const y = H - px(20);
  const g = scene.add.graphics().setDepth(40);
  g.fillStyle(0x000000, 1).fillRect(0, y, W, px(20));
  g.fillStyle(COLORS.redDark, 1).fillRect(0, y, W, px(1));
  g.fillStyle(COLORS.silver, 0.85);
  let x = px(8);
  for (let i = 0; i < 22; i++) {
    const bw = px(1 + ((i * 7) % 3));
    g.fillRect(x, y + px(5), bw, px(11));
    x += bw + px(1 + ((i * 5) % 2));
  }
  scene.add
    .text(W - px(8), y + px(11), str, { fontFamily: FONT_VT, fontSize: px(13) + 'px', color: '#c0c0c0' })
    .setOrigin(1, 0.5)
    .setDepth(41);
}

// Y2K silver window. Returns a container whose origin is the window's top-left.
export function buildWindow(scene, w, h, title, { bar = 22, font = 7 } = {}) {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const b = px(bar);
  g.fillStyle(0x000000, 1).fillRect(px(5), px(5), w, h);
  g.fillStyle(COLORS.silver, 1).fillRect(0, 0, w, h);
  g.fillStyle(0xffffff, 1).fillRect(0, 0, w, px(2)).fillRect(0, 0, px(2), h);
  g.fillStyle(COLORS.grey, 1).fillRect(0, h - px(2), w, px(2)).fillRect(w - px(2), 0, px(2), h);
  g.fillStyle(0x8f0c12, 1).fillRect(px(3), px(3), w - px(6), b);
  // close button
  const cb = b - px(4);
  g.fillStyle(COLORS.silver, 1).fillRect(w - px(5) - cb, px(5), cb, cb);
  g.fillStyle(0x000000, 1).fillRect(w - px(5) - cb + cb * 0.3, px(5) + cb * 0.42, cb * 0.4, cb * 0.16);
  const t = scene.add
    .text(px(7), px(3) + b / 2, title, { fontFamily: FONT_PS, fontSize: px(font) + 'px', color: '#ffffff' })
    .setOrigin(0, 0.5);
  c.add([g, t]);
  c.setSize(w, h);
  return c;
}

// Chunky tap button, centred on (x, y). Primary = red, otherwise paper.
// The press is handled on pointerdown so it feels instant on a phone.
export function button(scene, x, y, w, h, label, onTap, { primary = false, size = 8, depth = 30, disabled = false } = {}) {
  const c = scene.add.container(x, y).setDepth(depth);
  const g = scene.add.graphics();
  const fill = disabled ? COLORS.grey : primary ? COLORS.red : COLORS.paper;
  g.fillStyle(0x000000, 1).fillRect(-w / 2 + px(4), -h / 2 + px(4), w, h);
  g.fillStyle(fill, 1).fillRect(-w / 2, -h / 2, w, h);
  g.lineStyle(px(2), 0x000000, 1).strokeRect(-w / 2, -h / 2, w, h);
  const t = scene.add
    .text(0, px(1), label, { fontFamily: FONT_PS, fontSize: px(size) + 'px', color: primary ? '#ffffff' : '#15121a' })
    .setOrigin(0.5);
  c.add([g, t]);
  c.setSize(w, h);
  if (!disabled) {
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', (p, lx, ly, ev) => {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      scene.tweens.add({ targets: c, scale: 0.94, duration: 60, yoyo: true });
      onTap();
    });
  }
  c.label = t;
  return c;
}
