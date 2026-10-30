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

/** Odhad výrobních nákladů jedné divize: součet výrobních bodů výzbroje podle `need` (kusů na divizi). */
export function prodCost(stats, prod) {
  let c = 0;
  for (const e in stats.need) c += (stats.need[e] || 0) * (prod[e] ? prod[e].cost : 0);
  return c;
}

/** Rozdíly návrhu proti uložené šabloně: [{ k, name, delta, better }] jen pro změněné údaje (kladné `better` = zlepšení). */
export function compareStats(draft, saved, prod) {
  const rows = [
    ['hp', 'Síla', 1], ['org', 'Organizace', 1], ['soft', 'Měkký útok', 1], ['hard', 'Tvrdý útok', 1], ['def', 'Obrana', 1], ['brk', 'Průraz', 1],
    ['armor', 'Pancíř', 1], ['speed', 'Rychlost', 1], ['width', 'Šířka', 0], ['men', 'Lidská síla', -1], ['sup', 'Zásoby za hodinu', -1], ['days', 'Výcvik', -1],
  ];
  const out = [];
  for (const [k, name, sign] of rows) {
    const d = (draft[k] || 0) - (saved[k] || 0);
    if (Math.abs(d) > 1e-6) out.push({ k, name, delta: d, better: sign * d > 0 ? 1 : sign === 0 ? 0 : -1 });
  }
  const dc = prodCost(draft, prod) - prodCost(saved, prod);
  if (Math.abs(dc) > 1e-6) out.push({ k: 'cost', name: 'Výrobní náklady', delta: dc, better: dc < 0 ? 1 : -1 });
  return out;
}
