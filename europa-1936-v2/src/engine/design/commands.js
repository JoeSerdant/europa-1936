// Návrhář výzbroje (M97): zavedení návrhu varianty. Stejný příkaz pro hráče i AI; neplatný vstup vrací tentýž stav.
import { getWorld } from '../world.js';
import { DESIGN_TYPES, DESIGN_CATS, MODULES } from '../../data/design/modules.js';
import { isUnlocked } from '../research/core.js';
import { fits, designOf } from './core.js';
import { DESIGN } from './constants.js';

const ok = (o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length;

/** Kolik modulů se proti současnému návrhu mění. */
export function changedSlots(state, o, type, mods) {
  const cur = designOf(state.mil.lv[o], type), t = DESIGN_TYPES[type];
  let n = 0;
  for (const slot of t.slots) if (((cur && cur.mods[slot]) || null) !== (mods[slot] || null)) n++;
  return n;
}

/** Cena návrhu ve zkušenostech (podle počtu měněných modulů). */
export const designCost = (state, o, type, mods) => DESIGN.XP_BASE + DESIGN.XP_MOD * changedSlots(state, o, type, mods);

/** Proč země `o` nemůže zavést návrh (český text), nebo null. */
export function designBlock(state, o, type, mods) {
  const t = DESIGN_TYPES[type];
  if (!ok(o) || !t) return 'Neznámý typ výzbroje.';
  if (!mods || typeof mods !== 'object') return 'Chybí moduly.';
  for (const slot in mods) {
    const id = mods[slot];
    if (!id) continue;
    if (!t.slots.includes(slot) || !fits(type, slot, id)) return `Modul se do slotu nehodí: ${MODULES[id]?.n || id}.`;
    if (MODULES[id].unlock && !isUnlocked(state, o, MODULES[id].unlock)) return `${MODULES[id].n}: chybí technologie.`;
  }
  if (!changedSlots(state, o, type, mods)) return 'Návrh se neliší od současného.';
  const xp = state.doc ? state.doc.own[o].xp[DESIGN_CATS[t.cat].xp] : 0;
  const cost = designCost(state, o, type, mods);
  if (xp < cost) return `Chybí zkušenosti (${Math.ceil(cost - xp)}).`;
  return null;
}

/**
 * Zavede návrh varianty `mods` ({ slot: modul | null }) typu `type`: zaplatí zkušenosti, uloží návrh do `mil.lv[o].des` a linky vyrábějící ten typ
 * se přezbrojí (efektivita × `DESIGN.RETOOL`).
 */
export function setDesign(state, o, type, mods, nm = '') {
  if (designBlock(state, o, type, mods)) return state;
  const t = DESIGN_TYPES[type], branch = DESIGN_CATS[t.cat].xp;
  const cost = designCost(state, o, type, mods);
  const clean = {};
  for (const slot of t.slots) if (mods[slot]) clean[slot] = mods[slot];
  const old = state.mil.lv[o] || {};
  const lv = state.mil.lv.slice();
  const name = String(nm || '').trim().slice(0, 30) || `${t.n} vz. ${Math.floor(1936 + state.tick / 8766)}`;
  lv[o] = { ...old, des: { ...(old.des || {}), [type]: { nm: name, mods: clean } } };
  const docOwn = state.doc.own.slice();
  docOwn[o] = { ...docOwn[o], xp: { ...docOwn[o].xp, [branch]: docOwn[o].xp[branch] - cost } };
  const lines = state.ind.lines.map((l) => (l.o === o && l.eq === type ? { ...l, eff: l.eff * DESIGN.RETOOL } : l));
  return {
    ...state,
    mil: { ...state.mil, lv, ver: state.mil.ver + 1 },
    doc: { ...state.doc, own: docOwn, ver: state.doc.ver + 1 },
    ind: { ...state.ind, lines, ver: state.ind.ver + 1 },
  };
}
