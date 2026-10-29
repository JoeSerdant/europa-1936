// Herní stav (čistý JSON) a jeho vytvoření. Svět (provincie, státy, sítě) je neměnný a žije v world.js – tady je jen to, co se ve hře mění.
// 1 tick = 1 herní hodina, hra začíná 1. 1. 1936 00:00. Žádné Math.random ani Date.now – náhoda jde přes rng.js.
import { getWorld } from './world.js';
import { seedToState } from './rng.js';
import { createMil } from './army/setup.js';
import { createInd } from './industry/setup.js';
import { createTech } from './research/setup.js';

export const GAME_VERSION = 4;
export const SPEEDS = [0, 12, 24, 48, 96, 240];   // herních hodin za reálnou sekundu při rychlosti 1–5 (index 0 = pauza)
export const MAX_SPEED = 5;

/**
 * Počáteční stav scénáře „1936“.
 * @param {{player?: string|null, seed?: number}} opts  player = tag země (např. 'GER'), null = pozorovatel
 */
export function createGame({ player = null, seed = 1936 } = {}) {
  const w = getWorld();
  if (player && !w.ownerIdx[player]) throw new Error(`Neznámá země: ${player}`);
  // vlastník je vlastností státu (HOI4: stát = jednotka vlastnictví), kontrola je po provinciích (okupace)
  const stateOwner = Array.from(w.stateOwner0);
  const ctrl = Array.from(w.provOwner0);
  const { mil, rng } = createMil(w, seedToState(seed));   // M18: armády, šablony, velitelé, sklady (viz SPEC § 4a)
  const { ind } = createInd(w, seedToState(seed ^ 0x19a1));      // M19 (vlastní proud náhody, aby se nezměnil průběh armády): továrny, těžba, linky, obchod (viz SPEC § 4b)
  return {
    v: GAME_VERSION,
    tick: 0,
    rng,
    player,
    speed: 3,
    paused: true,
    stateOwner,
    ctrl,
    ownerVer: 0,          // zvyšuje se při změně vlastnictví/kontroly – pro mezipaměti (mapa, souhrny)
    mil,
    ind,
    tech: createTech(w),   // M20: výzkum (viz SPEC § 4c)
  };
}
