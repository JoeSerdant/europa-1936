// Systém zpravodajství jedné herní hodiny: denní krok o půlnoci.
import { spyDay } from './day.js';

export function spyHour(state) {
  return state.tick % 24 === 0 ? spyDay(state) : state;
}
