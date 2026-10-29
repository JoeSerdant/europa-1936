// AI: letectvo (M30). Používá stejné příkazy jako hráč: build (letiště), addLine / setLineFactories (letecké linky), formWing, setMission.
import { getWorld } from '../world.js';
import { PLANES, PLANE_IDS } from '../../data/air/planes.js';
import { isUnlocked } from '../research/core.js';
import { build, addLine, setLineFactories } from '../industry/commands.js';
import { industryOf } from '../industry/selectors.js';
import { slotsOf, slotsUsed } from '../industry/core.js';
import { I } from '../industry/constants.js';
import { hasWar, enemiesOf } from '../army/war.js';
import { formWing, setMission } from '../air/commands.js';
import { basesOf, afbOf, radarOf, stateKm } from '../air/core.js';
import { frontEdges } from '../army/selectors.js';
import { AIR } from '../air/constants.js';
import { AI } from './constants.js';

/** Stát země `o`, kde má smysl postavit letiště (už má letiště < max, nejvíc vítězných bodů). */
function baseState(state, o) {
  const w = getWorld();
  let best = 0, bk = -1;
  for (let s = 1; s < w.states.length; s++) {
    if (state.stateOwner[s] !== o || state.ctrl[w.states[s].cap] !== o) continue;
    const lvl = afbOf(state.ind, s);
    if (lvl >= AIR.BASE_MAX || state.ind.build.some((b) => b.s === s && b.k === 'afb')) continue;
    const vp = w.states[s].v.reduce((a, p) => a + w.vp[p], 0);
    const k = vp * 10 + (lvl ? 5 : 0) + w.states[s].p / 1000;
    if (k > bk) { bk = k; best = s; }
  }
  return best;
}

/** Stát země `o`, kde se hodí radar (M50): už má letiště a radar < 2, nejvíc vítězných bodů; 0 = žádný. */
function radarState(state, o) {
  const w = getWorld();
  let best = 0, bk = -1;
  for (let s = 1; s < w.states.length; s++) {
    if (state.stateOwner[s] !== o || state.ctrl[w.states[s].cap] !== o || !afbOf(state.ind, s) || radarOf(state.ind, s) >= 2) continue;
    if (state.ind.build.some((b) => b.s === s && b.k === 'radar')) continue;
    const k = w.states[s].v.reduce((a, p) => a + w.vp[p], 0) * 10 + afbOf(state.ind, s);
    if (k > bk) { bk = k; best = s; }
  }
  return best;
}

/** Stát s frontou (provincie hranicí s nepřítelem) nejbližší základně `from` a v doletu `range`; 0 = žádný. */
function frontState(state, o, from, range) {
  const w = getWorld(), foes = new Set(enemiesOf(state.mil, o));
  let best = 0, bk = Infinity;
  for (const k of frontEdges(state)) {
    const a = Math.floor(k / 4096), b = k % 4096;
    for (const [mine, theirs] of [[a, b], [b, a]]) {
      if (state.ctrl[mine] !== o || !foes.has(state.ctrl[theirs])) continue;
      const s = w.provState[mine], km = stateKm(from, s);
      if (km <= range && km < bk) { bk = km; best = s; }
    }
  }
  return best;
}

/** Nepřátelský stát v doletu s nejvíc továrnami (cíl bombardování); 0 = žádný. */
function bombTarget(state, o, from, range) {
  const w = getWorld(), foes = new Set(enemiesOf(state.mil, o));
  let best = 0, bk = -1;
  for (let s = 1; s < w.states.length; s++) {
    if (!foes.has(state.stateOwner[s]) || stateKm(from, s) > range) continue;
    const e = state.ind.st[s];
    const k = e.civ + e.mil * 1.5 + 0.01 * w.states[s].p;
    if (k > bk) { bk = k; best = s; }
  }
  return best;
}

export function aiAir(state, o) {
  const war = hasWar(state.mil, o);
  let sum = industryOf(state, o);
  const air = state.air;
  const have = {};
  for (const t of PLANE_IDS) have[t] = (air.pool[o][t] || 0);
  for (const wg of air.wings) if (wg && wg.o === o) have[wg.t] += wg.n;
  const total = PLANE_IDS.reduce((a, t) => a + have[t], 0);
  const bases = basesOf(state, o);
  const cap = bases.reduce((a, b) => a + b.cap, 0);
  // letiště: když kapacita nestačí na letadla v rezervě a ve výrobě
  const queued = sum.build.filter((b) => b.k === 'afb').length;
  if (total + 20 > cap && !queued && sum.build.length < AI.QUEUE && sum.civ > 0) {
    const s = baseState(state, o);
    if (s) state = build(state, s, 'afb');
  }
  // radar: ve válce nebo s aspoň 40 letadly, jeden po druhém
  if ((war || total >= 40) && !sum.build.some((b) => b.k === 'radar') && sum.build.length < AI.QUEUE && sum.civ > 0) {
    const s = radarState(state, o);
    if (s) state = build(state, s, 'radar');
  }
  // linky: podíl vojenských továren na letadla; po jedné továrně za den ubere největší pozemní lince
  sum = industryOf(state, o);
  const airFac = sum.lines.filter((l) => l.air).reduce((a, l) => a + l.fac, 0);
  const target = Math.floor(sum.mil * (war ? AI.AIR_SHARE_WAR : AI.AIR_SHARE) + 0.5);
  if (airFac < target && cap > total) {
    const want = PLANE_IDS.filter((t) => isUnlocked(state, o, PLANES[t].unlock)).sort((a, b) => {
      const k = (t) => (have[t] + 8 * sum.lines.filter((l) => l.eq === t).reduce((x, l) => x + l.fac, 0)) / (t === 'sti' ? 1.4 : t === 'str' ? 0.3 : 1);
      return k(a) - k(b);
    })[0];
    if (want) {
      if (sum.milFree < 1) {
        const big = sum.lines.filter((l) => !l.naval && !l.air).sort((a, b) => b.fac - a.fac)[0];
        if (big && big.fac > 1) state = setLineFactories(state, big.id, big.fac - 1);
      }
      const cur = industryOf(state, o);
      const line = cur.lines.find((l) => l.eq === want && l.fac < I.LINE_MAX_FAC);
      const next = cur.milFree > 0 ? (line ? setLineFactories(state, line.id, line.fac + 1) : addLine(state, o, want, 1)) : state;
      state = next;
    }
  }
  // křídla: rezerva se sestaví do křídel na letišti s největším volným místem
  for (const t of PLANE_IDS) {
    const n = state.air.pool[o][t] || 0;
    if (n < 12) continue;
    const b = basesOf(state, o).sort((x, y) => y.free - x.free)[0];
    if (b && b.free >= 12) state = formWing(state, o, t, Math.min(n, b.free, 120), b.s);
  }
  // mise: křídla bez mise (nebo s neplatným cílem) dostanou úkol
  for (const wg of state.air.wings) {
    if (!wg || wg.o !== o) continue;
    const range = PLANES[wg.t].range;
    if (wg.m) {
      // bombardování končí mírem; podpora a hlídky se přehodnotí, když fronta zmizí
      if (wg.m === 'bomb' && state.stateOwner[wg.to] && hasWar(state.mil, o)) continue;
      if (wg.m === 'cas' && war) continue;
    }
    let next = state;
    if (wg.t === 'sti') {
      const z = war ? frontState(state, o, wg.s, range) : 0;
      next = setMission(state, wg.id, 'air', z || wg.s);
    } else if (war && (wg.t === 'bit' || wg.t === 'tac')) {
      const z = frontState(state, o, wg.s, range);
      next = z ? setMission(state, wg.id, 'cas', z) : state;
      if (next === state && wg.t === 'tac') { const b = bombTarget(state, o, wg.s, range); if (b) next = setMission(state, wg.id, 'bomb', b); }
    } else if (war && wg.t === 'str') {
      const b = bombTarget(state, o, wg.s, range);
      if (b) next = setMission(state, wg.id, 'bomb', b);
    } else if (wg.m && !war) next = setMission(state, wg.id, null);
    state = next;
  }
  return state;
}
