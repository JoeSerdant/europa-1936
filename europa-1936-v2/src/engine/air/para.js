// Letecký výsadek (M80): divize složená jen z výsadkových praporů, která stojí ve státě s vlastním letištěm, seskočí na provincii v dosahu `AIR.DROP_KM`.
// Cíl musí být vlastní, přátelský nebo nepřátelský a bez nepřátelských divizí; nad státem cíle nesmí mít nepřítel převahu hlídek. Let trvá `DROP_HOURS`
// hodin (divize je zatím v `air.drops`, podobně jako přeprava po moři), po seskoku má divize zbytek organizace `DROP_ORG` a nepřátelskou provincii obsadí.
// Čisté funkce, neplatný vstup vrací tentýž stav.
import { getWorld } from '../world.js';
import { geo } from '../army/geo.js';
import { atWar } from '../army/war.js';
import { statsOf } from '../army/unit.js';
import { hasAccess } from '../dip/accessCore.js';
import { sameFaction } from '../dip/core.js';
import { logAddMany } from '../log.js';
import { AIR } from './constants.js';
import { PLANES } from '../../data/air/planes.js';
import { afbOf } from './core.js';

/** Síla hlídek nad státem `s`: { own (země `o` a její blok), foe (země ve válce s `o`) }. */
export function patrolOver(state, o, s) {
  let own = 0, foe = 0;
  for (const wg of state.air.wings) {
    if (!wg || wg.m !== 'air' || wg.to !== s) continue;
    const p = wg.n * PLANES[wg.t].atk;
    if (wg.o === o || sameFaction(state, o, wg.o)) own += p; else if (atWar(state.mil, o, wg.o)) foe += p;
  }
  return { own, foe };
}

/** Proč divize `divIds` nemohou seskočit na provincii `dest` (český text), nebo null. */
export function dropBlock(state, divIds, dest) {
  const w = getWorld(), mil = state.mil, g = geo(w);
  if (!state.air) return 'Hra nemá letectvo.';
  if (!Array.isArray(divIds) || !divIds.length) return 'Nejsou vybrané žádné divize.';
  if (!Number.isInteger(dest) || dest < 1 || dest > w.L) return 'Cíl musí být pevninská provincie.';
  const first = mil.divs[divIds[0]];
  if (!first) return 'Divize neexistuje.';
  const o = first.o, c = state.ctrl[dest];
  if (c !== o && !atWar(mil, o, c) && !hasAccess(state.dip, o, c)) return 'Na cizí neutrální území seskočit nelze.';
  for (const d of mil.divs) if (d && d.p === dest && atWar(mil, o, d.o)) return 'Cíl hájí nepřátelské divize – výsadek jen na nehájenou provincii.';
  const perState = new Map();
  for (const id of divIds) {
    const d = mil.divs[id];
    if (!d || d.o !== o) return 'Divize patří různým zemím nebo neexistuje.';
    if (!statsOf(mil, d).para) return 'Seskočit umí jen divize složené z výsadkových praporů.';
    if (d.b || d.path.length) return 'Divize v boji nebo na pochodu nemůže nastoupit do letadel.';
    const s = w.provState[d.p];
    if (state.ctrl[d.p] !== o || state.stateOwner[s] !== o || !afbOf(state.ind, s)) return 'Divize musí stát ve vlastním státě s letištěm.';
    if (g.distKm(d.p, dest) > AIR.DROP_KM) return `Cíl je dál než ${AIR.DROP_KM} km od letiště.`;
    perState.set(s, (perState.get(s) || 0) + 1);
  }
  for (const [s, n] of perState) {
    const busy = state.air.drops.filter((x) => w.provState[x.from] === s).length;
    const cap = afbOf(state.ind, s) * AIR.DROP_PER_LEVEL;
    if (n + busy > cap) return `Letiště unese najednou jen ${cap} ${cap === 1 ? 'divizi' : cap < 5 ? 'divize' : 'divizí'}.`;
  }
  const air = patrolOver(state, o, w.provState[dest]);
  if (air.foe > air.own) return 'Nad cílem má nepřítel vzdušnou převahu – pošlete tam nejdřív stíhací hlídky.';
  return null;
}

/** Vyšle divize na letecký výsadek do provincie `dest`. */
export function orderDrop(state, divIds, dest) {
  if (dropBlock(state, divIds, dest)) return state;
  const mil = state.mil, o = mil.divs[divIds[0]].o;
  const divs = mil.divs.slice(), drops = state.air.drops.slice();
  for (const id of divIds) {
    const d = mil.divs[id];
    drops.push({ id, o, from: d.p, to: dest, t0: state.tick, arrive: state.tick + AIR.DROP_HOURS, div: d });
    divs[id] = null;
  }
  return { ...state, mil: { ...mil, divs, ver: mil.ver + 1 }, air: { ...state.air, drops, ver: state.air.ver + 1 } };
}

/** Přistání výsadků, kterým vypršel čas letu: seskok do cíle, nebo návrat na letiště (cíl mezitím obsadili obránci nebo už není dosažitelný). */
export function dropArrivals(state) {
  const due = state.air.drops.filter((x) => x.arrive <= state.tick);
  if (!due.length) return state;
  const w = getWorld();
  const divs = state.mil.divs.slice();
  let ctrl = state.ctrl, own = false, ownerVer = state.ownerVer;
  const player = state.player ? w.ownerIdx[state.player] : 0, logs = [];
  for (const x of due) {
    const c = ctrl[x.to], foe = atWar(state.mil, x.o, c);
    const defended = divs.some((d) => d && d.p === x.to && atWar(state.mil, x.o, d.o));
    const ok = !defended && (c === x.o || foe || hasAccess(state.dip, x.o, c));
    const d = x.div;
    if (ok) {
      if (foe) { if (!own) { ctrl = ctrl.slice(); own = true; } ctrl[x.to] = x.o; ownerVer++; }
      divs[x.id] = { ...d, p: x.to, path: [], prog: 0, b: 0, rt: 0, hold: 0, dig: 0, org: d.org * AIR.DROP_ORG };
    } else {
      divs[x.id] = { ...d, path: [], prog: 0, b: 0, hp: d.hp * AIR.DROP_FAIL_HP, org: d.org * AIR.DROP_ORG };
    }
    if (x.o === player) logs.push({ k: 'drop', o: x.o, x: ok ? x.to : x.from, a: ok ? 1 : 0 });
    else if (ok && foe && c === player) logs.push({ k: 'lands', o: x.o, x: x.to, b: c, y: 1 });
  }
  const drops = state.air.drops.filter((x) => x.arrive > state.tick);
  return logAddMany({ ...state, ctrl, ownerVer, mil: { ...state.mil, divs, ver: state.mil.ver + 1 }, air: { ...state.air, drops, ver: state.air.ver + 1 } }, logs);
}
