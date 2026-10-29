// Provedení účinků cílů a událostí (M22): čistá funkce `(state, o, fx[]) → state`, mění politiku, průmysl, výzkum, armádu a příznaky země.
import { getWorld } from '../world.js';
import { LAWS, ADVISORS } from '../../data/politics/index.js';
import { TECHS } from '../../data/research/index.js';
import { IND_NATIONAL } from '../../data/industry/index.js';
import { I } from '../industry/constants.js';
import { slotsOf, slotsUsed } from '../industry/core.js';
import { grantTech } from '../research/commands.js';
import { isAvailable } from '../research/core.js';
import { countryStats } from '../selectors.js';
import { addXp } from '../doc/commands.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const touch = (state, o, fn) => {
  const arr = state.nat.own.slice();
  arr[o] = fn(arr[o]);
  return { ...state, nat: { ...state.nat, ver: state.nat.ver + 1, own: arr } };
};
const setPol = (state, o, patch) => {
  const arr = state.pol.own.slice();
  arr[o] = { ...arr[o], ...patch(arr[o]) };
  return { ...state, pol: { ...state.pol, own: arr } };
};

/** Stát země s volným slotem pro továrnu: hlavní stát první, jinak největší. */
function freeStateFor(state, o) {
  const w = getWorld();
  const cap = w.provState[w.owners[o].cap];
  const ok = (s) => state.stateOwner[s] === o && state.ctrl[w.states[s].cap] === o && slotsUsed(state.ind, s) < slotsOf(state.ind, s);
  if (ok(cap)) return cap;
  let best = 0;
  for (let s = 1; s < w.states.length; s++) if (ok(s) && (!best || w.states[s].p > w.states[best].p)) best = s;
  return best;
}

export function applyFx(state, o, fx) {
  for (const e of fx || []) state = applyOne(state, o, e);
  return state;
}

function applyOne(state, o, e) {
  const w = getWorld();
  switch (e.t) {
    case 'pp': return setPol(state, o, (p) => ({ pp: Math.max(0, p.pp + e.v) }));
    case 'stab': return setPol(state, o, (p) => ({ stab: clamp01(p.stab + e.v) }));
    case 'ws': return setPol(state, o, (p) => ({ ws: clamp01(p.ws + e.v) }));
    case 'law': return LAWS[e.cat]?.[e.id] ? setPol(state, o, (p) => ({ laws: { ...p.laws, [e.cat]: e.id } })) : state;
    case 'adv': return ADVISORS[e.id] ? setPol(state, o, (p) => ({ adv: { ...p.adv, [e.slot]: e.id } })) : state;
    case 'factory': {
      let st = state;
      for (let i = 0; i < e.n; i++) {
        const s = freeStateFor(st, o);
        if (!s) break;
        const arr = st.ind.st.slice();
        arr[s] = { ...arr[s], [e.k]: arr[s][e.k] + 1 };
        st = { ...st, ind: { ...st.ind, st: arr, ver: st.ind.ver + 1 } };
      }
      return st;
    }
    case 'infra': {
      const s = w.provState[w.owners[o].cap];
      if (state.stateOwner[s] !== o) return state;
      const inf = state.ind.inf.slice();
      inf[s] = Math.min(I.INF_MAX, (inf[s] || 0) + e.n);
      return inf[s] === state.ind.inf[s] ? state : { ...state, ind: { ...state.ind, inf, ver: state.ind.ver + 1 } };
    }
    case 'boost': {
      const cur = state.tech.own[o];
      if (!TECHS[e.id] || !isAvailable(cur, e.id)) return state;
      const arr = state.tech.own.slice();
      arr[o] = { ...cur, prog: { ...cur.prog, [e.id]: Math.min(0.99, (cur.prog[e.id] || 0) + e.v) } };
      return { ...state, tech: { ...state.tech, ver: state.tech.ver + 1, own: arr } };
    }
    case 'boostslot': {
      const cur = state.tech.own[o];
      const id = cur.slots.find(Boolean);
      return id ? applyOne(state, o, { t: 'boost', id, v: e.v }) : state;
    }
    case 'tech': return grantTech(state, o, e.id);
    case 'man': {
      const st = countryStats(state, w.owners[o].tag);
      const add = st ? Math.round(st.pop * 1000 * e.v) : 0;
      if (!add) return state;
      const man = state.mil.man.slice();
      man[o] += add;
      return { ...state, mil: { ...state.mil, man } };
    }
    case 'stock': {
      const stock = state.mil.stock.slice();
      stock[o] = { ...stock[o], [e.eq]: (stock[o][e.eq] || 0) + e.n };
      return { ...state, mil: { ...state.mil, stock } };
    }
    case 'xp': return addXp(state, o, e.b, e.n);
    case 'flag': return touch(state, o, (own) => ({ ...own, flags: { ...own.flags, [e.id]: 1 } }));
    case 'event': return touch(state, o, (own) => ({ ...own, sched: [...own.sched, { id: e.id, at: state.tick + e.days * 24 }] }));
    default: return state;
  }
}
void IND_NATIONAL;
