// S10: bonusy splněných společných cílů bloku pro člena (čte `polModsOf`). Bez dalších závislostí, aby nevznikl cyklus importů.
import { FAC_GOALS } from '../../data/dip/facgoals.js';

/** Bonusy splněných cílů bloku země `o` ({ klíč: hodnota }), nebo null. */
export function facModsOf(state, o) {
  const id = state.dip && state.dip.fac[o], f = id ? state.dip.facs[id] : null;
  if (!f || !f.gd || !f.gd.length) return null;
  const m = {};
  for (const g of f.gd) { const G = FAC_GOALS[g]; if (G) for (const k in G.mod) m[k] = (m[k] || 0) + G.mod[k]; }
  return m;
}
/** Klíč mezipaměti bonusů bloku země `o` (splněné cíle), nebo ''. */
export function facModsKey(state, o) {
  const id = state.dip && state.dip.fac[o], f = id ? state.dip.facs[id] : null;
  return f && f.gd && f.gd.length ? f.gd.join(',') : '';
}
