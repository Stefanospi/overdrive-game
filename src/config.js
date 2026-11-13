// Logical size is 390x844 (a phone in portrait). K renders the canvas at 2x
// so text and shapes stay sharp on hi-dpi screens. Always write sizes as px(n).
export const K = 2;
export const W = 390 * K;
export const H = 844 * K;
export const px = (n) => n * K;

export const COLORS = {
  bg: 0x0b0507,
  red: 0xff2a2a,
  redSoft: 0xff7a7a,
  redDark: 0xb8121a,
  silver: 0xc0c0c0,
  paper: 0xf4f1ea,
  ink: 0x15121a,
  white: 0xffffff,
};

export const FONT_PS = "'Press Start 2P', monospace";
export const FONT_VT = "VT323, monospace";
