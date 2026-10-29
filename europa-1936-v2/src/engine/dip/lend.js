// Půjčka a pronájem (M47): země pošle část skladu výzbroje spojenci. Příkaz je okamžitý přesun zásob, nic se nepřidává do stavu kromě záznamu v deníku.
import { getWorld } from '../world.js';
import { EQUIP, EQUIP_IDS } from '../../data/army/index.js';
import { atWar, hasWar } from '../army/war.js';
import { logAdd } from '../log.js';
import { sameFaction, hasCapitulated, setRel } from './core.js';
import { overlordOf } from './subjects.js';
import { DIP } from './constants.js';

const ok = (o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length;

/** Je `to` přítel, kterému smí `from` posílat výzbroj? (stejný blok, vlastní loutka nebo pán loutky) */
export const lendFriend = (state, from, to) => ok(from) && ok(to) && from !== to
  && (sameFaction(state, from, to) || overlordOf(state, to) === from || overlordOf(state, from) === to);

/** Nejvíc kusů druhu `eq`, které země `from` smí poslat najednou (podíl `LEND_MAX` skladu, zbytek si nechá). */
export const lendMax = (state, from, eq) => {
  const have = state.mil.stock[from]?.[eq] || 0;
  return Math.floor(have * DIP.LEND_MAX);
};

/** Proč nejde poslat `n` kusů `eq` z `from` do `to` (český text), nebo null. */
export function lendBlock(state, from, to, eq, n) {
  if (!ok(from) || !ok(to) || from === to) return 'Neplatná země.';
  if (!EQUIP[eq]) return 'Neznámý druh výzbroje.';
  if (!Number.isInteger(n) || n < 1) return 'Neplatné množství.';
  if (hasCapitulated(state, from) || hasCapitulated(state, to)) return 'Kapitulovaná země nic neposílá ani nepřijímá.';
  if (atWar(state.mil, from, to)) return 'Země jsou ve válce.';
  if (!lendFriend(state, from, to)) return 'Výzbroj lze posílat jen spojencům v bloku nebo loutkám.';
  if (n > lendMax(state, from, eq)) return `Najednou lze poslat nejvýš ${Math.round(DIP.LEND_MAX * 100)} % skladu.`;
  return null;
}

/** Pošle `n` kusů druhu `eq` ze skladu `from` do skladu `to`; zlepší vztah. Neplatný vstup vrací tentýž stav. */
export function lendLease(state, from, to, eq, n) {
  if (lendBlock(state, from, to, eq, n)) return state;
  const stock = state.mil.stock.slice();
  stock[from] = { ...stock[from], [eq]: stock[from][eq] - n };
  stock[to] = { ...stock[to], [eq]: (stock[to]?.[eq] || 0) + n };
  const dip = { ...state.dip, rel: setRel(state.dip.rel, from, to, DIP.LEND_REL), ver: state.dip.ver + 1 };
  return logAdd({ ...state, mil: { ...state.mil, stock }, dip }, { k: 'lend', a: from, b: to, x: eq, y: n });
}

/** Příjemci, kterým `from` může teď posílat (blok a loutky), bez kapitulovaných. */
export function lendTargets(state, from) {
  const w = getWorld(), out = [];
  for (let t = 1; t < w.owners.length; t++) if (lendFriend(state, from, t) && !hasCapitulated(state, t) && !atWar(state.mil, from, t)) out.push(t);
  return out;
}

/** AI: zemi v míru s přebytkem pošle část skladu přátelům ve válce, kterým výzbroj chybí. Denní krok. */
export function aiLend(state, o) {
  if (hasWar(state.mil, o)) return state;
  for (const t of lendTargets(state, o)) {
    if (!hasWar(state.mil, t)) continue;
    for (const eq of EQUIP_IDS) {
      const mine = state.mil.stock[o]?.[eq] || 0, theirs = state.mil.stock[t]?.[eq] || 0;
      if (mine < DIP.LEND_AI_MIN || theirs >= mine / 4) continue;
      const n = Math.min(lendMax(state, o, eq), Math.floor((mine - theirs) / 4));
      if (n >= 1) state = lendLease(state, o, t, eq, n);
    }
  }
  return state;
}
