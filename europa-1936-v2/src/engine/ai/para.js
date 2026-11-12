// AI: výsadky (M87). Velmoc s technologií Výsadkové vojsko si založí výsadkovou šablonu, vycvičí pár výsadkových divizí (zůstávají mimo armády
// u letiště) a ve válce je shazuje na nehájené cenné provincie těsně za frontou (druhá linie: město, uzel, přístav, hlavní město).
// Používá stejné příkazy jako hráč: `createTemplate`, `recruit`, `orderDrop`.
import { getWorld } from '../world.js';
import { COUNTRIES } from '../../data/countries.js';
import { geo, adjacency } from '../army/geo.js';
import { hasWar, enemiesOf } from '../army/war.js';
import { createTemplate, recruit } from '../army/commands.js';
import { deriveStats } from '../army/stats.js';
import { isDone } from '../research/core.js';
import { afbOf } from '../air/core.js';
import { orderDrop, dropBlock } from '../air/para.js';
import { AIR } from '../air/constants.js';
import { AI } from './constants.js';

const PARA_TPL = { nm: 'Výsadková divize', reg: [['vysad', 'vysad', 'vysad']], sup: [] };

/** Id výsadkové šablony země (první šablona, jejíž divize umí výsadek), nebo 0. */
export function paraTemplate(state, o) {
  const tpl = state.mil.tpl;
  for (let id = 1; id < tpl.length; id++) if (tpl[id] && tpl[id].o === o && deriveStats(tpl[id]).para) return id;
  return 0;
}

/** Provincie země ve státě s letištěm (hlavní město, je-li tam letiště, jinak první taková), nebo 0. */
function airfieldProv(state, o) {
  const w = getWorld(), cap = w.owners[o].cap;
  const ok = (p) => state.ctrl[p] === o && state.stateOwner[w.provState[p]] === o && afbOf(state.ind, w.provState[p]) > 0;
  if (ok(cap)) return cap;
  for (let s = 1; s < w.states.length; s++) if (state.stateOwner[s] === o && afbOf(state.ind, s) > 0 && state.ctrl[w.states[s].cap] === o) return w.states[s].cap;
  return 0;
}

/** Nejlepší cíl výsadku z provincie `from`: nehájená nepřátelská provincie v dosahu ve druhé linii za frontou; 0 = žádný stojí za to. */
export function dropTarget(state, o, from) {
  const w = getWorld(), g = geo(w), adj = adjacency(w), ctrl = state.ctrl;
  const foes = new Set(enemiesOf(state.mil, o));
  if (!foes.size) return 0;
  const held = new Set();
  for (const d of state.mil.divs) if (d && foes.has(d.o)) held.add(d.p);
  let best = 0, bk = AI.PARA_MIN_SCORE - 1e-9;
  for (let p = 1; p <= w.L; p++) {
    if (!foes.has(ctrl[p]) || held.has(p) || g.distKm(from, p) > AIR.DROP_KM) continue;
    if (adj[p].some((e) => e.kind !== 2 && ctrl[e.to] === o)) continue;                                   // první linie: tam dojde pěchota sama
    if (!adj[p].some((e) => e.kind !== 2 && foes.has(ctrl[e.to]) && adj[e.to].some((x) => x.kind !== 2 && ctrl[x.to] === o))) continue;   // jen druhá linie
    const k = w.vp[p] + (g.hub[p] ? 2 : 0) + (w.portLevel[p] ? 1 : 0) + (p === w.owners[ctrl[p]].cap ? 8 : 0);
    if (k > bk || (k === bk && p < best)) { bk = k; best = p; }
  }
  return best;
}

/** Každé tři dny: šablona, výcvik a výsadek výsadkových divizí velmoci. */
export function aiPara(state, o) {
  if (state.tick % (24 * 3) !== 0 || !state.air) return state;
  const tag = getWorld().owners[o].tag;
  if ((COUNTRIES[tag]?.tier ?? 3) !== 1 || !isDone(state, o, 'vysadek')) return state;
  const tplId = paraTemplate(state, o);
  if (!tplId) return createTemplate(state, tag, PARA_TPL);
  const mil = state.mil, war = hasWar(mil, o);
  const mine = [];
  for (let id = 1; id < mil.divs.length; id++) { const d = mil.divs[id]; if (d && d.o === o && d.tpl === tplId) mine.push(id); }
  const queued = mil.queue.reduce((a, q) => a + (q.o === o && q.tpl === tplId ? 1 : 0), 0);
  const flying = state.air.drops.reduce((a, x) => a + (x.o === o ? 1 : 0), 0);
  if (mine.length + queued + flying < AI.PARA_DIVS && (war || state.tick / 24 >= AI.PARA_FROM_DAY)) {
    const site = airfieldProv(state, o);
    const next = site ? recruit(state, tplId, site, 1) : state;
    if (next !== state) return next;
  }
  if (!war) return state;
  for (const id of mine) {
    const d = mil.divs[id];
    if (d.b || d.path.length) continue;
    const target = dropTarget(state, o, d.p);
    if (target && !dropBlock(state, [id], target)) return orderDrop(state, [id], target);
  }
  return state;
}
