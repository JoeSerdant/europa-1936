// Základní fronta hráče (F2 B2): ve hře s AI dostanou hráčovy armády bez plánu při vstupu do války automatickou obranu (a armáda nejblíž
// hlavnímu městu hájí metropoli); v míru už tehdy, když proti hráči někdo ospravedlňuje válku; plán zadaný hráčem se nepřepisuje.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, declareWar, advance, setPlan } from '../src/engine/index.js';

const W = getWorld();
const POL = W.ownerIdx.POL, GER = W.ownerIdx.GER;
const polish = (s) => s.mil.armies.map((a, id) => ({ a, id })).filter(({ a }) => a && a.o === POL);

describe('základní fronta hráče', () => {
  it('při vstupu do války dostanou armády automatický plán Hájit oblast, jedna hájí hlavní město', () => {
    const s = declareWar(createGame({ player: 'POL', aiLevel: 2 }), 'GER', 'POL');
    const list = polish(s);
    expect(list.length).toBeGreaterThan(1);
    for (const { a } of list) expect(a.plan).toMatchObject({ k: 'area', auto: true });
    expect(list.some(({ a }) => a.plan.area.includes(W.owners[POL].cap))).toBe(true);
  });
  it('bez AI zemí (engine v testech) se hráčovy armády samy nehýbou', () => {
    const s = declareWar(createGame({ player: 'POL' }), 'GER', 'POL');
    for (const { a } of polish(s)) expect(a.plan).toBe(null);
  });
  it('v míru se fronta postaví, jakmile proti hráči někdo ospravedlňuje válku', () => {
    let s = createGame({ player: 'POL', aiLevel: 2 });
    s = { ...s, dip: { ...s.dip, just: [...s.dip.just, { a: GER, b: POL, g: 'conquest', ready: s.tick + 24 * 30 }] } };
    s = advance(s, 24);
    for (const { a } of polish(s)) expect(a.plan).toMatchObject({ k: 'area', auto: true });
  });
  it('plán zadaný hráčem se nepřepisuje', () => {
    let s = createGame({ player: 'POL', aiLevel: 2 });
    const [first] = polish(s);
    const mine = W.states[W.provState[W.owners[POL].cap]].v.slice(0, 2);
    s = setPlan(s, first.id, { k: 'area', area: mine });
    s = declareWar(s, 'GER', 'POL');
    expect(s.mil.armies[first.id].plan.auto).toBeFalsy();
    expect(s.mil.armies[first.id].plan.area).toEqual(mine);
  });
});
