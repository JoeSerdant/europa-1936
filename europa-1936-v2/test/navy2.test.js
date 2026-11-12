// Letadlové lodě, ponorky a námořní mise (M81): data, první úder letounů, protiponorkový boj, mise flotil, konvoje, mlha války, AI a stav.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, declareWar, validateState, GAME_VERSION, SHIPS, SHIP_IDS, SHIP_PROD, NAVY_NATIONAL, NAV, NAV_MISSIONS, NAV_MISSION_IDS,
  setFleetMission, formFleet, navyOf, airPower, subOnly, aswOf, powerOf, routeRisk, tradeRoute, seesFleet, homeSea,
} from '../src/engine/index.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const ENG = idx('ENG'), GER = idx('GER'), SWE = idx('SWE');
const fleet = (o, p, ships, m = '') => ({ o, nm: 'Test', p, ships, c: {}, mx: powerOf(ships).hp, to: 0, path: [], prog: 0, m });
/** Hra jen se dvěma testovacími flotilami ve stejné oblasti; ENG a GER ve válce. */
function duel(a, b, ma = '', mb = '') {
  let s = declareWar(createGame({ player: null, aiLevel: 0 }), 'ENG', 'GER');
  const sea = homeSea(s, ENG).sea;
  return { ...s, nav: { ...s.nav, fleets: [null, fleet(ENG, sea, a, ma), fleet(GER, sea, b, mb)] } };
}
const hp = (s, i) => (s.nav.fleets[i] ? powerOf(s.nav.fleets[i].ships).hp : 0);

describe('data', () => {
  it('letadlová loď a ponorka mají své příznaky, ceny a Británie s Francií začínají s letadlovými loděmi', () => {
    expect(SHIP_IDS).toContain('cv');
    expect(SHIPS.cv.air).toBeGreaterThan(0);
    expect(SHIPS.ss.sub).toBe(true);
    expect(SHIP_PROD.cv.cost).toBeGreaterThan(SHIP_PROD.bb.cost);
    expect(NAVY_NATIONAL.ENG.ships.cv).toBe(2);
    expect(NAVY_NATIONAL.FRA.ships.cv).toBe(1);
    const s = createGame({ player: null });
    expect(navyOf(s, ENG).total.cv).toBe(2);
    expect(s.nav.pool[GER].cv).toBe(0);
  });
  it('pomocné funkce: síla letounů, flotila jen z ponorek, protiponorková síla', () => {
    expect(airPower({ cv: 2, bb: 3 })).toBe(2 * SHIPS.cv.air);
    expect(airPower({ bb: 3 })).toBe(0);
    expect(subOnly({ ss: 4 })).toBe(true);
    expect(subOnly({ ss: 4, dd: 1 })).toBe(false);
    expect(subOnly({})).toBe(false);
    expect(aswOf({ dd: 3, cv: 1, bb: 5 })).toBe(5);
  });
});

describe('boj flotil', () => {
  it('letadlové lodě udeří první: strana s nimi ztrácí méně a protivník víc než ve stejném boji bez nich', () => {
    const base = advance(duel({ bb: 4 }, { bb: 4 }), 24);
    const cv = advance(duel({ bb: 4, cv: 2 }, { bb: 4 }), 24);
    const lostBase = 4 * SHIPS.bb.hp - hp(base, 2), lostCv = 4 * SHIPS.bb.hp - hp(cv, 2);
    expect(lostCv).toBeGreaterThanOrEqual(lostBase);
    const engLossBase = 4 * SHIPS.bb.hp - hp(base, 1);
    const engLossCv = (4 * SHIPS.bb.hp + 2 * SHIPS.cv.hp) - hp(cv, 1);
    expect(engLossCv / (4 * SHIPS.bb.hp + 2 * SHIPS.cv.hp)).toBeLessThan(engLossBase / (4 * SHIPS.bb.hp) + 1e-9);
  });
  it('ponorky zasáhnou jen torpédoborce a letadlové lodě', () => {
    const noAsw = advance(duel({ bb: 6 }, { ss: 10 }), 24 * 3);
    expect(noAsw.nav.fleets[2].ships.ss).toBe(10);
    const asw = advance(duel({ bb: 2, dd: 20 }, { ss: 10 }), 24 * 3);
    expect(asw.nav.fleets[2] ? asw.nav.fleets[2].ships.ss || 0 : 0).toBeLessThan(10);
  });
  it('mise Hlídka zlepší palbu, mise Nájezdy sníží ztráty flotily i její účinek', () => {
    const plain = advance(duel({ ca: 10 }, { ca: 10 }), 24);
    const patrol = advance(duel({ ca: 10 }, { ca: 10 }, 'patrol'), 24);
    expect(hp(patrol, 2)).toBeLessThanOrEqual(hp(plain, 2));
    const raid = advance(duel({ ca: 10 }, { ca: 10 }, '', 'raid'), 24);
    expect(hp(raid, 2)).toBeGreaterThanOrEqual(hp(plain, 2));
    expect(hp(raid, 1)).toBeGreaterThanOrEqual(hp(plain, 1));
  });
});

describe('mise a konvoje', () => {
  it('setFleetMission mění misi; neplatná mise nebo stejná hodnota vrací tentýž stav', () => {
    const s = createGame({ player: null });
    const id = s.nav.fleets.findIndex((f) => f && f.o === ENG);
    expect(s.nav.fleets[id].m).toBe('');
    expect(NAV_MISSION_IDS).toEqual(['patrol', 'raid', 'escort']);
    for (const m of NAV_MISSION_IDS) expect(NAV_MISSIONS[m].n && NAV_MISSIONS[m].info).toBeTruthy();
    const a = setFleetMission(s, id, 'raid');
    expect(a.nav.fleets[id].m).toBe('raid');
    expect(setFleetMission(a, id, 'raid')).toBe(a);
    expect(setFleetMission(s, id, 'nic')).toBe(s);
    expect(setFleetMission(s, 999, 'raid')).toBe(s);
    expect(setFleetMission(a, id, '').nav.fleets[id].m).toBe('');
    const pool = s.nav.pool.slice(); pool[ENG] = { ...pool[ENG], dd: 3 };
    const formed = formFleet({ ...s, nav: { ...s.nav, pool } }, ENG, { dd: 3 });
    expect(formed.nav.fleets[formed.nav.fleets.length - 1].m).toBe('');
    expect(validateState(a)).toBeNull();
    expect(GAME_VERSION).toBeGreaterThanOrEqual(38);
  });
  it('ponorky a mise Nájezdy zvyšují riziko konvojů, mise Doprovod ho snižuje', () => {
    const s = declareWar(createGame({ player: 'GER' }), 'GER', 'ENG');
    const st = { ...s, ind: { ...s.ind, trade: [{ id: 1, from: SWE, to: ENG, res: 'ocel', amt: 8, got: 8 }] } };
    const route = tradeRoute(st, SWE, ENG);
    const label = route.seas[Math.floor(route.seas.length / 2)];
    const withFleets = (list) => ({ ...st, nav: { ...st.nav, fleets: [null, ...list] } });
    const risk = (list) => routeRisk(withFleets(list), route, SWE, ENG);
    const subs = risk([fleet(GER, label, { ss: 4 })]);
    const guns = risk([fleet(GER, label, { dd: 5 })]);   // stejná palebná síla (20)
    expect(subs).toBeGreaterThan(guns);
    expect(risk([fleet(GER, label, { dd: 5 }, 'raid')])).toBeCloseTo(guns * NAV.MISSION_RAID, 6);
    const esc = risk([fleet(GER, label, { dd: 5 }), fleet(ENG, label, { dd: 3 })]);
    const escM = risk([fleet(GER, label, { dd: 5 }), fleet(ENG, label, { dd: 3 }, 'escort')]);
    expect(escM).toBeLessThan(esc);
  });
});

describe('mlha války a AI', () => {
  it('flotilu jen z ponorek odhalí až vlastní torpédoborce v téže oblasti', () => {
    const s = declareWar(createGame({ player: 'ENG', aiLevel: 0 }), 'ENG', 'GER');
    const sea = homeSea(s, ENG).sea;
    const only = { ...s, nav: { ...s.nav, fleets: [null, fleet(GER, sea, { ss: 5 })] } };
    expect(seesFleet(only, GER, sea, { ss: 5 })).toBe(false);
    expect(seesFleet(only, GER, sea, { ss: 5, ca: 1 })).toBe(true);
    const hunters = { ...only, nav: { ...only.nav, fleets: [...only.nav.fleets, fleet(ENG, sea, { dd: 2 })] } };
    expect(seesFleet(hunters, GER, sea, { ss: 5 })).toBe(true);
    expect(seesFleet({ ...only, rules: { fog: 0 } }, GER, sea, { ss: 5 })).toBe(true);
  });
  it('AI v dlouhé válce zadává flotilám mise a stav zůstává platný', () => {
    let s = createGame({ player: null, aiLevel: 2, scenario: '1939' });
    s = advance(s, 24 * 60);
    expect(validateState(s)).toBeNull();
    const missions = new Set(s.nav.fleets.filter(Boolean).map((f) => f.m || ''));
    expect([...missions].every((m) => m === '' || NAV_MISSIONS[m])).toBe(true);
  }, 120000);
});
