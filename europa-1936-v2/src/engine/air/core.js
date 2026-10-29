// Společné pomůcky letectva (M30): letiště států, kapacita, dolet, síla křídel.
import { getWorld } from '../world.js';
import { AIR } from './constants.js';
import { PLANES } from '../../data/air/planes.js';

const idxOf = (o) => (typeof o === 'string' ? getWorld().ownerIdx[o] : o);

/** Úroveň letiště státu. */
export const afbOf = (ind, s) => (ind.st[s] && ind.st[s].afb) || 0;
export const capacityOf = (ind, s) => afbOf(ind, s) * AIR.PER_LEVEL;

/** Střed státu (souřadnice hlavní provincie). */
export function stateCenter(s) {
  const w = getWorld();
  return w.land[w.states[s].cap].c;
}
/** Vzdálenost středů dvou států v km. */
export function stateKm(a, b) {
  const w = getWorld();
  if (a === b) return 0;
  const ca = stateCenter(a), cb = stateCenter(b);
  return Math.hypot(ca[0] - cb[0], ca[1] - cb[1]) * w.frame.km;
}

/** Úroveň techniky letounu země. */
export const levelOf = (state, o, t) => (state.mil.lv[o] && state.mil.lv[o][t]) || 1;
export const levelMult = (state, o, t) => 1 + AIR.LV_MULT * (levelOf(state, o, t) - 1);

/** Letadla země na letištích států: Map(stát → počet). */
export function planesAt(state, o) {
  const m = new Map();
  for (const w of state.air.wings) if (w && w.o === o) m.set(w.s, (m.get(w.s) || 0) + w.n);
  return m;
}

/** Vlastní státy s letištěm: [{ s, lvl, cap, used, free }]. */
export function basesOf(state, o) {
  o = idxOf(o);
  const w = getWorld(), used = planesAt(state, o), out = [];
  for (let s = 1; s < w.states.length; s++) {
    if (state.stateOwner[s] !== o || state.ctrl[w.states[s].cap] !== o) continue;
    const lvl = afbOf(state.ind, s);
    if (!lvl) continue;
    const u = used.get(s) || 0, cap = lvl * AIR.PER_LEVEL;
    out.push({ s, lvl, cap, used: u, free: Math.max(0, cap - u) });
  }
  return out;
}

/** Smí křídlo typu `t` plnit misi `m`? */
export const roleOk = (t, m) => !!PLANES[t] && PLANES[t].roles.includes(m);
