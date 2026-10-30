// Šípy útoku a klikací značky bitev na mapě (M63).
import { describe, it, expect } from 'vitest';
import { drawAttackArrow, UnitLayer } from '../src/ui/map/units.js';

function mockCtx() {
  const calls = [];
  const rec = (n) => (...a) => { calls.push([n, ...a]); };
  const ctx = { calls };
  for (const n of ['beginPath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'closePath', 'stroke', 'fill']) ctx[n] = rec(n);
  return ctx;
}

describe('šíp útoku (M63)', () => {
  it('nakreslí obrys i tělo a hrot (křivka + trojúhelník ve dvou průchodech)', () => {
    const ctx = mockCtx();
    drawAttackArrow(ctx, 0, 0, 100, 40, 4, 1, '#f00');
    const n = (k) => ctx.calls.filter((c) => c[0] === k).length;
    expect(n('quadraticCurveTo')).toBe(2);
    expect(n('fill')).toBe(2);
    expect(n('stroke')).toBe(2);
    expect(n('closePath')).toBe(2);
    const pts = ctx.calls.filter((c) => c[0] === 'lineTo' || c[0] === 'moveTo' || c[0] === 'quadraticCurveTo').flatMap((c) => c.slice(1));
    expect(pts.every(Number.isFinite)).toBe(true);
  });
  it('nulová délka nic nekreslí a šířka neovlivní počet volání', () => {
    const ctx = mockCtx();
    drawAttackArrow(ctx, 5, 5, 5, 5, 4, 1, '#f00');
    expect(ctx.calls.length).toBe(0);
    const a = mockCtx(), b = mockCtx();
    drawAttackArrow(a, 0, 0, 80, 0, 2, 1, '#f00'); drawAttackArrow(b, 0, 0, 80, 0, 9, 2, '#f00');
    expect(a.calls.length).toBe(b.calls.length);
  });
});

describe('klik na značku bitvy (M63)', () => {
  it('pickBattle vrátí id bitvy pod bodem, jinak 0', () => {
    const layer = Object.create(UnitLayer.prototype);
    layer.battleHits = [{ x0: 10, x1: 30, y0: 10, y1: 30, id: 7 }, { x0: 20, x1: 50, y0: 20, y1: 50, id: 9 }];
    expect(layer.pickBattle(15, 15)).toBe(7);
    expect(layer.pickBattle(40, 40)).toBe(9);
    expect(layer.pickBattle(25, 25)).toBe(9);   // překryv: nahoře je později nakreslená
    expect(layer.pickBattle(100, 100)).toBe(0);
    layer.battleHits = undefined;
    expect(layer.pickBattle(1, 1)).toBe(0);
  });
});
