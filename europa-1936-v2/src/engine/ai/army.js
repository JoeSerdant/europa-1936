// AI: armáda (M24). Používá stejné příkazy jako hráč: recruit, createArmy, assignDivisions, assignCommander, setPlan.
import { getWorld } from '../world.js';
import { NATIONAL } from '../../data/army/national.js';
import { C as ARMY } from '../army/constants.js';
import { hasWar, enemiesOf, nearestControlled } from '../army/war.js';
import { recruit, createArmy, assignDivisions, assignCommander, setPlan } from '../army/commands.js';
import { suggestFront, generalsOf, divisionCount } from '../army/selectors.js';
import { campOf } from '../dip/core.js';
import { AI } from './constants.js';

/** Jednou za den projde divize a vrátí po zemích: počty šablon, volné divize a velikosti armád. */
export function scanArmies(state) {
  const n = state.mil.stock.length;
  const out = Array.from({ length: n }, () => ({ tpl: new Map(), loose: [], armies: new Map(), count: 0 }));
  const divs = state.mil.divs;
  for (let id = 1; id < divs.length; id++) {
    const d = divs[id];
    if (!d) continue;
    const e = out[d.o];
    e.count++;
    e.tpl.set(d.tpl, (e.tpl.get(d.tpl) || 0) + 1);
    if (d.army) e.armies.set(d.army, (e.armies.get(d.army) || 0) + 1); else e.loose.push(id);
  }
  const armies = state.mil.armies;
  for (let id = 1; id < armies.length; id++) { const a = armies[id]; if (a && !out[a.o].armies.has(id)) out[a.o].armies.set(id, 0); }
  return out;
}

const initialDivs = (tag) => Object.values(NATIONAL[tag]?.divs || {}).reduce((a, b) => a + b, 0);

/** Cílový počet divizí země v daném čase. */
export function targetDivs(state, o) {
  const tag = getWorld().owners[o].tag;
  const years = state.tick / 8766;
  const war = hasWar(state.mil, o) ? AI.WAR_MULT : 1;
  return Math.round(initialDivs(tag) * (1 + AI.BASE_BONUS + AI.GROWTH_YEAR * years) * war * (AI.LEVEL_MULT[state.ai?.level ?? 2] || 1));
}

function recruitSite(state, o) {
  const w = getWorld();
  const cap = w.owners[o].cap;
  if (state.ctrl[cap] === o) return cap;
  return nearestControlled(state.ctrl, o, cap);
}

export function aiArmy(state, o, scan) {
  const w = getWorld(), tag = w.owners[o].tag;
  const war = hasWar(state.mil, o);
  const sc = scan[o];
  // výcvik nových divizí
  const queued = state.mil.queue.reduce((a, q) => a + (q.o === o ? 1 : 0), 0);
  if (sc.count && queued < AI.TRAIN_MAX && sc.count + queued < targetDivs(state, o)) {
    let best = 0, bn = 0;
    for (const [t, n] of sc.tpl) if (n > bn || (n === bn && t < best)) { best = t; bn = n; }
    const site = recruitSite(state, o);
    if (best && site) {
      for (let n = Math.min(war ? AI.RECRUIT_BATCH_WAR : AI.RECRUIT_BATCH, AI.TRAIN_MAX - queued); n >= 1; n--) {
        const next = recruit(state, best, site, n);
        if (next !== state) { state = next; break; }
      }
    }
  }
  // nové divize do armád
  if (sc.loose.length) {
    for (const id of sc.loose) {
      const d = state.mil.divs[id];
      if (!d || d.army) continue;
      let target = 0, size = Infinity;
      for (const [aid, n] of sc.armies) {
        const a = state.mil.armies[aid];
        if (a && a.o === o && n < AI.ARMY_SIZE && n < ARMY.ARMY_CAP && n < size) { size = n; target = aid; }
      }
      if (target) {
        const next = assignDivisions(state, target, [id]);
        if (next !== state) { state = next; sc.armies.set(target, (sc.armies.get(target) || 0) + 1); continue; }
      }
      const newId = state.mil.armies.length;
      const made = createArmy(state, tag, `${sc.armies.size + 1}. armáda`, [id]);
      if (made === state) continue;
      state = made;
      sc.armies.set(newId, 1);
      const gen = generalsOf(state, o).find((g) => !g.post && g.gen.r === 'G');
      if (gen) state = assignCommander(state, 'army', newId, gen.id);
    }
  }
  return state;
}

/** Týdně: armády ve válce dostanou útočný plán, je-li poměr sil příznivý. */
export function aiOffense(state, o) {
  if (!hasWar(state.mil, o)) return state;
  const enemies = enemiesOf(state.mil, o);
  if (!enemies.length) return state;
  const mine = campOf(state, o).reduce((a, m) => a + divisionCount(state, m), 0);
  const theirs = enemies.reduce((a, e) => a + divisionCount(state, e), 0);
  if (theirs > 0 && mine / theirs < (AI.ATTACK_RATIO[state.ai?.level ?? 2] ?? 0.7)) return state;
  for (let id = 1; id < state.mil.armies.length; id++) {
    const a = state.mil.armies[id];
    if (!a || a.o !== o) continue;
    if (a.plan && a.plan.k === 'front' && a.plan.to.length > 0) continue;
    const sf = suggestFront(state, id);
    if (!sf.to.length) continue;
    state = setPlan(state, id, { k: 'front', line: sf.line, to: sf.to, mode: theirs > 0 && mine / theirs >= AI.RUSH_RATIO ? 'rush' : 'balanced' });
  }
  return state;
}
