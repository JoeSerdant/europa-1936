// Denní krok národních cílů a událostí (M22): naplánované a podmíněné události, plnění cíle, výběr cíle a voleb AI zemí.
import { getWorld } from '../world.js';
import { EVENTS, EVENT_BY_ID } from '../../data/nat/index.js';
import { NAT } from './constants.js';
import { focusStatus, focusTreeOf, eventReady, rand01 } from './core.js';
import { applyFx } from './effects.js';

const setOwn = (state, o, own) => {
  const arr = state.nat.own.slice();
  arr[o] = own;
  return { ...state, nat: { ...state.nat, own: arr } };
};
const bump = (state) => ({ ...state, nat: { ...state.nat, ver: state.nat.ver + 1 } });

/** Volba AI: nejvyšší váha `ai` (při shodě první). */
export function aiOption(ev) {
  let best = 0;
  for (let i = 1; i < ev.opts.length; i++) if ((ev.opts[i].ai || 0) > (ev.opts[best].ai || 0)) best = i;
  return best;
}

/** Spustí událost: hráči se zařadí do fronty a hra se pozastaví, AI zemi se rovnou provede nejlepší volba. */
export function fireEvent(state, o, id, player) {
  const ev = EVENT_BY_ID[id];
  if (!ev) return state;
  const own = state.nat.own[o];
  state = setOwn(state, o, { ...own, seen: { ...own.seen, [id]: state.tick } });
  if (o === player) {
    if (state.nat.pend.length >= NAT.PEND_MAX) return bump(state);
    return { ...state, paused: true, nat: { ...state.nat, ver: state.nat.ver + 1, pend: [...state.nat.pend, { o, id, at: state.tick }] } };
  }
  return bump(applyFx(state, o, ev.opts[aiOption(ev)].fx));
}

export function natDay(state) {
  const w = getWorld();
  const player = state.player ? w.ownerIdx[state.player] : 0;
  for (let o = 1; o < w.owners.length; o++) {
    let own = state.nat.own[o];
    // naplánované události
    if (own.sched.some((s) => s.at <= state.tick)) {
      const due = own.sched.filter((s) => s.at <= state.tick);
      state = setOwn(state, o, { ...own, sched: own.sched.filter((s) => s.at > state.tick) });
      for (const s of due) state = fireEvent(state, o, s.id, player);
      own = state.nat.own[o];
    }
    // podmíněné události (nejvýš jedna za den a zemi)
    for (const ev of EVENTS) {
      if (!eventReady(state, o, ev, own)) continue;
      if (ev.mtth > 1 && rand01(state.tick, o, ev.id) >= 1 / ev.mtth) continue;
      state = fireEvent(state, o, ev.id, player);
      own = state.nat.own[o];
      break;
    }
    // AI vybírá cíl
    if (o !== player && !own.cur) {
      const free = focusTreeOf(o).filter((f) => focusStatus(own, f) === 'available').sort((a, b) => a.ai - b.ai || a.y - b.y || a.x - b.x);
      if (free.length) { own = { ...own, cur: { id: free[0].id, p: 0 } }; state = bump(setOwn(state, o, own)); }
    }
    // plnění cíle
    if (own.cur) {
      const f = focusTreeOf(o).find((x) => x.id === own.cur.id);
      const p = own.cur.p + NAT.FOCUS_SPEED;
      if (!f) { state = bump(setOwn(state, o, { ...own, cur: null })); continue; }
      if (p >= f.days) {
        state = bump(setOwn(state, o, { ...own, cur: null, done: { ...own.done, [f.id]: 1 } }));
        state = applyFx(state, o, f.fx);
      } else state = setOwn(state, o, { ...own, cur: { id: f.id, p } });
    }
  }
  return state;
}
