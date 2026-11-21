// Společné pomůcky doktrín (M34): součty bonusů a stav volby doktrín.
import { DOCTRINES, TRACKS, BRANCH_IDS } from '../../data/doc/doctrines.js';
import { ADVISORS } from '../../data/politics/advisors.js';
import { DOC } from './constants.js';

const NONE = Object.freeze({ land: 0, atk: 0, def: 0, atkArm: 0, atkInf: 0, defInf: 0, hillAtk: 0, hillDef: 0, cas: 0, patrol: 0, bomb: 0, fire: 0, raid: 0, escort: 0 });
const cache = new WeakMap();

const HC = ['army', 'navy', 'air'];   // F4: sloty vrchního velení (náčelníci štábů, bonusy v poli `doc`)
const LAND = ['atk', 'def', 'atkArm', 'atkInf', 'defInf', 'hillAtk', 'hillDef', 'planGain', 'planCap', 'supUse', 'speed', 'orgRegen'];

/** Součet bonusů hotových doktrín země a jejích náčelníků štábů (F4; mezipaměť podle objektu `own` a obsazení vrchního velení). */
export function docMods(state, o) {
  const own = state.doc && state.doc.own[o];
  if (!own) return NONE;
  const adv = state.pol && state.pol.own[o] && state.pol.own[o].adv;
  const key = adv ? `${adv.army || 0}|${adv.navy || 0}|${adv.air || 0}` : '';
  let byAdv = cache.get(own.done);
  if (!byAdv) { byAdv = new Map(); cache.set(own.done, byAdv); }
  let m = byAdv.get(key);
  if (m) return m;
  m = { ...NONE };
  for (const id in own.done) for (const k in DOCTRINES[id].mod) m[k] += DOCTRINES[id].mod[k];
  if (adv) for (const slot of HC) { const fx = adv[slot] && ADVISORS[adv[slot]] && ADVISORS[adv[slot]].doc; if (fx) for (const k in fx) m[k] = (m[k] || 0) + fx[k]; }
  m.land = LAND.some((k) => m[k]) ? 1 : 0;
  byAdv.set(key, m);
  return m;
}

/** Proč nejde přijmout doktrínu `id` (český text), nebo null. */
export function docBlock(state, o, id) {
  const d = DOCTRINES[id], own = state.doc.own[o];
  if (!d || !own) return 'Neznámá doktrína.';
  if (own.done[id]) return 'Už je přijatá.';
  const chosen = own.track[d.branch];
  if (chosen && chosen !== d.track) return `Ve větvi už je zvolen směr ${TRACKS[chosen].n}.`;
  if (d.level > 1 && !own.done[TRACKS[d.track].levels[d.level - 2].id]) return 'Nejdřív předchozí stupeň.';
  const cost = DOC.COST[d.level - 1];
  if (own.xp[d.branch] < cost) return `Chybí zkušenosti (${Math.ceil(cost - own.xp[d.branch])}).`;
  return null;
}
export { BRANCH_IDS };
