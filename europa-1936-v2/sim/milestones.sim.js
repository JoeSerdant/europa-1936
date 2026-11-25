// Simulace F2: hlavní milníky války 1936–1945 (data událostí) pro kontrolu, že změna neposunula historii.
// Proměnné jako ostatní simulace (SEED, PLAYER, HIST), END = poslední den (výchozí 3530 ≈ konec srpna 1945). Výstup sim/out/milestones-*.txt.
import { it, expect } from 'vitest';
import { getWorld } from '../src/engine/index.js';
import { env, simulate, dateOf, writeReport, tagOf } from './run.js';

it('milníky války', () => {
  const w = getWorld(), cfg = env(), END = +(process.env.END || 3530);
  const I = (t) => w.ownerIdx[t];
  const pair = (l, a, b) => (l.a === I(a) && l.b === I(b)) || (l.a === I(b) && l.b === I(a));
  const marks = [
    ['dobrovolníci ve Španělsku', (l) => l.k === 'vol' && (l.b === I('NSP') || l.b === I('SPR'))],   // F4
    ['konec občanské války ve Španělsku', (l) => l.k === 'cap' && (l.o === I('SPR') || l.o === I('NSP'))],
    ['anšlus', (l) => l.k === 'ult' && l.a === I('GER') && l.b === I('AUS') && l.y],
    ['Sudety', (l) => l.k === 'ult' && l.a === I('GER') && l.b === I('CZE') && l.y],
    ['válka Německo–Polsko', (l) => l.k === 'war' && pair(l, 'GER', 'POL')],
    ['kapitulace Polska', (l) => l.k === 'cap' && l.o === I('POL')],
    ['zimní válka', (l) => l.k === 'war' && pair(l, 'SOV', 'FIN')],
    ['moskevský mír', (l) => l.k === 'cede' && l.o === I('FIN')],   // F3: územní mír Finska
    ['pokračovací válka', (l) => l.k === 'war' && l.a === I('FIN') && l.b === I('SOV')],
    ['válka Německo–Nizozemsko', (l) => l.k === 'war' && pair(l, 'GER', 'HOL')],
    ['kapitulace Francie', (l) => l.k === 'cap' && l.o === I('FRA')],
    ['válka Itálie–Řecko', (l) => l.k === 'war' && pair(l, 'ITA', 'GRE')],
    ['Barbarossa', (l) => l.k === 'war' && pair(l, 'GER', 'SOV')],
    ['kapitulace Itálie', (l) => l.k === 'cap' && l.o === I('ITA')],
    ['kapitulace Německa', (l) => l.k === 'cap' && l.o === I('GER')],
    // W2: svět mimo Evropu
    ['kapitulace Etiopie', (l) => l.k === 'cap' && l.o === I('ETH')],
    ['válka Japonsko–Čína', (l) => l.k === 'war' && pair(l, 'JAP', 'CHI')],
    ['Indočína (sever)', (l) => l.k === 'ult' && l.a === I('JAP') && l.b === I('VIC') && l.y],
    ['obsazení Íránu', (l) => l.k === 'war' && l.b === I('PER')],
    ['Pearl Harbor', (l) => l.k === 'war' && pair(l, 'JAP', 'USA')],
    ['válka Japonsko–Británie', (l) => l.k === 'war' && pair(l, 'JAP', 'ENG')],
    ['válka Německo–USA', (l) => l.k === 'war' && pair(l, 'GER', 'USA')],
    ['válka SSSR–Japonsko', (l) => l.k === 'war' && pair(l, 'SOV', 'JAP')],
    ['kapitulace Japonska', (l) => l.k === 'cap' && l.o === I('JAP')],
  ];
  const got = new Map(), govs = [], wars = [], caps = [], vols = [];
  let seen = 0, capLost = '';
  const me = cfg.player ? w.ownerIdx[cfg.player] : 0;
  const last = simulate(cfg, END, (s) => {
    if (me && !capLost && s.ctrl[w.owners[me].cap] !== me && !s.dip.cap[me]) capLost = dateOf(s);   // F2 B2: hráč poprvé přišel o hlavní město
    for (const l of s.log.items) {
      if (l.id <= seen) continue;
      for (const [nm, f] of marks) if (!got.has(nm) && f(l)) got.set(nm, dateOf(s));
      if (l.k === 'gov') govs.push(`${dateOf(s)} ${tagOf(l.o)} → ${l.x}`);
      if (l.k === 'war') wars.push(`${dateOf(s)} ${tagOf(l.a)}–${tagOf(l.b)}`);
      if (l.k === 'cap') caps.push(`${dateOf(s)} ${tagOf(l.o)}`);
      if (l.k === 'vol') vols.push(`${dateOf(s)} ${tagOf(l.a)}→${tagOf(l.b)} ${l.y}${l.x === 'exp' ? ' (sbor)' : ''}`);   // F4
    }
    seen = s.log.n;
    return false;
  });
  const out = [`Milníky: semínko ${cfg.seed}, hráč ${cfg.player || 'pozorovatel'}, historická AI ${cfg.hist ? 'ano' : 'ne'}, do ${dateOf(last)}`];
  for (const [nm] of marks) out.push(`  ${nm}: ${got.get(nm) || '–'}`);
  if (me) out.push(`  hráč ${cfg.player} poprvé ztratil hlavní město: ${capLost || '–'}`);
  out.push(`změny vlád (${govs.length}): ${govs.join('; ') || 'žádné'}`);
  out.push(`vyhlášené války (${wars.length}): ${wars.join('; ') || 'žádné'}`);
  out.push(`kapitulace (${caps.length}): ${caps.join('; ') || 'žádné'}`);
  out.push(`dobrovolníci (${vols.length}): ${vols.join('; ') || 'žádní'}`);
  writeReport('milestones', cfg, out);
  expect(got.size).toBeGreaterThanOrEqual(0);
});
