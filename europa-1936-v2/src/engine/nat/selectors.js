// Dotazy na národní cíle a události pro rozhraní a AI (čisté, bez změn stavu).
import { getWorld } from '../world.js';
import { EVENT_BY_ID } from '../../data/nat/index.js';
import { focusStatus, focusTreeOf, natOwn } from './core.js';

const idxOf = (o) => (typeof o === 'string' ? getWorld().ownerIdx[o] : o);

/** Strom cílů země se stavem každého cíle a postupem plněného. */
export function focusTree(state, o) {
  o = idxOf(o);
  const own = natOwn(state, o);
  return focusTreeOf(o).map((f) => {
    const status = focusStatus(own, f);
    return { ...f, status, p: status === 'active' ? own.cur.p : 0, left: status === 'active' ? Math.ceil(f.days - own.cur.p) : f.days };
  });
}

/** Souhrn: plněný cíl, počet hotových, příznaky. */
export function natOf(state, o) {
  o = idxOf(o);
  const own = natOwn(state, o);
  return { o, cur: own.cur, done: Object.keys(own.done).length, flags: own.flags, total: focusTreeOf(o).length };
}

/** Události čekající na volbu země (se všemi daty události). */
export const pendingEvents = (state, o) => state.nat.pend.filter((p) => p.o === idxOf(o)).map((p) => ({ ...p, ev: EVENT_BY_ID[p.id] }));
