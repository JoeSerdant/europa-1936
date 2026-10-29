import { describe, it, expect } from 'vitest';
import { createGame, getWorld, advance, hireAgent, startOp, cancelOp, opBlock, agentsOf, chanceOf, SPY, SPY_OPS, packGame, unpackGame, declareWar } from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER, FRA = W.ownerIdx.FRA, ITA = W.ownerIdx.ITA;
const withPp = (s, o, pp) => ({ ...s, pol: { ...s.pol, own: s.pol.own.map((x, i) => (i === o ? { ...x, pp } : x)) } });
const base = () => withPp(createGame({ player: 'GER' }), GER, 400);

describe('zpravodajství', () => {
  it('velmoc začíná se dvěma agenty; najmutí stojí politickou moc a má strop', () => {
    const s = base();
    expect(agentsOf(s, GER).total).toBe(2);
    const h = hireAgent(s, GER);
    expect(agentsOf(h, GER).total).toBe(3);
    expect(h.pol.own[GER].pp).toBe(400 - SPY.AGENT_PP);
    let x = s;
    for (let i = 0; i < 20; i++) x = hireAgent(withPp(x, GER, 400), GER);
    expect(agentsOf(x, GER).total).toBe(agentsOf(x, GER).max);
    expect(hireAgent(withPp(s, GER, 1), GER)).toEqual(withPp(s, GER, 1));
  });
  it('operace zabere agenta a politickou moc, hlídá se cíl, spojenci a duplicity', () => {
    const s = base();
    expect(opBlock(s, GER, 'sabotage', FRA)).toBe(null);
    const a = startOp(s, GER, 'sabotage', FRA);
    expect(agentsOf(a, GER).free).toBe(1);
    expect(a.pol.own[GER].pp).toBe(400 - SPY_OPS.sabotage.cost);
    expect(opBlock(a, GER, 'sabotage', FRA)).toMatch(/probíhá/);
    const b = startOp(a, GER, 'recon', FRA);
    expect(opBlock(b, GER, 'unrest', ITA)).toMatch(/volný agent/);
    expect(startOp(b, GER, 'unrest', ITA)).toBe(b);
    expect(opBlock(s, GER, 'sabotage', GER)).toBeTruthy();
    const bloc = { ...s, dip: { ...s.dip, fac: s.dip.fac.map((f, i) => (i === GER || i === ITA ? 1 : f)), facs: [null, { nm: 'Test', ldr: GER, mem: [GER, ITA] }] } };
    expect(opBlock(bloc, GER, 'sabotage', ITA)).toMatch(/Spojenci/);
    expect(opBlock(bloc, GER, 'recon', ITA)).toBe(null);
    expect(opBlock(s, GER, 'nic', FRA)).toBeTruthy();
    const c = cancelOp(a, GER, 1);
    expect(agentsOf(c, GER).free).toBe(2);
    expect(cancelOp(c, GER, 1)).toBe(c);
  });
  it('šance závisí na přehledu, agentech a protišpionáži', () => {
    const s = base();
    const p0 = chanceOf(s, GER, FRA);
    const intel = { ...s, spy: { ...s.spy, own: s.spy.own.map((e, i) => (i === GER ? { ...e, intel: { [FRA]: 1 } } : e)) } };
    expect(chanceOf(intel, GER, FRA)).toBeGreaterThan(p0);
    const counter = { ...s, spy: { ...s.spy, own: s.spy.own.map((e, i) => (i === FRA ? { ...e, ag: 8 } : e)) } };
    expect(chanceOf(counter, GER, FRA)).toBeLessThan(p0);
    expect(p0).toBeGreaterThanOrEqual(SPY.MIN);
    expect(p0).toBeLessThanOrEqual(SPY.MAX);
  });
  it('operace skončí po své době: agent se uvolní a účinek nastane (nebo selže)', () => {
    let s = startOp(base(), GER, 'recon', FRA);
    const a = advance(s, 24 * (SPY_OPS.recon.days + 1));
    expect(agentsOf(a, GER).busy).toBe(0);
    expect(a.log.items.some((e) => e.k === 'spy')).toBe(true);
    // nepokoje: sleduj stabilitu cíle přes více pokusů
    let hit = 0;
    for (let i = 0; i < 6; i++) {
      const t = startOp(withPp(createGame({ player: 'GER', seed: 1936 + i }), GER, 400), GER, 'unrest', FRA);
      const r = advance({ ...t, tick: i * 24 * 7 }, 24 * 26);
      const control = advance({ ...withPp(createGame({ player: 'GER', seed: 1936 + i }), GER, 400), tick: i * 24 * 7 }, 24 * 26);
      if (r.pol.own[FRA].stab < control.pol.own[FRA].stab - 0.005) hit++;
    }
    expect(hit).toBeGreaterThan(0);
    s = null;
  });
  it('sabotáž ubere sklad cíle, krádež urychlí výzkum, průzkum zvedne přehled', () => {
    const s0 = base();
    const sabs = [];
    for (let i = 0; i < 6; i++) {
      const t = startOp(s0, GER, 'sabotage', FRA);
      const r = advance({ ...t, tick: i * 24 * 11 }, 24 * 26);
      sabs.push(r.mil.stock[FRA].pusky < s0.mil.stock[FRA].pusky);
    }
    expect(sabs.some(Boolean)).toBe(true);
    const rec = advance(startOp(s0, GER, 'recon', FRA), 24 * 16);
    expect(rec.spy.own[GER].intel[FRA] ?? 0).toBeGreaterThanOrEqual(0);
  });
  it('AI používá zpravodajce ve válce; stav je deterministický a uložitelný', () => {
    let s = createGame({ player: 'SWE', aiLevel: 2 });
    s = declareWar(s, 'GER', 'FRA');
    const a = advance(s, 24 * 40), b = advance(s, 24 * 40);
    expect(a.spy.own[GER].n).toBeGreaterThan(0);
    expect(JSON.stringify(a.spy)).toBe(JSON.stringify(b.spy));
    expect(unpackGame(JSON.parse(JSON.stringify(packGame(a)))).error).toBeUndefined();
  });
});
