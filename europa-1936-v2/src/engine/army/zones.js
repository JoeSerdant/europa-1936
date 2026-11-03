// Zóny dosažitelnosti po souši (M71): provincie, mezi kterými země `o` projde pěšky (vlastní, nepřátelské, území s dohodou o přístupu a přátel; bez průlivů).
// Divize na jiném ostrově nebo za cizí neutrální zemí je v jiné zóně, takže nemůže bránit ani útočit na cíle v téže zóně jako domov – tam vede jen cesta po moři.
// Čistá funkce nad stavem; výsledek se cachuje podle pole `ctrl` a země.
import { getWorld } from '../world.js';
import { canEnter } from './paths.js';
import { adjacency } from './geo.js';

const cache = new WeakMap();   // ctrl → Map(země → { wars, dip, zone }) – výsledek platí, dokud se nezmění války a diplomacie

/** Číslo zóny každé provincie pro zemi `o` (0 = provincie, na kterou `o` nesmí vstoupit). */
export function landZones(state, o) {
  let m = cache.get(state.ctrl);
  if (!m) { m = new Map(); cache.set(state.ctrl, m); }
  const hit = m.get(o);
  if (hit && hit.wars === state.mil.wars && hit.dip === state.dip.ver) return hit.zone;
  const w = getWorld(), adj = adjacency(w), ctrl = state.ctrl, mil = state.mil, dip = state.dip;
  const ok = new Uint8Array(w.L + 1);
  for (let p = 1; p <= w.L; p++) ok[p] = canEnter(mil, o, ctrl[p], dip) ? 1 : 0;
  const zone = new Int32Array(w.L + 1);
  let n = 0;
  for (let p = 1; p <= w.L; p++) {
    if (zone[p] || !ok[p]) continue;
    zone[p] = ++n;
    const stack = [p];
    while (stack.length) {
      const x = stack.pop();
      for (const e of adj[x]) if (e.kind !== 2 && ok[e.to] && !zone[e.to]) { zone[e.to] = n; stack.push(e.to); }
    }
  }
  m.set(o, { wars: state.mil.wars, dip: state.dip.ver, zone });
  return zone;
}
