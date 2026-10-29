// AI: námořnictvo (M27). Používá stejné příkazy jako hráč: build (loděnice), addLine / setLineFactories (lodní linky), formFleet.
import { getWorld } from '../world.js';
import { NAVY_NATIONAL, SHIP_IDS } from '../../data/navy/index.js';
import { build } from '../industry/commands.js';
import { addLine, setLineFactories } from '../industry/commands.js';
import { industryOf } from '../industry/selectors.js';
import { slotsOf, slotsUsed } from '../industry/core.js';
import { I } from '../industry/constants.js';
import { formFleet } from '../nav/commands.js';
import { NAV } from '../nav/constants.js';
import { AI } from './constants.js';

/** Stát s přístavem a volným slotem pro loděnici (úroveň přístavu, pak počet volných slotů); 0 = žádný. */
function dockState(state, o) {
  const w = getWorld();
  let best = 0, bk = -1;
  for (let s = 1; s < w.states.length; s++) {
    if (state.stateOwner[s] !== o || state.ctrl[w.states[s].cap] !== o) continue;
    const lvl = w.states[s].v.reduce((a, p) => Math.max(a, w.portLevel[p] || 0), 0);
    const free = slotsOf(state.ind, s) - slotsUsed(state.ind, s);
    if (!lvl || free <= 0) continue;
    const k = lvl * 100 + free;
    if (k > bk) { bk = k; best = s; }
  }
  return best;
}

export function aiNavy(state, o) {
  const tag = getWorld().owners[o].tag, def = NAVY_NATIONAL[tag];
  if (!def) return state;
  let sum = industryOf(state, o);
  const queued = sum.build.filter((b) => b.k === 'dok').length;
  // loděnice: cílový počet podle dat (a ve válce o třetinu víc)
  if (sum.dok + queued < def.docks + (def.docks >= 3 ? 1 : 0) && sum.build.length < AI.QUEUE) {
    const s = dockState(state, o);
    if (s) state = build(state, s, 'dok');
  }
  // lodní linky: volné loděnice na loď s největším deficitem proti cílovému složení
  sum = industryOf(state, o);
  const years = state.tick / 8766;
  let free = Math.min(6, sum.dockFree);
  while (free > 0) {
    const have = {};
    for (const k of SHIP_IDS) have[k] = (state.nav.pool[o][k] || 0) + state.nav.fleets.reduce((a, f) => a + (f && f.o === o ? f.ships[k] || 0 : 0), 0);
    for (const l of sum.lines) if (l.naval) have[l.eq] += l.fac * 3;
    let pick = '', pk = -Infinity;
    for (const k of SHIP_IDS) {
      const target = (def.ships[k] || 0) * (1 + 0.15 * years) + (k === 'tr' ? 2 : 0);
      const d = (target - have[k]) / Math.max(1, target);
      if (d > pk) { pk = d; pick = k; }
    }
    if (!pick) break;
    const line = sum.lines.find((l) => l.naval && l.eq === pick && l.fac < I.LINE_MAX_FAC);
    const next = line ? setLineFactories(state, line.id, line.fac + 1) : addLine(state, o, pick, 1);
    if (next === state) break;
    state = next;
    sum = industryOf(state, o);
    free--;
  }
  // z nových bojových lodí v rezervě se sestaví flotila
  const pool = state.nav.pool[o];
  const ships = {};
  let n = 0;
  for (const k of SHIP_IDS) if (k !== 'tr' && pool[k]) { ships[k] = pool[k]; n += pool[k]; }
  if (n >= 3 && state.nav.fleets.filter((f) => f && f.o === o).length < NAV.FLEET_MAX) state = formFleet(state, o, ships);
  return state;
}
