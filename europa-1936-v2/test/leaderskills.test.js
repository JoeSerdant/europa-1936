// Dovednost velitelů Manévr (M54): vznik z hashe jména, vliv na rychlost a obnovu organizace, postup úrovní, uložení.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, genMods, genLevel, advance, validateState, packGame, unpackGame, ARMY } from '../src/engine/index.js';

const W = getWorld();
const gensOf = (s) => s.mil.gens.filter(Boolean);

describe('dovednost Manévr (M54)', () => {
  const s = createGame({ player: 'GER' });
  it('každý velitel má manévr v mezích a hra je deterministická', () => {
    const list = gensOf(s);
    expect(list.length).toBeGreaterThan(50);
    for (const g of list) { expect(g.mn).toBeGreaterThanOrEqual(1); expect(g.mn).toBeLessThanOrEqual(ARMY.LEADER_MAX_SKILL); }
    const again = gensOf(createGame({ player: 'GER' }));
    expect(again.map((g) => g.mn)).toEqual(list.map((g) => g.mn));
    expect(new Set(list.map((g) => g.mn)).size).toBeGreaterThan(2);
  });
  it('manévr zvyšuje rychlost a obnovu organizace a úroveň', () => {
    const base = { o: 1, nm: 'X', r: 'L', a: 3, d: 3, pl: 3, lg: 3, tr: [], xp: 0 };
    const lo = genMods({ ...base, mn: 1 }), hi = genMods({ ...base, mn: 6 });
    expect(hi.speed).toBeGreaterThan(lo.speed);
    expect(hi.orgRegen).toBeGreaterThan(lo.orgRegen);
    expect(hi.atk).toBe(lo.atk);
    expect(genLevel({ ...base, mn: 6 })).toBe(genLevel({ ...base, mn: 1 }) + 5);
    expect(genLevel({ a: 1, d: 1, pl: 1, lg: 1, mn: 1 })).toBe(1);
  });
  it('uložení zachová dovednost a stav zůstane platný po simulaci', () => {
    const t = advance(s, 24 * 5);
    expect(validateState(t)).toBeNull();
    expect(unpackGame(JSON.parse(JSON.stringify(packGame(t)))).state.mil.gens.filter(Boolean).map((g) => g.mn)).toEqual(gensOf(t).map((g) => g.mn));
    void W;
  });
});
