// Výzkum (M20): veřejné rozhraní.
export * from './commands.js';
export * from './selectors.js';
export { RES } from './constants.js';
export { techMods, isUnlocked, isDone, isAvailable, slotCount, yearOf, sharersOf, shareBonus, NO_MODS } from './core.js';
export { createTech } from './setup.js';
export { TECHS, TECH_IDS, CATS, CAT_IDS, fxLines } from '../../data/research/index.js';
