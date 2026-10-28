// Průmysl (M19): veřejné rozhraní. Vnitřní moduly si engine volá přes system.js.
export * from './commands.js';
export * from './selectors.js';
export { I as IND } from './constants.js';
export { infraOf } from './infra.js';
export { categoryOf, slotsOf, slotsUsed, tallyOwners, lineRate } from './core.js';
export { createInd } from './setup.js';
export { BUILDINGS, BUILDING_IDS, STATE_CATEGORIES, EQUIP_PROD, DEFAULT_SPLIT, RESOURCES, RES_IDS, IND_NATIONAL, TRADE_SEED } from '../../data/industry/index.js';
