// Herní čas po snímcích (F2 A2): hodina jako generátor s přestávkami dává stejný výsledek jako `advance`; hodiny po snímcích s rozpočtem času
// (i po jednom kroku za snímek) dojdou ke stejnému stavu; změna stavu uprostřed rozpracované hodiny ji spustí znovu; nevyřízené hodiny mají strop.
import { describe, it, expect } from 'vitest';
import { createGame, advance, advanceHour, hourSteps, declareWar, setSpeed } from '../src/engine/index.js';
import { createClock, backlogMax } from '../src/ui/clock.js';

const war = () => {
  let s = createGame({ player: 'FRA', aiLevel: 2, seed: 5 });
  s = advance(s, 23);   // hodina před půlnocí: další hodina má denní krok armády i AI
  return declareWar(s, 'GER', 'POL');
};

describe('hodina jako generátor', () => {
  it('o půlnoci dává přestávky a výsledek je stejný jako advanceHour', () => {
    const s = war();
    const g = hourSteps(s);
    let r = g.next(), pauses = 0;
    while (!r.done) { pauses++; r = g.next(); }
    expect(pauses).toBeGreaterThan(5);   // AI po zemích, plány po armádách
    expect(JSON.stringify(r.value)).toBe(JSON.stringify(advanceHour(s)));
  });
  it('běžná hodina proběhne bez přestávky', () => {
    const s = advance(war(), 1);
    const g = hourSteps(s);
    expect(g.next().done).toBe(true);
  });
});

describe('hodiny po snímcích', () => {
  const fakeNow = () => { let t = 0; return { now: () => t, tick: (ms) => { t += ms; } }; };
  it('i po jednom kroku za snímek dojdou ke stejnému stavu jako advance', () => {
    const s0 = war();
    const clock = createClock();
    const T = fakeNow();
    clock.add(30, 1000);
    let s = s0, frames = 0;
    while (clock.pending && frames < 10000) { s = clock.run(s, T.now, T.now()); frames++; }   // termín už je pryč → jen jeden krok
    expect(clock.pending).toBe(0);
    expect(frames).toBeGreaterThan(30);   // půlnoc se rozložila do více snímků
    expect(JSON.stringify(s)).toBe(JSON.stringify(advance(s0, 30)));
  });
  it('s dostatkem času stihne vše v jednom snímku', () => {
    const s0 = war();
    const clock = createClock();
    clock.add(5, 1000);
    const s = clock.run(s0, () => 0, 1);
    expect(clock.pending).toBe(0);
    expect(s.tick).toBe(s0.tick + 5);
  });
  it('změna stavu uprostřed hodiny ji zahodí a spočítá znovu od nového stavu', () => {
    const s0 = war();
    const clock = createClock();
    clock.add(1, 10);
    const half = clock.run(s0, () => 0, -1);   // jeden krok půlnoční hodiny
    expect(half).toBe(s0);
    expect(clock.busy).toBe(true);
    const changed = setSpeed(s0, 2);            // hráč mezitím změnil rychlost (nový stav)
    let s = changed;
    while (clock.pending) s = clock.run(s, () => 0, 1);
    expect(JSON.stringify(s)).toBe(JSON.stringify(advanceHour(changed)));
  });
  it('nevyřízené hodiny mají strop podle rychlosti; reset vše zahodí', () => {
    const clock = createClock();
    clock.add(1000, backlogMax(240));
    expect(clock.pending).toBe(60);
    clock.reset();
    expect(clock.pending).toBe(0);
    expect(clock.busy).toBe(false);
    expect(backlogMax(12)).toBe(3);
  });
});
