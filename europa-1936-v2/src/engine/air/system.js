// Letecký systém jedné herní hodiny: denní krok o půlnoci (po armádě a námořnictvu).
import { airDay } from './day.js';

export function airHour(state) {
  return state.tick % 24 === 0 ? airDay(state) : state;
}
