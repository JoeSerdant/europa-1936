import { describe, it, expect } from 'vitest';
import { createGame, worldTension } from '../src/engine/index.js';

describe('napětí ve světě', () => {
  it('je v rozsahu 0–1, s časem roste a je čistou funkcí stavu', () => {
    const s0 = createGame({ player: 'GER' });
    const t0 = worldTension(s0);
    expect(t0).toBeGreaterThan(0);
    expect(t0).toBeLessThan(0.2);
    expect(worldTension(s0)).toBe(t0);
    const s1 = { ...s0, tick: 24 * 365 * 2 };
    expect(worldTension(s1)).toBeGreaterThan(t0);
    expect(worldTension({ ...s0, tick: 24 * 365 * 100 })).toBe(1);
  });
  it('válka napětí zvyšuje', () => {
    const s0 = createGame({ player: 'GER' });
    const w = { ...s0, mil: { ...s0.mil, wars: [...s0.mil.wars, [1, 2]] } };
    expect(worldTension(w)).toBeGreaterThan(worldTension(s0));
  });
});
