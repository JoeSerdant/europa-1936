// Politický systém jedné herní hodiny: denní krok o půlnoci (po výzkumu).
import { politicsDay } from './day.js';

export function politicsHour(state) {
  return state.tick % 24 === 0 ? politicsDay(state) : state;
}
