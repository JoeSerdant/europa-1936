// Návrhář výzbroje (M97): násobky statistik a ceny z návrhů variant. Návrhy žijí v úrovních výzbroje země `mil.lv[o].des = { typ: { nm, mods: { slot: modul } } }`,
// takže mezipaměti statistik divizí (podle objektu úrovní) se po změně návrhu obnoví samy. Čisté funkce.
import { DESIGN_TYPES, MODULES } from '../../data/design/modules.js';

export const ONE = Object.freeze({ atk: 1, def: 1, armor: 1, speed: 1, hp: 1, cas: 1, bomb: 1, cost: 1 });
const cache = new WeakMap();   // návrh → násobky

/** Násobky z návrhu (1 + součet účinků modulů; nejméně 0,5). Bez návrhu `ONE`. */
export function designMult(des) {
  if (!des || !des.mods) return ONE;
  let r = cache.get(des);
  if (r) return r;
  const sum = {};
  for (const slot in des.mods) { const mod = MODULES[des.mods[slot]]; if (mod) for (const k in mod.fx) sum[k] = (sum[k] || 0) + mod.fx[k]; }
  r = {};
  for (const k in ONE) r[k] = Math.max(0.5, 1 + (sum[k] || 0));
  r = Object.freeze(r);
  cache.set(des, r);
  return r;
}

/** Návrh typu `type` z úrovní výzbroje `lv` (= mil.lv[o]), nebo null. */
export const designOf = (lv, type) => (lv && lv.des && lv.des[type]) || null;
/** Násobky typu `type` pro úrovně `lv`. */
export const multOf = (lv, type) => designMult(designOf(lv, type));
/** Násobky typu `type` země `o`. */
export const designMultOf = (state, o, type) => multOf(state.mil.lv && state.mil.lv[o], type);

/** Je modul `id` použitelný ve slotu `slot` typu `type`? (kategorie, slot a omezení `only`; bez kontroly odemčení) */
export function fits(type, slot, id) {
  const t = DESIGN_TYPES[type], mod = MODULES[id];
  return !!(t && mod && mod.cat === t.cat && mod.slot === slot && t.slots.includes(slot) && (!mod.only || mod.only.includes(type)));
}
