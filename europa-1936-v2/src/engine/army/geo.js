// Odvozená data světa pro armádu (počítají se jednou na svět): středy provincií, uzly železnice, infrastruktura.
// Infrastruktura je zatím odvozená z terénu, železnice a velkých měst; M19 ji nahradí stavbami ve státech.
import { getWorld } from '../world.js';
import { TERRAIN_RULES } from '../../data/army/terrain.js';

const cache = new WeakMap();

export function geo(w = getWorld()) {
  let g = cache.get(w);
  if (g) return g;
  const L = w.L;
  const cx = new Float32Array(L + 1), cy = new Float32Array(L + 1);
  const hub = new Uint8Array(L + 1);
  const railMax = new Uint8Array(L + 1);
  const infra = new Uint8Array(L + 1);
  for (let p = 1; p <= L; p++) {
    const c = w.land[p].c;
    cx[p] = c[0]; cy[p] = c[1];
    for (let k = w.rails.start[p]; k < w.rails.start[p + 1]; k++) railMax[p] = Math.max(railMax[p], w.rails.level[k]);
  }
  for (const p of w.raw.hubs || []) hub[p] = 1;
  for (let p = 1; p <= L; p++) {
    const base = TERRAIN_RULES[w.terrain[p]].infra;
    infra[p] = Math.max(0, Math.min(5, base + (railMax[p] > 0 ? 1 : 0) + (w.vp[p] >= 6 ? 1 : 0)));
  }
  const kmPerPx = w.frame.km;
  g = {
    cx, cy, hub, railMax, infra, kmPerPx,
    distKm: (a, b) => Math.hypot(cx[a] - cx[b], cy[a] - cy[b]) * kmPerPx,
  };
  cache.set(w, g);
  return g;
}

/** Sousední pevninské provincie jako pole [{ to, kind, len }] – pro kód, který potřebuje pole (cesty, plánovač). Mezipaměť podle světa. */
const adjCache = new WeakMap();
export function adjacency(w = getWorld()) {
  let a = adjCache.get(w);
  if (a) return a;
  a = new Array(w.L + 1);
  a[0] = [];
  for (let p = 1; p <= w.L; p++) {
    const list = [];
    w.forLandNeighbors(p, (to, kind, len) => list.push({ to, kind, len }));
    a[p] = list;
  }
  adjCache.set(w, a);
  return a;
}
