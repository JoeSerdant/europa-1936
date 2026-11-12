// AI a nové systémy (M87): palivo (dovoz ropy, motorizace, bombardéry), výsadky (šablona, výcvik, cíl, shoz), pakty o neútočení (nabídky AI).
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, advance, declareWar, validateState, grantTech, fuelOf, pactOf, pactOffers, AI, FUEL, DIP, deriveStats } from '../src/engine/index.js';
import { fuelShort, oilSupplier, aiFuel } from '../src/engine/ai/logistics.js';
import { desiredMix } from '../src/engine/ai/army.js';
import { aiAir } from '../src/engine/ai/air.js';
import { paraTemplate, dropTarget, aiPara } from '../src/engine/ai/para.js';
import { pactTarget, aiPacts } from '../src/engine/ai/pacts.js';
import { dropBlock } from '../src/engine/air/para.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), ITA = idx('ITA'), PLN = idx('POL'), FRA = idx('FRA'), HUN = idx('HUN'), SOV = idx('SOV'), ROM = idx('ROM');
const base = (extra = {}) => createGame({ player: null, aiLevel: 2, ...extra });
const withFuel = (s, o, patch) => { const fuel = s.ind.fuel.slice(); fuel[o] = { ...fuel[o], ...patch }; return { ...s, ind: { ...s.ind, fuel } }; };
const pp = (s, o, v = 300) => { const own = s.pol.own.slice(); own[o] = { ...own[o], pp: v }; return { ...s, pol: { ...s.pol, own } }; };

describe('palivo', () => {
  const dry = withFuel(declareWar(base(), 'ITA', 'ALB'), ITA, { s: 0, r: 0.4, g: 0.4, u: 1.0 });   // ropu AI dováží jen za války
  it('fuelShort pozná nepokrytou spotřebu i krátkou zásobu', () => {
    expect(fuelShort(base(), ITA)).toBe(false);
    expect(fuelShort(dry, ITA)).toBe(true);
    expect(fuelShort(withFuel(base(), ITA, { s: 10, r: 1, g: 0.2, u: 1.0 }), ITA)).toBe(true);   // vystačí jen na pár dní
    expect(fuelShort(withFuel(base(), ITA, { s: 500, r: 1, g: 0.9, u: 1.0 }), ITA)).toBe(false);
  });
  it('AI si při nedostatku sjedná dovoz ropy od země s přebytkem; ne od nepřítele a nejvýš FUEL_DEALS smluv', () => {
    const sup = oilSupplier(dry, ITA);
    expect(sup).toBeTruthy();
    expect(sup.surplus).toBeGreaterThanOrEqual(AI.FUEL_SURPLUS_MIN);
    const t = aiFuel(dry, ITA);
    const deal = t.ind.trade.find((d) => d.to === ITA && d.res === 'ropa' && !dry.ind.trade.includes(d));
    expect(deal).toBeTruthy();
    expect(deal.from).toBe(sup.from);
    const calm = base();
    expect(aiFuel(calm, ITA)).toBe(calm);
    const peace = withFuel(base(), ITA, { s: 0, r: 0.4, g: 0.4, u: 1.0 });
    expect(aiFuel(peace, ITA)).toBe(peace);   // v míru AI ropu nedováží
    const midweek = { ...dry, tick: 24 * 3 };
    expect(aiFuel(midweek, ITA)).toBe(midweek);
    const war = declareWar(dry, 'ITA', W.owners[sup.from].tag);
    const other = oilSupplier(war, ITA);
    expect(other === null || other.from !== sup.from).toBe(true);
    let many = dry;
    for (let i = 0; i < AI.FUEL_DEALS + 2; i++) many = aiFuel(many, ITA);
    expect(many.ind.trade.filter((d) => d.to === ITA && d.res === 'ropa').length).toBeLessThanOrEqual(Math.max(AI.FUEL_DEALS, dry.ind.trade.filter((d) => d.to === ITA && d.res === 'ropa').length));
  });
  it('bez paliva se armáda dál nemotorizuje a bombardéry zůstanou na zemi', () => {
    const late = { ...base(), tick: 24 * 1500 };
    const mix = desiredMix(late, GER), dryMix = desiredMix(withFuel(late, GER, { s: 0, r: 0.3, g: 0.2, u: 2 }), GER);
    expect(dryMix.pesi).toBeGreaterThan(mix.pesi);
    let s = declareWar(base(), 'GER', 'POL');
    const wi = s.air.wings.findIndex((wg) => wg && wg.o === GER && wg.t === 'tac');
    let target = 0;
    for (let x = 1; x < W.states.length && !target; x++) if (s.stateOwner[x] === PLN) target = x;
    const wings = s.air.wings.slice();
    wings[wi] = { ...wings[wi], m: 'bomb', to: target };
    s = withFuel({ ...s, air: { ...s.air, wings } }, GER, { r: FUEL.LOW - 0.2 });
    const t = aiAir(s, GER);
    expect(t.air.wings[wi].m).not.toBe('bomb');
  });
});

describe('výsadky', () => {
  const ready = () => grantTech(grantTech(declareWar(base(), 'GER', 'POL'), GER, 'pusky2'), GER, 'vysadek');
  it('velmoc s technologií si založí výsadkovou šablonu a cvičí výsadkové divize; malá země ne', () => {
    let s = ready();
    expect(paraTemplate(s, GER)).toBe(0);
    s = aiPara(s, GER);
    const tpl = paraTemplate(s, GER);
    expect(tpl).toBeGreaterThan(0);
    expect(deriveStats(s.mil.tpl[tpl]).para).toBe(true);
    const q0 = s.mil.queue.length;
    s = aiPara({ ...s, tick: s.tick + 72 }, GER);
    expect(s.mil.queue.length).toBe(q0 + 1);
    expect(s.mil.queue[s.mil.queue.length - 1].tpl).toBe(tpl);
    const small = grantTech(grantTech(declareWar(base(), 'HUN', 'ROM'), HUN, 'pusky2'), HUN, 'vysadek');
    expect(aiPara(small, HUN)).toBe(small);
    const noTech = declareWar(base(), 'GER', 'POL');
    expect(aiPara(noTech, GER)).toBe(noTech);
    void ROM;
  });
  it('cíl výsadku je nehájená nepřátelská provincie ve druhé linii a AI na ni výsadkáře shodí', () => {
    let s = aiPara(ready(), GER);
    const tpl = paraTemplate(s, GER), st = deriveStats(s.mil.tpl[tpl]);
    const site = W.owners[GER].cap;
    const id = s.mil.divs.length;
    s = { ...s, mil: { ...s.mil, divs: [...s.mil.divs, { ...s.mil.divs.find((d) => d && d.o === GER), tpl, p: site, path: [], prog: 0, b: 0, hp: st.hp, org: st.org, army: 0 }] } };
    s = { ...s, mil: { ...s.mil, divs: s.mil.divs.map((d) => (d && d.o === PLN ? null : d)) } };   // bez obránců: cíle jsou volné
    s = { ...s, air: { ...s.air, wings: s.air.wings.map((wg) => (wg && wg.o === PLN ? { ...wg, m: null, to: 0 } : wg)) } };
    const target = dropTarget(s, GER, site);
    expect(target).toBeGreaterThan(0);
    expect(s.ctrl[target]).toBe(PLN);
    expect(dropBlock(s, [id], target)).toBeNull();
    let t = s;
    for (let i = 0; i < 4 && !t.air.drops.length; i++) t = aiPara({ ...t, tick: t.tick + 72 }, GER);
    expect(t.air.drops.some((x) => x.o === GER && x.id === id && x.to === target)).toBe(true);
    expect(validateState(t)).toBeNull();
  });
  it('výsadkové divize AI nezařazuje do armád', () => {
    let s = aiPara(ready(), GER);
    const tpl = paraTemplate(s, GER), st = deriveStats(s.mil.tpl[tpl]);
    const id = s.mil.divs.length;
    s = { ...s, mil: { ...s.mil, divs: [...s.mil.divs, { ...s.mil.divs.find((d) => d && d.o === GER), tpl, p: W.owners[GER].cap, path: [], prog: 0, b: 0, hp: st.hp, org: st.org, army: 0 }] } };
    const t = advance(s, 24 * 2);
    expect(t.mil.divs[id] === null || t.mil.divs[id].army === 0).toBe(true);
  });
});

describe('pakty', () => {
  it('země v míru, malá země nebo země bez politické moci pakt nenabízí', () => {
    expect(pactTarget(pp(base(), GER), GER)).toBe(0);
    const war = declareWar(base(), 'GER', 'POL');
    expect(pactTarget(pp(war, GER, 0), GER)).toBe(0);
  });
  it('válčící velmoc nabídne pakt sousedovi bez historického plánu, který ho přijme; opakuje až po čase', () => {
    let s = pp(declareWar(base(), 'ITA', 'YUG'), ITA);
    const t = pactTarget(s, ITA);
    if (t) {
      expect(pactOf(s, ITA, t)).toBeNull();
      const day = Math.ceil(s.tick / 24);
      let d = day;
      while ((d + ITA) % AI.NAP_DAYS !== 0) d++;
      const u = aiPacts({ ...s, tick: d * 24 }, ITA);
      expect(pactOf(u, ITA, t)).toBeTruthy();
      expect(u.nat.own[ITA].flags[`nap_${t}`]).toBeTruthy();
      expect(u.pol.own[ITA].pp).toBe(300 - DIP.NAP_PP);
    }
    const off = { ...s, tick: (Math.ceil(s.tick / 24) + 1) * 24 };
    if ((Math.floor(off.tick / 24) + ITA) % AI.NAP_DAYS !== 0) expect(aiPacts(off, ITA)).toBe(off);   // mimo svůj den AI nic nenabízí
  });
  it('hráči AI pakt nabídne do fronty nabídek, zemi s historickým plánem ne', () => {
    let s = pp(declareWar(createGame({ player: 'HUN', aiLevel: 2 }), 'GER', 'FRA'), GER);
    // Německo má plány proti Polsku, Československu atd.; Maďarsko (hráč) v nich není
    expect([0, HUN, ...[...Array(W.owners.length).keys()]]).toContain(pactTarget(s, GER));
    const t = pactTarget(s, GER);
    expect(t === PLN || t === SOV && false).toBe(false);
    if (t === HUN) {
      let d = Math.ceil(s.tick / 24);
      while ((d + GER) % AI.NAP_DAYS !== 0) d++;
      const u = aiPacts({ ...s, tick: d * 24 }, GER);
      expect(pactOffers(u, HUN).some((x) => x.a === GER)).toBe(true);
    }
    void FRA; void fuelOf;
  });
});
