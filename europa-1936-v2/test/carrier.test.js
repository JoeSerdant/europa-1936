// Palubní letouny (M90): paluby letadlových lodí, letouny jako samostatný druh z výroby, úder podle letounů na palubě, ztráty v boji,
// doplňování v domovském přístavu, podpora pobřežních bojů, rozpuštění flotily, AI výroba, uložení a rozhraní.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, declareWar, validateState, packGame, unpackGame, GAME_VERSION, NAV, AIR, SHIPS, PLANES, PLANE_IDS,
  formFleet, disbandFleet, formWing, navyOf, airPower, homeSea, advance,
} from '../src/engine/index.js';
import { deckOf, planesOf, coastStatesOf } from '../src/engine/nav/core.js';
import { refillDecks, navDay } from '../src/engine/nav/day.js';
import { airDay } from '../src/engine/air/day.js';
import { aiCarrierPlanes } from '../src/engine/ai/navy.js';
import { AI } from '../src/engine/ai/constants.js';
import { AIR_PROD, AIR_NATIONAL } from '../src/data/air/planes.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const [ENG, FRA, GER, ITA] = ['ENG', 'FRA', 'GER', 'ITA'].map(idx);
const base = () => createGame({ player: null, aiLevel: 0 });
const fleetOfOwner = (s, o) => s.nav.fleets.findIndex((f) => f && f.o === o && deckOf(f.ships) > 0);
const setFleet = (s, i, p) => { const fleets = s.nav.fleets.slice(); fleets[i] = { ...fleets[i], ...p }; return { ...s, nav: { ...s.nav, fleets, ver: s.nav.ver + 1 } }; };
const setPal = (s, o, n) => { const pool = s.air.pool.slice(); pool[o] = { ...pool[o], pal: n }; return { ...s, air: { ...s.air, pool, ver: s.air.ver + 1 } }; };

describe('data a počáteční stav', () => {
  it('palubní letoun je druh letadla z výroby; letadlová loď má palubu', () => {
    expect(PLANE_IDS).toContain('pal');
    expect(PLANES.pal.carrier).toBe(true);
    expect(PLANES.pal.roles).toEqual([]);
    expect(PLANES.pal.nav).toBeGreaterThan(0);
    expect(AIR_PROD.pal.cost).toBeGreaterThan(0);
    expect(SHIPS.cv.deck).toBe(20);
    expect(deckOf({ cv: 2, bb: 4 })).toBe(40);
    expect(deckOf({ bb: 4 })).toBe(0);
  });
  it('Británie začíná s plnými palubami a rezervou; palubní letouny nevznikají jako křídla na letištích', () => {
    const s = base();
    const i = fleetOfOwner(s, ENG);
    expect(i).toBeGreaterThan(0);
    expect(s.nav.fleets[i].pl).toBe(deckOf(s.nav.fleets[i].ships));
    expect(s.air.pool[ENG].pal).toBe(AIR_NATIONAL.ENG.pal);
    expect(s.air.wings.some((w) => w && w.t === 'pal')).toBe(false);
    for (const f of s.nav.fleets) if (f) expect(Number.isInteger(f.pl)).toBe(true);
    expect(validateState(s)).toBeNull();
  });
  it('palubní letouny nejde sestavit do křídla', () => {
    const s = setPal(base(), ENG, 100);
    const b = s.air.wings.find((w) => w && w.o === ENG).s;
    expect(formWing(s, ENG, 'pal', 10, b)).toBe(s);
  });
});

describe('úder podle letounů na palubě a ztráty', () => {
  /** Britská a italská flotila v jedné oblasti ve válce. */
  const battle = (plEng) => {
    let s = declareWar(base(), 'ENG', 'ITA');
    const e = fleetOfOwner(s, ENG), it = s.nav.fleets.findIndex((f) => f && f.o === ITA);
    s = setFleet(s, it, { p: s.nav.fleets[e].p, path: [], to: 0 });
    s = setFleet(s, e, { pl: plEng });
    return { s, e, it };
  };
  it('síla úderu roste s letouny na palubě', () => {
    expect(airPower({ cv: 2 }, 0)).toBe(0);
    expect(airPower({ cv: 2 }, 40)).toBeGreaterThan(airPower({ cv: 2 }, 10));
    expect(airPower({ cv: 1 }, 99)).toBe(airPower({ cv: 1 }, 20));   // víc, než unese paluba, se nepočítá
    expect(planesOf({ ships: { cv: 1 }, pl: 50 })).toBe(20);
  });
  it('plná paluba způsobí protivníkovi větší ztráty než prázdná; letouny v boji ubývají', () => {
    const full = battle(40), empty = battle(0);
    const a = navDay(full.s), b = navDay(empty.s);
    const hpIt = (st, i) => (st.nav.fleets[i] ? Object.entries(st.nav.fleets[i].ships).reduce((x, [k, n]) => x + n * SHIPS[k].hp, 0) : 0);
    expect(hpIt(a, full.it)).toBeLessThanOrEqual(hpIt(b, empty.it));
    const after = a.nav.fleets[full.e];
    expect(after.pl + a.air.pool[ENG].pal).toBeLessThan(40 + full.s.air.pool[ENG].pal);   // ztráty (flotila stojí doma, takže si část hned doplní z rezervy)
    expect(after.pl).toBeGreaterThanOrEqual(0);
    expect(after.pl).toBeLessThanOrEqual(deckOf(after.ships));
    expect(validateState(a)).toBeNull();
  });
});

describe('doplňování palub', () => {
  it('v domovském přístavu flotila nalodí z rezervy nejvýš PLANE_REFILL letounů denně; mimo přístav ne', () => {
    let s = base();
    const i = fleetOfOwner(s, ENG);
    s = setPal(setFleet(s, i, { pl: 0 }), ENG, 30);
    const home = homeSea(s, ENG);
    expect(home).toBeTruthy();
    const t = refillDecks(s);
    expect(t.nav.fleets[i].pl).toBe(NAV.PLANE_REFILL);
    expect(t.air.pool[ENG].pal).toBe(30 - NAV.PLANE_REFILL);
    const far = W.L + W.S;   // nějaká vzdálená mořská oblast
    const away = setFleet(s, i, { p: far === s.nav.fleets[i].p ? far - 1 : far });
    expect(refillDecks(away).nav.fleets[i].pl).toBe(0);
    const empty = setPal(s, ENG, 0);
    expect(refillDecks(empty)).toBe(empty);
  });
  it('bez letadlových lodí ani s plnými palubami se nic nemění', () => {
    const s = base();
    expect(refillDecks(s)).toBe(s);
  });
  it('nová flotila začíná s prázdnou palubou a doplní se; rozpuštění vrátí letouny do rezervy', () => {
    let s = base();
    const pool = s.nav.pool.slice(); pool[ENG] = { ...pool[ENG], cv: 1, dd: 2 }; s = { ...s, nav: { ...s.nav, pool } };
    s = setPal(s, ENG, 50);
    const t = formFleet(s, ENG, { cv: 1, dd: 2 }, 'Pokusná');
    const id = t.nav.fleets.length - 1;
    expect(t.nav.fleets[id].pl).toBe(0);
    let u = t;
    for (let d = 0; d < 4; d++) u = refillDecks(u);
    expect(u.nav.fleets[id].pl).toBe(SHIPS.cv.deck);
    const v = disbandFleet(u, id);
    expect(v.nav.fleets[id]).toBeNull();
    expect(v.air.pool[ENG].pal).toBe(u.air.pool[ENG].pal + SHIPS.cv.deck);
    expect(validateState(v)).toBeNull();
  });
  it('po ztrátě letadlové lodi se přebytečné letouny v přístavu vrátí do rezervy', () => {
    let s = base();
    const i = fleetOfOwner(s, ENG);
    const ships = { ...s.nav.fleets[i].ships, cv: 1 };
    s = setFleet(s, i, { ships, pl: 40 });
    const t = refillDecks(s);
    expect(t.nav.fleets[i].pl).toBe(20);
    expect(t.air.pool[ENG].pal).toBe(s.air.pool[ENG].pal + 20);
  });
});

describe('podpora pobřežních bojů', () => {
  it('státy s pobřežím mořské oblasti a bonus pro ně, jen za války a bez nepřátelské flotily v oblasti', () => {
    let s = base();
    const i = fleetOfOwner(s, ENG);
    const sea = s.nav.fleets[i].p;
    const coast = coastStatesOf(sea);
    expect(coast.length).toBeGreaterThan(0);
    const supAt = (st) => coast.some((c) => (st.air.sup[`${ENG}:${c}`] || 0) > 0);
    expect(supAt(airDay(s))).toBe(false);                 // v míru ne
    const war = declareWar(s, 'ENG', 'GER');
    expect(supAt(airDay(war))).toBe(true);
    const noPlanes = setFleet(war, i, { pl: 0 });
    expect(supAt(airDay(noPlanes))).toBe(false);
    const g = war.nav.fleets.findIndex((f) => f && f.o === GER);
    const contested = setFleet(war, g, { p: sea, path: [] });
    expect(supAt(airDay(contested))).toBe(false);         // flotila bojuje na moři, letouny nad pevninu nelétají
    void AIR;
  });
});

describe('AI vyrábí palubní letouny', () => {
  it('chybí-li letouny na palubách, otevře linku; když je jich dost, linku zruší', () => {
    let s = createGame({ player: null, aiLevel: 2 });
    const i = fleetOfOwner(s, ENG);
    s = setPal(setFleet(s, i, { pl: 0 }), ENG, 0);
    const free = s.ind.lines.filter((l) => l.o === ENG).reduce((a, l) => a + l.fac, 0);
    // uvolníme továrnu, aby měla AI kam linku dát
    const lines = s.ind.lines.map((l) => (l.o === ENG && l.eq === 'pusky' ? { ...l, fac: l.fac - 2 } : l));
    s = { ...s, ind: { ...s.ind, lines } };
    const t = aiCarrierPlanes(s, ENG);
    expect(t.ind.lines.some((l) => l.o === ENG && l.eq === 'pal')).toBe(true);
    const full = setPal(setFleet(t, i, { pl: deckOf(t.nav.fleets[i].ships) }), ENG, 100);
    expect(aiCarrierPlanes(full, ENG).ind.lines.some((l) => l.o === ENG && l.eq === 'pal')).toBe(false);
    const none = createGame({ player: null, aiLevel: 2 });
    expect(aiCarrierPlanes(none, GER)).toBe(none);        // Německo nemá letadlové lodě
    expect(AI.CV_PLANE_FAC).toBeGreaterThan(0);
    void free;
  });
});

describe('uložení, výroba a rozhraní', () => {
  it('palubní letouny přežijí uložení; poškozená paluba se pozná', () => {
    const s = base();
    expect(GAME_VERSION).toBeGreaterThanOrEqual(43);
    const back = unpackGame(packGame(s));
    expect(back.state.nav.fleets[fleetOfOwner(s, ENG)].pl).toBe(s.nav.fleets[fleetOfOwner(s, ENG)].pl);
    const bad = setFleet(s, fleetOfOwner(s, ENG), { pl: -1 });
    expect(validateState(bad)).toMatch(/palubní/);
  });
  it('vyrobené palubní letouny jdou do rezervy letectva a souhrn námořnictva je ukazuje', () => {
    let s = base();
    const pool0 = s.air.pool[ENG].pal;
    const lines = [...s.ind.lines.map((l) => (l.o === ENG && l.eq === 'pusky' ? { ...l, fac: l.fac - 4 } : l)), { id: s.ind.jn + 1, o: ENG, eq: 'pal', fac: 4, eff: 0.5, acc: 0, f: 1, out: 0 }];
    s = { ...s, ind: { ...s.ind, lines, jn: s.ind.jn + 1 } };
    const t = advance(s, 24 * 20);
    expect(t.air.pool[ENG].pal).toBeGreaterThan(pool0);
    const nv = navyOf(t, ENG);
    expect(nv.carrier.deck).toBe(deckOf({ cv: 2 }));
    expect(nv.carrier.spare).toBe(t.air.pool[ENG].pal);
    expect(nv.fleets.find((f) => f.deck > 0).planes).toBeLessThanOrEqual(nv.carrier.deck);
    void FRA;
  });
});
