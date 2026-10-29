// Systém doktrín jedné herní hodiny: denní krok o půlnoci.
import { docDay } from './day.js';

export function docHour(state) {
  return state.tick % 24 === 0 ? docDay(state) : state;
}
