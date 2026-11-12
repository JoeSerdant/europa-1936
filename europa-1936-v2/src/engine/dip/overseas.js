// Zámořská pomoc (M79): pravidelné dodávky výzbroje, letounů a paliva od mocnosti mimo mapu (data `OVERSEAS_AID`). Denní krok `overseasDay` v `dipDay`;
// jen s historickou AI (`ai.hist`). Zásilka dorazí, když příjemce existuje, válčí s některou ze zemí `foes` a mořská oblast jeho domovského přístavu
// není zablokovaná nepřítelem; jinak se den vynechá (a zapíše se neúspěch). První zásilku hlásí deník celému světu.
import { getWorld } from '../world.js';
import { logAdd } from '../log.js';
import { atWar } from '../army/war.js';
import { EQUIP } from '../../data/army/equipment.js';
import { PLANES } from '../../data/air/planes.js';
import { OVERSEAS_AID } from '../../data/dip/overseas.js';
import { homeSea, seaBlocked } from '../nav/core.js';
import { hasCapitulated } from './core.js';

/** Je dnes den zásilky `a`? (první den okna a pak každých `every` dní) */
const due = (a, day) => day >= a.from && day <= a.until && (day - a.from) % a.every === 0;

/** Důvod, proč zásilka `a` dnes nedorazí (český text), nebo null. */
export function aidBlock(state, a) {
  const w = getWorld(), to = w.ownerIdx[a.to];
  if (!to || hasCapitulated(state, to)) return 'Příjemce neexistuje.';
  if (!a.foes.some((t) => { const f = w.ownerIdx[t]; return f && atWar(state.mil, to, f); })) return 'Příjemce neválčí.';
  const home = state.nav ? homeSea(state, to) : null;
  if (!home) return 'Příjemce nemá přístav.';
  if (seaBlocked(state, to, home.sea)) return 'Přístav je zablokovaný.';
  return null;
}

/** Připíše zásilku `a` příjemci (výzbroj do skladu, letouny do rezervy, palivo do zásoby). */
export function deliverAid(state, a) {
  const w = getWorld(), to = w.ownerIdx[a.to];
  const stock = state.mil.stock.slice(), cur = { ...(stock[to] || {}) };
  let pool = state.air ? state.air.pool : null, fuel = state.ind.fuel;
  let planes = null;
  for (const k in a.give) {
    const n = a.give[k];
    if (EQUIP[k]) cur[k] = (cur[k] || 0) + n;
    else if (PLANES[k] && pool) { planes = planes || { ...pool[to] }; planes[k] = (planes[k] || 0) + n; }
    else if (k === 'fuel' && fuel && fuel[to]) { fuel = fuel.slice(); fuel[to] = { ...fuel[to], s: fuel[to].s + n }; }
  }
  stock[to] = cur;
  let s = { ...state, mil: { ...state.mil, stock }, ind: fuel === state.ind.fuel ? state.ind : { ...state.ind, fuel } };
  if (planes) { pool = pool.slice(); pool[to] = planes; s = { ...s, air: { ...s.air, pool, ver: s.air.ver + 1 } }; }
  return s;
}

/** Denní krok: zásilky, které dnes mají dorazit. První úspěšná zásilka příjemci se zapíše do deníku (`aid`, y = 1), zmařená také (y = 0, jen pro příjemce). */
export function overseasDay(state) {
  if (!state.ai || !state.ai.hist) return state;
  const w = getWorld(), day = Math.round(state.tick / 24);
  let s = state;
  for (const a of OVERSEAS_AID) {
    if (!due(a, day)) continue;
    const to = w.ownerIdx[a.to];
    const why = aidBlock(s, a);
    if (why) { if (to && why === 'Přístav je zablokovaný.') s = logAdd(s, { k: 'aid', o: to, x: a.id, y: 0 }); continue; }
    const first = !s.nat.own[to].flags[`aid_${a.id}`];
    s = deliverAid(s, a);
    if (first) {
      const own = s.nat.own.slice();
      own[to] = { ...own[to], flags: { ...own[to].flags, [`aid_${a.id}`]: 1 } };
      s = { ...s, nat: { ...s.nat, ver: s.nat.ver + 1, own } };
    }
    s = logAdd(s, { k: 'aid', o: to, x: a.id, y: first ? 1 : 2 });
  }
  return s;
}
