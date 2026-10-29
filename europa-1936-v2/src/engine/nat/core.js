// Společné pomůcky národních cílů a událostí (M22): bonusy cílů, stav cíle, podmínky událostí, deterministické „náhodné“ číslo.
import { getWorld } from '../world.js';
import { FOCUS_BY_ID, treeOf, EVENT_BY_ID } from '../../data/nat/index.js';
import { hasWar } from '../army/war.js';

export const NO_FOCUS_MODS = Object.freeze({});
const modCache = new WeakMap();   // done → bonusy

/** Součet trvalých bonusů hotových cílů (mezipaměť podle objektu `done`). */
export function focusMods(done) {
  if (!done) return NO_FOCUS_MODS;
  let m = modCache.get(done);
  if (m) return m;
  m = {};
  for (const id in done) { const mod = FOCUS_BY_ID[id]?.mod; if (mod) for (const k in mod) m[k] = (m[k] || 0) + mod[k]; }
  modCache.set(done, m);
  return m;
}

export const natOwn = (state, o) => state.nat.own[o] || null;
export const tagOf = (o) => getWorld().owners[o].tag;
export const focusTreeOf = (o) => treeOf(tagOf(o));

/** Stav cíle: done | active | available | locked | excluded. */
export function focusStatus(own, f) {
  if (own.done[f.id]) return 'done';
  if (own.cur && own.cur.id === f.id) return 'active';
  if (f.excl.some((x) => own.done[x] || (own.cur && own.cur.id === x))) return 'excluded';
  if (!f.req.every((r) => own.done[r])) return 'locked';
  if (f.any.length && !f.any.some((r) => own.done[r])) return 'locked';
  return 'available';
}

/** Deterministické „náhodné“ číslo <0,1) z dne, země a textu (nespotřebovává `state.rng`). */
export function rand01(tick, o, key) {
  let h = Math.imul((tick + 1) | 0, 2654435761) ^ Math.imul(o + 1, 40503);
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; h = Math.imul(h, 3266489917); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Splňuje země `o` podmínky události (bez náhody)? */
export function eventReady(state, o, ev, own) {
  const c = ev.cond, day = state.tick / 24;
  if (c.tags && !c.tags.includes(tagOf(o))) return false;
  if (c.from != null && day < c.from) return false;
  if (c.until != null && day > c.until) return false;
  if (c.flag && !own.flags[c.flag]) return false;
  if (c.noFlag && own.flags[c.noFlag]) return false;
  if (c.focus && !own.done[c.focus]) return false;
  const p = state.pol.own[o];
  if (c.war != null && hasWar(state.mil, o) !== c.war) return false;
  if (c.stabBelow != null && !(p.stab < c.stabBelow)) return false;
  if (c.stabAbove != null && !(p.stab > c.stabAbove)) return false;
  if (c.wsBelow != null && !(p.ws < c.wsBelow)) return false;
  if (c.wsAbove != null && !(p.ws > c.wsAbove)) return false;
  if (c.law) for (const cat in c.law) if (p.laws[cat] !== c.law[cat]) return false;
  const seen = own.seen[ev.id];
  if (seen != null && (!ev.cool || state.tick - seen < ev.cool * 24)) return false;
  return true;
}
export { EVENT_BY_ID };
