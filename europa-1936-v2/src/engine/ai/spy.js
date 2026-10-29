// AI: zpravodajství (M41). Stejné příkazy jako hráč (hireAgent, startOp). Jednou za pět dní; operace proti nepřátelům, jinak průzkum.
import { getWorld } from '../world.js';
import { hasWar, enemiesOf } from '../army/war.js';
import { hireAgent, startOp, agentsOf, opBlock } from '../spy/commands.js';
import { rand01 } from '../nat/core.js';
import { relOf } from '../dip/core.js';

export function aiSpy(state, o) {
  if (state.tick % (24 * 5) !== 0) return state;
  if (state.pol.own[o].pp > 120) state = hireAgent(state, o);
  if (agentsOf(state, o).free < 1) return state;
  const w = getWorld();
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
