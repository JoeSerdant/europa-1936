// Rezervní země a občanská válka (M69): skryté rezervní země, rozdělení země (státy, divize, šablony, zásoby, výzkum), historická španělská válka, konec války, pomoc.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, validateState, atWar, allCountries, countryTable, diplomacyOf, isDormant, hasCapitulated, divisionCount,
  splitBlock, splitCountry, isCivilWar, civilDay, HIST_CIVIL, HIST_AID, peaceBlock, capitulate, lendFriend, lendLease, lendMax, aiLend, GAME_VERSION,
  packGame, unpackGame, proposePeace,
} from '../src/engine/index.js';
import { COUNTRIES } from '../src/data/countries.js';
import { OWNERS_EXTRA } from '../src/data/ownersExtra.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const SPR = idx('SPR'), NSP = idx('NSP'), GER = idx('GER'), ITA = idx('ITA'), SOV = idx('SOV'), VIC = idx('VIC'), SLO = idx('SLO'), CRO = idx('CRO');
const base = (o = {}) => createGame({ player: null, aiLevel: 2, ...o });
const ids = (names) => names.map((n) => { for (let i = 1; i < W.states.length; i++) if (W.states[i].n === n) return i; return 0; });
const owned = (s, o) => { let n = 0; for (let i = 1; i < s.stateOwner.length; i++) if (s.stateOwner[i] === o) n++; return n; };
const SPAIN = ids(HIST_CIVIL[0].states);

describe('rezervní země', () => {
  it('svět je za zeměmi ze souboru rozšířen o rezervní země s hlavním městem v cizí zemi a vlastním popisem', () => {
    expect(OWNERS_EXTRA.length).toBeGreaterThanOrEqual(4);
    for (const e of OWNERS_EXTRA) {
      const o = idx(e.tag);
      expect(o, e.tag).toBeGreaterThan(35);
      expect(W.owners[o].dyn).toBe(true);
      expect(W.owners[o].cap).toBeGreaterThan(0);
      expect(COUNTRIES[e.tag].dyn).toBe(true);
      expect(COUNTRIES[e.tag].flag.length).toBeGreaterThan(0);
    }
  });
  it('na začátku nemají žádné území, jsou „kapitulované“ a nejsou vidět v seznamech ani přehledech', () => {
    const s = base();
    for (const e of OWNERS_EXTRA) {
      const o = idx(e.tag);
      expect(owned(s, o)).toBe(0);
      expect(isDormant(s, o)).toBe(true);
      expect(s.dip.cap[o]).toBe(1);
      expect(allCountries().some((c) => c.tag === e.tag)).toBe(false);
      expect(countryTable(s).some((r) => r.tag === e.tag)).toBe(false);
      expect(diplomacyOf(s, GER).list.some((c) => c.tag === e.tag)).toBe(false);
    }
    expect(isDormant(s, GER)).toBe(false);
    expect(validateState(advance(s, 24 * 5))).toBeNull();
  });
});

describe('rozdělení země', () => {
  it('blokace: existující země, mateřská země bez území, neznámé státy, loutka', () => {
    const s = base();
    expect(splitBlock(s, SPR, NSP, SPAIN)).toBeNull();
    expect(splitBlock(s, SPR, GER, SPAIN)).toMatch(/existuje/);
    expect(splitBlock(s, SPR, NSP, ids(['Praha']))).toMatch(/žádný/);
    const all = []; for (let i = 1; i < s.stateOwner.length; i++) if (s.stateOwner[i] === SPR) all.push(i);
    expect(splitBlock(s, SPR, NSP, all)).toMatch(/nezbylo/);
    const sub = s.dip.sub.slice(); sub[SPR] = GER;
    expect(splitBlock({ ...s, dip: { ...s.dip, sub } }, SPR, NSP, SPAIN)).toMatch(/Loutkov/);
    expect(splitCountry(s, SPR, GER, SPAIN)).toBe(s);
  });
  it('státy a provincie přejdou na povstalce, divize v nich s vlastními šablonami, zásoby se rozdělí', () => {
    const s0 = base();
    const t = splitCountry(s0, SPR, NSP, SPAIN, true);
    expect(t).not.toBe(s0);
    for (const st of SPAIN) { expect(t.stateOwner[st]).toBe(NSP); for (const p of W.states[st].v) expect(t.ctrl[p]).toBe(NSP); }
    expect(owned(t, NSP)).toBe(SPAIN.length);
    expect(owned(t, SPR) + owned(t, NSP)).toBe(owned(s0, SPR));
    const before = divisionCount(s0, SPR);
    expect(divisionCount(t, SPR) + divisionCount(t, NSP)).toBe(before);
    expect(divisionCount(t, NSP)).toBeGreaterThan(0);
    for (const d of t.mil.divs) {
      if (!d) continue;
      expect(t.mil.tpl[d.tpl].o, 'šablona patří vlastníkovi divize').toBe(d.o);
      if (d.o === NSP) expect(t.ctrl[d.p]).toBe(NSP);
      if (d.o === SPR) expect(t.ctrl[d.p]).not.toBe(NSP);
    }
    for (const e of Object.keys(s0.mil.stock[SPR])) expect(t.mil.stock[SPR][e] + t.mil.stock[NSP][e]).toBe(s0.mil.stock[SPR][e]);
    expect(t.mil.man[SPR] + t.mil.man[NSP]).toBe(s0.mil.man[SPR]);
    expect(t.mil.man[NSP]).toBeGreaterThan(0);
    expect(t.tech.own[NSP]).toEqual(s0.tech.own[SPR]);
    expect(t.pol.own[NSP].stab).toBeCloseTo(0.45);
    expect(t.pol.own[SPR].stab).toBeLessThan(s0.pol.own[SPR].stab);
  });
  it('povstalci a vláda jsou ve válce na život a na smrt, země ožila a nemá smysl mír', () => {
    const t = splitCountry(base(), SPR, NSP, SPAIN, true);
    expect(atWar(t, 'SPR', 'NSP')).toBe(true);
    expect(isCivilWar(t, SPR, NSP)).toBe(true);
    expect(isDormant(t, NSP)).toBe(false);
    expect(hasCapitulated(t, NSP)).toBe(false);
    expect(allCountries().some((c) => c.tag === 'NSP')).toBe(false);   // statický seznam zůstává bez rezervních zemí
    expect(countryTable(t).some((r) => r.tag === 'NSP')).toBe(true);
    expect(diplomacyOf(t, GER).list.some((c) => c.tag === 'NSP')).toBe(true);
    expect(peaceBlock(t, SPR, NSP)).toMatch(/občanské válce/);
    expect(peaceBlock(t, NSP, SPR)).toMatch(/občanské válce/);
    expect(proposePeace(t, SPR, NSP)).toBe(t);
    expect(t.log.items.some((e) => e.k === 'civil' && e.o === SPR && e.x === NSP)).toBe(true);
    expect(JSON.parse(JSON.stringify(t))).toEqual(t);
    expect(validateState(t)).toBeNull();
  });
  it('přeběhlíci: podíl věrných divizí přejde k povstalcům a objeví se na jejich území, nepřátelé nesdílejí provincii', () => {
    const s0 = base();
    const plain = splitCountry(s0, SPR, NSP, SPAIN, true, 0);
    const t = splitCountry(s0, SPR, NSP, SPAIN, true, 0.34);
    expect(divisionCount(t, NSP)).toBeGreaterThan(divisionCount(plain, NSP));
    expect(divisionCount(t, SPR) + divisionCount(t, NSP)).toBe(divisionCount(s0, SPR));
    const where = new Map();
    for (let id = 1; id < t.mil.divs.length; id++) { const d = t.mil.divs[id]; if (!d) continue; const o = where.get(d.p); if (o != null && o !== d.o) throw new Error('nepřátelé v téže provincii'); where.set(d.p, d.o); if (d.o === NSP) expect(t.ctrl[d.p]).toBe(NSP); }
    expect(validateState(advance(t, 24 * 5))).toBeNull();
  });
  it('válka bez příznaku občanské (uvolnění národa) nevyhlašuje válku', () => {
    const t = splitCountry(base(), SPR, NSP, SPAIN, false);
    expect(atWar(t, 'SPR', 'NSP')).toBe(false);
    expect(isCivilWar(t, SPR, NSP)).toBe(false);
    expect(owned(t, NSP)).toBe(SPAIN.length);
  });
  it('po rozdělení hra běží: obě strany s AI vedou válku, invarianty drží', () => {
    let t = splitCountry(base(), SPR, NSP, SPAIN, true);
    for (let k = 0; k < 10; k++) { t = advance(t, 24 * 15); expect(validateState(t)).toBeNull(); }
    expect(divisionCount(t, NSP)).toBeGreaterThan(0);
    expect(t.mil.armies.some((a) => a && a.o === NSP)).toBe(true);   // povstalecká AI si sestavila armády
  }, 120000);
});

describe('španělská občanská válka', () => {
  it('v okně po 198. dni vypukne jednou, mimo okno nikdy, bez příznaku hist ne', () => {
    const s = base();
    expect(civilDay({ ...s, tick: 24 * 100 })).toEqual({ ...s, tick: 24 * 100 });
    const t = civilDay({ ...s, tick: 24 * 199 });
    expect(isCivilWar(t, SPR, NSP)).toBe(true);
    expect(t.nat.own[SPR].flags.civil_spain).toBe(1);
    const later = { ...t, tick: 24 * 205 };
    expect(civilDay(later)).toBe(later);   // jednorázově
    expect(civilDay({ ...s, tick: 24 * 400 })).toEqual({ ...s, tick: 24 * 400 });   // pozdní scénář válku nespouští
    const off = { ...base({ hist: false }), tick: 24 * 199 };
    expect(civilDay(off)).toBe(off);
  });
  it('v běžné hře začne válka sama kolem července 1936', () => {
    let s = base();
    s = advance(s, 24 * 196);
    expect(owned(s, NSP)).toBe(0);
    s = advance(s, 24 * 4);
    expect(owned(s, NSP)).toBe(SPAIN.length);
    expect(atWar(s, 'SPR', 'NSP')).toBe(true);
    expect(validateState(s)).toBeNull();
  }, 60000);
  it('scénář 1939 žádnou občanskou válku nespustí', () => {
    const s = createGame({ player: null, aiLevel: 2, scenario: '1939' });
    const t = advance(s, 24 * 3);
    expect(owned(t, NSP)).toBe(0);
    expect(isDormant(t, NSP)).toBe(true);
  });
});

describe('konec občanské války', () => {
  it('občanská válka nekončí pádem hlavního města, až držením většiny bodů země', () => {
    const s0 = splitCountry(base(), SPR, NSP, SPAIN, true);
    const take = (share) => {   // povstalci obsadí hlavní město a podíl vítězných bodů republiky
      const ctrl = s0.ctrl.slice();
      let total = 0, got = 0;
      for (let p = 1; p <= W.L; p++) if (s0.stateOwner[W.provState[p]] === SPR) total += W.vp[p] + 1;
      ctrl[W.owners[SPR].cap] = NSP; got += W.vp[W.owners[SPR].cap] + 1;
      for (let p = 1; p <= W.L && got < total * share; p++) if (s0.stateOwner[W.provState[p]] === SPR && ctrl[p] !== NSP) { ctrl[p] = NSP; got += W.vp[p] + 1; }
      return { ...s0, ctrl };
    };
    const half = advance(take(0.45), 24);
    expect(hasCapitulated(half, SPR)).toBe(false);
    expect(atWar(half, 'SPR', 'NSP')).toBe(true);
    const most = advance(take(0.8), 24);
    expect(owned(most, SPR)).toBe(0);   // republika kapitulovala a povstalci ji anektovali
  });
  it('kapitulace jedné strany: vítěz anektuje celý zbytek bez konference a povstalecká země zanikne', () => {
    let s = splitCountry(base(), SPR, NSP, SPAIN, true);
    // povstalci obsadí všechny republikánské provincie → republika kapituluje
    const ctrl = s.ctrl.slice();
    for (let p = 1; p <= W.L; p++) if (s.stateOwner[W.provState[p]] === SPR) ctrl[p] = NSP;
    s = capitulate({ ...s, ctrl }, SPR);
    expect(owned(s, SPR)).toBe(0);
    expect(owned(s, NSP)).toBe(SPAIN.length + 11);
    expect(s.dip.conf.length).toBe(0);
    expect(validateState(s)).toBeNull();
  });
  it('kapitulace povstalců: republika dostane svá území zpět a rezervní země je zase skrytá', () => {
    let s = splitCountry(base(), SPR, NSP, SPAIN, true);
    const ctrl = s.ctrl.slice();
    for (let p = 1; p <= W.L; p++) if (s.stateOwner[W.provState[p]] === NSP) ctrl[p] = SPR;
    s = capitulate({ ...s, ctrl }, NSP);
    expect(owned(s, NSP)).toBe(0);
    expect(owned(s, SPR)).toBeGreaterThan(SPAIN.length);
    expect(isDormant(s, NSP)).toBe(true);
    expect(countryTable(s).some((r) => r.tag === 'NSP')).toBe(false);
  });
});

describe('zahraniční pomoc', () => {
  it('Německo a Itálie smějí posílat výzbroj povstalcům, Sověti republice; mimo okno a bez hist ne', () => {
    const t = { ...splitCountry(base(), SPR, NSP, SPAIN, true), tick: 24 * 210 };
    expect(HIST_AID.length).toBeGreaterThanOrEqual(3);
    expect(lendFriend(t, GER, NSP)).toBe(true);
    expect(lendFriend(t, ITA, NSP)).toBe(true);
    expect(lendFriend(t, SOV, SPR)).toBe(true);
    expect(lendFriend(t, GER, SPR)).toBe(false);
    expect(lendFriend(t, SOV, NSP)).toBe(false);
    expect(lendFriend({ ...t, tick: 24 * 1500 }, GER, NSP)).toBe(false);
    const stock = t.mil.stock[GER].pusky;
    const sent = lendLease(t, GER, NSP, 'pusky', lendMax(t, GER, 'pusky'));
    expect(sent.mil.stock[GER].pusky).toBeLessThan(stock);
    expect(sent.mil.stock[NSP].pusky).toBeGreaterThan(t.mil.stock[NSP].pusky);
    const aid = aiLend(t, GER);
    expect(aid.mil.stock[NSP].pusky).toBeGreaterThanOrEqual(t.mil.stock[NSP].pusky);
  });
});

describe('stav a uložení', () => {
  it('verze 29, dormantní země přežijí uložení a načtení', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(29);
    const s = splitCountry(base(), SPR, NSP, SPAIN, true);
    const back = unpackGame(JSON.parse(JSON.stringify(packGame(s))));
    expect(back.error).toBeUndefined();
    expect(back.state.stateOwner[SPAIN[0]]).toBe(NSP);
    const other = unpackGame({ ...JSON.parse(JSON.stringify(packGame(s))), v: GAME_VERSION - 1 });
    expect(other.error).toMatch(/jiné verze/);
    void VIC; void SLO; void CRO;
  });
});
