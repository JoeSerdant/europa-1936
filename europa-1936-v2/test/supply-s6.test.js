// S6: zásobování jako v HOI4 – lokomotivy a nákladní auta jako výzbroj zásobování, opotřebení za války, stavba železnice po provinciích.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, declareWar, supplyFlow, seaPorts, infraOf, logNeed, logRatios, builtRailEdges, nearTrack, divCount,
  EQUIP, BUILDINGS, fortRoom, validateState, GAME_VERSION,
} from '../src/engine/index.js';
import { buildFort } from '../src/engine/industry/commands.js';
import { demandSplit } from '../src/engine/ai/industry.js';
import { C } from '../src/engine/army/constants.js';

const W = getWorld();
const GER = W.ownerIdx.GER;
const withStock = (s, o, patch) => ({ ...s, mil: { ...s.mil, stock: s.mil.stock.map((x, i) => (i === o ? { ...x, ...patch } : x)) } });
const reach = (s, o) => supplyFlow(s.ctrl, o, infraOf(s), null, seaPorts(s, o));
const sumFar = (r, o, s) => { let t = 0; const cap = W.owners[o].cap; for (let p = 1; p <= W.L; p++) if (s.ctrl[p] === o && p !== cap) t += r[p]; return t; };

describe('S6: výzbroj zásobování', () => {
  const s0 = createGame({ player: null });
  it('lokomotivy jsou výzbroj; země začínají se zásobou lokomotiv a aut pro zásobování', () => {
    expect(EQUIP.vlaky).toBeTruthy();
    expect(GAME_VERSION).toBeGreaterThanOrEqual(53);
    const n = divCount(s0.mil, GER), need = logNeed(s0.mil, GER);
    expect(need.trains).toBe(Math.ceil(n * C.SUP_TRAIN_PER_DIV));
    expect(s0.mil.stock[GER].vlaky).toBeGreaterThanOrEqual(need.trains);
    expect(s0.mil.stock[GER].auta).toBeGreaterThanOrEqual(need.trucks);
    expect(logRatios(s0, GER)).toEqual({ tr: 1, tk: 1 });
  });
  it('bez lokomotiv a aut slábne zásobování daleko od hlavního města', () => {
    const empty = withStock(s0, GER, { vlaky: 0, auta: 0 });
    expect(logRatios(empty, GER)).toEqual({ tr: 0, tk: 0 });
    const full = sumFar(reach(s0, GER), GER, s0), poor = sumFar(reach(empty, GER), GER, empty);
    expect(poor).toBeLessThan(full * 0.95);
    const noTrucks = withStock(s0, GER, { auta: 0 });
    expect(sumFar(reach(noTrucks, GER), GER, noTrucks)).toBeLessThan(full);
  });
  it('za války se lokomotivy a auta denně opotřebují; v míru ne', () => {
    const peace = advance(s0, 24);
    expect(peace.mil.stock[GER].vlaky).toBe(s0.mil.stock[GER].vlaky);
    const war = declareWar(s0, 'GER', 'POL');
    const t = advance(war, 24 * 2);
    expect(t.mil.stock[GER].vlaky).toBeLessThan(war.mil.stock[GER].vlaky);
    expect(t.mil.stock[GER].auta).toBeGreaterThanOrEqual(0);
    expect(t.mil.stock[GER].vlaky).toBeGreaterThanOrEqual(0);
  });
  it('AI výroba počítá s chybějícími lokomotivami', () => {
    const empty = withStock(s0, GER, { vlaky: 0 });
    expect(demandSplit(empty, GER, true).vlaky || 0).toBeGreaterThan(0);
    expect((demandSplit(s0, GER, true).vlaky || 0)).toBeLessThan(demandSplit(empty, GER, true).vlaky);
  });
});

describe('S6: stavba železnice', () => {
  const s0 = createGame({ player: 'GER' });
  // vlastní provincie bez trati, sousedící s provincií s tratí
  let target = 0;
  for (let p = 1; p <= W.L && !target; p++) {
    if (s0.ctrl[p] !== GER || W.rails.start[p + 1] > W.rails.start[p]) continue;
    if (nearTrack(W, {}, p)) target = p;
  }
  it('železnice je provinční stavba jen vedle existující trati', () => {
    expect(BUILDINGS.rail.province).toBe(true);
    expect(target).toBeGreaterThan(0);
    expect(fortRoom(s0, target, GER, 'rail').n).toBe(BUILDINGS.rail.max);
    let far = 0;   // vlastní provincie, která trať nemá ani nesousedí s tratí
    for (let p = 1; p <= W.L && !far; p++) if (s0.ctrl[p] === GER && !nearTrack(W, {}, p)) far = p;
    if (far) { expect(fortRoom(s0, far, GER, 'rail').n).toBe(0); expect(buildFort(s0, far, 'rail')).toBe(s0); }
  });
  it('dokončená stavba zvedne úroveň, přidá spoj sítě a zlepší zásobování v provincii', () => {
    const before = reach(s0, GER)[target];
    let s = buildFort(s0, target, 'rail');
    expect(s.ind.build.some((b) => b.k === 'rail' && b.p === target)).toBe(true);
    for (let i = 0; i < 200 && !(s.ind.rail[target] > 0); i++) s = advance(s, 24);
    expect(s.ind.rail[target]).toBe(1);
    expect(builtRailEdges(W, s.ind.rail).some(([a, b]) => a === target || b === target)).toBe(true);
    expect(reach(s, GER)[target]).toBeGreaterThanOrEqual(before);
    expect(validateState(s)).toBeNull();
    const broken = { ...s, ind: { ...s.ind } };
    delete broken.ind.rail;
    expect(validateState(broken)).toMatch(/železnice/);
  }, 120000);
});
