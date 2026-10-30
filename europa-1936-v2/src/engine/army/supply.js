// Zásobování. Tok vychází z hlavního města a z uzlů železnice spojených s hlavním městem přes vlastní území
// a šíří se po vlastních provinciích; každá provincie ho zeslabí (terén, řeka, vzdálenost; infrastruktura srážku zmírňuje).
// reach[p] · SUP_CAPACITY = zásoby za hodinu v provincii; divize dostanou poměr kapacity a spotřeby všech jednotek tamtéž.
import { getWorld } from '../world.js';
import { C } from './constants.js';
import { geo, adjacency } from './geo.js';
import { TERRAIN_RULES, RIVER } from '../../data/army/terrain.js';
import { Heap } from './heap.js';
import { editDiv } from './ctx.js';
import { statsOf, modsOf } from './unit.js';

const cache = new Map();   // země → { sig, reach }

/** Podpis množiny provincií, které země ovládá (počet, součet, součet čtverců, xor) – kvůli mezipaměti. */
function signature(ctrl, o, L) {
  let n = 0, s = 0, q = 0, x = 0;
  for (let p = 1; p <= L; p++) if (ctrl[p] === o) { n++; s += p; q += p * p; x ^= p * 2654435761 >>> 0; }
  return `${n}:${s}:${q}:${x}`;
}

/** Tok zásobování po provinciích pro zemi `o` (selektor `supplyReach(state, o)` ho zabaluje) (Float32Array, index = provincie; 0 = bez zásob). */
export function supplyFlow(ctrl, o, infra = geo().infra) {
  const w = getWorld();
  const sig = signature(ctrl, o, w.L);
  const hit = cache.get(o);
  if (hit && hit.sig === sig && hit.L === w.L && hit.infra === infra) return hit.reach;
  const reach = computeReach(ctrl, o, w, infra);
  cache.set(o, { sig, reach, L: w.L, infra });
  return reach;
}

/** Úbytek toku zásobování při kroku z provincie `p` do sousední `q` (terén cíle, řeka, vzdálenost; infrastruktura srážku zmírňuje). */
export function flowDrop(w, g, infra, p, q, kind) {
  const t = TERRAIN_RULES[w.terrain[q]];
  const dist = Math.max(0.5, Math.min(1.6, g.distKm(p, q) / C.PROV_KM));
  return (t.flow * (1 - C.SUP_INFRA_RELIEF * infra[q] / 5) + (kind === 1 ? RIVER.flow : 0)) * dist;
}

function computeReach(ctrl, o, w, infra) {
  const g = geo(w), adj = adjacency(w);
  const L = w.L;
  const reach = new Float32Array(L + 1);
  const cap = w.owners[o].cap;
  const capitalHeld = ctrl[cap] === o;

  // A) železniční síť z hlavního města: podíl síly uzlu, který k němu dorazí (0–1)
  const rail = new Float32Array(L + 1);
  if (capitalHeld) {
    const dist = new Float64Array(L + 1).fill(Infinity);   // Float64: zaokrouhlení pod klíč haldy by přeskočilo uzly
    const heap = new Heap();
    dist[cap] = 0; heap.push(0, cap);
    while (heap.size) {
      const [d, p] = heap.pop();
      if (d > dist[p]) continue;
      for (let k = w.rails.start[p]; k < w.rails.start[p + 1]; k++) {
        const q = w.rails.to[k];
        if (ctrl[q] !== o) continue;
        const nd = d + C.SUP_RAIL_DROP / w.rails.level[k];
        if (nd < dist[q] && nd < 1) { dist[q] = nd; heap.push(nd, q); }
      }
    }
    for (let p = 1; p <= L; p++) if (dist[p] < Infinity) rail[p] = 1 - dist[p];
  }

  // B) šíření po provinciích z hlavního města a z uzlů (největší hodnota vyhrává)
  const heap = new Heap();   // klíč = −hodnota
  // hodnoty se ukládají do Float32Array, proto je zaokrouhlujeme předem (jinak by porovnání `v < reach[p]` přeskočilo uzel, jehož uložená hodnota je o špetku větší)
  const push = (p, v) => { v = Math.fround(v); if (v > reach[p] && v >= C.SUP_MIN_FLOW) { reach[p] = v; heap.push(-v, p); } };
  if (capitalHeld) push(cap, C.SUP_CAPITAL);
  for (let p = 1; p <= L; p++) {
    if (ctrl[p] !== o || p === cap || !g.hub[p]) continue;
    // uzel spojený železnicí s hlavním městem dostává podíl jeho toku; každý uzel má aspoň slabé místní zásoby (kolonie, obklíčení)
    push(p, Math.max(C.SUP_HUB * rail[p], C.SUP_LOCAL));
  }
  while (heap.size) {
    const [nk, p] = heap.pop();
    const v = -nk;
    if (v < reach[p]) continue;
    for (const e of adj[p]) {
      const q = e.to;
      if (ctrl[q] !== o || e.kind === 2) continue;
      push(q, v - flowDrop(w, g, infra, p, q, e.kind));
    }
  }
  return reach;
}

/** Denní krok: spočítá zásobování a upraví `sup` a `sg` divizí. */
export function dailySupply(ctx) {
  const mil = ctx.mil;
  const need = new Map(), reachOf = new Map();
  const key = (o, p) => o * 4096 + p;
  for (let id = 1; id < ctx.divs.length; id++) {
    const d = ctx.divs[id];
    if (!d) continue;
    const st = statsOf(mil, d);
    const use = st.sup * Math.max(0.3, 1 + modsOf(ctx, d).supUse - st.supSave);
    const k = key(d.o, d.p);
    need.set(k, (need.get(k) || 0) + use);
  }
  for (let id = 1; id < ctx.divs.length; id++) {
    const d = ctx.divs[id];
    if (!d) continue;
    let reach = reachOf.get(d.o);
    if (!reach) { reach = supplyFlow(ctx.ctrl, d.o); reachOf.set(d.o, reach); }
    const cap = reach[d.p] * C.SUP_CAPACITY;
    const n = need.get(key(d.o, d.p)) || 0;
    const ratio = n <= 0 ? 1 : Math.min(1, cap / n);
    const sg = ratio >= 0.999 ? Math.min(C.SUP_GRACE, d.sg + 24 * C.SUP_GRACE_REFILL) : Math.max(0, d.sg - 24);
    if (Math.abs(ratio - d.sup) > 0.005 || sg !== d.sg) {
      const e = editDiv(ctx, id);
      e.sup = ratio; e.sg = sg;
    }
  }
}
