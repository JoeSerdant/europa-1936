import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, declareWar, capitulate, makePuppet, annexRump, annexPuppet, confPuppet, confAnnex, confSkip, overlordOf, subjectsOf,
  hasCapitulated, warBlock, diplomacyOf, packGame, unpackGame, DIP, atWar,
} from '../src/engine/index.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), POL = idx('POL'), FRA = idx('FRA'), ENG = idx('ENG'), SOV = idx('SOV');

/** Stav, ve kterém `by` okupuje všechny státy `loser` kromě `keep` států, a `loser` kapituluje. */
function crush(player, by, loser, keep = 1) {
  let s = declareWar(createGame({ player }), W.tags[by], W.tags[loser]);
  const ctrl = s.ctrl.slice();
  const mine = [];
  for (let st = 1; st < W.states.length; st++) if (s.stateOwner[st] === loser) mine.push(st);
  for (const st of mine.slice(keep)) for (const p of W.states[st].v) ctrl[p] = by;
  s = { ...s, ctrl, ownerVer: 1 };
  return capitulate(s, loser);
}

describe('mírová konference', () => {
  it('hráč-vítěz dostane konferenci, zbytek země čeká na rozhodnutí', () => {
    const s = crush('GER', GER, POL);
    expect(hasCapitulated(s, POL)).toBe(true);
    expect(s.dip.conf).toHaveLength(1);
    expect(s.dip.conf[0]).toMatchObject({ loser: POL, victor: GER });
    expect(overlordOf(s, POL)).toBe(0);
  });
  it('loutkový stát: země oživne, má pána a pán s ním nevede válku', () => {
    const s = confPuppet(crush('GER', GER, POL), 1);
    expect(s.dip.conf).toHaveLength(0);
    expect(overlordOf(s, POL)).toBe(GER);
    expect(subjectsOf(s, GER)).toEqual([POL]);
    expect(hasCapitulated(s, POL)).toBe(false);
    expect(warBlock(s, GER, POL)).toMatch(/loutk/i);
    expect(warBlock(s, POL, FRA)).toMatch(/Loutkov/);
    expect(diplomacyOf(s, GER).list.find((c) => c.o === POL).mine).toBe(true);
  });
  it('anexe zbytku převede státy vítězi a země zanikne; nechat být ponechá kapitulaci', () => {
    const c = crush('GER', GER, POL);
    const a = confAnnex(c, 1);
    for (let st = 1; st < W.states.length; st++) expect(a.stateOwner[st]).not.toBe(POL);
    expect(a.dip.conf).toHaveLength(0);
    const k = confSkip(c, 1);
    expect(k.dip.conf).toHaveLength(0);
    expect(hasCapitulated(k, POL)).toBe(true);
    expect(confSkip(k, 1)).toBe(k);
  });
  it('AI vítěz rozhodne hned: významná země se stane loutkou', () => {
    const s = crush('GER', FRA, POL);
    expect(s.dip.conf).toHaveLength(0);
    expect(overlordOf(s, POL) === FRA || s.stateOwner.every((o) => o !== POL)).toBe(true);
  });
  it('neplatné příkazy vrací tentýž stav', () => {
    const s = createGame({ player: 'GER' });
    expect(makePuppet(s, GER, POL)).toBe(s);       // POL nekapitulovala
    expect(annexRump(s, GER, POL)).toBe(s);
    expect(confPuppet(s, 5)).toBe(s);
    expect(annexPuppet(s, GER, POL)).toBe(s);
  });
});

describe('loutkové státy: denní krok a anexe', () => {
  const base = () => confPuppet(crush('GER', GER, POL), 1);
  it('loutka vede války pána a dává mu lidskou sílu a politickou moc', () => {
    let s = base();
    s = declareWar(s, 'GER', 'SOV');
    const man0 = s.mil.man[GER], pp0 = s.pol.own[GER].pp;
    const a = advance(s, 24 * 3);
    expect(atWar(a, 'POL', 'SOV')).toBe(true);
    expect(a.pol.own[GER].pp).toBeGreaterThan(pp0);
    expect(a.mil.man[GER]).toBeGreaterThan(man0);
  });
  it('anexe loutky stojí politickou moc a převede její státy', () => {
    const s = base();
    expect(annexPuppet(s, GER, POL)).toBe(s);       // nedostatek PM
    const rich = { ...s, pol: { ...s.pol, own: s.pol.own.map((o, i) => (i === GER ? { ...o, pp: DIP.ANNEX_PP + 10 } : o)) } };
    const a = annexPuppet(rich, GER, POL);
    expect(overlordOf(a, POL)).toBe(0);
    expect(a.pol.own[GER].pp).toBe(10);
    for (let st = 1; st < W.states.length; st++) expect(a.stateOwner[st]).not.toBe(POL);
    void ENG; void SOV;
  });
  it('stav je serializovatelný a deterministický', () => {
    const s = base();
    const a = advance(s, 24 * 5), b = advance(s, 24 * 5);
    expect(JSON.stringify(a.dip)).toBe(JSON.stringify(b.dip));
    expect(unpackGame(JSON.parse(JSON.stringify(packGame(a)))).error).toBeUndefined();
  });
});
