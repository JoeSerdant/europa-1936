// S5d: vyznamenání divizí. Pole divize `d.md` = id z `MEDALS` (nejvýš jedno); příkaz `awardMedal` stojí velitelskou moc (`cmd.cp`).
import { MEDAL, MEDALS } from '../../data/army/medals.js';
import { xpLevel } from './constants.js';

/** Strop vyznamenaných divizí země `o`. */
export function medalCap(mil, o) {
  let n = 0;
  for (const d of mil.divs) if (d && d.o === o) n++;
  return MEDAL.BASE + Math.floor(n * MEDAL.PER_DIV);
}
/** Vyznamenané divize země `o`. */
export const medalsUsed = (mil, o) => mil.divs.reduce((a, d) => a + (d && d.o === o && d.md ? 1 : 0), 0);

/** Proč země `o` nemůže vyznamenat divizi `id` řádem `m` (český text), nebo null. */
export function medalBlock(state, o, id, m) {
  const d = state.mil.divs[id];
  if (!MEDALS[m]) return 'Neznámé vyznamenání.';
  if (!d || d.o !== o) return 'Divize neexistuje.';
  if (d.md) return 'Divize už vyznamenání má.';
  if (xpLevel(d.xp || 0) < MEDAL.XP) return 'Vyznamenat lze jen divizi se zkušenostmi aspoň „Zkušení“.';
  if (medalsUsed(state.mil, o) >= medalCap(state.mil, o)) return `Vyznamenaných divizí smíte mít nejvýš ${medalCap(state.mil, o)}.`;
  if (!state.cmd || state.cmd.cp[o] < MEDAL.CP) return `Chybí velitelská moc (${Math.ceil(MEDAL.CP - ((state.cmd && state.cmd.cp[o]) || 0))}).`;
  return null;
}

/** Udělí divizi vyznamenání. */
export function awardMedal(state, o, id, m) {
  if (medalBlock(state, o, id, m)) return state;
  const divs = state.mil.divs.slice(); divs[id] = { ...divs[id], md: m };
  const cp = state.cmd.cp.slice(); cp[o] -= MEDAL.CP;
  return { ...state, mil: { ...state.mil, divs, ver: state.mil.ver + 1 }, cmd: { ...state.cmd, cp } };
}

/** Bonus vyznamenání divize v boji: { atk, def }. */
export const medalBonus = (d) => (d && d.md && MEDALS[d.md] ? { atk: MEDALS[d.md].atk || 0, def: MEDALS[d.md].def || 0 } : null);
