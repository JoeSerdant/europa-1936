// S5a: konstrukční kanceláře – najmutí, zkušenosti z výroby, úrovně a násobky výzbroje.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, GAME_VERSION, validateState, hireBureau, bureauBlock, bureausOf, bureauNeed, BUREAUS, BUREAU, BUREAU_CATS } from '../src/engine/index.js';
import { multOf } from '../src/engine/design/core.js';
import { itemCost } from '../src/engine/industry/core.js';
import { bureauDay } from '../src/engine/design/bureau.js';
import { aiBureaus } from '../src/engine/ai/bureau.js';
import { EQUIP } from '../src/data/army/index.js';
import { statsOf } from '../src/engine/army/unit.js';

const W = getWorld();
const GER = W.ownerIdx.GER;
const withPp = (s, o, pp) => { const own = s.pol.own.slice(); own[o] = { ...own[o], pp }; return { ...s, pol: { ...s.pol, own } }; };

describe('S5a: konstrukční kanceláře', () => {
  const s0 = withPp(createGame({ player: 'GER' }), GER, 300);
  it('data: každá kancelář patří do oboru, obory pokrývají existující výzbroj', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(59);
    for (const id in BUREAUS) expect(BUREAU_CATS[BUREAUS[id].cat], id).toBeTruthy();
    for (const c in BUREAU_CATS) expect(Object.values(BUREAUS).some((b) => b.cat === c && b.ai), c).toBe(true);
    expect(EQUIP.pusky).toBeTruthy();
  });
  it('najmutí stojí politickou moc a zlevní výrobu oboru; jiný obor beze změny', () => {
    expect(bureauBlock(s0, GER, 'nic')).toMatch(/Neznámá/);
    const s = hireBureau(s0, GER, 'inf_lisovna');
    expect(s.pol.own[GER].pp).toBe(300 - BUREAU.PP);
    expect(bureauBlock(s, GER, 'inf_lisovna')).toMatch(/už/);
    expect(itemCost('pusky', s.mil.lv[GER])).toBeLessThan(itemCost('pusky', s0.mil.lv[GER]));
    expect(itemCost('ltanky', s.mil.lv[GER])).toBe(itemCost('ltanky', s0.mil.lv[GER]));
    expect(multOf(s.mil.lv[GER], 'pusky').cost).toBeCloseTo(1 + BUREAUS.inf_lisovna.per.cost, 6);
    expect(validateState(s)).toBeNull();
  });
  it('útočná kancelář zvedne útok pěchotních divizí', () => {
    const s = hireBureau(s0, GER, 'inf_strelna');
    const d = s.mil.divs.find((x) => x && x.o === GER);
    expect(statsOf(s.mil, d).soft).toBeGreaterThan(statsOf(s0.mil, d).soft);
  });
  it('zkušenosti z továren na linkách oboru zvednou úroveň kanceláře', () => {
    let s = hireBureau(s0, GER, 'inf_lisovna');
    const before = multOf(s.mil.lv[GER], 'pusky').cost;
    for (let i = 0; i < 400 && s.mil.lv[GER].bu.inf.lv < 2; i++) s = bureauDay(s);
    expect(s.mil.lv[GER].bu.inf.lv).toBe(2);
    expect(multOf(s.mil.lv[GER], 'pusky').cost).toBeLessThan(before);
    const v = bureausOf(s, GER).find((x) => x.cat === 'inf');
    expect(v.need).toBe(bureauNeed(2));
  });
  it('AI si najme kancelář s levnější výrobou v oboru, ve kterém vyrábí', () => {
    let s = withPp(createGame({ player: null, aiLevel: 2 }), GER, 300);
    for (let d = 0; d < 31 && !((s.mil.lv[GER] || {}).bu); d++) s = aiBureaus({ ...s, tick: d * 24 }, GER);
    const bu = s.mil.lv[GER].bu;
    expect(bu).toBeTruthy();
    expect(Object.values(bu).every((b) => BUREAUS[b.id].ai)).toBe(true);
  });
});
