// Národní cíle a události (M22): veřejné rozhraní.
export * from './commands.js';
export * from './selectors.js';
export { NAT } from './constants.js';
export { focusMods, focusStatus, rand01 } from './core.js';
export { applyFx } from './effects.js';
export { takeDecision, decisionsOf, decisionBlock } from './decisions.js';
export { DECISIONS, DECISION_BY_ID, DECISION_CATS } from '../../data/nat/decisions.js';
export { createNat } from './setup.js';
export { CONT_FOCUSES, CONT_IDS } from '../../data/nat/continuous.js';
export { addSpirit, removeSpirit, spiritsOf, spiritMods, spiritArmyMods, startSpirits, expireSpirits } from './spirits.js';
export { SPIRITS, SPIRIT_IDS, SPIRIT_START } from '../../data/nat/spirits.js';
export { FOCUS_TREES, FOCUS_BY_ID, treeOf, EVENTS, EVENT_BY_ID, fxText, fxLinesOf, modLines } from '../../data/nat/index.js';
