// Úpravy rozpracované šablony v návrháři divizí: čisté funkce nad objektem { nm, reg, sup } (vždy vracejí novou šablonu, nebo tutéž při neplatné úpravě).
import { GRID } from '../../engine/index.js';

const copy = (d) => ({ nm: d.nm, reg: d.reg.map((c) => c.slice()), sup: d.sup.slice() });

/**
 * Položí prapor `type` do pluku `c` na řádek `r`: obsazené místo přepíše; prázdné místo v existujícím pluku přidá prapor na jeho konec
 * (pluk nemá mezery); sloupec za posledním plukem založí nový pluk. Přeplněný pluk nebo pátý pluk navíc nic nezmění.
 */
export function placeBattalion(draft, c, r, type) {
  const d = copy(draft);
  if (c < d.reg.length) {
    const col = d.reg[c];
    if (r < col.length) { if (col[r] === type) return draft; col[r] = type; return d; }
    if (col.length >= GRID.rows) return draft;
    col.push(type);
    return d;
  }
  if (d.reg.length >= GRID.cols) return draft;
  d.reg.push([type]);
  return d;
}

/** Odebere prapor; prázdný pluk zanikne (ostatní pluky se posunou doleva). */
export function removeBattalion(draft, c, r) {
  if (c < 0 || c >= draft.reg.length || r < 0 || r >= draft.reg[c].length) return draft;
  const d = copy(draft);
  d.reg[c].splice(r, 1);
  if (!d.reg[c].length) d.reg.splice(c, 1);
  return d;
}

/** Přidá podpůrnou rotu, nebo ji odebere, je-li už v divizi (každý druh nejvýš jednou; nejvýš GRID.support rot). */
export function toggleSupport(draft, type) {
  const d = copy(draft);
  const i = d.sup.indexOf(type);
  if (i >= 0) { d.sup.splice(i, 1); return d; }
  if (d.sup.length >= GRID.support) return draft;
  d.sup.push(type);
  return d;
}

export const setName = (draft, nm) => (draft.nm === nm ? draft : { ...copy(draft), nm });
