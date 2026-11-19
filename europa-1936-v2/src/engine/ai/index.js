// AI zemí (M24): veřejné rozhraní.
export { AI } from './constants.js';
export { aiMult, isAi, playerOf, diffOf } from './core.js';
export { DIFFICULTY, DIFF_IDS } from '../../data/ai/difficulty.js';
export { targetDivs, scanArmies } from './army.js';
export { aiDay } from './day.js';
export { HIST_WARS, HIST_FACTIONS, HIST_ENTRY } from '../../data/ai/plans.js';
export { sizeFactor, desiredMix, tplOfKind } from './army.js';
export { demandSplit, armyPressure } from './industry.js';
export { REARM, REARM_CURVE, rearmFactor } from '../../data/ai/rearm.js';
export { aggrOf, PERSONALITY } from '../../data/ai/personality.js';
