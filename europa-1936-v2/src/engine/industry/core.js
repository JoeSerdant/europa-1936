// Společné pomůcky průmyslu (M19): sloty států, souhrn továren a těžby po zemích, využití továren, toky surovin. Čisté funkce nad `state.ind`.
import { getWorld } from '../world.js';
import { I } from './constants.js';
import { STATE_CATEGORIES, EQUIP_PROD, BUILDINGS } from '../../data/industry/index.js';

/** Kategorie státu podle obyvatel (tis.). */
export function categoryOf(pop) {
  for (const c of STATE_CATEGORIES) if (pop <= c.max) return c;
  return STATE_CATEGORIES[STATE_CATEGORIES.length - 1];
}

/** Počet stavebních slotů státu: základ podle kategorie + vylepšení infrastruktury. */
export const slotsOf = (ind, s) => categoryOf(getWorld().states[s].p).slots + (ind.inf[s] || 0);

/** Počet obsazených slotů státu včetně rozestavěných továren. */
export function slotsUsed(ind, s) {
  const e = ind.st[s];
  let n = e.civ + e.mil;
  for (const b of ind.build) if (b.s === s && BUILDINGS[b.k].slot) n++;
  return n;
}

const tallyCache = new WeakMap();   // ind.st → { ctrl, so, tally }

/**
 * Souhrn po zemích (index = idx země): továrny, těžba, počet okupovaných států.
 * Továrny státu počítají jen jeho vlastníkovi a jen když vlastník drží hlavní provincii státu; těžba z okupovaného státu jde okupantovi.
 */
export function tallyOwners(state) {
  const { ind, ctrl, stateOwner: so } = state;
  const hit = tallyCache.get(ind.st);
  if (hit && hit.ctrl === ctrl && hit.so === so) return hit.tally;
  const w = getWorld();
  const tally = Array.from({ length: w.owners.length }, () => ({ civ: 0, mil: 0, res: {}, occ: 0 }));
  for (let s = 1; s < w.states.length; s++) {
    const e = ind.st[s], o = so[s];
    if (!e || !o) continue;
    const c = ctrl[w.states[s].cap];
    if (c === o || !c) {
      tally[o].civ += e.civ; tally[o].mil += e.mil;
      for (const r in e.res) tally[o].res[r] = (tally[o].res[r] || 0) + e.res[r];
    } else {
      tally[o].occ++;
      for (const r in e.res) tally[c].res[r] = (tally[c].res[r] || 0) + e.res[r];
    }
  }
  tallyCache.set(ind.st, { ctrl, so, tally });
  return tally;
}

/** Využití továren země: spotřební zboží ubírá nejdřív civilní, pak vojenské. */
export function factoryUse(t, cons) {
  const total = t.civ + t.mil;
  const consFac = cons * total;
  return { consFac, civAfterCons: Math.max(0, t.civ - consFac), milAvail: Math.max(0, t.mil - Math.max(0, consFac - t.civ)) };
}

/** Kusy za den, které linka vyrobí při své efektivitě (bez vlivu nedostatku surovin). */
export const lineRate = (l) => (l.fac * I.IC_PER_FAC * l.eff) / EQUIP_PROD[l.eq].cost;

/** Nominální poptávka po surovinách (za den) pro linky země. */
export function demandOf(lines) {
  const dem = {};
  for (const l of lines) {
    const rate = lineRate(l), req = EQUIP_PROD[l.eq].res;
    for (const r in req) dem[r] = (dem[r] || 0) + rate * req[r];
  }
  return dem;
}

/** Linky země seřazené podle id, zkrácené na dostupné továrny (od posledních). Vrací nové objekty jen u změněných. */
export function trimLines(lines, milAvail) {
  let used = 0;
  for (const l of lines) used += l.fac;
  let over = Math.floor(used - milAvail + 1e-9);
  if (over <= 0) return lines;
  const out = lines.slice();
  for (let i = out.length - 1; i >= 0 && over > 0; i--) {
    const cut = Math.min(over, out[i].fac);
    out[i] = { ...out[i], fac: out[i].fac - cut };
    over -= cut;
  }
  return out.filter((l) => l.fac > 0);
}

/** Toky surovin země: těžba, dovoz a vývoz podle skutečně dodaných množství `got`, poptávka a poměr pokrytí `f` (0–1). */
export function resFlows(t, dem, trade, o) {
  const res = {};
  const get = (r) => res[r] || (res[r] = { ext: 0, imp: 0, exp: 0, dem: 0, f: 1 });
  for (const r in t.res) get(r).ext = t.res[r];
  for (const d of trade) {
    if (d.to === o && d.got > 0) get(d.res).imp += d.got;
    if (d.from === o && d.got > 0) get(d.res).exp += d.got;
  }
  for (const r in dem) get(r).dem = dem[r];
  for (const r in res) {
    const x = res[r];
    x.f = x.dem > 1e-9 ? Math.min(1, Math.max(0, x.ext - x.exp + x.imp) / x.dem) : 1;
  }
  return res;
}

/** Poměr výkonu linky podle nejhorší potřebné suroviny (nejméně `RES_FLOOR`). */
export function lineFactor(l, res) {
  let f = 1;
  for (const r in EQUIP_PROD[l.eq].res) f = Math.min(f, res[r] ? res[r].f : 0);
  return Math.max(I.RES_FLOOR, f);
}
