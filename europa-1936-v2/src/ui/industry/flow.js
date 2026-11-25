// Rozdělení bodů stavby mezi projekty fronty (F4f, jako v HOI4: u každé stavby je vidět, kolik civilních továren na ní pracuje).
// Stejné pravidlo jako `projectEta`: projekty berou body popořadě, každý nejvýš svou rychlost (cena / nejkratší doba).
import { BUILDINGS, IND } from '../../engine/index.js';

/**
 * Body a továrny pro každý projekt fronty: Map(id → { pts, cap, fac, facMax }).
 * `pts` = body za den, které projekt dostane; `cap` = jeho strop; `fac` = přepočet na továrny (může být zlomek), `facMax` = strop v továrnách.
 */
export function queueFlow(list, points) {
  const out = new Map();
  let pool = Math.max(0, points || 0);
  for (const b of list) {
    const B = BUILDINGS[b.k];
    const cap = B ? B.cost / B.days : 0;
    const pts = Math.min(cap, pool);
    pool -= pts;
    out.set(b.id, { pts, cap, fac: pts / IND.IC_PER_FAC, facMax: Math.ceil(cap / IND.IC_PER_FAC - 1e-9) });
  }
  return out;
}
