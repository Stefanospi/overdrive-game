// Progress kept on this device: best score per level and the EP "packets" (one per track).
import { settings } from './settings.js';
import { accuracy, rank } from './rank.js';

export const TOTAL_FRAGMENTS = 3; // one per chapter: FIREWALL, PROXY, SERVER

export const fragments = () => settings.get('fragments', []);

// A packet is earned by finishing a level with at least a "mid" result.
export function recordResult(result) {
  const tier = rank(result);
  const best = settings.get('best', {});
  const prev = best[result.level] || { score: 0 };
  const isBest = result.score > prev.score;
  if (isBest) {
    best[result.level] = { score: result.score, acc: accuracy(result), odPeak: Math.round(result.odPeak), maxCombo: result.maxCombo };
    settings.set('best', best);
  }
  let gotFragment = false;
  if (tier !== 'low') {
    const list = fragments();
    if (!list.includes(result.level)) {
      list.push(result.level);
      settings.set('fragments', list);
      gotFragment = true;
    }
  }
  return { tier, isBest, gotFragment, count: fragments().length };
}

export const bestOf = (level) => settings.get('best', {})[level] || null;
