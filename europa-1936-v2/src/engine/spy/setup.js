// Počáteční zpravodajství: každá země má jednoho agenta (velmoci dva), nikdo nic neprovádí.
import { COUNTRIES } from '../../data/countries.js';

export function createSpy(w) {
  const own = [null];
  for (let o = 1; o < w.owners.length; o++) {
    const tier = COUNTRIES[w.owners[o].tag]?.tier ?? 3;
    own.push({ ag: tier === 1 ? 2 : 1, ops: [], intel: {}, n: 0 });
  }
  return { ver: 0, own };
}
