// Společné pomůcky námořnictva (M27): mořský graf, vzdálenosti, cesty, domovská oblast, blokáda, kapacita přepravy.
import { getWorld } from '../world.js';
import { Heap } from '../army/heap.js';
import { atWar } from '../army/war.js';
import { sameFaction } from '../dip/core.js';
import { SHIPS, SHIP_IDS } from '../../data/navy/index.js';
import { NAV } from './constants.js';

const graphCache = new WeakMap();

/** Sousedé mořských oblastí jako pole [{ to, km }] podle štítku; mezipaměť podle světa. */
export function seaGraph(w = getWorld()) {
  let g = graphCache.get(w);
  if (g) return g;
  g = new Map();
  for (let l = w.L + 1; l <= w.L + w.S; l++) {
    const list = [];
    w.forSeaNeighbors(l, (to) => { list.push({ to, km: seaKm(w, l, to) }); });
    g.set(l, list);
  }
  graphCache.set(w, g);
  return g;
}

/** Vzdálenost středů dvou mořských oblastí v km. */
export function seaKm(w, a, b) {
  const ca = w.sea[a - w.L].c, cb = w.sea[b - w.L].c;
  return Math.hypot(ca[0] - cb[0], ca[1] - cb[1]) * w.frame.km;
}

export const isSeaLabel = (l) => { const w = getWorld(); return Number.isInteger(l) && l > w.L && l <= w.L + w.S; };

/** Součty síly flotily nebo rezervy lodí: { hp, atk, n }. */
export function powerOf(ships) {
  let hp = 0, atk = 0, n = 0;
  for (const id of SHIP_IDS) { const c = ships[id] || 0; hp += c * SHIPS[id].hp; atk += c * SHIPS[id].atk; n += c; }
  return { hp, atk, n };
}

/** Rychlost flotily (km/h): nejpomalejší loď. */
export function fleetSpeed(ships) {
  let v = Infinity;
  for (const id of SHIP_IDS) if (ships[id]) v = Math.min(v, SHIPS[id].spd);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Nejkratší cesta po mořských oblastech z `from` do některé oblasti z množiny `goals` (km). `blocked(label)` zakazuje oblast (cílové oblasti se ověřují také).
 * Vrací { path: [oblasti bez výchozí], km } nebo null.
 */
export function seaRoute(from, goals, blocked = null, maxKm = NAV.ROUTE_MAX_KM) {
  const w = getWorld(), g = seaGraph(w);
  if (blocked && blocked(from)) return null;
  const dist = new Map([[from, 0]]), prev = new Map();
  const heap = new Heap();
  heap.push(0, from);
  while (heap.size) {
    const [d, l] = heap.pop();
    if (d > dist.get(l)) continue;
    if (goals.has(l)) {
      const path = [];
      for (let x = l; x !== from; x = prev.get(x)) path.push(x);
      return { path: path.reverse(), km: d };
    }
    for (const e of g.get(l) || []) {
      if (blocked && blocked(e.to)) continue;
      const nd = d + e.km;
      if (nd > maxKm || nd >= (dist.get(e.to) ?? Infinity)) continue;
      dist.set(e.to, nd); prev.set(e.to, l); heap.push(nd, e.to);
    }
  }
  return null;
}

/** Přístavy země: provincie s přístavem, které země ovládá a vlastní. */
export function portsOf(state, o) {
  const w = getWorld(), out = [];
  for (let p = 1; p <= w.L; p++) if (w.portLevel[p] && state.ctrl[p] === o && state.stateOwner[w.provState[p]] === o) out.push(p);
  return out;
}

/** Domovský přístav země: nejlepší přístav (úroveň, pak blíž hlavnímu městu); { prov, sea } nebo null. */
export function homeSea(state, o) {
  const w = getWorld();
  const cap = w.owners[o].cap, cc = w.land[cap].c;
  let best = null, bk = -Infinity;
  for (const p of portsOf(state, o)) {
    const c = w.land[p].c;
    const k = w.portLevel[p] * 1e6 - Math.hypot(c[0] - cc[0], c[1] - cc[1]);
    if (k > bk) { bk = k; best = p; }
  }
  return best ? { prov: best, sea: w.portSea[best] } : null;
}

/** Mořské oblasti domovských přístavů země. */
export const homeSeas = (state, o) => new Set(portsOf(state, o).map((p) => getWorld().portSea[p]));

/** Flotily v oblasti `label`: pole id. */
export function fleetsAt(state, label) {
  const out = [];
  const f = state.nav.fleets;
  for (let i = 1; i < f.length; i++) if (f[i] && f[i].p === label) out.push(i);
  return out;
}

const friendly = (state, a, b) => a === b || sameFaction(state, a, b);

/** Je oblast pro zemi `o` zablokovaná? (stojí tam bojová flotila protivníka a žádná vlastní ani spojenecká) */
export function seaBlocked(state, o, label) {
  let enemy = false;
  const f = state.nav.fleets;
  for (let i = 1; i < f.length; i++) {
    const x = f[i];
    if (!x || x.p !== label) continue;
    if (friendly(state, o, x.o)) return false;
    if (atWar(state.mil, o, x.o) && powerOf(x.ships).atk > 0) enemy = true;
  }
  return enemy;
}

/** Počet transportních lodí země (rezerva + flotily) a volná kapacita (minus divize na moři). */
export function transportsOf(state, o) {
  let n = (state.nav.pool[o] && state.nav.pool[o].tr) || 0;
  for (const f of state.nav.fleets) if (f && f.o === o) n += f.ships.tr || 0;
  const used = state.nav.sail.reduce((a, s) => a + (s.o === o ? 1 : 0), 0);
  return { total: n, used, free: Math.max(0, n - used) };
}

/** Pobřežní mořské oblasti provincie. */
export function coastSeasOf(p) {
  const w = getWorld(), out = [];
  w.forCoast(p, (s) => { out.push(s); });
  return out;
}
