// Pravidla hry (M78): data, tvorba, násobky, účinek na útočnost AI a výkon země hráče, volby v rozhraní.
import { describe, it, expect, beforeEach } from 'vitest';
import { createGame, getWorld, outMult, RULES, RULE_IDS, createRules, ruleOf, ruleMult, declareWar } from '../src/engine/index.js';
import { aiMult } from '../src/engine/ai/core.js';
import { decideStrategy } from '../src/engine/ai/strategy.js';
import { uiStore, gameStore } from '../src/ui/store.js';
import * as A from '../src/ui/actions.js';

const W = getWorld();
const GER = W.ownerIdx.GER, FRA = W.ownerIdx.FRA, PLN = W.ownerIdx.POL;

describe('data a tvorba', () => {
  it('každé pravidlo má název, popis, výchozí hodnotu mezi volbami a aspoň dvě volby', () => {
    expect(RULE_IDS).toEqual(['fog', 'aggr', 'bonus']);
    for (const id of RULE_IDS) {
      const R = RULES[id];
      expect(R.n && R.info, id).toBeTruthy();
      expect(R.opts.length).toBeGreaterThanOrEqual(2);
      expect(R.opts.some(([v]) => v === R.def), id).toBe(true);
    }
  });
  it('createRules doplní výchozí hodnoty a zahodí neplatné', () => {
    expect(createRules(null)).toEqual({ fog: 1, aggr: 1, bonus: 1 });
    expect(createRules({ aggr: 2, bonus: 9, x: 1 })).toEqual({ fog: 1, aggr: 2, bonus: 1 });
  });
  it('ruleMult vrací násobek zvolené volby (1 bez násobku nebo pro neznámé pravidlo)', () => {
    const s = createGame({ player: 'GER', rules: { aggr: 2, bonus: 0 } });
    expect(ruleOf(s, 'aggr')).toBe(2);
    expect(ruleMult(s, 'aggr')).toBe(1.25);
    expect(ruleMult(s, 'bonus')).toBe(0.85);
    expect(ruleMult(s, 'fog')).toBe(1);
    expect(ruleMult(s, 'nic')).toBe(1);
    expect(ruleMult({}, 'aggr')).toBe(1);
  });
});

describe('účinky', () => {
  it('pravidlo Vaše země mění výkon jen hráčovy země', () => {
    const base = createGame({ player: 'GER', aiLevel: 2 });
    const hi = createGame({ player: 'GER', aiLevel: 2, rules: { bonus: 2 } });
    const lo = createGame({ player: 'GER', aiLevel: 2, rules: { bonus: 0 } });
    expect(aiMult(hi, GER)).toBe(1.15);
    expect(aiMult(lo, GER)).toBe(0.85);
    expect(aiMult(hi, FRA)).toBe(1);
    expect(outMult(hi, GER)).toBeCloseTo(outMult(base, GER) * 1.15, 9);
    expect(outMult(lo, GER)).toBeCloseTo(outMult(base, GER) * 0.85, 9);
    expect(outMult(hi, FRA)).toBeCloseTo(outMult(base, FRA), 9);
    expect(aiMult(createGame({ player: null, aiLevel: 3, rules: { bonus: 2 } }), GER)).toBeCloseTo(1.1, 9);   // pozorovatel: jen obtížnost AI
  });
  it('pravidlo Útočnost AI mění převahu, kterou AI potřebuje k útoku', () => {
    const war = (rules) => {
      let s = declareWar(createGame({ player: null, aiLevel: 2, rules }), 'GER', 'POL');
      s = { ...s, dip: { ...s.dip, goal: { ...s.dip.goal, [`${GER}>${PLN}`]: 'conquest' } } };
      return decideStrategy(s, GER).ratioNeed;
    };
    const normal = war({}), careful = war({ aggr: 0 }), bold = war({ aggr: 2 });
    expect(careful).toBeCloseTo(normal / 0.8, 9);
    expect(bold).toBeCloseTo(normal / 1.25, 9);
    expect(bold).toBeLessThan(normal);
  });
});

describe('rozhraní', () => {
  beforeEach(() => { A.goMenu(); uiStore.setState({ ...uiStore.getState(), rules: {} }); });
  it('volby před startem se propíšou do stavu hry', () => {
    A.setAiOptions({ rules: { fog: 0, aggr: 2 } });
    A.startGame('GER');
    expect(gameStore.getState().rules).toEqual({ fog: 0, aggr: 2, bonus: 1 });
    A.goMenu();
    A.setAiOptions({ rules: {} });
    A.startGame('GER');
    expect(gameStore.getState().rules).toEqual({ fog: 1, aggr: 1, bonus: 1 });
  });
});
