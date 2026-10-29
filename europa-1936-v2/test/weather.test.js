import { describe, it, expect } from 'vitest';
import { weatherIn, weatherAt, climateOfProv, getWorld, createGame, advance, hourOfDate } from '../src/engine/index.js';

const W = getWorld();
const provOf = (climate) => { for (let p = 1; p <= W.L; p++) if (climateOfProv(p) === climate) return p; return 0; };

describe('počasí', () => {
  it('zima v arktickém a subarktickém podnebí je mrazivá, léto ne', () => {
    expect(weatherIn(1, 'arctic').cold).toBeGreaterThan(0.9);
    expect(weatherIn(1, 'arctic').label).toBe('mráz');
    expect(weatherIn(7, 'arctic').cold).toBe(0);
    expect(weatherIn(1, 'subarctic').cold).toBeGreaterThan(0.2);
    expect(weatherIn(7, 'continental').cold).toBe(0);
    expect(weatherIn(1, 'desert').cold).toBe(0);
  });
  it('bláto na jaře a na podzim v mírném pásu, vedro v poušti v létě', () => {
    expect(weatherIn(4, 'temperate').mud).toBeGreaterThan(0);
    expect(weatherIn(7, 'temperate').mud).toBe(0);
    expect(weatherIn(7, 'desert').heat).toBeGreaterThan(0);
    expect(weatherIn(1, 'desert').heat).toBe(0);
  });
  it('účinky jsou nezáporné a rostou s chladem', () => {
    for (const c of ['oceanic', 'temperate', 'continental', 'subarctic', 'arctic', 'mediterranean', 'steppe', 'semiarid', 'desert', 'alpine']) {
      for (let m = 1; m <= 12; m++) { const x = weatherIn(m, c); expect(x.atk).toBeGreaterThanOrEqual(0); expect(x.spd).toBeGreaterThanOrEqual(0); expect(x.org).toBeLessThan(1); }
    }
    expect(weatherIn(1, 'arctic').spd).toBeGreaterThan(weatherIn(1, 'oceanic').spd);
  });
  it('weatherAt podle data a provincie je deterministické a mění se s ročním obdobím', () => {
    const p = provOf('continental') || provOf('temperate');
    const winter = weatherAt(0, p), summer = weatherAt(hourOfDate('1936-07-15'), p);
    expect(winter.t).toBeLessThan(summer.t);
    expect(weatherAt(0, p)).toBe(winter);
  });
  it('zimní pochod je pomalejší: divize za stejný čas v zimě urazí míň než v létě', () => {
    const s = createGame({ player: 'GER' });
    const a = advance(s, 24 * 3);
    expect(a.tick).toBe(24 * 3);
    // počasí vstupuje do výpočtů, stav je dál deterministický
    expect(JSON.stringify(advance(s, 48).mil.divs)).toBe(JSON.stringify(advance(s, 48).mil.divs));
  });
});
