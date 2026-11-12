// AI: palivo (M87). Země, které palivo dochází, si týdně sjedná dovoz ropy od vývozce s největším přebytkem (stejný příkaz jako hráč: `addTrade`),
// přestane motorizovat armádu (`desiredMix`) a při vážném nedostatku nechá bombardéry na zemi (`aiAir`).
import { getWorld } from '../world.js';
import { fuelOf } from '../fuel/index.js';
import { industryOf } from '../industry/selectors.js';
import { addTrade } from '../industry/commands.js';
import { I } from '../industry/constants.js';
import { atWar, hasWar } from '../army/war.js';
import { relOf, sameFaction } from '../dip/core.js';
import { AI } from './constants.js';

/** Dochází zemi palivo? (spotřeba není pokrytá, nebo zásoba vystačí na méně než `AI.FUEL_DAYS` dní) */
export function fuelShort(state, o) {
  const f = fuelOf(state, o);
  return f.use > 1e-9 && (f.ratio < 1 || f.days < AI.FUEL_DAYS);
}

/** Vývozce ropy pro zemi `o`: největší přebytek (těžba − vývoz − vlastní potřeba), ne nepřítel, ne země se špatným vztahem; { from, surplus } nebo null. */
export function oilSupplier(state, o) {
  const w = getWorld();
  let best = null, bk = -Infinity;
  for (let x = 1; x < w.owners.length; x++) {
    if (x === o || state.dip.cap[x] || atWar(state.mil, o, x) || relOf(state, o, x) < AI.FUEL_REL_MIN) continue;
    if (state.ind.trade.some((d) => d.from === x && d.to === o && d.res === 'ropa')) continue;
    const r = industryOf(state, x).res.ropa;
    if (!r) continue;
    const surplus = r.ext - r.exp - r.dem;
    if (surplus < AI.FUEL_SURPLUS_MIN) continue;
    const k = surplus + (sameFaction(state, o, x) ? 5 : 0) + relOf(state, o, x) / 50;
    if (k > bk) { bk = k; best = { from: x, surplus }; }
  }
  return best;
}

/** Týdně: válčící země, jejíž spotřeba paliva není pokrytá, si sjedná dovoz ropy (nejvýš `AI.FUEL_DEALS` smluv). V míru AI ropu nedováží, aby se neměnilo předválečné hospodářství. */
export function aiFuel(state, o) {
  if (state.tick % (24 * 7) !== 0 || !hasWar(state.mil, o) || fuelOf(state, o).ratio >= 1) return state;   // dováží se jen za války a až při skutečném nedostatku (spotřeba není pokrytá)
  if (state.ind.trade.filter((d) => d.to === o && d.res === 'ropa').length >= AI.FUEL_DEALS) return state;
  const sup = oilSupplier(state, o);
  if (!sup) return state;
  const f = fuelOf(state, o);
  const need = Math.max(1, (f.use - f.gain) * AI.FUEL_MARGIN);
  return addTrade(state, sup.from, o, 'ropa', Math.min(I.TRADE_AMT_MAX, Math.round(Math.min(need, sup.surplus) * 10) / 10));
}
