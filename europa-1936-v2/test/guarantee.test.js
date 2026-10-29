// Záruky nezávislosti (M48): příkazy, cena, zapojení zaručitelů do války, zánik při nízké stabilitě, AI a čistota.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, validateState, startWar, guarantee, revokeGuarantee, guaranteeBlock, guarantees, guarantorsOf, guaranteedBy, diplomacyOf, DIP, GAME_VERSION,
} from '../src/engine/index.js';
import { atWar } from '../src/engine/army/war.js';

const W = getWorld();
const GER = W.ownerIdx.GER, POL = W.ownerIdx.POL, ENG = W.ownerIdx.ENG, FRA = W.ownerIdx.FRA, ITA = W.ownerIdx.ITA;
const rich = (s, o, pp = 500) => { const own = s.pol.own.slice(); own[o] = { ...own[o], pp }; return { ...s, pol: { ...s.pol, own } }; };
const justified = (s, a, b) => ({ ...s, dip: { ...s.dip, just: [...s.dip.just, { a, b, ready: s.tick }] } });
const base = () => rich(createGame({ player: 'ENG' }), ENG);

describe('záruky nezávislosti (M48)', () => {
  it('záruka stojí politickou moc, zapíše se a zvedne vztah', () => {
    const s = base();
    const t = guarantee(s, ENG, POL);
    expect(guarantees(t, ENG, POL)).toBe(true);
    expect(guarantorsOf(t, POL)).toEqual([ENG]);
    expect(guaranteedBy(t, ENG)).toEqual([POL]);
    expect(t.pol.own[ENG].pp).toBe(s.pol.own[ENG].pp - DIP.GAR_PP);
    expect(t.log.items[t.log.items.length - 1]).toMatchObject({ k: 'gar', a: ENG, b: POL });
    expect(GAME_VERSION).toBeGreaterThanOrEqual(21);
    expect(validateState(t)).toBeNull();
    expect(guarantee(t, ENG, POL)).toBe(t);
  });
  it('neplatné záruky se odmítnou', () => {
    const s = base();
    expect(guaranteeBlock(s, ENG, ENG)).toBeTruthy();
    expect(guaranteeBlock(s, 0, POL)).toBeTruthy();
    expect(guaranteeBlock(rich(s, ENG, 0), ENG, POL)).toMatch(/politická moc/);
    const bloc = { ...s, dip: { ...s.dip, fac: s.dip.fac.map((f, o) => (o === ENG || o === FRA ? 77 : f)) } };
    expect(guaranteeBlock(bloc, ENG, FRA)).toMatch(/blok/);
    expect(guarantee(s, ENG, ENG)).toBe(s);
  });
  it('zrušení záruky ji odstraní', () => {
    const t = guarantee(base(), ENG, POL);
    const u = revokeGuarantee(t, ENG, POL);
    expect(guarantees(u, ENG, POL)).toBe(false);
    expect(revokeGuarantee(u, ENG, POL)).toBe(u);
  });
  it('zaručitel se při útoku přidá do války a stáhne blok', () => {
    let s = guarantee(base(), ENG, POL);
    s = { ...s, dip: { ...s.dip, fac: s.dip.fac.map((f, o) => (o === ENG || o === ITA ? 55 : f)), facs: { ...s.dip.facs, 55: { nm: 'T', mem: [ENG, ITA], ldr: ENG } } } };
    const w = startWar(justified(s, GER, POL), GER, POL);
    expect(atWar(w.mil, GER, POL)).toBe(true);
    expect(atWar(w.mil, GER, ENG)).toBe(true);
    expect(atWar(w.mil, GER, ITA)).toBe(true);
    expect(validateState(w)).toBeNull();
  });
  it('bez záruky zůstane Británie mimo válku', () => {
    const w = startWar(justified(base(), GER, POL), GER, POL);
    expect(atWar(w.mil, GER, POL)).toBe(true);
    expect(atWar(w.mil, GER, ENG)).toBe(false);
  });
  it('zaručitel s nízkou stabilitou do války nejde a záruka zaniká', () => {
    let s = guarantee(base(), ENG, POL);
    const own = s.pol.own.slice(); own[ENG] = { ...own[ENG], stab: DIP.GAR_STAB - 0.1 };
    s = { ...s, pol: { ...s.pol, own } };
    const w = startWar(justified(s, GER, POL), GER, POL);
    expect(atWar(w.mil, GER, ENG)).toBe(false);
    expect(guarantees(w, ENG, POL)).toBe(false);
  });
  it('zaručitel na straně útočníka se nezapojuje proti sobě', () => {
    let s = guarantee(rich(createGame({ player: 'GER' }), ITA), ITA, POL);
    s = { ...s, dip: { ...s.dip, fac: s.dip.fac.map((f, o) => (o === GER || o === ITA ? 66 : f)), facs: { ...s.dip.facs, 66: { nm: 'A', mem: [GER, ITA], ldr: GER } } } };
    const w = startWar(justified(s, GER, POL), GER, POL);
    expect(atWar(w.mil, ITA, GER)).toBe(false);
  });
  it('řádek diplomacie ukazuje záruky a AI v roce 1939 zaručí Polsko', () => {
    const t = guarantee(base(), ENG, POL);
    const r = diplomacyOf(t, ENG).list.find((x) => x.o === POL);
    expect(r.garMine).toBe(true);
    expect(diplomacyOf(t, POL).list.find((x) => x.o === ENG).garTheirs).toBe(true);
    let g = rich(rich(createGame({ player: 'GER', aiLevel: 2 }), ENG), FRA);
    g = advance({ ...g, tick: 24 * 1200 - 1 }, 1);
    expect(guarantees(g, ENG, POL) || guarantees(g, FRA, POL)).toBe(true);
    expect(validateState(g)).toBeNull();
  });
});
