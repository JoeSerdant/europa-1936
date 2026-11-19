// Kontrola shody výsledků (F2 A2): otisk celého herního stavu po několika úsecích hry. Optimalizace výkonu nesmí otisk změnit.
// Úseky: od roku 1936 (400 dní, mír a příprava), červen 1941 (začátek Barbarossy) a listopad 1941 (~1000 divizí) – po 15 dnech.
// Snímky stavů bere ze `sim/out/` (vytvoří je `npm run sim -- perf` s DAY=2000 a DAY=2160). Výstup sim/out/hash-<LABEL>.txt.
import { it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createGame, unpackGame, advance } from '../src/engine/index.js';

/** FNV-1a nad textem (32 bitů, hex). */
function fnv(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

it('otisky stavu', () => {
  const dir = path.join(process.cwd(), 'sim', 'out');
  const load = (f) => unpackGame(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).state;
  const cases = [
    ['1936 + 400 dní', () => createGame({ player: null, aiLevel: 2, seed: 7 }), 400],
    ['hráč GER 1936 + 200 dní', () => createGame({ player: 'GER', aiLevel: 2, seed: 3 }), 200],
    ['červen 1941 (semínko 7) + 15 dní', () => load('snap-7-2000.json'), 15],
    ['listopad 1941 (semínko 7) + 15 dní', () => load('snap-7-2160.json'), 15],
    ['listopad 1941 (semínko 42) + 15 dní', () => load('snap-42-2160.json'), 15],
  ];
  const out = [];
  for (const [nm, make, days] of cases) {
    const t0 = performance.now();
    const { v, ...s } = advance(make(), 24 * days);   // bez čísla verze hry (zvedá se se změnou tvaru stavu, průběh nemění)
    void v;
    out.push(`${nm}: ${fnv(JSON.stringify(s))} (${((performance.now() - t0) / days).toFixed(1)} ms/den)`);
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `hash-${process.env.LABEL || 'x'}.txt`), out.join('\n') + '\n');
  expect(out).toHaveLength(cases.length);
});
