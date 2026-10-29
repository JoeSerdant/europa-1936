// Postup herního času. Každá hodina projde systémy v pevném pořadí: čas → armáda (M18, army/system.js) → průmysl (M19, industry/system.js) → výzkum (M20, research/system.js) → politika (M21, politics/system.js) → národní cíle a události (M22, nat/system.js); další milníky přidávají průmysl, výzkum, politiku ...
import { SPEEDS } from './game.js';
import { armyHour } from './army/system.js';
import { industryHour } from './industry/system.js';
import { researchHour } from './research/system.js';
import { politicsHour } from './politics/system.js';
import { natHour } from './nat/system.js';

/** Jedna herní hodina. Čistá funkce – systémy se přidávají sem v pevném pořadí (armáda → průmysl → výzkum → politika …). */
export function advanceHour(state) {
  return natHour(politicsHour(researchHour(industryHour(armyHour({ ...state, tick: state.tick + 1 })))));
}

/** n herních hodin najednou (n ≥ 0 celé číslo). Neplatný vstup nebo n = 0 vrací tentýž stav. */
export function advance(state, hours) {
  if (!Number.isInteger(hours) || hours <= 0) return state;
  let s = state;
  for (let i = 0; i < hours; i++) s = advanceHour(s);
  return s;
}

/**
 * Kolik herních hodin odpovídá uplynulému reálnému času při dané rychlosti. Zlomky se přenáší přes `carry`,
 * aby rychlost nezávisela na tom, jak často smyčka běží.
 * @returns {{hours: number, carry: number}}
 */
export function hoursForElapsed(state, elapsedMs, carry = 0) {
  if (state.paused) return { hours: 0, carry: 0 };
  const per = SPEEDS[state.speed] || 0;
  const raw = (elapsedMs / 1000) * per + carry;
  const hours = Math.floor(raw);
  return { hours, carry: raw - hours };
}
