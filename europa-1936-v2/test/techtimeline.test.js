// Strom výzkumu jako časová osa (M60): každá technologie má vlastní místo, předpoklady jsou vlevo nebo ve stejném sloupci, nic se nepřekrývá.
import { describe, it, expect } from 'vitest';
import { TECHS, CAT_IDS, TECH_IDS } from '../src/engine/index.js';
import { layoutOf, Y0 } from '../src/ui/research/layout.js';

describe('časová osa výzkumu (M60)', () => {
  for (const cat of CAT_IDS) {
    it(`obor ${cat}: unikátní polohy, sloupec podle roku, předpoklady ne vpravo`, () => {
      const items = TECH_IDS.filter((id) => TECHS[id].cat === cat).map((id) => ({ id, ...TECHS[id] }));
      const { pos, lanes } = layoutOf(items);
      expect(Object.keys(pos).length).toBe(items.length);
      const seen = new Set();
      for (const t of items) {
        const q = pos[t.id];
        expect(q.col).toBe(t.year - Y0);
        expect(q.lane).toBeLessThan(lanes);
        const k = `${q.col}:${q.lane}`;
        expect(seen.has(k)).toBe(false); seen.add(k);
        for (const r of t.req) if (TECHS[r].cat === cat) expect(pos[r].col).toBeLessThanOrEqual(q.col);
      }
    });
  }
  it('rozložení je deterministické', () => {
    const items = TECH_IDS.map((id) => ({ id, ...TECHS[id] })).filter((t) => t.cat === 'tanky');
    expect(layoutOf(items)).toEqual(layoutOf([...items].reverse()));
  });
});
