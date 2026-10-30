// Společné pomůcky diplomacie (M23): vztahy, bloky, válečné skóre, držené body území.
import { getWorld } from '../world.js';
import { COUNTRIES } from '../../data/countries.js';
import { IDEO_REL, PAIR_REL } from '../../data/dip/index.js';
import { atWar, enemiesOf } from '../army/war.js';

export const pairKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const baseCache = new Map();

/** Základ vztahu dvou zemí: ideologie + historická tabulka (bez uložených změn). */
export function baseRel(a, b) {
  const k = pairKey(a, b);
  let v = baseCache.get(k);
  if (v != null) return v;
  const w = getWorld();
  const ta = w.owners[a].tag, tb = w.owners[b].tag;
  const ia = COUNTRIES[ta]?.ideology, ib = COUNTRIES[tb]?.ideology;
  v = (IDEO_REL[ia]?.[ib] ?? IDEO_REL[ib]?.[ia] ?? 0);
  for (const [x, y, d] of PAIR_REL) if ((x === ta && y === tb) || (x === tb && y === ta)) v += d;
  v = Math.max(-100, Math.min(100, v));
  baseCache.set(k, v);
  return v;
}

/** Vztah dvou zemí −100…100 (základ + uložená změna). */
export function relOf(state, a, b) {
  if (!a || !b || a === b) return 0;
  return Math.round(Math.max(-100, Math.min(100, baseRel(a, b) + (state.dip.rel[pairKey(a, b)] || 0))));
}

export const factionId = (state, o) => state.dip.fac[o] || 0;
export const factionOf = (state, o) => { const id = state.dip.fac[o]; return id ? { id, ...state.dip.facs[id] } : null; };
export const sameFaction = (state, a, b) => !!state.dip.fac[a] && state.dip.fac[a] === state.dip.fac[b];
/** Členové bloku země (nebo jen ona sama). */
export const campOf = (state, o) => { const f = state.dip.facs[state.dip.fac[o]]; return f ? f.mem.slice() : [o]; };

export const setRel = (rel, a, b, delta) => { const k = pairKey(a, b); const v = Math.max(-200, Math.min(200, (rel[k] || 0) + delta)); return { ...rel, [k]: v }; };

/** Podíl bodů území (vítězné body + 1 za provincii) země `o`, který drží nepřátelé země `o`. */
export function vpHeld(state, o) {
  const w = getWorld();
  let total = 0, held = 0, capHeld = false;
  for (let p = 1; p <= w.L; p++) {
    if (state.stateOwner[w.provState[p]] !== o) continue;
    const v = w.vp[p] + 1;
    total += v;
    const c = state.ctrl[p];
    if (c !== o && atWar(state.mil, c, o)) { held += v; if (p === w.owners[o].cap) capHeld = true; }
  }
  return { total, held, share: total ? held / total : 0, capHeld };
}

/** Válečné skóre `a` proti `b`: co drží `a` z `b` mínus co drží `b` z `a` (−1…1). */
export function warScore(state, a, b) {
  const w = getWorld();
  let ta = 0, ha = 0, tb = 0, hb = 0;
  for (let p = 1; p <= w.L; p++) {
    const own = state.stateOwner[w.provState[p]];
    if (own !== a && own !== b) continue;
    const v = w.vp[p] + 1;
    if (own === a) { ta += v; if (state.ctrl[p] === b) hb += v; } else { tb += v; if (state.ctrl[p] === a) ha += v; }
  }
  return (tb ? ha / tb : 0) - (ta ? hb / ta : 0);
}

export const hasCapitulated = (state, o) => !!state.dip.cap[o];
/** Rezervní země (M69), která ještě nevznikla nebo zanikla: nemá se ukazovat v seznamech ani nic dělat. */
export const isDormant = (state, o) => !!getWorld().owners[o].dyn && !!state.dip.cap[o];
export { enemiesOf, atWar };
