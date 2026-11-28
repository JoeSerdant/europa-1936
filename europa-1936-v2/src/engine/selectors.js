// Dotazy na stav: čisté funkce (state, ...) → hodnota. Drahé souhrny se cachují podle `ownerVer` (stav je neměnný, takže stačí WeakMap).
import { FORMABLES as FORMABLES_ } from '../data/nat/formables.js';
import { getWorld } from './world.js';
import { dateOfHour, formatDate, formatClock, formatWeekday } from './time.js';

export const provinceOwner = (state, p) => state.stateOwner[getWorld().provState[p]];
export const provinceController = (state, p) => state.ctrl[p];
export const ownerTagOf = (idx) => getWorld().owners[idx].tag;
export const countryName = (tag) => getWorld().owners[getWorld().ownerIdx[tag]].name;
export const countryColor = (tag) => getWorld().owners[getWorld().ownerIdx[tag]].color;
export const playerIdx = (state) => (state.player ? getWorld().ownerIdx[state.player] : 0);

export { dateOfHour, formatDate, formatClock, formatWeekday };
export const dateText = (state) => formatDate(state.tick);
export const clockText = (state) => formatClock(state.tick);

// Mezipaměť je vázaná na pole vlastníků: při běžném plynutí času (nový objekt stavu každou hodinu, ale stejné pole) se nic nepřepočítává,
// po změně vlastnictví vznikne nové pole a souhrny se spočítají znovu.
const cache = new WeakMap();
function memo(state, key, make) {
  const anchor = state.stateOwner;
  let m = cache.get(anchor);
  if (!m) { m = {}; cache.set(anchor, m); }
  return key in m ? m[key] : (m[key] = make());
}

/** Provincie podle vlastníka: pole polí (index = idx země). Při změně vlastnictví se přepočítá. */
export function provincesByOwner(state) {
  return memo(state, 'byOwner', () => {
    const w = getWorld();
    const out = Array.from({ length: w.owners.length }, () => []);
    for (let p = 1; p <= w.L; p++) out[provinceOwner(state, p)].push(p);
    return out;
  });
}

/** Souhrn země: provincie, státy, obyvatelé (tis.), plocha (km²), vítězné body, hlavní město. */
export function countryStats(state, tag) {
  const w = getWorld();
  const idx = w.ownerIdx[tag];
  if (!idx) return null;
  return memo(state, `stats:${tag}`, () => {
    const list = provincesByOwner(state)[idx];
    let pop = 0, area = 0, vp = 0, manPop = 0;
    const states = new Set();
    for (const p of list) { pop += w.pop[p]; manPop += w.manPop ? w.manPop[p] : w.pop[p]; area += w.area[p]; vp += w.vp[p]; states.add(w.provState[p]); }
    const o = w.owners[idx];
    return { tag, provinces: list.length, states: states.size, pop, manPop, area, vp, capital: o.cap };   // W1: manPop = obyvatelé pro lidskou sílu (kolonie zlomkem)
  });
}

/** Seznam všech zemí (statický, bez rezervních zemí, které vznikají za hry): { tag, idx, name, color, capital }. */
export function allCountries() {
  const w = getWorld();
  return w.owners.map((o, i) => (o && !o.dyn ? { tag: o.tag, idx: i, name: o.name, color: o.color, capital: o.cap } : null)).filter(Boolean);
}

/** P3: jméno země ve hře – po vyhlášení formovatelného národa jeho jméno. */
export function countryTitle(state, o) {
  const w = getWorld(), f = state && state.nat && state.nat.own[o] && state.nat.own[o].form;
  return f && FORMABLES_[f] ? FORMABLES_[f].n : w.owners[o].name;
}
/** P3: id formovatelného národa země (nebo ''). */
export const formOf = (state, o) => (state && state.nat && state.nat.own[o] && state.nat.own[o].form) || '';
