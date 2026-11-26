// UI2: rozpisy hodnot horní lišty – součet zdrojů odpovídá bonusům enginu a cíl stability sedí.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, polModsOf } from '../src/engine/index.js';
import { modSources, targetBreakdown, ppBreakdown, manBreakdown, facBreakdown, fuelBreakdown, convoyBreakdown, logBreakdown } from '../src/ui/hud/breakdown.js';
import { targetsOf } from '../src/engine/politics/day.js';

describe('UI2: rozpisy horní lišty', () => {
  const s = createGame({ player: 'GER' });
  const w = getWorld();
  it('zdroje bonusů sečtené dávají polModsOf (stabilita, podpora války, lidská síla, výroba)', () => {
    for (const tag of ['GER', 'SOV', 'ENG', 'FRA', 'USA', 'POL']) {
      const o = w.ownerIdx[tag], m = polModsOf(s, o);
      for (const k of ['stab', 'ws', 'man', 'prod']) {
        const sum = modSources(s, o, k).reduce((a, r) => a + r.v, 0);
        expect(sum).toBeCloseTo(m[k] || 0, 6);
      }
    }
  });
  it('rozpis stability a podpory války ukazuje cíl enginu a řádky', () => {
    const o = w.ownerIdx.GER;
    const st = targetBreakdown(s, o, 'stab'), ws = targetBreakdown(s, o, 'ws');
    const t = targetsOf(s, o, s.pol.own[o], 0);
    expect(st.target).toBeCloseTo(t.stab, 6);
    expect(ws.target).toBeCloseTo(t.ws, 6);
    expect(st.rows[0].n).toBe('Základ');
    expect(st.effects.length).toBeGreaterThan(0);
  });
  it('ostatní rozpisy mají titulek, řádky a popis', () => {
    const o = w.ownerIdx.GER;
    for (const b of [ppBreakdown(s, o), manBreakdown(s, o), facBreakdown(s, o), fuelBreakdown(s, o), convoyBreakdown(s, o), logBreakdown(s, o)]) {
      expect(b.title.length).toBeGreaterThan(3);
      expect(b.rows.length).toBeGreaterThan(1);
      expect(b.text.length).toBeGreaterThan(20);
      for (const r of b.rows) expect(typeof r.v).toBe('string');
    }
  });
});
