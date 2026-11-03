// Palivo (M73): zásoby, výroba z přebytku ropy a základu továren, spotřeba divizí, letectva a flotil, účinky nedostatku, upozornění a cheat.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, validateState, GAME_VERSION, packGame, unpackGame, fuelOf, fuelRatio, fuelUse, fuelDay, FUEL, deriveStats, BATTALIONS, alertsOf, runCheat, industryOf,
} from '../src/engine/index.js';
import { fuelAirMult, fuelNavMult } from '../src/engine/fuel/index.js';
import { moveSpeed } from '../src/engine/army/movement.js';
import { openCtx } from '../src/engine/army/ctx.js';
import { tallyOwners } from '../src/engine/industry/core.js';
import { logLine } from '../src/ui/logText.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), ITA = idx('ITA'), SOV = idx('SOV');
const base = (extra = {}) => createGame({ player: null, aiLevel: 0, ...extra });
const withFuel = (s, o, patch) => { const fuel = s.ind.fuel.slice(); fuel[o] = { ...fuel[o], ...patch }; return { ...s, ind: { ...s.ind, fuel } }; };
const stats = (s, o) => { const t = tallyOwners(s)[o]; return t; };

describe('data a statistiky divizí', () => {
  it('motorizované a tankové prapory spotřebovávají palivo, pěchota ne', () => {
    for (const id of ['motor', 'ltank', 'mech', 'mtank', 'htank']) expect(BATTALIONS[id].fuel, id).toBeGreaterThan(0);
    for (const id of ['pesi', 'jezdci', 'horsti']) expect(BATTALIONS[id].fuel || 0, id).toBe(0);
    expect(BATTALIONS.htank.fuel).toBeGreaterThan(BATTALIONS.ltank.fuel);
  });
  it('statistiky divize mají spotřebu paliva a podíl motorizace', () => {
    const inf = deriveStats({ reg: [['pesi', 'pesi', 'pesi'], [], [], [], []], sup: [] });
    expect(inf.fuel).toBe(0);
    expect(inf.mech).toBe(0);
    const arm = deriveStats({ reg: [['ltank', 'ltank', 'motor'], [], [], [], []], sup: [] });
    expect(arm.fuel).toBeCloseTo(2 * BATTALIONS.ltank.fuel + BATTALIONS.motor.fuel, 6);
    expect(arm.mech).toBeCloseTo(1, 6);
  });
});

describe('zásoby a výroba', () => {
  it('každá země začíná se zásobou, poměr 1 a stav projde kontrolou i uložením', () => {
    const s = base();
    for (let o = 1; o < W.owners.length; o++) expect(s.ind.fuel[o]).toEqual({ s: FUEL.START, r: 1, g: 0, u: 0 });
    expect(GAME_VERSION).toBeGreaterThanOrEqual(32);
    expect(validateState(s)).toBeNull();
    expect(validateState({ ...s, ind: { ...s.ind, fuel: [] } })).toMatch(/palivo/);
    const back = unpackGame(JSON.parse(JSON.stringify(packGame(s))));
    expect(back.state.ind.fuel[GER]).toEqual(s.ind.fuel[GER]);
  });
  it('výroba = základ továren + přebytek ropy, zásoba nepřekročí kapacitu', () => {
    const s = base();
    const tally = tallyOwners(s);
    const oil = new Array(W.owners.length).fill(0);
    oil[GER] = 3;
    const d = fuelDay(s, oil, tally);
    const t = stats(s, GER);
    expect(d.ind.fuel[GER].g).toBeCloseTo(3 * FUEL.PER_OIL + FUEL.BASE * (t.civ + t.mil), 6);
    expect(d.ind.fuel[ITA].g).toBeCloseTo(FUEL.BASE * (stats(s, ITA).civ + stats(s, ITA).mil), 6);
    let big = withFuel(s, GER, { s: 1e6 });
    big = fuelDay(big, oil, tally);
    expect(big.ind.fuel[GER].s).toBeCloseTo(Math.max(FUEL.CAP_MIN, FUEL.CAP_DAYS * big.ind.fuel[GER].g), 6);
  });
  it('v týdnu hry se zásoba hýbe a přebytek ropy má SSSR větší výrobu než země bez ropy', () => {
    const s = advance(base(), 24 * 7);
    expect(fuelOf(s, SOV).gain).toBeGreaterThan(fuelOf(s, ITA).gain * 3);
    expect(fuelOf(s, SOV).stock).toBeGreaterThan(0);
    expect(validateState(s)).toBeNull();
  });
});

describe('spotřeba', () => {
  it('stojící motorizované divize spotřebují IDLE podílu, divize v pohybu naplno', () => {
    const s = base();
    const use0 = fuelUse(s)[GER];
    expect(use0).toBeGreaterThan(0);
    const divs = s.mil.divs.map((d) => (d && d.o === GER ? { ...d, path: [1] } : d));
    const moving = fuelUse({ ...s, mil: { ...s.mil, divs } })[GER];
    expect(moving).toBeGreaterThan(use0);
    expect(use0).toBeGreaterThanOrEqual(moving * FUEL.IDLE - 1e-9);
  });
  it('letectvo na misi a flotily v pohybu spotřebovávají palivo, nečinné ne', () => {
    const s = base();
    const idleAir = fuelUse(s)[GER];
    const wings = s.air.wings.map((wg) => (wg && wg.o === GER ? { ...wg, m: 'air' } : wg));
    expect(fuelUse({ ...s, air: { ...s.air, wings } })[GER]).toBeGreaterThan(idleAir);
    const fleets = s.nav.fleets.map((f) => (f && f.o === GER ? { ...f, path: [f.p] } : f));
    expect(fuelUse({ ...s, nav: { ...s.nav, fleets } })[GER]).toBeGreaterThan(idleAir);
  });
  it('při nedostatku se poměr rovná podílu pokrytí a zásoba klesne na nulu', () => {
    let s = withFuel(base(), GER, { s: 0 });
    const tally = tallyOwners(s);
    const oil = new Array(W.owners.length).fill(0);
    const fleets = s.nav.fleets.map((f) => (f && f.o === GER ? { ...f, path: [f.p] } : f));
    const divs = s.mil.divs.map((d) => (d && d.o === GER ? { ...d, path: [1] } : d));
    s = { ...s, nav: { ...s.nav, fleets }, mil: { ...s.mil, divs } };
    const d = fuelDay(s, oil, tally);
    const f = d.ind.fuel[GER];
    expect(f.u).toBeGreaterThan(f.g);
    expect(f.r).toBeCloseTo(f.g / f.u, 6);
    expect(f.s).toBe(0);
    expect(fuelRatio(d, GER)).toBeLessThan(1);
  });
});

describe('účinky nedostatku', () => {
  it('motorizovaná divize se bez paliva pohybuje pomaleji, pěchota ne', () => {
    const s = base();
    const motor = s.mil.divs.findIndex((d) => d && d.o === GER && deriveStats(s.mil.tpl[d.tpl]).mech > 0.5);
    const inf = s.mil.divs.findIndex((d) => d && d.o === GER && deriveStats(s.mil.tpl[d.tpl]).mech === 0);
    expect(motor).toBeGreaterThan(0);
    expect(inf).toBeGreaterThan(0);
    const dry = withFuel(s, GER, { r: 0 });
    const speed = (st, id) => { const ctx = openCtx(st); const d = ctx.divs[id]; return moveSpeed(ctx, d, deriveStats(st.mil.tpl[d.tpl]), d.p, 0); };
    expect(speed(dry, motor)).toBeLessThan(speed(s, motor));
    expect(speed(dry, inf)).toBeCloseTo(speed(s, inf), 6);
  });
  it('letectvo a flotily slábnou úměrně nedostatku', () => {
    const s = base();
    expect(fuelAirMult(s, GER)).toBe(1);
    expect(fuelNavMult(s, GER)).toBe(1);
    const dry = withFuel(s, GER, { r: 0 });
    expect(fuelAirMult(dry, GER)).toBeCloseTo(1 - FUEL.AIR_PEN, 6);
    expect(fuelNavMult(dry, GER)).toBeCloseTo(1 - FUEL.NAV_PEN, 6);
  });
});

describe('upozornění, cheat a rozhraní', () => {
  it('při nízkém poměru se zobrazí upozornění na palivo s odkazem na Logistiku', () => {
    const s = base();
    expect(alertsOf(s, GER).some((a) => a.id === 'fuel')).toBe(false);
    const dry = withFuel(s, GER, { r: 0.3, u: 2, g: 0.6 });
    const a = alertsOf(dry, GER).find((x) => x.id === 'fuel');
    expect(a).toMatchObject({ panel: 'logistics', tone: 'warn' });
    expect(fuelOf(dry, GER).low).toBe(true);
  });
  it('cheat fuel přidá palivo hráči', () => {
    const s = createGame({ player: 'GER', aiLevel: 0 });
    const r = runCheat(s, 'fuel 100');
    expect(r.state.ind.fuel[GER].s).toBe(s.ind.fuel[GER].s + 100);
    expect(runCheat(s, 'fuel').state).toBe(s);
  });
  it('okno Logistika má údaje o palivu z přehledu', () => {
    const f = fuelOf(base(), GER);
    expect(f).toMatchObject({ stock: FUEL.START, ratio: 1, low: false });
    expect(f.cap).toBeGreaterThanOrEqual(FUEL.CAP_MIN);
    expect(industryOf(base(), GER).res).toBeTruthy();
    expect(logLine({ k: 'war', a: GER, b: ITA }, GER).text).toMatch(/Válka/);
  });
});
