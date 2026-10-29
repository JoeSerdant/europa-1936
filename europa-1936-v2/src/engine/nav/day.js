// Hodinový a denní krok námořnictva (M27): pohyb flotil, příchody přepravy; denně boj flotil, potopení transportů a návrat.
import { getWorld } from '../world.js';
import { SHIPS, SHIP_IDS } from '../../data/navy/index.js';
import { atWar } from '../army/war.js';
import { sameFaction } from '../dip/core.js';
import { logAddMany } from '../log.js';
import { NAV } from './constants.js';
import { seaGraph, seaKm, powerOf, fleetSpeed, seaRoute, homeSeas, seaBlocked } from './core.js';

const friendly = (state, a, b) => a === b || sameFaction(state, a, b);

// ---------------------------------------------------------------- hodinově
/** Posun flotil po cestě: postup do první oblasti cesty podle vzdálenosti a rychlosti. */
function moveFleets(state) {
  const w = getWorld();
  let fleets = state.nav.fleets, copy = false;
  for (let i = 1; i < fleets.length; i++) {
    const f = fleets[i];
    if (!f || !f.path.length) continue;
    const spd = fleetSpeed(f.ships);
    if (!spd) continue;
    const hours = Math.max(1, seaKm(w, f.p, f.path[0]) / spd);
    let prog = f.prog + 100 / hours, p = f.p, path = f.path;
    if (prog >= 100) { p = path[0]; path = path.slice(1); prog = 0; }
    if (!copy) { fleets = fleets.slice(); copy = true; }
    fleets[i] = { ...f, p, path, prog, to: path.length ? f.to : 0 };
  }
  return copy ? { ...state, nav: { ...state.nav, fleets, ver: state.nav.ver + 1 } } : state;
}

/** Příchody přepravy: divize se objeví v cíli (vylodění), nebo se vrátí do výchozího přístavu. */
function arrivals(state) {
  const due = state.nav.sail.filter((s) => s.arrive <= state.tick);
  if (!due.length) return state;
  const w = getWorld();
  const divs = state.mil.divs.slice();
  let ctrl = state.ctrl, ctrlCopy = false, ownerVer = state.ownerVer;
  const player = state.player ? w.ownerIdx[state.player] : 0;
  const logs = [];
  for (const s of due) {
    const d = s.div;
    const enemyThere = divs.some((x) => x && x.p === s.to && atWar(state.mil, s.o, x.o));
    let place = s.to, landed = true;
    if (state.ctrl[s.to] !== s.o) {
      if (enemyThere || !atWar(state.mil, s.o, state.ctrl[s.to])) { place = state.ctrl[s.from] === s.o ? s.from : s.to; landed = false; }
      else {
        if (!ctrlCopy) { ctrl = ctrl.slice(); ctrlCopy = true; }
        ctrl[s.to] = s.o; ownerVer++;
      }
    }
    const port = w.portLevel[place] > 0;
    divs[s.id] = { ...d, p: place, path: [], prog: 0, b: 0, rt: 0, hold: 0, dig: 0, org: d.org * (landed && !port ? NAV.LAND_ORG : 1) };
    if (o_isPlayer(s.o, player)) logs.push({ k: 'landing', o: s.o, x: landed ? place : s.from, a: landed ? 1 : 0 });
  }
  const sail = state.nav.sail.filter((s) => s.arrive > state.tick);
  const out = { ...state, ctrl, ownerVer, mil: { ...state.mil, divs, ver: state.mil.ver + 1 }, nav: { ...state.nav, sail, ver: state.nav.ver + 1 } };
  return logAddMany(out, logs);
}
const o_isPlayer = (o, player) => o === player;

export function navHour(state) {
  if (!state.nav) return state;
  let s = state;
  if (s.nav.fleets.some((f) => f && f.path.length)) s = moveFleets(s);
  if (s.nav.sail.some((x) => x.arrive <= s.tick)) s = arrivals(s);
  return s.tick % 24 === 0 ? navDay(s) : s;
}

// ---------------------------------------------------------------- denně
/** Najde nejbližší domovskou oblast pro ústup flotily. */
function retreatTo(state, f) {
  const goals = homeSeas(state, f.o);
  if (!goals.size) return f.p;
  if (goals.has(f.p)) return f.p;
  const r = seaRoute(f.p, goals, null, 1e9);
  return r ? r.path[r.path.length - 1] : f.p;
}

/** Podíl, který strana s palbou `fireA` zničí protivníkovi se silou `hpB`. */
const lossFrac = (fireA, hpB) => (hpB > 0 ? Math.min(NAV.DMG_CAP, (NAV.DMG * fireA) / hpB) : 0);

/** Použije ztrátu `frac` na lodě flotily (přenos zbytků); vrací novou flotilu (nebo null, je-li prázdná). */
function applyLoss(f, frac) {
  const ships = { ...f.ships }, c = { ...f.c };
  for (const k of SHIP_IDS) {
    if (!ships[k]) continue;
    c[k] = (c[k] || 0) + ships[k] * frac;
    const lost = Math.min(ships[k], Math.floor(c[k]));
    ships[k] -= lost; c[k] -= lost;
    if (!ships[k]) { delete ships[k]; delete c[k]; }
  }
  return powerOf(ships).n ? { ...f, ships, c } : null;
}

function combat(state) {
  const f0 = state.nav.fleets;
  const byLabel = new Map();
  for (let i = 1; i < f0.length; i++) if (f0[i]) { const l = f0[i].p; if (!byLabel.has(l)) byLabel.set(l, []); byLabel.get(l).push(i); }
  let fleets = f0, copy = false;
  const touched = [];
  for (const [label, ids] of [...byLabel].sort((a, b) => a[0] - b[0])) {
    if (ids.length < 2) continue;
    const owners = [...new Set(ids.map((i) => f0[i].o))].sort((a, b) => a - b);
    if (owners.length < 2) continue;
    // strany: první země a její spojenci proti všem, kdo s ní válčí (a jejich spojencům)
    const A = owners[0];
    const sideA = owners.filter((x) => friendly(state, A, x));
    const sideB = owners.filter((x) => !sideA.includes(x) && atWar(state.mil, A, x) || (!sideA.includes(x) && sideA.some((a) => atWar(state.mil, a, x))));
    if (!sideB.length) continue;
    const idsA = ids.filter((i) => sideA.includes(f0[i].o)), idsB = ids.filter((i) => sideB.includes(f0[i].o));
    const pa = idsA.reduce((a, i) => { const p = powerOf(f0[i].ships); return { hp: a.hp + p.hp, atk: a.atk + p.atk }; }, { hp: 0, atk: 0 });
    const pb = idsB.reduce((a, i) => { const p = powerOf(f0[i].ships); return { hp: a.hp + p.hp, atk: a.atk + p.atk }; }, { hp: 0, atk: 0 });
    if (pa.atk <= 0 && pb.atk <= 0) continue;
    const fa = lossFrac(pb.atk, pa.hp), fb = lossFrac(pa.atk, pb.hp);
    if (!copy) { fleets = fleets.slice(); copy = true; }
    for (const [list, frac] of [[idsA, fa], [idsB, fb]]) for (const i of list) { fleets[i] = fleets[i] && applyLoss(fleets[i], frac); touched.push(i); }
  }
  if (!copy) return state;
  // ústup oslabených flotil a očištění
  for (const i of touched) {
    const f = fleets[i];
    if (!f) continue;
    if (powerOf(f.ships).hp < f.mx * NAV.RETREAT) {
      const tmp = { ...f, p: retreatTo({ ...state, nav: { ...state.nav, fleets } }, f), path: [], to: 0, prog: 0, mx: powerOf(f.ships).hp };
      fleets[i] = tmp;
    }
  }
  return { ...state, nav: { ...state.nav, fleets, ver: state.nav.ver + 1 } };
}

/** Denně: divize na moři, jejichž trasu zablokovala nepřátelská flotila, se potopí (spolu s transportní lodí). */
function sinkings(state) {
  const sail = state.nav.sail;
  if (!sail.length) return state;
  const w = getWorld();
  const player = state.player ? w.ownerIdx[state.player] : 0;
  const keep = [], lost = [];
  for (const s of sail) {
    const span = Math.max(1, s.arrive - s.t0);
    const frac = Math.min(1, (state.tick - s.t0) / span);
    const idx = Math.min(s.route.length - 1, Math.floor(frac * s.route.length));
    const bad = s.route.slice(idx).some((l) => seaBlocked(state, s.o, l));
    (bad ? lost : keep).push(s);
  }
  if (!lost.length) return state;
  // transportní lodě padnou: nejdřív z rezervy, jinak z flotil
  const pool = state.nav.pool.slice();
  let fleets = state.nav.fleets.slice();
  for (const s of lost) {
    if (pool[s.o].tr > 0) pool[s.o] = { ...pool[s.o], tr: pool[s.o].tr - 1 };
    else {
      const i = fleets.findIndex((f) => f && f.o === s.o && f.ships.tr > 0);
      if (i > 0) { const ships = { ...fleets[i].ships, tr: fleets[i].ships.tr - 1 }; if (!ships.tr) delete ships.tr; fleets[i] = powerOf(ships).n ? { ...fleets[i], ships } : null; }
    }
  }
  const cas = state.mil.cas.slice();
  for (const s of lost) cas[s.o] += 1;
  const out = { ...state, mil: { ...state.mil, cas }, nav: { ...state.nav, sail: keep, pool, fleets, ver: state.nav.ver + 1 } };
  return logAddMany(out, lost.filter((s) => s.o === player).map((s) => ({ k: 'sunk', o: s.o, x: s.to })));
}

export function navDay(state) {
  return sinkings(combat(state));
}
void SHIPS; void seaGraph;
