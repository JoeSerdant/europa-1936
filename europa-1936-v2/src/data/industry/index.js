export * from './buildings.js';
export * from './resources.js';
export * from './national.js';
import { EQUIP_PROD } from './buildings.js';
import { SHIP_PROD } from '../navy/ships.js';

/** Výrobní data všeho, co se vyrábí na linkách: výzbroj i lodě. */
export const PROD = { ...EQUIP_PROD, ...SHIP_PROD };
export const isShip = (eq) => !!SHIP_PROD[eq];
