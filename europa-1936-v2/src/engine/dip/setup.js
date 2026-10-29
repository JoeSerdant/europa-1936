// Počáteční diplomacie: žádné uložené změny vztahů, počáteční bloky z dat, nikdo nekapituloval.
import { START_FACTIONS } from '../../data/dip/index.js';

export function createDip(w) {
  const n = w.owners.length;
  const fac = new Array(n).fill(0);
  const facs = [null];
  for (const f of START_FACTIONS) {
    const mem = f.mem.map((t) => w.ownerIdx[t]).filter(Boolean);
    if (!mem.length) continue;
    facs.push({ nm: f.nm, ldr: w.ownerIdx[f.ldr], mem });
    for (const o of mem) fac[o] = facs.length - 1;
  }
  return { ver: 0, rel: {}, fac, facs, just: [], cap: new Array(n).fill(0), since: {}, sub: new Array(n).fill(0), conf: [] };
}
