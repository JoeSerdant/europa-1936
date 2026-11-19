// Hledání cest pro pozemní jednotky: Dijkstra po sousednostech provincií s cenou = hodiny přechodu pěšáka.
// Průchozí je vlastní území a území nepřítele (ve válce); průliv (druh 2) a cizí neutrální území ne.
import { getWorld } from '../world.js';
import { C } from './constants.js';
import { geo, adjacency } from './geo.js';
import { TERRAIN_RULES, RIVER } from '../../data/army/terrain.js';
import { atWar } from './war.js';
import { hasAccess } from '../dip/accessCore.js';
import { Heap } from './heap.js';

/** Hodiny, za které pěšák (rychlost 4) přejde z `a` do sousední `b` po rovině × terén cíle × řeka. */
export function stepHours(w, a, b, kind) {
  const g = geo(w);
  const dist = Math.max(C.DIST_MIN, Math.min(C.DIST_MAX, g.distKm(a, b) / C.PROV_KM));
  return C.PROV_HOURS * dist * TERRAIN_RULES[w.terrain[b]].cost * (kind === 1 ? 1 + RIVER.time : 1);
}

/** Úroveň železničního spoje mezi sousedy `a` a `b` (0 = žádný). */
export function railLevel(w, a, b) {
  for (let k = w.rails.start[a]; k < w.rails.start[a + 1]; k++) if (w.rails.to[k] === b) return w.rails.level[k];
  return 0;
}

/** Hodiny kroku `a`→`b` pro zemi `o`: po železnici mezi vlastními provinciemi (M46) kratší než pochodem. */
export function stepHoursFor(w, ctrl, o, a, b, kind) {
  const h = stepHours(w, a, b, kind);
  if (ctrl[a] !== o || ctrl[b] !== o) return h;
  const L = railLevel(w, a, b);
  return L ? h / (1 + C.RAIL_SPEED * L) : h;
}

/** Smí divize země `o` vstoupit do provincie s kontrolou `c`? Vlastní nebo nepřátelská ano, cizí neutrální ne; s `dip` (M67) i území spojenců a se souhlasem. */
export const canEnter = (mil, o, c, dip) => c === o || atWar(mil, o, c) || (!!dip && hasAccess(dip, o, c));

/**
 * Statická data hran pro hledání cest a pohyb (F2, výkon): ke každé hraně sousednosti (`adjacency`) doplní `h` = hodiny kroku pěšáka
 * (`stepHours`, závisí jen na světě) a `rl` = úroveň železnice mezi provinciemi. Počítá se jednou na svět; výsledky jsou stejné jako přímý výpočet.
 */
const edgeDone = new WeakSet();
export function edgeData(w = getWorld()) {
  const adj = adjacency(w);
  if (edgeDone.has(adj)) return adj;
  for (let p = 1; p <= w.L; p++) for (const e of adj[p]) { e.h = stepHours(w, p, e.to, e.kind); e.rl = railLevel(w, p, e.to); }
  edgeDone.add(adj);
  return adj;
}

/** `canEnter` pro jednu zemi a jeden stav válek (F2): výsledek podle majitele provincie se pamatuje (pole podle indexu země). */
function enterTest(mil, o, dip) {
  const memo = new Int8Array(getWorld().owners.length + 1).fill(-1);
  return (c) => {
    let v = memo[c];
    if (v < 0) { v = canEnter(mil, o, c, dip) ? 1 : 0; memo[c] = v; }
    return v === 1;
  };
}

/**
 * Nejkratší cesta z `from` do `to` jako pole provincií (bez výchozí). Vrací null, když neexistuje.
 * @param {object} mil stav armády (kvůli válkám)
 * @param {number[]} ctrl kdo která provincie ovládá
 * @param {number} o  země, která se pohybuje
 * @param {object} [opts] { maxHours, dip } (`dip` = diplomacie: přes území spojenců a loutek se smí procházet)
 */
export function findPath(mil, ctrl, o, from, to, opts = {}) {
  const w = getWorld(), adj = edgeData(w);
  if (from === to || !w.isLand(from) || !w.isLand(to)) return null;
  const dip = opts.dip;
  const enter = enterTest(mil, o, dip);
  if (!enter(ctrl[to])) return null;
  const maxH = opts.maxHours ?? Infinity;
  const dist = new Float64Array(w.L + 1).fill(Infinity);   // Float32 by zaokrouhlením uložených vzdáleností pod klíč haldy přeskočil uzly (dlouhé cesty se nenašly)
  const prev = new Int32Array(w.L + 1);
  const heap = new Heap();
  dist[from] = 0;
  heap.push(0, from);
  while (heap.size) {
    const [d, p] = heap.pop();
    if (d > dist[p]) continue;
    if (p === to) break;
    const own = ctrl[p] === o;
    for (const e of adj[p]) {
      const q = e.to;
      if (e.kind === 2) continue;
      if (!enter(ctrl[q])) continue;
      const nd = d + (own && e.rl && ctrl[q] === o ? e.h / (1 + C.RAIL_SPEED * e.rl) : e.h);   // = stepHoursFor (M46)
      if (nd < dist[q] && nd <= maxH) { dist[q] = nd; prev[q] = p; heap.push(nd, q); }
    }
  }
  if (dist[to] === Infinity) return null;
  const path = [];
  for (let p = to; p !== from; p = prev[p]) path.push(p);
  return path.reverse();
}

/**
 * Hledání cest z jednoho místa do více cílů (F2, výkon): vrací funkci `to → cesta | null` se stejným výsledkem jako `findPath(mil, ctrl, o, from, to, { dip })`.
 * Dijkstra se nepouští znovu od začátku – pokračuje tam, kde skončil předchozí dotaz (provincie už vybrané z haldy mají konečnou vzdálenost i předchůdce).
 * `mil`, `ctrl` a `dip` se během používání nesmějí změnit.
 */
export function pathSearch(mil, ctrl, o, from, dip) {
  const w = getWorld(), adj = edgeData(w);
  const enter = enterTest(mil, o, dip);
  const land = w.isLand(from);
  let dist = null, prev = null, done = null, heap = null, pending = 0;
  const init = () => {
    dist = new Float64Array(w.L + 1).fill(Infinity);
    prev = new Int32Array(w.L + 1);
    done = new Uint8Array(w.L + 1);
    heap = new Heap();
    dist[from] = 0;
    heap.push(0, from);
  };
  const expand = (p, d) => {
    const own = ctrl[p] === o;
    for (const e of adj[p]) {
      const q = e.to;
      if (e.kind === 2) continue;
      if (!enter(ctrl[q])) continue;
      const nd = d + (own && e.rl && ctrl[q] === o ? e.h / (1 + C.RAIL_SPEED * e.rl) : e.h);
      if (nd < dist[q]) { dist[q] = nd; prev[q] = p; heap.push(nd, q); }
    }
  };
  const build = (to) => {
    const path = [];
    for (let p = to; p !== from; p = prev[p]) path.push(p);
    return path.reverse();
  };
  return (to) => {
    if (from === to || !land || !w.isLand(to) || !enter(ctrl[to])) return null;
    if (!dist) init();
    if (done[to]) return build(to);
    if (pending) { expand(pending, dist[pending]); pending = 0; }   // cíl minulého dotazu: jeho sousedé se teprve rozšíří (jako by hledání pokračovalo)
    while (heap.size) {
      const [d, p] = heap.pop();
      if (d > dist[p]) continue;
      done[p] = 1;
      if (p === to) { pending = p; return build(to); }
      expand(p, d);
    }
    return dist[to] === Infinity ? null : build(to);
  };
}

/** Délka cesty v hodinách pro pěšáka (součet kroků). */
export function pathHours(from, path, ctrl = null, o = 0) {
  const w = getWorld(), adj = adjacency(w);
  let h = 0, p = from;
  for (const q of path) {
    const e = adj[p].find((x) => x.to === q);
    if (!e) return Infinity;
    h += ctrl ? stepHoursFor(w, ctrl, o, p, q, e.kind) : stepHours(w, p, q, e.kind);
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
