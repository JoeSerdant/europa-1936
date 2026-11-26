// S5b: AI a mezinárodní trh. Země v míru s velkým přebytkem výzbroje ji vystaví (vždy); země ve válce, které výzbroj chybí,
// kupuje nejlevnější nabídky – jen ve volné historii (s historickou AI by nákupy měnily průběh války). Týdně, stejné příkazy jako hráč.
import { hasWar } from '../army/war.js';
import { tallyOwners, factoryUse } from '../industry/core.js';
import { consOf } from '../politics/core.js';
import { offerBlock, offerOnMarket, marketOffers, buyBlock, buyFromMarket, marketPrice } from '../industry/market.js';
import { AI } from './constants.js';

export function aiMarket(state, o) {
  if ((Math.floor(state.tick / 24) + o) % 7 !== 5) return state;
  const st = state.mil.stock[o];
  if (!st) return state;
  if (!hasWar(state.mil, o)) {
    for (const [eq, lim] of AI.MKT_SURPLUS) {
      const n = Math.min(AI.MKT_LOT, Math.floor(((st[eq] || 0) - lim) * AI.MKT_SHARE));
      if (n > 0 && !offerBlock(state, o, eq, n)) return offerOnMarket(state, o, eq, n);
    }
    return state;
  }
  if (state.ai && state.ai.hist) return state;
  const civ = factoryUse(tallyOwners(state)[o], consOf(state, o)).civAfterCons;
  for (const [eq, low] of AI.MKT_LOW) {
    if ((st[eq] || 0) >= low) continue;
    const offers = marketOffers(state).filter((x) => x.eq === eq && x.o !== o).sort((a, b) => a.id - b.id);
    for (const x of offers) {
      const n = Math.min(x.n, low - (st[eq] || 0));
      if (n > 0 && marketPrice(eq, n).fac <= civ * AI.MKT_CIV && !buyBlock(state, o, x.id, n, civ)) return buyFromMarket(state, o, x.id, n, civ);
    }
  }
  return state;
}
