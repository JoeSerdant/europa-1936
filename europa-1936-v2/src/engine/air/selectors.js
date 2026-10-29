// Dotazy na letectvo pro rozhraní a AI (čisté, bez změn stavu).
import { getWorld } from '../world.js';
import { AIR } from './constants.js';
import { PLANES, PLANE_IDS } from '../../data/air/planes.js';
import { isUnlocked } from '../research/core.js';
import { basesOf, stateKm, levelOf } from './core.js';
import { missionBlock } from './commands.js';

const idxOf = (o) => (typeof o === 'string' ? getWorld().ownerIdx[o] : o);

/** Souhrn letectva země: křídla (se jménem a stavem), rezerva, letiště, celkové počty. */
export function airOf(state, o) {
  o = idxOf(o);
  const wings = state.air.wings.filter((x) => x && x.o === o);
  const pool = state.air.pool[o] || {};
  const inWings = {};
  for (const wg of wings) inWings[wg.t] = (inWings[wg.t] || 0) + wg.n;
  const bases = basesOf(state, o);
  return {
    o, wings, pool, inWings, bases,
    total: PLANE_IDS.reduce((a, t) => a + (pool[t] || 0) + (inWings[t] || 0), 0),
    cap: bases.reduce((a, b) => a + b.cap, 0), used: bases.reduce((a, b) => a + b.used, 0),
    types: PLANE_IDS.filter((t) => isUnlocked(state, o, PLANES[t].unlock)),
    levels: Object.fromEntries(PLANE_IDS.map((t) => [t, levelOf(state, o, t)])),
  };
}

/** Státy, které křídlo `id` může zvolit jako cíl mise `m` (v doletu a dovoleném smyslu): [{ s, km }] podle vzdálenosti. */
export function targetsFor(state, id, m) {
  const wg = state.air.wings[id], w = getWorld();
  if (!wg) return [];
  const out = [];
  for (let s = 1; s < w.states.length; s++) {
    if (!state.stateOwner[s] || missionBlock(state, id, m, s)) continue;
    out.push({ s, km: Math.round(stateKm(wg.s, s)) });
  }
  return out.sort((a, b) => a.km - b.km);
}

/** Bonus podpory vzduchem pro divize země `o` ve státě `s` (0–CAS_MAX). */
export const airSupport = (state, o, s) => (state.air.sup && state.air.sup[`${o}:${s}`]) || 0;
export { AIR };
