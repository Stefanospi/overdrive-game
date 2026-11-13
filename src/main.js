import Phaser from 'phaser';
import { W, H } from './config.js';
import { Boot } from './scenes/Boot.js';
import { Dub } from './scenes/Dub.js';
import { End } from './scenes/End.js';

const start = () => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#0b0507',
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 1 },
    scene: [Boot, Dub, End],
  });
  window.__overdrive = game; // handy for debugging in the browser console
  return game;
};

// Wait for the pixel fonts so Phaser text does not render with a fallback.
const fonts = [document.fonts.load("16px 'Press Start 2P'"), document.fonts.load('24px VT323')];
Promise.race([Promise.all(fonts), new Promise((r) => setTimeout(r, 2500))]).then(start, start);
