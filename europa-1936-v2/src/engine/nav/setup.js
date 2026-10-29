// Počáteční námořnictvo: hlavní flotila v domovské oblasti, transportní lodě v rezervě.
import { NAVY_NATIONAL, SHIP_IDS } from '../../data/navy/index.js';
import { homeSea, powerOf } from './core.js';

export function createNav(w, state) {
  const n = w.owners.length;
  const pool = Array.from({ length: n }, (_, o) => (o ? Object.fromEntries(SHIP_IDS.map((s) => [s, 0])) : null));
  const fleets = [null];
  for (let o = 1; o < n; o++) {
    const def = NAVY_NATIONAL[w.owners[o].tag];
    if (!def) continue;
    pool[o].tr = def.ships.tr || 0;
    const ships = {};
    let any = false;
    for (const s of SHIP_IDS) if (s !== 'tr' && def.ships[s]) { ships[s] = def.ships[s]; any = true; }
    const home = homeSea(state, o);
    if (any && home) fleets.push({ o, nm: 'Hlavní flotila', p: home.sea, ships, c: {}, mx: powerOf(ships).hp, to: 0, path: [], prog: 0 });
    else for (const s in ships) pool[o][s] += ships[s];
  }
  return { ver: 0, fn: fleets.length - 1, fleets, pool, sail: [], cv: new Array(n).fill(0) };
}
