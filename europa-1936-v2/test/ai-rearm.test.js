// Zbrojení AI (M65): historická křivka, složení armády, rozdělení výroby podle potřeby, tlak na vojenské továrny, růst armády.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, targetDivs, sizeFactor, desiredMix, tplOfKind, demandSplit, armyPressure, rearmFactor, REARM, REARM_CURVE, divisionCount, validateState, AI,
} from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER, FRA = W.ownerIdx.FRA, SWE = W.ownerIdx.SWE;
const base = (x = {}) => createGame({ player: null, aiLevel: 2, ...x });

describe('křivka zbrojení', () => {
  it('začíná na 1, roste a v září 1939 dosáhne násobku země; potom pomalu dál', () => {
    expect(rearmFactor('GER', 0)).toBe(1);
    let prev = 1;
    for (let d = 100; d <= 1340; d += 100) { const f = rearmFactor('GER', d); expect(f).toBeGreaterThanOrEqual(prev); prev = f; }
    expect(rearmFactor('GER', 1340)).toBeCloseTo(REARM.GER);
    expect(rearmFactor('GER', 1340 + 365)).toBeGreaterThan(REARM.GER);
    expect(rearmFactor('XXX', 1340)).toBeCloseTo(REARM.default);
    expect(REARM_CURVE[0][1]).toBe(0);
    expect(REARM_CURVE[REARM_CURVE.length - 1][1]).toBe(1);
  });
  it('cílový počet divizí: Německo na začátku kolem 25, v září 1939 výrazně víc; menší země rostou méně', () => {
    const s = base();
    expect(targetDivs(s, GER)).toBeGreaterThanOrEqual(24);
    expect(targetDivs(s, GER)).toBeLessThanOrEqual(27);
    const late = { ...s, tick: 24 * 1340 };
    expect(targetDivs(late, GER)).toBeGreaterThanOrEqual(55);
    expect(targetDivs(late, GER) / targetDivs(s, GER)).toBeGreaterThan(targetDivs(late, SWE) / Math.max(1, targetDivs(s, SWE)));
  });
  it('velikost země mění cíl: po připojení států je násobek větší než 1', () => {
    expect(sizeFactor(base(), GER)).toBeCloseTo(1, 1);
    expect(sizeFactor(base({ scenario: '1939' }), GER)).toBeGreaterThan(1.15);
  });
});

describe('složení armády a výroba', () => {
  it('žádané složení má součet 1 a velmoci se motorizují s časem', () => {
    const s = base();
    const sum = (m) => Object.values(m).reduce((a, b) => a + b, 0);
    expect(sum(desiredMix(s, GER))).toBeCloseTo(1);
    const late = desiredMix({ ...s, tick: 24 * 2000 }, GER);
    expect(late.tank || 0).toBeGreaterThan(desiredMix(s, GER).tank || 0);
    expect(late.pesi).toBeLessThan(desiredMix(s, GER).pesi);
    expect(sum(late)).toBeCloseTo(1);
    expect(desiredMix(s, SWE).tank).toBeUndefined();
  });
  it('druhy šablon se přiřadí podle jména a země bez šablony druh nemá', () => {
    const k = tplOfKind(base(), GER);
    expect(k.pesi).toBeGreaterThan(0);
    expect(k.tank).toBeGreaterThan(0);
    expect(tplOfKind(base(), SWE).tank).toBeUndefined();
  });
  it('rozdělení výroby: součet 1, pušky tvoří největší část a druh, kterého je ve skladu hodně, dostane míň', () => {
    const s = base();
    const sp = demandSplit(s, GER, false);
    expect(Object.values(sp).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    expect(sp.pusky).toBeGreaterThan(sp.dela);
    const rich = { ...s, mil: { ...s.mil, stock: s.mil.stock.map((x, o) => (o === GER ? { ...x, pusky: 1e7 } : x)) } };
    expect(demandSplit(rich, GER, false).pusky).toBeLessThan(sp.pusky);
    const war = demandSplit(s, GER, true);
    expect(Object.values(war).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });
  it('tlak zbrojení je 0 při splněném cíli a roste s mezerou', () => {
    const s = base();
    expect(armyPressure(s, GER)).toBeLessThan(0.5);
    const late = { ...s, tick: 24 * 1340 };
    expect(armyPressure(late, GER)).toBeGreaterThan(armyPressure(s, GER));
    expect(armyPressure(late, GER)).toBeLessThanOrEqual(1);
  });
});

describe('růst armády', () => {
  it('za rok AI zvětší armádu směrem k cíli a stav zůstane platný', () => {
    const s0 = base();
    const a = advance(s0, 24 * 365);
    expect(divisionCount(a, 'FRA')).toBeGreaterThan(divisionCount(s0, 'FRA'));
    expect(divisionCount(a, 'FRA')).toBeLessThanOrEqual(targetDivs(a, FRA) + AI.TRAIN_MAX);
    expect(validateState(a)).toBeNull();
  });
});
