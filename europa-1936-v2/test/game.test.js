import { describe, it, expect } from 'vitest';
import {
  createGame, GAME_VERSION, setPlayer, setSpeed, setPaused, togglePause, changeSpeed, transferState, advance, advanceHour, hoursForElapsed,
  getWorld, provinceOwner, provincesByOwner, countryStats, allCountries, dateText, clockText, ownerTagOf,
} from '../src/engine/index.js';
import { COUNTRIES } from '../src/data/countries.js';

const W = getWorld();

describe('počáteční stav', () => {
  it('je čistý JSON a překlopí se tam a zpět beze změny', () => {
    const s = createGame({ player: 'GER' });
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    expect(s.v).toBe(GAME_VERSION);
    expect(s.tick).toBe(0);
    expect(s.paused).toBe(true);
  });
  it('vlastníci a kontrola odpovídají světu', () => {
    const s = createGame();
    for (let p = 1; p <= W.L; p++) {
      expect(provinceOwner(s, p)).toBe(W.provOwner0[p]);
      expect(s.ctrl[p]).toBe(W.provOwner0[p]);
    }
  });
  it('odmítne neznámou zemi', () => {
    expect(() => createGame({ player: 'XXX' })).toThrow();
  });
  it('každá země ze světa má popis, vůdce a vlajku', () => {
    for (const c of allCountries()) {
      const d = COUNTRIES[c.tag];
      expect(d, c.tag).toBeTruthy();
      expect(d.leader).toBeTruthy();
      expect(d.blurb.length).toBeGreaterThan(30);
      expect(d.flag.length).toBeGreaterThan(0);
      expect([1, 2, 3]).toContain(d.tier);
      expect(d.diff).toBeGreaterThanOrEqual(1);
      expect(d.diff).toBeLessThanOrEqual(5);
    }
    expect(Object.keys(COUNTRIES).length).toBe(allCountries().length);
  });
});

describe('příkazy', () => {
  it('neplatný vstup vrací tentýž objekt', () => {
    const s = createGame();
    expect(setPlayer(s, 'XXX')).toBe(s);
    expect(setPlayer(s, null)).toBe(s);
    expect(setSpeed(s, 0)).toBe(s);
    expect(setSpeed(s, 9)).toBe(s);
    expect(setSpeed(s, 1.5)).toBe(s);
    expect(setSpeed(s, s.speed)).toBe(s);
    expect(setPaused(s, true)).toBe(s);
    expect(transferState(s, 99999, 'GER')).toBe(s);
    expect(transferState(s, 1, 'XXX')).toBe(s);
  });
  it('mění stav neměnně (původní objekt zůstane)', () => {
    const s = createGame();
    const t = setPlayer(s, 'FRA');
    expect(t).not.toBe(s);
    expect(s.player).toBe(null);
    expect(t.player).toBe('FRA');
    const u = setSpeed(t, 5);
    expect(u.speed).toBe(5);
    expect(t.speed).toBe(3);
    expect(togglePause(u).paused).toBe(false);
    expect(changeSpeed(u, 1)).toBe(u);   // na stropu
    expect(changeSpeed(u, -2).speed).toBe(3);
  });
  it('převod státu změní vlastníka i kontrolu a zvýší verzi', () => {
    const s = createGame();
    const dk = W.ownerIdx.DEN, gr = W.ownerIdx.GER;
    const st = W.land[W.owners[dk].cap].s;
    const t = transferState(s, st, 'GER');
    expect(t.stateOwner[st]).toBe(gr);
    for (const p of W.states[st].v) { expect(provinceOwner(t, p)).toBe(gr); expect(t.ctrl[p]).toBe(gr); }
    expect(t.ownerVer).toBe(s.ownerVer + 1);
    expect(s.stateOwner[st]).toBe(dk);          // původní beze změny
    expect(transferState(t, st, 'GER')).toBe(t); // už tam je
    expect(countryStats(t, 'DEN').provinces).toBe(countryStats(s, 'DEN').provinces - W.states[st].v.length);
  });
});

describe('čas', () => {
  it('advance je deterministický a čistý', () => {
    const s = createGame();
    const a = advance(s, 100), b = advance(advance(s, 40), 60);
    expect(a.tick).toBe(100);
    expect(b).toEqual(a);
    expect(s.tick).toBe(0);
    expect(advance(s, 0)).toBe(s);
    expect(advance(s, -3)).toBe(s);
    expect(advance(s, 1.5)).toBe(s);
    expect(advanceHour(s).tick).toBe(1);
  });
  it('datum začíná 1. ledna 1936 a plyne po hodinách', () => {
    const s = createGame();
    expect(dateText(s)).toBe('1. ledna 1936');
    expect(clockText(s)).toBe('00:00');
    expect(dateText(advance(s, 24 * 31))).toBe('1. února 1936');
    expect(clockText(advance(s, 13))).toBe('13:00');
  });
  it('převod reálného času na herní hodiny nese zlomky', () => {
    let s = createGame();
    expect(hoursForElapsed(s, 1000).hours).toBe(0);      // pauza
    s = setPaused(s, false);
    s = setSpeed(s, 2);                                   // 24 h/s
    const r1 = hoursForElapsed(s, 16);                    // 0,384 h
    expect(r1.hours).toBe(0);
    const r2 = hoursForElapsed(s, 16, r1.carry);
    expect(r2.hours + r2.carry).toBeCloseTo(0.768, 5);
    expect(hoursForElapsed(s, 1000).hours).toBe(24);
  });
});

describe('dotazy', () => {
  it('souhrny zemí dávají smysl a nic nechybí', () => {
    const s = createGame();
    let total = 0;
    for (const c of allCountries()) {
      const st = countryStats(s, c.tag);
      expect(st.provinces, c.tag).toBeGreaterThan(0);
      total += st.provinces;
    }
    expect(total).toBe(W.L);
    const ger = countryStats(s, 'GER');
    expect(ger.pop).toBeGreaterThan(60000);
    expect(ger.vp).toBeGreaterThan(100);
    expect(ownerTagOf(provinceOwner(s, ger.capital))).toBe('GER');
    expect(provincesByOwner(s)).toBe(provincesByOwner(s));   // cache
  });
});
