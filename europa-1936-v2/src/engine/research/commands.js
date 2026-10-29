// Příkazy výzkumu (M20): čisté funkce `(state, …) → state`; neplatný vstup vrací tentýž objekt. Země je index `o`.
// Příkazy nehlídají, komu věc patří vůči hráči – to dělá `ui/actions.js`.
import { getWorld } from '../world.js';
import { TECHS } from '../../data/research/index.js';
import { isAvailable, slotCount } from './core.js';

const patch = (state, o, own) => {
  const arr = state.tech.own.slice();
  arr[o] = own;
  return { ...state, tech: { ver: state.tech.ver + 1, own: arr } };
};
const validOwner = (state, o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length && !!state.tech.own[o];

/** Zadá výzkum technologie `id` do slotu `slot` (obsazený slot se přepíše, rozpracovaný postup technologie zůstává). */
export function startResearch(state, o, slot, id) {
  if (!validOwner(state, o)) return state;
  const cur = state.tech.own[o];
  if (!Number.isInteger(slot) || slot < 0 || slot >= slotCount(cur.done, o) || !isAvailable(cur, id)) return state;
  if (cur.slots.includes(id)) return state;
  const slots = cur.slots.slice();
  while (slots.length <= slot) slots.push(0);
  slots[slot] = id;
  return patch(state, o, { ...cur, slots });
}

/** Uvolní slot (rozpracovaný postup se zachová). */
export function cancelResearch(state, o, slot) {
  if (!validOwner(state, o)) return state;
  const cur = state.tech.own[o];
  if (!Number.isInteger(slot) || !cur.slots[slot]) return state;
  const slots = cur.slots.slice();
  slots[slot] = 0;
  return patch(state, o, { ...cur, slots });
}

/** Hotová technologie hned (odměna cílů a událostí): předpoklady se nekontrolují, úroveň výzbroje se zvedne, slot se uvolní. */
export function grantTech(state, o, id) {
  if (!validOwner(state, o) || !TECHS[id]) return state;
  const cur = state.tech.own[o];
  if (cur.done[id]) return state;
  const done = { ...cur.done, [id]: 1 };
  const prog = { ...cur.prog };
  delete prog[id];
  const slots = cur.slots.map((x) => (x === id ? 0 : x));
  let mil = state.mil;
  const lvUp = TECHS[id].fx.lv || {};
  const old = mil.lv[o] || {};
  if (Object.keys(lvUp).some((e) => (old[e] || 1) < lvUp[e])) {
    const lv = mil.lv.slice();
    lv[o] = { ...old };
    for (const e in lvUp) lv[o][e] = Math.max(lv[o][e] || 1, lvUp[e]);
    mil = { ...mil, lv, ver: mil.ver + 1 };
  }
  return { ...patch(state, o, { done, slots, prog }), mil };
}
