// Bojové taktiky (M77): každých `C.TACTIC_HOURS` hodin bitvy si obě strany zvolí taktiku (`b.ta` útočník, `b.td` obránce). Výběr je vážený a bez `state.rng`
// (hash `rand01` z času a čísla bitvy, takže nemění průběh kostek boje): váhy z dat, pokročilé taktiky častěji se zkušeným velitelem, průlom s tanky.
// Strana s převahou v průzkumu volí jako druhá a třikrát častěji sáhne po taktice, která ruší taktiku protivníka. Čisté funkce.
import { TACTICS, ATT_TACTICS, DEP_TACTICS } from '../../data/army/tactics.js';
import { rand01 } from '../nat/core.js';
import { C } from './constants.js';
import { genLevel } from './leaders.js';

export const NO_TACTIC = Object.freeze({ atk: 0, def: 0, foe: 0 });

/** Vážený výběr z `ids` podle vah `wt` a čísla `x` z <0, 1). */
function pick(ids, wt, x) {
  const sum = wt.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < ids.length; i++) { acc += wt[i] / sum; if (x < acc) return ids[i]; }
  return ids[ids.length - 1];
}

/**
 * Zvolí taktiky stran. `side` = { lead (úroveň velitele, 0 bez něj), arm (má tanky nebo motorizaci), rec (součet průzkumu) }.
 * Vrací { ta, td }.
 */
export function chooseTactics(tick, bid, att, dep) {
  const weights = (ids, s, foe) => ids.map((id) => {
    const T = TACTICS[id];
    let v = T.w;
    if (T.w < 4) v *= 1 + C.TACTIC_LEAD * s.lead;                       // zkušený velitel volí pokročilé taktiky častěji
    if (T.need === 'arm' && s.arm) v *= 2;
    if (foe && T.beats.includes(foe)) v *= C.TACTIC_COUNTER;           // průzkum odhalil záměr protivníka
    return v;
  });
  const xa = rand01(tick, bid, 'ta'), xd = rand01(tick, bid, 'td');
  if (att.rec > dep.rec) {
    const td = pick(DEP_TACTICS, weights(DEP_TACTICS, dep, ''), xd);
    return { ta: pick(ATT_TACTICS, weights(ATT_TACTICS, att, td), xa), td };
  }
  const ta = pick(ATT_TACTICS, weights(ATT_TACTICS, att, ''), xa);
  return { ta, td: pick(DEP_TACTICS, weights(DEP_TACTICS, dep, dep.rec > att.rec ? ta : ''), xd) };
}

/** Účinky taktik v boji: { att: { atk, def, foe }, dep: {…}, beaten: 'att' | 'dep' | '' } (zrušená taktika ztrácí kladné účinky). */
export function tacticEffects(ta, td) {
  const A = TACTICS[ta], D = TACTICS[td];
  if (!A || !D) return { att: NO_TACTIC, dep: NO_TACTIC, beaten: '' };
  const cut = (T) => ({ atk: Math.min(0, T.atk), def: Math.min(0, T.def), foe: 0 });
  const aBeaten = D.beats.includes(ta), dBeaten = A.beats.includes(td);
  return { att: aBeaten ? cut(A) : A, dep: dBeaten ? cut(D) : D, beaten: aBeaten ? 'att' : dBeaten ? 'dep' : '' };
}

/** Úroveň velitele armády první divize strany (0 bez velitele). */
export function leadOf(ctx, ids) {
  for (const id of ids) {
    const d = ctx.divs[id], army = d && d.army ? ctx.armies[d.army] : null;
    if (army && army.cmd && ctx.gens[army.cmd]) return genLevel(ctx.gens[army.cmd]);
  }
  return 0;
}
