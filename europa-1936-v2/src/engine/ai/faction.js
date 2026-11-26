// S10: AI vedoucí bloku volí společné cíle – ten, ke kterému má blok nejblíž (postup × váha `ai`), měsíčně.
import { FAC_GOALS, FAC_GOAL_IDS } from '../../data/dip/facgoals.js';
import { facGoalBlock, facProgress, setFacGoal } from '../dip/facgoals.js';

export function aiFacGoals(state, o) {
  if ((Math.floor(state.tick / 24) + o) % 30 !== 11) return state;
  const id = state.dip.fac[o], f = id ? state.dip.facs[id] : null;
  if (!f || f.ldr !== o) return state;
  let best = '', bv = -1;
  for (const g of FAC_GOAL_IDS) {
    if (facGoalBlock(state, o, g)) continue;
    const p = facProgress(state, f, g), v = Math.min(1, p.cur / p.need) * FAC_GOALS[g].ai;
    if (v > bv) { bv = v; best = g; }
  }
  return best ? setFacGoal(state, o, best) : state;
}
