// Politika (M21): stabilita, podpora války, politická moc, zákony, poradci, dopady na průmysl, výzkum a lidskou sílu, AI-lite, čistota a determinismus.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, advanceHour, declareWar, setLaw, hireAdvisor, fireAdvisor, politicsOf, polModsOf, consOf, outMult, manMult, stabMult, lawBlock,
  industryOf, researchOf, startResearch, POL, LAWS, LAW_CATS, ADVISORS, ADV_SLOT_IDS, GAME_VERSION,
} from '../src/engine/index.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), ENG = idx('ENG'), FRA = idx('FRA'), SOV = idx('SOV'), POL_ = idx('POL');
const day = (s, n = 1) => advance(s, 24 * n);
const set = (s, o, patch) => { const own = s.pol.own.slice(); own[o] = { ...own[o], ...patch }; return { ...s, pol: { ...s.pol, own } }; };

describe('data', () => {
  it('zákony mají pořadí kroků, ceny a známé bonusy; poradci patří do existujících slotů', () => {
    const keys = new Set(['stab', 'ws', 'cons', 'build', 'prod', 'extract', 'imp', 'man', 'research']);
    for (const cat in LAW_CATS) for (const id of LAW_CATS[cat].order) { const l = LAWS[cat][id]; expect(l).toBeTruthy(); expect(l.pp).toBeGreaterThanOrEqual(0); for (const k in l.mod) expect(keys.has(k)).toBe(true); }
    for (const cat in LAWS) expect(Object.keys(LAWS[cat]).sort()).toEqual([...LAW_CATS[cat].order].sort());
    for (const id in ADVISORS) { expect(ADV_SLOT_IDS).toContain(ADVISORS[id].slot); for (const k in ADVISORS[id].mod) expect(keys.has(k)).toBe(true); }
    for (const slot of ADV_SLOT_IDS) expect(Object.values(ADVISORS).some((a) => a.slot === slot)).toBe(true);
  });
});

describe('začátek', () => {
  const s = createGame({ player: 'GER' });
  it('čistý JSON, verze 5, každá země má hodnoty a zákony', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(5);
    expect(JSON.parse(JSON.stringify(s.pol))).toEqual(s.pol);
    for (let o = 1; o < W.owners.length; o++) {
      const e = s.pol.own[o];
      expect(e.stab).toBeGreaterThan(0); expect(e.stab).toBeLessThanOrEqual(1);
      expect(e.ws).toBeGreaterThanOrEqual(0); expect(e.ws).toBeLessThanOrEqual(1);
      expect(e.pp).toBe(0);
      for (const cat in LAW_CATS) expect(LAWS[cat][e.laws[cat]]).toBeTruthy();
      expect(Object.values(e.adv)).toEqual([0, 0, 0, 0]);
    }
  });
  it('národní hodnoty: Německo odvádí rozšířeně, Británie dobrovolně a s volným obchodem', () => {
    expect(s.pol.own[GER].laws).toEqual({ eco: 'civ', con: 'ext', trd: 'lim' });
    expect(s.pol.own[ENG].laws).toEqual({ eco: 'civ', con: 'vol', trd: 'free' });
    expect(s.pol.own[SOV].laws.trd).toBe('closed');
    expect(s.pol.own[GER].ws).toBeGreaterThan(s.pol.own[ENG].ws);
  });
});

describe('denní krok', () => {
  const s0 = createGame({ player: 'GER' });
  it('politická moc roste o PP_BASE za den a má strop', () => {
    const a = day(s0, 10);
    expect(a.pol.own[GER].pp).toBe(10 * POL.PP_BASE);
    const b = day(set(s0, GER, { pp: POL.PP_MAX - 1 }), 3);
    expect(b.pol.own[GER].pp).toBe(POL.PP_MAX);
  });
  it('stabilita a podpora války se pomalu blíží k cíli, nepřestřelí ho', () => {
    const a = day(set(s0, GER, { stab: 0.2, ws: 0.9 }), 10);
    expect(a.pol.own[GER].stab).toBeCloseTo(0.2 + 10 * POL.DRIFT, 9);
    expect(a.pol.own[GER].ws).toBeCloseTo(0.9 - 10 * POL.DRIFT, 9);
    const b = day(set(s0, GER, { stab: 0.699 }), 5);
    expect(b.pol.own[GER].stab).toBeCloseTo(politicsOf(s0, 'GER').target.stab, 9);
    expect(politicsOf(s0, 'GER').target.stab).toBeCloseTo(0.7 - 0.02, 9);   // základ 0,7 − rozšířený odvod
  });
  it('válka zvedá cíl podpory války', () => {
    const w = declareWar(s0, 'ENG', 'FRA');
    expect(politicsOf(w, 'ENG').target.ws).toBeCloseTo(politicsOf(s0, 'ENG').target.ws + POL.WAR_WS, 9);
    expect(politicsOf(w, 'GER').target.ws).toBeCloseTo(politicsOf(s0, 'GER').target.ws, 9);
  });
  it('okupovaný stát snižuje cíl stability', () => {
    const state = Array.from(W.stateOwner0).findIndex((o, i) => i > 0 && o === GER);
    const ctrl = s0.ctrl.slice(); ctrl[W.states[state].cap] = FRA;
    const occ = { ...s0, ctrl };
    expect(politicsOf(occ, 'GER').target.stab).toBeCloseTo(politicsOf(s0, 'GER').target.stab - POL.OCC_STAB, 9);
  });
  it('hodina mimo půlnoc nemění objekt `pol`', () => {
    const a = day(s0, 1);
    expect(advanceHour(a).pol).toBe(a.pol);
  });
});

describe('zákony', () => {
  const s0 = createGame({ player: 'GER' });
  it('změna stojí politickou moc a vyžaduje podporu války; neplatný vstup vrací tentýž stav', () => {
    expect(setLaw(s0, GER, 'eco', 'early')).toBe(s0);                       // chybí politická moc
    expect(lawBlock(s0.pol.own[GER], 'eco', 'early')).toMatch(/politická moc/);
    const rich = set(s0, GER, { pp: 1000 });
    const a = setLaw(rich, GER, 'eco', 'early');
    expect(a.pol.own[GER].laws.eco).toBe('early');
    expect(a.pol.own[GER].pp).toBe(1000 - LAWS.eco.early.pp);
    expect(a.pol.ver).toBe(rich.pol.ver + 1);
    expect(setLaw(a, GER, 'eco', 'early')).toBe(a);                         // už platí
    expect(setLaw(rich, GER, 'eco', 'nic')).toBe(rich);
    expect(setLaw(rich, GER, 'nic', 'early')).toBe(rich);
    expect(setLaw(rich, 0, 'eco', 'early')).toBe(rich);
    const lowWs = set(rich, GER, { ws: 0.1 });
    expect(setLaw(lowWs, GER, 'eco', 'total')).toBe(lowWs);
    expect(lawBlock(lowWs.pol.own[GER], 'eco', 'total')).toMatch(/podporu války/);
    expect(setLaw(set(rich, GER, { ws: 0.9 }), GER, 'eco', 'total')).not.toBe(rich);
  });
  it('ekonomika mění spotřební zboží, výrobu a body stavby; odvod lidskou sílu', () => {
    const rich = set(s0, GER, { pp: 1000, ws: 0.9 });
    const war = setLaw(rich, GER, 'eco', 'war');
    expect(consOf(war, GER)).toBeCloseTo(consOf(rich, GER) - 0.15, 9);
    expect(industryOf(war, 'GER').consFac).toBeLessThan(industryOf(rich, 'GER').consFac);
    expect(industryOf(war, 'GER').points).toBeGreaterThan(industryOf(rich, 'GER').points);
    expect(outMult(war, GER)).toBeCloseTo(outMult(rich, GER) * 1.05 * (stabMult(war.pol.own[GER].stab) / stabMult(rich.pol.own[GER].stab)), 9);
    const serv = setLaw(rich, GER, 'con', 'serv');
    expect(manMult(serv, GER)).toBeGreaterThan(manMult(rich, GER) * 1.3);
    expect(polModsOf(serv, GER).man).toBe(1);
  });
  it('obchodní zákon mění cenu dovozu; vyšší produkce zvedá výstup linek', () => {
    const rich = set(s0, GER, { pp: 1000, ws: 0.9 });
    const rich1 = day(rich, 1);   // smlouvy dodají první den
    const free = setLaw(rich1, GER, 'trd', 'free');
    const closed = setLaw(rich1, GER, 'trd', 'closed');
    expect(industryOf(free, 'GER').tradeCiv).toBeLessThan(industryOf(closed, 'GER').tradeCiv);
    const base = day(rich, 20), war = day(setLaw(rich, GER, 'eco', 'total'), 20);
    const made = (g) => g.ind.lines.filter((l) => l.o === GER).reduce((a, l) => a + l.out, 0);
    expect(made(war)).toBeGreaterThanOrEqual(made(base));
  });
  it('stabilita ovlivňuje výstup továren', () => {
    const lo = set(s0, GER, { stab: 0.2 }), hi = set(s0, GER, { stab: 0.9 });
    expect(outMult(hi, GER)).toBeGreaterThan(outMult(lo, GER));
    expect(industryOf(hi, 'GER').points).toBeGreaterThan(industryOf(lo, 'GER').points);
    expect(stabMult(0.5)).toBe(1);
  });
});

describe('poradci', () => {
  const s0 = set(createGame({ player: 'GER' }), GER, { pp: 500 });
  it('najmutí, přepsání a propuštění; špatný slot nebo málo moci nic nezmění', () => {
    const a = hireAdvisor(s0, GER, 'sci', 'akademik');
    expect(a.pol.own[GER].adv.sci).toBe('akademik');
    expect(a.pol.own[GER].pp).toBe(500 - ADVISORS.akademik.pp);
    expect(hireAdvisor(a, GER, 'sci', 'akademik')).toBe(a);
    expect(hireAdvisor(s0, GER, 'pol', 'akademik')).toBe(s0);
    expect(hireAdvisor(s0, GER, 'xxx', 'akademik')).toBe(s0);
    expect(hireAdvisor(s0, GER, 'sci', 'nikdo')).toBe(s0);
    expect(hireAdvisor(set(s0, GER, { pp: 5 }), GER, 'sci', 'akademik').pol.own[GER].adv.sci).toBe(0);
    const b = hireAdvisor(a, GER, 'sci', 'organizator');
    expect(b.pol.own[GER].adv.sci).toBe('organizator');
    expect(fireAdvisor(b, GER, 'sci').pol.own[GER].adv.sci).toBe(0);
    expect(fireAdvisor(s0, GER, 'sci')).toBe(s0);
  });
  it('poradci dávají bonusy: výzkum, výroba, stabilita', () => {
    const a = hireAdvisor(hireAdvisor(s0, GER, 'sci', 'akademik'), GER, 'ind', 'koncern');
    expect(researchOf(a, 'GER').speed).toBeCloseTo(researchOf(s0, 'GER').speed * 1.1, 9);
    expect(polModsOf(a, GER).prod).toBeCloseTo(0.05, 9);
    const d = hireAdvisor(s0, GER, 'pol', 'diplomat');
    expect(politicsOf(d, 'GER').target.stab).toBeCloseTo(politicsOf(s0, 'GER').target.stab + 0.04, 9);
    const t = startResearch(a, GER, 0, 'pusky2');
    expect(researchOf(t, 'GER').slots[0].eta).toBeLessThan(researchOf(startResearch(s0, GER, 0, 'pusky2'), 'GER').slots[0].eta);
  });
});

describe('země bez hráče', () => {
  it('za války posiluje zákony a bere poradce, v míru jen poradce', () => {
    let s = createGame({ player: 'GER' });
    s = set(s, FRA, { pp: 600, ws: 0.9 });
    s = declareWar(s, 'FRA', 'POL');
    const a = day(s, 3);
    expect(a.pol.own[FRA].laws.eco).not.toBe('civ');
    const peace = day(set(createGame({ player: 'GER' }), SOV, { pp: 300 }), 3);
    expect(peace.pol.own[SOV].laws.eco).toBe('civ');
    expect(Object.values(peace.pol.own[SOV].adv).some(Boolean)).toBe(true);
    expect(Object.values(a.pol.own[GER].adv)).toEqual([0, 0, 0, 0]);   // hráč si řídí sám
    void POL_;
  });
});

describe('čistota a determinismus', () => {
  it('120 dní: původní stav se nemění, dělení kroků nevadí, JSON čistý, hodnoty v mezích', () => {
    let s = createGame({ player: 'GER' });
    s = set(s, GER, { pp: 500, ws: 0.9 });
    s = setLaw(hireAdvisor(s, GER, 'ind', 'stavitel'), GER, 'eco', 'war');
    const snap = JSON.stringify(s);
    const a = day(s, 120);
    expect(JSON.stringify(s)).toBe(snap);
    let b = s;
    for (let i = 0; i < 120; i++) b = day(b, 1);
    expect(JSON.stringify(b.pol)).toBe(JSON.stringify(a.pol));
    expect(JSON.parse(JSON.stringify(a.pol))).toEqual(a.pol);
    for (let o = 1; o < a.pol.own.length; o++) { const e = a.pol.own[o]; expect(e.stab).toBeGreaterThanOrEqual(0); expect(e.stab).toBeLessThanOrEqual(1); expect(e.ws).toBeGreaterThanOrEqual(0); expect(e.ws).toBeLessThanOrEqual(1); expect(e.pp).toBeGreaterThanOrEqual(0); }
  });
});
