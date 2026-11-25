// S7: okupační zákony, posádky a kolaborantské vlády. Čisté funkce a příkazy (neplatný vstup = tentýž stav).
//  occ.law['okupant-vlastník'] = id zákona z `OCC_LAWS` (chybí = `OCC_LAW_DEFAULT`),  occ.col[vlastník] = okupant s kolaborantskou vládou.
import { getWorld } from '../world.js';
import { OCC } from './constants.js';
import { OCC_LAWS, OCC_LAW_DEFAULT } from '../../data/occ/laws.js';
import { logAdd } from '../log.js';

const key = (c, o) => `${c}-${o}`;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Zákon, kterým okupant `c` spravuje okupovaná území země `o` (objekt z `OCC_LAWS` s `id`). */
export function occLawOf(state, c, o) {
  const id = (state.occ && state.occ.law && state.occ.law[key(c, o)]) || OCC_LAW_DEFAULT;
  return { id, ...(OCC_LAWS[id] || OCC_LAWS[OCC_LAW_DEFAULT]) };
}

/** Má okupant `c` kolaborantskou vládu na území země `o`? */
export const hasCollab = (state, c, o) => !!(state.occ && state.occ.col && state.occ.col[o] === c);

/** Podíl těžby okupovaného státu pro okupanta `c` (vlastník `o`, poddajnost `comp`): podle poddajnosti, zákona a kolaborace. */
export function occResShare(state, c, o, comp) {
  return clamp01(OCC.RES_BASE + (1 - OCC.RES_BASE) * comp + occLawOf(state, c, o).res + (hasCollab(state, c, o) ? OCC.COL_RES : 0));
}

/** Okupovaná území po zemích pro okupanta `c`: [{ o, states: [s], r, comp }] (průměrný odboj a poddajnost), seřazeno podle počtu států. */
export function occupiedBy(state, c) {
  const w = getWorld(), by = new Map();
  for (const k in (state.occ && state.occ.st) || {}) {
    const s = +k, o = state.stateOwner[s];
    if (!o || state.ctrl[w.states[s].cap] !== c) continue;
    if (!by.has(o)) by.set(o, []);
    by.get(o).push(s);
  }
  return [...by].map(([o, states]) => {
    const e = states.map((s) => state.occ.st[s]);
    return { o, states, r: e.reduce((a, x) => a + x.r, 0) / e.length, comp: e.reduce((a, x) => a + x.c, 0) / e.length };
  }).sort((a, b) => b.states.length - a.states.length || a.o - b.o);
}

/** Změní okupační zákon okupanta `c` pro zemi `o` (jen když `c` drží aspoň jeden stát země `o`). */
export function setOccLaw(state, c, o, id) {
  if (!OCC_LAWS[id] || !occupiedBy(state, c).some((x) => x.o === o)) return state;
  if (occLawOf(state, c, o).id === id) return state;
  const law = { ...state.occ.law };
  if (id === OCC_LAW_DEFAULT) delete law[key(c, o)]; else law[key(c, o)] = id;
  return { ...state, occ: { ...state.occ, law, ver: state.occ.ver + 1 } };
}

/** Proč nejde zřídit kolaborantskou vládu okupanta `c` na území země `o` (český text), nebo null. */
export function collabBlock(state, c, o) {
  const x = occupiedBy(state, c).find((y) => y.o === o);
  if (!x) return 'Neokupujete žádné území této země.';
  if (hasCollab(state, c, o)) return 'Kolaborantská vláda už vládne.';
  if (x.states.length < OCC.COL_MIN) return `Potřebujete aspoň ${OCC.COL_MIN} okupované státy této země.`;
  if (x.comp < OCC.COL_C) return `Poddajnost je jen ${Math.round(x.comp * 100)} % (potřeba ${Math.round(OCC.COL_C * 100)} %).`;
  if (state.pol.own[c].pp < OCC.COL_PP) return `Chybí politická moc (${Math.ceil(OCC.COL_PP - state.pol.own[c].pp)}).`;
  return null;
}

/** Zřídí kolaborantskou vládu: zaplatí politickou moc; ve státech země `o`, které `c` okupuje, je nižší odboj, rychlejší poddajnost a víc těžby. */
export function setCollab(state, c, o) {
  if (collabBlock(state, c, o)) return state;
  const own = state.pol.own.slice();
  own[c] = { ...own[c], pp: own[c].pp - OCC.COL_PP };
  const next = { ...state, pol: { ...state.pol, own }, occ: { ...state.occ, col: { ...state.occ.col, [o]: c }, ver: state.occ.ver + 1 } };
  return logAdd(next, { k: 'collab', a: c, b: o });
}
