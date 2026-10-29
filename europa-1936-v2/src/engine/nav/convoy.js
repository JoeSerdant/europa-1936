// Konvoje a obchodní válka (M31): obchodní smlouvy mezi zeměmi bez společné hranice jedou po moři a potřebují transportní lodě („konvoje“) dovozce.
// Nedostatek lodí zmenšuje dodávky, nepřátelské lodě na trase je ruší a potápějí konvoje, vlastní a spojenecké válečné lodě na trase je kryjí.
// Čisté funkce nad stavem; trasy se cachují podle pole `ctrl`.
import { getWorld } from '../world.js';
import { NAV } from './constants.js';
import { seaRoute, homeSea, powerOf } from './core.js';
import { atWar } from '../army/war.js';
import { sameFaction } from '../dip/core.js';
import { docMods } from '../doc/core.js';

const routeCache = new WeakMap();   // ctrl → Map(klíč → trasa)
let landComp = null;                // souvislé pevniny světa (nezávisle na vlastnících): provincie → číslo pevniny

/** Číslo souvislé pevniny každé provincie (BFS po sousedství bez průlivů); počítá se jednou za svět. */
function landComponents() {
  const w = getWorld();
  if (landComp && landComp.w === w) return landComp.comp;
  const comp = new Int32Array(w.L + 1);
  let n = 0;
  for (let p = 1; p <= w.L; p++) {
    if (comp[p]) continue;
    comp[p] = ++n;
    const stack = [p];
    while (stack.length) {
      const x = stack.pop();
      w.forLandNeighbors(x, (q, kind) => { if (kind !== 2 && !comp[q]) { comp[q] = n; stack.push(q); } });
    }
  }
  landComp = { w, comp };
  return comp;
}

/**
 * Trasa obchodu `from` → `to`: { sea: false } po souši (hlavní města na téže pevnině, bez přístavu nebo bez námořní cesty na mapě = tranzit mimo mapu),
 * jinak { sea: true, ok: true, km, seas } (seas = oblasti od přístavu vývozce k přístavu dovozce).
 */
export function tradeRoute(state, from, to) {
  let m = routeCache.get(state.ctrl);
  if (!m) { m = new Map(); routeCache.set(state.ctrl, m); }
  const key = from * 256 + to;
  let r = m.get(key);
  if (r) return r;
  const w = getWorld(), comp = landComponents();
  r = { sea: false };
  if (comp[w.owners[from].cap] !== comp[w.owners[to].cap]) {
    const a = homeSea(state, from), b = homeSea(state, to);
    if (a && b) {
      const found = a.sea === b.sea ? { path: [], km: 0 } : seaRoute(a.sea, new Set([b.sea]), null, NAV.TRADE_MAX_KM);
      if (found) r = { sea: true, ok: true, km: found.km, seas: [a.sea, ...found.path] };
    }
  }
  m.set(key, r);
  return r;
}

/** Konvoje potřebné pro `amt` jednotek denně na trase. */
export const needOf = (route, amt) => (route.sea && route.ok ? Math.ceil(amt / NAV.CONVOY_AMT) + Math.floor(route.km / NAV.CONVOY_KM) : 0);

const friendly = (state, a, b) => a === b || sameFaction(state, a, b);

/** Riziko 0–1, že konvoj na trase `route` mezi `from` a `to` zasáhnou nepřátelské lodě: v každé oblasti trasy se palebná síla nájezdníků zmenšuje o krytí tamních vlastních a spojeneckých lodí. */
export function routeRisk(state, route, from, to) {
  if (!route.sea || !route.ok) return 0;
  const raid = new Map(), escort = new Map();
  const seas = new Set(route.seas);
  for (const f of state.nav.fleets) {
    if (!f || !seas.has(f.p)) continue;
    const atk = powerOf(f.ships).atk;
    if (!atk) continue;
    const dm = docMods(state, f.o);
    if (atWar(state.mil, to, f.o) || atWar(state.mil, from, f.o)) raid.set(f.p, (raid.get(f.p) || 0) + atk * (1 + dm.raid));
    else if (friendly(state, to, f.o) || friendly(state, from, f.o)) escort.set(f.p, (escort.get(f.p) || 0) + atk * (1 + dm.escort));
  }
  let safe = 1;
  for (const [sea, r] of raid) safe *= 1 - Math.min(NAV.RAID_MAX, NAV.RAID_COEF * Math.max(0, r - NAV.ESCORT_K * (escort.get(sea) || 0)));
  return Math.min(NAV.RAID_MAX, 1 - safe);
}

/** Konvoje dovozce `o`: { need (potřeba pro jeho smlouvy po moři), total (všechny transportní lodě), sail (zaneprázdněné přepravou divizí), avail, factor }. */
export function convoysOf(state, o) {
  let total = (state.nav.pool[o] && state.nav.pool[o].tr) || 0;
  for (const f of state.nav.fleets) if (f && f.o === o) total += f.ships.tr || 0;
  const sail = state.nav.sail.reduce((a, s) => a + (s.o === o ? 1 : 0), 0);
  let need = 0;
  for (const d of state.ind.trade) if (d.to === o && !atWar(state.mil, d.from, d.to)) need += needOf(tradeRoute(state, d.from, d.to), d.amt);
  const avail = Math.max(0, total - sail);
  return { need, total, sail, avail, factor: need > 0 ? Math.min(1, avail / need) : 1 };
}

/** Transportní lodě země: celkem, zaneprázdněné (přeprava divizí + konvoje obchodu) a volné. */
export function transportsOf(state, o) {
  const c = convoysOf(state, o);
  const convoys = Math.min(c.need, c.avail);
  return { total: c.total, used: c.sail + convoys, free: Math.max(0, c.avail - convoys), convoys, need: c.need, sail: c.sail };
}

/** Podíl smlouvy `d`, který dorazí: 1 po souši; po moři podle počtu konvojů a rizika, 0 bez námořní cesty. */
export function tradeFactor(state, d, conv = convoysOf(state, d.to)) {
  const r = tradeRoute(state, d.from, d.to);
  if (!r.sea) return 1;
  if (!r.ok) return 0;
  return conv.factor * (1 - routeRisk(state, r, d.from, d.to));
}

/** Stav všech smluv hráče pro rozhraní: [{ d, route, need, risk, factor }]. */
export function tradeStatus(state, o) {
  const conv = convoysOf(state, o);
  return state.ind.trade.filter((d) => d.from === o || d.to === o).map((d) => {
    const route = tradeRoute(state, d.from, d.to);
    return { d, route, need: needOf(route, d.amt), risk: routeRisk(state, route, d.from, d.to), factor: tradeFactor(state, d, d.to === o ? conv : convoysOf(state, d.to)) };
  });
}
