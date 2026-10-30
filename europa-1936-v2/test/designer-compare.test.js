// Návrhář divizí (M64): odhad výrobních nákladů a srovnání s uloženou šablonou.
import { describe, it, expect } from 'vitest';
import { deriveStats, EQUIP_PROD, TPL_KINDS } from '../src/engine/index.js';
import { prodCost, compareStats } from '../src/ui/army/designer.js';

const tpl = (kind) => { const d = TPL_KINDS[kind]; return { nm: d.nm, reg: d.reg.map((c) => c.slice()), sup: d.sup.slice() }; };

describe('návrhář: náklady a srovnání (M64)', () => {
  it('náklady jsou součet výrobních bodů výzbroje a tank je dražší než pěchota', () => {
    const inf = deriveStats(tpl('pesi')), arm = deriveStats(tpl('tank'));
    expect(prodCost(inf, EQUIP_PROD)).toBeGreaterThan(0);
    expect(prodCost(arm, EQUIP_PROD)).toBeGreaterThan(prodCost(inf, EQUIP_PROD));
    expect(prodCost({ need: {} }, EQUIP_PROD)).toBe(0);
    expect(prodCost({ need: { neznama: 5 } }, EQUIP_PROD)).toBe(0);
  });
  it('stejná šablona nemá rozdíly, jiná ano a zlepšení se rozliší od zhoršení', () => {
    const a = deriveStats(tpl('pesi'));
    expect(compareStats(a, a, EQUIP_PROD)).toEqual([]);
    const t = tpl('pesi'); t.sup = [];
    const b = deriveStats(t);
    const diff = compareStats(a, b, EQUIP_PROD);
    expect(diff.length).toBeGreaterThan(0);
    for (const d of diff) { expect([1, 0, -1]).toContain(d.better); expect(d.delta).not.toBe(0); }
    const arm = compareStats(deriveStats(tpl('tank')), a, EQUIP_PROD);
    expect(arm.find((d) => d.k === 'cost').better).toBe(-1);   // dražší
    expect(arm.find((d) => d.k === 'armor').better).toBe(1);
  });
});
