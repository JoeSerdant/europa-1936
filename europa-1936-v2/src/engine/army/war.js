// Stav války: dvojice zemí. M23 přidá frakce, spojenectví, cíle války a kapitulaci – rozhraní (atWar, enemiesOf) zůstane.
import { getWorld } from '../world.js';
import { adjacency } from './geo.js';

const setCache = new WeakMap();
const key = (a, b) => (a < b ? a * 256 + b : b * 256 + a);

function warSet(wars) {
  let s = setCache.get(wars);
  if (!s) { s = new Set(wars.map(([a, b]) => key(a, b))); setCache.set(wars, s); }
  return s;
}

export const atWar = (mil, a, b) => a !== b && warSet(mil.wars).has(key(a, b));

/** Země ve válce s `o` (indexy), podle pořadí vyhlášení. */
export function enemiesOf(mil, o) {
  const out = [];
  for (const [a, b] of mil.wars) { if (a === o) out.push(b); else if (b === o) out.push(a); }
  return out;
}

export const hasWar = (mil, o) => mil.wars.some(([a, b]) => a === o || b === o);

/** Nejbližší provincie, kterou ovládá `o` (BFS po pevninských sousednostech); 0, nenajde-li se. */
export function nearestControlled(ctrl, o, from, avoid = null) {
  const w = getWorld(), adj = adjacency(w);
  const seen = new Uint8Array(w.L + 1);
  let q = [from];
  seen[from] = 1;
  for (let depth = 0; depth < 40 && q.length; depth++) {
    const next = [];
    for (const p of q) {
      if (p !== from && ctrl[p] === o && !(avoid && avoid(p))) return p;
      for (const e of adj[p]) if (!seen[e.to]) { seen[e.to] = 1; next.push(e.to); }
    }
    q = next;
  }
  return 0;
}

/** Přidá válku a vrátí nový stav armády (neplatná dvojice = stejný objekt). */
export function addWar(mil, a, b) {
  if (!a || !b || a === b || atWar(mil, a, b)) return mil;
  return { ...mil, wars: [...mil.wars, a < b ? [a, b] : [b, a]] };
}
