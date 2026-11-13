// Pakty o neútočení a zlepšování vztahů (M75): nabídka, přijetí AI, nabídka hráči, blokování války a ultimát, vypovězení, zánik válkou bloků, historický pakt, texty.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, validateState, GAME_VERSION, packGame, unpackGame, relOf, declareWar, warBlock, justifyWar, startWar, diplomacyOf, alertsOf, DIP,
  pactOf, pactBlock, pactAccepts, proposePact, answerPact, breakBlock, breakPact, voidPacts, pactDay, improveBlock, improveRelations, pactOffers, HIST_PACTS,
  demandBlock,
} from '../src/engine/index.js';
import { aiDiplomacy } from '../src/engine/ai/diplomacy.js';
import { logLine, logImportant } from '../src/ui/logText.js';
import { popupFor } from '../src/ui/popups.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), SOV = idx('SOV'), FRA = idx('FRA'), ENG = idx('ENG'), ITA = idx('ITA'), PLN = idx('POL'), BEL = idx('BEL');
const pp = (s, o, v = 300) => { const own = s.pol.own.slice(); own[o] = { ...own[o], pp: v }; return { ...s, pol: { ...s.pol, own } }; };
const base = (extra = {}) => pp(pp(createGame({ player: null, aiLevel: 0, ...extra }), GER), ITA);

describe('nabídka a přijetí', () => {
  it('spřátelená země pakt přijme, nepřátelsky naladěná odmítne; obojí stojí politickou moc a zapíše se', () => {
    const s = base();
    expect(relOf(s, ITA, GER)).toBeGreaterThanOrEqual(DIP.NAP_REL);
    const a = proposePact(s, GER, ITA);
    expect(pactOf(a, GER, ITA)).toMatchObject({ a: GER, b: ITA, t: s.tick });
    expect(pactOf(a, ITA, GER)).toBe(pactOf(a, GER, ITA));
    expect(a.pol.own[GER].pp).toBe(300 - DIP.NAP_PP);
    expect(relOf(a, GER, ITA)).toBe(Math.min(100, relOf(s, GER, ITA) + DIP.NAP_GAIN));
    expect(a.log.items.some((e) => e.k === 'nap' && e.y === 1)).toBe(true);
    expect(pactAccepts(s, GER, SOV).ok).toBe(false);
    const r = proposePact(s, GER, SOV);
    expect(pactOf(r, GER, SOV)).toBeNull();
    expect(r.pol.own[GER].pp).toBe(300 - DIP.NAP_PP);
    expect(r.log.items.some((e) => e.k === 'nap' && e.y === 0)).toBe(true);
  });
  it('společný nepřítel a vlastní válka cíle přijetí usnadní; kdo chystá válku, odmítne vždy', () => {
    const s = base();
    const w = declareWar(declareWar(s, 'GER', 'FRA'), 'SOV', 'FRA');
    expect(pactAccepts(w, GER, SOV).score).toBe(relOf(w, SOV, GER) + DIP.NAP_ENEMY + DIP.NAP_WAR);
    const j = justifyWar(pp(s, SOV), SOV, GER);
    expect(pactAccepts(j, GER, SOV).ok).toBe(false);
  });
  it('neplatné nabídky vracejí tentýž stav s důvodem', () => {
    const s = base();
    expect(pactBlock(s, GER, GER)).toBeTruthy();
    expect(pactBlock(pp(s, GER, 0), GER, ITA)).toMatch(/politická moc/);
    expect(pactBlock(declareWar(s, 'GER', 'ITA'), GER, ITA)).toMatch(/válce/);
    expect(pactBlock(s, FRA, PLN)).toMatch(/bloku/);
    const a = proposePact(s, GER, ITA);
    expect(pactBlock(a, ITA, GER)).toMatch(/už platí/);
    expect(proposePact(a, GER, ITA)).toBe(a);
  });
  it('historická dohoda se podepíše i přes špatné vztahy', () => {
    const s = base();
    expect(pactOf(proposePact(s, GER, SOV, true), GER, SOV)).toBeTruthy();
  });
});

describe('účinek paktu', () => {
  const s = proposePact(base(), GER, ITA);
  it('brání ospravedlnění, vyhlášení války i ultimátu', () => {
    expect(warBlock(s, GER, ITA)).toMatch(/pakt/);
    expect(warBlock(s, ITA, GER)).toMatch(/pakt/);
    expect(justifyWar(s, GER, ITA)).toBe(s);
    expect(startWar(s, ITA, GER, true)).toBe(s);
    expect(demandBlock(s, GER, ITA, { id: 'x', kind: 'annex', states: [] })).toMatch(/pakt/);
  });
  it('vypovědět jde až po NAP_MIN_DAYS dnech; stojí stabilitu a vztahy a válka je zase možná', () => {
    expect(breakBlock(s, GER, ITA)).toMatch(/až za/);
    expect(breakPact(s, GER, ITA)).toBe(s);
    const later = { ...s, tick: s.tick + DIP.NAP_MIN_DAYS * 24 };
    expect(breakBlock(later, GER, ITA)).toBeNull();
    const b = breakPact(later, ITA, GER);
    expect(pactOf(b, GER, ITA)).toBeNull();
    expect(b.pol.own[ITA].stab).toBeCloseTo(later.pol.own[ITA].stab - DIP.NAP_BREAK_STAB, 6);
    expect(relOf(b, GER, ITA)).toBeLessThan(relOf(later, GER, ITA));
    expect(warBlock(b, ITA, GER)).toBeNull();
    expect(b.log.items.some((e) => e.k === 'napend' && e.a === ITA && e.b === GER)).toBe(true);
    expect(breakBlock(b, GER, ITA)).toMatch(/Žádný pakt/);
  });
  it('válka bloků pakt mezi jejich členy zruší (voidPacts) a zaniklá země pakt ztrácí', () => {
    const PLN = W.ownerIdx.POL;
    let t = proposePact(pp(base(), PLN), PLN, GER, true);
    expect(pactOf(t, GER, PLN)).toBeTruthy();
    t = { ...t, dip: { ...t.dip, just: [{ a: GER, b: FRA, g: 'conquest', ready: t.tick }] } };
    t = startWar(t, GER, FRA);   // Polsko je v bloku Francie
    expect(pactOf(t, GER, PLN)).toBeNull();
    const cap = { ...s, dip: { ...s.dip, cap: s.dip.cap.map((v, i) => (i === ITA ? 1 : v)) } };
    expect(pactOf(pactDay(cap), GER, ITA)).toBeNull();
    expect(voidPacts(s)).toBe(s);
  });
});

describe('nabídka hráči', () => {
  const s0 = pp(createGame({ player: 'SOV', aiLevel: 0 }), GER);
  it('hráč dostane nabídku do fronty, upozornění a může ji přijmout nebo odmítnout', () => {
    const s = proposePact(s0, GER, SOV);
    expect(pactOf(s, GER, SOV)).toBeNull();
    expect(pactOffers(s, SOV)).toEqual([{ a: GER, left: DIP.NAP_OFFER_DAYS }]);
    expect(alertsOf(s, SOV).find((a) => a.id === 'offer')).toMatchObject({ panel: 'dip', n: 1 });
    expect(diplomacyOf(s, SOV).offers[0]).toMatchObject({ tag: 'GER' });
    const yes = answerPact(s, SOV, GER, true);
    expect(pactOf(yes, GER, SOV)).toBeTruthy();
    expect(pactOffers(yes, SOV)).toEqual([]);
    const no = answerPact(s, SOV, GER, false);
    expect(pactOf(no, GER, SOV)).toBeNull();
    expect(pactOffers(no, SOV)).toEqual([]);
    expect(answerPact(s0, SOV, GER, true)).toBe(s0);
  });
  it('nabídka po NAP_OFFER_DAYS dnech vyprší', () => {
    const s = proposePact(s0, GER, SOV);
    const late = pactDay({ ...s, tick: s.tick + DIP.NAP_OFFER_DAYS * 24 });
    expect(pactOffers(late, SOV)).toEqual([]);
  });
});

describe('zlepšování vztahů', () => {
  it('stojí politickou moc a zvedne vztah; ve válce nebo nad stropem nejde', () => {
    const s = base();
    const a = improveRelations(s, GER, FRA);
    expect(relOf(a, GER, FRA)).toBe(relOf(s, GER, FRA) + DIP.IMPROVE_GAIN);
    expect(a.pol.own[GER].pp).toBe(300 - DIP.IMPROVE_PP);
    expect(improveBlock(declareWar(s, 'GER', 'FRA'), GER, FRA)).toMatch(/válce/);
    expect(improveBlock(pp(s, GER, 0), GER, FRA)).toMatch(/politická moc/);
    let hi = s;
    for (let i = 0; i < 20 && !improveBlock(hi, GER, ITA); i++) hi = improveRelations(pp(hi, GER), GER, ITA);
    expect(relOf(hi, GER, ITA)).toBeGreaterThanOrEqual(DIP.IMPROVE_MAX);
    expect(improveRelations(hi, GER, ITA)).toBe(hi);
  });
});

describe('AI a historie', () => {
  it('data historických paktů odkazují na existující země', () => {
    for (const p of HIST_PACTS) { expect(idx(p.tag)).toBeTruthy(); expect(idx(p.target)).toBeTruthy(); expect(p.until).toBeGreaterThan(p.from); }
  });
  it('s historickou AI Německo v okně nabídne pakt SSSR a ten ho přijme; mimo okno ne', () => {
    let s = pp(createGame({ player: null, aiLevel: 2 }), GER);
    expect(pactOf(aiDiplomacy(s, GER), GER, SOV)).toBeNull();
    s = { ...s, tick: HIST_PACTS[0].from * 24 };
    const t = aiDiplomacy(s, GER);
    expect(pactOf(t, GER, SOV)).toBeTruthy();
  });
  it('historický útok přes pakt: AI ho nejdřív vypoví (až to jde), potom útočí', () => {
    let s = pp(createGame({ player: null, aiLevel: 2 }), GER);
    s = proposePact({ ...s, tick: 1330 * 24 }, GER, SOV, true);
    const early = aiDiplomacy({ ...s, tick: 1500 * 24 }, GER);
    expect(pactOf(early, GER, SOV)).toBeTruthy();
    let late = pp({ ...s, tick: 1965 * 24 }, GER);
    for (let i = 0; i < 30 && pactOf(late, GER, SOV); i++) late = aiDiplomacy(late, GER);   // AI dělá jeden diplomatický krok denně
    expect(pactOf(late, GER, SOV)).toBeNull();
    expect(late.log.items.some((e) => e.k === 'napend' && e.a === GER)).toBe(true);
  });
  it('ve scénáři 1939 a v dlouhé hře stav zůstává platný a pakt vznikne', () => {
    let s = createGame({ player: null, aiLevel: 2, scenario: '1939' });
    expect(pactOf(s, GER, SOV)).toBeTruthy();   // scénář začíná po podpisu
    s = advance(s, 24 * 20);
    expect(pactOf(s, GER, SOV)).toBeTruthy();
    expect(validateState(s)).toBeNull();
  }, 120000);
});

describe('stav a texty', () => {
  it('verze hry, kontrola stavu a uložení znají pakty', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(34);
    const s = proposePact(base(), GER, ITA);
    expect(validateState(s)).toBeNull();
    expect(validateState({ ...s, dip: { ...s.dip, nap: null } })).toBeTruthy();
    const back = unpackGame(JSON.parse(JSON.stringify(packGame(s))));
    expect(pactOf(back.state, GER, ITA)).toBeTruthy();
  });
  it('přehled diplomacie ukazuje pakt, důvody a odhad přijetí', () => {
    const s = base();
    const row = (st, t) => diplomacyOf(st, GER).list.find((c) => c.o === t);
    expect(row(s, ITA)).toMatchObject({ pact: null, pactBlock: null, pactOdds: true, improveBlock: null });
    expect(row(s, SOV).pactOdds).toBe(false);
    const a = proposePact(s, GER, ITA);
    expect(row(a, ITA).pact).toMatchObject({ days: 0 });
    expect(row(a, ITA).pact.breakBlock).toMatch(/až za/);
  });
  it('záznamy nap, napq a napend mají texty a karty', () => {
    expect(logLine({ k: 'nap', a: GER, b: SOV, y: 1 }, FRA).text).toMatch(/pakt o neútočení/);
    expect(logLine({ k: 'nap', a: GER, b: SOV, y: 0 }, GER).text).toMatch(/odmítla/);
    expect(logLine({ k: 'napq', a: GER, b: SOV }, SOV).text).toMatch(/nabízí/);
    expect(logLine({ k: 'napend', a: GER, b: SOV }, SOV).text).toMatch(/vypověděla/);
    expect(logImportant({ k: 'napq', a: GER, b: SOV }, SOV)).toBe(true);
    expect(logImportant({ k: 'napend', a: GER, b: SOV }, SOV)).toBe(true);
    expect(logImportant({ k: 'nap', a: GER, b: SOV, y: 1 }, FRA)).toBe(false);
    expect(popupFor({ k: 'napq', a: GER, b: SOV }, SOV)).toMatchObject({ kind: 'napq', sticky: true });
    expect(popupFor({ k: 'napend', a: GER, b: SOV }, SOV)).toMatchObject({ kind: 'napend' });
    expect(popupFor({ k: 'nap', a: GER, b: SOV, y: 1 }, SOV)).toMatchObject({ kind: 'nap' });
    expect(popupFor({ k: 'nap', a: GER, b: SOV, y: 1 }, ENG)).toBeNull();
  });
});
