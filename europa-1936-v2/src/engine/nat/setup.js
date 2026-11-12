// Počáteční stav národních cílů a událostí: nic hotového, žádný cíl, žádné události; počáteční národní duchové (M74).
import { startSpirits } from './spirits.js';
export function createNat(w) {
  const own = [null];
  for (let o = 1; o < w.owners.length; o++) own.push({ done: {}, cur: null, flags: {}, seen: {}, sched: [], dec: {}, sp: startSpirits(w.owners[o].tag), cont: '' });
  return { ver: 0, own, pend: [] };
}
