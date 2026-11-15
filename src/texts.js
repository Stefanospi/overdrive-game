// Entry point for every word on screen. The texts themselves live in texts.it.js and
// texts.en.js (same shape). `TEXTS` is one object whose contents are swapped when the
// language changes, so `import { TEXTS }` stays valid everywhere: read it at use time
// (inside create(), never in a module-level constant) and the right language comes out.
import { settings } from './settings.js';
import it from './texts.it.js';
import en from './texts.en.js';

export { EGG, FORGER, CREW } from './names.js';
export const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const LANGS = { it, en };
export const TEXTS = {};
let current = 'it';

// Language of the browser, used until the player chooses one.
export function guessLang() {
  const nav = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  return /^it/i.test(nav) ? 'it' : 'en';
}

export const lang = () => current;
export const hasLang = () => !!LANGS[settings.get('lang', '')];

// Switches the language. `save` remembers the choice on this device.
export function setLang(code, save = true) {
  current = LANGS[code] ? code : 'it';
  for (const k of Object.keys(TEXTS)) delete TEXTS[k];
  Object.assign(TEXTS, LANGS[current]);
  if (typeof document !== 'undefined') document.documentElement.lang = current;
  if (save) settings.set('lang', current);
}

setLang(hasLang() ? settings.get('lang') : guessLang(), false);
