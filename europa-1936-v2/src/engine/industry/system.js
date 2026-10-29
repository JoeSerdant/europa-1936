// Průmyslový systém jedné herní hodiny: všechno se děje jednou denně o půlnoci (po armádě, aby výroba doplnila sklady až pro další den).
import { industryDay } from './day.js';

export function industryHour(state) {
  return state.tick % 24 === 0 ? industryDay(state) : state;
}
