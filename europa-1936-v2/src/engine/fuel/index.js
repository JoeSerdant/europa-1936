// Palivo (M73): každá země má zásobu paliva `state.ind.fuel[o] = { s (zásoba), r (poměr pokrytí spotřeby minulého dne 0–1), g (výroba za den), u (spotřeba za den) }`.
// Výroba = přebytek ropy (těžba + dovoz − vývoz − spotřeba výroby výzbroje) × `PER_OIL` + základ za továrny; spotřebují ho motorizované a tankové divize
// (v pohybu a v boji naplno, jinak `IDLE`), letectvo na misích a flotily v pohybu. Při nedostatku (`r` < 1) klesá rychlost a útok motorizovaných divizí,
// síla letectva a rychlost flotil. Čisté funkce nad stavem, denní krok volá `industryDay`.
import { getWorld } from '../world.js';
import { statsOf } from '../army/unit.js';
import { modsOf } from '../research/core.js';
import { FUEL } from './constants.js';

export { FUEL } from './constants.js';

/** Počáteční zásoby paliva všech zemí. */
export function createFuel(w) {
  return Array.from({ length: w.owners.length }, (_, o) => (o ? { s: FUEL.START, r: 1, g: 0, u: 0 } : null));
}

/** Poměr pokrytí spotřeby paliva země `o` (0–1); 1 = bez nedostatku. */
export const fuelRatio = (state, o) => (state.ind && state.ind.fuel && state.ind.fuel[o] ? state.ind.fuel[o].r : 1);

/** Násobek síly letectva podle paliva. */
export const fuelAirMult = (state, o) => 1 - FUEL.AIR_PEN * (1 - fuelRatio(state, o));

/** Násobek rychlosti flotil podle paliva. */
export const fuelNavMult = (state, o) => 1 - FUEL.NAV_PEN * (1 - fuelRatio(state, o));

/** Spotřeba paliva všech zemí za den (pole podle země): divize, křídla na misích, flotily v pohybu. */
export function fuelUse(state) {
  const nO = getWorld().owners.length, use = new Float64Array(nO);
  const divs = state.mil.divs;
  for (let id = 1; id < divs.length; id++) {
    const d = divs[id];
    if (!d) continue;
    const st = statsOf(state.mil, d);
    if (st.fuel) use[d.o] += st.fuel * (d.b || d.path.length ? 1 : FUEL.IDLE);
  }
  if (state.air) for (const wg of state.air.wings) if (wg && wg.m) use[wg.o] += FUEL.AIR * wg.n;
  if (state.nav) {
    for (const f of state.nav.fleets) {
      if (!f || !f.path.length) continue;
      let n = 0;
      for (const k in f.ships) n += f.ships[k];
      use[f.o] += FUEL.SHIP * n;
    }
  }
  return use;
}

/** Denní krok: výroba, spotřeba a poměr pokrytí. `oil[o]` = přebytek ropy za den, `tally` = souhrn továren zemí. */
export function fuelDay(state, oil, tally) {
  const cur = state.ind.fuel;
  if (!cur) return state;
  const use = fuelUse(state), fuel = cur.slice();
  for (let o = 1; o < fuel.length; o++) {
    const f = cur[o];
    if (!f) continue;
    const gain = (FUEL.PER_OIL * Math.max(0, oil[o] || 0) + FUEL.BASE * (tally[o].civ + tally[o].mil)) * (1 + modsOf(state, o).fuel);   // M82: syntetické palivo (technologie)
    const avail = f.s + gain, u = use[o];
    const r = u > 1e-9 ? Math.min(1, avail / u) : 1;
    const s = Math.min(Math.max(FUEL.CAP_MIN, FUEL.CAP_DAYS * gain), Math.max(0, avail - u));
    fuel[o] = { s, r, g: gain, u };
  }
  return { ...state, ind: { ...state.ind, fuel } };
}

/** Přehled paliva země pro rozhraní: zásoba, kapacita, výroba, spotřeba, poměr a dny do vyčerpání při schodku. */
export function fuelOf(state, o) {
  const f = state.ind.fuel[o] || { s: 0, r: 1, g: 0, u: 0 };
  const cap = Math.max(FUEL.CAP_MIN, FUEL.CAP_DAYS * f.g);
  const deficit = f.u - f.g;
  return { stock: f.s, cap, gain: f.g, use: f.u, ratio: f.r, days: deficit > 1e-9 ? f.s / deficit : Infinity, low: f.u > 1e-9 && f.r < FUEL.LOW };
}
