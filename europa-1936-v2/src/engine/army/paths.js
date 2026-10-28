// Hledání cest pro pozemní jednotky: Dijkstra po sousednostech provincií s cenou = hodiny přechodu pěšáka.
// Průchozí je vlastní území a území nepřítele (ve válce); průliv (druh 2) a cizí neutrální území ne.
import { getWorld } from '../world.js';
import { C } from './constants.js';
import { geo, adjacency } from './geo.js';
import { TERRAIN_RULES, RIVER } from '../../data/army/terrain.js';
import { atWar } from './war.js';
import { Heap } from './heap.js';

/** Hodiny, za které pěšák (rychlost 4) přejde z `a` do sousední `b` po rovině × terén cíle × řeka. */
export function stepHours(w, a, b, kind) {
  const g = geo(w);
  const dist = Math.max(C.DIST_MIN, Math.min(C.DIST_MAX, g.distKm(a, b) / C.PROV_KM));
  return C.PROV_HOURS * dist * TERRAIN_RULES[w.terrain[b]].cost * (kind === 1 ? 1 + RIVER.time : 1);
}

/** Smí divize země `o` vstoupit do provincie s kontrolou `c`? Vlastní nebo nepřátelská ano, cizí neutrální ne. */
export const canEnter = (mil, o, c) => c === o || atWar(mil, o, c);

/**
 * Nejkratší cesta z `from` do `to` jako pole provincií (bez výchozí). Vrací null, když neexistuje.
 * @param {object} mil stav armády (kvůli válkám)
 * @param {number[]} ctrl kdo která provincie ovládá
 * @param {number} o  země, která se pohybuje
 * @param {object} [opts] { maxHours }
 */
export function findPath(mil, ctrl, o, from, to, opts = {}) {
  const w = getWorld(), adj = adjacency(w);
  if (from === to || !w.isLand(from) || !w.isLand(to)) return null;
  if (!canEnter(mil, o, ctrl[to])) return null;
  const maxH = opts.maxHours ?? Infinity;
  const dist = new Float32Array(w.L + 1).fill(Infinity);
  const prev = new Int32Array(w.L + 1);
  const heap = new Heap();
  dist[from] = 0;
  heap.push(0, from);
  while (heap.size) {
    const [d, p] = heap.pop();
    if (d > dist[p]) continue;
    if (p === to) break;
    for (const e of adj[p]) {
      const q = e.to;
      if (e.kind === 2) continue;
      if (!canEnter(mil, o, ctrl[q])) continue;
      const nd = d + stepHours(w, p, q, e.kind);
      if (nd < dist[q] && nd <= maxH) { dist[q] = nd; prev[q] = p; heap.push(nd, q); }
    }
  }
  if (dist[to] === Infinity) return null;
  const path = [];
  for (let p = to; p !== from; p = prev[p]) path.push(p);
  return path.reverse();
}

/** Délka cesty v hodinách pro pěšáka (součet kroků). */
export function pathHours(from, path) {
  const w = getWorld(), adj = adjacency(w);
  let h = 0, p = from;
  for (const q of path) {
    const e = adj[p].find((x) => x.to === q);
    if (!e) return Infinity;
    h += stepHours(w, p, q, e.kind);
    p = q;
  }
  return h;
}

/** Je `b` sousedem `a` (po souši nebo přes řeku)? Vrací druh sousednosti, nebo -1. */
export function adjKind(a, b) {
  const adj = adjacency(getWorld());
  const e = adj[a].find((x) => x.to === b);
  return e ? e.kind : -1;
}
