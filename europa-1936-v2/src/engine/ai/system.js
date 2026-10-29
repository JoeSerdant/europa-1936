// Systém AI jedné herní hodiny: denní krok o půlnoci (jako poslední, po všech ostatních systémech).
import { aiDay } from './day.js';

export function aiHour(state) {
  return state.tick % 24 === 0 && state.ai && state.ai.level ? aiDay(state) : state;
}
