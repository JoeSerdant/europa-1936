// AI: armáda (M24). Používá stejné příkazy jako hráč: recruit, createArmy, assignDivisions, assignCommander, setPlan.
import { getWorld } from '../world.js';
import { NATIONAL } from '../../data/army/national.js';
import { TPL_KINDS, TPL_KIND_IDS } from '../../data/army/templates.js';
import { COUNTRIES } from '../../data/countries.js';
import { rearmFactor, DYN_DIVS } from '../../data/ai/rearm.js';
import { countryStats } from '../selectors.js';
import { deriveStats } from '../army/stats.js';
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

const divsOf = (tag) => NATIONAL[tag]?.divs || DYN_DIVS[tag] || {};
const initialDivs = (tag) => Object.values(divsOf(tag)).reduce((a, b) => a + b, 0);

const basePop = new WeakMap();   // svět → počet obyvatel zemí podle počátečního vlastnictví
function startPop(o) {
  const w = getWorld();
  let m = basePop.get(w);
  if (!m) {
    m = new Float64Array(w.owners.length);
    for (let p = 1; p <= w.L; p++) m[w.provOwner0[p]] += w.pop[p];
    basePop.set(w, m);
  }
  return m[o] || 0;
}

/** Násobek velikosti armády podle změny území: zemi, která vzrostla (nebo zmenšila), se cílový počet divizí upraví (0,35–2,5). */
export function sizeFactor(state, o) {
  const tag = getWorld().owners[o].tag, st = countryStats(state, tag), p0 = startPop(o);
  if (!st || !p0) return 1;
  return Math.min(2.5, Math.max(0.35, Math.pow(st.pop / p0, 0.75)));
}

/** Cílový počet divizí země v daném čase: historická křivka zbrojení × změna velikosti země × válka × obtížnost. */
export function targetDivs(state, o) {
  const tag = getWorld().owners[o].tag;
  const war = hasWar(state.mil, o) ? AI.WAR_MULT : 1;
  return Math.round(initialDivs(tag) * (AI.BASE_BONUS + rearmFactor(tag, state.tick / 24)) * sizeFactor(state, o) * war * (AI.LEVEL_MULT[state.ai?.level ?? 2] || 1));
}

/** Žádané složení armády podle druhů šablon (podíly, součet 1): výchozí sestava země, velmoci a regionální mocnosti se postupně motorizují. */
export function desiredMix(state, o) {
  const tag = getWorld().owners[o].tag;
  const base = divsOf(tag);
  const total = Object.values(base).reduce((a, b) => a + b, 0) || 1;
  const mix = {};
  for (const k in base) mix[k] = base[k] / total;
  const tier = COUNTRIES[tag]?.tier ?? 3;
  if (tier <= 2 && mix.pesi) {
    const shift = Math.min(mix.pesi * 0.5, AI.MOTOR_SHIFT * Math.min(1, state.tick / 24 / AI.MOTOR_DAYS));
    if (mix.tank || tag === 'GER' || tag === 'SOV' || tag === 'FRA' || tag === 'ENG') { mix.pesi -= shift; mix.tank = (mix.tank || 0) + shift * 0.6; mix.motor = (mix.motor || 0) + shift * 0.4; }
  }
  return mix;
}

/** Druh šablony → id šablony země (nebo 0, když ji země nemá). */
export function tplOfKind(state, o) {
  const out = {};
  for (let id = 1; id < state.mil.tpl.length; id++) {
    const t = state.mil.tpl[id];
    if (!t || t.o !== o) continue;
    const k = TPL_KIND_IDS.find((x) => TPL_KINDS[x].short === t.short);
    if (k && !out[k]) out[k] = id;
  }
  return out;
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
  // výcvik nových divizí: šablona s největším schodkem proti žádanému složení, které země zvládne vyzbrojit a obsadit
  const queued = state.mil.queue.reduce((a, q) => a + (q.o === o ? 1 : 0), 0);
  const target = targetDivs(state, o);
  const trainMax = Math.max(AI.TRAIN_MAX, Math.ceil(target / AI.TRAIN_DIV));
  if (sc.count && queued < trainMax && sc.count + queued < target) {
    const site = recruitSite(state, o);
    if (site) {
      const kinds = tplOfKind(state, o), mix = desiredMix(state, o);
      const have = {};
      for (const [t, n] of sc.tpl) { const k = Object.keys(kinds).find((x) => kinds[x] === t); if (k) have[k] = (have[k] || 0) + n; }
      const order = Object.keys(kinds).sort((a, b) => ((mix[b] || 0) - (have[b] || 0) / sc.count) - ((mix[a] || 0) - (have[a] || 0) / sc.count) || (a < b ? -1 : 1));
      const gap = target - sc.count - queued;
      const batch = Math.min(war ? AI.RECRUIT_BATCH_WAR : AI.RECRUIT_BATCH + (gap > 8 ? 1 : 0), trainMax - queued);
      let done = false;
      for (const k of order) {
        for (let n = batch; n >= 1 && !done; n--) {
          const next = recruit(state, kinds[k], site, n);
          if (next !== state) { state = next; done = true; }
        }
        if (done) break;
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
