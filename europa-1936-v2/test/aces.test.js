// Letečtí esa (M52): vznik ve vzdušných bojích, strop, vliv na sílu hlídek, determinismus.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, advance, declareWar, AIR, ACE_NAMES, validateState } from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER, POL = W.ownerIdx.POL;
const aceSum = (s, o) => s.air.wings.filter((w) => w && w.o === o).reduce((a, w) => a + (w.a || 0), 0);

describe('letečtí esa (M52)', () => {
  it('nová křídla začínají bez es a konstanty jsou rozumné', () => {
    const s = createGame({ player: 'GER' });
    expect(s.air.wings.filter(Boolean).every((w) => w.a === 0)).toBe(true);
    expect(ACE_NAMES.length).toBe(AIR.ACE_MAX + 1);
  });
  it('ve válce se stíhači střetnou a esa vzniknou, nikdy nad strop', () => {
    let s = createGame({ player: 'GER', aiLevel: 0 });
    // stíhací křídla obou stran hlídkují nad nepřítelem
    const wings = s.air.wings.map((w) => w);
    const polBase = s.air.wings.find((w) => w && w.o === POL && w.t === 'sti').s;
    for (const w of wings) if (w && w.t === 'sti' && (w.o === GER || w.o === POL)) wings[w.id] = { ...w, m: 'air', to: w.o === GER ? polBase : w.s };
    s = declareWar({ ...s, air: { ...s.air, wings } }, 'GER', 'POL');
    const t = advance(s, 24 * 60);
    expect(aceSum(t, GER) + aceSum(t, POL)).toBeGreaterThan(0);
    for (const w of t.air.wings) if (w) expect(w.a || 0).toBeLessThanOrEqual(AIR.ACE_MAX);
    expect(validateState(t)).toBeNull();
    const u = advance(s, 24 * 60);
    expect(JSON.stringify(u.air.wings)).toBe(JSON.stringify(t.air.wings));
  });
  it('bez války esa nevznikají', () => {
    const t = advance(createGame({ player: 'GER' }), 24 * 30);
    expect(aceSum(t, GER)).toBe(0);
  });
});
