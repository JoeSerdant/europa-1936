// S5b: mezinárodní trh s výzbrojí – nabídky, nákup, dodávky a platby civilními továrnami.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, GAME_VERSION, validateState, declareWar, MKT, marketPrice, marketFac, offerBlock, offerOnMarket, withdrawOffer,
  buyBlock, buyFromMarket, marketOffers, marketDeals,
} from '../src/engine/index.js';
import { marketDay } from '../src/engine/industry/market.js';
import { aiMarket } from '../src/engine/ai/market.js';

const W = getWorld();
const SWE = W.ownerIdx.SWE, FIN = W.ownerIdx.FIN, GER = W.ownerIdx.GER;
const withStock = (s, o, eq, n) => { const st = s.mil.stock.slice(); st[o] = { ...st[o], [eq]: n }; return { ...s, mil: { ...s.mil, stock: st } }; };

describe('S5b: mezinárodní trh', () => {
  const s0 = withStock(createGame({ player: 'FIN' }), SWE, 'pusky', 5000);
  it('nabídka odebere kusy ze skladu; stažení je vrátí', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(60);
    expect(offerBlock(s0, SWE, 'pusky', 5)).toMatch(/Nejméně/);
    expect(offerBlock(s0, SWE, 'pusky', 99999)).toMatch(/Tolik/);
    const s = offerOnMarket(s0, SWE, 'pusky', 1000);
    expect(s.mil.stock[SWE].pusky).toBe(4000);
    expect(marketOffers(s)).toHaveLength(1);
    expect(validateState(s)).toBeNull();
    const id = marketOffers(s)[0].id;
    const t = withdrawOffer(s, SWE, id);
    expect(t.mil.stock[SWE].pusky).toBe(5000);
    expect(withdrawOffer(s, FIN, id)).toBe(s);
  });
  it('nákup: kusy chodí po dobu dodávky, kupující platí továrnami a prodávající je dostává', () => {
    let s = offerOnMarket(s0, SWE, 'pusky', 1000);
    const id = marketOffers(s)[0].id;
    expect(buyBlock(s, SWE, id, 10)).toMatch(/Vlastní/);
    expect(buyBlock(s, FIN, id, 10, 0)).toMatch(/továrny/);
    s = buyFromMarket(s, FIN, id, 600, 100);
    expect(marketOffers(s)[0].n).toBe(400);
    expect(marketFac(s, FIN)).toBeCloseTo(-marketPrice('pusky', 600).fac, 6);
    expect(marketFac(s, SWE)).toBeCloseTo(marketPrice('pusky', 600).fac, 6);
    expect(s.log.items.some((e) => e.k === 'mkt' && e.b === FIN)).toBe(true);
    const before = s.mil.stock[FIN].pusky || 0;
    for (let i = 0; i < MKT.DAYS; i++) s = marketDay(s);
    expect(s.mil.stock[FIN].pusky).toBe(before + 600);
    expect(marketDeals(s, FIN)).toHaveLength(0);
    expect(marketFac(s, FIN)).toBe(0);
  });
  it('válka mezi stranami obchod zruší a zbytek se vrátí prodávajícímu', () => {
    let s = offerOnMarket(withStock(s0, GER, 'pusky', 3000), GER, 'pusky', 1000);
    const id = marketOffers(s).find((x) => x.o === GER).id;
    s = buyFromMarket(s, FIN, id, 900, 100);
    s = marketDay(s);
    const ger = s.mil.stock[GER].pusky;
    s = marketDay(declareWar(s, 'GER', 'FIN'));
    expect(marketDeals(s, FIN)).toHaveLength(0);
    expect(s.mil.stock[GER].pusky).toBeGreaterThan(ger);
    expect(buyBlock(s, FIN, id, 10)).toMatch(/nepřítelem/);
  });
  it('AI v míru vystaví velký přebytek', () => {
    let s = withStock(createGame({ player: null, aiLevel: 2 }), SWE, 'pusky', 20000);
    for (let d = 0; d < 8 && !marketOffers(s).length; d++) s = aiMarket({ ...s, tick: d * 24 }, SWE);
    expect(marketOffers(s).some((x) => x.o === SWE && x.eq === 'pusky')).toBe(true);
  });
});
