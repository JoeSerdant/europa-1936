// AI: palivo (M87). Země, které palivo dochází, si týdně sjedná dovoz ropy od vývozce s největším přebytkem (stejný příkaz jako hráč: `addTrade`),
// přestane motorizovat armádu (`desiredMix`) a při vážném nedostatku nechá bombardéry na zemi (`aiAir`).
import { getWorld } from '../world.js';
import { fuelOf } from '../fuel/index.js';
import { industryOf } from '../industry/selectors.js';
import { addTrade, cancelTrade } from '../industry/commands.js';
import { I } from '../industry/constants.js';
import { atWar, hasWar } from '../army/war.js';
import { relOf, sameFaction } from '../dip/core.js';
import { AI } from './constants.js';
import { playerOf } from './core.js';

/** Dochází zemi palivo? (spotřeba není pokrytá, nebo zásoba vystačí na méně než `AI.FUEL_DAYS` dní) */
export function fuelShort(state, o) {
  const f = fuelOf(state, o);
  return f.use > 1e-9 && (f.ratio < 1 || f.days < AI.FUEL_DAYS);
}

/**
 * Vývozce suroviny `res` pro zemi `o`: největší přebytek (těžba − vývoz − vlastní potřeba), ne nepřítel, ne hráč (tomu AI vývoz nevnucuje), ne země se špatným vztahem
 * ani země, se kterou už smlouvu na tuto surovinu má; { from, surplus } nebo null.
 */
export function resSupplier(state, o, res, min = AI.FUEL_SURPLUS_MIN) {
  const w = getWorld(), player = playerOf(state);
  let best = null, bk = -Infinity;
  for (let x = 1; x < w.owners.length; x++) {
    if (x === o || x === player || state.dip.cap[x] || atWar(state.mil, o, x) || relOf(state, o, x) < AI.FUEL_REL_MIN) continue;
    if (state.ind.trade.some((d) => d.from === x && d.to === o && d.res === res)) continue;
    if (state.ind.trade.filter((d) => d.from === x || d.to === x).length >= I.TRADE_MAX - AI.TRADE_SPARE) continue;   // vývozce zahlcený smlouvami
    const r = industryOf(state, x).res[res];
    if (!r) continue;
    const surplus = r.ext - r.exp - r.dem;
    if (surplus < min) continue;
    const k = surplus + (sameFaction(state, o, x) ? 5 : 0) + relOf(state, o, x) / 50;
    if (k > bk) { bk = k; best = { from: x, surplus }; }
  }
  return best;
}
export const oilSupplier = (state, o) => resSupplier(state, o, 'ropa');

/**
 * Dovoz surovin pro výrobu (M88): jednou týdně si země sjedná dovoz suroviny, jejíž nedostatek nejvíc brzdí zbrojovky (pokrytí pod `AI.TRADE_NEED`),
 * od země s přebytkem – nejvýš do podílu `AI.TRADE_CIV_SHARE` civilních továren. Smlouvu, kterou už nepotřebuje, zruší. Stejné příkazy jako hráč.
 */
export function aiTrade(state, o) {
  if ((Math.floor(state.tick / 24) + o) % AI.TRADE_DAYS !== 0) return state;
  const sum = industryOf(state, o);
  if (sum.civ <= 0) return state;
  // úklid: smlouva, kterou vývozce neplní (nemá přebytek, cesta je přerušená), a dovoz, bez kterého je surovina pokrytá
  for (const d of sum.trade) {
    if (d.to !== o) continue;
    if (d.got < d.amt * AI.TRADE_DEAD) return cancelTrade(state, d.id);
    const x = sum.res[d.res];
    if (x && x.ext - x.exp + x.imp - d.got >= x.dem * 1.1) return cancelTrade(state, d.id);
  }
  const perUnit = sum.imports > 0 ? sum.tradeCiv / sum.imports : I.TRADE_CIV;
  const room = (sum.civ * AI.TRADE_CIV_SHARE - sum.tradeCiv) / Math.max(1e-9, perUnit);
  if (room < AI.TRADE_MIN) return state;
  const list = Object.keys(sum.res).filter((r) => sum.res[r].dem > 1e-9 && sum.res[r].f < AI.TRADE_NEED).sort((a, b) => sum.res[a].f - sum.res[b].f || (a < b ? -1 : 1));
  for (const r of list) {
    const x = sum.res[r];
    const pending = sum.trade.filter((d) => d.to === o && d.res === r).reduce((a, d) => a + Math.max(0, d.amt - d.got), 0);   // sjednáno, ale ještě nedodáno
    const lack = x.dem - (x.ext - x.exp + x.imp) - pending;
    if (lack < AI.TRADE_MIN) continue;
    const sup = resSupplier(state, o, r, AI.TRADE_MIN);
    if (!sup) continue;
    const amt = Math.floor(Math.min(I.TRADE_AMT_MAX, lack * AI.TRADE_MARGIN, sup.surplus, room) * 10) / 10;
    if (amt < AI.TRADE_MIN) continue;
    const next = addTrade(state, sup.from, o, r, amt);
    if (next !== state) return next;
  }
  return state;
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
