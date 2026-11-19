// Systém AI jedné herní hodiny: denní krok o půlnoci (jako poslední, po všech ostatních systémech).
import { aiDay, aiDaySteps } from './day.js';

export function aiHour(state) {
  return state.tick % 24 === 0 && state.ai && state.ai.level ? aiDay(state) : state;
}

/** Totéž jako `aiHour`, jako generátor s přestávkami po zemích (F2). */
export function* aiHourSteps(state) {
  return state.tick % 24 === 0 && state.ai && state.ai.level ? yield* aiDaySteps(state) : state;
}
