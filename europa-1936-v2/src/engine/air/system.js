// Letecký systém jedné herní hodiny: denní krok o půlnoci (po armádě a námořnictvu).
import { airDay } from './day.js';
import { dropArrivals } from './para.js';

export function airHour(state) {
  const s = state.air && state.air.drops && state.air.drops.some((d) => d.arrive <= state.tick) ? dropArrivals(state) : state;   // M80: výsadky
  return s.tick % 24 === 0 ? airDay(s) : s;
}
