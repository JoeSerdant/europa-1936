// Počáteční diplomacie: žádné uložené změny vztahů, počáteční bloky z dat, nikdo nekapituloval.
import { START_FACTIONS, START_SUBJECTS } from '../../data/dip/index.js';

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
  // W1: historické loutky na startu (Mandžukuo, Mongolsko, Tuva, Filipíny, Indie)
  const sub = new Array(n).fill(0), au = new Array(n).fill(0);
  for (const [s, v, a] of START_SUBJECTS) { const si = w.ownerIdx[s], vi = w.ownerIdx[v]; if (si && vi) { sub[si] = vi; au[si] = a; } }
  return { ver: 0, rel: {}, fac, facs, just: [], cap: Array.from({ length: n }, (_, o) => (o && w.owners[o].dyn ? 1 : 0)), since: {}, sub, conf: [], gar: [], au, goal: {}, acc: [], ult: [], nap: [], napq: [], exile: new Array(n).fill(0), ally0: new Array(n).fill(0), att: [] };
}
