// Počáteční stav národních cílů a událostí: nic hotového, žádný cíl, žádné události.
export function createNat(w) {
  const own = [null];
  for (let o = 1; o < w.owners.length; o++) own.push({ done: {}, cur: null, flags: {}, seen: {}, sched: [], dec: {} });
  return { ver: 0, own, pend: [] };
}
