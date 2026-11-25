// S7: okupační zákony, posádky a kolaborantské vlády.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, declareWar, validateState, GAME_VERSION, occLawOf, setOccLaw, occupiedBy, occResShare, collabBlock, setCollab, hasCollab,
  OCC_LAWS, OCC_LAW_DEFAULT,
} from '../src/engine/index.js';
import { occDay } from '../src/engine/occ/day.js';
import { OCC } from '../src/engine/occ/constants.js';
import { aiOccLawFor } from '../src/engine/ai/occ.js';

const W = getWorld();
const GER = W.ownerIdx.GER, POL = W.ownerIdx.POL, SOV = W.ownerIdx.SOV, FRA = W.ownerIdx.FRA;
const polStates = () => { const out = []; for (let s = 1; s < W.states.length; s++) if (W.states[s].o === POL) out.push(s); return out; };

/** Německo okupuje `n` polských států (bez divizí). */
function occupy(n = 4, base = createGame({ player: 'GER' })) {
  let s = declareWar(base, 'GER', 'POL');
  const ctrl = s.ctrl.slice(), list = polStates().slice(0, n);
  for (const st of list) for (const p of W.states[st].v) ctrl[p] = GER;
  s = { ...s, ctrl };
  return { s: occDay(s), list };
}
const days = (s, n) => { for (let i = 0; i < n; i++) s = occDay(s); return s; };
const avg = (s, list, k) => list.reduce((a, st) => a + s.occ.st[st][k], 0) / list.length;

describe('S7: okupační zákony', () => {
  it('výchozí zákon je Vojenská správa; zákon jde změnit jen pro okupovanou zemi', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(54);
    const s0 = createGame({ player: 'GER' });
    expect(occLawOf(s0, GER, POL).id).toBe(OCC_LAW_DEFAULT);
    expect(setOccLaw(s0, GER, POL, 'tvrda')).toBe(s0);
    const { s } = occupy();
    expect(occupiedBy(s, GER).find((x) => x.o === POL).states.length).toBe(4);
    const t = setOccLaw(s, GER, POL, 'tvrda');
    expect(occLawOf(t, GER, POL).id).toBe('tvrda');
    expect(setOccLaw(t, GER, POL, 'neexistuje')).toBe(t);
    expect(setOccLaw(t, GER, POL, 'tvrda')).toBe(t);
    expect(setOccLaw(t, GER, POL, OCC_LAW_DEFAULT).occ.law).toEqual({});   // výchozí zákon se neukládá
  });
  it('tvrdá okupace: víc odboje, pomalejší poddajnost, víc surovin a ztráty lidské síly; mírná správa naopak', () => {
    const { s, list } = occupy();
    const hard = days(setOccLaw(s, GER, POL, 'tvrda'), 60), mild = days(setOccLaw(s, GER, POL, 'mirna'), 60), base = days(s, 60);
    expect(avg(mild, list, 'r')).toBeLessThan(avg(base, list, 'r'));
    expect(avg(mild, list, 'c')).toBeGreaterThan(avg(hard, list, 'c'));
    expect(hard.mil.man[GER]).toBeLessThan(base.mil.man[GER]);   // posádky platí lidskou silou
    expect(occResShare(hard, GER, POL, 0.3)).toBeGreaterThan(occResShare(base, GER, POL, 0.3));
    expect(occResShare(mild, GER, POL, 0.3)).toBeLessThan(occResShare(base, GER, POL, 0.3));
    for (const id in OCC_LAWS) expect(OCC_LAWS[id].n).toBeTruthy();
  });
});

describe('S7: kolaborantská vláda', () => {
  it('podmínky: počet států, poddajnost, politická moc; po zřízení nižší odboj a víc surovin', () => {
    const { s, list } = occupy(4);
    expect(collabBlock(s, GER, POL)).toMatch(/Poddajnost/);
    expect(collabBlock(s, GER, FRA)).toMatch(/Neokupujete/);
    const st = { ...s.occ.st };
    for (const x of list) st[x] = { ...st[x], c: 0.6 };
    let t = { ...s, occ: { ...s.occ, st } };
    const own = t.pol.own.slice(); own[GER] = { ...own[GER], pp: 200 };
    t = { ...t, pol: { ...t.pol, own } };
    expect(collabBlock(t, GER, POL)).toBeNull();
    const c = setCollab(t, GER, POL);
    expect(hasCollab(c, GER, POL)).toBe(true);
    expect(c.pol.own[GER].pp).toBe(200 - OCC.COL_PP);
    expect(c.log.items.some((e) => e.k === 'collab' && e.a === GER && e.b === POL)).toBe(true);
    expect(collabBlock(c, GER, POL)).toMatch(/už vládne/);
    expect(occResShare(c, GER, POL, 0.6)).toBeCloseTo(occResShare(t, GER, POL, 0.6) + OCC.COL_RES, 6);
    expect(avg(days(c, 40), list, 'r')).toBeLessThan(avg(days(t, 40), list, 'r'));
    // okupant území ztratí → kolaborantská vláda zaniká
    const ctrl = c.ctrl.slice();
    for (const x of list) for (const p of W.states[x].v) ctrl[p] = POL;
    expect(hasCollab(occDay({ ...c, ctrl }), GER, POL)).toBe(false);
  });
  it('stav je platný a ukládá zákony i kolaborace', () => {
    const { s } = occupy();
    expect(validateState(setOccLaw(s, GER, POL, 'tvrda'))).toBeNull();
    const broken = { ...s, occ: { ...s.occ } };
    delete broken.occ.law;
    expect(validateState(broken)).toMatch(/okupační zákony/);
  });
});

describe('S7: AI', () => {
  it('historická AI: Německo na východě tvrdě; bez historie podle ideologie', () => {
    const h = createGame({ player: null, aiLevel: 2 });
    expect(aiOccLawFor(h, GER, SOV)).toBe('tvrda');
    expect(aiOccLawFor(h, GER, FRA)).toBe('vojenska');
    const f = createGame({ player: null, aiLevel: 2, hist: false });
    expect(aiOccLawFor(f, W.ownerIdx.ENG, GER)).toBe('civilni');
  });
});

describe('S7: vynucená kapitulace bez okupace', () => {
  it('řádek `full` předá vítěze z koleje – konference proběhne a Vichy vznikne, i když Německo Francii neobsadilo', async () => {
    const { forcedEnd } = await import('../src/engine/dip/day.js');
    const { HIST_STRATEGIES } = await import('../src/data/ai/strategies.js');
    const { isDormant } = await import('../src/engine/index.js');
    const s = declareWar(createGame({ player: null, aiLevel: 2 }), 'GER', 'FRA');
    const t = forcedEnd(s, FRA, HIST_STRATEGIES.find((r) => r.id === 'fra_fall'));
    expect(t.dip.cap[FRA]).toBe(1);
    expect(isDormant(t, W.ownerIdx.VIC)).toBe(false);
    expect(t.dip.sub[W.ownerIdx.VIC]).toBe(GER);
  });
});
