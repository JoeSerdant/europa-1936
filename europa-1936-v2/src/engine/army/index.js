// Armáda (M18): veřejné rozhraní. Vnitřní moduly (movement, combat, supply …) si engine volá sám přes system.js.
export * from './commands.js';
export * from './selectors.js';
export { deriveStats, validateTemplate, divisionName, templateUnits } from './stats.js';
export { findPath, pathHours } from './paths.js';
export { C as ARMY, xpLevel, XP_NAMES } from './constants.js';
export { PLAN_MODES, MODE_NAMES } from './plans.js';
export { genLevel, xpForLevel, genMods } from './leaders.js';
export { supplyFlow } from './supply.js';
export { geo, adjacency } from './geo.js';
