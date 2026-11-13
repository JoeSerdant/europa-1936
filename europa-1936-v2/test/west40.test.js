// Západní fronta 1940 (M88): válečný cíl za války, pravidla míru bloků, útočník po divadlech, místní útoky, pevnostní linie, druhý sled a sdílená kapacita postů,
// ústup na území spojence, zásobování od spojence, obchod AI se surovinami, rezerva výzbroje, vojenští duchové, doktríny, vylodění jen s cílem.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, declareWar, validateState, GAME_VERSION, packGame, unpackGame, AI, DIP, ARMY, IND,
  claimGoal, goalBlock, peaceBlock, startWar, capitulate, guarantee, fortOf, setPlan, deriveStats, industryOf, supplyReach,
  spiritArmyMods, startSpirits, addXp,
} from '../src/engine/index.js';
import { WARGOALS } from '../src/data/dip/wargoals.js';
import { FORT_START } from '../src/data/industry/national.js';
import { DOCTRINE_PREF } from '../src/data/ai/personality.js';
import { HIST_WARS } from '../src/data/ai/plans.js';
import { SPIRITS } from '../src/data/nat/spirits.js';
import { MOD_KEYS } from '../src/engine/army/leaders.js';
import { atWar, enemiesOf } from '../src/engine/army/war.js';
import { adjacency } from '../src/engine/army/geo.js';
import { openCtx } from '../src/engine/army/ctx.js';
import { modsOf } from '../src/engine/army/unit.js';
import { retreatTarget } from '../src/engine/army/combat.js';
import { capQuotas } from '../src/engine/army/plans.js';
import { supplyFlow } from '../src/engine/army/supply.js';
import { theatersOf, decideStrategy, localTargets, localDefense, foeCounts, fitArmy, rearOf, armyQuality, supplyView } from '../src/engine/ai/strategy.js';
import { goalFoes } from '../src/engine/ai/core.js';
import { aiDiplomacy } from '../src/engine/ai/diplomacy.js';
import { aiDoctrine } from '../src/engine/ai/doc.js';
import { aiTrade, resSupplier } from '../src/engine/ai/logistics.js';
import { aiArmy, scanArmies } from '../src/engine/ai/army.js';
import { landingSites } from '../src/engine/ai/invasion.js';
import { logLine } from '../src/ui/logText.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const [GER, FRA, ENG, POL, CZE, ROM, YUG, ITA, BEL, SOV, DEN, HUN] = ['GER', 'FRA', 'ENG', 'POL', 'CZE', 'ROM', 'YUG', 'ITA', 'BEL', 'SOV', 'DEN', 'HUN'].map(idx);
const base = (extra = {}) => createGame({ player: null, aiLevel: 2, ...extra });
const pp = (s, o, v = 300) => { const own = s.pol.own.slice(); own[o] = { ...own[o], pp: v }; return { ...s, pol: { ...s.pol, own } }; };
const withGoal = (s, a, b) => ({ ...s, dip: { ...s.dip, goal: { ...s.dip.goal, [`${a}>${b}`]: 'conquest' }, ver: s.dip.ver + 1 } });
const landAdj = (p) => adjacency(W)[p].filter((e) => e.kind !== 2).map((e) => e.to);
const armyOf = (s, id) => { const ds = []; s.mil.divs.forEach((d, i) => { if (d && d.army === id) ds.push(i); }); return { id, ds, n: ds.length }; };

describe('válečný cíl za války (claimGoal)', () => {
  const war = pp(declareWar(base(), 'GER', 'FRA'), GER);
  it('země, která už válčí, si může vyhlásit cíl: stojí politickou moc, platí hned a zapíše se do deníku', () => {
    expect(goalBlock(war, GER, FRA)).toBeNull();
    const t = claimGoal(war, GER, FRA);
    expect(t.dip.goal[`${GER}>${FRA}`]).toBe('conquest');
    expect(t.pol.own[GER].pp).toBe(war.pol.own[GER].pp - WARGOALS.conquest.pp);
    expect(t.log.items.at(-1)).toMatchObject({ k: 'goal', a: GER, b: FRA });
    expect(logLine(t.log.items.at(-1), GER).text).toMatch(/cíl/);
    expect(validateState(t)).toBeNull();
    expect(goalFoes(t, GER).has(FRA)).toBe(true);
    expect(goalFoes(war, GER).has(FRA)).toBe(false);
  });
  it('neplatné případy vrací tentýž stav: bez války, podruhé, bez politické moci', () => {
    const peace = pp(base(), GER);
    expect(claimGoal(peace, GER, FRA)).toBe(peace);
    expect(goalBlock(peace, GER, FRA)).toMatch(/válčíte/);
    const t = claimGoal(war, GER, FRA);
    expect(claimGoal(t, GER, FRA)).toBe(t);
    const poor = pp(war, GER, 0);
    expect(claimGoal(poor, GER, FRA)).toBe(poor);
    expect(goalBlock(poor, GER, FRA)).toMatch(/politická moc/);
  });
  it('historická AI: Německo, které s Francií už válčí, si v okně plánu vyhlásí cíl; dřív ne', () => {
    expect(HIST_WARS.some((p) => p.tag === 'GER' && p.target === 'FRA')).toBe(true);
    const plan = HIST_WARS.find((p) => p.tag === 'GER' && p.target === 'FRA');
    let s = { ...war, tick: 24 * (plan.from - 100) };
    for (let i = 0; i < 6; i++) s = aiDiplomacy(s, GER);
    expect(s.dip.goal[`${GER}>${FRA}`]).toBeUndefined();
    s = { ...pp(war, GER), tick: 24 * (plan.from + 1) };
    for (let i = 0; i < 8; i++) s = aiDiplomacy(s, GER);
    expect(s.dip.goal[`${GER}>${FRA}`]).toBe('conquest');
  });
  it('bez historické AI si velmoc po roce války vyhlásí cíl proti nepřátelské velmoci', () => {
    let s = pp(declareWar(base({ hist: false }), 'GER', 'FRA'), GER);
    s = { ...s, dip: { ...s.dip, since: { ...s.dip.since, [`${Math.min(GER, FRA)}-${Math.max(GER, FRA)}`]: 0 } } };
    const early = { ...s, tick: 24 * 7 * 10 };
    expect(aiDiplomacy(early, GER).dip.goal[`${GER}>${FRA}`]).toBeUndefined();
    const late = { ...s, tick: 24 * 7 * Math.ceil((AI.GOAL_DAYS + 7) / 7) };
    expect(aiDiplomacy(late, GER).dip.goal[`${GER}>${FRA}`]).toBe('conquest');
  });
});

describe('konec války bloku a vstup do bloku zaručitele', () => {
  it('padne-li vedoucí bloku, malí členové bez vlastního cíle uzavřou s jeho protivníky mír', () => {
    let s = base();   // Malá dohoda: CZE (vedoucí), ROM, YUG
    for (const t of ['CZE', 'ROM', 'YUG']) s = declareWar(s, 'GER', t);
    const t = capitulate(s, CZE);
    expect(t.dip.cap[CZE]).toBe(1);
    expect(atWar(t.mil, GER, ROM)).toBe(false);
    expect(atWar(t.mil, GER, YUG)).toBe(false);
    expect(t.log.items.filter((l) => l.k === 'peace').length).toBeGreaterThanOrEqual(2);
    expect(validateState(t)).toBeNull();
  });
  it('člen, proti kterému má vítěz válečný cíl, bojuje dál; pád řadového člena válku bloku nekončí', () => {
    let s = base();
    for (const t of ['CZE', 'ROM', 'YUG']) s = declareWar(s, 'GER', t);
    const t = capitulate(withGoal(s, GER, ROM), CZE);
    expect(atWar(t.mil, GER, ROM)).toBe(true);
    expect(atWar(t.mil, GER, YUG)).toBe(false);
    const member = capitulate(s, ROM);
    expect(atWar(member.mil, GER, CZE)).toBe(true);
    expect(atWar(member.mil, GER, YUG)).toBe(true);
  });
  it('napadená země bez bloku vstoupí do bloku zaručitele, který se do války přidá', () => {
    let s = pp(base(), FRA);
    expect(s.dip.fac[BEL]).toBe(0);   // Belgie je na startu neutrální
    s = guarantee(s, FRA, BEL);
    s = { ...s, dip: { ...s.dip, just: [{ a: GER, b: BEL, g: 'conquest', ready: s.tick }] } };
    const t = startWar(s, GER, BEL);
    expect(atWar(t.mil, GER, BEL)).toBe(true);
    expect(atWar(t.mil, GER, FRA)).toBe(true);
    expect(t.dip.fac[BEL]).toBe(t.dip.fac[FRA]);
    expect(t.dip.facs[t.dip.fac[FRA]].mem).toContain(BEL);
    expect(validateState(t)).toBeNull();
  });
  it('kapitulace vrací cizí území, které poražený okupoval', () => {
    const s = declareWar(base(), 'FRA', 'GER');
    const p = W.states.findIndex((st, i) => i > 0 && s.stateOwner[i] === GER);
    const prov = W.states[p].v[0];
    const ctrl = s.ctrl.slice(); ctrl[prov] = FRA;
    const t = capitulate({ ...s, ctrl }, FRA);
    expect(t.ctrl[prov]).toBe(GER);
  });
});

describe('útočník po divadlech a pevnostní linie', () => {
  const s = withGoal(declareWar(declareWar(base(), 'GER', 'POL'), 'GER', 'FRA'), GER, POL);
  const d = decideStrategy(s, GER);
  it('Německo je útočníkem jen v divadle proti Polsku; proti Francii drží frontu (větší práh)', () => {
    const iPol = d.theaters.findIndex((t) => t.defenders.has(POL)), iFra = d.theaters.findIndex((t) => t.defenders.has(FRA) && !t.defenders.has(POL));
    expect(iPol).toBeGreaterThanOrEqual(0);
    expect(iFra).toBeGreaterThanOrEqual(0);
    expect(d.aggr[iPol]).toBe(true);
    expect(d.aggr[iFra]).toBe(false);
    expect(d.theaters[iFra].need).toBeCloseTo(d.theaters[iPol].need * AI.DEFENDER_MULT, 6);
    expect(d.aggressor).toBe(true);
  });
  it('pevnostní linie na startu: francouzské provincie u německé hranice mají pevnost podle dat a divadlo ji započítá', () => {
    const line = FORT_START.find((f) => f.tag === 'FRA' && f.vs === 'GER');
    expect(line.lv).toBeGreaterThanOrEqual(3);
    let n = 0;
    for (let p = 1; p <= W.L; p++) {
      if (W.provOwner0[p] !== FRA || !landAdj(p).some((q) => W.provOwner0[q] === GER)) continue;
      n++;
      expect(fortOf(s, p)).toBe(line.lv);
    }
    expect(n).toBeGreaterThan(2);
    const t = d.theaters.find((x) => x.defenders.has(FRA) && !x.defenders.has(POL));
    expect(t.fort).toBeGreaterThan(0);
    const bare = { ...s, ind: { ...s.ind, fort: {} } };
    const t0 = decideStrategy(bare, GER).theaters.find((x) => x.defenders.has(FRA) && !x.defenders.has(POL));
    expect(t.eff).toBeGreaterThan(t0.eff);
  });
  it('síla obrany cíle roste s pevností a terénem', () => {
    const foes = new Set(enemiesOf(s.mil, GER)), foeAt = foeCounts(s, foes);
    const tp = d.theaters.find((x) => x.defenders.has(FRA) && !x.defenders.has(POL)).targets.find((p) => (foeAt.get(p) || 0) > 0 && fortOf(s, p) > 0);
    expect(tp).toBeTruthy();
    const bare = { ...s, ind: { ...s.ind, fort: {} } };
    expect(localDefense(s, foes, foeAt, tp)).toBeGreaterThan(localDefense(bare, foes, foeAt, tp));
  });
  it('území loutky je pro pána součástí fronty', () => {
    const sub = s.dip.sub.slice(); sub[POL] = GER;
    const s1 = declareWar({ ...s, mil: { ...s.mil, wars: s.mil.wars.filter(([a, b]) => a !== POL && b !== POL) }, dip: { ...s.dip, sub, ver: s.dip.ver + 1 } }, 'GER', 'SOV');
    const posts = theatersOf(s1, GER, new Set([SOV])).flatMap((t) => t.posts);
    expect(posts.some((p) => s1.ctrl[p] === POL)).toBe(true);
  });
});

describe('místní útoky (čisté funkce)', () => {
  const def = (m) => (tp) => m[tp] ?? 0;
  it('armáda bere jen cíle, na které má místní převahu, od nejslabšího; obránce potřebuje víc', () => {
    const m = { 1: 0, 2: 2, 3: 9 };
    const none = new Set();
    expect(localTargets([1, 2, 3], 12, def(m), none, 1, () => 0)).toEqual([1, 2]);          // 9 × 2,5 > 12
    expect(localTargets([3], 12, def(m), none, 1, () => 0)).toEqual([]);
    expect(localTargets([2], 12, def(m), none, AI.DEFENDER_MULT, () => 0)).toEqual([2]);       // 2 × 2,5 × 1,8 = 9 ≤ 12
    expect(localTargets([2], 8, def(m), none, AI.DEFENDER_MULT, () => 0)).toEqual([]);
  });
  it('každý cíl váže aspoň LOCAL_MIN divizí, nejvýš n / DIVS_PER_TARGET cílů a přednost mají cíle, na které ještě nikdo neútočí', () => {
    const m = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    expect(localTargets([1, 2, 3, 4, 5, 6], 12, def(m), new Set(), 1, () => 0)).toHaveLength(Math.ceil(12 / AI.DIVS_PER_TARGET));
    expect(localTargets([1, 2, 3], 3, def(m), new Set(), 1, () => 0)).toHaveLength(1);        // 3 divize: jeden cíl (LOCAL_MIN 2)
    expect(localTargets([1, 2], 3, def(m), new Set([1]), 1, () => 0)).toEqual([2]);
    expect(localTargets([1, 2], 3, def(m), new Set(), 1, (tp) => (tp === 2 ? -5 : 0))).toEqual([2]);   // při shodě blíž k hlavnímu městu
  });
  it('vyčerpaná nebo hladová armáda místně neútočí', () => {
    const s = declareWar(base(), 'GER', 'POL');
    const id = s.mil.divs.find((d) => d && d.o === GER && d.army).army;
    const a = armyOf(s, id);
    expect(fitArmy(s, a)).toBe(true);
    const weak = { ...s, mil: { ...s.mil, divs: s.mil.divs.map((d) => (d && d.army === id ? { ...d, hp: d.hp * (AI.LOCAL_HP - 0.2) } : d)) } };
    expect(fitArmy(weak, a)).toBe(false);
    const hungry = { ...s, mil: { ...s.mil, divs: s.mil.divs.map((d) => (d && d.army === id ? { ...d, sup: 0.3, sg: 0 } : d)) } };
    expect(fitArmy(hungry, a)).toBe(false);
  });
});

describe('plánovač: práh síly, sdílená kapacita, druhý sled', () => {
  it('divize pod prahem síly režimu na cíl plánu neútočí', () => {
    const s = declareWar(base(), 'GER', 'POL');
    let pick = null;
    for (let id = 1; id < s.mil.divs.length && !pick; id++) {
      const d = s.mil.divs[id];
      if (!d || d.o !== GER || !d.army) continue;
      const t = landAdj(d.p).find((q) => s.ctrl[q] === POL);
      if (t) pick = { id, t, army: d.army, p: d.p };
    }
    expect(pick).toBeTruthy();
    const order = (st) => setPlan(st, pick.army, { k: 'front', line: [pick.p], to: [pick.t], mode: 'rush' });
    const healthy = order(s);
    expect(healthy.mil.divs[pick.id].path).toEqual([pick.t]);
    const st = deriveStats(s.mil.tpl[s.mil.divs[pick.id].tpl], s.mil.lv[GER]);
    const hurt = { ...s, mil: { ...s.mil, divs: s.mil.divs.map((d, i) => (i === pick.id ? { ...d, hp: st.hp * 0.2 } : d)) } };
    expect(order(hurt).mil.divs[pick.id].path).not.toEqual([pick.t]);
  });
  it('rozdělení přebytku: kde není místo, divize se rozloží rovnoměrně, ne na jeden post', () => {
    expect(capQuotas([5, 0, 0], [1, 1, 1], [9, 1, 1])).toEqual([2, 2, 1]);
    expect(capQuotas([3, 0], [2, 2], [1, 1])).toEqual([2, 1]);          // dokud je místo, plní se volné posty
    expect(capQuotas([4, 0], [0, 2], [5, 1])).toEqual([1, 3]);          // post obsazený jinými armádami (kapacita 0) dostane jen nezbytný zbytek
  });
  it('týl divadla: zásobované vlastní provincie za frontou, ne posty; už rozdané provincie se vynechají', () => {
    const s = declareWar(base(), 'GER', 'POL');
    const th = theatersOf(s, GER, new Set([POL])).sort((a, b) => b.posts.length - a.posts.length)[0];   // nejdelší úsek (ne východopruská enkláva)
    const view = supplyView(s, GER);
    const a = { x: th.x, y: th.y, n: 8 };
    const rear = rearOf(s, GER, th.posts, a, view, 8);
    expect(rear.length).toBeGreaterThan(0);
    for (const p of rear) { expect(s.ctrl[p]).toBe(GER); expect(th.posts).not.toContain(p); expect(landAdj(p).some((q) => s.ctrl[q] === POL)).toBe(false); }
    const second = rearOf(s, GER, th.posts, a, view, 8, new Set(rear));
    for (const p of second) expect(rear).not.toContain(p);
  });
});

describe('ústup a zásobování na území spojence', () => {
  it('poražená divize smí ustoupit do provincie spojence (dřív jen do vlastní)', () => {
    // francouzská divize v Belgii (v bloku s Francií), kterou napadlo Německo: vlastní provincie vedle není, ustupuje se do belgické
    let s = base();
    const fid = s.dip.fac[FRA], fac = s.dip.fac.slice(), facs = s.dip.facs.slice();
    fac[BEL] = fid; facs[fid] = { ...facs[fid], mem: [...facs[fid].mem, BEL] };
    s = declareWar(declareWar({ ...s, dip: { ...s.dip, fac, facs, ver: s.dip.ver + 1 } }, 'GER', 'FRA'), 'GER', 'BEL');
    let here = 0, from = 0;
    for (let p = 1; p <= W.L && !here; p++) {
      if (s.ctrl[p] !== BEL) continue;
      const g = landAdj(p).find((q) => s.ctrl[q] === GER), b = landAdj(p).find((q) => s.ctrl[q] === BEL);
      if (g && b && !landAdj(p).some((q) => s.ctrl[q] === FRA)) { here = p; from = g; }
    }
    expect(here).toBeGreaterThan(0);
    const id = s.mil.divs.findIndex((d) => d && d.o === FRA);
    const divs = s.mil.divs.slice();
    divs[id] = { ...divs[id], p: here, path: [] };
    const st = { ...s, mil: { ...s.mil, divs } };
    const ctx = openCtx(st);
    const q = retreatTarget(ctx, ctx.divs[id], { from: [from] });
    expect(q).toBeGreaterThan(0);
    expect(st.ctrl[q]).toBe(BEL);
    // bez přístupu (Belgie mimo blok) ustoupit není kam
    const alone = { ...st, dip: { ...st.dip, fac: st.dip.fac.map((v, i) => (i === BEL ? 0 : v)), ver: st.dip.ver + 1 } };
    const ctx2 = openCtx(alone);
    expect(retreatTarget(ctx2, ctx2.divs[id], { from: [from] })).toBe(0);
  });
  it('spojenec živí cizí vojsko ze svého hlavního města a uzlů', () => {
    const s = base();
    const paris = W.owners[FRA].cap;
    const alone = supplyFlow(s.ctrl, ENG, undefined, null, null), allied = supplyFlow(s.ctrl, ENG, undefined, [FRA], null);
    expect(alone[paris]).toBe(0);
    expect(allied[paris]).toBeCloseTo(ARMY.SUP_ALLY_CAPITAL, 5);
    expect(allied[paris]).toBeLessThan(supplyReach(s, 'FRA')[paris]);
  });
});

describe('hospodářství AI: dovoz surovin a rezerva výzbroje', () => {
  /** Stav, ve kterém Itálii chybí ocel (těžba smazána) a je den přehodnocení obchodu. */
  const starved = () => {
    const s = base();
    const st = s.ind.st.map((e, i) => (e && s.stateOwner[i] === ITA ? { ...e, res: { ...e.res, ocel: 0 } } : e));
    const day = (7 - (ITA % 7)) % 7;
    return { ...s, tick: 24 * (day + 7), ind: { ...s.ind, st } };
  };
  it('země, které surovina chybí, si sjedná dovoz od země s přebytkem; jindy než v den přehodnocení ne', () => {
    const s = starved();
    expect(industryOf(s, 'ITA').res.ocel.f).toBeLessThan(AI.TRADE_NEED);
    const sup = resSupplier(s, ITA, 'ocel', AI.TRADE_MIN);
    expect(sup).toBeTruthy();
    const t = aiTrade(s, ITA);
    const deal = t.ind.trade.find((d) => d.to === ITA && d.res === 'ocel' && !s.ind.trade.includes(d));
    expect(deal).toBeTruthy();
    expect(deal.from).toBe(sup.from);
    expect(deal.amt).toBeGreaterThanOrEqual(AI.TRADE_MIN);
    expect(deal.amt).toBeLessThanOrEqual(IND.TRADE_AMT_MAX);
    const off = { ...s, tick: s.tick + 24 };
    expect(aiTrade(off, ITA)).toBe(off);
    expect(validateState(t)).toBeNull();
  });
  it('smlouvu, kterou vývozce neplní, AI při příštím přehodnocení zruší; hráči vývoz nevnucuje', () => {
    const s = starved();
    const t = aiTrade(s, ITA);
    const deal = t.ind.trade.find((d) => d.to === ITA && d.res === 'ocel' && !s.ind.trade.includes(d));
    const next = aiTrade({ ...t, tick: t.tick + 24 * 7 }, ITA);   // `got` je stále 0: nic nepřišlo
    expect(next.ind.trade.some((d) => d.id === deal.id)).toBe(false);
    const sup = resSupplier(s, ITA, 'ocel', AI.TRADE_MIN);
    const asPlayer = { ...s, player: W.owners[sup.from].tag };
    const other = resSupplier(asPlayer, ITA, 'ocel', AI.TRADE_MIN);
    expect(other === null || other.from !== sup.from).toBe(true);
  });
  it('AI nové divize necvičí, když by ve skladu nezbyla rezerva na doplňování', () => {
    const s = base();
    const sc = scanArmies(s);
    expect(sc[GER].eq.pusky).toBeGreaterThan(0);
    expect(sc[GER].hp / sc[GER].count).toBeCloseTo(1, 5);
    const stockOf = (share) => { const st = {}; for (const e in s.mil.stock[GER]) st[e] = (sc[GER].eq[e] || 0) * share; return st; };
    const set = (share) => { const stock = s.mil.stock.slice(); stock[GER] = stockOf(share); return { ...s, mil: { ...s.mil, stock } }; };
    const low = set(AI.STOCK_KEEP * 0.5);
    expect(aiArmy(low, GER, scanArmies(low)).mil.queue.length).toBe(low.mil.queue.length);
    const rich = set(AI.STOCK_KEEP + 0.5);
    expect(aiArmy(rich, GER, scanArmies(rich)).mil.queue.length).toBeGreaterThan(rich.mil.queue.length);
  });
});

describe('vojenští duchové, doktríny a kvalita armád', () => {
  it('vojenské bonusy duchů jsou z klíčů MOD_KEYS a sčítají se do bonusů divizí', () => {
    for (const id in SPIRITS) for (const k in SPIRITS[id].army || {}) expect(MOD_KEYS).toContain(k);
    expect(spiritArmyMods(startSpirits('GER')).atk).toBeCloseTo(SPIRITS.ukolova_taktika.army.atk, 6);
    expect(spiritArmyMods(startSpirits('FRA')).atk).toBeLessThan(0);
    expect(spiritArmyMods(startSpirits('LUX'))).toEqual({});
    const s = base();
    const ctx = openCtx(s);
    const g = s.mil.divs.find((d) => d && d.o === GER && d.army), f = s.mil.divs.find((d) => d && d.o === FRA && d.army);
    const bare = openCtx({ ...s, nat: { ...s.nat, own: s.nat.own.map((x) => (x ? { ...x, sp: {} } : x)) } });
    expect(modsOf(ctx, g).atk - modsOf(bare, g).atk).toBeCloseTo(SPIRITS.ukolova_taktika.army.atk, 6);
    expect(modsOf(ctx, f).atk).toBeLessThan(modsOf(bare, f).atk);
    expect(modsOf(ctx, { army: g.army }).planGain - modsOf(bare, { army: g.army }).planGain).toBeCloseTo(SPIRITS.ukolova_taktika.army.planGain, 6);
  });
  it('kvalita armády očima AI: Německo nad Francií, v mezích', () => {
    const s = base();
    expect(armyQuality(s, GER)).toBeGreaterThan(armyQuality(s, FRA));
    for (const o of [GER, FRA, SOV, ENG, DEN]) { expect(armyQuality(s, o)).toBeGreaterThanOrEqual(0.7); expect(armyQuality(s, o)).toBeLessThanOrEqual(1.4); }
  });
  it('AI velmoci volí doktrínu podle svého sklonu', () => {
    expect(DOCTRINE_PREF.GER.land).toBe('pruraz');
    let s = base();
    for (const b of ['land', 'air', 'sea']) s = addXp(s, GER, b, 500);
    s = aiDoctrine(s, GER);
    expect(s.doc.own[GER].track.land).toBe(DOCTRINE_PREF.GER.land);
    expect(s.doc.own[GER].track.air).toBe(DOCTRINE_PREF.GER.air);
  });
});

describe('vylodění jen u země, kterou chce útočník porazit', () => {
  const setup = () => {
    let s = createGame({ player: null, aiLevel: 2, scenario: '1939' });
    s = declareWar(s, 'ENG', 'GER');
    const divs = s.mil.divs.map((d) => (d && d.o === GER ? null : d));
    return { ...s, mil: { ...s.mil, divs, ver: s.mil.ver + 1 } };
  };
  const ports = (s) => { const out = []; for (let p = 1; p <= W.L; p++) if (W.portLevel[p] && s.ctrl[p] === ENG) out.push(p); return out; };
  it('bez válečného cíle žádná místa vylodění na nepřátelském území; s cílem ano', () => {
    const s = setup();
    expect(landingSites(s, ENG, ports(s), 8).filter((x) => s.ctrl[x.p] === GER)).toHaveLength(0);
    const g = withGoal(s, ENG, GER);
    expect(landingSites(g, ENG, ports(g), 8).filter((x) => g.ctrl[x.p] === GER).length).toBeGreaterThan(0);
  });
});

describe('uložení a platnost', () => {
  it('plán místního útoku (loc) přežije uložení a stav zůstává platný', () => {
    const s = declareWar(base(), 'GER', 'POL');
    const d = s.mil.divs.find((x) => x && x.o === GER && x.army);
    const t = setPlan(s, d.army, { k: 'front', line: [d.p], to: [], mode: 'balanced', loc: 1 });
    expect(t.mil.armies[d.army].plan.loc).toBe(1);
    expect(setPlan(s, d.army, { k: 'front', line: [d.p], to: [], mode: 'balanced' }).mil.armies[d.army].plan.loc).toBeUndefined();
    const back = unpackGame(packGame(t));
    expect(back.state.mil.armies[d.army].plan.loc).toBe(1);
    expect(validateState(t)).toBeNull();
    expect(GAME_VERSION).toBeGreaterThanOrEqual(42);
    void DIP; void HUN; void YUG; void ITA; void DEN;
  });
});
