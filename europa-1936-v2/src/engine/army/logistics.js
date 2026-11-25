// S6: zásobování jako v HOI4 – lokomotivy (`vlaky`) a nákladní auta (`auta`) jsou výzbroj, kterou zásobování potřebuje, a postavená
// železnice (`ind.rail[p]`, provinční stavba `rail`) rozšiřuje železniční síť. Čisté funkce; tok počítá `supply.js`.
//  - potřeba: `SUP_TRAIN_PER_DIV` lokomotiv a `SUP_TRUCK_PER_DIV` aut na divizi země,
//  - pokrytí (0–1) = sklad / potřeba, zaokrouhlené po `SUP_LOG_STEP`: lokomotivy zeslabují tok po železnici k uzlům, auta šíření od zdrojů,
//  - za války se denně opotřebuje část potřeby (`SUP_TRAIN_WEAR`, `SUP_TRUCK_WEAR`).
import { getWorld } from '../world.js';
import { C } from './constants.js';
import { hasWar } from './war.js';
import { adjacency } from './geo.js';
import { editStock } from './ctx.js';

const counts = new WeakMap();   // pole divizí → počty divizí podle země

/** Počet divizí země `o` (mezipaměť podle pole divizí, které se při změně kopíruje). */
export function divCount(mil, o) {
  let c = counts.get(mil.divs);
  if (!c) {
    c = new Int32Array(getWorld().owners.length + 1);
    for (const d of mil.divs) if (d && d.o < c.length) c[d.o]++;
    counts.set(mil.divs, c);
  }
  return c[o] || 0;
}

/** Potřeba výzbroje zásobování země `o`: { trains, trucks } (kusy). */
export function logNeed(mil, o) {
  const n = divCount(mil, o);
  return { trains: Math.ceil(n * C.SUP_TRAIN_PER_DIV), trucks: Math.ceil(n * C.SUP_TRUCK_PER_DIV) };
}

const quant = (x) => Math.round(Math.max(0, Math.min(1, x)) / C.SUP_LOG_STEP) * C.SUP_LOG_STEP;

/** Pokrytí potřeby: { tr: lokomotivy, tk: auta } (0–1, zaokrouhleno); bez armády nebo skladu 1. */
export function logRatios(state, o) {
  const mil = state.mil;
  if (!mil || !mil.stock || !mil.stock[o]) return { tr: 1, tk: 1 };
  const need = logNeed(mil, o), st = mil.stock[o];
  return {
    tr: need.trains ? quant((st.vlaky || 0) / need.trains) : 1,
    tk: need.trucks ? quant((st.auta || 0) / need.trucks) : 1,
  };
}

/** Denní opotřebení výzbroje zásobování za války (pracovní kontext armády). */
export function dailyLogistics(ctx) {
  const w = getWorld();
  for (let o = 1; o < w.owners.length; o++) {
    if (!hasWar(ctx.mil, o) || !ctx.stock[o]) continue;
    const need = logNeed({ divs: ctx.divs }, o);
    const tr = Math.min(ctx.stock[o].vlaky || 0, Math.ceil(need.trains * C.SUP_TRAIN_WEAR));
    const tk = Math.min(ctx.stock[o].auta || 0, Math.ceil(need.trucks * C.SUP_TRUCK_WEAR));
    if (!tr && !tk) continue;
    const s = editStock(ctx, o);
    s.vlaky = (s.vlaky || 0) - tr;
    s.auta = (s.auta || 0) - tk;
  }
}

/** Má provincie `p` trať (ze světa nebo postavenou)? */
export function hasTrack(w, rail, p) {
  return w.rails.start[p + 1] > w.rails.start[p] || !!(rail && rail[p]);
}

/** Lze v provincii `p` stavět železnici? Má trať, nebo sousedí po souši s provincií s tratí. */
export function nearTrack(w, rail, p) {
  if (hasTrack(w, rail, p)) return true;
  return adjacency(w)[p].some((e) => e.kind !== 2 && hasTrack(w, rail, e.to));
}

/**
 * Spoje postavené železnice: [[a, b, úroveň]] – mezi sousedními provinciemi, z nichž aspoň jedna má postavenou trať a druhá trať jakoukoli;
 * úroveň = menší z úrovní obou konců (konec jen se světovou tratí počítá `SUP_RAIL_BUILT`). Mezipaměť podle objektu `rail`.
 */
const edgeCache = new WeakMap();
export function builtRailEdges(w, rail) {
  if (!rail || !Object.keys(rail).length) return [];
  const hit = edgeCache.get(rail);
  if (hit) return hit;
  const adj = adjacency(w), out = [], seen = new Set();
  const lvl = (p) => rail[p] || (w.rails.start[p + 1] > w.rails.start[p] ? C.SUP_RAIL_BUILT : 0);
  for (const k in rail) {
    const a = +k;
    if (!rail[a]) continue;
    for (const e of adj[a]) {
      const b = e.to;
      if (e.kind === 2 || !lvl(b)) continue;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([a, b, Math.max(1, Math.min(lvl(a), lvl(b)))]);
    }
  }
  edgeCache.set(rail, out);
  return out;
}
