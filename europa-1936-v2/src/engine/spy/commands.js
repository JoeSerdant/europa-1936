// Příkazy zpravodajství (M41): čisté funkce `(state, …) → state`; neplatný vstup vrací tentýž objekt.
import { getWorld } from '../world.js';
import { SPY } from './constants.js';
import { SPY_OPS } from '../../data/spy/ops.js';
import { COUNTRIES } from '../../data/countries.js';
import { sameFaction } from '../dip/core.js';

const ok = (o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length;
const put = (state, o, own) => { const arr = state.spy.own.slice(); arr[o] = own; return { ...state, spy: { ...state.spy, ver: state.spy.ver + 1, own: arr } }; };
const setPp = (state, o, d) => { const pol = state.pol.own.slice(); pol[o] = { ...pol[o], pp: pol[o].pp + d }; return { ...state, pol: { ...state.pol, own: pol } }; };

export const agentMax = (o) => SPY.AGENTS_MAX[COUNTRIES[getWorld().owners[o].tag]?.tier ?? 3];

/** Agenti země: celkem a volní. */
export function agentsOf(state, o) {
  const e = state.spy.own[o];
  return { total: e.ag, busy: e.ops.length, free: e.ag - e.ops.length, max: agentMax(o) };
}

/** Najme agenta za politickou moc (do `agentMax`). */
export function hireAgent(state, o) {
  if (!ok(o) || state.dip.cap[o]) return state;
  const e = state.spy.own[o];
  if (e.ag >= agentMax(o) || state.pol.own[o].pp < SPY.AGENT_PP) return state;
  return setPp(put(state, o, { ...e, ag: e.ag + 1 }), o, -SPY.AGENT_PP);
}

/** Proč nejde zahájit operaci `k` proti zemi `t` (česky), nebo null. */
export function opBlock(state, o, k, t) {
  const op = SPY_OPS[k];
  if (!op || !ok(o) || !ok(t) || o === t) return 'Neplatná operace.';
  if (state.dip.cap[o]) return 'Kapitulovaná země nemá zpravodajství.';
  if (state.dip.cap[t]) return 'Cílová země kapitulovala.';
  if (op.hostile && sameFaction(state, o, t)) return 'Spojenci proti sobě nešpehují.';
  const e = state.spy.own[o];
  if (e.ag - e.ops.length < 1) return 'Žádný volný agent.';
  if (e.ops.some((x) => x.k === k && x.t === t)) return 'Tato operace už probíhá.';
  if (state.pol.own[o].pp < op.cost) return `Chybí politická moc (${Math.ceil(op.cost - state.pol.own[o].pp)}).`;
  return null;
}

/** Zahájí operaci `k` proti `t`: zabere agenta, stojí politickou moc, trvá `days` dní. */
export function startOp(state, o, k, t) {
  if (opBlock(state, o, k, t)) return state;
  const e = state.spy.own[o], op = SPY_OPS[k];
  const id = e.n + 1;
  return setPp(put(state, o, { ...e, n: id, ops: [...e.ops, { id, k, t, left: op.days }] }), o, -op.cost);
}

/** Zruší operaci (agent se vrátí, politická moc ne). */
export function cancelOp(state, o, id) {
  if (!ok(o)) return state;
  const e = state.spy.own[o];
  if (!e.ops.some((x) => x.id === id)) return state;
  return put(state, o, { ...e, ops: e.ops.filter((x) => x.id !== id) });
}
