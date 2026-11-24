// F4: historie natvrdo – vynucené konce válek z kolejí `HIST_STRATEGIES` (datum `force`, počet dní `days`, běžná kapitulace `full`),
// i v občanské válce ve Španělsku („fronty ztuhly“: republika nejpozději 1. 4. 1939 kapituluje a vítěz sjednotí zemi).
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, splitCountry, HIST_CIVIL, declareWar, atWar } from '../src/engine/index.js';
import { armisticeRow, holdoutOf, dipDay } from '../src/engine/dip/day.js';
import { pairKey } from '../src/engine/dip/core.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const SPR = idx('SPR'), NSP = idx('NSP'), GER = idx('GER'), YUG = idx('YUG'), FRA = idx('FRA');
const ids = (names) => names.map((n) => { for (let i = 1; i < W.states.length; i++) if (W.states[i].n === n) return i; return 0; });
const at = (s, day) => ({ ...s, tick: Math.round(day * 24) });
const owned = (s, o) => { let n = 0; for (let i = 1; i < s.stateOwner.length; i++) if (s.stateOwner[i] === o) n++; return n; };
const spain = () => splitCountry(createGame({ player: null, aiLevel: 2 }), SPR, NSP, ids(HIST_CIVIL[0].states), true);

describe('F4: občanská válka ve Španělsku natvrdo', () => {
  it('obě strany vytrvají; republika se nevzdá ani při ztrátě většiny země před zimou 1938/39', () => {
    const s = at(spain(), 600);
    expect(holdoutOf(s, SPR)).toBe(true);
    expect(holdoutOf(s, NSP)).toBe(true);
    const ctrl = s.ctrl.slice();
    let n = 0, total = 0;
    for (let p = 1; p <= W.L; p++) if (s.stateOwner[W.provState[p]] === SPR) { total++; if (n < total * 0.8) { ctrl[p] = NSP; n++; } }
    const d = dipDay({ ...s, ctrl });
    expect(d.dip.cap[SPR]).toBe(0);
  });
  it('1. 4. 1939 republika kapituluje a nacionalisté sjednotí zemi; dřív ne', () => {
    const s = spain();
    expect(armisticeRow(at(s, 1185), SPR)).toBeNull();
    const row = armisticeRow(at(s, 1186), SPR);
    expect(row && row.id).toBe('spr_end');
    const d = dipDay(at(s, 1186));
    expect(d.dip.cap[SPR]).toBe(1);
    expect(owned(d, SPR)).toBe(0);
    expect(owned(d, NSP)).toBeGreaterThan(0);
    expect(atWar(d, 'SPR', 'NSP')).toBe(false);
  });
  it('bez historické AI ani hráčova země se vynucený konec nekoná', () => {
    const s = spain();
    expect(armisticeRow({ ...at(s, 1186), ai: { ...s.ai, hist: 0 } }, SPR)).toBeNull();
    expect(armisticeRow({ ...at(s, 1186), player: 'SPR' }, SPR)).toBeNull();
  });
});

describe('F4: pády zemí k historickému datu', () => {
  it('Francie: 22. 6. 1940 běžná kapitulace (konference a exil), dřív jen bojem', () => {
    const s = declareWar(createGame({ player: null, aiLevel: 2 }), 'GER', 'FRA');
    expect(armisticeRow(at(s, 1633), FRA)).toBeNull();
    expect(armisticeRow(at(s, 1634), FRA).full).toBe(true);
    const d = dipDay(at(s, 1634));
    expect(d.dip.cap[FRA]).toBe(1);
  });
  it('Jugoslávie: 12 dní po vstupu Německa do války', () => {
    let s = declareWar(createGame({ player: null, aiLevel: 2 }), 'GER', 'YUG');
    s = at(s, 1950);
    s = { ...s, dip: { ...s.dip, since: { ...s.dip.since, [pairKey(GER, YUG)]: s.tick } } };
    expect(armisticeRow(at(s, 1961), YUG)).toBeNull();
    expect(armisticeRow(at(s, 1962), YUG).id).toBe('yug_fall');
  });
});
