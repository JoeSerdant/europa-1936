// Postup herního času. Každá hodina projde systémy v pevném pořadí: čas → armáda (M18, army/system.js) → průmysl (M19, industry/system.js) → výzkum (M20, research/system.js) → politika (M21, politics/system.js) → národní cíle a události (M22, nat/system.js) → diplomacie (M23, dip/system.js) → AI zemí (M24, ai/system.js); námořnictvo (M27, nav/system.js) jede hned za armádou; další milníky přidávají průmysl, výzkum, politiku ...
import { SPEEDS } from './game.js';
import { armyHourSteps } from './army/system.js';
import { industryHour } from './industry/system.js';
import { researchHour } from './research/system.js';
import { politicsHour } from './politics/system.js';
import { natHour } from './nat/system.js';
import { dipHour } from './dip/system.js';
import { aiHourSteps } from './ai/system.js';
import { navHour } from './nav/system.js';
import { airHour } from './air/system.js';
import { docHour } from './doc/system.js';
import { endHour } from './end.js';
import { occHour } from './occ/system.js';
import { spyHour } from './spy/system.js';
import { raidDay } from './raid/raids.js';
const raidHour = (s) => (s.tick % 24 === 0 ? raidDay(s) : s);
import { cmdHour } from './cmd/index.js';
import { statHour } from './stat/index.js';

/**
 * Jedna herní hodina jako generátor (F2): systémy v pevném pořadí (armáda → okupace → námořnictvo → letectvo → průmysl → doktríny → zpravodajství →
 * výzkum → politika → národní cíle → diplomacie → AI → konec hry → velitelská moc → statistiky). O půlnoci dává přestávky (`yield`) v denním kroku
 * armády (po armádách) a AI (po zemích), aby ji rozhraní mohlo rozložit do více snímků. Vrací nový stav; výsledek nezávisí na tom, kdy se pokračuje.
 */
export function* hourSteps(state) {
  let s = yield* armyHourSteps({ ...state, tick: state.tick + 1 });
  const midnight = s.tick % 24 === 0;
  if (midnight) yield;   // o půlnoci mají denní kroky i ostatní systémy – přestávky mezi skupinami
  s = industryHour(raidHour(airHour(navHour(occHour(s)))));   // S5c: nájezdy (o půlnoci)
  if (midnight) yield;
  s = dipHour(natHour(politicsHour(researchHour(spyHour(docHour(s))))));
  if (midnight) yield;
  s = yield* aiHourSteps(s);
  return statHour(cmdHour(endHour(s)));
}

/** Jedna herní hodina najednou. Čistá funkce. */
export function advanceHour(state) {
  const g = hourSteps(state);
  let r = g.next();
  while (!r.done) r = g.next();
  return r.value;
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
