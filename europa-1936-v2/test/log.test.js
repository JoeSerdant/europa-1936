// Zprávy a přehled zemí (M26): deník dění (zápisy ze systémů, kruhová paměť), texty záznamů, přehled zemí.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, logAdd, logAddMany, LOG_MAX, countryTable, declareWar, justifyWar, startWar, proposePeace, createFaction, inviteToFaction, capitulate,
  startResearch, startFocus, build, slotsOf, slotsUsed, applyFx, GAME_VERSION, validateState,
} from '../src/engine/index.js';
import { logLine, logImportant } from '../src/ui/logText.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const [GER, FRA, POL, ITA, SWE, CZE] = ['GER', 'FRA', 'POL', 'ITA', 'SWE', 'CZE'].map(idx);
const day = (s, n = 1) => advance(s, 24 * n);
const pp = (s, o, v) => { const own = s.pol.own.slice(); own[o] = { ...own[o], pp: v }; return { ...s, pol: { ...s.pol, own } }; };
const kinds = (s) => s.log.items.map((e) => e.k);

describe('deník', () => {
  const s0 = createGame({ player: 'GER' });
  it('začíná prázdný, má verzi 9 a je čistý JSON; kontrola uložené hry ho vyžaduje', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(9);
    expect(s0.log).toEqual({ n: 0, items: [] });
    expect(validateState({ ...s0, log: undefined })).toMatch(/log/);
    expect(validateState(s0)).toBeNull();
  });
  it('přidání dává id a čas; prázdný seznam nic nemění; paměť je omezená', () => {
    const a = logAdd({ ...s0, tick: 48 }, { k: 'cap', o: FRA });
    expect(a.log.items).toEqual([{ id: 1, t: 48, k: 'cap', o: FRA }]);
    expect(logAddMany(a, [])).toBe(a);
    let b = s0;
    for (let i = 0; i < LOG_MAX + 25; i++) b = logAdd(b, { k: 'cap', o: FRA });
    expect(b.log.items).toHaveLength(LOG_MAX);
    expect(b.log.n).toBe(LOG_MAX + 25);
    expect(b.log.items[0].id).toBe(26);
    expect(s0.log.items).toHaveLength(0);
  });
});

describe('zápisy ze systémů', () => {
  const s0 = createGame({ player: 'GER' });
  it('válka, mír, bloky a kapitulace se zapisují vždy', () => {
    let s = day(justifyWar(pp(s0, GER, 100), GER, POL), 31);
    s = startWar(s, GER, POL);
    expect(s.log.items.at(-1)).toMatchObject({ k: 'war', a: GER, b: POL });
    const p = proposePeace(s, GER, POL);
    expect(p.log.items.at(-1)).toMatchObject({ k: 'peace', a: GER, b: POL });
    const f = createFaction(pp(s0, ITA, 100), ITA, 'Osa');
    expect(f.log.items.at(-1)).toMatchObject({ k: 'faction', o: ITA, x: 'Osa' });
    const j = inviteToFaction(f, ITA, GER);
    expect(j.log.items.at(-1)).toMatchObject({ k: 'join', o: GER, x: 'Osa' });
    const c = capitulate(declareWar(s0, 'POL', 'GER'), GER);
    expect(kinds(c)).toContain('cap');
  });
  it('technologie, cíle, stavby a události se zapisují jen hráči', () => {
    // výzkum
    let s = startResearch(startResearch(s0, GER, 0, 'spoj'), GER, 1, 'pusky2');
    s = day(s, 75);
    expect(s.log.items.filter((e) => e.k === 'tech').every((e) => e.o === GER)).toBe(true);
    expect(s.log.items.some((e) => e.k === 'tech' && e.x === 'spoj')).toBe(true);
    // AI země dokončují výzkum, ale hráč je vidí jen u sebe
    const obs = day(createGame({ player: 'SWE', aiLevel: 0 }), 120);
    expect(obs.log.items.some((e) => e.k === 'tech' && e.o !== SWE)).toBe(false);
    // cíl
    let f = startFocus(s0, GER, 'ger_plan');
    f = day(f, 46);
    expect(f.log.items.some((e) => e.k === 'focus' && e.x === 'ger_plan' && e.o === GER)).toBe(true);
    // stavba
    const st = Array.from(W.stateOwner0).findIndex((o, i) => i > 0 && o === GER && slotsUsed(s0.ind, i) < slotsOf(s0.ind, i));
    let b = build(s0, st, 'civ');
    b = day(b, 46);
    const built = b.log.items.find((e) => e.k === 'built');
    expect(built).toMatchObject({ o: GER, s: st, x: 'civ' });
    // událost hráče
    let e = applyFx(s0, GER, [{ t: 'event', id: 'harvest', days: 1 }]);
    e = day(e, 2);
    expect(e.log.items.some((x) => x.k === 'event' && x.x === 'harvest')).toBe(true);
  });
  it('pozorovatel nemá osobní záznamy, jen světové', () => {
    const o = day(createGame({ player: null, aiLevel: 2 }), 200);
    expect(o.log.items.every((e) => ['war', 'peace', 'cap', 'faction', 'join'].includes(e.k))).toBe(true);
  });
  it('stav s deníkem pokračuje deterministicky a zůstává čistý JSON', () => {
    const s = startFocus(s0, GER, 'ger_plan');
    const a = day(s, 60);
    let b = s;
    for (let i = 0; i < 60; i++) b = day(b, 1);
    expect(JSON.stringify(b.log)).toBe(JSON.stringify(a.log));
    expect(JSON.parse(JSON.stringify(a.log))).toEqual(a.log);
  });
});

describe('texty záznamů', () => {
  it('každý druh záznamu má česky text, ikonu a příznaky', () => {
    const all = [
      { k: 'war', a: GER, b: POL }, { k: 'peace', a: GER, b: POL }, { k: 'cap', o: CZE }, { k: 'faction', o: ITA, x: 'Osa' }, { k: 'join', o: GER, x: 'Osa' },
      { k: 'tech', o: GER, x: 'pusky2' }, { k: 'focus', o: GER, x: 'ger_plan' }, { k: 'built', o: GER, s: 1, x: 'civ' }, { k: 'event', o: GER, x: 'harvest' }, { k: 'nic' },
    ];
    for (const e of all) { const l = logLine(e, GER); expect(l.text.length).toBeGreaterThan(5); expect(l.icon).toBeTruthy(); expect(['bad', 'good', 'info']).toContain(l.tone); }
    expect(logLine(all[0], GER)).toMatchObject({ mine: true, world: true, text: 'Válka: Německo napadá zemi Polsko.' });
    expect(logLine(all[0], SWE).mine).toBe(false);
    expect(logLine(all[2], GER).text).toBe('Kapitulace: Československo.');
    expect(logLine(all[5], GER).text).toBe('Výzkum dokončen: Opakovací pušky II.');
    expect(logLine(all[7], GER).text).toMatch(/Civilní továrna/);
    expect(logLine({ k: 'tech', o: GER, x: 'neexistuje' }, GER).text).toMatch(/neexistuje/);
  });
  it('důležité záznamy: válka hráče, kapitulace, technologie a cíle; cizí válka ne', () => {
    expect(logImportant({ k: 'war', a: GER, b: POL }, GER)).toBe(true);
    expect(logImportant({ k: 'war', a: ITA, b: FRA }, GER)).toBe(false);
    expect(logImportant({ k: 'cap', o: CZE }, GER)).toBe(true);
    expect(logImportant({ k: 'tech', o: GER, x: 'spoj' }, GER)).toBe(true);
    expect(logImportant({ k: 'built', o: GER, x: 'civ' }, GER)).toBe(false);
  });
});

describe('přehled zemí', () => {
  it('seřazeno podle vítězných bodů, každá země jednou, příznaky hráče, války a kapitulace', () => {
    const s = createGame({ player: 'GER' });
    const t = countryTable(s);
    expect(t).toHaveLength(W.owners.length - 1);
    for (let i = 1; i < t.length; i++) expect(t[i - 1].vp).toBeGreaterThanOrEqual(t[i].vp);
    expect(new Set(t.map((r) => r.o)).size).toBe(t.length);
    expect(t.find((r) => r.tag === 'GER')).toMatchObject({ player: true, war: false, cap: false, faction: null });
    expect(t.filter((r) => r.player)).toHaveLength(1);
    expect(t.find((r) => r.tag === 'CZE').faction).toBe('Malá dohoda');
    const g = t.find((r) => r.tag === 'GER');
    expect(g.divs).toBeGreaterThan(10);
    expect(g.civ + g.mil).toBeGreaterThan(30);
    const w = declareWar(s, 'POL', 'GER');
    expect(countryTable(w).find((r) => r.tag === 'POL').war).toBe(true);
    const c = capitulate(w, GER);
    expect(countryTable(c).find((r) => r.tag === 'GER').cap).toBe(true);
    expect(countryTable({ ...s, player: null }).some((r) => r.player)).toBe(false);
  });
});
