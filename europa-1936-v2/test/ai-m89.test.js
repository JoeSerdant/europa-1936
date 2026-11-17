// AI a operace „Podpora cizí strany“ (M89): výběr cíle, průzkum před operací, jedna operace najednou, rezerva politické moci; oprava účinku operace; přesun výroby mezi linkami.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, advance, validateState, AI, POL, startOp, hireAgent, ideologyOf, changeGov } from '../src/engine/index.js';
import { aiSpy, subvertTarget, landNeighbors } from '../src/engine/ai/spy.js';
import { rebalanceLines } from '../src/engine/ai/industry.js';
import { chanceOf } from '../src/engine/spy/day.js';
import { SPY } from '../src/engine/spy/constants.js';
import { SPY_OPS } from '../src/data/spy/ops.js';
import { COUNTRIES } from '../src/data/countries.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const [GER, FRA, POR, SWI, AUS] = ['GER', 'FRA', 'POR', 'SWI', 'AUS'].map(idx);
const base = (extra = {}) => createGame({ player: null, aiLevel: 2, ...extra });
const pp = (s, o, v = 300) => { const own = s.pol.own.slice(); own[o] = { ...own[o], pp: v }; return { ...s, pol: { ...s.pol, own } }; };
const withIntel = (s, o, t, v) => { const own = s.spy.own.slice(); own[o] = { ...own[o], ag: Math.max(2, own[o].ag), intel: { ...own[o].intel, [t]: v } }; return { ...s, spy: { ...s.spy, own, ver: s.spy.ver + 1 } }; };
const tier = (o) => COUNTRIES[W.owners[o].tag]?.tier ?? 3;

describe('cíl podpory cizí strany', () => {
  const s = base();
  it('sousedé po souši se počítají podle kontroly provincií', () => {
    const n = landNeighbors(s, GER);
    expect(n.has(FRA)).toBe(true);
    expect(n.has(AUS)).toBe(true);
    expect(n.has(POR)).toBe(false);
    expect(n.has(GER)).toBe(false);
    expect(landNeighbors(s, GER)).toBe(n);   // mezipaměť podle pole kontroly
  });
  it('Německo si vybere souseda, kde má spřízněná strana šanci: ne velmoc, ne spojence, ne zemi se stejnou vládou', () => {
    const t = subvertTarget(s, GER);
    expect(t).toBeGreaterThan(0);
    expect(landNeighbors(s, GER).has(t)).toBe(true);
    expect(tier(t)).toBeGreaterThan(1);
    const mine = ideologyOf(s, GER);
    expect(ideologyOf(s, t)).not.toBe(mine);
    expect(s.pol.own[t].par[mine]).toBeGreaterThanOrEqual(AI.SUBVERT_MIN);
  });
  it('malá země ani země s nezúčastněnou vládou operaci nepodniká; po převratu v cíli AI hledá jinde', () => {
    expect(tier(POR)).toBeGreaterThan(AI.SUBVERT_TIER);
    expect(subvertTarget(s, POR)).toBe(0);
    const neutral = changeGov(s, GER, 'neutrality');
    expect(subvertTarget(neutral, GER)).toBe(0);
    const t = subvertTarget(s, GER);
    const flipped = changeGov(s, t, ideologyOf(s, GER));
    expect(subvertTarget(flipped, GER)).not.toBe(t);
    void SWI;
  });
});

describe('AI operaci používá', () => {
  const s0 = pp(base(), GER);
  const t = subvertTarget(s0, GER);
  it('bez přehledu o cíli pošle nejdřív průzkum, s přehledem zahájí podporu strany', () => {
    const a = aiSpy(withIntel(s0, GER, t, 0), GER);
    expect(a.spy.own[GER].ops.at(-1)).toMatchObject({ k: 'recon', t });
    const b = aiSpy(withIntel(s0, GER, t, 0.6), GER);
    expect(b.spy.own[GER].ops.at(-1)).toMatchObject({ k: 'subvert', t });
    const hired = b.spy.own[GER].ag - s0.spy.own[GER].ag;   // AI si při dostatku politické moci nejdřív najme agenta
    expect(b.pol.own[GER].pp).toBe(s0.pol.own[GER].pp - SPY_OPS.subvert.cost - hired * SPY.AGENT_PP);
    expect(validateState(b)).toBeNull();
  });
  it('jen jedna taková operace najednou, mimo den zpravodajství nic a jen s rezervou politické moci', () => {
    const ready = hireAgent(hireAgent(withIntel(s0, GER, t, 0.6), GER), GER);
    const b = aiSpy(ready, GER);
    expect(b.spy.own[GER].ops.filter((x) => x.k === 'subvert')).toHaveLength(1);
    const c = aiSpy(b, GER);
    expect(c.spy.own[GER].ops.filter((x) => x.k === 'subvert')).toHaveLength(1);
    const off = { ...ready, tick: 24 * 3 };
    expect(aiSpy(off, GER)).toBe(off);
    const poor = pp(ready, GER, SPY_OPS.subvert.cost + AI.SUBVERT_PP - 1);
    expect(aiSpy(poor, GER).spy.own[GER].ops.some((x) => x.k === 'subvert')).toBe(false);
  });
});

describe('účinek operace (oprava)', () => {
  it('úspěšná operace posílí v cíli stranu s ideologií zdroje o POL.SPY_SUBVERT', () => {
    const s = withIntel(pp(createGame({ player: null, aiLevel: 0 }), GER), GER, FRA, 1);
    expect(chanceOf(s, GER, FRA)).toBeGreaterThan(0.5);
    const mine = ideologyOf(s, GER);
    let wins = 0;
    for (let k = 0; k < 6; k++) {   // výsledek určuje hash podle času a čísla operace – zkusíme několik začátků
      const st = { ...s, tick: s.tick + 24 * k };
      const op = startOp(st, GER, 'subvert', FRA);
      expect(op.spy.own[GER].ops).toHaveLength(1);
      const days = SPY_OPS.subvert.days + 1;
      const after = advance(op, 24 * days), control = advance(st, 24 * days);
      expect(after.spy.own[GER].ops).toHaveLength(0);
      const gain = after.pol.own[FRA].par[mine] - control.pol.own[FRA].par[mine];
      if (gain > POL.SPY_SUBVERT * 0.5) { wins++; expect(gain).toBeLessThan(POL.SPY_SUBVERT * 1.5); } else expect(Math.abs(gain)).toBeLessThan(0.5);
    }
    expect(wins).toBeGreaterThan(0);
  });
});

describe('přesun výroby mezi linkami (M89)', () => {
  const s0 = base();
  const day = (o) => { let d = 0; while ((d + o) % AI.REBAL_DAYS !== 0) d++; return d; };
  const at = (s, o) => ({ ...s, tick: 24 * day(o) });
  const facOf = (s, o, eq) => s.ind.lines.filter((l) => l.o === o && l.eq === eq).reduce((a, l) => a + l.fac, 0);
  it('z druhu s továrnami navíc přesune nejvýš REBAL_STEP továren na druh, kterému chybí; celkový počet se nemění', () => {
    const s = at(s0, GER);
    const split = { pusky: 1, dela: 0 };   // žádaná výroba: jen pušky
    expect(facOf(s, GER, 'dela')).toBeGreaterThan(0);
    const t = rebalanceLines(s, GER, split);
    expect(t).not.toBe(s);
    const moved = facOf(s, GER, 'dela') - facOf(t, GER, 'dela');
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThanOrEqual(AI.REBAL_STEP);
    expect(facOf(t, GER, 'pusky')).toBe(facOf(s, GER, 'pusky') + moved);
    const all = (st) => st.ind.lines.filter((l) => l.o === GER).reduce((a, l) => a + l.fac, 0);
    expect(all(t)).toBe(all(s));
    const gun = t.ind.lines.find((l) => l.o === GER && l.eq === 'pusky' && !s.ind.lines.some((x) => x.id === l.id && x.fac === l.fac));
    if (gun) expect(gun.eff).toBeLessThan(s.ind.lines.find((x) => x.id === gun.id).eff);   // přidané továrny zředí efektivitu
    expect(validateState(t)).toBeNull();
  });
  it('mimo den přehodnocení, při vyváženém rozdělení a u malé výroby nic', () => {
    const s = at(s0, GER);
    const off = { ...s, tick: s.tick + 24 };
    expect(rebalanceLines(off, GER, { pusky: 1, dela: 0 })).toBe(off);
    const p = facOf(s, GER, 'pusky'), d = facOf(s, GER, 'dela');
    expect(rebalanceLines(s, GER, { pusky: p, dela: d })).toBe(s);
    const small = at(s0, POR);
    expect(rebalanceLines(small, POR, { pusky: 1, dela: 0 })).toBe(small);
  });
});
