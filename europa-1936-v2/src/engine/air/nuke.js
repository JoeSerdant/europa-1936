// Jaderná zbraň (M82): po technologii „Atomová bomba“ (`jadro3`) země vyrábí bomby (`air.nuke[o] = { n: kusů, p: dnů výroby další }`),
// jednu za `AIR.NUKE_DAYS` dní, nejvýš `NUKE_MAX`. Svrhnout ji může křídlo strategických bombardérů v dosahu na stát země, se kterou válčí,
// když nad cílem nemá nepřítel převahu hlídek. Úder zničí část továren státu, oslabí divize v něm a otřese stabilitou a podporou války cíle.
// Čisté funkce, neplatný vstup vrací tentýž stav.
import { getWorld } from '../world.js';
import { atWar } from '../army/war.js';
import { isDone } from '../research/core.js';
import { logAdd } from '../log.js';
import { PLANES } from '../../data/air/planes.js';
import { AIR } from './constants.js';
import { stateKm } from './core.js';
import { patrolOver } from './para.js';

export const NUKE_TECH = 'jadro3';

/** Denní výroba bomb: vrací { nuke (nové pole), ready (země, které dnes dostaly bombu) } nebo null beze změny. */
export function nukeProduction(state) {
  const cur = state.air.nuke;
  if (!cur) return null;
  let nuke = null;
  const ready = [];
  for (let o = 1; o < cur.length; o++) {
    const x = cur[o];
    if (!x || x.n >= AIR.NUKE_MAX || !isDone(state, o, NUKE_TECH) || (state.dip.cap && state.dip.cap[o])) continue;
    if (!nuke) nuke = cur.slice();
    const p = x.p + 1;
    if (p >= AIR.NUKE_DAYS) { nuke[o] = { n: x.n + 1, p: 0 }; ready.push(o); } else nuke[o] = { n: x.n, p };
  }
  return nuke ? { nuke, ready } : null;
}

/** Křídlo strategických bombardérů země `o`, které doletí nad stát `s` (aspoň `NUKE_PLANES` strojů), nebo 0. */
export function nukeCarrier(state, o, s) {
  const wings = state.air.wings;
  for (let id = 1; id < wings.length; id++) {
    const wg = wings[id];
    if (wg && wg.o === o && wg.t === 'str' && wg.n >= AIR.NUKE_PLANES && stateKm(wg.s, s) <= PLANES.str.range) return id;
  }
  return 0;
}

/** Proč země `o` nemůže svrhnout bombu na stát `s` (český text), nebo null. */
export function nukeBlock(state, o, s) {
  const w = getWorld();
  if (!state.air || !state.air.nuke || !Number.isInteger(o) || !state.air.nuke[o]) return 'Neplatná země.';
  if (!Number.isInteger(s) || s < 1 || s >= w.states.length) return 'Neplatný stát.';
  if (state.air.nuke[o].n < 1) return isDone(state, o, NUKE_TECH) ? 'Žádná bomba není hotová.' : 'Chybí technologie Atomová bomba.';
  const t = state.stateOwner[s];
  if (!t || !atWar(state.mil, o, t)) return 'Cíl musí být stát země, se kterou válčíte.';
  if (!nukeCarrier(state, o, s)) return `Chybí křídlo aspoň ${AIR.NUKE_PLANES} strategických bombardérů s doletem k cíli.`;
  const air = patrolOver(state, o, s);
  if (air.foe > air.own) return 'Nad cílem má nepřítel vzdušnou převahu.';
  return null;
}

/** Svrhne atomovou bombu na stát `s`. */
export function dropNuke(state, o, s) {
  if (nukeBlock(state, o, s)) return state;
  const w = getWorld(), t = state.stateOwner[s];
  const nuke = state.air.nuke.slice();
  nuke[o] = { ...nuke[o], n: nuke[o].n - 1 };
  // továrny a loděnice státu
  const st = state.ind.st.slice(), e = st[s];
  const cut = (v) => Math.floor((v || 0) * (1 - AIR.NUKE_FACTORY));
  st[s] = { ...e, civ: cut(e.civ), mil: cut(e.mil), dok: cut(e.dok) };
  // divize ve státě
  const inState = new Set(w.states[s].v);
  const divs = state.mil.divs.map((d) => (d && inState.has(d.p) ? { ...d, hp: d.hp * AIR.NUKE_UNITS, org: d.org * AIR.NUKE_UNITS } : d));
  // stabilita a podpora války cíle
  const own = state.pol.own.slice();
  own[t] = { ...own[t], stab: Math.max(0, own[t].stab - AIR.NUKE_STAB), ws: Math.max(0, own[t].ws - AIR.NUKE_WS) };
  const next = {
    ...state,
    air: { ...state.air, nuke, ver: state.air.ver + 1 },
    ind: { ...state.ind, st, ver: state.ind.ver + 1 },
    mil: { ...state.mil, divs, ver: state.mil.ver + 1 },
    pol: { ...state.pol, own },
  };
  return logAdd(next, { k: 'nuke', o, x: s, b: t });
}

/** Přehled jaderných zbraní země pro rozhraní: { tech, n, left (dnů do další), targets: [{ s, name, owner, block }] }. */
export function nukeView(state, o) {
  const w = getWorld(), x = state.air.nuke[o] || { n: 0, p: 0 };
  const tech = isDone(state, o, NUKE_TECH);
  const targets = [];
  if (x.n > 0) {
    for (let s = 1; s < w.states.length; s++) {
      const t = state.stateOwner[s];
      if (!t || !atWar(state.mil, o, t)) continue;
      const e = state.ind.st[s];
      targets.push({ s, name: w.states[s].n, owner: t, fac: (e.civ || 0) + (e.mil || 0) + (e.dok || 0), block: nukeBlock(state, o, s) });
    }
    targets.sort((a, b) => (a.block ? 1 : 0) - (b.block ? 1 : 0) || b.fac - a.fac || a.s - b.s);
  }
  return { tech, n: x.n, left: tech && x.n < AIR.NUKE_MAX ? AIR.NUKE_DAYS - x.p : 0, targets: targets.slice(0, 12) };
}
