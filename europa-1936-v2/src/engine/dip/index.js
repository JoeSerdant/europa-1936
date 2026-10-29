// Diplomacie (M23): veřejné rozhraní.
export * from './commands.js';
export * from './selectors.js';
export { DIP } from './constants.js';
export { relOf, baseRel, factionOf, sameFaction, campOf, warScore, vpHeld, hasCapitulated } from './core.js';
export { capitulate } from './capitulate.js';
export { createDip } from './setup.js';
export { START_FACTIONS, PAIR_REL, IDEO_REL } from '../../data/dip/index.js';
