// Průmysl (M19): počáteční rozmístění, stavby, výroba a sklady, suroviny a obchod, spotřební zboží, okupace, infrastruktura a čistota.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, advanceHour, declareWar, build, cancelBuild, moveBuild, addLine, setLineFactories, setLineEquip, removeLine,
  addTrade, setTradeAmount, cancelTrade, industryOf, stateIndustry, slotsOf, slotsUsed, categoryOf, infraOf, geo, supplyFlow,
  IND, IND_NATIONAL, BUILDINGS, EQUIP_PROD, RES_IDS, EQUIP, GAME_VERSION,
} from '../src/engine/index.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const statesOf = (tag) => { const o = idx(tag); const r = []; for (let s = 1; s < W.states.length; s++) if (W.stateOwner0[s] === o) r.push(s); return r; };
const day = (s, n = 1) => advance(s, 24 * n);
// první stát země s volným slotem
const freeState = (s, tag) => statesOf(tag).find((x) => slotsUsed(s.ind, x) < slotsOf(s.ind, x));

describe('počáteční průmysl', () => {
  const s = createGame({ player: 'GER' });

  it('verze stavu a čistý JSON', () => {
    expect(s.v).toBe(GAME_VERSION);
    expect(GAME_VERSION).toBe(3);
    expect(JSON.parse(JSON.stringify(s.ind))).toEqual(s.ind);
  });

  it('továrny odpovídají datům země (nejvýš kapacita slotů), nikdo nepřekročí sloty', () => {
    for (const tag of Object.keys(IND_NATIONAL)) {
      const t = industryOf(s, tag);
      expect(t.civ).toBeLessThanOrEqual(IND_NATIONAL[tag].civ);
      expect(t.mil).toBeLessThanOrEqual(IND_NATIONAL[tag].mil);
      if (IND_NATIONAL[tag].civ + IND_NATIONAL[tag].mil > 0) expect(t.civ + t.mil).toBeGreaterThan(0);
    }
    for (let st = 1; st < W.states.length; st++) expect(slotsUsed(s.ind, st)).toBeLessThanOrEqual(slotsOf(s.ind, st));
    expect(industryOf(s, 'GER').civ).toBe(IND_NATIONAL.GER.civ);
    expect(industryOf(s, 'SOV').mil).toBe(IND_NATIONAL.SOV.mil);
  });

  it('těžba se rozdělí do států a součet sedí', () => {
    const o = idx('SOV');
    const sum = {};
    for (const st of statesOf('SOV')) for (const r in s.ind.st[st].res) sum[r] = (sum[r] || 0) + s.ind.st[st].res[r];
    for (const r in IND_NATIONAL.SOV.res) expect(sum[r]).toBeCloseTo(IND_NATIONAL.SOV.res[r], 1);
    expect(o).toBeGreaterThan(0);
  });

  it('výchozí linky používají jen dostupnou výzbroj a všechny vojenské továrny', () => {
    for (const tag of ['GER', 'FRA', 'SOV', 'POL']) {
      const t = industryOf(s, tag);
      expect(t.lines.reduce((a, l) => a + l.fac, 0)).toBe(t.mil);
      for (const l of t.lines) { expect(EQUIP[l.eq].unlock).toBeNull(); expect(l.fac).toBeLessThanOrEqual(IND.LINE_MAX_FAC); }
    }
  });

  it('deterministické', () => {
    expect(createGame({ player: 'GER' }).ind).toEqual(s.ind);
    expect(createGame({ player: 'GER', seed: 7 }).ind).not.toEqual(s.ind);
  });

  it('kategorie států podle obyvatel', () => {
    expect(categoryOf(100).id).toBe('osada');
    expect(categoryOf(1000).id).toBe('velke');
    expect(categoryOf(9999).id).toBe('metropole');
  });
});

describe('stavby', () => {
  const s = createGame({ player: 'GER' });
  const st = freeState(s, 'GER');

  it('zadání a zrušení; neplatný vstup vrací tentýž stav', () => {
    const a = build(s, st, 'civ');
    expect(a).not.toBe(s);
    expect(a.ind.build).toHaveLength(1);
    expect(a.ind.build[0]).toMatchObject({ o: idx('GER'), s: st, k: 'civ', prog: 0 });
    expect(build(s, 0, 'civ')).toBe(s);
    expect(build(s, st, 'xxx')).toBe(s);
    expect(build(s, 99999, 'civ')).toBe(s);
    expect(cancelBuild(a, 12345)).toBe(a);
    expect(cancelBuild(a, a.ind.build[0].id).ind.build).toHaveLength(0);
    expect(s.ind.build).toHaveLength(0);   // původní stav se nemění
  });

  it('slotů je omezený počet (rozestavěné se počítají)', () => {
    let a = s;
    const free = slotsOf(a.ind, st) - slotsUsed(a.ind, st);
    for (let i = 0; i < free; i++) { const b = build(a, st, i % 2 ? 'mil' : 'civ'); expect(b).not.toBe(a); a = b; }
    expect(build(a, st, 'civ')).toBe(a);
    expect(build(a, st, 'inf')).not.toBe(a);   // infrastruktura slot nezabírá
  });

  it('cizí a okupovaný stát nejde stavět', () => {
    const fr = freeState(s, 'FRA');
    const b = build(s, fr, 'civ');
    expect(b.ind.build[0].o).toBe(idx('FRA'));   // engine nehlídá hráče (to dělá UI), projekt patří vlastníkovi státu
    const ctrl = s.ctrl.slice(); ctrl[W.states[st].cap] = idx('FRA');
    const occ = { ...s, ctrl };
    expect(build(occ, st, 'civ')).toBe(occ);
  });

  it('civilní továrna se postaví nejdřív za nejkratší dobu a přidá slot využití', () => {
    let a = build(s, st, 'civ');
    const before = industryOf(a, 'GER').civ;
    a = day(a, BUILDINGS.civ.days - 2);
    expect(a.ind.build).toHaveLength(1);
    expect(a.ind.build[0].prog).toBeGreaterThan(0);
    a = day(a, 4);
    expect(a.ind.build).toHaveLength(0);
    expect(industryOf(a, 'GER').civ).toBe(before + 1);
    expect(a.ind.st[st].civ).toBe(s.ind.st[st].civ + 1);
    expect(a.ind.ver).toBeGreaterThan(s.ind.ver);
  });

  it('infrastruktura zvedne úroveň státu i slotů a infraOf; nejvýš INF_MAX', () => {
    let a = s;
    for (let i = 0; i < IND.INF_MAX; i++) a = build(a, st, 'inf');
    expect(build(a, st, 'inf')).toBe(a);
    const slots0 = slotsOf(s.ind, st);
    a = day(a, 80);
    expect(a.ind.inf[st]).toBe(IND.INF_MAX);
    expect(slotsOf(a.ind, st)).toBe(slots0 + IND.INF_MAX);
    const base = geo().infra, now = infraOf(a);
    const p = W.states[st].v[0];
    expect(now[p]).toBe(Math.min(5, base[p] + IND.INF_MAX));
    expect(infraOf(s)).toBe(base);   // bez vylepšení se používá základ světa
  });

  it('pořadí ve frontě: dřívější stavba dostane body první, moveBuild ho mění', () => {
    const st2 = statesOf('GER').filter((x) => slotsUsed(s.ind, x) + 1 < slotsOf(s.ind, x))[1];
    let a = build(build(s, st, 'civ'), st2, 'mil');
    const [b1, b2] = a.ind.build.map((b) => b.id);
    const m = moveBuild(a, b2, -1);
    expect(m.ind.build.map((b) => b.id)).toEqual([b2, b1]);
    expect(moveBuild(a, b1, -1)).toBe(a);
    expect(moveBuild(a, 9999, -1)).toBe(a);
    expect(moveBuild(a, b2, -Infinity).ind.build[0].id).toBe(b2);
  });

  it('bez civilních továren se nestaví; spotřební zboží ubírá body', () => {
    const o = idx('GER');
    const cons = s.ind.cons.slice(); cons[o] = IND.CONS_MAX;
    const hi = { ...s, ind: { ...s.ind, cons } };
    expect(industryOf(hi, 'GER').points).toBeLessThan(industryOf(s, 'GER').points);
    expect(industryOf(s, 'GER').consFac).toBeCloseTo(s.ind.cons[o] * (40 + 22), 5);
    const none = { ...s, ind: { ...s.ind, cons: s.ind.cons.map(() => 1) } };
    const b = day(build(none, st, 'civ'), 20);
    expect(b.ind.build[0].prog).toBe(0);
  });
});

describe('výroba', () => {
  const s = createGame({ player: 'GER' });
  const o = idx('GER');

  it('linky doplňují sklad výzbroje a rostou v efektivitě', () => {
    const a = day(s, 30);
    expect(a.mil.stock[o].pusky).toBeGreaterThan(s.mil.stock[o].pusky + 300);
    const l0 = s.ind.lines.find((l) => l.o === o && l.eq === 'pusky'), l1 = a.ind.lines.find((l) => l.id === l0.id);
    expect(l1.eff).toBeGreaterThan(l0.eff);
    expect(l1.eff).toBeLessThanOrEqual(IND.EFF_CAP);
    expect(l1.out).toBeGreaterThan(0);
    // ostatní země se nemění jinak než svou výrobou
    expect(a.mil.stock[idx('FRA')].pusky).toBeGreaterThan(s.mil.stock[idx('FRA')].pusky);
  });

  it('výroba probíhá jen o půlnoci; ostatní hodiny vrací tentýž objekt ind', () => {
    const a = advance(s, 24);
    const b = advanceHour(a);
    expect(b.ind).toBe(a.ind);
    expect(b.mil.stock).toBe(a.mil.stock);
  });

  it('nová linka začíná na EFF_START, přidání továren efektivitu zředí, ubrání ne', () => {
    let a = s;
    const free = industryOf(a, 'GER').milFree;
    expect(free).toBe(0);
    const l = a.ind.lines.find((x) => x.o === o && x.eq === 'pusky');
    a = setLineFactories(a, l.id, l.fac - 2);
    expect(a.ind.lines.find((x) => x.id === l.id).eff).toBe(l.eff);
    expect(industryOf(a, 'GER').milFree).toBe(2);
    a = addLine(a, o, 'vozy', 2);
    const nl = a.ind.lines.at(-1);
    expect(nl).toMatchObject({ eq: 'vozy', fac: 2, eff: IND.EFF_START });
    expect(addLine(a, o, 'vozy', 1)).toBe(a);   // žádná volná továrna
    expect(addLine(a, o, 'htanky', 1)).toBe(a);
    const back = setLineFactories(a, l.id, l.fac);
    expect(back).toBe(a);   // chybí volné továrny
    const b2 = setLineFactories(setLineFactories(a, nl.id, 1), l.id, l.fac - 1);
    expect(b2.ind.lines.find((x) => x.id === l.id).eff).toBeCloseTo(l.eff * ((l.fac - 2) / (l.fac - 1)), 9);
  });

  it('změna druhu výzbroje zahodí efektivitu; zrušení linky uvolní továrny', () => {
    const l = s.ind.lines.find((x) => x.o === o && x.eq === 'dela');
    const a = setLineEquip(s, l.id, 'pdela');
    expect(a.ind.lines.find((x) => x.id === l.id)).toMatchObject({ eq: 'pdela', eff: IND.EFF_START, acc: 0 });
    expect(setLineEquip(s, l.id, 'dela')).toBe(s);
    expect(setLineEquip(s, l.id, 'mtanky')).toBe(s);
    expect(setLineEquip(s, 9999, 'pdela')).toBe(s);
    const r = removeLine(s, l.id);
    expect(industryOf(r, 'GER').milFree).toBe(l.fac);
    expect(removeLine(s, 9999)).toBe(s);
  });

  it('nedostatek suroviny snižuje výrobu, ale ne pod RES_FLOOR', () => {
    const ocelOnly = { ...s, ind: { ...s.ind, trade: [], st: s.ind.st.map((e) => (e ? { ...e, res: { ...e.res, ocel: undefined } } : e)) } };
    for (const e of ocelOnly.ind.st) if (e) delete e.res.ocel;
    const a = day(ocelOnly, 5);
    const l = a.ind.lines.find((x) => x.o === o && x.eq === 'pusky');
    expect(l.f).toBeCloseTo(IND.RES_FLOOR, 5);
    const normal = day(s, 5).ind.lines.find((x) => x.id === l.id);
    expect(normal.f).toBe(1);
    expect(l.out).toBeLessThan(normal.out);
  });

  it('linky se zkrátí, když zemi ubude továren (ztráta státu)', () => {
    const ss = statesOf('GER').filter((x) => s.ind.st[x].mil > 0);
    const so = s.stateOwner.slice();
    for (const x of ss) so[x] = idx('FRA');
    const a = day({ ...s, stateOwner: so }, 1);
    const t = industryOf(a, 'GER');
    expect(t.mil).toBe(0);
    expect(a.ind.lines.filter((l) => l.o === o)).toHaveLength(0);
  });
});

describe('suroviny a obchod', () => {
  const s = createGame({ player: 'GER' });
  const GER = idx('GER'), ROM = idx('ROM'), FRA = idx('FRA');

  it('obchod dodá nejvýš přebytek vývozce a stojí civilní továrny dovozce', () => {
    const a = day(s, 1);
    const d = a.ind.trade.find((x) => x.from === ROM && x.to === GER && x.res === 'ropa');
    expect(d.got).toBeGreaterThan(0);
    expect(d.got).toBeLessThanOrEqual(d.amt);
    const t = industryOf(a, 'GER');
    expect(t.res.ropa.imp).toBeGreaterThan(0);
    expect(t.tradeCiv).toBeGreaterThan(0);
    expect(t.civAvail).toBeLessThan(40 - t.consFac);
  });

  it('vývozce nikdy nevyveze víc než těží; poptávka vývozce má přednost', () => {
    let a = addTrade(s, ROM, FRA, 'ropa', 30);
    a = day(a, 1);
    const t = industryOf(a, 'ROM');
    expect(t.res.ropa.exp).toBeLessThanOrEqual(t.res.ropa.ext - t.res.ropa.dem + 1e-9);
    expect(t.res.ropa.f).toBe(1);
  });

  it('smlouvu lze přidat, změnit a zrušit; neplatný vstup vrací tentýž stav', () => {
    const a = addTrade(s, ROM, FRA, 'ropa', 2);
    expect(a.ind.trade).toHaveLength(s.ind.trade.length + 1);
    const id = a.ind.trade.at(-1).id;
    expect(setTradeAmount(a, id, 5).ind.trade.at(-1).amt).toBe(5);
    expect(setTradeAmount(a, id, 2)).toBe(a);
    expect(cancelTrade(a, id).ind.trade).toHaveLength(s.ind.trade.length);
    expect(cancelTrade(a, 9999)).toBe(a);
    expect(addTrade(s, ROM, ROM, 'ropa', 1)).toBe(s);
    expect(addTrade(s, ROM, FRA, 'zlato', 1)).toBe(s);
    expect(addTrade(s, ROM, FRA, 'ropa', 0)).toBe(s);
    expect(addTrade(s, ROM, FRA, 'ropa', IND.TRADE_AMT_MAX + 1)).toBe(s);
    expect(addTrade(s, 0, FRA, 'ropa', 1)).toBe(s);
  });

  it('ve válce se smlouvy mezi stranami přeruší', () => {
    const w = declareWar(s, 'ROM', 'GER');
    expect(addTrade(w, ROM, GER, 'ropa', 1)).toBe(w);
    const a = day(w, 1);
    expect(a.ind.trade.find((x) => x.from === ROM && x.to === GER).got).toBe(0);
  });

  it('okupovaný stát dává těžbu okupantovi a vlastníkovi ne', () => {
    const rs = statesOf('ROM').find((x) => s.ind.st[x].res.ropa > 0);
    const ctrl = s.ctrl.slice(); ctrl[W.states[rs].cap] = GER;
    const a = { ...s, ctrl };
    expect(industryOf(a, 'ROM').res.ropa?.ext || 0).toBeLessThan(industryOf(s, 'ROM').res.ropa.ext);
    expect(industryOf(a, 'GER').res.ropa.ext).toBeGreaterThan(industryOf(s, 'GER').res.ropa.ext);
    expect(industryOf(a, 'ROM').occupied).toBe(1);
  });

  it('data: každá výzbroj má cenu a známé suroviny', () => {
    for (const e in EQUIP_PROD) { expect(EQUIP[e]).toBeTruthy(); expect(EQUIP_PROD[e].cost).toBeGreaterThan(0); for (const r in EQUIP_PROD[e].res) expect(RES_IDS).toContain(r); }
  });
});

describe('infrastruktura a armáda', () => {
  it('vylepšená infrastruktura zvýší tok zásobování', () => {
    const s = createGame({ player: 'GER' });
    const o = idx('GER');
    const inf = s.ind.inf.slice();
    for (const x of statesOf('GER')) inf[x] = IND.INF_MAX;
    const a = { ...s, ind: { ...s.ind, inf } };
    const f0 = supplyFlow(s.ctrl, o, infraOf(s)), f1 = supplyFlow(a.ctrl, o, infraOf(a));
    let better = 0;
    for (let p = 1; p <= W.L; p++) if (W.provOwner0[p] === o) { expect(f1[p]).toBeGreaterThanOrEqual(f0[p] - 1e-6); if (f1[p] > f0[p] + 1e-6) better++; }
    expect(better).toBeGreaterThan(50);
  });
});

describe('čistota a determinismus', () => {
  it('45 dní nemění původní stav; výsledek je stejný při dělení kroků; zůstává čistý JSON', () => {
    const s = createGame({ player: 'GER' });
    const snap = JSON.stringify(s);
    const a = advance(s, 24 * 45);
    expect(JSON.stringify(s)).toBe(snap);
    let b = s;
    for (let i = 0; i < 45; i++) b = advance(b, 24);
    expect(JSON.stringify(b.ind)).toBe(JSON.stringify(a.ind));
    expect(JSON.parse(JSON.stringify(a.ind))).toEqual(a.ind);
  });

  it('invarianty: efektivita 0–strop, fronta bez duplicit, součet slotů drží', () => {
    let s = createGame({ player: 'GER' });
    for (const tag of ['GER', 'SOV', 'ENG']) for (const st of statesOf(tag).slice(0, 6)) s = build(build(s, st, 'civ'), st, 'inf');
    s = advance(s, 24 * 120);
    for (const l of s.ind.lines) { expect(l.eff).toBeGreaterThan(0); expect(l.eff).toBeLessThanOrEqual(IND.EFF_CAP + 1e-9); expect(l.acc).toBeGreaterThanOrEqual(0); expect(l.acc).toBeLessThan(1); }
    expect(new Set(s.ind.build.map((b) => b.id)).size).toBe(s.ind.build.length);
    for (let st = 1; st < W.states.length; st++) expect(slotsUsed(s.ind, st)).toBeLessThanOrEqual(slotsOf(s.ind, st));
    expect(stateIndustry(s, 1).used).toBe(slotsUsed(s.ind, 1));
    expect(stateIndustry(s, 0)).toBeNull();
  });
});
