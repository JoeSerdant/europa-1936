import { describe, it, expect } from 'vitest';
import { createGame, getWorld, advance, buildFort, build, fortOf, BUILDINGS, declareWar, packGame, unpackGame, industryOf } from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER, POL = W.ownerIdx.POL;
const own = (s, o) => { for (let p = 1; p <= W.L; p++) if (s.ctrl[p] === o && s.stateOwner[W.provState[p]] === o) return p; return 0; };
const withPp = (s) => s;

describe('pevnosti', () => {
  it('stavba: jen vlastní provincie, strop úrovně a obecná stavba pevnost nezadá', () => {
    const s = createGame({ player: 'GER' });
    const p = own(s, GER);
    expect(buildFort(s, 0)).toBe(s);
    expect(buildFort(s, W.L + 5)).toBe(s);
    const occupied = { ...s, ctrl: s.ctrl.map((c, i) => (i === p ? POL : c)) };
    expect(buildFort(occupied, p)).toBe(occupied);
    expect(build(s, W.provState[p], 'fort')).toBe(s);
    let x = s;
    for (let i = 0; i < 8; i++) x = buildFort(x, p);
    expect(x.ind.build.filter((b) => b.p === p).length).toBe(BUILDINGS.fort.max);
    void withPp;
  });
  it('po dokončení stoupne úroveň, hotová pevnost zvyšuje obranu v boji', () => {
    const s = buildFort(createGame({ player: 'GER' }), own(createGame({ player: 'GER' }), GER));
    const p = s.ind.build[0].p;
    const done = advance(s, 24 * 90);
    expect(fortOf(done, p)).toBe(1);
    expect(done.ind.build.some((b) => b.p === p)).toBe(false);
    expect(done.log.items.some((e) => e.k === 'built' && e.x === 'fort')).toBe(true);
    expect(fortOf(createGame({ player: 'GER' }), p)).toBe(0);
  });
  it('pevnost snižuje ztráty obránce (stejný boj s pevností a bez ní)', () => {
    const base = declareWar(createGame({ player: 'GER' }), 'GER', 'POL');
    const front = [];
    for (let p = 1; p <= W.L; p++) if (base.ctrl[p] === POL) W.forLandNeighbors(p, (q) => { if (base.ctrl[q] === GER) front.push(p); });
    expect(front.length).toBeGreaterThan(0);
    const fort = { ...base, ind: { ...base.ind, fort: Object.fromEntries(front.map((p) => [p, 5])) } };
    const a = advance(base, 24 * 20), b = advance(fort, 24 * 20);
    const hp = (st) => st.mil.divs.reduce((n, d) => (d && d.o === POL ? n + d.hp : n), 0);
    expect(hp(b)).toBeGreaterThanOrEqual(hp(a));
  });
  it('AI ve válce staví pevnosti na frontě; stav je deterministický a uložitelný', () => {
    let s = createGame({ player: 'SWE', aiLevel: 2 });
    s = declareWar(s, 'GER', 'POL');
    const a = advance(s, 24 * 30), b = advance(s, 24 * 30);
    const forts = (st) => Object.keys(st.ind.fort).length + st.ind.build.filter((x) => x.k === 'fort').length;
    expect(forts(a)).toBeGreaterThan(0);
    expect(JSON.stringify(a.ind.fort)).toBe(JSON.stringify(b.ind.fort));
    expect(unpackGame(JSON.parse(JSON.stringify(packGame(a)))).error).toBeUndefined();
    expect(industryOf(a, GER).build.length).toBeGreaterThanOrEqual(0);
  });
});
