// Počáteční politika: stabilita a podpora války podle ideologie a národních hodnot, výchozí zákony, žádní poradci.
import { COUNTRIES } from '../../data/countries.js';
import { POL_IDEO, POL_NATIONAL, POL_DEFAULT_LAWS, PARTY_START } from '../../data/politics/index.js';
import { IDEO_ORDER, ideologySupport } from '../../data/politics/ideology.js';

/** Základní (cílová) stabilita a podpora války země. */
export function polBase(tag) {
  const ideo = POL_IDEO[COUNTRIES[tag]?.ideology] || POL_IDEO.neutrality;
  const nat = POL_NATIONAL[tag] || {};
  return { stab: nat.stab ?? ideo.stab, ws: nat.ws ?? ideo.ws };
}

const r1 = (v) => Math.round(v * 10) / 10;

/** Počáteční podpora stran země (body, součet 100): z dat, jinak z ideologie vlády a stability. */
export function startParties(tag) {
  if (PARTY_START[tag]) return { ...PARTY_START[tag] };
  const main = COUNTRIES[tag]?.ideology || 'neutrality';
  const sup = ideologySupport(main, polBase(tag).stab);
  const out = {};
  let sum = 0;
  for (const k of IDEO_ORDER) { out[k] = r1(sup[k] * 100); sum += out[k]; }
  out[main] = r1(out[main] + 100 - sum);
  return out;
}

/** Počáteční stav stran země: { par, gov, gt, pt } (vládnoucí ideologie, čas poslední změny vlády a poslední podpory; −1 = nikdy). */
export function startGov(tag) {
  return { par: startParties(tag), gov: COUNTRIES[tag]?.ideology || 'neutrality', gt: -1, pt: -1 };
}

export function createPol(w) {
  const own = [null];
  for (let o = 1; o < w.owners.length; o++) {
    const tag = w.owners[o].tag;
    const b = polBase(tag);
    own.push({ stab: b.stab, ws: b.ws, pp: 0, laws: { ...POL_DEFAULT_LAWS, ...(POL_NATIONAL[tag]?.laws || {}) }, adv: { pol: 0, arm: 0, ind: 0, sci: 0 }, ...startGov(tag) });
  }
  return { ver: 0, own };
}
