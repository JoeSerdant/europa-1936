// Společné pomůcky AI (M24): rozpoznání země pod AI a násobek obtížnosti.
import { getWorld } from '../world.js';
import { AI } from './constants.js';
import { ruleMult } from '../rules.js';

export const playerOf = (state) => (state.player ? getWorld().ownerIdx[state.player] : 0);
export const isAi = (state, o) => o !== playerOf(state);

/** Násobek výroby, staveb a výzkumu země: AI podle obtížnosti (běžná = 1), hráč podle pravidla hry `bonus`. */
export function aiMult(state, o) {
  if (state.player && !isAi(state, o)) return ruleMult(state, 'bonus');   // M78: pravidlo hry „Vaše země“ (výhoda / nevýhoda hráče)
  if (!state.ai || !state.ai.level || !isAi(state, o)) return 1;
  return 1 + AI.LEVEL_EFF * (state.ai.level - 2);
}
