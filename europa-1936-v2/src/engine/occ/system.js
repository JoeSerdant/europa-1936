// Systém okupace jedné herní hodiny: denní krok o půlnoci (po armádě).
import { occDay } from './day.js';

export function occHour(state) {
  return state.tick % 24 === 0 ? occDay(state) : state;
}
