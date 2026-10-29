// Společné pomůcky politiky (M21): bonusy zákonů a poradců, dopady stability a podpory války, kontrola zákonů.
import { LAWS, ADVISORS, ADV_SLOT_IDS } from '../../data/politics/index.js';
import { I } from '../industry/constants.js';
import { POL } from './constants.js';
import { aiMult } from '../ai/core.js';
import { focusMods, NO_FOCUS_MODS } from '../nat/core.js';

export const NO_POL = Object.freeze({ stab: 0, ws: 0, cons: 0, build: 0, prod: 0, extract: 0, imp: 0, man: 0, research: 0 });
const cache = new WeakMap();   // laws → (adv → bonusy)

/** Součet bonusů zákonů a poradců země (mezipaměť podle objektů `laws` a `adv`). */
export function polMods(own) {
  if (!own) return NO_POL;
  let byAdv = cache.get(own.laws);
  if (!byAdv) { byAdv = new WeakMap(); cache.set(own.laws, byAdv); }
  let m = byAdv.get(own.adv);
  if (m) return m;
  m = { ...NO_POL };
  const add = (mod) => { if (mod) for (const k in mod) m[k] += mod[k]; };
  for (const cat in own.laws) add(LAWS[cat]?.[own.laws[cat]]?.mod);
  for (const slot of ADV_SLOT_IDS) add(ADVISORS[own.adv[slot]]?.mod);
  byAdv.set(own.adv, m);
  return m;
}

export const polOf = (state, o) => state.pol.own[o] || null;
const withFocus = new WeakMap();   // základní bonusy → (done cílů → součet)
/** Bonusy zákonů, poradců a hotových národních cílů země. */
export function polModsOf(state, o) {
  const base = polMods(state.pol.own[o]);
  const fm = focusMods(state.nat?.own[o]?.done);
  if (fm === NO_FOCUS_MODS) return base;
  let byDone = withFocus.get(base);
  if (!byDone) { byDone = new WeakMap(); withFocus.set(base, byDone); }
  const done = state.nat.own[o].done;
  let m = byDone.get(done);
  if (!m) { m = { ...base }; for (const k in fm) m[k] = (m[k] || 0) + fm[k]; byDone.set(done, m); }
  return m;
}

/** Násobek výstupu továren a staveb ze stability. */
export const stabMult = (stab) => 1 + (stab - 0.5) * POL.STAB_OUT;
/** Celkový násobek výroby a staveb země: bonus výroby × stabilita. */
export const outMult = (state, o) => { const own = state.pol.own[o]; return own ? (1 + polModsOf(state, o).prod) * stabMult(own.stab) * aiMult(state, o) : 1; };
/** Násobek měsíčního přírůstku lidské síly: odvod a poradci × podpora války. */
export const manMult = (state, o) => { const own = state.pol.own[o]; return own ? Math.max(0, 1 + polModsOf(state, o).man) * (POL.WS_MAN_BASE + POL.WS_MAN_SLOPE * own.ws) : 1; };
/** Podíl spotřebního zboží: základ země (`ind.cons`) + zákony a poradci. */
export const consOf = (state, o) => Math.min(I.CONS_MAX, Math.max(0, state.ind.cons[o] + polModsOf(state, o).cons));

/** Proč zákon nejde změnit (český text), nebo null. */
export function lawBlock(own, cat, id) {
  const law = LAWS[cat]?.[id];
  if (!law) return 'Neznámý zákon.';
  if (own.laws[cat] === id) return 'Už platí.';
  if (own.pp < law.pp) return `Chybí politická moc (${Math.ceil(law.pp - own.pp)}).`;
  if (law.req.ws && own.ws < law.req.ws) return `Vyžaduje podporu války ${Math.round(law.req.ws * 100)} %.`;
  if (law.req.stab && own.stab < law.req.stab) return `Vyžaduje stabilitu ${Math.round(law.req.stab * 100)} %.`;
  return null;
}
