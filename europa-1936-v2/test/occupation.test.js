import { describe, it, expect } from 'vitest';
import { createGame, getWorld, advance, occupationOf, garrisonNeed, OCC, packGame, unpackGame, industryOf, occResFactor } from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER, POL = W.ownerIdx.POL;
const polStates = () => { const out = []; for (let s = 1; s < W.states.length; s++) if (W.stateOwner0[s] === POL) out.push(s); return out; };

/** GER obsadí první polský stát (bez jednotek v něm, pokud `clear`). */
function occupied(clear = true) {
  let s = createGame({ player: 'GER' });
  const st = polStates()[0];
  const ctrl = s.ctrl.slice();
  for (const p of W.states[st].v) ctrl[p] = GER;
  s = { ...s, ctrl, ownerVer: 1 };
  if (clear) s = { ...s, mil: { ...s.mil, divs: s.mil.divs.map((d) => (d && W.provState[d.p] === st ? null : d)) } };
  return { s, st };
}

describe('okupace', () => {
  it('čerstvě okupovaný stát dostane odboj; neokupovaný nemá záznam', () => {
    const { s, st } = occupied();
    expect(occupationOf(createGame({ player: 'GER' }), st)).toBe(null);
    const a = advance({ ...s, tick: 0 }, 24);
    const o = occupationOf(a, st);
    expect(o).not.toBe(null);
    expect(o.c).toBeGreaterThan(0);
    expect(o.r).toBeGreaterThan(0);
    expect(o.need).toBe(garrisonNeed(st));
  });
  it('poddajnost roste, odboj klesá k cíli; garnizona odboj snižuje a poddajnost zrychluje', () => {
    const { s, st } = occupied();
    const a = advance({ ...s, tick: 0 }, 24 * 60);
    const b = advance({ ...s, tick: 0 }, 24 * 120);
    expect(occupationOf(b, st).c).toBeGreaterThan(occupationOf(a, st).c);
    expect(occupationOf(b, st).r).toBeLessThan(occupationOf(a, st).r + 1e-9);
    // garnizona: přidej divize GER do státu
    const ids = [];
    for (let i = 1; i < s.mil.divs.length && ids.length < garrisonNeed(st); i++) if (s.mil.divs[i] && s.mil.divs[i].o === GER) ids.push(i);
    const p0 = W.states[st].cap;
    const divs = s.mil.divs.map((d, i) => (ids.includes(i) ? { ...d, p: p0, path: [] } : d));
    const g = advance({ ...s, mil: { ...s.mil, divs }, tick: 0 }, 24 * 60);
    expect(occupationOf(g, st).r).toBeLessThan(occupationOf(a, st).r);
    expect(occupationOf(g, st).c).toBeGreaterThan(occupationOf(a, st).c);
  });
  it('těžba okupovaného státu jde okupantovi podle poddajnosti', () => {
    expect(occResFactor(0)).toBe(OCC.RES_BASE);
    expect(occResFactor(1)).toBe(1);
    const { s, st } = occupied();
    const withRes = { ...s, ind: { ...s.ind, st: s.ind.st.map((e, i) => (i === st ? { ...e, res: { ropa: 10 } } : e)) } };
    const low = industryOf(withRes, GER).res.ropa?.ext || 0;
    const high = industryOf({ ...withRes, occ: { ...withRes.occ, st: { [st]: { r: 0, c: 1, g: 0 } } } }, GER).res.ropa?.ext || 0;
    expect(high).toBeGreaterThan(low);
  });
  it('vláda konec okupace maže záznam; povstání vrátí kontrolu slabě hlídanému státu', () => {
    const { s, st } = occupied();
    const a = advance({ ...s, tick: 0 }, 24);
    const back = s.ctrl.slice();
    for (const p of W.states[st].v) back[p] = POL;
    expect(occupationOf(advance({ ...a, ctrl: back, ownerVer: 5 }, 24), st)).toBe(null);
    const hot = { ...s, occ: { ...s.occ, st: { [st]: { r: 0.99, c: 0, g: 0 } } }, tick: 0 };
    const b = advance(hot, 24);
    expect(b.ctrl[W.states[st].cap]).toBe(POL);
    expect(b.log.items.some((e) => e.k === 'rebel')).toBe(true);
  });
  it('stav je deterministický a uložitelný', () => {
    const { s } = occupied();
    const a = advance({ ...s, tick: 0 }, 24 * 10), b = advance({ ...s, tick: 0 }, 24 * 10);
    expect(JSON.stringify(a.occ)).toBe(JSON.stringify(b.occ));
    expect(unpackGame(JSON.parse(JSON.stringify(packGame(a)))).error).toBeUndefined();
  });
});
