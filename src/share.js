import { SPRITES, PALETTE, SPRITE_W } from './sprites.js';
import { accuracy, rank } from './rank.js';
import { EP, track } from './campaign.js';
import { TEXTS } from './texts.js';

const PS = "'Press Start 2P', monospace";
const VT = 'VT323, monospace';

function drawSprite(ctx, key, x, y, scale) {
  for (const [sx, sy, w, h, c] of SPRITES[key]) {
    ctx.fillStyle = PALETTE[c];
    ctx.fillRect(Math.round(x + sx * scale), Math.round(y + sy * scale), Math.ceil(w * scale), Math.ceil(h * scale));
  }
}

// 1080x1920 story card: what the player did, and what the EP is.
export function buildCard(result) {
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1920;
  const ctx = c.getContext('2d');
  const tier = rank(result);
  const C = TEXTS.campaign.card;

  ctx.fillStyle = '#0b0507';
  ctx.fillRect(0, 0, 1080, 1920);
  const glow = ctx.createRadialGradient(540, 700, 40, 540, 700, 900);
  glow.addColorStop(0, 'rgba(255,42,42,0.38)');
  glow.addColorStop(1, 'rgba(255,42,42,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1920);
  // halftone
  ctx.fillStyle = 'rgba(255,42,42,0.28)';
  for (let j = 0; j < 1920 / 30 + 1; j++) {
    for (let i = 0; i < 1080 / 30 + 1; i++) {
      const x = i * 30 + (j % 2 ? 15 : 0);
      const y = j * 30;
      const t = Math.min(1, Math.max(0, (Math.hypot(x - 540, y - 800) - 420) / 700));
      if (t > 0.1) {
        ctx.beginPath();
        ctx.arc(x, y, 11 * t, 0, 7);
        ctx.fill();
      }
    }
  }
  // outlined giant type
  ctx.font = `150px ${PS}`;
  ctx.strokeStyle = 'rgba(255,42,42,0.25)';
  ctx.lineWidth = 3;
  for (let r = 0; r < 3; r++) ctx.strokeText('OVERDRIVE OVERDRIVE', -120 + r * 150, 250 + r * 190);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f4f1ea';
  ctx.font = `64px ${PS}`;
  ctx.fillText(C.head, 540, 380);
  ctx.fillStyle = '#ff2a2a';
  ctx.font = `46px ${PS}`;
  ctx.fillText(C.sub, 540, 460);

  // the number
  ctx.fillStyle = '#000';
  ctx.font = `250px ${PS}`;
  const pct = Math.round(result.odPeak) + '%';
  ctx.fillText(pct, 556, 756);
  ctx.fillStyle = '#ff2a2a';
  ctx.fillText(pct, 540, 740);
  ctx.fillStyle = '#c0c0c0';
  ctx.font = `44px ${VT}`;
  ctx.fillText(TEXTS.report.peak, 540, 810);

  // stamp
  ctx.save();
  ctx.translate(540, 920);
  ctx.rotate(-0.12);
  ctx.strokeStyle = '#ff2a2a';
  ctx.lineWidth = 10;
  ctx.font = `64px ${PS}`;
  const label = TEXTS.report.stamps[tier];
  const w = ctx.measureText(label).width + 80;
  ctx.strokeRect(-w / 2, -60, w, 120);
  ctx.fillStyle = '#ff2a2a';
  ctx.fillText(label, 0, 22);
  ctx.restore();

  // numbers
  ctx.font = `56px ${VT}`;
  ctx.fillStyle = '#f4f1ea';
  ctx.fillText(`${TEXTS.report.score} ${String(result.score).padStart(7, '0')}`, 540, 1060);
  ctx.fillStyle = '#c0c0c0';
  ctx.fillText(`${TEXTS.report.accuracy} ${Math.round(accuracy(result) * 100)}%   ${TEXTS.report.combo} ${result.maxCombo}`, 540, 1124);

  // Mars
  const expr = tier === 'high' ? 'win' : tier === 'mid' ? 'neutral' : 'sad';
  const scale = 12;
  drawSprite(ctx, 'mars-' + expr, 540 - (SPRITE_W * scale) / 2, 1210, scale);

  // footer: the EP
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 1760, 1080, 160);
  ctx.fillStyle = '#ff2a2a';
  ctx.fillRect(0, 1760, 1080, 6);
  ctx.fillStyle = '#ffffff';
  ctx.font = `36px ${PS}`;
  ctx.fillText(C.cta, 540, 1830);
  ctx.fillStyle = '#c0c0c0';
  ctx.font = `46px ${VT}`;
  ctx.fillText(`${EP.dateLabel}${EP.indicative ? ' (' + TEXTS.campaign.indicative + ')' : ''}  //  ${EP.siteUrl}`, 540, 1884);
  return c;
}

// Opens the native share sheet with the card, or downloads it where sharing files is unsupported.
export async function shareResult(result) {
  const canvas = buildCard(result);
  const pct = Math.round(result.odPeak);
  const url = location.origin + location.pathname;
  const text = TEXTS.campaign.shareText(pct, url);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const file = new File([blob], 'overdrive-infezione.png', { type: 'image/png' });
  track('share', { rank: rank(result) });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text, url });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ text, url });
      return 'shared';
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled';
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'overdrive-infezione.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
