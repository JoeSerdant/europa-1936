// AI: návrhář výzbroje (M97). Stejný příkaz jako hráč (`setDesign`): jednou za `DESIGN.AI_DAYS` dní projde typy, které vyrábí, a pro jeden z nich zavede
// nejlepší dostupný návrh (v každém slotu modul s nejvyšším přínosem po odečtení ceny), když jí po zaplacení zbyde rezerva zkušeností pro doktríny.
import { DESIGN_TYPES, DESIGN_CATS, MODULES, MODULE_IDS } from '../../data/design/modules.js';
import { fits, designOf } from '../design/core.js';
import { setDesign, designBlock, designCost } from '../design/commands.js';
import { DESIGN } from '../design/constants.js';
import { isUnlocked } from '../research/core.js';

const W = { atk: 1, def: 0.8, armor: 0.8, speed: 0.5, hp: 1, cas: 1, bomb: 1 };

/** Přínos modulu pro AI (součet vážených účinků minus vážená cena). */
const score = (id) => { let v = 0; const fx = MODULES[id].fx; for (const k in fx) v += k === 'cost' ? -DESIGN.AI_COST_W * fx[k] : (W[k] || 0) * fx[k]; return v; };

/** Nejlepší návrh typu `type` z odemčených modulů: { slot: modul } (prázdný slot, když nic nepřinese víc než nula). */
export function bestDesign(state, o, type) {
  const out = {};
  for (const slot of DESIGN_TYPES[type].slots) {
    let best = null, bv = 0;
    for (const id of MODULE_IDS) {
      if (!fits(type, slot, id) || (MODULES[id].unlock && !isUnlocked(state, o, MODULES[id].unlock))) continue;
      const v = score(id);
      if (v > bv + 1e-9 || (Math.abs(v - bv) < 1e-9 && best && id < best)) { bv = v; best = id; }
    }
    if (best) out[slot] = best;
  }
  return out;
}

export function aiDesign(state, o) {
  if ((Math.floor(state.tick / 24) + o * 7) % DESIGN.AI_DAYS !== 0 || !state.doc) return state;
  const types = [...new Set(state.ind.lines.filter((l) => l.o === o && DESIGN_TYPES[l.eq]).map((l) => l.eq))].sort();
  for (const type of types) {
    const mods = bestDesign(state, o, type);
    if (designBlock(state, o, type, mods)) continue;
    const cur = designOf(state.mil.lv[o], type);
    if (cur && Object.keys(mods).every((k) => cur.mods[k] === mods[k]) && Object.keys(cur.mods).length === Object.keys(mods).length) continue;
    const xp = state.doc.own[o].xp[DESIGN_CATS[DESIGN_TYPES[type].cat].xp];
    if (xp - designCost(state, o, type, mods) < DESIGN.AI_RESERVE) continue;
    return setDesign(state, o, type, mods);
  }
  return state;
}
