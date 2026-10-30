// AI zemí (M24): veřejné rozhraní.
export { AI } from './constants.js';
export { aiMult, isAi, playerOf } from './core.js';
export { targetDivs, scanArmies } from './army.js';
export { aiDay } from './day.js';
export { HIST_WARS, HIST_FACTIONS } from '../../data/ai/plans.js';
export { sizeFactor, desiredMix, tplOfKind } from './army.js';
export { demandSplit, armyPressure } from './industry.js';
export { REARM, REARM_CURVE, rearmFactor } from '../../data/ai/rearm.js';
