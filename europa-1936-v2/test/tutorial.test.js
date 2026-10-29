import { describe, it, expect } from 'vitest';
import { createGame, getWorld, build, startResearch, advance } from '../src/engine/index.js';
import { STEPS, currentStep } from '../src/ui/tutorial/steps.js';

const W = getWorld();
const GER = W.ownerIdx.GER;
const ui = (p = {}) => ({ selected: 0, panel: null, indTab: 'build', selDivs: [], ...p });

describe('průvodce', () => {
  it('kroky mají unikátní id, text a podmínku', () => {
    expect(new Set(STEPS.map((s) => s.id)).size).toBe(STEPS.length);
    for (const s of STEPS) { expect(s.text.length).toBeGreaterThan(20); expect(typeof s.done).toBe('function'); }
  });
  it('na začátku je první krok, splněné se odškrtávají a zůstanou odškrtnuté', () => {
    const g = createGame({ player: 'GER' });
    const latched = new Set();
    expect(currentStep(g, ui(), GER, latched)).toBe(0);
    const run = { ...g, paused: false };
    expect(currentStep(run, ui(), GER, latched)).toBe(1);
    expect(currentStep(run, ui({ selected: 12 }), GER, latched)).toBe(2);
    const s1 = build(run, W.provState[W.owners[GER].cap], 'civ');
    expect(currentStep(s1, ui({ selected: 12 }), GER, latched)).toBe(3);
    // latch: po zavření výběru se krok nevrací
    expect(currentStep(s1, ui({ panel: 'industry', indTab: 'prod' }), GER, latched)).toBeGreaterThanOrEqual(4);
    expect(latched.has('select')).toBe(true);
  });
  it('všechny kroky lze splnit a průvodce skončí', () => {
    let g = { ...createGame({ player: 'GER' }), paused: false };
    g = build(g, W.provState[W.owners[GER].cap], 'civ');
    g = startResearch(g, GER, 0, 'pusky2');
    g = { ...g, nat: { ...g.nat, own: g.nat.own.map((o, i) => (i === GER ? { ...o, cur: { id: 'x' } } : o)) }, mil: { ...g.mil, queue: [...g.mil.queue, { o: GER }] } };
    const latched = new Set();
    for (const p of [{ selected: 5 }, { panel: 'industry', indTab: 'prod' }, { selDivs: [1] }, { panel: 'dip' }, { panel: 'doctrine' }]) currentStep(g, ui(p), GER, latched);
    expect(currentStep(g, ui(), GER, latched)).toBe(STEPS.length);
    void advance;
  });
});
