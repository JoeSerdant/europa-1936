// Radar (M50): stavba, úroveň ve stavu, účinek na nepřátelské bombardování, AI.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, runCheat, declareWar, basesOf, formWing, setMission, targetsFor, build, radarOf, stateIndustry, BUILDINGS, AIR, validateState,
} from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER, POL = W.ownerIdx.POL;

function raid() {
  let s = declareWar(createGame({ player: 'GER' }), 'GER', 'POL');
  s = runCheat(s, 'research all').state;
  s = runCheat(s, 'plane str 60').state;
  const b = basesOf(s, GER).sort((x, y) => y.free - x.free)[0];
  s = formWing(s, GER, 'str', 60, b.s);
  const wg = s.air.wings[s.air.wings.length - 1];
  const tgt = targetsFor(s, wg.id, 'bomb').find((x) => s.stateOwner[x.s] === POL);
  return { s: setMission(s, wg.id, 'bomb', tgt.s), tgt: tgt.s, wg };
}
const withRadar = (s, st, lvl) => { const stt = s.ind.st.slice(); stt[st] = { ...stt[st], radar: lvl }; return { ...s, ind: { ...s.ind, st: stt } }; };

describe('radar (M50)', () => {
  it('radar je budova s úrovněmi a vidí ho přehled státu', () => {
    expect(BUILDINGS.radar.max).toBeGreaterThan(0);
    expect(BUILDINGS.radar.slot).toBe(false);
    const s = createGame({ player: 'GER' });
    const st = [...Array(W.states.length).keys()].slice(1).find((x) => s.stateOwner[x] === GER);
    expect(radarOf(s.ind, st)).toBe(0);
    const q = build(s, st, 'radar');
    expect(q).not.toBe(s);
    const done = advance(q, 24 * 80);
    expect(radarOf(done.ind, st)).toBe(1);
    expect(stateIndustry(done, st).radar).toBe(1);
    expect(validateState(done)).toBeNull();
  });
  it('radar oslabuje nepřátelské bombardování státu', () => {
    const { s, tgt } = raid();
    const plain = advance(s, 24 * 5);
    const guarded = advance(withRadar(s, tgt, 3), 24 * 5);
    const dws = (x) => s.pol.own[POL].ws - x.pol.own[POL].ws;
    expect(dws(plain)).toBeGreaterThan(0);
    expect(dws(guarded)).toBeLessThan(dws(plain));
    expect(AIR.RADAR_K).toBeGreaterThan(0);
  });
  it('radar v jiném státě nepomáhá a vlastní letadla nad vlastním státem nepoškozuje', () => {
    const { s, tgt } = raid();
    const other = [...Array(W.states.length).keys()].slice(1).find((x) => x !== tgt && s.stateOwner[x] === POL);
    const plain = advance(s, 24 * 3), far = advance(withRadar(s, other, 3), 24 * 3);
    expect(far.pol.own[POL].ws).toBeCloseTo(plain.pol.own[POL].ws, 6);
  });
});
