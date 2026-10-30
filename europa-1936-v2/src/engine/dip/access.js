// Vojenský přístup (M67): kdo smí vstoupit na území koho, aniž by byla válka. Členové téhož bloku, pán a jeho loutky ho mají vždy;
// ostatní podle dohody `state.dip.acc = [{ g, r }]` (země `g` dovolila průchod zemi `r`). Čisté funkce, neplatný vstup vrací tentýž stav.
import { getWorld } from '../world.js';
import { logAdd } from '../log.js';
import { atWar } from '../army/war.js';
import { withCtx, evictStrangers } from '../army/commands.js';
import { DIP } from './constants.js';
import { hasCapitulated, relOf, setRel } from './core.js';
import { guarantees } from './guarantee.js';
import { hasAccess, grants } from './accessCore.js';

export { hasAccess, friendsOf, grants, grantedBy } from './accessCore.js';

const ok = (o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length;
const patch = (state, p) => ({ ...state, dip: { ...state.dip, ...p, ver: state.dip.ver + 1 } });

/** Je `g` ochotna dovolit průchod zemi `r`? Vstřícný vztah, nebo záruka nezávislosti od žadatele. Bez náhody. */
export const acceptsAccess = (state, g, r) => relOf(state, g, r) >= DIP.ACC_REL || guarantees(state, r, g);

/** Proč `r` nemůže získat přístup na území `g` (český text), nebo null. */
export function accessBlock(state, r, g) {
  if (!ok(r) || !ok(g) || r === g) return 'Neplatná země.';
  if (hasAccess(state.dip, r, g)) return 'Přístup už máte.';
  if (atWar(state.mil, r, g)) return 'Ve válce přístup nikdo nedává.';
  if (hasCapitulated(state, g) || hasCapitulated(state, r)) return 'Kapitulovaná země přístup nedává ani nežádá.';
  if (state.dip.sub[g]) return 'Loutka nerozhoduje o přístupu na své území.';
  if (state.pol.own[r].pp < DIP.ACC_PP) return `Chybí politická moc (${Math.ceil(DIP.ACC_PP - state.pol.own[r].pp)}).`;
  if (!acceptsAccess(state, g, r)) return 'Neochotně: vztah je příliš nízký.';
  return null;
}

/** Požádá o přístup: stojí politickou moc; vstřícná země dovolí průchod hned. */
export function requestAccess(state, r, g) {
  if (accessBlock(state, r, g)) return state;
  const pol = state.pol.own.slice();
  pol[r] = { ...pol[r], pp: pol[r].pp - DIP.ACC_PP };
  const s = patch(state, { acc: [...(state.dip.acc || []), { g, r }], rel: setRel(state.dip.rel, g, r, DIP.ACC_REL_GAIN) });
  return logAdd({ ...s, pol: { ...state.pol, own: pol } }, { k: 'access', a: g, b: r });
}

/** Proč `g` nemůže dát přístup zemi `r` (český text), nebo null. */
export function grantBlock(state, g, r) {
  if (!ok(g) || !ok(r) || g === r) return 'Neplatná země.';
  if (hasAccess(state.dip, r, g)) return 'Přístup už mají.';
  if (atWar(state.mil, g, r)) return 'Ve válce přístup nikdo nedává.';
  if (hasCapitulated(state, g) || hasCapitulated(state, r)) return 'Kapitulovaná země přístup nedává ani nepřijímá.';
  if (state.dip.sub[g]) return 'Loutka nerozhoduje o přístupu na své území.';
  return null;
}

/** Dá přístup bez žádosti (zdarma): `g` dovolí průchod zemi `r`, se kterou není ve válce. */
export function grantAccess(state, g, r) {
  if (grantBlock(state, g, r)) return state;
  return logAdd(patch(state, { acc: [...(state.dip.acc || []), { g, r }], rel: setRel(state.dip.rel, g, r, DIP.ACC_REL_GAIN) }), { k: 'access', a: g, b: r });
}

/** Odejme přístup (zdarma, vztah mírně klesne); cizí jednotky na území odejdou domů při nejbližším denním kroku. */
export function revokeAccess(state, g, r) {
  if (!ok(g) || !ok(r) || !grants(state, g, r)) return state;
  return logAdd(patch(state, { acc: state.dip.acc.filter((x) => !(x.g === g && x.r === r)), rel: setRel(state.dip.rel, g, r, -DIP.ACC_REL_GAIN) }), { k: 'accend', a: g, b: r });
}

/** Zruší dohody mezi `a` a `b` (válka je přeruší). Bez dohod vrací tentýž stav. */
export function dropAccess(state, a, b) {
  const acc = state.dip.acc;
  if (!acc || !acc.some((x) => (x.g === a && x.r === b) || (x.g === b && x.r === a))) return state;
  return patch(state, { acc: acc.filter((x) => !((x.g === a && x.r === b) || (x.g === b && x.r === a))) });
}

/** Denní úklid: dohody s kapitulovanými zeměmi zaniknou a jednotky, které už nemají na cizím území právo být, se vrátí domů. */
export function accessDay(state) {
  let s = state;
  const acc = s.dip.acc;
  if (acc && acc.some((x) => hasCapitulated(s, x.g) || hasCapitulated(s, x.r) || atWar(s.mil, x.g, x.r))) {
    s = patch(s, { acc: acc.filter((x) => !(hasCapitulated(s, x.g) || hasCapitulated(s, x.r) || atWar(s.mil, x.g, x.r))) });
  }
  return withCtx(s, (ctx) => evictStrangers(ctx));
}
