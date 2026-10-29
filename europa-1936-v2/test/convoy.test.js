import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, tradeRoute, tradeStatus, convoysOf, transportsOf, routeRisk, needOf, addTrade, declareWar, formFleet, runCheat, packGame, unpackGame, NAV,
} from '../src/engine/index.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const withSea = (s) => addTrade(addTrade(s, idx('SWE'), idx('ENG'), 'ocel', 8), idx('HOL'), idx('ENG'), 'guma', 4);

describe('konvoje: trasy a potřeba lodí', () => {
  const s0 = withSea(createGame({ player: 'GER' }));
  it('sousedé obchodují po souši, země přes moře po moři', () => {
    const sea = tradeRoute(s0, idx('SWE'), idx('ENG'));
    expect(sea.sea).toBe(true);
    expect(sea.ok).toBe(true);
    expect(sea.seas.length).toBeGreaterThan(1);
    expect(needOf(sea, 6)).toBeGreaterThan(needOf(sea, 1));
    expect(needOf({ sea: false }, 6)).toBe(0);
    expect(tradeRoute(s0, idx('GER'), idx('POL')).sea).toBe(false);
  });
  it('dovozce potřebuje transportní lodě a při nedostatku se dodávky zmenšují', () => {
    const c = convoysOf(s0, idx('ENG'));
    expect(c.need).toBeGreaterThan(0);
    expect(c.total).toBeGreaterThan(c.need);
    expect(c.factor).toBe(1);
    const pool = s0.nav.pool.slice(); pool[idx('ENG')] = { ...pool[idx('ENG')], tr: 0 };
    const fleets = s0.nav.fleets.map((f) => (f && f.o === idx('ENG') ? { ...f, ships: { ...f.ships, tr: 0 } } : f));
    const poor = { ...s0, nav: { ...s0.nav, pool, fleets } };
    expect(convoysOf(poor, idx('ENG')).factor).toBe(0);
    const day = advance({ ...poor, tick: 0 }, 24);
    for (const t of tradeStatus(day, idx('ENG')).filter((x) => x.d.to === idx('ENG') && x.route.sea)) expect(t.d.got).toBe(0);
  });
  it('volné transportní lodě klesají o konvoje', () => {
    const t = transportsOf(s0, idx('ENG'));
    expect(t.convoys).toBeGreaterThan(0);
    expect(t.free).toBe(t.total - t.used);
  });
});

describe('konvoje: obchodní válka', () => {
  it('nepřátelská flotila na trase zvedá riziko a potápí konvoje; eskorta riziko snižuje', () => {
    let s = withSea(createGame({ player: 'GER' }));
    s = declareWar(s, 'GER', 'ENG');
    const route = tradeRoute(s, idx('SWE'), idx('ENG'));
    const label = route.seas[Math.floor(route.seas.length / 2)];
    expect(routeRisk(s, route, idx('SWE'), idx('ENG'))).toBe(0);
    const raiders = { ...s, nav: { ...s.nav, fleets: [...s.nav.fleets, { o: idx('GER'), nm: 'Nájezdníci', p: label, ships: { ss: 10 }, c: {}, mx: 60, to: 0, path: [], prog: 0 }] } };
    const risk = routeRisk(raiders, route, idx('SWE'), idx('ENG'));
    expect(risk).toBeGreaterThan(0);
    const escorted = { ...raiders, nav: { ...raiders.nav, fleets: [...raiders.nav.fleets, { o: idx('ENG'), nm: 'Eskorta', p: label, ships: { dd: 6 }, c: {}, mx: 60, to: 0, path: [], prog: 0 }] } };
    expect(routeRisk(escorted, route, idx('SWE'), idx('ENG'))).toBeLessThan(risk);
    const before = transportsOf(raiders, idx('ENG')).total;
    const after = transportsOf(advance({ ...raiders, tick: 0 }, 24 * 10), idx('ENG')).total;
    expect(after).toBeLessThan(before);
  });
  it('smlouva mezi válčícími zeměmi se přeruší a nová smlouva po moři funguje', () => {
    const s = createGame({ player: 'GER' });
    const d = addTrade(s, idx('SWE'), idx('ENG'), 'ocel', 3);
    expect(d).not.toBe(s);
    expect(addTrade(declareWar(s, 'SWE', 'ENG'), idx('SWE'), idx('ENG'), 'ocel', 3).ind.trade.length).toBe(s.ind.trade.length);
  });
  it('stav je serializovatelný a deterministický', () => {
    const s = declareWar(withSea(createGame({ player: 'GER' })), 'GER', 'ENG');
    const a = advance(s, 24 * 5), b = advance(s, 24 * 5);
    expect(JSON.stringify(a.nav)).toBe(JSON.stringify(b.nav));
    expect(unpackGame(JSON.parse(JSON.stringify(packGame(a)))).error).toBeUndefined();
    expect(NAV.CONVOY_AMT).toBeGreaterThan(0);
    void formFleet; void runCheat;
  });
});
