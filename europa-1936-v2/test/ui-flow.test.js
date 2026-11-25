import { describe, it, expect } from 'vitest';
import { queueFlow } from '../src/ui/industry/flow.js';
import { BUILDINGS, IND } from '../src/engine/index.js';

describe('queueFlow – body stavby pro projekty fronty (F4f)', () => {
  const cap = (k) => BUILDINGS[k].cost / BUILDINGS[k].days;
  it('projekty berou body popořadě, každý nejvýš svůj strop', () => {
    const list = [{ id: 1, k: 'civ' }, { id: 2, k: 'civ' }, { id: 3, k: 'mil' }];
    const pts = cap('civ') * 1.5;
    const f = queueFlow(list, pts);
    expect(f.get(1).pts).toBeCloseTo(cap('civ'));
    expect(f.get(2).pts).toBeCloseTo(cap('civ') * 0.5);
    expect(f.get(3).pts).toBe(0);
    expect(f.get(1).fac).toBeCloseTo(cap('civ') / IND.IC_PER_FAC);
    expect(f.get(1).facMax).toBe(Math.ceil(cap('civ') / IND.IC_PER_FAC - 1e-9));
  });
  it('bez bodů nic, prázdná fronta prázdná mapa', () => {
    expect(queueFlow([{ id: 1, k: 'inf' }], 0).get(1).pts).toBe(0);
    expect(queueFlow([], 100).size).toBe(0);
  });
});
