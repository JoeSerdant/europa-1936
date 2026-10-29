import { describe, it, expect } from 'vitest';
import { createGame, getWorld, advance, atWar, divisionCount, industryOf, airOf, packGame, unpackGame, formatDate, SCENARIOS, validateState, hasCapitulated, isUnlocked } from '../src/engine/index.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];

describe('scénáře', () => {
  it('1936 je základ beze změny', () => {
    const a = createGame({ player: 'GER' }), b = createGame({ player: 'GER', scenario: '1936' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(createGame({ scenario: 'neexistuje' }).tick).toBe(0);
  });
  const s = createGame({ player: 'GER', scenario: '1939' });
  it('1939: datum, válka, bloky a zaniklé země', () => {
    expect(s.tick).toBe(SCENARIOS[1939].tick);
    expect(formatDate(s.tick)).toMatch(/1939/);
    expect(atWar(s, 'GER', 'POL')).toBe(true);
    expect(atWar(s, 'ENG', 'GER')).toBe(true);
    expect(atWar(s, 'FRA', 'GER')).toBe(true);
    for (const t of ['AUS', 'CZE', 'ALB']) expect(hasCapitulated(s, idx(t))).toBe(true);
    expect(s.dip.facs.filter(Boolean).map((f) => f.nm).sort()).toEqual(['Osa Berlín–Řím', 'Spojenci']);
    expect(s.dip.fac[idx('FRA')]).toBe(s.dip.fac[idx('ENG')]);
    expect(validateState(s)).toBe(null);
  });
  it('1939: státy přešly na nové vlastníky, jejich jednotky zanikly', () => {
    for (let st = 1; st < W.states.length; st++) {
      const t = W.owners[W.stateOwner0[st]].tag;
      if (t === 'AUS') expect(s.stateOwner[st]).toBe(idx('GER'));
      if (t === 'ALB') expect(s.stateOwner[st]).toBe(idx('ITA'));
      if (W.states[st].n === 'Podkarpatská Rus') expect(s.stateOwner[st]).toBe(idx('HUN'));
    }
    for (const d of s.mil.divs) if (d) expect([idx('AUS'), idx('CZE'), idx('ALB')]).not.toContain(d.o);
  });
  it('1939: země jsou silnější než v roce 1936 (divize, továrny, letectvo, technologie)', () => {
    const base = createGame({ player: 'GER' });
    const g = idx('GER');
    expect(divisionCount(s, g)).toBeGreaterThan(divisionCount(base, g) * 1.8);
    expect(industryOf(s, g).mil).toBeGreaterThan(industryOf(base, g).mil * 1.8);
    expect(airOf(s, g).total).toBeGreaterThan(airOf(base, g).total * 1.5);
    expect(isUnlocked(s, g, 'mtank')).toBe(true);
    expect(isUnlocked(base, g, 'mtank')).toBe(false);
    expect(s.pol.own[g].pp).toBeGreaterThan(base.pol.own[g].pp);
  });
  it('1939: hra běží, je deterministická a uložitelná', () => {
    const ai = createGame({ player: 'GER', scenario: '1939', aiLevel: 2 });
    const a = advance(ai, 24 * 20), b = advance(ai, 24 * 20);
    expect(a.tick).toBe(ai.tick + 24 * 20);
    expect(JSON.stringify(a.mil.wars)).toBe(JSON.stringify(b.mil.wars));
    expect(a.mil.battles.length).toBeGreaterThanOrEqual(0);
    expect(unpackGame(JSON.parse(JSON.stringify(packGame(a)))).error).toBeUndefined();
  });
});
