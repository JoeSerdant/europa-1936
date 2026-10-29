// Svět hry: načtení src/data/world.json do podoby vhodné pro engine (typovaná pole, CSR sousednosti) i pro mapu (geometrie).
// Svět je neměnný – nikdy ho nezapisujeme do herního stavu; stav drží jen to, co se ve hře mění (vlastníci, jednotky, ...).
import rawWorld from '../data/world.json';
import { buildWorld } from './worldCore.js';

export * from './worldCore.js';

let cached = null;
export function getWorld() {
  if (!cached) cached = buildWorld(rawWorld);
  return cached;
}
export const getRawWorld = () => rawWorld;
