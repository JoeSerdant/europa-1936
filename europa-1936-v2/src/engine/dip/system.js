// Diplomatický systém jedné herní hodiny: denní krok o půlnoci (po národních cílech).
import { dipDay } from './day.js';

export function dipHour(state) {
  return state.tick % 24 === 0 ? dipDay(state) : state;
}
