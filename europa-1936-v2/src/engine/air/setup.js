// Počáteční letectvo (M30): letiště ve státech s nejvíc vítěznými body a křídla podle dat zemí. `ind` je čerstvý a upravuje se (letiště).
import { COUNTRIES } from '../../data/countries.js';
import { AIR_NATIONAL, AIR_TIER, PLANE_IDS } from '../../data/air/planes.js';
import { apportion } from '../industry/setup.js';
import { AIR } from './constants.js';

export function createAir(w, ind) {
  const n = w.owners.length;
  const wings = [null];
  const pool = Array.from({ length: n }, (_, o) => (o ? Object.fromEntries(PLANE_IDS.map((t) => [t, 0])) : null));
  const vpOf = (s) => w.states[s].v.reduce((a, p) => a + w.vp[p], 0);
  for (let o = 1; o < n; o++) {
    const tag = w.owners[o].tag;
    const def = AIR_NATIONAL[tag] || AIR_TIER[COUNTRIES[tag]?.tier ?? 3];
    const total = PLANE_IDS.reduce((a, t) => a + (def[t] || 0), 0);
    const list = [];
    for (let s = 1; s < w.states.length; s++) if (w.stateOwner0[s] === o) list.push(s);
    if (!total || !list.length) continue;
    list.sort((a, b) => vpOf(b) - vpOf(a) || w.states[b].p - w.states[a].p || a - b);
    // letiště: nejdřív ve státech s nejvíc vítěznými body, dokud kapacita nestačí
    const bases = [];
    let cap = 0;
    for (const s of list) {
      if (cap >= total * 1.15) break;
      const lvl = Math.min(AIR.BASE_MAX, Math.max(1, Math.ceil((total * 1.15 - cap) / AIR.PER_LEVEL)));
      ind.st[s].afb = lvl;
      bases.push({ s, cap: lvl * AIR.PER_LEVEL });
      cap += lvl * AIR.PER_LEVEL;
    }
    // křídla: každý druh se rozdělí na letiště podle kapacity
    for (const t of PLANE_IDS) {
      if (!def[t]) continue;
      const got = apportion(bases.map((b) => b.cap), def[t], bases.map((b) => b.cap));
      bases.forEach((b, i) => {
        if (got[i] > 0) wings.push({ id: wings.length, o, t, n: got[i], s: b.s, m: null, to: 0, c: 0 });
      });
      const left = def[t] - got.reduce((a, b) => a + b, 0);
      if (left > 0) pool[o][t] += left;
    }
  }
  // stíhači hlídají nad vlastním státem
  for (const wg of wings) if (wg && wg.t === 'sti') { wg.m = 'air'; wg.to = wg.s; }
  return { ver: 0, wn: wings.length - 1, wings, pool, sup: {} };
}
