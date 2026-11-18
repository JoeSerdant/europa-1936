// Lišta armád (M102): data karet armád hráče – zkratky, stav plánu, souhrny po skupinách, divize bez armády.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, createArmy } from '../src/engine/index.js';
import { armyCards, shortName, planState } from '../src/ui/army/armybar.js';

const W = getWorld();

describe('lišta armád', () => {
  it('zkratka a stav plánu', () => {
    expect(shortName('1. armáda')).toBe('1.');
    expect(shortName('12. armáda')).toBe('12.');
    expect(shortName('Africký sbor')).toBe('AS');
    expect(planState(null)).toBe('');
    expect(planState({ k: 'area', area: [1] })).toBe('area');
    expect(planState({ k: 'front', line: [1], to: [] })).toBe('front');
    expect(planState({ k: 'front', line: [1], to: [2] })).toBe('attack');
    expect(planState({ k: 'front', line: [1], to: [2], loc: 1 })).toBe('front');
  });
  it('karty armád Německa: skupiny, počty, souhrn síly; nová armáda z volných divizí přibude', () => {
    const s = createGame({ player: 'GER' });
    const me = W.ownerIdx.GER;
    const d = armyCards(s, me);
    const cards = [...d.groups.flatMap((g) => g.cards), ...d.loose];
    expect(cards.length).toBeGreaterThan(0);
    for (const c of cards) {
      expect(c.n).toBe(c.divs.length);
      expect(c.hp).toBeGreaterThan(0.5); expect(c.hp).toBeLessThanOrEqual(1);
      expect(c.short.length).toBeGreaterThan(0);
      expect(['inf', 'mot', 'arm', 'cav', 'mtn']).toContain(c.cls);
    }
    const total = cards.reduce((a, c) => a + c.n, 0) + d.free.length;
    expect(total).toBe(s.mil.divs.filter((x) => x && x.o === me).length);
    expect(armyCards(s, 0).groups).toEqual([]);
    if (d.free.length) {
      const t = createArmy(s, 'GER', '', d.free.slice(0, 2));
      const e = armyCards(t, me);
      expect(e.free.length).toBe(d.free.length - 2);
    }
  });
});
