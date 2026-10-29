export * from './buildings.js';
export * from './resources.js';
export * from './national.js';
import { EQUIP_PROD } from './buildings.js';
import { SHIP_PROD } from '../navy/ships.js';
import { AIR_PROD } from '../air/planes.js';

/** Výrobní data všeho, co se vyrábí na linkách: výzbroj, lodě i letadla. */
export const PROD = { ...EQUIP_PROD, ...SHIP_PROD, ...AIR_PROD };
export const isAir = (eq) => !!AIR_PROD[eq];
export const isShip = (eq) => !!SHIP_PROD[eq];
