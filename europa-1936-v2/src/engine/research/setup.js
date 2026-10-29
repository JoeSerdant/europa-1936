// Počáteční stav výzkumu: každá země začíná bez hotových technologií (úroveň výzbroje 1) a s prázdnými sloty.
import { COUNTRIES } from '../../data/countries.js';
import { RES } from './constants.js';

export function createTech(w) {
  const own = [null];
  for (let o = 1; o < w.owners.length; o++) {
    const tier = COUNTRIES[w.owners[o].tag]?.tier ?? 3;
    own.push({ done: {}, slots: new Array(RES.SLOTS_TIER[tier] ?? 2).fill(0), prog: {} });
  }
  return { ver: 0, own };
}
