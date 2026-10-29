// AI: průmysl (M24). Používá stejné příkazy jako hráč: build, addLine, setLineFactories.
import { getWorld } from '../world.js';
import { DEFAULT_SPLIT } from '../../data/industry/index.js';
import { EQUIP } from '../../data/army/equipment.js';
import { hasWar } from '../army/war.js';
import { build, addLine, setLineFactories } from '../industry/commands.js';
import { industryOf, producibleEquip } from '../industry/selectors.js';
import { slotsOf, slotsUsed } from '../industry/core.js';
import { I } from '../industry/constants.js';
import { isUnlocked } from '../research/core.js';
import { AI } from './constants.js';

const WAR_SPLIT = { pusky: 0.4, dela: 0.2, auta: 0.15, podpora: 0.1, pdela: 0.06, ltanky: 0.05, vozy: 0.04 };

/** Stát země `o` s volným slotem (hlavní stát první, jinak nejvíc volných slotů); 0 = žádný. */
function freeState(state, o) {
  const w = getWorld();
  const cap = w.provState[w.owners[o].cap];
  let best = 0, bf = 0;
  for (let s = 1; s < w.states.length; s++) {
    if (state.stateOwner[s] !== o || state.ctrl[w.states[s].cap] !== o) continue;
    const free = slotsOf(state.ind, s) - slotsUsed(state.ind, s);
    if (free <= 0) continue;
    if (s === cap) return s;
    if (free > bf) { bf = free; best = s; }
  }
  return best;
}

/** Stát, ve kterém má smysl vylepšit infrastrukturu (hlavní stát, jinak největší vlastní). */
function infraState(state, o) {
  const w = getWorld();
  const cap = w.provState[w.owners[o].cap];
  const pending = (s) => state.ind.build.some((b) => b.s === s && b.k === 'inf') || (state.ind.inf[s] || 0) >= I.INF_MAX;
  if (state.stateOwner[cap] === o && !pending(cap)) return cap;
  let best = 0;
  for (let s = 1; s < w.states.length; s++) if (state.stateOwner[s] === o && !pending(s) && state.ctrl[w.states[s].cap] === o && (!best || w.states[s].p > w.states[best].p)) best = s;
  return best;
}

export function aiIndustry(state, o) {
  let sum = industryOf(state, o);
  const war = hasWar(state.mil, o);
  // stavby: jedna nová za den, dokud fronta není plná
  if (sum.build.length < AI.QUEUE && sum.civ + sum.mil > 0) {
    const queuedMil = sum.build.filter((b) => b.k === 'mil').length, queuedCiv = sum.build.filter((b) => b.k === 'civ').length;
    const milNow = sum.mil + queuedMil, total = sum.civ + sum.mil + queuedMil + queuedCiv;
    const share = war ? AI.MIL_SHARE_WAR : AI.MIL_SHARE;
    const kind = sum.civ + queuedCiv === 0 || milNow / Math.max(1, total) < share ? (sum.civ + queuedCiv === 0 ? 'civ' : 'mil') : 'civ';
    const s = freeState(state, o);
    const next = s ? build(state, s, kind) : (() => { const i = infraState(state, o); return i ? build(state, i, 'inf') : state; })();
    state = next;
    if (next !== state) sum = industryOf(state, o);
  }
  // linky: volné továrny dostanou výrobu podle nedostatku zásob
  sum = industryOf(state, o);
  let free = Math.min(10, sum.milFree);
  const split = war ? WAR_SPLIT : DEFAULT_SPLIT;
  while (free > 0) {
    const eqs = Object.keys(split).filter((e) => isUnlocked(state, o, EQUIP[e].unlock));
    const cur = industryOf(state, o);
    const tot = cur.lines.reduce((a, l) => a + l.fac, 0) + 1;
    let pick = '', pk = -Infinity;
    for (const e of eqs) {
      const have = cur.lines.filter((l) => l.eq === e).reduce((a, l) => a + l.fac, 0);
      const k = split[e] - have / tot;
      if (k > pk) { pk = k; pick = e; }
    }
    if (!pick) break;
    const line = cur.lines.find((l) => l.eq === pick && l.fac < I.LINE_MAX_FAC);
    const next = line ? setLineFactories(state, line.id, line.fac + 1) : addLine(state, o, pick, 1);
    if (next === state) break;
    state = next;
    free--;
  }
  void producibleEquip;
  return state;
}
