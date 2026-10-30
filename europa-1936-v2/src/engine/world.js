// Svět hry: načtení src/data/world.json do podoby vhodné pro engine (typovaná pole, CSR sousednosti) i pro mapu (geometrie).
// Svět je neměnný – nikdy ho nezapisujeme do herního stavu; stav drží jen to, co se ve hře mění (vlastníci, jednotky, ...).
import rawWorld from '../data/world.json';
import { buildWorld } from './worldCore.js';
import { OWNERS_EXTRA } from '../data/ownersExtra.js';

export * from './worldCore.js';

let cached = null;
export function getWorld() {
  if (!cached) {
    // rezervní země (M69) se přidají za země ze souboru; hlavní město = provincie podle jména
    const extra = OWNERS_EXTRA.map((e) => ({ tag: e.tag, name: e.name, color: e.color, cap: rawWorld.land.findIndex((l) => l && l.n === e.capName), dyn: true }));
    cached = buildWorld({ ...rawWorld, owners: [...rawWorld.owners, ...extra] });
  }
  return cached;
}
export const getRawWorld = () => rawWorld;
