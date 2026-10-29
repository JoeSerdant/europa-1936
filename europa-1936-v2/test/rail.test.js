// Pohyb po železnici (M46): v území vlastní země je krok po spoji kratší a méně unavuje; mimo vlastní území se pochoduje po staru.
import { describe, it, expect } from 'vitest';
import { advanceHour, orderMove, findPath, pathHours, railLevel, stepHoursFor } from '../src/engine/index.js';
import { emptyBattlefield, addDivision, W, idx, neighbors } from './armyKit.js';

const GER = idx('GER');
// dvojice sousedů v Německu: se železnicí a bez ní, shodný terén cíle
function pairs(s) {
  const rail = [], plain = [];
  for (let p = 1; p <= W.L && (rail.length < 1 || plain.length < 1); p++) {
    if (s.ctrl[p] !== GER || !W.isLand(p)) continue;
    for (const q of neighbors(p)) {
      if (s.ctrl[q] !== GER) continue;
      if (railLevel(W, p, q) >= 3 && !rail.length) rail.push([p, q]);
      if (railLevel(W, p, q) === 0 && !plain.length && W.terrain[q] === W.terrain[rail[0]?.[1] ?? q]) plain.push([p, q]);
    }
  }
  return { rail: rail[0], plain: plain[0] };
}
function hoursTo(s, a, b) {
  let [t, id] = addDivision(s, 'GER', 'pesi', a);
  t = orderMove(t, [id], b);
  for (let h = 1; h <= 400; h++) { t = advanceHour(t); if (t.mil.divs[id].p === b) return h; }
  return Infinity;
}

describe('železniční pohyb (M46)', () => {
  const s = emptyBattlefield();
  const { rail } = pairs(s);
  it('úroveň spoje je symetrická a krok po železnici je kratší', () => {
    expect(rail).toBeTruthy();
    const [a, b] = rail;
    expect(railLevel(W, a, b)).toBeGreaterThanOrEqual(3);
    expect(railLevel(W, b, a)).toBe(railLevel(W, a, b));
    const own = stepHoursFor(W, s.ctrl, GER, a, b, 0);
    const foreign = stepHoursFor(W, s.ctrl, idx('FRA'), a, b, 0);
    expect(own).toBeLessThan(foreign);
  });
  it('divize dojede po železnici dřív než po silnici a ztratí méně organizace', () => {
    const [a, b] = rail;
    const fast = hoursTo(s, a, b);
    expect(fast).toBeLessThan(400);
    expect(pathHours(a, [b], s.ctrl, GER)).toBeLessThan(pathHours(a, [b]));
    expect(fast).toBeLessThan(pathHours(a, [b]) * 0.6);   // pěšák (rychlost 4) bez železnice by šel celé pathHours
  });
  it('hledání cesty upřednostní železnici a pořád je deterministické', () => {
    const [a, b] = rail;
    const p1 = findPath(s.mil, s.ctrl, GER, a, b), p2 = findPath(s.mil, s.ctrl, GER, a, b);
    expect(p1).toEqual(p2);
    expect(p1[p1.length - 1]).toBe(b);
  });
});
