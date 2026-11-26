// S8: vzdušné zóny (převaha nad strategickým regionem) a strategické bombardování továren.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, declareWar, validateState, GAME_VERSION, tallyOwners, BUILDINGS,
  regionOfState, airSupOf, airPenalty, bombDamageOf,
} from '../src/engine/index.js';
import { airDay } from '../src/engine/air/day.js';
import { industryDay } from '../src/engine/industry/day.js';
import { AIR } from '../src/engine/air/constants.js';
import { demandSplit } from '../src/engine/ai/industry.js';

const W = getWorld();
const GER = W.ownerIdx.GER, POL = W.ownerIdx.POL, FRA = W.ownerIdx.FRA;
const stateOf = (o, f = () => true) => { for (let s = 1; s < W.states.length; s++) if (W.states[s].o === o && f(s)) return s; return 0; };
/** Křídlo s misí: `n` letadel druhu `t` země `o` nad státem `to` (letiště v prvním vlastním státě s letištěm). */
function wing(s, o, t, n, m, to) {
  const base = stateOf(o, (x) => s.ind.st[x].afb > 0);
  const wings = s.air.wings.slice();
  wings.push({ id: wings.length, o, t, n, s: base, m, to, c: 0, a: 0 });
  return { ...s, air: { ...s.air, wings, wn: wings.length - 1 } };
}
const noWings = (s) => ({ ...s, air: { ...s.air, wings: [null], wn: 0 } });   // bez počátečních křídel
const withAA = (s, st, lvl) => { const all = s.ind.st.slice(); all[st] = { ...all[st], aa: lvl }; return { ...s, ind: { ...s.ind, st: all } }; };

describe('S8: vzdušné zóny', () => {
  const s0 = noWings(declareWar(createGame({ player: null }), 'GER', 'POL'));
  const pst = stateOf(POL), r = regionOfState(W, pst);
  it('hlídky nad státem dávají sílu v jeho strategickém regionu; nepřátelská převaha oslabí divize', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(55);
    const s = airDay(wing(s0, GER, 'sti', 200, 'air', pst));
    expect(s.air.az[r][GER]).toBeGreaterThan(AIR.AZ_MIN);
    expect(airSupOf(s, GER, r)).toBeGreaterThan(0.9);
    expect(airSupOf(s, POL, r)).toBeLessThan(0.1);
    expect(airPenalty(s, POL, r)).toBeGreaterThan(0.9);
    expect(airPenalty(s, GER, r)).toBe(0);
    expect(airPenalty(s, FRA, r)).toBe(0);   // Francie s Německem neválčí
    expect(validateState(s)).toBeNull();
  });
  it('vyrovnaná převaha nic neubírá; bez letadel není zóna', () => {
    let s = wing(wing(s0, GER, 'sti', 100, 'air', pst), POL, 'sti', 100, 'air', pst);
    s = airDay(s);
    expect(airPenalty(s, POL, r)).toBeLessThan(0.2);
    expect(airPenalty(s, GER, r)).toBeLessThan(0.2);
    expect(airSupOf(s0, GER, r)).toBeNull();
  });
});

describe('S8: strategické bombardování', () => {
  const s0 = noWings(declareWar(createGame({ player: null }), 'GER', 'FRA'));
  let fst = 0;
  for (let x = 1; x < W.states.length; x++) if (W.states[x].o === FRA && (!fst || s0.ind.st[x].civ + s0.ind.st[x].mil > s0.ind.st[fst].civ + s0.ind.st[fst].mil)) fst = x;
  it('bombardéry poškodí továrny státu; poškozené továrny se nepočítají', () => {
    let s = wing(s0, GER, 'tac', 300, 'bomb', fst);
    for (let i = 0; i < 20; i++) s = airDay(s);
    expect(bombDamageOf(s.ind, fst)).toBeGreaterThan(0.2);
    expect(bombDamageOf(s.ind, fst)).toBeLessThanOrEqual(AIR.DMG_MAX);
    const t0 = tallyOwners(s0)[FRA], t1 = tallyOwners(s)[FRA];
    expect(t1.civ + t1.mil).toBeLessThan(t0.civ + t0.mil);
    expect(validateState(s)).toBeNull();
    // oprava: denně ubývá
    const r = industryDay(s);
    expect(bombDamageOf(r.ind, fst)).toBeCloseTo(bombDamageOf(s.ind, fst) - AIR.DMG_REPAIR, 6);
  });
  it('protiletadlová obrana snižuje poškození a sestřeluje bombardéry', () => {
    expect(BUILDINGS.aa.max).toBe(5);
    const a = airDay(wing(s0, GER, 'tac', 300, 'bomb', fst));
    const b = airDay(wing(withAA(s0, fst, 5), GER, 'tac', 300, 'bomb', fst));
    expect(bombDamageOf(b.ind, fst)).toBeLessThan(bombDamageOf(a.ind, fst));
    const n = (s) => s.air.wings[s.air.wings.length - 1].n;
    let x = wing(s0, GER, 'tac', 300, 'bomb', fst), y = wing(withAA(s0, fst, 5), GER, 'tac', 300, 'bomb', fst);
    for (let i = 0; i < 10; i++) { x = airDay(x); y = airDay(y); }
    expect(n(y)).toBeLessThan(n(x));
  });
  it('rozbitý stav bez poškození nebo zón neprojde kontrolou', () => {
    const broken = { ...s0, ind: { ...s0.ind } };
    delete broken.ind.dmg;
    expect(validateState(broken)).toMatch(/bombardování/);
    void demandSplit;
  });
});

describe('S8: rozhraní', () => {
  it('mapový režim Vzdušná převaha barví regiony podle převahy strany hráče', async () => {
    const { MODES, fillColors } = await import('../src/ui/map/colors.js');
    expect(MODES.some((m) => m.id === 'airsup')).toBe(true);
    let s = { ...declareWar(createGame({ player: 'POL' }), 'GER', 'POL') };
    s = { ...s, air: { ...s.air, wings: [null], wn: 0 } };
    const pst = stateOf(POL), r = regionOfState(W, pst);
    const none = fillColors(W, s, 'airsup');
    s = airDay(wing(s, GER, 'sti', 200, 'air', pst));
    const hit = fillColors(W, s, 'airsup');
    const p = W.states[pst].cap;
    expect(W.region[p]).toBe(r);
    expect(hit[p]).not.toBe(none[p]);
  });
});
