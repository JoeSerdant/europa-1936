// Výzkumný systém jedné herní hodiny: denní krok o půlnoci (po průmyslu).
import { researchDay } from './day.js';

export function researchHour(state) {
  return state.tick % 24 === 0 ? researchDay(state) : state;
}
