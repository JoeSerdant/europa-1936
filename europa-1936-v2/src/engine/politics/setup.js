// Počáteční politika: stabilita a podpora války podle ideologie a národních hodnot, výchozí zákony, žádní poradci.
import { COUNTRIES } from '../../data/countries.js';
import { POL_IDEO, POL_NATIONAL, POL_DEFAULT_LAWS } from '../../data/politics/index.js';

/** Základní (cílová) stabilita a podpora války země. */
export function polBase(tag) {
  const ideo = POL_IDEO[COUNTRIES[tag]?.ideology] || POL_IDEO.neutrality;
  const nat = POL_NATIONAL[tag] || {};
  return { stab: nat.stab ?? ideo.stab, ws: nat.ws ?? ideo.ws };
}

export function createPol(w) {
  const own = [null];
  for (let o = 1; o < w.owners.length; o++) {
    const tag = w.owners[o].tag;
    const b = polBase(tag);
    own.push({ stab: b.stab, ws: b.ws, pp: 0, laws: { ...POL_DEFAULT_LAWS, ...(POL_NATIONAL[tag]?.laws || {}) }, adv: { pol: 0, arm: 0, ind: 0, sci: 0 } });
  }
  return { ver: 0, own };
}
