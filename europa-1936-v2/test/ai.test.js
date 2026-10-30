// AI zemí (M24): vypnutá ve výchozím stavu, průmysl, armáda (výcvik, armády, útočné plány), diplomacie (mír, historické války), obtížnost, čistota a determinismus.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, advanceHour, declareWar, atWar, industryOf, divisionCount, targetDivs, scanArmies, aiMult, AI, HIST_WARS, outMult, researchOf,
  startWar, justifyWar, startFocus, factionOf, sameFaction, HIST_FACTIONS, GAME_VERSION,
} from '../src/engine/index.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const [GER, FRA, ITA, YUG, ALB, SWE, POL, SOV] = ['GER', 'FRA', 'ITA', 'YUG', 'ALB', 'SWE', 'POL', 'SOV'].map(idx);
const day = (s, n = 1) => advance(s, 24 * n);
const setPol = (s, o, p) => { const own = s.pol.own.slice(); own[o] = { ...own[o], ...p }; return { ...s, pol: { ...s.pol, own } }; };
const base = (extra = {}) => createGame({ player: 'GER', aiLevel: 2, ...extra });

describe('nastavení', () => {
  it('výchozí engine nemá AI; hra s aiLevel ji zapne; neplatná úroveň se vrátí na vypnuto', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(8);
    expect(createGame({ player: 'GER' }).ai).toEqual({ level: 0, hist: 1 });
    expect(base().ai).toEqual({ level: 2, hist: 1 });
    expect(createGame({ aiLevel: 7 }).ai.level).toBe(0);
    expect(createGame({ aiLevel: 3, hist: false }).ai).toEqual({ level: 3, hist: 0 });
    expect(JSON.parse(JSON.stringify(base().ai))).toEqual(base().ai);
  });
  it('vypnutá AI nic nemění: stav po dni je totožný s hrou bez nastavení AI', () => {
    const a = day(createGame({ player: 'GER' }), 20);
    expect(a.ind.build).toHaveLength(0);
    expect(a.mil.queue).toHaveLength(0);
    expect(advanceHour(a).ai).toBe(a.ai);
  });
});

describe('průmysl AI', () => {
  it('AI země staví továrny, hráč ne; volné vojenské továrny dostanou linky', () => {
    const a = day(base(), 30);
    expect(a.ind.build.some((b) => b.o === SWE) || industryOf(a, 'SWE').civ + industryOf(a, 'SWE').mil > industryOf(base(), 'SWE').civ + industryOf(base(), 'SWE').mil).toBe(true);
    expect(a.ind.build.filter((b) => b.o === GER)).toHaveLength(0);
    for (const o of [FRA, ITA, SOV]) expect(a.ind.build.filter((b) => b.o === o).length).toBeLessThanOrEqual(AI.QUEUE);
    expect(industryOf(a, 'FRA').milFree).toBe(0);
  });
  it('po roce AI země mají víc továren než na začátku a nikdy nepřekročí sloty', () => {
    const s0 = base(), a = day(s0, 365);
    for (const tag of ['FRA', 'ITA', 'SOV', 'POL']) {
      const t0 = industryOf(s0, tag), t1 = industryOf(a, tag);
      expect(t1.civ + t1.mil).toBeGreaterThan(t0.civ + t0.mil);
    }
    expect(industryOf(a, 'GER').civ + industryOf(a, 'GER').mil).toBe(industryOf(s0, 'GER').civ + industryOf(s0, 'GER').mil);
  });
});

describe('armáda AI', () => {
  it('cílový počet divizí roste s časem a válkou', () => {
    const s = base();
    expect(targetDivs(s, FRA)).toBeGreaterThanOrEqual(46);
    expect(targetDivs(declareWar(s, 'FRA', 'ITA'), FRA)).toBeGreaterThan(targetDivs(s, FRA));
    expect(targetDivs({ ...s, tick: 24 * 365 }, FRA)).toBeGreaterThan(targetDivs(s, FRA));
    expect(targetDivs(createGame({ aiLevel: 3 }), FRA)).toBeGreaterThan(targetDivs(createGame({ aiLevel: 1 }), FRA));
  });
  it('AI cvičí nové divize a zařazuje je do armád; po dokončení výcviku nezůstávají volné', () => {
    const s0 = base();
    const a = day(s0, 20);
    expect(a.mil.queue.some((q) => q.o === FRA)).toBe(true);
    expect(a.mil.queue.filter((q) => q.o === FRA).length).toBeLessThanOrEqual(Math.max(AI.TRAIN_MAX, Math.ceil(targetDivs(a, FRA) / AI.TRAIN_DIV)));
    expect(a.mil.queue.every((q) => q.o !== GER)).toBe(true);
    const b = day(a, 200);
    expect(divisionCount(b, 'FRA')).toBeGreaterThan(divisionCount(s0, 'FRA'));
    expect(divisionCount(b, 'GER')).toBe(divisionCount(s0, 'GER'));
    const loose = scanArmies(day(b, 1))[FRA].loose.length;
    expect(loose).toBeLessThanOrEqual(Math.max(AI.TRAIN_MAX, Math.ceil(targetDivs(b, FRA) / AI.TRAIN_DIV)));
    for (const [, n] of scanArmies(b)[FRA].armies) expect(n).toBeLessThanOrEqual(24);
  });
  it('ve válce AI přidělí útočné plány, je-li poměr sil příznivý, a nepřidělí slabší straně', () => {
    // ITA (AI) proti YUG: ITA je silnější
    let w = declareWar(base(), 'ITA', 'YUG');
    w = { ...w, dip: { ...w.dip, goal: { ...w.dip.goal, [`${ITA}>${YUG}`]: 'conquest' }, since: { [`${Math.min(ITA, YUG)}-${Math.max(ITA, YUG)}`]: 0 } } };   // ITA je útočník a válka právě začala (M66)
    w = day(w, 8);
    const plans = w.mil.armies.filter((a) => a && a.o === ITA && a.plan);
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.some((a) => a.plan.k === 'front' && a.plan.to.length > 0)).toBe(true);
    // slabá strana (YUG, 15 divizí proti 29 + blok) neútočí na obrovskou přesilu
    expect(w.mil.armies.filter((a) => a && a.o === YUG && a.plan && a.plan.k === 'front' && a.plan.to.length > 0).length).toBeLessThanOrEqual(plans.length);
  });
});

describe('diplomacie AI', () => {
  it('vyčerpaná AI navrhne bílý mír, vítězící protivník ho odmítne', () => {
    const w = setPol(declareWar(createGame({ player: 'POL', aiLevel: 2 }), 'ITA', 'FRA'), ITA, { stab: 0.2 });
    const a = day(w, 1);
    expect(atWar(a, 'ITA', 'FRA')).toBe(false);          // žádná okupace: protivník přijme
    const ctrl = w.ctrl.slice();
    for (let p = 1; p <= W.L; p++) if (w.stateOwner[W.provState[p]] === ITA && W.vp[p] >= 2) ctrl[p] = FRA;
    const lost = day({ ...w, ctrl }, 1);
    expect(atWar(lost, 'ITA', 'FRA') || lost.dip.cap[ITA] === 1 || lost.dip.sub[ITA] === FRA).toBe(true);   // vítěz mír odmítl (nebo ITA kapitulovala)
  });
  it('vleklá válka bez výsledku skončí bílým mírem', () => {
    // Británie a SSSR se nedotýkají: žádná fronta, skóre zůstane nulové a po čase AI uzavře bílý mír
    const ENG = idx('ENG');
    const s = createGame({ player: 'SWE', aiLevel: 2, hist: false });
    const j = { ...s, dip: { ...s.dip, just: [{ a: ENG, b: SOV, ready: 0 }] } };
    const w = startWar(j, ENG, SOV);
    expect(atWar(w, 'ENG', 'SOV')).toBe(true);
    expect(w.dip.since[`${Math.min(ENG, SOV)}-${Math.max(ENG, SOV)}`]).toBe(0);
    expect(atWar(day(w, 100), 'ENG', 'SOV')).toBe(true);
    const later = day(w, AI.STALEMATE_DAYS + 20);
    expect(atWar(later, 'ENG', 'SOV')).toBe(false);
    expect(Object.keys(later.dip.since)).toHaveLength(0);
  });
  it('historický plán: SSSR ospravedlní a napadne Finsko v okně plánu; bez `hist` ne', () => {
    const start = { tick: 24 * 1395 };
    const a = day({ ...base(), ...start }, 75);
    expect(atWar(a, 'SOV', 'FIN')).toBe(true);
    const off = day({ ...createGame({ player: 'GER', aiLevel: 2, hist: false }), ...start }, 75);
    expect(atWar(off, 'SOV', 'FIN')).toBe(false);
    const before = day({ ...base(), tick: 24 * 100 }, 75);
    expect(atWar(before, 'SOV', 'FIN')).toBe(false);          // před oknem se nic neděje
    expect(HIST_WARS.every((p) => W.ownerIdx[p.tag] && W.ownerIdx[p.target])).toBe(true);
    void ALB; void justifyWar; void startWar;
  });
  it('historické bloky: Německo založí Osu a pozve Itálii; bez `hist` nic', () => {
    const a = day({ ...createGame({ player: 'SWE', aiLevel: 2 }), tick: 24 * 265 }, 60);
    expect(factionOf(a, GER)).toMatchObject({ nm: HIST_FACTIONS[0].nm, ldr: GER });
    expect(sameFaction(a, GER, ITA)).toBe(true);
    expect(sameFaction(a, GER, FRA)).toBe(false);
    const off = day({ ...createGame({ player: 'SWE', aiLevel: 2, hist: false }), tick: 24 * 265 }, 60);
    expect(factionOf(off, GER)).toBeNull();
  });
  it('v míru za první rok AI nezačne žádnou válku (okna plánů jsou později)', () => {
    const a = day(base(), 365);
    expect(a.mil.wars).toHaveLength(0);
  });
});

describe('obtížnost', () => {
  it('násobek výroby a výzkumu AI zemí podle úrovně; hráč bez úpravy', () => {
    expect(aiMult(createGame({ player: 'GER', aiLevel: 1 }), FRA)).toBeCloseTo(0.9, 9);
    expect(aiMult(createGame({ player: 'GER', aiLevel: 2 }), FRA)).toBe(1);
    expect(aiMult(createGame({ player: 'GER', aiLevel: 3 }), FRA)).toBeCloseTo(1.1, 9);
    expect(aiMult(createGame({ player: 'GER', aiLevel: 3 }), GER)).toBe(1);
    expect(aiMult(createGame({ player: 'GER' }), FRA)).toBe(1);
    expect(outMult(createGame({ player: 'GER', aiLevel: 3 }), FRA)).toBeGreaterThan(outMult(createGame({ player: 'GER', aiLevel: 1 }), FRA));
    expect(outMult(createGame({ player: 'GER', aiLevel: 3 }), GER)).toBe(outMult(createGame({ player: 'GER', aiLevel: 1 }), GER));
    expect(researchOf(createGame({ player: 'GER', aiLevel: 3 }), 'FRA').speed).toBeGreaterThan(researchOf(createGame({ player: 'GER', aiLevel: 1 }), 'FRA').speed);
  });
  it('pozorovatel: všechny země jedou pod AI', () => {
    const a = day(createGame({ player: null, aiLevel: 2 }), 30);
    expect(a.ind.build.some((b) => b.o === GER)).toBe(true);
    void startFocus; void POL;
  });
});

describe('čistota a determinismus', () => {
  it('60 dní s válkou: původní stav se nemění, dělení kroků nevadí, JSON čistý', () => {
    const s = declareWar(base(), 'ITA', 'YUG');
    const snap = JSON.stringify(s);
    const a = day(s, 60);
    expect(JSON.stringify(s)).toBe(snap);
    let b = s;
    for (let i = 0; i < 60; i++) b = day(b, 1);
    expect(JSON.stringify(b.mil.queue)).toBe(JSON.stringify(a.mil.queue));
    expect(JSON.stringify(b.ind.build)).toBe(JSON.stringify(a.ind.build));
    expect(JSON.stringify(b.dip)).toBe(JSON.stringify(a.dip));
    expect(JSON.parse(JSON.stringify(a.ind))).toEqual(a.ind);
    expect(a.rng).toBe(day(s, 60).rng);
  });
  it('AI nespotřebovává `state.rng` navíc oproti hře bez AI (bojová náhoda zůstane stejná)', () => {
    const off = day(declareWar(createGame({ player: 'GER' }), 'POL', 'FRA'), 3);
    const on = day(declareWar(createGame({ player: 'GER', aiLevel: 2 }), 'POL', 'FRA'), 3);
    expect(on.rng).toBe(off.rng);
  });
});

describe('AI a hráč', () => {
  it('AI hráči mír nevnucuje, ani když je sama vyčerpaná', () => {
    const w = setPol(declareWar(createGame({ player: 'GER', aiLevel: 2 }), 'FRA', 'GER'), FRA, { stab: 0.1 });
    expect(atWar(day(w, 5), 'FRA', 'GER')).toBe(true);
  });
});
