// Infrastruktura provincií: základ odvozený ze světa (`geo(w).infra`) + vylepšení státu postavená v M19. Pole se cachuje podle `ind.inf`.
import { getWorld } from '../world.js';
import { geo } from '../army/geo.js';

const cache = new WeakMap();   // ind.inf → Uint8Array

export function infraOf(state) {
  const w = getWorld();
  const g = geo(w);
  const inf = state.ind ? state.ind.inf : null;
  if (!inf) return g.infra;
  let a = cache.get(inf);
  if (a) return a;
  if (!inf.some((x) => x > 0)) { cache.set(inf, g.infra); return g.infra; }
  a = new Uint8Array(w.L + 1);
  for (let p = 1; p <= w.L; p++) a[p] = Math.min(5, g.infra[p] + (inf[w.provState[p]] || 0));
  cache.set(inf, a);
  return a;
}
