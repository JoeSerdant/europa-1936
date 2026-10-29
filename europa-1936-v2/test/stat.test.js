// Statistiky (M45): měsíční snímky, limit, řady pro grafy, uložení a čistota.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, advance, validateState, STAT, STAT_METRICS, seriesOf, topBy, packGame, unpackGame, GAME_VERSION } from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER;

describe('statistiky (M45)', () => {
  it('při vzniku hry je jeden snímek a každých 30 dní přibude další', () => {
    let s = createGame({ player: 'GER' });
    expect(s.stat.t).toEqual([0]);
    expect(GAME_VERSION).toBeGreaterThanOrEqual(20);
    s = advance(s, STAT.EVERY * 2);
    expect(s.stat.t).toEqual([0, STAT.EVERY, STAT.EVERY * 2]);
    for (const m of STAT_METRICS) expect(s.stat.m[m.id].length).toBe(3);
    expect(s.stat.m.vp[0].length).toBe(W.owners.length);
    expect(validateState(s)).toBeNull();
  });
  it('řady a pořadí pro graf', () => {
    const s = advance(createGame({ player: 'GER' }), STAT.EVERY * 3);
    const ser = seriesOf(s, 'vp', GER);
    expect(ser.map((p) => p.t)).toEqual(s.stat.t);
    expect(ser[0].v).toBeGreaterThan(0);
    const top = topBy(s, 'vp', 5);
    expect(top.length).toBe(5);
    expect(top).not.toContain(0);
    expect(seriesOf(s, 'nic', GER)).toEqual([]);
  });
  it('limit snímků a uložení hry', () => {
    let s = createGame({ player: 'GER' });
    const long = { ...s, stat: { t: Array.from({ length: STAT.MAX }, (_, i) => i), m: Object.fromEntries(Object.keys(s.stat.m).map((k) => [k, Array.from({ length: STAT.MAX }, () => s.stat.m[k][0])])) } };
    const next = advance({ ...long, tick: STAT.EVERY - 1 }, 1);
    expect(next.stat.t.length).toBe(STAT.MAX);
    expect(next.stat.t[next.stat.t.length - 1]).toBe(STAT.EVERY);
    const back = unpackGame(JSON.parse(JSON.stringify(packGame(s))));
    expect(back.state.stat).toEqual(s.stat);
  });
  it('determinismus: dvě stejné hry mají stejné statistiky', () => {
    const a = advance(createGame({ player: 'GER', aiLevel: 2 }), STAT.EVERY * 2);
    const b = advance(createGame({ player: 'GER', aiLevel: 2 }), STAT.EVERY * 2);
    expect(a.stat).toEqual(b.stat);
  });
});
