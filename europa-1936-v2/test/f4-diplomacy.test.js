// F4: dobrovolníci a expediční sbory, vojenský atašé, licenční výroba, volby v demokraciích a vrchní velení (náčelníci štábů).
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, declareWar, atWar, capitulate, DIP, GAME_VERSION, validateState,
  volKind, volCap, volBlock, sendVolunteers, recallVolunteers, volAway, volDay,
  attBlock, sendAttache, recallAttache, attDay, attMods, attachesOf,
  LIC_KEYS, licOffers, licBlock, buyLicence, licCost,
  electionPlan, nextElection, electionsDay, POL, docMods, hireAdvisor, ADVISORS, ADV_SLOTS, changeGov,
} from '../src/engine/index.js';
import { logLine } from '../src/ui/logText.js';
import { groupOf } from '../src/ui/notify.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const [GER, FRA, ENG, PL, ITA, SOV, SWE, BEL, CZE, ROM, YUG, HUN] = ['GER', 'FRA', 'ENG', 'POL', 'ITA', 'SOV', 'SWE', 'BEL', 'CZE', 'ROM', 'YUG', 'HUN'].map(idx);
const setPol = (s, o, patch) => { const own = s.pol.own.slice(); own[o] = { ...own[o], ...patch }; return { ...s, pol: { ...s.pol, own } }; };
const idleDivs = (s, o, n) => { const out = []; for (let id = 1; id < s.mil.divs.length && out.length < n; id++) { const d = s.mil.divs[id]; if (d && d.o === o && !d.b && !d.vo) out.push(id); } return out; };
const setLv = (s, o, k, v) => { const lv = s.mil.lv.slice(); lv[o] = { ...(lv[o] || {}), [k]: v }; return { ...s, mil: { ...s.mil, lv } }; };

describe('F4: tvar stavu', () => {
  it('verze 50, prázdný seznam atašé, sloty vrchního velení, čistý JSON a platné uložení', () => {
    const s = createGame({ player: 'GER' });
    expect(GAME_VERSION).toBeGreaterThanOrEqual(50);
    expect(s.dip.att).toEqual([]);
    expect(s.pol.own[GER].adv).toMatchObject({ army: 0, navy: 0, air: 0 });
    expect(validateState(JSON.parse(JSON.stringify(s)))).toBeNull();
    expect(validateState({ ...s, dip: { ...s.dip, att: null } })).toBeTruthy();
  });
});

describe('F4: dobrovolníci a expediční sbor', () => {
  const friends = (s, a, b) => ({ ...s, dip: { ...s.dip, rel: { ...s.dip.rel, [a < b ? `${a}-${b}` : `${b}-${a}`]: 80 } } });
  const base = () => friends(setPol(declareWar(createGame({ player: 'ITA' }), 'POL', 'CZE'), ITA, { ws: 0.8 }), ITA, PL);
  it('druh pomoci: země mimo válku posílá dobrovolníky, spolubojovník expediční sbor, nepřítel nic', () => {
    let s = base();
    expect(volKind(s, ITA, PL)).toBe('vol');
    expect(volKind(s, CZE, PL)).toBeNull();          // ve válce s příjemcem
    expect(volKind(s, ITA, GER)).toBeNull();          // příjemce neválčí
    s = declareWar(s, 'HUN', 'CZE');
    expect(volKind(s, HUN, PL)).toBe('exp');         // společný nepřítel
  });
  it('pravidla: podpora války, strop podle armády, vlastní divize mimo boj', () => {
    const s = base();
    const cap = volCap(s, ITA);
    expect(cap).toBeGreaterThan(0);
    expect(cap).toBeLessThanOrEqual(DIP.VOL_MAX);
    expect(volBlock(setPol(s, ITA, { ws: 0.1 }), ITA, PL, idleDivs(s, ITA, 1))).toMatch(/podpory války/);
    expect(volBlock(s, ITA, PL, idleDivs(s, ITA, cap + 1))).toMatch(/Nejvýš/);
    expect(volBlock(s, ITA, PL, idleDivs(s, GER, 1))).toMatch(/vlastní divize/);
    expect(volBlock(s, ITA, PL, [])).toBeTruthy();
    expect(sendVolunteers(s, ITA, PL, idleDivs(s, GER, 1))).toBe(s);   // neplatný vstup = tentýž stav
  });
  it('poslaní dobrovolníci patří příjemci, stojí v jeho hlavním městě, doplňuje je odesílatel a po míru se vrátí', () => {
    let s = base();
    const ids = idleDivs(s, ITA, 2);
    s = sendVolunteers(s, ITA, PL, ids);
    for (const id of ids) {
      expect(s.mil.divs[id].o).toBe(PL);
      expect(s.mil.divs[id].vo).toBe(ITA);
      expect(s.mil.divs[id].army).toBe(0);
      expect(s.mil.divs[id].p).toBe(W.owners[PL].cap);
    }
    expect(volAway(s, ITA, PL)).toEqual(ids);
    expect(s.log.items.some((e) => e.k === 'vol' && e.a === ITA && e.b === PL && e.y === 2)).toBe(true);
    // doplňování ze skladu odesílatele
    const divs = s.mil.divs.slice();
    divs[ids[0]] = { ...divs[ids[0]], hp: divs[ids[0]].hp * 0.5, sup: 1, sg: 72 };
    s = { ...s, mil: { ...s.mil, divs } };
    const stockI = JSON.stringify(s.mil.stock[ITA]), stockP = JSON.stringify(s.mil.stock[PL]);
    const d1 = advance(s, 24);
    expect(d1.mil.divs[ids[0]].hp).toBeGreaterThan(s.mil.divs[ids[0]].hp);
    expect(JSON.stringify(d1.mil.stock[ITA])).not.toBe(stockI);
    void stockP;
    // povolání zpět
    const back = recallVolunteers(d1, ITA, PL);
    for (const id of ids) { expect(back.mil.divs[id].o).toBe(ITA); expect(back.mil.divs[id].vo).toBeUndefined(); }
    expect(back.log.items.some((e) => e.k === 'volback' && e.x === 'recall')).toBe(true);
    expect(recallVolunteers(back, ITA, PL)).toBe(back);
  });
  it('po konci války nebo kapitulaci příjemce se divize vracejí domů', () => {
    let s = base();
    const ids = idleDivs(s, ITA, 1);
    s = sendVolunteers(s, ITA, PL, ids);
    const end = volDay({ ...s, mil: { ...s.mil, wars: [] } });
    expect(end.mil.divs[ids[0]].o).toBe(ITA);
    const cap = capitulate(s, PL);
    expect(cap.mil.divs[ids[0]].o).toBe(ITA);
    expect(cap.mil.divs[ids[0]].vo).toBeUndefined();
  });
  it('expediční sbor zůstane na místě (na území, kam má příjemce přístup)', () => {
    let s = declareWar(declareWar(createGame({ player: 'GER' }), 'ROM', 'HUN'), 'YUG', 'HUN');
    const ids = idleDivs(s, YUG, 2).filter((id) => s.ctrl[s.mil.divs[id].p] === YUG);   // Malá dohoda: Rumunsko má přístup do Jugoslávie
    expect(volKind(s, YUG, ROM)).toBe('exp');
    const at = ids.map((id) => s.mil.divs[id].p);
    s = sendVolunteers(s, YUG, ROM, ids);
    ids.forEach((id, i) => { expect(s.mil.divs[id].o).toBe(ROM); expect(s.mil.divs[id].p).toBe(at[i]); });
  });
  it('záznamy deníku mají text a skupinu upozornění', () => {
    for (const e of [{ k: 'vol', a: ITA, b: PL, x: 'vol', y: 2 }, { k: 'vol', a: ITA, b: PL, x: 'exp', y: 1 }, { k: 'volback', a: ITA, b: PL, y: 3, x: 'end' }, { k: 'att', a: ITA, b: PL }, { k: 'lic', a: HUN, b: GER, x: 'pusky', y: 3 }, { k: 'elect', o: FRA, x: 'win', y: 1 }, { k: 'elect', o: FRA, x: 'war' }]) {
      const l = logLine(e, FRA);
      expect(l.text).not.toMatch(/Neznámý/);
      expect(groupOf(e.k)).not.toBe('other');
    }
  });
});

describe('F4: vojenský atašé', () => {
  it('vyslání stojí politickou moc, dává bonus příjemci a zkušenosti odesílateli; po konci války se vrací', () => {
    let s = declareWar(createGame({ player: 'GER' }), 'POL', 'CZE');
    expect(attBlock(s, ITA, PL)).toMatch(/politická moc/);
    s = setPol(s, ITA, { pp: 100 });
    expect(attBlock(s, ITA, GER)).toMatch(/válčí/);
    expect(attBlock(s, CZE, PL)).toMatch(/ve válce/);
    const a = sendAttache(s, ITA, PL);
    expect(attachesOf(a, ITA)).toEqual([PL]);
    expect(a.pol.own[ITA].pp).toBe(100 - DIP.ATT_PP);
    expect(attMods(a.dip, PL)).toEqual({ atk: DIP.ATT_ATK, def: DIP.ATT_ATK });
    expect(attMods(a.dip, ITA)).toBeNull();
    expect(attBlock(a, ITA, PL)).toMatch(/už je/);
    const xp0 = a.doc.own[ITA].xp.land, d = advance(a, 24);
    const xpPlain = advance(s, 24).doc.own[ITA].xp.land;
    expect(d.doc.own[ITA].xp.land - xp0).toBeGreaterThan(xpPlain - s.doc.own[ITA].xp.land);
    expect(recallAttache(a, ITA, PL).dip.att).toEqual([]);
    expect(recallAttache(s, ITA, PL)).toBe(s);
    expect(attDay({ ...a, mil: { ...a.mil, wars: [] } }).dip.att).toEqual([]);
    expect(attDay(a)).toBe(a);
  });
});

describe('F4: licenční výroba', () => {
  it('nabídky jen s lepší úrovní, cena podle rozdílu, spojenci polovina, nákup zapíše úroveň', () => {
    expect(LIC_KEYS).toContain('pusky');
    let s = setLv(createGame({ player: 'GER' }), GER, 'pusky', 3);
    s = setPol(s, ROM, { pp: 200 });
    const lv0 = (s.mil.lv[ROM] && s.mil.lv[ROM].pusky) || 1;
    const off = licOffers(s, ROM, GER).find((x) => x.k === 'pusky');
    expect(off.theirs).toBe(3);
    expect(off.cost).toBe(DIP.LIC_PP * (3 - lv0));
    expect(licCost(s, YUG, ROM, 'pusky')).toBe(0);   // Rumunsko nemá lepší pušky než Jugoslávie (stejná úroveň)
    const rel = licBlock(s, ROM, GER, 'pusky');
    if (rel) expect(rel).toMatch(/vztah|nevěří/);
    // spojenec v bloku (Malá dohoda) kupuje za polovinu bez ohledu na vztah
    s = setLv(s, CZE, 'dela', 3);
    s = setPol(s, YUG, { pp: 200 });
    const half = licCost(s, YUG, CZE, 'dela');
    expect(half).toBe(Math.ceil(DIP.LIC_PP * (3 - ((s.mil.lv[YUG] && s.mil.lv[YUG].dela) || 1)) * 0.5));
    expect(licBlock(s, YUG, CZE, 'dela')).toBeNull();
    const b = buyLicence(s, YUG, CZE, 'dela');
    expect(b.mil.lv[YUG].dela).toBe(3);
    expect(b.pol.own[YUG].pp).toBe(200 - half);
    expect(licBlock(b, YUG, CZE, 'dela')).toMatch(/lepší/);
    expect(buyLicence(b, YUG, CZE, 'dela')).toBe(b);
    expect(licBlock(s, YUG, CZE, 'mtanky')).toBeTruthy();   // bez lepší úrovně nebo nevyzkoumaný typ
    const war = declareWar(s, 'YUG', 'CZE');
    expect(licBlock(war, YUG, CZE, 'dela')).toMatch(/válce/);
  });
});

describe('F4: volby', () => {
  it('termíny: data pro Francii, jinak odstup ELECT_EVERY; nedemokracie nevolí', () => {
    const s = createGame({ player: 'GER' });
    expect(electionPlan(FRA)).toEqual({ day: 123, every: 1461 });
    expect(electionPlan(PL).every).toBe(POL.ELECT_EVERY);
    expect(nextElection(s, FRA)).toBe(123);
    expect(nextElection({ ...s, tick: 124 * 24 }, FRA)).toBe(123 + 1461);
    expect(nextElection(s, GER)).toBeNull();
  });
  it('vítězství demokratů upraví stabilitu, silná jiná strana převezme vládu (hráčova země i s historickou AI)', () => {
    let s = createGame({ player: 'FRA', aiLevel: 2 });
    s = { ...s, tick: 123 * 24 };
    const won = electionsDay(setPol(s, FRA, { par: { democracy: 70, fascism: 10, communism: 10, neutrality: 10 }, stab: 0.5 }));
    expect(won.pol.own[FRA].stab).toBeCloseTo(0.5 + POL.ELECT_STAB, 5);
    expect(won.log.items.some((e) => e.k === 'elect' && e.o === FRA && e.x === 'win' && e.y === 1)).toBe(true);
    const lost = electionsDay(setPol(s, FRA, { par: { democracy: 20, fascism: 10, communism: 60, neutrality: 10 } }));
    expect(lost.pol.own[FRA].gov).toBe('communism');
    expect(lost.log.items.some((e) => e.k === 'gov' && e.o === FRA && e.y === 1)).toBe(true);
    expect(lost.nat.own[FRA].sp.porevolucni_chaos).toBeUndefined();   // volby nejsou převrat
    const war = electionsDay(declareWar(setPol(s, FRA, { par: { democracy: 20, fascism: 10, communism: 60, neutrality: 10 } }), 'FRA', 'ITA'));
    expect(war.pol.own[FRA].gov).toBe('democracy');
    expect(war.log.items.some((e) => e.k === 'elect' && e.x === 'war')).toBe(true);
  });
  it('s historickou AI volby vládu AI země nezmění', () => {
    let s = createGame({ player: 'GER', aiLevel: 2 });
    s = setPol({ ...s, tick: 123 * 24 }, FRA, { par: { democracy: 20, fascism: 10, communism: 60, neutrality: 10 } });
    expect(electionsDay(s).pol.own[FRA].gov).toBe('democracy');
    const free = { ...s, ai: { ...s.ai, hist: 0 } };
    expect(electionsDay(free).pol.own[FRA].gov).toBe('communism');
  });
  it('changeGov bez voleb je dál převrat s chaosem', () => {
    const s = changeGov(createGame({ player: 'GER' }), FRA, 'fascism');
    expect(s.nat.own[FRA].sp.porevolucni_chaos).toBeDefined();
  });
});

describe('F4: vrchní velení', () => {
  it('tři sloty, každý s volbami s bonusy doktrín; najmutí přidá bonus do docMods', () => {
    for (const slot of ['army', 'navy', 'air']) {
      expect(ADV_SLOTS[slot].hc).toBe(true);
      const opts = Object.entries(ADVISORS).filter(([, a]) => a.slot === slot);
      expect(opts.length).toBeGreaterThanOrEqual(3);
      for (const [, a] of opts) expect(Object.keys(a.doc).length).toBeGreaterThan(0);
    }
    const POLX = W.ownerIdx.POL;   // P1: obecní poradci – země bez vlastních osobností
    let s = setPol(createGame({ player: 'POL' }), POLX, { pp: 500 });
    const atk0 = docMods(s, POLX).atk, fire0 = docMods(s, POLX).fire;
    s = hireAdvisor(s, POLX, 'army', 'nac_utok');
    expect(docMods(s, POLX).atk).toBeCloseTo(atk0 + 0.05, 6);
    expect(docMods(s, POLX).land).toBe(1);
    s = hireAdvisor(s, POLX, 'navy', 'nam_palba');
    expect(docMods(s, POLX).fire).toBeCloseTo(fire0 + 0.08, 6);
    s = hireAdvisor(s, POLX, 'army', 'nac_plan');
    expect(docMods(s, POLX).planGain).toBeCloseTo(0.25, 6);
    expect(docMods(s, POLX).atk).toBeCloseTo(atk0, 6);
    expect(hireAdvisor(s, POLX, 'army', 'nam_palba')).toBe(s);
    expect(hireAdvisor(s, POLX, 'army', 'ger_heinz_guderian')).toBe(s);   // cizí osobnost   // volba z jiného slotu
  });
  it('AI najme náčelníka generálního štábu podle stylu velení (Německo: teoretik obrněných sil)', () => {
    let s = createGame({ player: 'FRA', aiLevel: 2 });
    for (let o = 1; o < W.owners.length; o++) if (s.pol.own[o]) s = setPol(s, o, { pp: 1500 });
    s = advance(s, 24 * 10);
    expect(ADVISORS[s.pol.own[GER].adv.army].trait).toBe('tanky');   // P1: osobnost s vlastností podle stylu velení
    expect(ADVISORS[s.pol.own[SOV].adv.army].tag).toBe('SOV');
    expect(s.pol.own[FRA].adv.army).toBe(0);   // hráč si vybírá sám
  });
});

void [ENG, SWE, BEL, atWar];
