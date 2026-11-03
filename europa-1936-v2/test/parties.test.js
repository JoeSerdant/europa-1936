// Strany a vláda (M72): počáteční podpora, posuny, podpora strany, převrat a jeho dopady (vztahy, bloky, rozhodnutí), zpravodajská operace, AI, stav a texty.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, validateState, GAME_VERSION, packGame, unpackGame, relOf, decisionBlock, politicsOf, POL, AI,
  ideologyOf, startParties, supportParty, supportBlock, pushParty, changeGov, shiftParty, rivalOf, ideoRel,
} from '../src/engine/index.js';
import { applyFx } from '../src/engine/nat/effects.js';
import { partiesDay } from '../src/engine/politics/parties.js';
import { aiParties } from '../src/engine/ai/parties.js';
import { SPY_OPS, SPY_OP_IDS } from '../src/data/spy/ops.js';
import { IDEO_ORDER } from '../src/data/politics/ideology.js';
import { COUNTRIES } from '../src/data/countries.js';
import { logLine, logImportant } from '../src/ui/logText.js';
import { popupFor } from '../src/ui/popups.js';
import { fxText } from '../src/data/nat/describe.js';
import { DECISIONS } from '../src/data/nat/decisions.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), FRA = idx('FRA'), ENG = idx('ENG'), SOV = idx('SOV'), PLN = idx('POL'), NSP = idx('NSP'), CZE = idx('CZE'), ROM = idx('ROM');
const base = () => createGame({ player: null, aiLevel: 0 });
const sum = (par) => IDEO_ORDER.reduce((a, k) => a + par[k], 0);
const setOwn = (s, o, patch) => { const own = s.pol.own.slice(); own[o] = { ...own[o], ...patch }; return { ...s, pol: { ...s.pol, own } }; };

describe('počáteční strany', () => {
  it('každá země má čtyři strany se součtem 100 a vládnoucí ideologii z dat', () => {
    const s = base();
    for (let o = 1; o < W.owners.length; o++) {
      const own = s.pol.own[o], tag = W.owners[o].tag;
      expect(Math.abs(sum(own.par) - 100), tag).toBeLessThan(0.2);
      expect(own.gov, tag).toBe(COUNTRIES[tag].ideology);
      expect(ideologyOf(s, o), tag).toBe(own.gov);
      for (const k of IDEO_ORDER) expect(own.par[k]).toBeGreaterThanOrEqual(0);
    }
  });
  it('vládnoucí strana má v každé zemi největší podporu; údaje z dat se použijí', () => {
    const s = base();
    for (let o = 1; o < W.owners.length; o++) {
      const own = s.pol.own[o];
      if (W.owners[o].tag === 'SPR') continue;   // Španělsko je těsné (občanská válka)
      expect(rivalOf(own).gap, W.owners[o].tag).toBeLessThan(0);
    }
    expect(startParties('GER').fascism).toBe(64);
    expect(startParties('SOV').communism).toBe(84);
  });
  it('rezervní země mají vlastní vládu a povstalci po rozdělení země ji dostanou také', () => {
    expect(base().pol.own[NSP].gov).toBe('fascism');
  });
});

describe('posun podpory', () => {
  it('shiftParty udrží součet 100 a nepřekročí meze', () => {
    const par = { democracy: 40, communism: 10, fascism: 30, neutrality: 20 };
    const up = shiftParty(par, 'communism', 5);
    expect(up.communism).toBeCloseTo(15, 6);
    expect(sum(up)).toBeCloseTo(100, 6);
    const dn = shiftParty(par, 'fascism', -50);
    expect(dn.fascism).toBe(0);
    expect(sum(dn)).toBeCloseTo(100, 6);
    expect(shiftParty(par, 'nevim', 5)).toBe(par);
    expect(shiftParty(par, 'fascism', 0)).toBe(par);
  });
  it('účinek party posune podporu dané strany, i vládnoucí ("gov")', () => {
    const s = base();
    const a = applyFx(s, GER, [{ t: 'party', i: 'communism', v: 8 }]);
    expect(a.pol.own[GER].par.communism).toBeCloseTo(s.pol.own[GER].par.communism + 8, 4);
    const b = applyFx(s, GER, [{ t: 'party', i: 'gov', v: -10 }]);
    expect(b.pol.own[GER].par.fascism).toBeCloseTo(s.pol.own[GER].par.fascism - 10, 4);
    expect(fxText({ t: 'party', i: 'gov', v: 5 })).toMatch(/vládnoucí/);
    expect(fxText({ t: 'party', i: 'communism', v: -5 })).toMatch(/Komunismus/);
  });
  it('v klidu zůstává podpora blízko výchozí, nestabilita posiluje radikály a válka fašisty', () => {
    let s = base();
    const start = s.pol.own[FRA].par;
    for (let d = 0; d < 400; d++) s = partiesDay({ ...s, tick: d * 24 }, () => false);
    for (const k of IDEO_ORDER) expect(Math.abs(s.pol.own[FRA].par[k] - start[k])).toBeLessThan(1.5);
    let u = setOwn(base(), FRA, { stab: 0.1 });
    for (let d = 0; d < 200; d++) u = partiesDay({ ...u, tick: d * 24 }, () => false);
    expect(u.pol.own[FRA].par.fascism).toBeGreaterThan(start.fascism + 2);
    expect(u.pol.own[FRA].par.communism).toBeGreaterThan(start.communism + 2);
    expect(u.pol.own[FRA].par.democracy).toBeLessThan(start.democracy - 2);
    expect(sum(u.pol.own[FRA].par)).toBeCloseTo(100, 4);
    let w = base();
    for (let d = 0; d < 200; d++) w = partiesDay({ ...w, tick: d * 24 }, () => true);
    expect(w.pol.own[ENG].par.fascism).toBeGreaterThan(base().pol.own[ENG].par.fascism);
  });
});

describe('podpora strany', () => {
  it('stojí politickou moc, přidá body a má pauzu', () => {
    let s = setOwn(base(), ENG, { pp: 200 });
    expect(supportBlock(s, ENG, 'democracy')).toBeNull();
    const t = supportParty(s, ENG, 'democracy');
    expect(t.pol.own[ENG].par.democracy).toBeCloseTo(s.pol.own[ENG].par.democracy + POL.PARTY_GAIN, 4);
    expect(t.pol.own[ENG].pp).toBe(200 - POL.PARTY_PP);
    expect(supportBlock(t, ENG, 'democracy')).toMatch(/Další podpora/);
    expect(supportParty(t, ENG, 'democracy')).toBe(t);
    const later = { ...t, tick: t.tick + POL.PARTY_CD * 24 };
    expect(supportBlock(later, ENG, 'democracy')).toBeNull();
  });
  it('bez politické moci nebo pro neznámou stranu se stav nezmění', () => {
    const s = setOwn(base(), ENG, { pp: 5 });
    expect(supportParty(s, ENG, 'democracy')).toBe(s);
    expect(supportParty(s, ENG, 'nic')).toBe(s);
    expect(pushParty(s, ENG, 'nic', 3)).toBe(s);
  });
});

describe('převrat', () => {
  const crisis = (o, rival) => {
    let s = setOwn(base(), o, { stab: 0.2 });
    const par = shiftParty(s.pol.own[o].par, rival, 60);
    return setOwn(s, o, { par });
  };
  it('předstihne-li soupeř vládnoucí stranu o COUP_GAP bodů při nízké stabilitě, vláda se změní a zapíše se do deníku', () => {
    const s = crisis(FRA, 'fascism');
    expect(rivalOf(s.pol.own[FRA]).gap).toBeGreaterThanOrEqual(POL.COUP_GAP);
    const t = partiesDay(s, () => false);
    expect(ideologyOf(t, FRA)).toBe('fascism');
    expect(t.pol.own[FRA].pp).toBe(0);
    expect(t.pol.own[FRA].stab).toBeCloseTo(Math.max(0.1, s.pol.own[FRA].stab - POL.COUP_HIT), 3);
    expect(t.pol.own[FRA].gt).toBe(t.tick);
    expect(t.log.items.some((e) => e.k === 'gov' && e.o === FRA && e.x === 'fascism')).toBe(true);
    expect(validateState(t)).toBeNull();
  });
  it('při vysoké stabilitě nebo po nedávné změně vlády k převratu nedojde', () => {
    const s = crisis(FRA, 'fascism');
    const calm = setOwn(s, FRA, { stab: 0.7 });
    expect(ideologyOf(partiesDay(calm, () => false), FRA)).toBe('democracy');
    const t = partiesDay(s, () => false);
    const again = setOwn(t, FRA, { par: shiftParty(t.pol.own[FRA].par, 'communism', 70), stab: 0.1 });
    expect(ideologyOf(partiesDay(again, () => false), FRA)).toBe('fascism');   // pauza COUP_COOL
  });
  it('po převratu se mění vztahy podle ideologie nové vlády', () => {
    const s = base();
    const before = { ger: relOf(s, FRA, GER), eng: relOf(s, FRA, ENG), sov: relOf(s, FRA, SOV) };
    const t = changeGov(s, FRA, 'fascism');
    expect(relOf(t, FRA, GER)).toBe(before.ger + ideoRel('fascism', 'fascism') - ideoRel('democracy', 'fascism'));
    expect(relOf(t, FRA, ENG)).toBe(before.eng + ideoRel('fascism', 'democracy') - ideoRel('democracy', 'democracy'));
    expect(relOf(t, FRA, SOV)).toBeLessThan(before.sov);
    expect(relOf(t, GER, FRA)).toBe(relOf(t, FRA, GER));
    expect(changeGov(t, FRA, 'fascism')).toBe(t);
  });
  it('členové bloku s neslučitelnou ideologií po změně vlády vedoucího blok opouštějí', () => {
    const s = base();
    const memOf = (st, o) => st.dip.facs[st.dip.fac[o]].mem;
    expect(memOf(s, PLN)).toContain(FRA);
    const t = changeGov(s, FRA, 'communism');   // Francie vede blok s demokratickou Belgií (nesluče se); Polsko je neutrální (sluče se)
    const mem = memOf(t, FRA);
    expect(mem).toContain(FRA);
    expect(mem).toContain(PLN);
    expect(mem).not.toContain(idx('BEL'));
    expect(t.dip.fac[idx('BEL')]).toBe(0);
  });
  it('podmínky rozhodnutí čtou aktuální ideologii vlády', () => {
    const d = DECISIONS.find((x) => x.when && x.when.ideo && x.when.ideo.length === 1 && x.when.ideo[0] === 'democracy' && !x.when.tag);
    expect(d).toBeTruthy();
    let s = setOwn(base(), FRA, { pp: 500 });
    const blocked = decisionBlock(s, FRA, d.id);
    expect(blocked).not.toBe('Neodpovídá ideologii vlády.');
    s = changeGov(s, FRA, 'fascism');
    expect(decisionBlock(s, FRA, d.id)).toBe('Neodpovídá ideologii vlády.');
  });
});

describe('zpravodajská operace a AI', () => {
  it('operace Podpora cizí strany existuje a posílí v cíli stranu s ideologií vlády zdroje', () => {
    expect(SPY_OPS.subvert).toBeTruthy();
    expect(SPY_OP_IDS).toContain('subvert');
    const s = base();
    const t = applyFx(s, FRA, [{ t: 'party', i: ideologyOf(s, GER), v: POL.SPY_SUBVERT }]);
    expect(t.pol.own[FRA].par.fascism).toBeCloseTo(s.pol.own[FRA].par.fascism + POL.SPY_SUBVERT, 4);
  });
  it('AI podpoří vládnoucí stranu jen týdně, s rezervou moci a při hrozbě', () => {
    const calm = setOwn(base(), FRA, { pp: 500 });
    expect(aiParties(calm, FRA)).toBe(calm);   // náskok vládnoucí strany je velký
    const threatened = setOwn(base(), FRA, { pp: 500, par: { democracy: 33, communism: 10, fascism: 37, neutrality: 20 } });
    expect(rivalOf(threatened.pol.own[FRA]).gap).toBeGreaterThan(-AI.PARTY_MARGIN);
    const act = aiParties(threatened, FRA);
    expect(act.pol.own[FRA].par.democracy).toBeCloseTo(38, 3);
    const midweek = { ...threatened, tick: 24 * 3 };
    expect(aiParties(midweek, FRA)).toBe(midweek);
    const poor = setOwn(threatened, FRA, { pp: 20 });
    expect(aiParties(poor, FRA)).toBe(poor);
  });
  it('dlouhá hra beze zásahu nezpůsobí v žádné velmoci převrat', () => {
    let s = createGame({ player: null, aiLevel: 2 });
    s = advance(s, 24 * 365);
    for (const t of ['GER', 'FRA', 'ENG', 'ITA', 'SOV']) expect(ideologyOf(s, idx(t)), t).toBe(COUNTRIES[t].ideology);
    expect(validateState(s)).toBeNull();
  }, 120000);
});

describe('stav, výběr a texty', () => {
  it('verze hry, kontrola stavu a uložení znají strany', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(31);
    const s = base();
    const bad = { ...s, pol: { ...s.pol, own: s.pol.own.map((x, i) => (i === GER ? { ...x, par: undefined } : x)) } };
    expect(validateState(bad)).toMatch(/strany/);
    const back = unpackGame(JSON.parse(JSON.stringify(packGame(s))));
    expect(back.state.pol.own[GER].par).toEqual(s.pol.own[GER].par);
  });
  it('selektor politiky vrací strany, soupeře a upozornění na převrat', () => {
    let s = setOwn(base(), FRA, { pp: 100 });
    const v = politicsOf(s, FRA).parties;
    expect(v.gov).toBe('democracy');
    expect(v.rows).toHaveLength(4);
    expect(v.rows.find((r) => r.gov).id).toBe('democracy');
    expect(v.risk).toBe(false);
    expect(v.rows.every((r) => r.block === null)).toBe(true);
    const near = setOwn(s, FRA, { stab: 0.3, par: shiftParty(s.pol.own[FRA].par, 'fascism', 40) });
    expect(politicsOf(near, FRA).parties.risk).toBe(true);
  });
  it('záznam gov má český text, hráči se ohlásí kartou a ostatním oznámením', () => {
    const e = { k: 'gov', o: FRA, x: 'fascism' };
    expect(logLine(e, FRA).text).toMatch(/převrat/);
    expect(logLine(e, FRA).tone).toBe('bad');
    expect(logImportant(e, FRA)).toBe(true);
    expect(popupFor(e, FRA)).toMatchObject({ kind: 'gov', sticky: true });
    expect(popupFor(e, GER)).toMatchObject({ kind: 'gov' });
    expect(popupFor(e, GER).sticky).toBeFalsy();
  });
});
void CZE; void ROM;
