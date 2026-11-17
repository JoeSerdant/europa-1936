// Společné pomůcky námořnictva (M27): mořský graf, vzdálenosti, cesty, domovská oblast, blokáda, kapacita přepravy.
import { getWorld } from '../world.js';
import { Heap } from '../army/heap.js';
import { atWar } from '../army/war.js';
import { sameFaction } from '../dip/core.js';
import { SHIPS, SHIP_IDS } from '../../data/navy/index.js';
import { PLANES } from '../../data/air/planes.js';
import { NAV } from './constants.js';
import { multOf, ONE } from '../design/core.js';

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

/** Síla lodí země `o` s úrovní techniky typů lodí (M96, `mil.lv[o][typ]`): palba +`NAV.LV_ATK` a odolnost +`NAV.LV_HP` za úroveň nad první. */
export function fleetPower(state, o, ships) {
  const lv = state.mil.lv && state.mil.lv[o];
  if (!lv) return powerOf(ships);
  let hp = 0, atk = 0, n = 0;
  for (const id of SHIP_IDS) {
    const c = ships[id] || 0;
    if (!c) continue;
    const l = (lv[id] || 1) - 1, dm = lv.des ? multOf(lv, id) : ONE;   // M97: návrh varianty lodi
    hp += c * SHIPS[id].hp * (1 + NAV.LV_HP * l) * dm.hp; atk += c * SHIPS[id].atk * (1 + NAV.LV_ATK * l) * dm.atk; n += c;
  }
  return { hp, atk, n };
}

/** Kapacita palub lodí (M90): kolik palubních letounů flotila unese. */
export function deckOf(ships) {
  let n = 0;
  for (const id of SHIP_IDS) if (ships[id] && SHIPS[id].deck) n += ships[id] * SHIPS[id].deck;
  return n;
}

/** Palubní letouny flotily (M90): nalodění, nejvýš kapacita palub. */
export const planesOf = (f) => Math.min(f.pl || 0, deckOf(f.ships));

/** Síla úderu palubních letounů (M81, od M90 podle letounů na palubě): `pl` letounů, bez udání plné paluby. */
export function airPower(ships, pl = Infinity) {
  return Math.min(pl, deckOf(ships)) * PLANES.pal.nav;
}

const coastStateCache = new WeakMap();   // svět → Map(mořská oblast → [státy s pobřežím])
/** Státy, které mají pobřeží v mořské oblasti `label` (M90: kam dosáhne podpora palubních letounů). */
export function coastStatesOf(label) {
  const w = getWorld();
  let m = coastStateCache.get(w);
  if (!m) {
    m = new Map();
    for (let p = 1; p <= w.L; p++) w.forCoast(p, (s) => { const st = w.provState[p]; let a = m.get(s); if (!a) { a = []; m.set(s, a); } if (!a.includes(st)) a.push(st); });
    for (const a of m.values()) a.sort((x, y) => x - y);
    coastStateCache.set(w, m);
  }
  return m.get(label) || [];
}

/** Je flotila jen z ponorek? (v mlze války ji vidí jen ten, kdo má v oblasti torpédoborce nebo letadlovou loď) */
export function subOnly(ships) {
  let n = 0;
  for (const id of SHIP_IDS) { if (!ships[id]) continue; if (!SHIPS[id].sub) return false; n += ships[id]; }
  return n > 0;
}

/** Protiponorková síla lodí: torpédoborce a dvojnásobně letadlové lodě. */
export const aswOf = (ships) => (ships.dd || 0) + 2 * (ships.cv || 0);

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

const portList = new WeakMap();   // svět → všechny provincie s přístavem

/** Přístavy, které země ovládá a ze kterých jde zásobovat po moři (M71): mají aspoň dvě transportní lodě a jejich mořská oblast není zablokovaná nepřítelem. */
export function seaPorts(state, o) {
  if (!state.nav || transportsBare(state, o).total < 2) return [];
  const w = getWorld(), out = [];
  let all = portList.get(w);
  if (!all) { all = []; for (let p = 1; p <= w.L; p++) if (w.portLevel[p]) all.push(p); portList.set(w, all); }
  for (const p of all) if (state.ctrl[p] === o && !seaBlocked(state, o, w.portSea[p])) out.push(p);
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

/** Počet transportních lodí země (rezerva + flotily) a volná kapacita jen bez konvojů; rozhraní používá `transportsOf` z convoy.js. */
export function transportsBare(state, o) {
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
