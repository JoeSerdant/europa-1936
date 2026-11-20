// Konec války v Evropě (F3): průběh posledních let – každých 15 dní od `FROM` (výchozí den 3000 ≈ 3/1944) podíl území Německa v rukou
// nepřátel, hlavní město, kdo drží předválečné německé provincie, počty divizí a kapitulace. Výstup sim/out/endwar-<semínko>.txt.
// Stav ve dni `FROM` se uloží do sim/out/snap-endwar-<semínko>.json a příští běh z něj začne (SNAP=0 vynutí nový běh od roku 1936).
import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getWorld, vpHeld, divisionCount, advance, packGame, unpackGame } from '../src/engine/index.js';
import { env, simulate, writeReport, dateOf, tagOf } from './run.js';

it('konec války', () => {
  const cfg = env(), w = getWorld(), G = w.ownerIdx.GER, FROM = +(process.env.FROM || 3000), END = +(process.env.END || 3500);
  const out = [`Konec války: semínko ${cfg.seed}${cfg.hist ? '' : ' (volná historie)'}`];
  const file = path.join(process.cwd(), 'sim', 'out', `snap-endwar-${cfg.seed}${cfg.hist ? '' : '-nohist'}-${FROM}.json`);
  let s = process.env.SNAP !== '0' && fs.existsSync(file) ? unpackGame(JSON.parse(fs.readFileSync(file, 'utf8'))).state : null;
  if (!s) { s = simulate(cfg, FROM); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(packGame(s))); }
  for (let d = FROM; d <= END; d++) {
    if (d > FROM) s = advance(s, 24);
    if (s.log.items.some((e) => e.k === 'cap' && e.o === G) || s.dip.cap[G]) { out.push(`${dateOf(s)}: Německo kapitulovalo (den ${d})`); break; }
    if (d % 15 !== 0) continue;
    const h = vpHeld(s, G);
    const by = new Map();
    let orig = 0;
    for (let p = 1; p <= w.L; p++) if (w.provOwner0[p] === G) { orig++; if (s.ctrl[p] !== G) by.set(s.ctrl[p], (by.get(s.ctrl[p]) || 0) + 1); }
    const who = [...by].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${tagOf(c)} ${n}`).join(', ') || '–';
    out.push(`${dateOf(s)} (den ${d}): nepřítel drží ${(h.share * 100).toFixed(0)} % bodů, hl. město ${h.capHeld ? 'ztraceno' : 'drží'}; předválečné Německo (${orig}): ${who}; divize GER ${divisionCount(s, 'GER')}, SOV ${divisionCount(s, 'SOV')}, ENG ${divisionCount(s, 'ENG')}`);
  }
  writeReport(`endwar${process.env.LABEL ? '-' + process.env.LABEL : ''}`, cfg, out);
  expect(out.length).toBeGreaterThan(1);
});
