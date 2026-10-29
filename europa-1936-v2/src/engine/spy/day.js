// Denní krok zpravodajství (M41): postup operací, vyhodnocení (šance podle přehledu, agentů a protišpionáže), účinky a ztráta přehledu. Náhoda jen hashem (`rand01`).
import { getWorld } from '../world.js';
import { SPY } from './constants.js';
import { SPY_OPS } from '../../data/spy/ops.js';
import { rand01 } from '../nat/core.js';
import { setRel } from '../dip/core.js';
import { applyFx } from '../nat/effects.js';
import { grantTech } from '../research/commands.js';
import { TECH_IDS } from '../../data/research/index.js';
import { logAdd } from '../log.js';

/** Šance operace země `o` proti `t`. */
export function chanceOf(state, o, t) {
  const e = state.spy.own[o], c = state.spy.own[t];
  const intel = e.intel[t] || 0;
  const p = SPY.BASE + SPY.INTEL_BONUS * intel + SPY.AGENT_BONUS * Math.min(5, e.ag - 1) - SPY.COUNTER * Math.min(8, c.ag);
  return Math.max(SPY.MIN, Math.min(SPY.MAX, p));
}

const doneTechs = (state, o) => TECH_IDS.filter((id) => state.tech.own[o].done[id]).length;

function resolve(state, o, op) {
  const w = getWorld(), player = state.player ? w.ownerIdx[state.player] : 0;
  const win = rand01(state.tick, o, `spy${op.id}`) < chanceOf(state, o, op.t);
  let s = state;
  const log = (k, x) => { if (o === player || op.t === player) s = logAdd(s, { k, o, x: op.t, y: op.k, z: x }); };
  const e = s.spy.own[o];
  let own = { ...e, ops: e.ops.filter((x) => x.id !== op.id) };
  if (win) {
    if (op.k === 'recon') own = { ...own, intel: { ...own.intel, [op.t]: Math.min(1, (own.intel[op.t] || 0) + SPY.INTEL_GAIN) } };
    else if (op.k === 'sabotage') {
      const stock = s.mil.stock.slice(), cur = stock[op.t] || {};
      const ns = {};
      for (const k in cur) ns[k] = Math.floor(cur[k] * (1 - SPY.SABOTAGE));
      stock[op.t] = ns;
      s = { ...s, mil: { ...s.mil, stock } };
    } else if (op.k === 'steal') {
      const ahead = doneTechs(s, op.t) > doneTechs(s, o);
      s = applyFx(s, o, [{ t: 'boostslot', v: ahead ? SPY.STEAL_BEHIND : SPY.STEAL }]);
    } else if (op.k === 'unrest') s = applyFx(s, op.t, [{ t: 'stab', v: -SPY.UNREST_STAB }, { t: 'ws', v: -SPY.UNREST_WS }]);
    log('spy', 1);
  } else {
    const caught = rand01(state.tick, o, `caught${op.id}`) < SPY.CAUGHT;
    if (caught) {
      own = { ...own, ag: Math.max(1, own.ag - 1) };
      s = { ...s, dip: { ...s.dip, rel: setRel(s.dip.rel, o, op.t, SPY.REL_CAUGHT) } };
    }
    log('spy', caught ? 2 : 0);
  }
  const arr = s.spy.own.slice(); arr[o] = own;
  return { ...s, spy: { ...s.spy, ver: s.spy.ver + 1, own: arr } };
}

export function spyDay(state) {
  const n = state.spy.own.length;
  let s = state;
  for (let o = 1; o < n; o++) {
    const e = s.spy.own[o];
    const hasIntel = Object.keys(e.intel).length > 0;
    if (!e.ops.length && !hasIntel) continue;
    // postup operací
    const ops = e.ops.map((x) => ({ ...x, left: x.left - 1 }));
    const due = ops.filter((x) => x.left <= 0), keep = ops.filter((x) => x.left > 0);
    const intel = {};
    for (const t in e.intel) { const v = Math.round((e.intel[t] - SPY.INTEL_DECAY) * 10000) / 10000; if (v > 0) intel[t] = v; }
    const arr = s.spy.own.slice();
    arr[o] = { ...e, ops: keep, intel };
    s = { ...s, spy: { ...s.spy, ver: s.spy.ver + 1, own: arr } };
    for (const op of due) {
      // operace se při vyhodnocení bere ze stavu s původním seznamem (kvůli odebrání)
      const cur = s.spy.own[o];
      s = resolve({ ...s, spy: { ...s.spy, own: s.spy.own.map((x, i) => (i === o ? { ...cur, ops: [...cur.ops, op] } : x)) } }, o, op);
    }
  }
  void grantTech;
  return s;
}
