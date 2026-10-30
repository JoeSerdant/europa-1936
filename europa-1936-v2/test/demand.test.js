// Ultimáta a oportunistické války (M68): reakce cíle podle sil, převod území, odmítnutí = ospravedlnění, volba hráče přes událost, AI v oknech, jackal.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, validateState, declareWar, GAME_VERSION, packGame, unpackGame, chooseEvent,
  demandSpec, demandForce, acceptsDemand, demandBlock, demand, resolveDemand, HIST_DEMANDS, DEMAND_BY_ID, HIST_JACKALS, DIP, AI, diplomacyOf, justReady,
  startWar, hasCapitulated, createFaction, inviteToFaction,
} from '../src/engine/index.js';
import { EVENT_BY_ID } from '../src/data/nat/events.js';
import { fxText } from '../src/data/nat/describe.js';
import { aiDiplomacy } from '../src/engine/ai/diplomacy.js';
import { vpHeld } from '../src/engine/dip/core.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), AUS = idx('AUS'), CZE = idx('CZE'), LIT = idx('LIT'), SOV = idx('SOV'), POL = idx('POL'), ROM = idx('ROM'), FRA = idx('FRA'), ENG = idx('ENG'), ALB = idx('ALB'), ITA = idx('ITA');
const base = (o = {}) => createGame({ player: null, aiLevel: 2, ...o });
const withPp = (s, o, pp) => { const own = s.pol.own.slice(); own[o] = { ...own[o], pp }; return { ...s, pol: { ...s.pol, own } }; };
const withDip = (s, patch) => ({ ...s, dip: { ...s.dip, ...patch, ver: s.dip.ver + 1 } });
const owned = (s, o) => { let n = 0; for (let i = 1; i < s.stateOwner.length; i++) if (s.stateOwner[i] === o) n++; return n; };
const strong = (s, o) => {   // zesílí zemi `o` na mnoho divizí (kopie existujících), aby měla přesilu
  const divs = s.mil.divs.slice();
  const mine = divs.map((d, i) => (d && d.o === o ? i : 0)).filter(Boolean);
  for (let k = 0; k < 160; k++) divs.push({ ...divs[mine[k % mine.length]], army: 0 });
  return { ...s, mil: { ...s.mil, divs, ver: s.mil.ver + 1 } };
};

describe('data ultimát', () => {
  it('státy a země existují, id jsou unikátní, události pro hráče mají dvě volby s účinkem ult', () => {
    expect(new Set(HIST_DEMANDS.map((d) => d.id)).size).toBe(HIST_DEMANDS.length);
    const s = base();
    for (const d of HIST_DEMANDS) {
      expect(idx(d.tag), d.id).toBeTruthy(); expect(idx(d.target), d.id).toBeTruthy();
      expect(['annex', 'cede']).toContain(d.kind);
      if (d.kind === 'cede') expect(demandSpec(s, d, idx(d.target)).states.length, d.id).toBe(d.states.length);
      if (d.after) expect(DEMAND_BY_ID[d.after], d.id).toBeTruthy();
      const ev = EVENT_BY_ID[`ult_${d.id}`];
      expect(ev, d.id).toBeTruthy();
      expect(ev.opts.length).toBe(2);
      expect(ev.opts.map((o) => o.fx[0].ok)).toEqual([1, 0]);
      expect(fxText(ev.opts[0].fx[0])).toMatch(/přijím/);
    }
    for (const j of HIST_JACKALS) { expect(idx(j.tag)).toBeTruthy(); expect(idx(j.target)).toBeTruthy(); }
  });
  it('stav nese dip.ult, verze 28 a uložení ho zachová', () => {
    const s = base();
    expect(s.dip.ult).toEqual([]);
    expect(GAME_VERSION).toBeGreaterThanOrEqual(28);
    const back = unpackGame(JSON.parse(JSON.stringify(packGame(s))));
    expect(back.error).toBeUndefined();
    expect(validateState(withDip(s, { ult: 3 }))).toMatch(/diplomac/i);
  });
});

describe('reakce cíle', () => {
  it('přijme při přesile požadavku, odmítne bez ní; nestabilní vláda povolí snáze', () => {
    const s = strong(base(), GER);
    const f = demandForce(s, GER, AUS);
    expect(f.mine).toBeGreaterThan(f.theirs);
    expect(acceptsDemand(s, GER, AUS, 2).ok).toBe(true);
    expect(acceptsDemand(s, GER, AUS, 999).ok).toBe(false);
    const weak = acceptsDemand(s, GER, AUS, f.mine / f.theirs / 0.8);
    expect(weak.ok).toBe(false);
    const own = s.pol.own.slice(); own[AUS] = { ...own[AUS], stab: 0.1 };
    expect(acceptsDemand({ ...s, pol: { ...s.pol, own } }, GER, AUS, f.mine / f.theirs / 0.8).ok).toBe(true);
  });
  it('zaručitel obránce se počítá do jeho sil', () => {
    let s = strong(base(), GER);
    const without = demandForce(s, GER, AUS);
    s = withDip(s, { gar: [{ g: FRA, t: AUS }] });
    const withGar = demandForce(s, GER, AUS);
    expect(withGar.theirs).toBeGreaterThan(without.theirs);
    expect(withGar.guard).toContain(FRA);
  });
});

describe('vznesení požadavku', () => {
  it('annex: země zanikne, GER získá všechny státy, ztráty se zapíšou a stav zůstane platný', () => {
    let s = withPp(strong(base(), GER), GER, 100);
    const before = owned(s, GER), aus = owned(s, AUS);
    expect(aus).toBeGreaterThan(0);
    const spec = demandSpec(s, DEMAND_BY_ID.anschluss, AUS);
    expect(demandBlock(s, GER, AUS, spec)).toBeNull();
    const t = demand(s, GER, AUS, spec);
    expect(owned(t, AUS)).toBe(0);
    expect(owned(t, GER)).toBe(before + aus);
    expect(hasCapitulated(t, AUS)).toBe(true);
    expect(t.dip.ult.find((u) => u.id === 'anschluss').ok).toBe(1);
    expect(t.pol.own[GER].pp).toBe(100 - DIP.ULT_PP);
    expect(t.log.items.some((e) => e.k === 'ult' && e.y === 1)).toBe(true);
    expect(validateState(advance(t, 24 * 3))).toBeNull();
    expect(demandBlock(t, GER, AUS, spec)).toBeTruthy();   // druhé ultimátum ne
  });
  it('cede: státy přejdou na žadatele, cíl přežije; jednotky cíle v odevzdaných provinciích odejdou', () => {
    let s = withPp(strong(base(), GER), GER, 100);
    const spec = demandSpec(s, DEMAND_BY_ID.sudety, CZE);
    expect(spec.states.length).toBe(3);
    const czeBefore = owned(s, CZE);
    const t = demand(s, GER, CZE, spec);
    expect(t.dip.ult.find((u) => u.id === 'sudety').ok).toBe(1);
    for (const st of spec.states) expect(t.stateOwner[st]).toBe(GER);
    expect(owned(t, CZE)).toBe(czeBefore - 3);
    expect(hasCapitulated(t, CZE)).toBe(false);
    for (const st of spec.states) for (const p of W.states[st].v) expect(t.ctrl[p]).toBe(GER);
    for (const d of t.mil.divs) if (d && d.o === CZE) expect(t.ctrl[d.p] === CZE || t.ctrl[d.p] === GER).toBe(true);
    expect(validateState(advance(t, 24 * 3))).toBeNull();
  });
  it('odmítnutí: žádné území, hotové ospravedlnění války pro žadatele, vztah klesne', () => {
    let s = withPp(base(), GER, 100);
    const spec = demandSpec(s, DEMAND_BY_ID.sudety, CZE);
    const t = demand(s, GER, CZE, spec);
    expect(t.dip.ult.find((u) => u.id === 'sudety').ok).toBe(0);
    for (const st of spec.states) expect(t.stateOwner[st]).toBe(CZE);
    expect(justReady(t, GER, CZE)).toBe(true);
    expect(t.pol.own[CZE].ws).toBeGreaterThan(s.pol.own[CZE].ws);
    const war = startWar(t, GER, CZE);
    expect(war).not.toBe(t);
    expect(war.mil.wars.some(([a, b]) => (a === GER && b === CZE) || (a === CZE && b === GER))).toBe(true);
  });
  it('blokace: válka, stejný blok, loutka, nedostatek moci, cooldown dvojice', () => {
    const s = withPp(strong(base(), GER), GER, 100);
    const spec = demandSpec(s, DEMAND_BY_ID.sudety, CZE);
    expect(demandBlock(declareWar(s, 'GER', 'CZE'), GER, CZE, spec)).toMatch(/válce/);
    expect(demandBlock(withPp(s, GER, 0), GER, CZE, spec)).toMatch(/politická moc/);
    const sub = s.dip.sub.slice(); sub[CZE] = FRA;
    expect(demandBlock(withDip(s, { sub }), GER, CZE, spec)).toMatch(/Loutkový/);
    const t = demand(s, GER, CZE, spec);
    const other = demandSpec(t, DEMAND_BY_ID.cze_rump, CZE);
    expect(demandBlock(t, GER, CZE, other)).toMatch(/nedávno/);
    expect(demand(s, GER, GER, spec)).toBe(s);
  });
});

describe('hráč jako cíl', () => {
  it('požadavek se uloží jako čekající, hráč dostane událost a svou volbou ho přijme nebo odmítne', () => {
    let s = withPp(strong(createGame({ player: 'CZE', aiLevel: 2 }), GER), GER, 100);
    const spec = demandSpec(s, DEMAND_BY_ID.sudety, CZE);
    let t = demand(s, GER, CZE, spec);
    const u = t.dip.ult.find((x) => x.id === 'sudety');
    expect(u.ok).toBe(2);
    for (const st of spec.states) expect(t.stateOwner[st]).toBe(CZE);
    t = advance(t, 24 * 2);
    expect(t.nat.pend.some((p) => p.o === CZE && p.id === 'ult_sudety')).toBe(true);
    const accepted = chooseEvent(t, CZE, 'ult_sudety', 0);
    for (const st of spec.states) expect(accepted.stateOwner[st]).toBe(GER);
    expect(accepted.dip.ult.find((x) => x.id === 'sudety').ok).toBe(1);
    const refused = chooseEvent(t, CZE, 'ult_sudety', 1);
    for (const st of spec.states) expect(refused.stateOwner[st]).toBe(CZE);
    expect(refused.dip.ult.find((x) => x.id === 'sudety').ok).toBe(0);
    expect(justReady(refused, GER, CZE)).toBe(true);
    expect(resolveDemand(refused, CZE, 'sudety', true)).toBe(refused);   // už vyřízeno
  });
  it('v Diplomacii hráče se nabídne jen požadavek jeho země po začátku okna', () => {
    let s = createGame({ player: 'GER', aiLevel: 2 });
    const row = (st) => diplomacyOf(st, GER).list.find((c) => c.o === AUS);
    expect(row(s).demands.length).toBe(0);
    s = { ...s, tick: 24 * 800 };
    expect(row(s).demands.map((d) => d.id)).toEqual(['anschluss']);
    expect(row(s).demands[0].need).toBe(2);
    expect(diplomacyOf(s, GER).list.find((c) => c.o === FRA).demands).toEqual([]);
  });
});

describe('AI', () => {
  it('AI vznese ultimátum v okně a s přesilou, mimo okno ne', () => {
    let s = strong(createGame({ player: null, aiLevel: 2 }), GER);
    s = withPp(s, GER, 200);
    const early = aiDiplomacy({ ...s, tick: 24 * 600 }, GER);
    expect(early.dip.ult.length).toBe(0);
    const t = aiDiplomacy({ ...s, tick: 24 * 800 }, GER);
    expect(t.dip.ult.some((u) => u.id === 'anschluss')).toBe(true);
    expect(owned(t, AUS)).toBe(0);
  });
  it('bez přesily AI ultimátum nevznese; následné ultimátum čeká na přijetí předchozího', () => {
    let s = withPp(createGame({ player: null, aiLevel: 2 }), GER, 200);
    const weakGer = { ...s, tick: 24 * 800 };
    const own = s.pol.own.slice();
    expect(aiDiplomacy({ ...weakGer, mil: { ...weakGer.mil, divs: weakGer.mil.divs.map((d) => (d && d.o === GER ? null : d)) } }, GER).dip.ult.length).toBe(0);
    void own;
    const rump = aiDiplomacy({ ...strong(s, GER), tick: 24 * 1200 }, GER);
    expect(rump.dip.ult.some((u) => u.id === 'cze_rump')).toBe(false);   // sudety ještě nebyly přijaty
  });
  it('s ultimáty AI dlouhá hra doběhne se zachovanými invarianty', () => {
    let s = createGame({ player: null, aiLevel: 2 });
    for (let k = 0; k < 12; k++) { s = advance(s, 24 * 90); expect(validateState(s)).toBeNull(); }
    expect(s.dip.ult.length).toBeGreaterThan(0);
  }, 120000);
});

describe('oportunistické války', () => {
  it('SSSR napadne Polsko, když ho z velké části dobývá Německo a má společnou hranici', () => {
    let s = createGame({ player: null, aiLevel: 2 });
    s = strong(s, SOV);
    s = declareWar(s, 'GER', 'POL');
    // Německo drží přes třetinu Polska
    const ctrl = s.ctrl.slice(); let n = 0;
    for (let p = 1; p <= W.L && n < 4000; p++) if (s.stateOwner[W.provState[p]] === POL && W.vp[p] >= 0) { ctrl[p] = GER; n += W.vp[p] + 1; }
    s = { ...s, ctrl, tick: 24 * 1300 };
    expect(vpHeld(s, POL).share).toBeGreaterThanOrEqual(AI.JACKAL_SHARE);
    const t = aiDiplomacy(s, SOV);
    expect(t.mil.wars.some(([a, b]) => (a === SOV && b === POL) || (a === POL && b === SOV))).toBe(true);
    // mimo okno a bez kolapsu cíle se neděje nic
    expect(aiDiplomacy({ ...s, tick: 24 * 100 }, SOV).mil.wars.length).toBe(s.mil.wars.length);
    expect(aiDiplomacy({ ...createGame({ player: null, aiLevel: 2 }), tick: 24 * 1300 }, SOV).mil.wars.length).toBe(0);
  });
  it('oportunistická válka nepotřebuje ospravedlnění a zaručitelé cíle se nepřidají', () => {
    let s = createGame({ player: null, aiLevel: 2 });
    s = withDip(s, { gar: [{ g: ENG, t: POL }, { g: FRA, t: POL }] });
    const t = startWar(s, SOV, POL, true);
    expect(t.mil.wars.some(([a, b]) => (a === SOV && b === POL) || (a === POL && b === SOV))).toBe(true);
    expect(t.mil.wars.some(([a, b]) => (a === SOV && (b === ENG || b === FRA)) || (b === SOV && (a === ENG || a === FRA)))).toBe(false);
    expect(startWar(s, SOV, POL)).toBe(s);   // bez příznaku je ospravedlnění potřeba
  });
});
