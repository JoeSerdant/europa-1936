// Příkazy doktrín (M34): `(state, …) → state`, neplatný vstup vrací tentýž objekt.
import { getWorld } from '../world.js';
import { DOCTRINES } from '../../data/doc/doctrines.js';
import { DOC } from './constants.js';
import { docBlock } from './core.js';
import { logAdd } from '../log.js';

/** Přijme doktrínu `id` za zkušenosti své větve. */
export function adoptDoctrine(state, o, id) {
  const w = getWorld();
  if (!Number.isInteger(o) || o < 1 || o >= w.owners.length || !DOCTRINES[id] || docBlock(state, o, id)) return state;
  const d = DOCTRINES[id], own = state.doc.own[o];
  const next = state.doc.own.slice();
  next[o] = { ...own, xp: { ...own.xp, [d.branch]: own.xp[d.branch] - DOC.COST[d.level - 1] }, done: { ...own.done, [id]: 1 }, track: { ...own.track, [d.branch]: d.track } };
  const out = { ...state, doc: { ...state.doc, own: next, ver: state.doc.ver + 1 } };
  const player = state.player ? w.ownerIdx[state.player] : 0;
  return o === player ? logAdd(out, { k: 'doctrine', o, x: id }) : out;
}

/** Přidá zkušenosti větve (cheat, testy). */
export function addXp(state, o, branch, n) {
  const own = state.doc.own[o];
  if (!own || !(branch in own.xp) || !Number.isFinite(n) || n === 0) return state;
  const next = state.doc.own.slice();
  next[o] = { ...own, xp: { ...own.xp, [branch]: Math.max(0, Math.min(DOC.XP_MAX, own.xp[branch] + n)) } };
  return { ...state, doc: { ...state.doc, own: next, ver: state.doc.ver + 1 } };
}
