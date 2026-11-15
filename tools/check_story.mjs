// Story rules checker.   node tools/check_story.mjs [--audit]    (npm run check:story)
//
// Fails (exit 1) when a text breaks the writing rules of the story. With --audit it prints
// every panel and giant word as a table instead of only the violations.
//
// Rules
//   - at most 8 words per story panel (one line per panel)
//   - giant in-game words: at most 2 words
//   - speaker labels: only the names in TEXTS.names
//   - system errors start with "Errore NNN: " (e.g. "Errore 140: gioia non autorizzata.")
//   - the fake decree of Gabriel is N.139 (never 141)
//   - endings <level>_high / _mid / _low: 6-8 / 4-5 / 4 panels, and a 3-word status panel
//     (no speaker) closes them. The boss endings (BOSS_LEVELS) close on a Mars line and
//     carry the status panel just before it.
import { LANGS } from '../src/texts.js';

const BOSS_LEVELS = ['server'];
const ALLOWED_LABELS = {
  it: ['MARS', 'ADRIANA.EXE', 'GABRIEL.EXE', 'IL MINISTRO', 'QUIETE.SYS', 'DECRETO N.140'],
  en: ['MARS', 'ADRIANA.EXE', 'GABRIEL.EXE', 'THE MINISTER', 'QUIETE.SYS', 'DECREE NO.140'],
};
const COUNTS = { high: [6, 8], mid: [4, 5], low: [4, 4] };
const MAX_WORDS = 8;
const MAX_GIANT = 2;

const words = (t) => (t.match(/\S+/g) || []).length;
const audit = process.argv.includes('--audit');
const rows = [];
const bad = [];

for (const [code, TEXTS] of Object.entries(LANGS)) {
  const flag = (id, msg) => bad.push(`[${code}] ${id}: ${msg}`);
  check(code, TEXTS, flag);
}

function check(code, TEXTS, flag) {
  for (const [label, name] of Object.entries(TEXTS.names)) {
    if (!ALLOWED_LABELS[code].includes(name)) flag(`names.${label}`, `label "${name}" is not allowed`);
  }
  
  for (const [cid, ch] of Object.entries(TEXTS.story)) {
    if (!ch || !ch.panels) continue;
    const ending = cid.match(/^(\w+)_(high|mid|low)$/);
    const boss = ending && BOSS_LEVELS.includes(ending[1]);
    ch.panels.forEach((p, i) => {
      const id = `${cid}#${i + 1}`;
      const n = words(p.text);
      const issues = [];
      if (n > MAX_WORDS) issues.push(`${n} words (max ${MAX_WORDS})`);
      if (/\b141\b/.test(p.text)) issues.push('"141": the forged decree is N.139');
      if (/^Err(ore|or)/.test(p.text) && !/^Err(ore|or) \d+: /.test(p.text)) issues.push('error format: "Errore NNN: <cosa>."');
      if (p.who && !TEXTS.names[p.who]) issues.push(`unknown speaker "${p.who}"`);
      issues.forEach((m) => flag(id, m));
      rows.push([`${code}:${id}`, p.who || (p.caption ? 'narr' : '-'), n, p.text, issues.join('; ')]);
    });
    if (ending) {
      const [lo, hi] = COUNTS[ending[2]];
      const len = ch.panels.length;
      if (len < lo || len > hi) flag(cid, `${len} panels (expected ${lo}-${hi})`);
      const at = boss ? len - 2 : len - 1;
      const st = ch.panels[at];
      if (!st || st.who || words(st.text) !== 3) flag(`${cid}#${at + 1}`, 'the closing status must be 3 words and have no speaker');
      if (boss && ch.panels[len - 1].who !== 'mars') flag(`${cid}#${len}`, 'the boss ending closes on a Mars line (payload)');
    }
  }
  
  // giant words of the boss fight (events, not bars)
  const B = TEXTS.boss;
  for (const w of [...Object.values(B.words).flat(), ...B.phaseDown, B.ko].filter(Boolean)) {
    const n = words(w);
    const issues = n > MAX_GIANT ? [`${n} words (max ${MAX_GIANT})`] : [];
    issues.forEach((m) => flag(`boss.words "${w}"`, m));
    rows.push([`${code}:boss.words`, 'giant', n, w, issues.join('; ')]);
  }

  for (const [lid, list] of Object.entries(TEXTS.script)) {
    list.forEach((w, i) => {
      const id = `script.${lid}[bar ${w.bar}]`;
      const n = words(w.word);
      const issues = n > MAX_GIANT ? [`${n} words (max ${MAX_GIANT})`] : [];
      issues.forEach((m) => flag(id, m));
      rows.push([`${code}:${id}`, 'giant', n, w.word, issues.join('; ')]);
    });
  }
}

if (audit) {
  console.log('id | who | words | text | problem');
  rows.forEach((r) => console.log(r.join(' | ')));
  console.log(`\n${rows.length} entries, ${bad.length} problems`);
} else if (bad.length) {
  console.log(bad.join('\n'));
  console.log(`\n${bad.length} violation(s)`);
} else {
  console.log(`story rules OK (${rows.length} entries)`);
}
process.exit(bad.length ? 1 : 0);
