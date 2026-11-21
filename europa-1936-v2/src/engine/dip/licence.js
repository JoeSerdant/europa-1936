// Licenční výroba (F4, po vzoru HOI4): země odkoupí od jiné země její úroveň druhu výzbroje, letounu nebo lodi.
// Úroveň se zapíše do `mil.lv[o][typ]` (jako po výzkumu; pozdější výzkum ji jen zvyšuje). Licenci lze koupit jen na typ, který země
// už smí vyrábět (odemčený), od země, se kterou neválčí a která jí věří (blok, pán a loutka, nebo vztah `DIP.LIC_REL`).
// Cena je politická moc za každou úroveň rozdílu (spojencům polovina).
import { getWorld } from '../world.js';
import { atWar } from '../army/war.js';
import { EQUIP } from '../../data/army/index.js';
import { PLANES } from '../../data/air/planes.js';
import { SHIPS } from '../../data/navy/ships.js';
import { TECHS } from '../../data/research/index.js';
import { isUnlocked } from '../research/core.js';
import { logAdd } from '../log.js';
import { hasCapitulated, relOf, sameFaction, setRel } from './core.js';
import { DIP } from './constants.js';

const ok = (o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length;
const itemOf = (k) => EQUIP[k] || PLANES[k] || SHIPS[k] || null;

/** Typy výzbroje, které mají úrovně (některá technologie je zvyšuje) – jen ty lze licencovat. Pořadí podle dat technologií. */
export const LIC_KEYS = (() => {
  const out = [];
  for (const id in TECHS) for (const k in TECHS[id].fx.lv || {}) if (!out.includes(k) && itemOf(k)) out.push(k);
  return out;
})();

const levelOf = (state, o, k) => (state.mil.lv && state.mil.lv[o] && state.mil.lv[o][k]) || 1;
const close = (state, a, b) => sameFaction(state, a, b) || state.dip.sub[a] === b || state.dip.sub[b] === a;

/** Cena licence typu `k` od `b` pro `a` v politické moci. */
export const licCost = (state, a, b, k) => {
  const diff = Math.max(0, levelOf(state, b, k) - levelOf(state, a, k));
  return Math.ceil(DIP.LIC_PP * diff * (close(state, a, b) ? 0.5 : 1));
};

/** Proč nejde koupit licenci typu `k` od `b` pro `a` (český text), nebo null. */
export function licBlock(state, a, b, k) {
  if (!ok(a) || !ok(b) || a === b) return 'Neplatná země.';
  if (!LIC_KEYS.includes(k)) return 'Na tento typ se licence neprodává.';
  if (hasCapitulated(state, a) || hasCapitulated(state, b)) return 'Kapitulovaná země licence neprodává ani nekupuje.';
  if (atWar(state.mil, a, b)) return 'Země jsou spolu ve válce.';
  if (levelOf(state, b, k) <= levelOf(state, a, k)) return 'Prodávající nemá lepší úroveň.';
  const item = itemOf(k);
  if (!isUnlocked(state, a, item.unlock)) return 'Nejdřív musíte tento typ umět vyrábět (vyzkoumat).';
  if (!close(state, a, b) && relOf(state, a, b) < DIP.LIC_REL) return `Prodávající vám nevěří – chybí vztah aspoň ${DIP.LIC_REL}.`;
  const own = state.pol.own[a], cost = licCost(state, a, b, k);
  if (!own || own.pp < cost) return `Chybí politická moc (${cost}).`;
  return null;
}

/** Licence, které teď `a` může od `b` koupit nebo by mohla: [{ k, n, mine, theirs, cost, block }] (jen typy, kde má `b` vyšší úroveň). */
export function licOffers(state, a, b) {
  const out = [];
  if (!ok(a) || !ok(b) || a === b) return out;
  for (const k of LIC_KEYS) {
    const mine = levelOf(state, a, k), theirs = levelOf(state, b, k);
    if (theirs <= mine) continue;
    out.push({ k, n: itemOf(k).n, mine, theirs, cost: licCost(state, a, b, k), block: licBlock(state, a, b, k) });
  }
  return out;
}

/** Koupí licenci typu `k` od `b`: `a` získá úroveň prodávajícího, zaplatí politickou moc a vztah se zlepší. Neplatný vstup = tentýž stav. */
export function buyLicence(state, a, b, k) {
  if (licBlock(state, a, b, k)) return state;
  const cost = licCost(state, a, b, k), lvl = levelOf(state, b, k);
  const lv = state.mil.lv.slice();
  lv[a] = { ...(lv[a] || {}), [k]: lvl };
  const pol = state.pol.own.slice();
  pol[a] = { ...pol[a], pp: pol[a].pp - cost };
  const dip = { ...state.dip, rel: setRel(state.dip.rel, a, b, DIP.LIC_REL_GAIN), ver: state.dip.ver + 1 };
  const next = { ...state, mil: { ...state.mil, lv }, pol: { ...state.pol, own: pol, ver: state.pol.ver + 1 }, dip };
  const me = state.player ? getWorld().ownerIdx[state.player] : 0;
  return me === a || me === b ? logAdd(next, { k: 'lic', a, b, x: k, y: lvl }) : next;   // osobní záznam jen s hráčem
}
