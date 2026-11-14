// The game is 390 logical pixels wide. Its logical height follows the screen it
// starts on, so a phone is filled edge to edge whatever its aspect ratio (browser
// bars included). K renders the canvas at the device's pixel density, capped at
// 3x, so text and shapes stay sharp. Always write sizes as px(n), and place
// things relative to LH (or H), never to a fixed height.
const box = document.getElementById('game');
const vw = (box && box.clientWidth) || window.innerWidth;
const vh = (box && box.clientHeight) || window.innerHeight;

export const K = Math.min(3, Math.max(2, Math.ceil(window.devicePixelRatio || 1)));
export const LW = 390;
export const LH = vh > vw ? Math.round(Math.min(900, Math.max(620, (LW * vh) / vw))) : 844;
export const W = LW * K;
export const H = LH * K;
export const px = (n) => n * K;

export const COLORS = {
  bg: 0x0b0507,
  red: 0xff2a2a,
  redSoft: 0xff7a7a,
  redDark: 0xb8121a,
  redDeep: 0x2a080b,
  box: 0x0d0406,
  silver: 0xc0c0c0,
  grey: 0x404040,
  paper: 0xf4f1ea,
  ink: 0x15121a,
  white: 0xffffff,
};

export const FONT_PS = "'Press Start 2P', monospace";
export const FONT_VT = 'VT323, monospace';

// Debug switches from the URL, e.g. ?scene=play&auto&seek=64&offset=30
//   scene=play|end|story  skip straight to a scene (audio needs a user gesture on real browsers)
//   level=<id>      which level ?scene=play starts (see levels.js)
//   story=<id>      which chapter ?scene=story shows (see TEXTS.story)
//   auto            a bot plays every note
//   seek=<beats>    start the level from that beat
//   offset=<ms>     extra audio/visual latency compensation
export const PARAMS = new URLSearchParams(window.location.search);
