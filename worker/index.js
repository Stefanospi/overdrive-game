// Leaderboard backend for OVERDRIVE.EXE: a Cloudflare Worker + one KV namespace.
//   GET  /board?level=<id>   top 50 { nick, score, acc }
//   POST /score              { level, nick, score, maxCombo, counts, total, odPeak, contact, consent, device }
// Contacts (for the prize) are stored apart under "contacts" and never returned by GET.
// Validation is plausibility only: a determined cheater can still fake a result, so
// check the winners by hand before sending a prize.

const LEVELS = { brazilian: { total: 110 } }; // keep in sync with src/levels.js (note count)
const MAX_PER_NOTE = 300 * 4 * 2; // best grade x max combo multiplier x root mode
const HOLD_BONUS = 150 * 4 * 2 * 20; // generous allowance for hold bonus and hold ticks
const TOP = 50;

const cors = (env) => ({
  'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
});
const json = (env, data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors(env) } });

const cleanNick = (s) => String(s || '').replace(/[^A-Za-z0-9 _.-]/g, '').trim().slice(0, 12);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });

    if (req.method === 'GET' && url.pathname === '/board') {
      const level = url.searchParams.get('level') || '';
      if (!LEVELS[level]) return json(env, { error: 'level' }, 400);
      const rows = JSON.parse((await env.BOARD.get('board:' + level)) || '[]');
      return json(env, { rows: rows.slice(0, TOP).map(({ nick, score, acc }) => ({ nick, score, acc })) });
    }

    if (req.method === 'POST' && url.pathname === '/score') {
      let b;
      try {
        b = await req.json();
      } catch (e) {
        return json(env, { error: 'json' }, 400);
      }
      const L = LEVELS[b.level];
      const nick = cleanNick(b.nick);
      if (!L || nick.length < 3) return json(env, { error: 'input' }, 400);
      const c = b.counts || {};
      const hits = (c.perfect | 0) + (c.good | 0) + (c.ok | 0);
      const maxScore = L.total * MAX_PER_NOTE + HOLD_BONUS;
      if (!Number.isFinite(b.score) || b.score < 0 || b.score > maxScore) return json(env, { error: 'score' }, 422);
      if (hits + (c.miss | 0) > L.total + 2 || (b.maxCombo | 0) > L.total) return json(env, { error: 'counts' }, 422);
      if (b.score > 0 && hits === 0) return json(env, { error: 'counts' }, 422);

      // one submission per device every 60 s (KV's minimum TTL)
      const rl = 'rl:' + String(b.device || req.headers.get('CF-Connecting-IP') || '').slice(0, 40);
      if (await env.BOARD.get(rl)) return json(env, { error: 'slow' }, 429);
      await env.BOARD.put(rl, '1', { expirationTtl: 60 });

      const key = 'board:' + b.level;
      const rows = JSON.parse((await env.BOARD.get(key)) || '[]');
      const acc = Math.round((hits / Math.max(1, L.total)) * 100);
      const i = rows.findIndex((r) => r.nick.toLowerCase() === nick.toLowerCase());
      if (i >= 0) {
        if (b.score > rows[i].score) rows[i] = { nick, score: b.score, acc, ts: Date.now() };
      } else {
        rows.push({ nick, score: b.score, acc, ts: Date.now() });
      }
      rows.sort((x, y) => y.score - x.score);
      const kept = rows.slice(0, 200);
      await env.BOARD.put(key, JSON.stringify(kept));

      if (b.consent && b.contact) {
        const contacts = JSON.parse((await env.BOARD.get('contacts')) || '{}');
        contacts[nick.toLowerCase()] = { contact: String(b.contact).slice(0, 80), ts: Date.now() };
        await env.BOARD.put('contacts', JSON.stringify(contacts));
      }
      return json(env, { ok: true, rank: kept.findIndex((r) => r.nick.toLowerCase() === nick.toLowerCase()) + 1 });
    }

    return json(env, { error: 'not found' }, 404);
  },
};
