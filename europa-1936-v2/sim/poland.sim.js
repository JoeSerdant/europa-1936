// Simulace F2 A1: kapitulace Polska a jeho války a spojenci 1 rok a 5 let poté.
// Ověřuje u všech loutek, že nikdy neválčí se spojenci z doby své kapitulace (`dip.ally0`), vypíše stav Polska a hlavní milníky války (END = poslední den, výchozí 3500 ≈ srpen 1945).
import { it, expect } from 'vitest';
import { getWorld, exileHost, overlordOf } from '../src/engine/index.js';
import { enemiesOf } from '../src/engine/army/war.js';
import { env, simulate, tagOf, dateOf, writeReport } from './run.js';

it('Polsko po kapitulaci', () => {
  const w = getWorld(), POL = w.ownerIdx.POL, cfg = env();
  const out = [`Simulace: semínko ${cfg.seed}, hráč ${cfg.player || 'žádný (pozorovatel)'}, historická AI ${cfg.hist ? 'ano' : 'ne'}`];
  const bad = [];
  let fell = 0;
  const report = (s, label) => {
    const fac = s.dip.facs[s.dip.fac[POL]];
    out.push(`${label} (${dateOf(s)}): pán ${tagOf(overlordOf(s, POL))}, exilová vláda u ${tagOf(exileHost(s, POL))}, blok ${fac ? tagOf(fac.ldr) : '-'}, `
      + `války [${enemiesOf(s.mil, POL).map(tagOf).join(', ')}], spojenci z doby pádu [${(s.dip.ally0[POL] || []).map(tagOf).join(', ')}], států ${s.stateOwner.filter((x) => x === POL).length}`);
  };
  // hlavní milníky války (kontrola, že oprava neposunula historii)
  const W = (t) => w.ownerIdx[t];
  const marks = [
    ['kapitulace Francie', (l) => l.k === 'cap' && l.o === W('FRA')],
    ['vznik Vichy', (l) => l.k === 'release' && l.x === W('VIC')],
    ['Barbarossa (Německo–SSSR)', (l) => l.k === 'war' && ((l.a === W('GER') && l.b === W('SOV')) || (l.a === W('SOV') && l.b === W('GER')))],
    ['kapitulace Itálie', (l) => l.k === 'cap' && l.o === W('ITA')],
    ['kapitulace Německa', (l) => l.k === 'cap' && l.o === W('GER')],
    ['obnova Polska', (l) => l.k === 'restore' && l.o === POL],
  ];
  const seenMark = new Set();
  let seenLog = 0;
  const END = +(process.env.END || 3500);
  simulate(cfg, 4000, (s, d) => {
    for (const l of s.log.items) {
      if (l.id <= seenLog) continue;
      for (const [nm, f] of marks) if (!seenMark.has(nm) && f(l)) { seenMark.add(nm); out.push(`  ${nm}: ${dateOf(s)}`); }
    }
    seenLog = s.log.n;
    if (d % 30 === 0) {   // všechny loutky: žádná válka se spojenci z doby kapitulace
      for (let o = 1; o < w.owners.length; o++) {
        const l = s.dip.ally0[o];
        if (!l || !overlordOf(s, o)) continue;
        for (const e of enemiesOf(s.mil, o)) if (l.includes(e)) bad.push(`${dateOf(s)} loutka ${tagOf(o)} válčí s bývalým spojencem ${tagOf(e)}`);
      }
    }
    if (!fell && s.log.items.some((l) => l.k === 'cap' && l.o === POL)) { fell = d; report(s, 'Kapitulace Polska'); }
    if (fell && d === fell + 365) report(s, 'Po 1 roce');
    if (fell && d === fell + 5 * 365) report(s, 'Po 5 letech');
    if (d >= END && fell && d >= fell + 5 * 365) { report(s, 'Konec simulace'); return true; }
    return false;
  });
  out.push(bad.length ? `CHYBY (${bad.length}):\n  ${bad.slice(0, 20).join('\n  ')}` : 'Žádná loutka neválčí se svými bývalými spojenci.');
  writeReport('poland', cfg, out);
  expect(fell).toBeGreaterThan(0);
  expect(bad).toEqual([]);
});
