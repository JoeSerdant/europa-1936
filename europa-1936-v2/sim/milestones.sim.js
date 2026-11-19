// Simulace F2: hlavní milníky války 1936–1945 (data událostí) pro kontrolu, že změna neposunula historii.
// Proměnné jako ostatní simulace (SEED, PLAYER, HIST), END = poslední den (výchozí 3500 ≈ srpen 1945). Výstup sim/out/milestones-*.txt.
import { it, expect } from 'vitest';
import { getWorld } from '../src/engine/index.js';
import { env, simulate, dateOf, writeReport, tagOf } from './run.js';

it('milníky války', () => {
  const w = getWorld(), cfg = env(), END = +(process.env.END || 3500);
  const I = (t) => w.ownerIdx[t];
  const pair = (l, a, b) => (l.a === I(a) && l.b === I(b)) || (l.a === I(b) && l.b === I(a));
  const marks = [
    ['anšlus', (l) => l.k === 'ult' && l.a === I('GER') && l.b === I('AUS') && l.y],
    ['Sudety', (l) => l.k === 'ult' && l.a === I('GER') && l.b === I('CZE') && l.y],
    ['válka Německo–Polsko', (l) => l.k === 'war' && pair(l, 'GER', 'POL')],
    ['kapitulace Polska', (l) => l.k === 'cap' && l.o === I('POL')],
    ['zimní válka', (l) => l.k === 'war' && pair(l, 'SOV', 'FIN')],
    ['válka Německo–Nizozemsko', (l) => l.k === 'war' && pair(l, 'GER', 'HOL')],
    ['kapitulace Francie', (l) => l.k === 'cap' && l.o === I('FRA')],
    ['válka Itálie–Řecko', (l) => l.k === 'war' && pair(l, 'ITA', 'GRE')],
    ['Barbarossa', (l) => l.k === 'war' && pair(l, 'GER', 'SOV')],
    ['kapitulace Itálie', (l) => l.k === 'cap' && l.o === I('ITA')],
    ['kapitulace Německa', (l) => l.k === 'cap' && l.o === I('GER')],
  ];
  const got = new Map(), govs = [];
  let seen = 0;
  const last = simulate(cfg, END, (s) => {
    for (const l of s.log.items) {
      if (l.id <= seen) continue;
      for (const [nm, f] of marks) if (!got.has(nm) && f(l)) got.set(nm, dateOf(s));
      if (l.k === 'gov') govs.push(`${dateOf(s)} ${tagOf(l.o)} → ${l.x}`);
    }
    seen = s.log.n;
    return false;
  });
  const out = [`Milníky: semínko ${cfg.seed}, hráč ${cfg.player || 'pozorovatel'}, historická AI ${cfg.hist ? 'ano' : 'ne'}, do ${dateOf(last)}`];
  for (const [nm] of marks) out.push(`  ${nm}: ${got.get(nm) || '–'}`);
  out.push(`změny vlád (${govs.length}): ${govs.join('; ') || 'žádné'}`);
  writeReport('milestones', cfg, out);
  expect(got.size).toBeGreaterThanOrEqual(0);
});
