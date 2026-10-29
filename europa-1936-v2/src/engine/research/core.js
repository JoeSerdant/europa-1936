// Společné pomůcky výzkumu (M20): odemčení, dostupnost, bonusy ze hotových technologií, počet slotů a rychlost.
import { getWorld } from '../world.js';
import { COUNTRIES } from '../../data/countries.js';
import { TECHS, TECH_IDS, RESEARCH_NATIONAL } from '../../data/research/index.js';
import { RES } from './constants.js';
import { polModsOf } from '../politics/core.js';
import { aiMult } from '../ai/core.js';

export const NO_MODS = Object.freeze({ effCap: 0, build: 0, extract: 0, research: 0 });
const modCache = new WeakMap();   // done → bonusy

/** Součet bonusů z hotových technologií (mezipaměť podle objektu `done`). */
export function techMods(done) {
  if (!done) return NO_MODS;
  let m = modCache.get(done);
  if (m) return m;
  m = { ...NO_MODS };
  for (const id in done) { const mod = TECHS[id]?.fx.mod; if (mod) for (const k in mod) m[k] += mod[k]; }
  modCache.set(done, m);
  return m;
}

export const ownTech = (state, o) => state.tech.own[o] || null;
export const isDone = (state, o, id) => !!state.tech.own[o]?.done[id];
/** Je jednotka (prapor, rota, výzbroj) s klíčem `key` odemčená pro zemi `o`? Prázdný klíč = od začátku. */
export const isUnlocked = (state, o, key) => !key || isDone(state, o, key);
export const modsOf = (state, o) => techMods(state.tech.own[o]?.done);

/** Aktuální rok jako zlomek (1936,0 = 1. 1. 1936). */
export const yearOf = (tick) => RES.START_YEAR + tick / RES.HOURS_PER_YEAR;

export function slotCount(done, o) {
  const tier = COUNTRIES[getWorld().owners[o].tag]?.tier ?? 3;
  let n = RES.SLOTS_TIER[tier] ?? 2;
  for (const id in done) n += TECHS[id]?.fx.slot || 0;
  return Math.min(RES.SLOTS_MAX, n);
}

/** Dostupná technologie: existuje, není hotová a všechny předpoklady jsou hotové. */
export function isAvailable(own, id) {
  const t = TECHS[id];
  return !!t && !!own && !own.done[id] && t.req.every((r) => own.done[r]);
}

/** Rychlost výzkumu země podle hotových technologií `done` (dnů výzkumu za den, bez vlivu předstihu). */
export function speedOfDone(o, done) {
  const tag = getWorld().owners[o].tag;
  const tier = COUNTRIES[tag]?.tier ?? 3;
  return RES.SPEED_BASE * (RESEARCH_NATIONAL[tag] ?? (tier === 3 ? 0.95 : 1)) * (1 + techMods(done).research);
}
export const baseSpeed = (state, o) => speedOfDone(o, state.tech.own[o]?.done) * (1 + polModsOf(state, o).research) * aiMult(state, o);

/** Roky předstihu technologie vůči aktuálnímu datu (0 = už je její čas). */
export const yearsAhead = (tick, id) => Math.max(0, TECHS[id].year - yearOf(tick));
export const aheadFactor = (tick, id) => 1 / (1 + RES.AHEAD_PEN * yearsAhead(tick, id));

/** Denní postup technologie `id` (podíl 0–1) při dané rychlosti země. */
export const progressPerDay = (speed, tick, id) => (speed * aheadFactor(tick, id)) / TECHS[id].days;
export const dailyProgress = (state, o, id) => progressPerDay(baseSpeed(state, o), state.tick, id);

export { TECHS, TECH_IDS };
