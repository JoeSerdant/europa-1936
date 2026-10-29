// Půjčka a pronájem (M47): příkaz, omezení, deník, AI a čistota.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, advance, lendLease, lendBlock, lendMax, lendFriend, lendTargets, aiLend, validateState, diplomacyOf, DIP } from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER, ITA = W.ownerIdx.ITA, FRA = W.ownerIdx.FRA, ENG = W.ownerIdx.ENG;
const base = () => createGame({ player: 'GER' });
// dvě země v témže bloku: vyrobíme blok ručně
const withBloc = (s, a, b) => ({ ...s, dip: { ...s.dip, fac: s.dip.fac.map((f, o) => (o === a || o === b ? 99 : f)), facs: { ...s.dip.facs, 99: { nm: 'Test', mem: [a, b], ldr: a } } } });

describe('půjčka a pronájem (M47)', () => {
  it('přátelé jsou jen členové bloku a loutky', () => {
    const s = withBloc(base(), GER, ITA);
    expect(lendFriend(s, GER, ITA)).toBe(true);
    expect(lendFriend(s, GER, FRA)).toBe(false);
    expect(lendFriend(s, GER, GER)).toBe(false);
    expect(lendTargets(s, GER)).toContain(ITA);
  });
  it('přesune zásoby, zapíše do deníku a zlepší vztah', () => {
    const s = withBloc(base(), GER, ITA);
    const n = lendMax(s, GER, 'pusky');
    expect(n).toBeGreaterThan(0);
    const t = lendLease(s, GER, ITA, 'pusky', n);
    expect(t.mil.stock[GER].pusky).toBe(s.mil.stock[GER].pusky - n);
    expect(t.mil.stock[ITA].pusky).toBe(s.mil.stock[ITA].pusky + n);
    expect(t.log.items[t.log.items.length - 1]).toMatchObject({ k: 'lend', a: GER, b: ITA, x: 'pusky', y: n });
    expect(t.dip.rel).not.toBe(s.dip.rel);
    expect(validateState(t)).toBeNull();
  });
  it('neplatné zásilky vrací tentýž stav', () => {
    const s = withBloc(base(), GER, ITA);
    const n = lendMax(s, GER, 'pusky');
    for (const args of [[GER, FRA, 'pusky', 1], [GER, ITA, 'nic', 1], [GER, ITA, 'pusky', 0], [GER, ITA, 'pusky', 1.5], [GER, ITA, 'pusky', n + 1], [GER, GER, 'pusky', 1], [0, ITA, 'pusky', 1]]) {
      expect(lendBlock(s, ...args)).toBeTruthy();
      expect(lendLease(s, ...args)).toBe(s);
    }
    expect(DIP.LEND_MAX).toBeLessThan(1);
  });
  it('nelze posílat do ani z kapitulované země', () => {
    let s = withBloc(base(), GER, ITA);
    s = { ...s, dip: { ...s.dip, cap: s.dip.cap.map((c, o) => (o === ITA ? 1 : c)) } };
    expect(lendBlock(s, GER, ITA, 'pusky', 1)).toMatch(/Kapitul/);
  });
  it('řádek diplomacie označí přítele', () => {
    const s = withBloc(base(), GER, ITA);
    const rows = diplomacyOf(s, GER).list;
    expect(rows.find((r) => r.o === ITA).friend).toBe(true);
    expect(rows.find((r) => r.o === ENG).friend).toBe(false);
  });
  it('AI v míru pošle výzbroj příteli ve válce a hra pak běží dál bez chyb', () => {
    let s = withBloc(createGame({ player: null, aiLevel: 2 }), GER, ITA);
    s = { ...s, mil: { ...s.mil, wars: [[ITA, W.ownerIdx.POL]], stock: s.mil.stock.map((x, o) => (o === GER ? { ...x, pusky: 4000 } : o === ITA ? { ...x, pusky: 10 } : x)) } };
    const t = aiLend(s, GER);
    expect(t.mil.stock[ITA].pusky).toBeGreaterThan(10);
    expect(t.mil.stock[GER].pusky).toBeLessThan(4000);
    expect(aiLend(base(), GER)).toBeTruthy();
    expect(validateState(advance(t, 24 * 5))).toBeNull();
  });
});
