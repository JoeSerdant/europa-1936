// Volná historie (F2 A3): bez historické AI (pravidlo „Historická AI“ vypnuté) proběhnou historické události z dat (ultimáta, války, pakty,
// bloky, záruky, občanská válka) také, ale ne podle kalendáře: každá země má posun 0–`AI.FREE_SHIFT` dní podle semínka hry (stejný pro všechny
// její události, aby se nezměnilo jejich pořadí) a krok udělá jen s vládou historické ideologie (demokratické Německo Polsko nenapadne).
// Historická AI (koleje) se tím nemění: posun je 0 a podmínka vlády platí vždy.
import { getWorld } from '../world.js';
import { COUNTRIES } from '../../data/countries.js';
import { rand01 } from '../nat/core.js';
import { ideologyOf, startIdeology } from '../politics/parties.js';
import { AI } from './constants.js';

/** Běží hra ve volné historii (AI zapnutá, historická AI vypnutá)? */
export const freeMode = (state) => !!(state.ai && !state.ai.hist);
/** Číslo hry pro náhodu AI (semínko; jen volná historie, jinak 0). */
export const saltOf = (state) => (state.ai && state.ai.salt) || 0;

/** Posun historických událostí země `o` ve dnech (0 s historickou AI). */
export function shiftOf(state, o) {
  if (!freeMode(state)) return 0;
  return Math.floor(rand01(0, o, `f2shift:${saltOf(state)}`) * (AI.FREE_SHIFT + 1));
}

/** Drží se země `o` svého historického kurzu? S historickou AI vždy; ve volné historii jen s vládou výchozí ideologie. */
export const keepsCourse = (state, o) => !freeMode(state) || ideologyOf(state, o) === startIdeology(o);

/** Neválčí teď spolu žádné dvě velmoci? (záložní války z dat s `quiet`: světová válka se nekoná, protože ji hráč nevyvolal) */
export function quietWorld(state) {
  const w = getWorld(), major = (o) => (COUNTRIES[w.owners[o].tag]?.tier ?? 3) === 1;
  return !state.mil.wars.some(([a, b]) => major(a) && major(b));
}
