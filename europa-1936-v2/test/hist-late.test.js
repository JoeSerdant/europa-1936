// Válka 1942–1945 po historických kolejích (M93): okenní obrana a ofenzivy, tempo postupu, operace vylodění s oblastí, příměří Itálie,
// hlad nezničí divizi, výroba podle dostupných surovin a strop linek, lodě v zámořské pomoci.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, declareWar, validateState, AI, OVERSEAS_AID } from '../src/engine/index.js';
import { HIST_STRATEGIES, CAP_LIMITS } from '../src/data/ai/strategies.js';
import { SPIRITS } from '../src/data/nat/spirits.js';
import { MOD_KEYS } from '../src/engine/army/leaders.js';
import { NO_POL } from '../src/engine/politics/core.js';
import { armisticeDue, armisticeRow, holdoutOf, dipDay } from '../src/engine/dip/day.js';
import { defendOnlyOf, pushOf, noEnterOf, invadeOpOf, invadeTargetOf, gatherOf } from '../src/engine/ai/hist.js';
import { landingSites } from '../src/engine/ai/invasion.js';
import { landZones } from '../src/engine/army/zones.js';
import { demandSplit } from '../src/engine/ai/industry.js';
import { industryOf } from '../src/engine/industry/selectors.js';
import { I } from '../src/engine/industry/constants.js';
import { deliverAid } from '../src/engine/dip/overseas.js';
import { openCtx, closeCtx } from '../src/engine/army/ctx.js';
import { upkeepStep } from '../src/engine/army/upkeep.js';
import { statsOf } from '../src/engine/army/unit.js';
import { C } from '../src/engine/army/constants.js';
import { pairKey } from '../src/engine/dip/core.js';
import { atWar } from '../src/engine/army/war.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const [GER, SOV, ENG, ITA] = ['GER', 'SOV', 'ENG', 'ITA'].map(idx);
const base = (extra = {}) => createGame({ player: null, aiLevel: 2, ...extra });
const at = (s, day) => ({ ...s, tick: Math.round(day * 24) });
const war = (s, a, b) => { const t = declareWar(s, W.owners[a].tag, W.owners[b].tag); return { ...t, dip: { ...t.dip, since: { ...t.dip.since, [pairKey(a, b)]: s.tick } } }; };
const noHist = (s) => ({ ...s, ai: { ...s.ai, hist: 0 } });

describe('data', () => {
  it('nové řádky strategií odkazují na existující země; duchové mají klíče z MOD_KEYS a NO_POL', () => {
    for (const s of HIST_STRATEGIES) {
      for (const k of ['war', 'needWar', 'invade', 'at', 'armistice', 'noEnter', 'spareCap']) if (s[k]) expect(idx(s[k]), `${s.id}.${k}`).toBeGreaterThan(0);
      if (s.push) { expect(s.push).toBeGreaterThan(0); expect(s.push).toBeLessThanOrEqual(1); expect(s.war).toBeTruthy(); }
      if (s.from !== undefined) expect(s.until).toBeGreaterThan(s.from);
      if (s.armistice) { expect(s.held > 0 || s.force > 0 || s.days > 0, s.id).toBe(true); if (s.force) expect(s.force).toBeLessThan(s.until); if (s.days) expect(s.days).toBeGreaterThan(0); }
    }
    for (const id of ['general_zima', 'sibirske_zalohy', 'letni_ofenziva', 'velky_obrat', 'vycerpana_rise', 'ruda_armada_v_utoku', 'spojenecka_prevaha', 'rozklad_rezimu', 'bagration', 'rozpad_front', 'zbrojni_ministerstvo', 'evakuace_prumyslu']) {
      expect(SPIRITS[id], id).toBeTruthy();
      for (const k in SPIRITS[id].army || {}) expect(MOD_KEYS).toContain(k);
      for (const k in SPIRITS[id].mod || {}) expect(k in NO_POL).toBe(true);
    }
    expect(CAP_LIMITS.GER.share).toBeGreaterThan(CAP_LIMITS.ITA.share);
  });
});

describe('okna obrany, ofenzivy a tempa postupu', () => {
  it('SSSR v létě 1942 jen brání, při Bagrationu útočí s menší převahou a do Německa vstoupí až na podzim 1944', () => {
    const s = war(at(base(), 2300), GER, SOV);
    expect(defendOnlyOf(s, SOV).has(GER)).toBe(true);
    expect(pushOf(s, SOV).size).toBe(0);
    const bag = at(s, 3100);
    expect(defendOnlyOf(bag, SOV).has(GER)).toBe(false);
    expect(pushOf(bag, SOV).get(GER)).toBeLessThan(1);
    expect(noEnterOf(bag, SOV).has(GER)).toBe(true);
    expect(noEnterOf(at(s, 3300), SOV).has(GER)).toBe(false);
    expect(defendOnlyOf(at(s, 3220), SOV).has(GER)).toBe(true);   // zastavení na Visle
    expect(defendOnlyOf(at(base(), 2300), SOV).size).toBe(0);    // bez války nic
    expect(pushOf(noHist(bag), SOV).size).toBe(0);
    expect(noEnterOf(noHist(bag), SOV).size).toBe(0);
  });
  it('M99: v oknech ofenzivy i operační pauzy se zálohy soustřeďují k frontě s Německem; v míru a bez historie ne', () => {
    const s = war(at(base(), 3100), GER, SOV);
    expect(gatherOf(s, SOV).has(GER)).toBe(true);           // Bagration
    expect(gatherOf(at(s, 3220), SOV).has(GER)).toBe(true); // pauza na Visle
    expect(gatherOf(at(base(), 3100), SOV).size).toBe(0);   // bez války nic
    expect(gatherOf(noHist(s), SOV).size).toBe(0);
    expect(gatherOf(war(at(base(), 3100), GER, SOV), GER).size).toBe(0);   // trvalá obrana Německa po Kursku zálohy nesoustřeďuje
    expect(AI.PUSH_FILL).toBeGreaterThan(1);
  });
  it('Německo po Kursku na východě jen brání', () => {
    const s = war(at(base(), 2900), GER, SOV);
    expect(defendOnlyOf(s, GER).has(SOV)).toBe(true);
    expect(defendOnlyOf(at(s, 2500), GER).has(SOV)).toBe(false);
  });
});

describe('operace vylodění', () => {
  it('Normandie: Británie se v okně vylodí proti Německu jen na původním území Francie', () => {
    const s = war(at(base(), 3100), ENG, GER);
    expect(invadeOpOf(s, ENG)).toEqual({ t: GER, at: idx('FRA') });
    expect(invadeTargetOf(s, ENG)).toBe(GER);
    expect(invadeOpOf(at(s, 2000), ENG)).toBeNull();
    expect(invadeOpOf(noHist(s), ENG)).toBeNull();
    const zones = landZones(s, ENG), home = zones[W.owners[ENG].cap];
    const ports = [];
    for (let p = 1; p <= W.L; p++) if (s.ctrl[p] === ENG && W.portLevel[p] > 0 && zones[p] === home) ports.push(p);
    const ger = (st) => landingSites(st, ENG, ports, AI.INV_MAX).filter((x) => st.ctrl[x.p] === GER);
    expect(ger(s).every((x) => W.provOwner0[x.p] === idx('FRA'))).toBe(true);   // v roce 1936 Francii Němci nedrží – žádné místo v Německu
    expect(ger(s)).toHaveLength(0);
    // Němci drží francouzský přístav (bez divizí) – stane se místem operace
    const fp = (() => { for (let p = 1; p <= W.L; p++) if (W.provOwner0[p] === idx('FRA') && W.portLevel[p] > 0 && !s.mil.divs.some((d) => d && d.p === p)) return p; return 0; })();
    const ctrl = s.ctrl.slice(); ctrl[fp] = GER;
    const occ = { ...s, ctrl, ownerVer: s.ownerVer + 1 };
    const sites = ger(occ);
    expect(sites.map((x) => x.p)).toContain(fp);
    expect(sites.find((x) => x.p === fp).op).toBe(true);
  });
});

describe('příměří Itálie', () => {
  const held = (s, n) => {
    const ctrl = s.ctrl.slice();
    let k = 0;
    for (let p = 1; p <= W.L && k < n; p++) if (W.provOwner0[p] === ITA && p !== W.owners[ITA].cap && W.portLevel[p] > 0) { ctrl[p] = ENG; k++; }
    return { ...s, ctrl, ownerVer: s.ownerVer + 1 };
  };
  it('kapituluje v okně, když Spojenci drží tři provincie, nebo od pojistného dne; ne hráčova Itálie', () => {
    const s = war(at(base(), 2800), ENG, ITA);
    expect(armisticeDue(s, ITA)).toBe(false);
    expect(armisticeDue(held(s, 2), ITA)).toBe(false);
    expect(armisticeDue(held(s, 3), ITA)).toBe(true);
    expect(armisticeDue(at(s, 2880), ITA)).toBe(true);
    expect(armisticeDue(at(held(s, 3), 2700), ITA)).toBe(false);
    expect(armisticeDue(noHist(held(s, 3)), ITA)).toBe(false);
    expect(armisticeDue({ ...held(s, 3), player: 'ITA' }, ITA)).toBe(false);
  });
  it('po příměří Itálie nejde do exilu ani se nestane loutkou – zbytek země zůstane její', () => {
    const s = dipDay(held(war(at(base(), 2800), ENG, ITA), 3));
    expect(s.dip.cap[ITA]).toBe(1);
    const capState = W.provState[W.owners[ITA].cap];
    expect(s.stateOwner[capState]).toBe(ITA);
    expect((s.dip.exile || [])[ITA] || 0).toBe(0);
    expect(validateState(s)).toBeNull();
  });
});

describe('zimní válka a moskevský mír (F3)', () => {
  const FIN = idx('FIN');
  /** SSSR drží `n` finských provincií, nejdřív celé státy Viipuri a Sortavala (nejblíž hranici). */
  const held = (s, n) => {
    const ctrl = s.ctrl.slice(), list = [];
    for (let p = 1; p <= W.L; p++) if (W.provOwner0[p] === FIN && p !== W.owners[FIN].cap) list.push(p);
    const first = (p) => (['Viipuri', 'Sortavala'].includes(W.states[W.provState[p]].n) ? 0 : 1);
    list.sort((a, b) => first(a) - first(b) || a - b);
    for (const p of list.slice(0, n)) ctrl[p] = SOV;
    return { ...s, ctrl, ownerVer: s.ownerVer + 1 };
  };
  it('Finsko uzavře mír, odstoupí obsazené státy a žije dál (bez kapitulace a bez loutky)', () => {
    const s0 = war(at(base(), 1460), SOV, FIN);
    expect(armisticeRow(held(s0, 11), FIN)).toBeNull();
    expect(armisticeRow(held(s0, 12), FIN)).toMatchObject({ id: 'fin_peace', peace: true });
    expect(armisticeRow(at(s0, 1533), FIN)).toMatchObject({ id: 'fin_peace' });   // moskevský mír nejpozději 13. 3. 1940
    const s = dipDay(held(s0, 12));
    expect(s.dip.cap[FIN]).toBe(0);
    expect(s.dip.sub[FIN]).toBe(0);
    expect(atWar(s.mil, FIN, SOV)).toBe(false);
    const viipuri = W.states.findIndex((x) => x && x.n === 'Viipuri');
    expect(s.stateOwner[viipuri]).toBe(SOV);
    expect(s.stateOwner[W.provState[W.owners[FIN].cap]]).toBe(FIN);
    expect(s.log.items.some((e) => e.k === 'cede' && e.o === FIN && e.x === SOV)).toBe(true);
    expect(validateState(s)).toBeNull();
  });
  it('při územním míru zůstane Finsku hlavní město a neobsazený zbytek země se vyklidí', () => {
    const capS = W.provState[W.owners[FIN].cap];
    let s0 = held(war(at(base(), 1460), SOV, FIN), 12);
    const ctrl = s0.ctrl.slice();
    for (const p of W.states[capS].v) ctrl[p] = SOV;   // Sověti drží i Helsinky
    s0 = { ...s0, ctrl };
    const s = dipDay(s0);
    expect(s.dip.cap[FIN]).toBe(0);
    expect(s.stateOwner[capS]).toBe(FIN);
    for (let p = 1; p <= W.L; p++) if (s.stateOwner[W.provState[p]] === FIN) expect(s.ctrl[p]).toBe(FIN);
  });
});

describe('pád Berlína (F3)', () => {
  it('Sověti a Spojenci útočí na Berlín až od konce dubna 1945; bez historické AI kdykoli', async () => {
    const { spareCapOf } = await import('../src/engine/ai/hist.js');
    const berlin = W.owners[GER].cap;
    expect(spareCapOf(at(base(), 3300), SOV).has(berlin)).toBe(true);
    expect(spareCapOf(at(base(), 3300), ENG).has(berlin)).toBe(true);
    expect(spareCapOf(at(base(), 3406), SOV).size).toBe(0);
    expect(spareCapOf(noHist(at(base(), 3300)), SOV).size).toBe(0);
  });
});

describe('konec války v Evropě (M98)', () => {
  it('Německo do jara 1945 vytrvá, pak bezpodmínečně kapituluje s konferencí (nejpozději v létě)', () => {
    const s = war(at(base(), 3000), GER, SOV);
    expect(holdoutOf(s, GER)).toBe(true);
    expect(holdoutOf(at(s, 3450), GER)).toBe(false);
    expect(holdoutOf(noHist(s), GER)).toBe(false);
    expect(armisticeRow(at(s, 3420), GER)).toBeNull();   // Sověti zatím nedrží 20 německých provincií
    const r = armisticeRow(at(s, 3480), GER);
    expect(r && r.conf).toBeTruthy();
    const t = dipDay(at(s, 3480));
    expect(t.dip.cap[GER] === 1 || t.dip.sub[GER] === SOV).toBe(true);   // bez okupace: SSSR jako hlavní vítěz rozhodne o Německu (AI: loutka)
    expect((t.dip.exile || [])[GER] || 0).toBe(0);
    expect(t.dip.conf).toHaveLength(0);
  });
});

describe('hlad a výroba', () => {
  it('bez zásob divize slábne, ale pod SUP_ATTR_FLOOR síly ji hlad nesníží', () => {
    const s = base();
    const id = s.mil.divs.findIndex((d) => d && d.o === GER && !d.b);
    const d0 = s.mil.divs[id], st = statsOf(s.mil, d0);
    const divs = s.mil.divs.slice();
    divs[id] = { ...d0, sup: 0, sg: 0, hp: st.hp * (C.SUP_ATTR_FLOOR + 0.001) };
    let t = { ...s, mil: { ...s.mil, divs } };
    for (let h = 0; h < 200; h++) { const ctx = openCtx(t); upkeepStep(ctx); t = closeCtx(ctx); }
    expect(t.mil.divs[id]).toBeTruthy();
    expect(t.mil.divs[id].hp).toBeGreaterThanOrEqual(st.hp * C.SUP_ATTR_FLOOR - 1e-9);
  });
  it('výzbroj bez potřebné suroviny dostane ve výrobě menší podíl; strop linek je 30', () => {
    const s = base();
    const res = industryOf(s, GER).res;
    const dry = Object.fromEntries(Object.entries(res).map(([r, x]) => [r, { ...x, f: r === 'chrom' ? 0 : 1 }]));
    const full = Object.fromEntries(Object.entries(res).map(([r, x]) => [r, { ...x, f: 1 }]));
    expect(demandSplit(s, GER, true, dry).ltanky).toBeLessThan(demandSplit(s, GER, true, full).ltanky);
    expect(demandSplit(s, GER, true, dry).pusky).toBeGreaterThan(demandSplit(s, GER, true, full).pusky);
    expect(I.LINES_MAX).toBe(30);
  });
  it('zámořská pomoc umí dodat i lodě (transportní lodě pro vylodění)', () => {
    const a = OVERSEAS_AID.find((x) => x.id === 'lend_eng_tr');
    const s = base();
    const t = deliverAid(s, a);
    expect(t.nav.pool[ENG].tr).toBe((s.nav.pool[ENG].tr || 0) + a.give.tr);
    expect(t.nav.ver).toBe(s.nav.ver + 1);
  });
});
