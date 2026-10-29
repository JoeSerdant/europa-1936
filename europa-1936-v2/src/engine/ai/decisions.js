// AI: rozhodnutí (M35). Stejný příkaz jako hráč (takeDecision), jednou týdně, jen z rezervy politické moci (nad cenou ještě 40).
import { DECISIONS } from '../../data/nat/decisions.js';
import { decisionBlock, takeDecision } from '../nat/decisions.js';

export function aiDecisions(state, o) {
  if (state.tick % (24 * 7) !== 0) return state;
  const pp = state.pol.own[o].pp;
  for (const d of DECISIONS) {
    if (!d.ai || pp < d.cost + 40 || decisionBlock(state, o, d.id)) continue;
    return takeDecision(state, o, d.id);
  }
  return state;
}
