// Společné pomůcky AI (M24): rozpoznání země pod AI a násobek obtížnosti.
import { getWorld } from '../world.js';
import { AI } from './constants.js';

export const playerOf = (state) => (state.player ? getWorld().ownerIdx[state.player] : 0);
export const isAi = (state, o) => o !== playerOf(state);

/** Násobek výroby, staveb a výzkumu AI země podle obtížnosti (hráč a běžná obtížnost = 1). */
export function aiMult(state, o) {
  if (!state.ai || !state.ai.level || !isAi(state, o)) return 1;
  return 1 + AI.LEVEL_EFF * (state.ai.level - 2);
}
