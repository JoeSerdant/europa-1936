// Příkazy výzkumu (M20): čisté funkce `(state, …) → state`; neplatný vstup vrací tentýž objekt. Země je index `o`.
// Příkazy nehlídají, komu věc patří vůči hráči – to dělá `ui/actions.js`.
import { getWorld } from '../world.js';
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
