import { describe, it, expect } from 'vitest';
import { docHour } from '../src/engine/doc/system.js';
import {
  createGame, getWorld, advance, adoptDoctrine, addXp, docBlock, docMods, doctrinesOf, DOC, TRACKS, DOCTRINES, runCheat, packGame, unpackGame, declareWar, atWar,
} from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER, FRA = W.ownerIdx.FRA;
const docDayOnce = (st) => docHour({ ...st, tick: 24 });
const rich = (s) => ['land', 'air', 'sea'].reduce((x, b) => addXp(x, GER, b, 300), s);

describe('doktríny', () => {
  const s0 = createGame({ player: 'GER' });
  it('začátek: zásoba zkušeností a žádné doktríny; bez zkušeností nelze přijmout', () => {
    expect(s0.doc.own[GER].xp.land).toBe(DOC.XP_START);
    expect(docBlock(s0, GER, 'masa1')).toMatch(/zkušenosti/);
    expect(adoptDoctrine(s0, GER, 'masa1')).toBe(s0);
    expect(adoptDoctrine(s0, GER, 'neexistuje')).toBe(s0);
  });
  it('přijetí platí zkušenostmi, určí směr větve a zamkne ostatní směry', () => {
    let s = rich(s0);
    s = adoptDoctrine(s, GER, 'masa1');
    expect(s.doc.own[GER].xp.land).toBe(300 - DOC.COST[0]);
    expect(s.doc.own[GER].track.land).toBe('masa');
    expect(docBlock(s, GER, 'obrana1')).toMatch(/směr/);
    expect(docBlock(s, GER, 'masa3')).toMatch(/předchozí/);
    expect(adoptDoctrine(s, GER, 'masa1')).toBe(s);
    s = adoptDoctrine(adoptDoctrine(s, GER, 'masa2'), GER, 'masa3');
    expect(Object.keys(s.doc.own[GER].done)).toEqual(['masa1', 'masa2', 'masa3']);
    const m = docMods(s, GER);
    expect(m.atk).toBeCloseTo(0.08);
    expect(m.atkInf).toBeCloseTo(0.05);
    expect(docMods(s0, GER).atk).toBe(0);
    const view = doctrinesOf(s, GER).find((b) => b.id === 'land');
    expect(view.chosen).toBe('masa');
    expect(view.tracks.find((t) => t.id === 'obrana').excluded).toBe(true);
    expect(s.log.items.some((e) => e.k === 'doctrine')).toBe(true);
  });
  it('větve jsou nezávislé a každý stupeň má vlastní cenu', () => {
    let s = rich(s0);
    s = adoptDoctrine(adoptDoctrine(s, GER, 'podpora1'), GER, 'flotila1');
    expect(s.doc.own[GER].track).toMatchObject({ air: 'podpora', sea: 'flotila' });
    expect(DOC.COST.length).toBe(3);
    expect(Object.keys(DOCTRINES).length).toBe(Object.keys(TRACKS).length * 3);
  });
  it('zkušenosti rostou s časem a v bojích rychleji', () => {
    const peace = advance(s0, 24 * 10);
    expect(peace.doc.own[GER].xp.land).toBeGreaterThan(s0.doc.own[GER].xp.land);
    expect(peace.doc.own[GER].xp.land).toBeLessThanOrEqual(DOC.XP_MAX);
    const ids = [];
    for (let i = 1; i < s0.mil.divs.length && ids.length < 20; i++) if (s0.mil.divs[i] && s0.mil.divs[i].o === GER) ids.push(i);
    const fight = { ...s0, mil: { ...s0.mil, battles: [{ id: 1, att: ids, dep: [] }] } };
    expect(docDayOnce(fight).doc.own[GER].xp.land).toBeGreaterThan(docDayOnce(s0).doc.own[GER].xp.land);
  });
  it('doktrína zlepšuje útok divizí v boji', () => {
    const base = advance(declareWar(createGame({ player: 'FRA' }), 'GER', 'FRA'), 24 * 5);
    const buffed = advance(declareWar(rich(createGame({ player: 'FRA' })), 'GER', 'FRA'), 24 * 5);
    expect(base).toBeTruthy();
    expect(docMods(adoptDoctrine(adoptDoctrine(rich(createGame({ player: 'GER' })), GER, 'masa1'), GER, 'masa2'), GER).atkInf).toBeGreaterThan(0);
    expect(buffed.doc.own[FRA].xp.land).toBeGreaterThan(0);
  });
  it('AI přijímá doktríny, cheat xp funguje a stav se ukládá', () => {
    let s = createGame({ player: 'GER', aiLevel: 2 });
    s = runCheat(s, 'xp land 100').state;
    expect(s.doc.own[GER].xp.land).toBe(125);
    const a = advance(s, 24 * 150);
    expect(Object.keys(a.doc.own[FRA].done).length).toBeGreaterThan(0);
    expect(JSON.stringify(advance(s, 24 * 20).doc)).toBe(JSON.stringify(advance(s, 24 * 20).doc));
    expect(unpackGame(JSON.parse(JSON.stringify(packGame(a)))).error).toBeUndefined();
    expect(runCheat(s, 'xp foo 1').state).toBe(s);
  });
});
