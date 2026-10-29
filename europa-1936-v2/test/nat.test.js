// Národní cíle a události (M22): data, příkazy, plnění cílů, účinky, události hráče a AI, čistota a determinismus.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, advanceHour, startFocus, cancelFocus, chooseEvent, focusTree, natOf, pendingEvents, applyFx, focusMods, fxText, fxLinesOf, modLines,
  FOCUS_TREES, FOCUS_BY_ID, EVENTS, EVENT_BY_ID, polModsOf, industryOf, slotsOf, slotsUsed, researchOf, startResearch, NAT, TECHS, LAWS, ADVISORS, EQUIP, GAME_VERSION,
} from '../src/engine/index.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), FRA = idx('FRA'), SOV = idx('SOV'), CZE = idx('CZE'), POL = idx('POL'), SWE = idx('SWE');
const day = (s, n = 1) => advance(s, 24 * n);
const give = (s, o, ids) => { const own = s.nat.own.slice(); const done = { ...own[o].done }; ids.forEach((i) => { done[i] = 1; }); own[o] = { ...own[o], done }; return { ...s, nat: { ...s.nat, own } }; };
const FX_TYPES = new Set(['pp', 'stab', 'ws', 'law', 'adv', 'factory', 'infra', 'boost', 'boostslot', 'tech', 'man', 'stock', 'flag', 'event']);

describe('data', () => {
  it('stromy: unikátní id, existující předpoklady a vylučující cíle, jedinečné polohy, platné účinky', () => {
    expect(FOCUS_TREES.DEFAULT.length).toBeGreaterThanOrEqual(8);
    const seen = new Set();
    for (const tag in FOCUS_TREES) {
      const pos = new Set(), ids = new Set(FOCUS_TREES[tag].map((f) => f.id));
      for (const f of FOCUS_TREES[tag]) {
        expect(seen.has(f.id)).toBe(false); seen.add(f.id);
        expect(f.days).toBeGreaterThan(0);
        for (const r of [...f.req, ...f.any, ...f.excl]) expect(ids.has(r)).toBe(true);
        for (const x of f.excl) expect(FOCUS_BY_ID[x].excl).toContain(f.id);
        const key = `${f.x},${f.y}`; expect(pos.has(key)).toBe(false); pos.add(key);
        for (const e of f.fx) { expect(FX_TYPES.has(e.t)).toBe(true); void fxText(e); }
      }
      // žádné cykly: každý cíl jde dosáhnout
      const reach = new Set();
      for (let k = 0; k < FOCUS_TREES[tag].length + 1; k++) for (const f of FOCUS_TREES[tag]) if (f.req.every((r) => reach.has(r)) && (!f.any.length || f.any.some((r) => reach.has(r)))) reach.add(f.id);
      expect(reach.size).toBe(FOCUS_TREES[tag].length);
    }
    for (const tag of Object.keys(FOCUS_TREES)) if (tag !== 'DEFAULT') expect(W.ownerIdx[tag]).toBeTruthy();
  });
  it('účinky odkazují na existující zákony, poradce, technologie a výzbroj', () => {
    const all = [...Object.values(FOCUS_BY_ID).flatMap((f) => f.fx), ...EVENTS.flatMap((e) => e.opts.flatMap((o) => o.fx))];
    for (const e of all) {
      if (e.t === 'law') expect(LAWS[e.cat][e.id]).toBeTruthy();
      if (e.t === 'adv') expect(ADVISORS[e.id]).toBeTruthy();
      if (e.t === 'boost' || e.t === 'tech') expect(TECHS[e.id]).toBeTruthy();
      if (e.t === 'stock') expect(EQUIP[e.eq]).toBeTruthy();
      if (e.t === 'event') expect(EVENT_BY_ID[e.id]).toBeTruthy();
      expect(FX_TYPES.has(e.t)).toBe(true);
    }
  });
  it('události: unikátní id, aspoň jedna volba, znaky v textu česky', () => {
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
    for (const e of EVENTS) { expect(e.opts.length).toBeGreaterThan(0); expect(e.text.length).toBeGreaterThan(20); expect(e.mtth).toBeGreaterThanOrEqual(1); for (const t of e.cond.tags || []) expect(W.ownerIdx[t]).toBeTruthy(); }
  });
  it('popisy účinků a bonusů', () => {
    expect(fxLinesOf(FOCUS_BY_ID.ger_plan.fx)).toEqual(['1× civilní továrna', '1× vojenská továrna']);
    expect(modLines({ prod: 0.03, imp: -0.1 })).toEqual(['výroba +3 %', 'cena dovozu −10 %']);
    expect(fxText({ t: 'flag', id: 'x' })).toBeNull();
  });
});

describe('začátek a příkazy', () => {
  const s0 = createGame({ player: 'GER' });
  it('čistý JSON, verze 6, každá země bez hotového cíle', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(6);
    expect(JSON.parse(JSON.stringify(s0.nat))).toEqual(s0.nat);
    for (let o = 1; o < W.owners.length; o++) expect(s0.nat.own[o]).toEqual({ done: {}, cur: null, flags: {}, seen: {}, sched: [], dec: {} });
    expect(s0.nat.pend).toEqual([]);
  });
  it('strom se stavy: kořeny dostupné, ostatní zamčené; neznámá země má obecný strom', () => {
    const t = focusTree(s0, 'GER');
    expect(t.find((f) => f.id === 'ger_plan').status).toBe('available');
    expect(t.find((f) => f.id === 'ger_rearm').status).toBe('locked');
    expect(focusTree(s0, 'SWE').map((f) => f.id)).toEqual(FOCUS_TREES.DEFAULT.map((f) => f.id));
    expect(natOf(s0, 'GER').total).toBe(FOCUS_TREES.GER.length);
  });
  it('zahájení a zrušení; neplatný vstup vrací tentýž stav', () => {
    const a = startFocus(s0, GER, 'ger_plan');
    expect(a).not.toBe(s0);
    expect(a.nat.own[GER].cur).toEqual({ id: 'ger_plan', p: 0 });
    expect(a.nat.ver).toBe(s0.nat.ver + 1);
    expect(startFocus(s0, GER, 'ger_rearm')).toBe(s0);      // zamčeno
    expect(startFocus(s0, GER, 'nic')).toBe(s0);
    expect(startFocus(s0, GER, 'def_ind')).toBe(s0);        // cizí strom
    expect(startFocus(s0, 0, 'ger_plan')).toBe(s0);
    expect(startFocus(s0, 999, 'ger_plan')).toBe(s0);
    expect(cancelFocus(s0, GER)).toBe(s0);
    expect(cancelFocus(a, GER).nat.own[GER].cur).toBeNull();
    const b = startFocus(a, GER, 'ger_plan');
    expect(b.nat.own[GER].cur.p).toBe(0);
  });
  it('vylučující cíle: po splnění jednoho je druhý vyloučen', () => {
    const a = give(s0, GER, ['ger_plan', 'ger_rearm', 'ger_auto']);
    expect(focusTree(a, 'GER').find((f) => f.id === 'ger_trade').status).toBe('excluded');
    expect(startFocus(a, GER, 'ger_trade')).toBe(a);
    const b = give(s0, GER, ['ger_plan', 'ger_rearm']);
    const c = startFocus(b, GER, 'ger_auto');
    expect(focusTree(c, 'GER').find((f) => f.id === 'ger_trade').status).toBe('excluded');
  });
});

describe('plnění cíle a účinky', () => {
  const s0 = createGame({ player: 'GER' });
  it('cíl se dokončí po `days` dnech, účinky se provedou a trvalý bonus platí', () => {
    let a = startFocus(s0, GER, 'ger_plan');
    a = day(a, 44);
    expect(a.nat.own[GER].cur.p).toBe(44);
    expect(a.nat.own[GER].done.ger_plan).toBeUndefined();
    a = day(a, 1);
    expect(a.nat.own[GER].done.ger_plan).toBe(1);
    expect(a.nat.own[GER].cur).toBeNull();
    const before = industryOf(s0, 'GER'), after = industryOf(a, 'GER');
    expect(after.civ).toBe(before.civ + 1);
    expect(after.mil).toBe(before.mil + 1);
    expect(polModsOf(a, GER).prod).toBeCloseTo(0.03, 9);
    expect(focusMods(a.nat.own[GER].done).prod).toBe(0.03);
    expect(focusTree(a, 'GER').find((f) => f.id === 'ger_rearm').status).toBe('available');
  });
  it('účinky jednotlivě: pp, stab, ws, zákon, poradce, továrny, infrastruktura, technologie, lidská síla, sklad', () => {
    const base = s0;
    const eff = (fx) => applyFx(base, GER, fx);
    expect(eff([{ t: 'pp', v: 50 }]).pol.own[GER].pp).toBe(50);
    expect(eff([{ t: 'pp', v: -50 }]).pol.own[GER].pp).toBe(0);
    expect(eff([{ t: 'stab', v: 0.5 }]).pol.own[GER].stab).toBe(1);
    expect(eff([{ t: 'ws', v: -2 }]).pol.own[GER].ws).toBe(0);
    expect(eff([{ t: 'law', cat: 'eco', id: 'war' }]).pol.own[GER].laws.eco).toBe('war');
    expect(eff([{ t: 'law', cat: 'eco', id: 'nic' }])).toBe(base);
    expect(eff([{ t: 'adv', slot: 'sci', id: 'akademik' }]).pol.own[GER].adv.sci).toBe('akademik');
    expect(industryOf(eff([{ t: 'factory', k: 'civ', n: 2 }]), 'GER').civ).toBe(industryOf(base, 'GER').civ + 2);
    const cap = W.provState[W.owners[GER].cap];
    expect(eff([{ t: 'infra', n: 1 }]).ind.inf[cap]).toBe(1);
    expect(eff([{ t: 'infra', n: 9 }]).ind.inf[cap]).toBe(3);
    const t = eff([{ t: 'tech', id: 'pusky2' }]);
    expect(t.tech.own[GER].done.pusky2).toBe(1);
    expect(t.mil.lv[GER]).toEqual({ pusky: 2 });
    expect(eff([{ t: 'tech', id: 'nic' }])).toBe(base);
    expect(eff([{ t: 'man', v: 0.01 }]).mil.man[GER]).toBeGreaterThan(base.mil.man[GER]);
    expect(eff([{ t: 'stock', eq: 'pusky', n: 100 }]).mil.stock[GER].pusky).toBe(base.mil.stock[GER].pusky + 100);
    expect(eff([{ t: 'flag', id: 'x' }]).nat.own[GER].flags.x).toBe(1);
    const e = eff([{ t: 'event', id: 'harvest', days: 3 }]);
    expect(e.nat.own[GER].sched).toEqual([{ id: 'harvest', at: 72 }]);
    expect(base.nat.own[GER].sched).toEqual([]);
  });
  it('továrna jde jen do státu s volným slotem; bez volného slotu se nic nepřidá', () => {
    let a = s0;
    const total = industryOf(a, 'GER').civ;
    a = applyFx(a, GER, [{ t: 'factory', k: 'civ', n: 3 }]);
    expect(industryOf(a, 'GER').civ).toBe(total + 3);
    for (let s = 1; s < W.states.length; s++) if (a.stateOwner[s] === GER) expect(slotsUsed(a.ind, s)).toBeLessThanOrEqual(slotsOf(a.ind, s));
    const full = { ...a, ind: { ...a.ind, st: a.ind.st.map((e, s) => (e && a.stateOwner[s] === GER ? { ...e, civ: slotsOf(a.ind, s) - e.mil } : e)) } };
    expect(industryOf(applyFx(full, GER, [{ t: 'factory', k: 'mil', n: 1 }]), 'GER').mil).toBe(industryOf(full, 'GER').mil);
  });
  it('postup výzkumu: boost se omezí a boostslot zrychlí zkoumané', () => {
    let a = startResearch(s0, GER, 0, 'pusky2');
    a = applyFx(a, GER, [{ t: 'boostslot', v: 0.4 }]);
    expect(a.tech.own[GER].prog.pusky2).toBeCloseTo(0.4, 9);
    a = applyFx(a, GER, [{ t: 'boost', id: 'pusky2', v: 5 }]);
    expect(a.tech.own[GER].prog.pusky2).toBe(0.99);
    expect(researchOf(a, 'GER').slots[0].eta).toBeLessThanOrEqual(2);
    expect(applyFx(s0, GER, [{ t: 'boostslot', v: 0.4 }])).toBe(s0);   // nic se nezkoumá
    expect(applyFx(s0, GER, [{ t: 'boost', id: 'mtank', v: 0.4 }])).toBe(s0);   // nedostupná
  });
});

describe('události', () => {
  const s0 = createGame({ player: 'GER' });
  it('událost hráče se zařadí, hra se pozastaví, volba provede účinky a odebere ji', () => {
    let a = { ...s0, paused: false };
    a = applyFx(a, GER, [{ t: 'event', id: 'ger_rhine', days: 1 }]);
    a = day(a, 2);
    const p = pendingEvents(a, 'GER');
    expect(p).toHaveLength(1);
    expect(p[0].id).toBe('ger_rhine');
    expect(p[0].ev.opts.length).toBe(2);
    expect(a.paused).toBe(true);
    expect(a.nat.own[GER].seen.ger_rhine).toBeGreaterThan(0);
    expect(chooseEvent(a, GER, 'ger_rhine', 5)).toBe(a);
    expect(chooseEvent(a, GER, 'ger_rhine', -1)).toBe(a);
    expect(chooseEvent(a, GER, 'nic', 0)).toBe(a);
    expect(chooseEvent(a, FRA, 'ger_rhine', 0)).toBe(a);
    const ws0 = a.pol.own[GER].ws;
    const b = chooseEvent(a, GER, 'ger_rhine', 0);
    expect(b.nat.pend).toHaveLength(0);
    expect(b.pol.own[GER].ws).toBeCloseTo(ws0 + 0.08, 9);
    expect(b.nat.own[GER].flags.rhine).toBe(1);
  });
  it('podmínka dne a příznaků: událost před dnem `from` ani po vyřízení se neopakuje', () => {
    const a = day(s0, 30);
    expect(pendingEvents(a, 'GER').filter((p) => p.id === 'ger_rhine')).toHaveLength(0);
    const b = day({ ...give(s0, GER, []), nat: { ...s0.nat, own: s0.nat.own.map((e, o) => (o === GER ? { ...e, flags: { rhine: 1 } } : e)) } }, 150);
    expect(pendingEvents(b, 'GER').filter((p) => p.id === 'ger_rhine')).toHaveLength(0);
  });
  it('země bez hráče řeší události sama podle váhy voleb', () => {
    const a = day(createGame({ player: 'FRA' }), 140);
    expect(a.nat.own[GER].flags.rhine).toBe(1);        // AI Německo událost vyřešilo
    expect(a.nat.pend.every((p) => p.o === FRA)).toBe(true);
    expect(a.nat.own[GER].seen.ger_rhine).toBeGreaterThan(0);
  });
  it('fronta čekajících událostí je omezená', () => {
    let a = s0;
    for (const id of ['harvest', 'breakthrough', 'boom', 'accident', 'volunteers', 'war_fever']) a = applyFx(a, GER, [{ t: 'event', id, days: 1 }]);
    a = day(a, 2);
    expect(a.nat.pend.length).toBeLessThanOrEqual(NAT.PEND_MAX);
  });
});

describe('AI země', () => {
  it('země bez hráče si sama vybírá a plní cíle podle priority; hráč nic nedostane', () => {
    const s = createGame({ player: 'GER' });
    const a = day(s, 1);
    expect(a.nat.own[FRA].cur.id).toBe('fra_front');
    expect(a.nat.own[SWE].cur.id).toBe('def_ind');
    expect(a.nat.own[GER].cur).toBeNull();
    const b = day(a, 120);
    expect(Object.keys(b.nat.own[FRA].done).length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(b.nat.own[GER].done)).toHaveLength(0);
    void SOV; void CZE; void POL;
  });
});

describe('čistota a determinismus', () => {
  it('180 dní: původní stav se nemění, dělení kroků nevadí, JSON čistý, hodinové kroky `nat` nemění', () => {
    let s = createGame({ player: 'GER' });
    s = startFocus(s, GER, 'ger_plan');
    const snap = JSON.stringify(s);
    const a = day(s, 180);
    expect(JSON.stringify(s)).toBe(snap);
    let b = s;
    for (let i = 0; i < 180; i++) b = day(b, 1);
    expect(JSON.stringify(b.nat)).toBe(JSON.stringify(a.nat));
    expect(JSON.stringify(b.pol)).toBe(JSON.stringify(a.pol));
    expect(JSON.parse(JSON.stringify(a.nat))).toEqual(a.nat);
    const c = day(s, 1);
    expect(advanceHour(c).nat).toBe(c.nat);
  });
});

describe('historické události (M44)', () => {
  it('data jsou platná: id, země, účinky a závislosti na příznacích', () => {
    const hist = EVENTS.filter((e) => /^(ger|eng|fra|ita|sov|pol|cze|spr|swe|tur)_/.test(e.id) || ['refugees', 'arms_fair', 'cold_winter', 'war_heroes', 'war_bond'].includes(e.id));
    expect(hist.length).toBeGreaterThanOrEqual(20);
    const flags = new Set(EVENTS.flatMap((e) => e.opts.flatMap((o) => o.fx.filter((x) => x.t === 'flag').map((x) => x.id))));
    for (const e of EVENTS) { if (e.cond.flag) expect(flags.has(e.cond.flag)).toBe(true); for (const o of e.opts) expect(o.n.length).toBeGreaterThan(3); }
  });
  it('dlouhá hra s historickými událostmi doběhne a hráč dostane příběhové události', () => {
    let s = createGame({ player: 'GER', aiLevel: 2 });
    const seen = new Set();
    for (let k = 0; k < 24; k++) {
      s = advance(s, 24 * 30);
      for (const p of s.nat.pend) { if (p.o === W.ownerIdx.GER) { seen.add(p.id); s = chooseEvent(s, W.ownerIdx.GER, p.id, 0); } }
    }
    expect([...seen].some((id) => id.startsWith('ger_'))).toBe(true);
  });
});
