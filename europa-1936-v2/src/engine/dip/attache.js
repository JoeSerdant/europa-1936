// Vojenský atašé (F4, jako v HOI4): země, která neválčí s příjemcem ani s jeho nepřáteli, vyšle k válčící zemi pozorovatele.
// Odesílatel denně získává zkušenosti armády (`docDay`, `DIP.ATT_XP`), divize příjemce mají bonus útoku a obrany (`attMods` v `extraMods`)
// a vztah se zlepší. Stav: `dip.att = [{ a, b }]` (země `a` vyslala atašé k `b`); zaniká povoláním zpět nebo v `attDay`.
import { getWorld } from '../world.js';
import { hasWar, atWar, enemiesOf } from '../army/war.js';
import { logAdd } from '../log.js';
import { hasCapitulated, setRel } from './core.js';
import { DIP } from './constants.js';

const ok = (o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length;
const list = (state) => state.dip.att || [];

/** Země, ke kterým `a` vyslala atašé. */
export const attachesOf = (state, a) => list(state).filter((x) => x.a === a).map((x) => x.b);
/** Země, které mají atašé u `b`. */
export const attachesAt = (state, b) => list(state).filter((x) => x.b === b).map((x) => x.a);

/** Smí atašé země `a` dál zůstat u `b`? (příjemce válčí, odesílatel s ním ani s jeho nepřáteli neválčí, nikdo nekapituloval) */
const stillValid = (state, a, b) => !hasCapitulated(state, a) && !hasCapitulated(state, b) && hasWar(state.mil, b)
  && !atWar(state.mil, a, b) && !enemiesOf(state.mil, b).some((e) => atWar(state.mil, a, e));

/** Proč nejde vyslat atašé z `a` k `b` (český text), nebo null. */
export function attBlock(state, a, b) {
  if (!ok(a) || !ok(b) || a === b) return 'Neplatná země.';
  if (hasCapitulated(state, a) || hasCapitulated(state, b)) return 'Kapitulovaná země atašé nevysílá ani nepřijímá.';
  if (!hasWar(state.mil, b)) return 'Atašé se vysílá jen k zemi, která válčí.';
  if (atWar(state.mil, a, b)) return 'Země jsou spolu ve válce.';
  if (enemiesOf(state.mil, b).some((e) => atWar(state.mil, a, e))) return 'Spolubojovník atašé nepotřebuje – válčíte se stejným nepřítelem.';
  if (list(state).some((x) => x.a === a && x.b === b)) return 'Atašé tam už je.';
  if (attachesOf(state, a).length >= DIP.ATT_MAX) return `Nejvýš ${DIP.ATT_MAX} atašé najednou.`;
  const own = state.pol.own[a];
  if (!own || own.pp < DIP.ATT_PP) return `Chybí politická moc (${DIP.ATT_PP}).`;
  return null;
}

/** Vyšle atašé z `a` k `b` (stojí politickou moc, zlepší vztah). Neplatný vstup = tentýž stav. */
export function sendAttache(state, a, b) {
  if (attBlock(state, a, b)) return state;
  const pol = state.pol.own.slice();
  pol[a] = { ...pol[a], pp: pol[a].pp - DIP.ATT_PP };
  const dip = { ...state.dip, att: [...list(state), { a, b }], rel: setRel(state.dip.rel, a, b, DIP.ATT_REL), ver: state.dip.ver + 1 };
  const next = { ...state, pol: { ...state.pol, own: pol, ver: state.pol.ver + 1 }, dip };
  const me = state.player ? getWorld().ownerIdx[state.player] : 0;
  return me === a || me === b ? logAdd(next, { k: 'att', a, b }) : next;   // osobní záznam jen s hráčem
}

/** Povolá atašé země `a` od `b`. Žádný tam není = tentýž stav. */
export function recallAttache(state, a, b) {
  const att = list(state);
  if (!att.some((x) => x.a === a && x.b === b)) return state;
  return { ...state, dip: { ...state.dip, att: att.filter((x) => !(x.a === a && x.b === b)), ver: state.dip.ver + 1 } };
}

/** Denní krok (F4): atašé u země, která už neválčí (nebo je odesílatel nově ve válce s ní či s jejím nepřítelem), se vrací domů. */
export function attDay(state) {
  const att = list(state);
  if (!att.length) return state;
  const live = att.filter((x) => stillValid(state, x.a, x.b));
  return live.length === att.length ? state : { ...state, dip: { ...state.dip, att: live, ver: state.dip.ver + 1 } };
}
