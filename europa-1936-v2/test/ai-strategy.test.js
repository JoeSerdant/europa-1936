// Strategie AI (M66): hledání dlouhých cest, divadla války, přidělení armád, útočník a obránce, hystereze, mírové rozmístění, zámek míru a povaha zemí.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, declareWar, findPath, validateState, peaceBlock, DIP, AI,
} from '../src/engine/index.js';
import { aggrOf, PERSONALITY } from '../src/engine/index.js';
import { theatersOf, decideStrategy, aiStrategy, aiPeaceDeploy, isAggressor, allocateArmies, supplyView } from '../src/engine/ai/strategy.js';
import { enemiesOf } from '../src/engine/army/war.js';
import { adjacency } from '../src/engine/army/geo.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), POL = idx('POL'), SOV = idx('SOV'), FRA = idx('FRA'), ITA = idx('ITA'), YUG = idx('YUG'), ENG = idx('ENG');
const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const warAs = (s, a, b) => ({ ...declareWar(s, W.owners[a].tag, W.owners[b].tag), dip: { ...declareWar(s, W.owners[a].tag, W.owners[b].tag).dip, goal: { ...s.dip.goal, [`${a}>${b}`]: 'conquest' }, since: { ...s.dip.since, [key(a, b)]: s.tick } } });
const base = () => createGame({ player: null, aiLevel: 2 });

describe('hledání cest (oprava M66)', () => {
  it('dlouhé cesty po vlastním území se najdou (Float32 dřív přeskakoval uzly)', () => {
    const s = base();
    // Záporoží → Moskva, Murmansk → Batumi: stovky kilometrů uvnitř SSSR
    const names = Object.fromEntries(W.land.map((l, p) => [l && l.n, p]).filter(([n]) => n));
    const from = names['Záporoží'], to = names['Moskva'];
    expect(from && to).toBeTruthy();
    const path = findPath(s.mil, s.ctrl, SOV, from, to);
    expect(path).toBeTruthy();
    expect(path.length).toBeGreaterThan(8);
    expect(path[path.length - 1]).toBe(to);
    const adj = adjacency(W);
    let p = from;
    for (const q of path) { expect(adj[p].some((e) => e.to === q && e.kind !== 2)).toBe(true); p = q; }
  });
});

describe('divadla války', () => {
  it('po vyhlášení války vznikne divadlo: posty jsou vlastní a sousedí s nepřítelem, cíle jsou nepřátelské a sousedí s posty', () => {
    const s = warAs(base(), GER, POL);
    const th = theatersOf(s, GER, new Set(enemiesOf(s.mil, GER)));
    expect(th.length).toBeGreaterThan(0);
    const adj = adjacency(W);
    for (const t of th) {
      expect(t.posts.length).toBeGreaterThan(0);
      for (const p of t.posts) { expect(s.ctrl[p]).toBe(GER); expect(adj[p].some((e) => e.kind !== 2 && s.ctrl[e.to] === POL)).toBe(true); }
      for (const q of t.targets) { expect(s.ctrl[q]).toBe(POL); expect(t.posts.some((p) => adj[p].some((e) => e.to === q))).toBe(true); }
    }
    expect(th.map((t) => t.prio)).toEqual([...th.map((t) => t.prio)].sort((a, b) => b - a));
  });
  it('rozhodnutí: v míru null, ve válce každá armáda právě jednou, poměry konečné', () => {
    expect(decideStrategy(base(), GER)).toBeNull();
    const s = warAs(base(), GER, POL);
    const d = decideStrategy(s, GER);
    expect(d).toBeTruthy();
    const ids = d.got.flat();
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(d.armies.length);
    for (const r of d.ratio) expect(Number.isFinite(r)).toBe(true);
    expect(d.aggressor).toBe(true);
    expect(d.theaters.every((t) => t.eff >= t.enemy)).toBe(true);
  });
  it('útočník a obránce: útočník se pozná podle cíle války v bloku, obránce potřebuje větší převahu', () => {
    const s = warAs(base(), GER, POL);
    expect(isAggressor(s, GER, new Set([POL]))).toBe(true);
    expect(isAggressor(s, POL, new Set([GER]))).toBe(false);
    expect(decideStrategy(s, POL).ratioNeed).toBeGreaterThan(decideStrategy(s, GER).ratioNeed);
    expect(aggrOf('FRA')).toBeLessThan(aggrOf('GER'));
    expect(aggrOf('XXX')).toBe(PERSONALITY.default.aggr);
  });
});

describe('plány', () => {
  it('ve válce armády dostanou plány a stav zůstane platný; plán se nemění, když je stejný', () => {
    let s = warAs(base(), ITA, YUG);
    s = aiStrategy(s, ITA);
    const plans = s.mil.armies.filter((a) => a && a.o === ITA && a.plan);
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.some((a) => a.plan.k === 'front' && a.plan.to.length > 0)).toBe(true);
    const again = aiStrategy(s, ITA);
    expect(again.mil.armies.filter((a) => a && a.o === ITA).map((a) => JSON.stringify(a.plan))).toEqual(s.mil.armies.filter((a) => a && a.o === ITA).map((a) => JSON.stringify(a.plan)));
    expect(validateState(advance(s, 24))).toBeNull();
  });
  it('v míru se armády rozmístí do domácích oblastí (plán Hájit oblast na vlastním území)', () => {
    const s = aiStrategy(base(), FRA);
    const mine = s.mil.armies.filter((a) => a && a.o === FRA);
    expect(mine.length).toBeGreaterThan(0);
    for (const a of mine) { expect(a.plan && a.plan.k).toBe('area'); expect(a.plan.area.every((p) => s.ctrl[p] === FRA)).toBe(true); }
    expect(aiPeaceDeploy(s, FRA, [])).toBe(s);
  });
  it('po skončení války AI stáhne útočné plány a vrátí armády do míru', () => {
    let s = aiStrategy(warAs(base(), ITA, YUG), ITA);
    expect(s.mil.armies.some((a) => a && a.o === ITA && a.plan && a.plan.k === 'front')).toBe(true);
    s = { ...s, mil: { ...s.mil, wars: [] } };
    s = aiStrategy(s, ITA);
    expect(s.mil.armies.filter((a) => a && a.o === ITA && a.plan).every((a) => a.plan.k === 'area')).toBe(true);
  });
});

describe('mír a válka', () => {
  it('útočník odmítá bílý mír v prvních dnech války, pak ho přijme, když válka nikam nevede', () => {
    const s = warAs(base(), GER, POL);
    expect(peaceBlock(s, POL, GER)).toMatch(/dokončit/);
    const later = { ...s, tick: 24 * (DIP.WAR_LOCK_DAYS + 1) };
    expect(peaceBlock(later, POL, GER)).toBeNull();
    const plain = declareWar(base(), 'GER', 'POL');
    expect(peaceBlock(plain, POL, GER)).toBeNull();   // válka bez cíle (testy, scénáře) se chová jako dřív
  });
  it('unavená AI země na začátku války o mír nežádá', () => {
    let s = warAs(base(), ITA, YUG);
    const own = s.pol.own.slice(); own[YUG] = { ...own[YUG], stab: 0.2, ws: 0.1 };
    s = { ...s, pol: { ...s.pol, own } };
    s = advance(s, 24 * 10);
    expect(s.mil.wars.some(([a, b]) => (a === ITA && b === YUG) || (a === YUG && b === ITA)) || s.dip.cap[YUG] || s.dip.sub[YUG] === ITA).toBe(true);
    expect(AI.PEACE_MIN_DAYS).toBeGreaterThan(10);
  });
});

describe('přidělení armád a zásobování', () => {
  const th = (posts, eff, x, viable = [1]) => ({ posts: new Array(posts).fill(0), viable, eff, x, y: 0 });
  const armies = (n, x) => Array.from({ length: n }, (_, i) => ({ id: i + 1, n: 12, x, y: 0 }));
  const dist = (a, t) => Math.abs(a.x - t.x);

  it('první divadlo nevysaje všechny armády, když na převahu stejně nemá (obrana tam, útok jinde)', () => {
    // divadlo 0 (silný nepřítel, hlavní priorita) je blíž armádám, ale jeho převaha by byla 0,88 < 0,96; divadlo 1 jde splnit
    const { got } = allocateArmies([th(9, 68, 0), th(18, 42, 100)], armies(5, 10), { dist, ratioNeed: 0.96 });
    expect(got[0].length).toBe(1);
    expect(got[1].length).toBe(4);
    expect(got.flat().sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it('rozjetý útok (hystereze) si armády ponechá i při nižším poměru sil', () => {
    const { got } = allocateArmies([th(9, 68, 0), th(18, 42, 100)], armies(5, 10), { dist, ratioNeed: 0.96, engaged: new Set([0]) });
    expect(got[0].length).toBe(4);   // obrana divadla 1 si vezme jednu armádu, ostatní zůstanou u rozjetého útoku
    expect(got[1].length).toBe(1);
  });
  it('divadlo bez dosažitelných cílů dostane jen obranu, zbytek odejde k nejbližšímu divadlu', () => {
    const { got } = allocateArmies([th(9, 10, 0, []), th(18, 42, 100)], armies(5, 10), { dist, ratioNeed: 0.96 });
    expect(got[0].length).toBe(1);
    expect(got[1].length).toBe(4);
    const { got: few } = allocateArmies([th(9, 10, 0, []), th(18, 42, 100)], armies(4, 10), { dist, ratioNeed: 0.96 });   // na převahu v divadle 1 nestačí → zbylé armády k nejbližšímu
    expect(few[1].length).toBe(1);
    expect(few[0].length).toBe(3);
  });
  it('žádná armáda se nepřidělí dvakrát ani neztratí', () => {
    const { got, reserve } = allocateArmies([th(20, 30, 0), th(5, 5, 40), th(8, 50, 90)], armies(7, 50), { dist, ratioNeed: 1.3 });
    const ids = got.flat().concat(reserve);
    expect(new Set(ids).size).toBe(7);
    expect(ids.length).toBe(7);
  });
  it('malé divadlo nevsaje všechny armády: do útoku jdou nejvýš tolik divizí, kolik unese fronta, vzdálené armády zůstanou doma', () => {
    // jedna styčná provincie, nepřítel 5 divizí → útok nejvýš ARMY_SIZE divizí (jedna armáda); blízké zbylé armády jen posílí do hloubky
    const nearby = allocateArmies([th(1, 5, 0)], armies(8, 20), { dist, ratioNeed: 1 });
    expect(nearby.reserve.length).toBe(0);
    expect(nearby.got[0].length).toBe(8);
    // daleké armády se do divadla nepřipojí: kromě obrany a jedné útočné armády zůstávají v záloze
    const far = allocateArmies([th(1, 5, 0)], armies(8, 5000), { dist: (a, t) => Math.abs(a.x - t.x) * 0.2, ratioNeed: 1 });
    expect(far.got[0].length).toBe(1);   // obrana (jedna armáda je víc než 12 divizí = dost i na útok)
    expect(far.reserve.length).toBe(7);
  });

  it('zásobování: hlavní město je zásobené, cizí území ne; dosažitelné cíle jsou podmnožinou cílů divadla', () => {
    const s = warAs(base(), GER, POL);
    const v = supplyView(s, GER);
    expect(v.post(W.owners[GER].cap)).toBe(true);
    expect(v.post(W.owners[POL].cap)).toBe(false);
    const d = decideStrategy(s, GER);
    for (const t of d.theaters) for (const q of t.viable) expect(t.targets).toContain(q);
    expect(d.theaters.some((t) => t.viable.length > 0)).toBe(true);
  });
  it('cíl bez zásob se neútočí: v divadle zůstanou jen cíle, které po dobytí udrží tok', () => {
    const s = warAs(base(), SOV, 'FIN' in {} ? 0 : idx('FIN'));
    const d = decideStrategy(s, SOV);
    expect(d).toBeTruthy();
    for (const t of d.theaters) for (const q of t.viable) expect(supplyView(s, SOV).target(q)).toBe(true);
    for (const t of d.theaters) for (const q of t.targets) if (!t.viable.includes(q)) expect(supplyView(s, SOV).target(q)).toBe(false);
  });
  it('hladovějící armáda se stáhne do zásobovaných provincií (plán Hájit oblast)', () => {
    const s0 = warAs(base(), GER, POL);
    const aid = s0.mil.armies.findIndex((a) => a && a.o === GER);
    expect(aid).toBeGreaterThan(0);
    const divs = s0.mil.divs.map((d) => (d && d.army === aid ? { ...d, sg: 0, sup: 0.05 } : d));
    const s = aiStrategy({ ...s0, mil: { ...s0.mil, divs } }, GER);
    const pl = s.mil.armies[aid].plan;
    expect(pl.k).toBe('area');
    const reach = supplyView(s, GER).reach;
    expect(pl.area.every((p) => s.ctrl[p] === GER && reach[p] >= AI.SUP_TARGET_MIN)).toBe(true);
  });
  it('konstanty zásobování AI jsou rozumné', () => {
    expect(AI.SUP_TARGET_MIN).toBeGreaterThan(AI.SUP_POST_MIN);
    expect(AI.SUP_POST_MIN).toBeGreaterThan(0);
  });
});
