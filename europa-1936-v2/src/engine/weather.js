// Počasí a roční období (M43): čistá funkce z hodiny hry a podnebí provincie, bez uloženého stavu.
// Teplota podle měsíce (roční průměr a rozkmit podle podnebí) dává mráz (`cold`), bláto (`mud`) a vedro (`heat`) a z nich účinky na boj, pohyb a obnovu organizace.
import { getWorld } from './world.js';
import { dateOfHour } from './time.js';

// [průměrná roční teplota °C, rozkmit]
const CLIMATE_T = {
  oceanic: [10, 6], temperate: [9, 10], continental: [6, 15], subarctic: [0, 15], arctic: [-8, 14],
  mediterranean: [17, 8], steppe: [8, 16], semiarid: [18, 10], desert: [22, 10], alpine: [2, 10],
};
const MUDDY = new Set(['oceanic', 'temperate', 'continental', 'steppe']);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export const WEATHER = { ATK: 0.12, SPD: 0.35, ORG: 0.4, ATTR: 1 };   // největší účinky mrazu (násobí se silou 0–1)

const cache = new Map();   // `${měsíc}:${podnebí}` → počasí

/** Počasí podnebí `climate` v měsíci `month` (1–12): { t, cold, mud, heat, atk (postih útoku), spd (postih rychlosti), org (postih obnovy organizace), label }. */
export function weatherIn(month, climate) {
  const key = `${month}:${climate}`;
  let r = cache.get(key);
  if (r) return r;
  const [mean, amp] = CLIMATE_T[climate] || CLIMATE_T.temperate;
  const t = mean - amp * Math.cos((2 * Math.PI * (month - 1)) / 12);
  const cold = clamp01(-t / 12);
  const mud = MUDDY.has(climate) && t > 0 && t < 12 && [3, 4, 10, 11].includes(month) ? 0.6 : 0;
  const heat = clamp01((t - 28) / 8);
  r = {
    t: Math.round(t * 10) / 10, cold, mud, heat,
    atk: WEATHER.ATK * cold + 0.05 * mud + 0.04 * heat,
    spd: WEATHER.SPD * cold + 0.25 * mud + 0.1 * heat,
    org: WEATHER.ORG * cold + 0.15 * mud + 0.1 * heat,
    label: cold > 0.5 ? 'mráz' : cold > 0.1 ? 'chladno' : mud ? 'bláto' : heat > 0.2 ? 'vedro' : 'mírné',
  };
  cache.set(key, r);
  return r;
}

let climOf = null;
/** Podnebí provincie `p` (z regionu světa). */
export function climateOfProv(p) {
  const w = getWorld();
  if (!climOf || climOf.w !== w) climOf = { w, arr: new Array(w.L + 1) };
  let c = climOf.arr[p];
  if (!c) { c = w.regions[w.region[p] - 1][1]; climOf.arr[p] = c; }
  return c;
}

/** Počasí v provincii `p` v hodině `tick`. */
export const weatherAt = (tick, p) => weatherIn(dateOfHour(tick).month, climateOfProv(p));
