// Leaderboard client. Talks to the Cloudflare Worker in /worker; without API_URL
// it degrades to "local record only" and the Board scene says so.
import { API_URL, track } from './campaign.js';
import { settings } from './settings.js';

export const online = () => !!API_URL;

export async function fetchBoard(level) {
  if (!API_URL) return null;
  try {
    const r = await fetch(`${API_URL}/board?level=${encodeURIComponent(level)}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return j.rows || [];
  } catch (e) {
    return null;
  }
}

function deviceId() {
  let id = settings.get('deviceId', '');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    settings.set('deviceId', id);
  }
  return id;
}

// result: the End scene's result object. extra: { nick, contact, consent }.
export async function submitScore(result, extra) {
  if (!API_URL || result.auto) return { ok: false, reason: 'offline' };
  const body = {
    level: result.level,
    score: result.score,
    maxCombo: result.maxCombo,
    counts: result.counts,
    total: result.total,
    odPeak: Math.round(result.odPeak),
    nick: extra.nick,
    contact: extra.consent ? extra.contact || '' : '',
    consent: !!extra.consent,
    device: deviceId(),
  };
  try {
    const r = await fetch(`${API_URL}/score`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) track('board_submit', { level: result.level });
    return { ok: r.ok, rank: j.rank, reason: j.error };
  } catch (e) {
    return { ok: false, reason: 'network' };
  }
}
