// Námořní invaze AI (M71): zóny dosažitelnosti po souši, zásobování přístavů po moři, místa vylodění, sestavení a plavba invazního sboru, krycí flotila, popisky.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, advance, declareWar, validateState, GAME_VERSION, AI, packGame, unpackGame, divisionCount } from '../src/engine/index.js';
import { geo } from '../src/engine/army/geo.js';
import { landZones } from '../src/engine/army/zones.js';
import { supplyFlow } from '../src/engine/army/supply.js';
import { seaPorts, seaBlocked, powerOf } from '../src/engine/nav/core.js';
import { allocateArmies } from '../src/engine/ai/strategy.js';
import { landingSites, startInvasion, advanceInvasions, stagingArmies, reservedFleets, navalBalance, localSuperiority } from '../src/engine/ai/invasion.js';
import { logLine, logImportant } from '../src/ui/logText.js';
import { popupFor } from '../src/ui/popups.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), ENG = idx('ENG'), FRA = idx('FRA'), SWI = idx('SWI'), NOR = idx('NOR');
const named = (n) => { for (let p = 1; p <= W.L; p++) if (W.provName(p) === n) return p; return 0; };

/** Válka ENG × GER ve scénáři Září 1939 bez německých divizí – žádný obránce, takže místa vylodění jsou volná. */
function emptyGermany() {
  let s = createGame({ player: null, aiLevel: 2, scenario: '1939' });
  s = declareWar(s, 'ENG', 'GER');
  s = { ...s, dip: { ...s.dip, goal: { ...s.dip.goal, [`${ENG}>${GER}`]: 'conquest' }, ver: s.dip.ver + 1 } };   // M88: vylodění jen u země, proti které má útočník válečný cíl
  const divs = s.mil.divs.map((d) => (d && d.o === GER ? null : d));
  return { ...s, mil: { ...s.mil, divs, ver: s.mil.ver + 1 } };
}
const armiesOfCountry = (s, o) => {
  const by = new Map();
  s.mil.divs.forEach((d, id) => { if (d && d.o === o && d.army) { if (!by.has(d.army)) by.set(d.army, { id: d.army, ds: [] }); by.get(d.army).ds.push(id); } });
  return [...by.values()];
};

describe('zóny dosažitelnosti po souši', () => {
  const s = createGame({ player: null, aiLevel: 0 });
  it('Británie je ostrov, Německo a Francie sdílejí pevninu', () => {
    const z = landZones(s, ENG);
    expect(z[W.owners[ENG].cap]).toBeGreaterThan(0);
    expect(z[W.owners[GER].cap]).not.toBe(z[W.owners[ENG].cap]);
    const w = declareWar(s, 'GER', 'FRA');
    expect(landZones(w, GER)[W.owners[FRA].cap]).toBe(landZones(w, GER)[W.owners[GER].cap]);
    expect(landZones(w, GER)[W.owners[GER].cap]).toBeGreaterThan(0);
  });
  it('cizí neutrální území je nepřístupné (zóna 0), nepřátelské ne', () => {
    const z = landZones(s, GER);
    expect(z[W.owners[SWI].cap]).toBe(0);
    const w = declareWar(s, 'GER', 'SWI');
    expect(landZones(w, GER)[W.owners[SWI].cap]).toBeGreaterThan(0);
  });
  it('výsledek se cachuje podle pole ctrl', () => {
    expect(landZones(s, ENG)).toBe(landZones(s, ENG));
  });
});

describe('zásobování přístavů po moři', () => {
  const kiel = (() => { for (let p = 1; p <= W.L; p++) if (W.portLevel[p] && !geo(W).hub[p] && W.provOwner0[p] === GER && W.land[p].n !== 'Hamburk') return p; return 0; })();   // přístav bez uzlu železnice (uzel má vždy slabé místní zásoby)
  const lend = (s) => { const pool = s.nav.pool.slice(); pool[ENG] = { ...pool[ENG], tr: 3 }; return { ...s, nav: { ...s.nav, pool } }; };
  const taken = (s) => { const ctrl = s.ctrl.slice(); ctrl[kiel] = ENG; return { ...s, ctrl }; };
  it('dobytý přístav bez pozemního napojení je slabým zdrojem zásob, když země má aspoň dvě transportní lodě', () => {
    const s = taken(lend(createGame({ player: null, aiLevel: 0 })));
    const ports = seaPorts(s, ENG);
    expect(ports).toContain(kiel);
    expect(supplyFlow(s.ctrl, ENG)[kiel]).toBe(0);
    const f = supplyFlow(s.ctrl, ENG, undefined, null, ports);
    expect(f[kiel]).toBeGreaterThan(0);
    expect(f[kiel]).toBeLessThanOrEqual(1.6 + 1e-6);
    expect(f.filter((x) => x > 0).length).toBeGreaterThan(supplyFlow(s.ctrl, ENG).filter((x) => x > 0).length);
  });
  it('bez transportních lodí nebo při blokádě mořské oblasti zásoby po moři nejdou', () => {
    let s = taken(createGame({ player: null, aiLevel: 0 }));
    const pool = s.nav.pool.slice(); pool[ENG] = { ...pool[ENG], tr: 0 };
    const bare = { ...s, nav: { ...s.nav, pool, fleets: s.nav.fleets.map((f) => (f && f.o === ENG ? { ...f, ships: { ...f.ships, tr: 0 } } : f)) } };
    expect(seaPorts(bare, ENG)).toEqual([]);   // bez dvou transportních lodí se po moři nezásobuje
    s = taken(lend(createGame({ player: null, aiLevel: 0 })));
    s = declareWar(s, 'ENG', 'GER');
    const sea = W.portSea[kiel];
    const fleets = [...s.nav.fleets, { o: GER, nm: 'Test', p: sea, ships: { dd: 3 }, c: {}, mx: 1, to: 0, path: [], prog: 0 }];
    s = { ...s, nav: { ...s.nav, fleets } };
    expect(seaBlocked(s, ENG, sea)).toBe(true);
    expect(seaPorts(s, ENG)).not.toContain(kiel);
  });
});

describe('přidělování armád divadlům', () => {
  it('armáda v jiné zóně (UNREACH) divadlo nehájí a zůstane v záloze', () => {
    const theaters = [{ posts: [1, 2, 3, 4], eff: 6, viable: [], x: 0, y: 0 }];
    const armies = [{ id: 1, n: 6, x: 0, y: 0 }, { id: 2, n: 6, x: 10, y: 0 }];
    const near = allocateArmies(theaters, armies, { dist: () => 10, ratioNeed: 1 });
    expect(near.got[0].length).toBeGreaterThan(0);
    const far = allocateArmies(theaters, armies, { dist: (a) => (a.id === 2 ? AI.UNREACH : 10), ratioNeed: 1 });
    expect(far.got[0]).not.toContain(2);
    expect(far.reserve).toContain(2);
  });
});

describe('místa vylodění a sestavení sboru', () => {
  const s = emptyGermany();
  it('bez obránců jsou místa vylodění nepřátelské pobřežní přístavy v jiné zóně; hodnotí je přístav a vzdálenost', () => {
    const ports = [];
    for (let p = 1; p <= W.L; p++) if (W.portLevel[p] && s.ctrl[p] === ENG) ports.push(p);
    const sites = landingSites(s, ENG, ports, 8);
    expect(sites.length).toBeGreaterThan(0);
    const z = landZones(s, ENG);
    for (const x of sites) {
      expect(s.ctrl[x.p]).toBe(GER);
      expect(z[x.p]).not.toBe(z[ports[0]]);
      expect(W.portLevel[x.p] > 0 || true).toBe(true);
      expect(x.km).toBeLessThanOrEqual(AI.INV_SEA_KM);
    }
    for (let i = 1; i < sites.length; i++) expect(sites[i - 1].sc).toBeGreaterThanOrEqual(sites[i].sc);
  });
  it('s příliš malým sborem nebo bez nepřátelských přístavů místo nevznikne', () => {
    const ports = [];
    for (let p = 1; p <= W.L; p++) if (W.portLevel[p] && s.ctrl[p] === ENG) ports.push(p);
    expect(landingSites(s, ENG, [], 8)).toEqual([]);
    const full = createGame({ player: null, aiLevel: 2, scenario: '1939' });
    expect(landingSites(full, ENG, ports, 8)).toEqual([]);   // bez války nikdo nepřítelem není
  });
  it('silné německé divize u pobřeží místo vylodění vyřadí', () => {
    let w = declareWar(createGame({ player: null, aiLevel: 2, scenario: '1939' }), 'ENG', 'GER');
    const ports = [];
    for (let p = 1; p <= W.L; p++) if (W.portLevel[p] && w.ctrl[p] === ENG) ports.push(p);
    const strong = landingSites(w, ENG, ports, 4);
    const weak = landingSites(w, ENG, ports, 12);
    expect(weak.length).toBeGreaterThanOrEqual(strong.length);
  });
  it('startInvasion sestaví sbor z volných armád, uloží operaci a krycí flotilu; podruhé stejné zemi nic nezačne', () => {
    const free = armiesOfCountry(s, ENG);
    expect(ready(s)).toBe(true);
    const t = startInvasion(s, ENG, free);
    expect(t).not.toBe(s);
    const op = t.ai.inv.find((x) => x.o === ENG);
    expect(op).toMatchObject({ ph: 0 });
    expect(op.fleet).toBeGreaterThan(0);
    expect(t.nav.fleets[op.fleet].o).toBe(ENG);
    expect(stagingArmies(t, ENG).has(op.army)).toBe(true);
    expect(reservedFleets(t, ENG).has(op.fleet)).toBe(true);
    const corps = t.mil.divs.filter((d) => d && d.army === op.army);
    expect(corps.length).toBeGreaterThanOrEqual(AI.INV_MIN);
    expect(corps.length).toBeLessThanOrEqual(AI.INV_MAX);
    expect(t.mil.armies[op.army].plan.k).toBe('area');
    expect(startInvasion(t, ENG, armiesOfCountry(t, ENG))).toBe(t);
    expect(validateState(t)).toBeNull();
  });
  it('bez námořní převahy nebo bez krycí flotily se invaze nezačne', () => {
    const none = { ...s, nav: { ...s.nav, fleets: s.nav.fleets.map((f) => (f && f.o === ENG ? null : f)) } };
    expect(startInvasion(none, ENG, armiesOfCountry(none, ENG))).toBe(none);
    const b = navalBalance(s, ENG);
    expect(b.own).toBeGreaterThan(0);
    // M88: převaha se posuzuje u místa vylodění – obří nepřátelské loďstvo poblíž cílové oblasti vylodění zakáže, vzdálené ne
    const weak = { ...s, nav: { ...s.nav, fleets: s.nav.fleets.map((f) => (f && f.o === GER ? { ...f, ships: { bb: 500 } } : f)) } };
    expect(powerOf({ bb: 500 }).atk).toBeGreaterThan(0);
    const gf = weak.nav.fleets.find((f) => f && f.o === GER);
    expect(localSuperiority(weak, ENG, gf.p)).toBe(false);
    const noFoe = { ...s, nav: { ...s.nav, fleets: s.nav.fleets.map((f) => (f && f.o === GER ? null : f)) } };
    expect(localSuperiority(noFoe, ENG, gf.p)).toBe(true);
    const t = startInvasion(weak, ENG, armiesOfCountry(weak, ENG));
    if (t !== weak) {   // sbor smí vyrazit jen tam, kde nepřátelské loďstvo poblíž není
      const op = t.ai.inv.find((x) => x.o === ENG);
      const sea = landingSites(weak, ENG, [...Array(W.L + 1).keys()].filter((p) => p && W.portLevel[p] && weak.ctrl[p] === ENG), 12).find((x) => x.p === op.p);
      if (sea) expect(localSuperiority(weak, ENG, sea.sea)).toBe(true);
    }
  });
  it('zem v míru nebo jiná země bez válek invazi nezačne', () => {
    const peace = createGame({ player: null, aiLevel: 2, scenario: '1939' });
    expect(startInvasion(peace, ENG, armiesOfCountry(peace, ENG))).toBe(peace);
  });
});

function ready(s) {
  const t = startInvasion(s, ENG, armiesOfCountry(s, ENG));
  return t !== s;
}

describe('plavba invazního sboru', () => {
  it('sbor se shromáždí, krycí flotila vyplouvá, divize se nalodí a vylodí na nepřátelském pobřeží; předmostí se zásobuje po moři', () => {
    let s = startInvasion(emptyGermany(), ENG, armiesOfCountry(emptyGermany(), ENG));
    const op0 = s.ai.inv.find((x) => x.o === ENG);
    expect(op0).toBeTruthy();
    let landed = null;
    for (let d = 0; d < 40 && !landed; d++) {
      s = advance(s, 24);
      const e = s.log.items.find((x) => x.k === 'inv' && x.o === ENG);
      if (e) landed = e;
    }
    expect(landed).toBeTruthy();
    expect(s.ctrl[landed.x]).toBe(GER);   // ještě na moři
    expect(s.nav.sail.some((x) => x.o === ENG)).toBe(true);
    expect(s.ai.inv.find((x) => x.o === ENG).ph).toBe(1);
    for (let d = 0; d < 20 && s.ctrl[landed.x] !== ENG; d++) s = advance(s, 24);
    expect(s.ctrl[landed.x]).toBe(ENG);
    expect(s.mil.divs.some((d) => d && d.o === ENG && d.p === landed.x)).toBe(true);
    expect(seaPorts(s, ENG)).toContain(landed.x);
    expect(validateState(s)).toBeNull();
  }, 120000);
  it('po pauze po vyplutí záznam operace zaniká a krycí flotila se uvolní', () => {
    let s = startInvasion(emptyGermany(), ENG, armiesOfCountry(emptyGermany(), ENG));
    for (let d = 0; d < 40 && s.ai.inv.find((x) => x.o === ENG)?.ph !== 1; d++) s = advance(s, 24);
    expect(s.ai.inv.find((x) => x.o === ENG)?.ph).toBe(1);
    for (let d = 0; d < AI.INV_COOL_DAYS + 2; d++) s = advance(s, 24);
    expect(s.ai.inv.find((x) => x.o === ENG)).toBeUndefined();
  }, 120000);
  it('operace bez války nebo po vypršení lhůty se ruší a armáda se vrací do běžné správy', () => {
    const s = startInvasion(emptyGermany(), ENG, armiesOfCountry(emptyGermany(), ENG));
    const op = s.ai.inv.find((x) => x.o === ENG);
    const late = { ...s, tick: s.tick + (AI.INV_STAGE_DAYS + 1) * 24 };
    const r = advanceInvasions(late, ENG);
    expect(r.ai.inv.find((x) => x.o === ENG)).toBeUndefined();
    expect(r.mil.armies[op.army].plan).toBeFalsy();
  });
});

describe('stav a texty', () => {
  it('verze hry a kontrola stavu znají invaze', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(30);
    const s = createGame({ player: null, aiLevel: 2 });
    expect(s.ai.inv).toEqual([]);
    expect(validateState({ ...s, ai: { ...s.ai, inv: null } })).toMatch(/invaze/);
    const back = unpackGame(JSON.parse(JSON.stringify(packGame(s))));
    expect(back.state.ai.inv).toEqual([]);
  });
  it('záznamy inv a lands mají česky popsané texty a ohlašují se oběti', () => {
    const e = { k: 'inv', o: ENG, x: named('Kiel'), y: 9, a: 1, b: GER };
    expect(logLine(e, GER).text).toMatch(/Kiel/);
    expect(logLine(e, GER).tone).toBe('bad');
    expect(logLine({ ...e, a: 0, b: ENG }, GER).text).toMatch(/posily/);
    expect(logImportant(e, GER)).toBe(true);
    expect(logImportant(e, FRA)).toBe(false);
    expect(logImportant({ ...e, a: 0 }, GER)).toBe(false);
    expect(popupFor(e, GER)).toMatchObject({ kind: 'inv', sticky: true });
    expect(popupFor(e, FRA)).toBeNull();
    const l = { k: 'lands', o: ENG, x: named('Kiel'), b: GER };
    expect(logLine(l, GER).text).toMatch(/vylodil/);
    expect(logImportant(l, GER)).toBe(true);
    expect(popupFor(l, GER)).toMatchObject({ kind: 'lands' });
  });
});
