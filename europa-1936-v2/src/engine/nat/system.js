// Systém národních cílů a událostí jedné herní hodiny: denní krok o půlnoci (po politice).
import { natDay } from './day.js';

export function natHour(state) {
  return state.tick % 24 === 0 ? natDay(state) : state;
}
