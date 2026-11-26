// S5b: mezinárodní trh s výzbrojí (vlastní obdoba trhu z HOI4). Prodávající vystaví kusy ze skladu (rezervují se v nabídce),
// kupující je odebírá po dobu `MKT.DAYS` dní a po tu dobu platí civilními továrnami, které dostává prodávající na stavby.
//  ind.mkt = { n: další id, off: [{ id, o, eq, n }], deals: [{ id, s, b, eq, left, rate, fac, days }] }
// Čisté funkce a příkazy (neplatný vstup = tentýž stav); denní dodávky a platby provádí `marketDay` (v `industryDay`).
import { getWorld } from '../world.js';
import { EQUIP } from '../../data/army/index.js';
import { EQUIP_PROD } from '../../data/industry/buildings.js';
import { atWar } from '../army/war.js';
import { I } from './constants.js';
import { logAdd } from '../log.js';

export const MKT = { DAYS: 30, MARKUP: 1, MAX_OFF: 4, MIN_N: 10 };

const mktOf = (state) => state.ind.mkt || { n: 1, off: [], deals: [] };
const setMkt = (state, mkt, extra = {}) => ({ ...state, ind: { ...state.ind, mkt, ver: state.ind.ver + 1, ...extra } });
const okO = (o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length;

/** Cena `n` kusů druhu `eq`: { ic: výrobní body celkem, fac: civilních továren po dobu dodávky }. */
export function marketPrice(eq, n) {
  const ic = (EQUIP_PROD[eq] ? EQUIP_PROD[eq].cost : 1) * n * MKT.MARKUP;
  return { ic, fac: Math.ceil((ic / (MKT.DAYS * I.IC_PER_FAC)) * 10) / 10 };
}

/** Civilní továrny, které země `o` platí (−) nebo dostává (+) z obchodů na trhu. */
export function marketFac(state, o) {
  let f = 0;
  for (const d of mktOf(state).deals) { if (d.s === o) f += d.fac; if (d.b === o) f -= d.fac; }
  return Math.round(f * 10) / 10;
}

/** Proč země `o` nemůže vystavit `n` kusů `eq` (český text), nebo null. */
export function offerBlock(state, o, eq, n) {
  if (!okO(o) || state.dip.cap[o]) return 'Neplatná země.';
  if (!EQUIP[eq] || !EQUIP_PROD[eq]) return 'Tuto výzbroj nelze prodávat.';
  if (!Number.isInteger(n) || n < MKT.MIN_N) return `Nejméně ${MKT.MIN_N} kusů.`;
  if ((state.mil.stock[o][eq] || 0) < n) return 'Tolik kusů ve skladu nemáte.';
  if (mktOf(state).off.filter((x) => x.o === o).length >= MKT.MAX_OFF) return `Nejvýš ${MKT.MAX_OFF} nabídky najednou.`;
  return null;
}

/** Vystaví nabídku: kusy se odeberou ze skladu a čekají na kupce. */
export function offerOnMarket(state, o, eq, n) {
  if (offerBlock(state, o, eq, n)) return state;
  const m = mktOf(state), stock = state.mil.stock.slice();
  stock[o] = { ...stock[o], [eq]: stock[o][eq] - n };
  return { ...setMkt(state, { ...m, n: m.n + 1, off: [...m.off, { id: m.n, o, eq, n }] }), mil: { ...state.mil, stock } };
}

/** Stáhne nabídku: neprodané kusy se vrátí do skladu. */
export function withdrawOffer(state, o, id) {
  const m = mktOf(state), x = m.off.find((y) => y.id === id);
  if (!x || x.o !== o) return state;
  const stock = state.mil.stock.slice();
  stock[o] = { ...stock[o], [x.eq]: (stock[o][x.eq] || 0) + x.n };
  return { ...setMkt(state, { ...m, off: m.off.filter((y) => y !== x) }), mil: { ...state.mil, stock } };
}

/** Volné civilní továrny země pro platby na trhu (bez spotřebního zboží a bez už sjednaných plateb). */
export const freeCivFor = (state, o, civAfterCons) => Math.max(0, civAfterCons + Math.min(0, marketFac(state, o)));

/** Proč země `b` nemůže koupit `n` kusů z nabídky `id` (český text), nebo null. `civ` = její civilní továrny po spotřebním zboží. */
export function buyBlock(state, b, id, n, civ) {
  const x = mktOf(state).off.find((y) => y.id === id);
  if (!x) return 'Nabídka už neexistuje.';
  if (!okO(b) || state.dip.cap[b]) return 'Neplatná země.';
  if (x.o === b) return 'Vlastní nabídku koupit nelze.';
  if (atWar(state.mil, x.o, b)) return 'S nepřítelem se neobchoduje.';
  if (!Number.isInteger(n) || n < 1 || n > x.n) return 'Neplatné množství.';
  const p = marketPrice(x.eq, n);
  if (civ != null && freeCivFor(state, b, civ) < p.fac) return `Chybí civilní továrny (potřeba ${p.fac}).`;
  return null;
}

/** Koupí `n` kusů z nabídky `id`: vznikne obchod, kusy chodí `MKT.DAYS` dní, kupující po tu dobu platí továrnami. */
export function buyFromMarket(state, b, id, n, civ = null) {
  if (buyBlock(state, b, id, n, civ)) return state;
  const m = mktOf(state), x = m.off.find((y) => y.id === id), p = marketPrice(x.eq, n);
  const off = x.n === n ? m.off.filter((y) => y !== x) : m.off.map((y) => (y === x ? { ...y, n: y.n - n } : y));
  const deal = { id: m.n, s: x.o, b, eq: x.eq, left: n, rate: Math.ceil(n / MKT.DAYS), fac: p.fac, days: MKT.DAYS };
  const next = setMkt(state, { ...m, n: m.n + 1, off, deals: [...m.deals, deal] });
  const me = state.player ? getWorld().ownerIdx[state.player] : 0;
  return me && (me === x.o || me === b) ? logAdd(next, { k: 'mkt', a: x.o, b, x: x.eq, y: n }) : next;   // zápis jen pro hráče
}

/** Denní krok: dodávky kusů kupujícím; obchod mezi zeměmi ve válce se ruší (zbytek se vrátí prodávajícímu). */
export function marketDay(state) {
  const m = mktOf(state);
  if (!m.deals.length) return state;
  const stock = state.mil.stock.slice(), touched = new Set(), deals = [];
  const edit = (o) => { if (!touched.has(o)) { stock[o] = { ...stock[o] }; touched.add(o); } return stock[o]; };
  for (const d of m.deals) {
    if (atWar(state.mil, d.s, d.b) || state.dip.cap[d.b]) { const s = edit(d.s); s[d.eq] = (s[d.eq] || 0) + d.left; continue; }
    const give = Math.min(d.left, d.rate), t = edit(d.b);
    t[d.eq] = (t[d.eq] || 0) + give;
    if (d.left - give > 0 && d.days > 1) deals.push({ ...d, left: d.left - give, days: d.days - 1 });
    else if (d.left - give > 0) { t[d.eq] += d.left - give; }
  }
  return { ...setMkt(state, { ...m, deals }), mil: { ...state.mil, stock } };
}

/** Nabídky na trhu pro rozhraní (bez kapitulovaných prodávajících). */
export const marketOffers = (state) => mktOf(state).off.filter((x) => !state.dip.cap[x.o]);
/** Obchody země `o` (jako prodávající i kupující). */
export const marketDeals = (state, o) => mktOf(state).deals.filter((d) => d.s === o || d.b === o);
