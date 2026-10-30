// AI: průmysl (M24). Používá stejné příkazy jako hráč: build, addLine, setLineFactories.
import { getWorld } from '../world.js';
import { DEFAULT_SPLIT, EQUIP_PROD } from '../../data/industry/index.js';
import { deriveStats } from '../army/stats.js';
import { desiredMix, tplOfKind, targetDivs } from './army.js';
import { EQUIP } from '../../data/army/equipment.js';
import { hasWar } from '../army/war.js';
import { build, addLine, setLineFactories } from '../industry/commands.js';
import { industryOf, producibleEquip } from '../industry/selectors.js';
import { slotsOf, slotsUsed } from '../industry/core.js';
import { I } from '../industry/constants.js';
import { isUnlocked } from '../research/core.js';
import { AI } from './constants.js';

const WAR_SPLIT = { pusky: 0.4, dela: 0.2, auta: 0.15, podpora: 0.1, pdela: 0.06, ltanky: 0.05, vozy: 0.04 };

/**
 * Rozdělení výroby podle potřeby (M65): výrobní body na výzbroj úměrné tomu, kolik jí žádané složení armády potřebuje na jednu divizi (kusy × cena),
 * aby se divize dokončovaly vyváženě; druh, kterého je ve skladu dost, dostane míň, druh, kterého je málo, víc. Vrací { výzbroj → podíl } (součet 1).
 */
export function demandSplit(state, o, war) {
  const mix = desiredMix(state, o), kinds = tplOfKind(state, o), lv = state.mil.lv[o] || null;
  const need = {};
  for (const k in mix) {
    const t = kinds[k] && state.mil.tpl[kinds[k]];
    if (!t) continue;
    const st = deriveStats(t, lv);
    for (const e in st.need) need[e] = (need[e] || 0) + mix[k] * st.need[e];
  }
  const base = war ? WAR_SPLIT : DEFAULT_SPLIT;
  const stock = state.mil.stock[o] || {};
  const w = {};
  let sum = 0;
  for (const e in need) {
    const cost = EQUIP_PROD[e] ? EQUIP_PROD[e].cost : 1;
    const cover = (stock[e] || 0) / (need[e] * AI.STOCK_DIVS);
    const f = cover > 2 ? 0.25 : cover > 1 ? 0.6 : cover < 0.3 ? 1.6 : 1;
    w[e] = need[e] * cost * f;
    sum += w[e];
  }
  const out = {};
  const bs = Object.values(base).reduce((a, b) => a + b, 0) || 1;
  for (const e in base) out[e] = (1 - AI.DEMAND_BLEND) * base[e] / bs;
  if (sum > 0) for (const e in w) out[e] = (out[e] || 0) + AI.DEMAND_BLEND * w[e] / sum;
  return out;
}

/** Tlak zbrojení 0–1: jak daleko je armáda od cílového počtu divizí (mezera / max(5, 30 % cíle)). */
export function armyPressure(state, o) {
  let n = 0;
  for (let i = 1; i < state.mil.divs.length; i++) { const d = state.mil.divs[i]; if (d && d.o === o) n++; }
  const t = targetDivs(state, o);
  return Math.max(0, Math.min(1, (t - n - state.mil.queue.filter((q) => q.o === o).length) / Math.max(5, t * 0.3)));
}

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
    const share = (war ? AI.MIL_SHARE_WAR : AI.MIL_SHARE) + AI.MIL_PRESSURE * armyPressure(state, o);   // zbrojení: s mezerou k cílovému počtu divizí roste podíl vojenských továren
    const kind = sum.civ + queuedCiv === 0 || milNow / Math.max(1, total) < share ? (sum.civ + queuedCiv === 0 ? 'civ' : 'mil') : 'civ';
    const s = freeState(state, o);
    const next = s ? build(state, s, kind) : (() => { const i = infraState(state, o); return i ? build(state, i, 'inf') : state; })();
    state = next;
    if (next !== state) sum = industryOf(state, o);
  }
  // linky: volné továrny dostanou výrobu podle nedostatku zásob
  sum = industryOf(state, o);
  let free = Math.min(10, sum.milFree);
  const split = demandSplit(state, o, war);
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
