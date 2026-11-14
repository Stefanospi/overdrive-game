// Per-device settings and progress, kept in localStorage. Every access is wrapped:
// private windows and blocked storage must not break the game.
const KEY = 'overdrive.v1';
let data = {};
try {
  data = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
} catch (e) {
  data = {};
}

export const settings = {
  get(key, fallback) {
    return data[key] === undefined ? fallback : data[key];
  },
  set(key, value) {
    data[key] = value;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      /* storage unavailable: the value lives for this session only */
    }
  },
};

// Reduced effects: no colour inversion, no strobing, no camera shake, softer glitch.
export const reducedFx = () => !!settings.get('reduced', false);

// Extra latency compensation in ms, set by the calibration screen.
export const calibration = () => Number(settings.get('offsetMs', 0)) || 0;
