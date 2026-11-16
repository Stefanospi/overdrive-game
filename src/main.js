import Phaser from 'phaser';
import { W, H, PARAMS } from './config.js';
import { CrtFX } from './fx.js';
import { Boot } from './scenes/Boot.js';
import { Play } from './scenes/Play.js';
import { End } from './scenes/End.js';
import { Story } from './scenes/Story.js';
import { Hub } from './scenes/Hub.js';
import { Board } from './scenes/Board.js';
import { Calibrate } from './scenes/Calibrate.js';
import { Lang } from './scenes/Lang.js';
import { HowTo } from './scenes/HowTo.js';
import { hasLang } from './texts.js';
import { initAnalytics } from './campaign.js';

// The first scene in the list starts automatically; ?scene= picks another (debug).
// First visit: choose the language before anything else loads.
const debug = { play: Play, end: End, story: Story, hub: Hub, board: Board, calibrate: Calibrate, howto: HowTo }[PARAMS.get('scene')];
const first = debug || (hasLang() ? Boot : Lang);
const scenes = [first, ...[Lang, Boot, Story, Play, End, Hub, Board, Calibrate, HowTo].filter((s) => s !== first)];
initAnalytics();

const start = () => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#0b0507',
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    pipeline: { CrtFX },
    scene: scenes,
  });
  window.__overdrive = game; // handy for debugging in the browser console
  return game;
};

// Wait for the pixel fonts so Phaser text does not render with a fallback.
const fonts = [document.fonts.load("16px 'Press Start 2P'"), document.fonts.load('24px VT323')];
Promise.race([Promise.all(fonts), new Promise((r) => setTimeout(r, 2500))]).then(start, start);
