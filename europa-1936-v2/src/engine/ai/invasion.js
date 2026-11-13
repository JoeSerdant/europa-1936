// AI: námořní invaze (M71). Země ve válce s nepřítelem, ke kterému se nedostane po souši (ostrov, cizí neutrální území v cestě), shromáždí z nepotřebných armád
// invazní sbor v přístavu, naloží ho na transportní lodě a vylodí na nehájené nepřátelské pobřeží s přístavem (předmostí), které se zásobuje po moři (`seaPorts`).
// Další sbory posilují držené předmostí. Invazi si troufne jen země s námořní převahou nad nepřáteli a s krycí flotilou, která předem vyplve k místu vylodění.
// Používá stejné příkazy jako hráč (`createArmy`, `setPlan`, `orderFleet`, `orderSail`); stav operací je `state.ai.inv = [{ o, army, t, ph, fleet, p }]`
// (`ph` 0 shromažďování v přístavu, 1 vyplul – záznam zbývá kvůli pauze mezi operacemi a drží krycí flotilu `fleet`; `p` místo vylodění). Čisté funkce, neplatný vstup vrací tentýž stav.
import { getWorld } from '../world.js';
import { geo, adjacency } from '../army/geo.js';
import { enemiesOf } from '../army/war.js';
import { createArmy, clearPlan, setPlan } from '../army/commands.js';
import { landZones } from '../army/zones.js';
import { Heap } from '../army/heap.js';
import { orderSail, sailBlock } from '../nav/commands.js';
import { transportsOf } from '../nav/convoy.js';
import { orderFleet, setFleetMission } from '../nav/commands.js';
import { seaGraph, seaBlocked, coastSeasOf, powerOf, seaKm } from '../nav/core.js';
import { sameFaction } from '../dip/core.js';
import { divisionCount } from '../army/selectors.js';
import { atWar } from '../army/war.js';
import { logAdd } from '../log.js';
import { AI } from './constants.js';
import { goalFoes } from './core.js';
import { friendsOf } from '../dip/accessCore.js';

const invOf = (state) => (state.ai && state.ai.inv) || [];
const setInv = (state, inv) => ({ ...state, ai: { ...state.ai, inv } });

/** Armády země, které se právě shromažďují k invazi (strategie je nechává být). */
export function stagingArmies(state, o) {
  const out = new Set();
  for (const x of invOf(state)) if (x.o === o && x.ph === 0) out.add(x.army);
  return out;
}

/** Krycí flotily rozehraných operací země (AI námořnictvo je nepošle na nájezdy). */
export function reservedFleets(state, o) {
  const out = new Set();
  for (const x of invOf(state)) if (x.o === o && x.fleet) out.add(x.fleet);
  return out;
}

/** Palebná síla lodí země a jejího bloku (`own`) a jejích nepřátel (`foe`). */
export function navalBalance(state, o) {
  let own = 0, foe = 0;
  for (const f of state.nav.fleets) {
    if (!f) continue;
    const atk = powerOf(f.ships).atk;
    if (f.o === o || sameFaction(state, o, f.o)) own += atk; else if (atWar(state.mil, o, f.o)) foe += atk;
  }
  return { own, foe };
}

/** Nejsilnější vlastní bojová flotila, která není vázaná jinou operací, nebo 0. */
function coverFleet(state, o) {
  const held = reservedFleets(state, o);
  let best = 0, ba = 0;
  state.nav.fleets.forEach((f, i) => {
    if (!f || f.o !== o || held.has(i)) return;
    const atk = powerOf(f.ships).atk;
    if (atk > ba) { ba = atk; best = i; }
  });
  return best;
}

/** Nepřátelská bojová flotila v mořské oblasti? */
const foeAtSea = (state, o, label) => state.nav.fleets.some((f) => f && f.p === label && atWar(state.mil, o, f.o) && powerOf(f.ships).atk > 0);

/** Vzdálenosti (km) z mořské oblasti `from` do všech dostupných oblastí, kterými nevede blokáda (Dijkstra, nejdál `maxKm`). */
function seaDists(from, blocked, maxKm) {
  const dist = new Map();
  if (blocked(from)) return dist;
  const g = seaGraph(), heap = new Heap();
  dist.set(from, 0); heap.push(0, from);
  while (heap.size) {
    const [d, l] = heap.pop();
    if (d > dist.get(l)) continue;
    for (const e of g.get(l) || []) {
      if (blocked(e.to)) continue;
      const nd = d + e.km;
      if (nd > maxKm || nd >= (dist.get(e.to) ?? Infinity)) continue;
      dist.set(e.to, nd); heap.push(nd, e.to);
    }
  }
  return dist;
}

/** Přístavy, které země ovládá (i dobyté) a kde může nalodit: provincie s přístavem v zóně `zone`. */
function embarkPorts(state, o, zones, zone) {
  const w = getWorld(), out = [];
  for (let p = 1; p <= w.L; p++) if (w.portLevel[p] && state.ctrl[p] === o && zones[p] === zone) out.push(p);
  return out;
}

/**
 * Místa vylodění pro sbor o `n` divizích z přístavů `ports`: nepřátelské pobřežní provincie s přístavem (nebo uzlem) bez obránců mimo zónu domova
 * a vlastní držená předmostí, kterým chybí posily. Vrací [{ p, from, sea, km, sc, near }] od nejlepšího; `sea` = pobřežní oblast na nejkratší plavbě, `near` = vážený počet nepřátelských divizí v okolí.
 */
export function landingSites(state, o, ports, n) {
  const w = getWorld(), g = geo(w), adj = adjacency(w), mil = state.mil;
  if (!ports.length) return [];
  const zones = landZones(state, o), home = zones[ports[0]];
  const foes = new Set(enemiesOf(mil, o));
  if (!foes.size) return [];
  // M88: vylodit se smí jen u země, kterou chce tábor porazit (má proti ní válečný cíl), nebo na území vlastního tábora, které nepřítel obsadil
  const wanted = goalFoes(state, o), homeLand = new Set([o, ...friendsOf(state.dip, o)]);
  const foeAt = new Map(), foeList = [], mine = [];
  for (let id = 1; id < mil.divs.length; id++) {
    const d = mil.divs[id];
    if (!d) continue;
    if (foes.has(d.o)) { foeAt.set(d.p, (foeAt.get(d.p) || 0) + 1); foeList.push(d.p); } else if (d.o === o) mine.push(d.p);
  }
  const blocked = (l) => seaBlocked(state, o, l);
  const dists = ports.map((p) => seaDists(w.portSea[p], blocked, AI.INV_SEA_KM));
  const out = [];
  for (let p = 1; p <= w.L; p++) {
    const c = state.ctrl[p];
    const enemy = foes.has(c), beach = c === o && zones[p] !== home && w.portLevel[p] > 0;
    if (!enemy && !beach) continue;
    if (enemy && (foeAt.has(p) || (!w.portLevel[p] && !g.hub[p]) || zones[p] === home)) continue;
    if (enemy && !wanted.has(c) && !homeLand.has(state.stateOwner[w.provState[p]])) continue;
    if (beach && !adj[p].some((e) => e.kind !== 2 && foes.has(state.ctrl[e.to]))) continue;   // předmostí bez styku s nepřítelem posily nepotřebuje
    const seas = coastSeasOf(p);
    let km = Infinity, from = 0, sea = 0;
    ports.forEach((q, i) => { for (const s of seas) { const d = dists[i].get(s); if (d !== undefined && d < km) { km = d; from = q; sea = s; } } });
    if (!from) continue;
    let near = 0, own = 0;   // obránci se počítají s váhou klesající se vzdáleností (posily dorazí za pár dní), vlastní divize jen v okolí předmostí
    for (const q of foeList) { const d = g.distKm(p, q); if (d < AI.INV_FAR_KM) near += 1 - d / AI.INV_FAR_KM; }
    for (const q of mine) if (g.distKm(p, q) <= AI.INV_NEAR_KM) own++;
    if (beach ? own >= Math.max(AI.INV_HOLD, near * AI.INV_RATIO) || own + n < near * AI.INV_RATIO : n < Math.max(AI.INV_MIN, Math.ceil(near * AI.INV_RATIO))) continue;
    const cap = w.owners[c].cap;
    const sc = (enemy ? AI.INV_PORT * (w.portLevel[p] || 1) + (g.hub[p] ? AI.INV_HUB : 0) + AI.INV_VP * w.vp[p] - AI.INV_CAP * g.distKm(p, cap) / 1000 - AI.INV_DEF * near : AI.INV_REINF + AI.INV_DEF * near) - km / AI.INV_KM;
    out.push({ p, from, sea, km, sc, near });
  }
  return out.sort((a, b) => b.sc - a.sc || a.p - b.p);
}

/** Je země způsobilá zahájit operaci? Válčí, má aspoň `INV_MIN` volných transportů, dost divizí a krycí flotilu; nemá rozběhnutou operaci. */
function ready(state, o) {
  if (!state.nav || !enemiesOf(state.mil, o).length || invOf(state).some((x) => x.o === o)) return false;
  if (transportsOf(state, o).free < AI.INV_MIN || divisionCount(state, o) < AI.INV_TOTAL_MIN) return false;
  return navalBalance(state, o).own > 0 && coverFleet(state, o) > 0;
}

/**
 * Námořní převaha u místa vylodění (M88): krycí flotila musí být aspoň `AI.INV_NAVAL`krát silnější než nepřátelské flotily do `AI.INV_NAVAL_KM` od cílové
 * mořské oblasti. (Dřív se porovnávala všechna loďstva; výprava do blízkých vod pod vlastním pobřežím ale nečeká na převahu na všech mořích.)
 */
export function localSuperiority(state, o, sea) {
  const w = getWorld(), fleet = state.nav.fleets[coverFleet(state, o)];
  if (!fleet) return false;
  let foe = 0;
  for (const f of state.nav.fleets) {
    if (!f || !atWar(state.mil, o, f.o)) continue;
    const atk = powerOf(f.ships).atk;
    if (atk > 0 && seaKm(w, f.p, sea) <= AI.INV_NAVAL_KM) foe += atk;
  }
  return powerOf(fleet.ships).atk >= AI.INV_NAVAL * foe;
}

/**
 * Zahájí operaci: ze `free` (armády bez úkolu: [{ id, ds }]) vybere divize v jedné zóně, nejbližší vhodnému přístavu, sestaví z nich sbor, který se shromáždí v přístavu.
 * Bez vhodného místa vylodění, dost divizí nebo transportů vrací tentýž stav.
 */
export function startInvasion(state, o, free) {
  if (!ready(state, o)) return state;
  const w = getWorld(), g = geo(w), mil = state.mil, zones = landZones(state, o);
  const byZone = new Map();
  for (const a of free) for (const id of a.ds) {
    const d = mil.divs[id];
    if (!d || d.b || d.o !== o) continue;
    const z = zones[d.p];
    if (z) byZone.set(z, [...(byZone.get(z) || []), id]);
  }
  let best = null;
  for (const [z, ids] of [...byZone.entries()].sort((a, b) => b[1].length - a[1].length || a[0] - b[0])) {
    const n = Math.min(AI.INV_MAX, ids.length, transportsOf(state, o).free, Math.ceil(divisionCount(state, o) * AI.INV_SHARE));
    if (n < AI.INV_MIN) continue;
    const site = landingSites(state, o, embarkPorts(state, o, zones, z), n).find((x) => localSuperiority(state, o, x.sea));
    if (site) { best = { ids, n, site }; break; }
  }
  if (!best) return state;
  const { site } = best;
  best.n = Math.min(best.n, Math.max(AI.INV_MIN, Math.ceil(site.near * AI.INV_RATIO) + AI.INV_EXTRA));   // M88: sbor jen tak velký, kolik cíl žádá
  const ids = best.ids.slice().sort((a, b) => g.distKm(mil.divs[a].p, site.from) - g.distKm(mil.divs[b].p, site.from) || a - b).slice(0, best.n);
  const tag = w.owners[o].tag;
  let s = createArmy(state, tag, 'Expediční sbor', ids);
  if (s === state) return state;
  const army = s.mil.armies.length - 1;
  s = setPlan(s, army, { k: 'area', area: [site.from] });
  if (!s.mil.armies[army].plan) return state;
  return setInv(s, [...invOf(s), { o, army, t: s.tick, ph: 0, fleet: coverFleet(state, o), p: site.p }]);
}

/** Denní krok operací země: sbor se shromáždí v přístavu, krycí flotila vyplouvá k místu vylodění a pak se sbor nalodí; nepovedená nebo zastaralá operace se zruší, po pauze po vyplutí záznam zaniká. */
export function advanceInvasions(state, o) {
  const inv = invOf(state), op = inv.find((x) => x.o === o);
  if (!op) return state;
  const drop = (s) => setInv(s, invOf(s).filter((x) => x !== op));
  if (op.ph === 1) return state.tick - op.t >= AI.INV_COOL_DAYS * 24 ? drop(state) : state;
  const mil = state.mil, w = getWorld();
  const ids = [];
  for (let id = 1; id < mil.divs.length; id++) { const d = mil.divs[id]; if (d && d.o === o && d.army === op.army) ids.push(id); }
  const late = state.tick - op.t > AI.INV_STAGE_DAYS * 24;
  const stop = (s) => (mil.armies[op.army] ? drop(clearPlan(s, op.army)) : drop(s));
  const fleet = state.nav.fleets[op.fleet];
  if (!ids.length || !enemiesOf(mil, o).length || !fleet || fleet.o !== o || late) return stop(state);
  const aboard = ids.filter((id) => { const d = mil.divs[id]; return !d.b && w.portLevel[d.p] > 0 && state.ctrl[d.p] === o && !d.path.length; });
  const zones = landZones(state, o);
  const z = aboard.length ? zones[mil.divs[aboard[0]].p] : 0;
  const take = aboard.filter((id) => zones[mil.divs[id].p] === z).slice(0, Math.min(transportsOf(state, o).free, AI.INV_MAX));
  const gathered = take.length >= Math.min(ids.length, AI.INV_MIN) && take.length >= ids.length * AI.INV_GATHER;
  // místo vylodění se ověřuje každý den; krycí flotila plují k němu, i když sbor ještě není pohromadě
  const ports = z ? embarkPorts(state, o, zones, z) : [];
  const sites = gathered ? landingSites(state, o, ports, take.length) : [];
  const site = sites.find((x) => x.p === op.p) || sites[0];
  let s = state;
  if (site && site.p !== op.p) { s = setInv(s, invOf(s).map((x) => (x === op ? { ...op, p: site.p } : x))); }
  if (site && fleet.p !== site.sea && !fleet.path.length) s = setFleetMission(orderFleet(s, op.fleet, site.sea), op.fleet, 'patrol');   // M81: krycí flotila hlídkuje
  if (!site || !gathered || fleet.p !== site.sea || foeAtSea(state, o, site.sea) || sailBlock(s, take, site.p)) return s;
  const sailed = orderSail(s, take, site.p);
  if (sailed === s) return s;
  let out = clearPlan(sailed, op.army);
  out = logAdd(out, { k: 'inv', o, x: site.p, y: take.length, a: out.ctrl[site.p] === o ? 0 : 1, b: out.ctrl[site.p] });
  const cur = invOf(out).find((x) => x.o === o);
  return setInv(out, invOf(out).map((x) => (x === cur ? { ...cur, t: out.tick, ph: 1 } : x)));
}
