// AI: zpravodajství (M41). Stejné příkazy jako hráč (hireAgent, startOp). Jednou za pět dní; operace proti nepřátelům, jinak průzkum.
// M89: velmoci a regionální mocnosti navíc podporují spřízněnou stranu u sousedů (operace `subvert`), kde má šanci na vládu.
import { getWorld } from '../world.js';
import { hasWar, enemiesOf } from '../army/war.js';
import { adjacency } from '../army/geo.js';
import { hireAgent, startOp, agentsOf, opBlock } from '../spy/commands.js';
import { rand01 } from '../nat/core.js';
import { relOf, sameFaction } from '../dip/core.js';
import { ideologyOf } from '../politics/parties.js';
import { COUNTRIES } from '../../data/countries.js';
import { SPY_OPS } from '../../data/spy/ops.js';
import { AI } from './constants.js';

const tierOf = (o) => COUNTRIES[getWorld().owners[o].tag]?.tier ?? 3;

const nearCache = new WeakMap();   // pole `ctrl` → Map(země → Set sousedů po souši)
/** Země, se kterými `o` sousedí po souši (podle kontroly provincií). */
export function landNeighbors(state, o) {
  let m = nearCache.get(state.ctrl);
  if (!m) { m = new Map(); nearCache.set(state.ctrl, m); }
  let set = m.get(o);
  if (set) return set;
  const w = getWorld(), adj = adjacency(w);
  set = new Set();
  for (let p = 1; p <= w.L; p++) {
    if (state.ctrl[p] !== o) continue;
    for (const e of adj[p]) { const c = state.ctrl[e.to]; if (e.kind !== 2 && c && c !== o) set.add(c); }
  }
  m.set(o, set);
  return set;
}

/**
 * Cíl operace „Podpora cizí strany“ (M89): soused, který není velmoc, loutka ani spojenec, vládne v něm jiná ideologie a strana s ideologií země `o`
 * tam má aspoň `AI.SUBVERT_MIN` % – čím je blíž k vládě a čím je vláda vratší, tím lépe. Nezúčastněné vlády ideologii nevyvážejí. Vrací index země nebo 0.
 */
export function subvertTarget(state, o) {
  const mine = ideologyOf(state, o);
  if (mine === 'neutrality' || tierOf(o) > AI.SUBVERT_TIER) return 0;
  let best = 0, bs = -Infinity;
  for (const t of [...landNeighbors(state, o)].sort((a, b) => a - b)) {
    const own = state.pol.own[t];
    if (!own || !own.par || state.dip.cap[t] || state.dip.sub[t] || tierOf(t) === 1 || sameFaction(state, o, t)) continue;
    if (own.gov === mine || own.par[mine] < AI.SUBVERT_MIN) continue;
    const score = own.par[mine] - (own.par[own.gov] - own.par[mine]) * AI.SUBVERT_GAP + (1 - own.stab) * AI.SUBVERT_STAB;
    if (score > bs) { bs = score; best = t; }
  }
  return best;
}

export function aiSpy(state, o) {
  if (state.tick % (24 * 5) !== 0) return state;
  if (state.pol.own[o].pp > 120) state = hireAgent(state, o);
  if (agentsOf(state, o).free < 1) return state;
  const w = getWorld();
  // M89: podpora spřízněné strany u souseda – jedna operace najednou, s rezervou politické moci; bez přehledu o cíli nejdřív průzkum
  const ops = state.spy.own[o].ops;
  if (!ops.some((x) => x.k === 'subvert') && state.pol.own[o].pp >= SPY_OPS.subvert.cost + AI.SUBVERT_PP) {
    const t = subvertTarget(state, o);
    if (t) {
      const k = (state.spy.own[o].intel[t] || 0) < AI.SUBVERT_INTEL ? 'recon' : 'subvert';
      if (!opBlock(state, o, k, t)) return startOp(state, o, k, t);
    }
  }
  const foes = hasWar(state.mil, o) ? enemiesOf(state.mil, o) : [];
  let target = foes.find((e) => !state.dip.cap[e]);
  if (!target) {
    // nepřátelsky naladěná země (vztah pod −40), jinak nikdo
    for (let t = 1; t < w.owners.length; t++) if (t !== o && !state.dip.cap[t] && relOf(state, o, t) < -40) { target = t; break; }
  }
  if (!target) return state;
  const intel = state.spy.own[o].intel[target] || 0;
  const kinds = intel < 0.3 ? ['recon'] : ['sabotage', 'unrest', 'steal'];
  const k = kinds[Math.floor(rand01(state.tick, o, 'spyk') * kinds.length)];
  return opBlock(state, o, k, target) ? state : startOp(state, o, k, target);
}
