// Okno bitvy (M61): selektor battleView – strany, velitelé, fronta a záloha, neexistující bitva.
import { describe, it, expect } from 'vitest';
import { battleView, advance, declareWar, orderMove, getWorld } from '../src/engine/index.js';
import { emptyBattlefield, addDivision, realBorder, giveSides, idx } from './armyKit.js';

describe('okno bitvy (M61)', () => {
  it('neexistující bitva je null', () => {
    expect(battleView(emptyBattlefield('GER'), 5)).toBeNull();
  });
  it('bitva o provincii má obě strany se silou, organizací a rozdělením fronta / záloha', () => {
    const pair = realBorder ? realBorder('GER', 'POL') : null;
    expect(pair).toBeTruthy();
    let s = declareWar(emptyBattlefield('GER'), 'GER', 'POL');
    const [a, b] = Array.isArray(pair) ? pair : [pair.from, pair.to];
    let x, y;
    [s, x] = addDivision(s, 'GER', 'pesi', a);
    [s, y] = addDivision(s, 'POL', 'pesi', b);
    s = orderMove(s, [x], b);
    s = advance(s, 6);
    const bat = s.mil.battles[0];
    expect(bat).toBeTruthy();
    const v = battleView(s, bat.id);
    expect(v.p).toBe(b);
    expect(v.att.units.map((u) => u.id)).toContain(x);
    expect(v.dep.units.map((u) => u.id)).toContain(y);
    expect(v.att.hp).toBeGreaterThan(0);
    expect(v.dep.org).toBeGreaterThan(0);
    expect(v.adv).toBeGreaterThanOrEqual(0);
    expect(v.adv).toBeLessThanOrEqual(1);
    expect(v.att.units.every((u) => typeof u.front === 'boolean')).toBe(true);
    expect(getWorld().terrain[b]).toBe(v.terrain);
    void giveSides; void idx;
  });
});
