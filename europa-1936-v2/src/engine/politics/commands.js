// Příkazy politiky (M21): čisté funkce `(state, …) → state`; neplatný vstup vrací tentýž objekt. Země je index `o`.
// Příkazy nehlídají, komu věc patří vůči hráči – to dělá `ui/actions.js`.
import { getWorld } from '../world.js';
import { LAWS, ADVISORS, ADV_SLOT_IDS } from '../../data/politics/index.js';
import { lawBlock } from './core.js';

const patch = (state, o, own) => {
  const arr = state.pol.own.slice();
  arr[o] = own;
  return { ...state, pol: { ver: state.pol.ver + 1, own: arr } };
};
const valid = (state, o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length && !!state.pol.own[o];

/** Změní zákon `id` v oboru `cat` (stojí politickou moc, vyžaduje podporu války a stabilitu). */
export function setLaw(state, o, cat, id) {
  if (!valid(state, o)) return state;
  const own = state.pol.own[o];
  if (lawBlock(own, cat, id)) return state;
  return patch(state, o, { ...own, pp: own.pp - LAWS[cat][id].pp, laws: { ...own.laws, [cat]: id } });
}

/** Najme poradce `id` do slotu `slot` (obsazený slot se přepíše; stojí politickou moc). */
export function hireAdvisor(state, o, slot, id) {
  if (!valid(state, o) || !ADV_SLOT_IDS.includes(slot)) return state;
  const adv = ADVISORS[id], own = state.pol.own[o];
  if (!adv || adv.slot !== slot || own.adv[slot] === id || own.pp < adv.pp) return state;
  return patch(state, o, { ...own, pp: own.pp - adv.pp, adv: { ...own.adv, [slot]: id } });
}

/** Propustí poradce ze slotu (zdarma, cena se nevrací). */
export function fireAdvisor(state, o, slot) {
  if (!valid(state, o) || !ADV_SLOT_IDS.includes(slot)) return state;
  const own = state.pol.own[o];
  if (!own.adv[slot]) return state;
  return patch(state, o, { ...own, adv: { ...own.adv, [slot]: 0 } });
}
