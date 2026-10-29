// Herní stav (čistý JSON) a jeho vytvoření. Svět (provincie, státy, sítě) je neměnný a žije v world.js – tady je jen to, co se ve hře mění.
// 1 tick = 1 herní hodina, hra začíná 1. 1. 1936 00:00. Žádné Math.random ani Date.now – náhoda jde přes rng.js.
import { getWorld } from './world.js';
import { seedToState } from './rng.js';
import { createMil } from './army/setup.js';
import { createInd } from './industry/setup.js';
import { createTech } from './research/setup.js';
import { createPol } from './politics/setup.js';
import { createNat } from './nat/setup.js';
import { createDip } from './dip/setup.js';
import { createLog } from './log.js';
import { createNav } from './nav/setup.js';
import { createAir } from './air/setup.js';

export const GAME_VERSION = 12;
export const SPEEDS = [0, 12, 24, 48, 96, 240];   // herních hodin za reálnou sekundu při rychlosti 1–5 (index 0 = pauza)
export const MAX_SPEED = 5;

/**
 * Počáteční stav scénáře „1936“.
 * @param {{player?: string|null, seed?: number, aiLevel?: 0|1|2|3 (0 = AI zemí vypnutá, výchozí v enginu; hra z rozhraní začíná na 2), hist?: boolean}} opts  player = tag země (např. 'GER'), null = pozorovatel
 */
export function createGame({ player = null, seed = 1936, aiLevel = 0, hist = true } = {}) {
  const w = getWorld();
  if (player && !w.ownerIdx[player]) throw new Error(`Neznámá země: ${player}`);
  // vlastník je vlastností státu (HOI4: stát = jednotka vlastnictví), kontrola je po provinciích (okupace)
  const stateOwner = Array.from(w.stateOwner0);
  const ctrl = Array.from(w.provOwner0);
  const { mil, rng } = createMil(w, seedToState(seed));   // M18: armády, šablony, velitelé, sklady (viz SPEC § 4a)
  const { ind } = createInd(w, seedToState(seed ^ 0x19a1));      // M19 (vlastní proud náhody, aby se nezměnil průběh armády): továrny, těžba, linky, obchod (viz SPEC § 4b)
  const air = createAir(w, ind);   // M30: letectvo (viz SPEC § 4k); upravuje `ind` (letiště) hned při vzniku
  const base = {
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
    pol: createPol(w),     // M21: politika (viz SPEC § 4d)
    nat: createNat(w),     // M22: národní cíle a události (viz SPEC § 4e)
    dip: createDip(w),     // M23: diplomacie (viz SPEC § 4f)
    log: createLog(),      // M26: deník dění (viz SPEC § 4i)
    air,                   // M30: letectvo (viz SPEC § 4k)
    ai: { level: [1, 2, 3].includes(aiLevel) ? aiLevel : 0, hist: hist ? 1 : 0 },   // M24: nastavení AI (viz SPEC § 4g)
  };
  return { ...base, nav: createNav(w, base) };   // M27: námořnictvo (viz SPEC § 4j); potřebuje přístavy podle vlastnictví
}
