// Záruky nezávislosti (M48): země `g` zaručí nezávislost země `t`. Napadne-li někdo `t`, zaručitel se přidá na její stranu (i s blokem), má-li dost stability.
// `state.dip.gar = [{ g, t }]`; zaručitelů je jedna řada na dvojici. Čisté funkce, neplatný vstup vrací tentýž stav.
import { getWorld } from '../world.js';
import { logAdd } from '../log.js';
import { atWar } from '../army/war.js';
import { DIP } from './constants.js';
import { hasCapitulated, sameFaction, setRel } from './core.js';

const ok = (o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length;
const patch = (state, p) => ({ ...state, dip: { ...state.dip, ...p, ver: state.dip.ver + 1 } });

/** Zaručuje `g` nezávislost `t`? */
export const guarantees = (state, g, t) => state.dip.gar.some((x) => x.g === g && x.t === t);
/** Země, které zaručují nezávislost `t`. */
export const guarantorsOf = (state, t) => state.dip.gar.filter((x) => x.t === t).map((x) => x.g);
/** Země, jejichž nezávislost zaručuje `g`. */
export const guaranteedBy = (state, g) => state.dip.gar.filter((x) => x.g === g).map((x) => x.t);

/** Proč `g` nemůže zaručit nezávislost `t` (český text), nebo null. */
export function guaranteeBlock(state, g, t) {
  if (!ok(g) || !ok(t) || g === t) return 'Neplatná země.';
  if (guarantees(state, g, t)) return 'Záruka už platí.';
  if (hasCapitulated(state, g) || hasCapitulated(state, t)) return 'Kapitulovaná země nedává ani nepřijímá záruky.';
  if (state.dip.sub[g] || state.dip.sub[t]) return 'Loutkový stát nedává ani nepřijímá záruky.';
  if (sameFaction(state, g, t)) return 'Člen téhož bloku je chráněn blokem.';
  if (atWar(state.mil, g, t)) return 'Ve válce se záruka nedává.';
  if (guaranteedBy(state, g).length >= DIP.GAR_MAX) return `Nejvýš ${DIP.GAR_MAX} záruk najednou.`;
  if (state.pol.own[g].pp < DIP.GAR_PP) return `Chybí politická moc (${Math.ceil(DIP.GAR_PP - state.pol.own[g].pp)}).`;
  return null;
}

/** Zaručí nezávislost: stojí politickou moc a zlepší vztah. */
export function guarantee(state, g, t) {
  if (guaranteeBlock(state, g, t)) return state;
  const pol = state.pol.own.slice();
  pol[g] = { ...pol[g], pp: pol[g].pp - DIP.GAR_PP };
  const s = patch(state, { gar: [...state.dip.gar, { g, t }], rel: setRel(state.dip.rel, g, t, DIP.GAR_REL) });
  return logAdd({ ...s, pol: { ...state.pol, own: pol } }, { k: 'gar', a: g, b: t });
}

/** Zruší záruku (zdarma, vztah mírně klesne). */
export function revokeGuarantee(state, g, t) {
  if (!ok(g) || !ok(t) || !guarantees(state, g, t)) return state;
  return logAdd(patch(state, { gar: state.dip.gar.filter((x) => !(x.g === g && x.t === t)), rel: setRel(state.dip.rel, g, t, -DIP.GAR_REL) }), { k: 'garend', a: g, b: t });
}

/** Zaručitelé obránce `b`, kteří se při útoku skutečně přidají: nejsou na straně útočníků, nekapitulovali, nejsou loutky a mají stabilitu. */
export function joiningGuarantors(state, b, attackers) {
  return guarantorsOf(state, b).filter((g) => !attackers.includes(g) && !hasCapitulated(state, g) && !state.dip.sub[g] && state.pol.own[g].stab >= DIP.GAR_STAB);
}

/** Zaručitelé, kteří při útoku na `b` selhávají (nízká stabilita): záruka zaniká. Vrací nový stav. */
export function breakGuarantees(state, b, attackers) {
  let s = state;
  for (const g of guarantorsOf(state, b)) {
    if (attackers.includes(g) || hasCapitulated(s, g) || joiningGuarantors(state, b, attackers).includes(g)) continue;
    s = logAdd(patch(s, { gar: s.dip.gar.filter((x) => !(x.g === g && x.t === b)), rel: setRel(s.dip.rel, g, b, -DIP.GAR_REL * 3) }), { k: 'garend', a: g, b });
  }
  return s;
}
