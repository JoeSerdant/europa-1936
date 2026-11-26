// AI: mechaniky HOI4 z F4c – miny a odminování, úder na lodě a stíhání bombardérů, strategický přesun vlakem a stavby námořních základen,
// pobřežních pevností a zásobovacích uzlů. Stejné příkazy jako hráč (`setFleetMission`, `orderFleet`, `setMission`, `orderRail`, `build`, `buildFort`),
// rozhodnutí podle řazení, bez `state.rng`. Čísla v `AI.F4C_*`.
import { getWorld } from '../world.js';
import { NAVY_NATIONAL } from '../../data/navy/index.js';
import { PLANES } from '../../data/air/planes.js';
import { BUILDINGS } from '../../data/industry/buildings.js';
import { hasWar, atWar, enemiesOf } from '../army/war.js';
import { orderFleet, setFleetMission } from '../nav/commands.js';
import { coastStatesOf, enemyMines, homeSeas, powerOf } from '../nav/core.js';
import { setMission } from '../air/commands.js';
import { stateKm, seasOfState } from '../air/core.js';
import { orderRail, railBlock } from '../army/commands.js';
import { build, buildFort, hasRail, provLevel } from '../industry/commands.js';
import { buildRoom, fortRoom } from '../industry/selectors.js';
import { reservedFleets } from './invasion.js';
import { AI } from './constants.js';

/** Nečinné bojové flotily země (bez mise, nestojí na cestě, nejsou krytím invaze), vzestupně. */
function idleFleets(state, o) {
  const held = reservedFleets(state, o), out = [];
  for (let i = 1; i < state.nav.fleets.length; i++) {
    const f = state.nav.fleets[i];
    if (f && f.o === o && !f.path.length && !f.m && !held.has(i) && powerOf(f.ships).atk > 0) out.push(i);
  }
  return out;
}

/** Miny (za války): torpédoborce odminují vlastní domovská moře s nepřátelskými minami; jinak jedna nečinná flotila s torpédoborci nebo ponorkami klade miny v domovském moři u nepřátelského pobřeží. */
export function aiMines(state, o) {
  if (!state.nav || !hasWar(state.mil, o)) return state;
  const homes = [...homeSeas(state, o)].sort((a, b) => a - b);
  const idle = idleFleets(state, o);
  const dirty = homes.find((l) => enemyMines(state, o, l) >= AI.F4C_SWEEP_MIN);
  if (dirty) {
    const i = idle.find((k) => (state.nav.fleets[k].ships.dd || 0) > 0);
    if (i) return setFleetMission(state.nav.fleets[i].p === dirty ? state : orderFleet(state, i, dirty), i, 'sweep');
  }
  if (state.nav.fleets.some((f) => f && f.o === o && f.m === 'mine')) return state;
  const foes = new Set(enemiesOf(state.mil, o));
  const sea = homes.find((l) => coastStatesOf(l).some((s) => foes.has(state.stateOwner[s])));
  if (!sea) return state;
  const i = idle.slice(1).find((k) => (state.nav.fleets[k].ships.dd || 0) + (state.nav.fleets[k].ships.ss || 0) >= AI.F4C_MINE_SHIPS);   // první (hlavní) flotila zůstane volná
  if (!i) return state;
  return setFleetMission(state.nav.fleets[i].p === sea ? state : orderFleet(state, i, sea), i, 'mine');
}

/** Vlastní pobřežní stát v doletu z `base`, u jehož moře stojí nepřátelská flotila (cíl úderu na lodě); 0 = žádný. */
export function navStrikeTarget(state, o, base, range) {
  let best = 0, bk = Infinity;
  for (const f of state.nav.fleets) {
    if (!f || !atWar(state.mil, o, f.o) || !powerOf(f.ships).atk) continue;
    for (const s of coastStatesOf(f.p)) {
      if (state.stateOwner[s] !== o) continue;
      const km = stateKm(base, s);
      if (km <= range && km < bk) { bk = km; best = s; }
    }
  }
  return best;
}

/** Vlastní stát, nad kterým nepřítel létá údernou misi (cíl stíhání), nejbližší k základně `base` v doletu; 0 = žádný. */
export function interceptTarget(state, o, base, range) {
  let best = 0, bk = Infinity;
  for (const wg of state.air.wings) {
    if (!wg || !atWar(state.mil, o, wg.o) || !(wg.m === 'cas' || wg.m === 'bomb' || wg.m === 'nav') || state.stateOwner[wg.to] !== o) continue;
    const km = stateKm(base, wg.to);
    if (km <= range && km < bk) { bk = km; best = wg.to; }
  }
  return best;
}

/** Letectvo (za války): každé `AI.F4C_NAV_EVERY`-té úderné křídlo útočí na nepřátelské flotily u vlastního pobřeží, každé druhé stíhací křídlo stíhá bombardéry nad vlastním územím. */
export function aiAirMissions(state, o) {
  if (!hasWar(state.mil, o)) return state;
  let k = 0;
  for (const wg of state.air.wings) {
    if (!wg || wg.o !== o) continue;
    const range = PLANES[wg.t].range;
    if (wg.m === 'nav' && !navStrikeTarget(state, o, wg.s, range)) { state = setMission(state, wg.id, null); continue; }   // cíl odplul – křídlo se vrátí k běžným misím
    if (wg.m === 'int' && !interceptTarget(state, o, wg.s, range)) { state = setMission(state, wg.id, null); continue; }
    const ns = PLANES[wg.t].roles.includes('nav') && wg.m !== 'nav' ? navStrikeTarget(state, o, wg.s, range) : 0;
    if (ns && seasOfState(ns).length) {
      if ((k++ % AI.F4C_NAV_EVERY) === 0) state = setMission(state, wg.id, 'nav', ns);   // každé tolikáté křídlo s cílem v doletu
    } else if (PLANES[wg.t].roles.includes('int') && wg.m !== 'int' && wg.id % 2 === 0) {
      const s = interceptTarget(state, o, wg.s, range);
      if (s) state = setMission(state, wg.id, 'int', s);
    }
  }
  return state;
}

/** Strategický přesun: divize s dlouhou cestou jen vlastním územím (aspoň `AI.F4C_RAIL_STEPS` provincií) jedou vlakem. */
export function aiRail(state, o) {
  const divs = state.mil.divs;
  for (let id = 1; id < divs.length; id++) {
    const d = divs[id];
    if (!d || d.o !== o || d.rd || d.b || d.path.length < AI.F4C_RAIL_STEPS) continue;
    const to = d.path[d.path.length - 1];
    if (d.path.some((p) => state.ctrl[p] !== o) || railBlock(state, id, to)) continue;
    state = orderRail(state, [id], to);
  }
  return state;
}

/** Stavby (týdně): námořní základna u námořních mocností, za války pobřežní pevnosti v cenných přístavech a zásobovací uzel tam, kde divizím chybí zásoby. */
export function aiBuildsF4c(state, o) {
  const w = getWorld();
  if (state.ind.build.filter((b) => b.o === o).length >= AI.QUEUE) return state;
  // námořní základna: v nejlepším přístavním státě do úrovně AI.F4C_NB
  if (NAVY_NATIONAL[w.owners[o].tag] && state.nav.fleets.some((f) => f && f.o === o)) {
    let best = 0, bk = -1;
    for (let s = 1; s < w.states.length; s++) {
      if (state.stateOwner[s] !== o) continue;
      const lvl = w.states[s].v.reduce((a, p) => Math.max(a, w.portLevel[p] || 0), 0);
      if (lvl && lvl > bk) { bk = lvl; best = s; }
    }
    if (best && ((state.ind.st[best] && state.ind.st[best].nb) || 0) < AI.F4C_NB && buildRoom(state, best, 'nb', o).n && !state.ind.build.some((b) => b.o === o && b.k === 'nb')) return build(state, best, 'nb');
  }
  if (!hasWar(state.mil, o)) return state;
  // pobřežní pevnost: nepřítel má flotilu; přístav s vítěznými body (nejcennější první) do úrovně AI.F4C_CFORT
  const foes = enemiesOf(state.mil, o);
  if (!state.ind.build.some((b) => b.o === o && b.k === 'cfort') && state.nav.fleets.some((f) => f && foes.includes(f.o) && powerOf(f.ships).atk)) {
    let best = 0, bv = 0;
    for (let p = 1; p <= w.L; p++) if (w.portLevel[p] && w.vp[p] >= AI.F4C_CFORT_VP && state.ctrl[p] === o && provLevel(state.ind, p, 'cfort') < AI.F4C_CFORT && fortRoom(state, p, o, 'cfort').n && w.vp[p] > bv) { bv = w.vp[p]; best = p; }
    if (best) return buildFort(state, best, 'cfort');
  }
  // S8: protiletadlová obrana do nejvíc bombardovaného vlastního státu (jedna stavba najednou)
  if (!state.ind.build.some((b) => b.o === o && b.k === 'aa')) {
    let as = 0, ad = AI.S8_AA_DMG;
    for (const k of Object.keys(state.ind.dmg || {}).map(Number).sort((a, b) => a - b)) {
      if (state.stateOwner[k] === o && state.ind.dmg[k] >= ad && ((state.ind.st[k] && state.ind.st[k].aa) || 0) < AI.S8_AA_MAX && buildRoom(state, k, 'aa', o).n) { ad = state.ind.dmg[k]; as = k; }
    }
    if (as) return build(state, as, 'aa');
  }
  const lack = new Map(), lackP = new Map();
  for (const d of state.mil.divs) if (d && d.o === o && d.sup < AI.F4C_HUB_SUP) { const s = w.provState[d.p]; lack.set(s, (lack.get(s) || 0) + 1); lackP.set(d.p, (lackP.get(d.p) || 0) + 1); }
  // S6: železnice do provincie s nejvíc vlastními hladovějícími divizemi (vedle existující trati, do úrovně AI.S6_RAIL), jedna stavba najednou
  if (!state.ind.build.some((b) => b.o === o && b.k === 'rail')) {
    let rp = 0, rn = AI.S6_RAIL_DIVS - 1;
    for (const [p, n] of [...lackP].sort((a, b) => a[0] - b[0])) if (n > rn && state.ctrl[p] === o && provLevel(state.ind, p, 'rail') < AI.S6_RAIL && fortRoom(state, p, o, 'rail').n) { rn = n; rp = p; }
    if (rp) return buildFort(state, rp, 'rail');
  }
  // zásobovací uzel: stát s nejvíc vlastními divizemi bez zásob (aspoň AI.F4C_HUB_DIVS), se železnicí a bez uzlu
  if (state.ind.build.some((b) => b.o === o && b.k === 'hub')) return state;
  let hs = 0, hn = AI.F4C_HUB_DIVS - 1;
  for (const [s, n] of [...lack].sort((a, b) => a[0] - b[0])) if (n > hn && state.stateOwner[s] === o && hasRail(w, w.states[s].cap) && buildRoom(state, s, 'hub', o).n) { hn = n; hs = s; }
  return hs ? build(state, hs, 'hub') : state;
}
void BUILDINGS;
