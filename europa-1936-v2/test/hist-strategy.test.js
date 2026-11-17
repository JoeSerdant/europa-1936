// Historické strategie AI (M92): hranice kapitulace podle země, duchové ze spouštěčů válek a z oken (blesková válka, podivná válka, Barbarossa,
// vlastenecká válka), záložní armády (záměrná chyba Francie), sovětská obrana bez protiútoků, fronty bez zásobování a dlouhé pochody.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, declareWar, validateState, AI, DIP } from '../src/engine/index.js';
import { HIST_STRATEGIES, CAP_LIMITS } from '../src/data/ai/strategies.js';
import { SPIRITS } from '../src/data/nat/spirits.js';
import { MOD_KEYS } from '../src/engine/army/leaders.js';
import { capLimitOf, dipDay } from '../src/engine/dip/day.js';
import { histStrategies, holdBackOf, defendOnlyOf, warDays } from '../src/engine/ai/hist.js';
import { decideStrategy, allocateArmies } from '../src/engine/ai/strategy.js';
import { aiStrategy } from '../src/engine/ai/strategy.js';
import { pairKey } from '../src/engine/dip/core.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const [GER, FRA, SOV, POL, ITA] = ['GER', 'FRA', 'SOV', 'POL', 'ITA'].map(idx);
const base = (extra = {}) => createGame({ player: null, aiLevel: 2, ...extra });
const at = (s, day) => ({ ...s, tick: Math.round(day * 24) });
const war = (s, a, b, start = s.tick) => { const t = declareWar(s, W.owners[a].tag, W.owners[b].tag); return { ...t, dip: { ...t.dip, since: { ...t.dip.since, [pairKey(a, b)]: start } } }; };
const sp = (s, o) => s.nat.own[o].sp || {};

describe('data', () => {
  it('strategie odkazují na existující země a duchy; vojenské bonusy duchů jsou z MOD_KEYS', () => {
    for (const s of HIST_STRATEGIES) {
      expect(idx(s.tag)).toBeGreaterThan(0);
      if (s.war) expect(idx(s.war)).toBeGreaterThan(0);
      if (s.spirit) expect(SPIRITS[s.spirit]).toBeTruthy();
      if (s.holdBack) expect(s.holdBack).toBeLessThan(0.5);
    }
    for (const id of ['bleskova_valka', 'podivna_valka', 'prekvapivy_uder', 'sok_z_napadeni', 'vlastenecka_valka']) for (const k in SPIRITS[id].army || {}) expect(MOD_KEYS).toContain(k);
    for (const t in CAP_LIMITS) { expect(idx(t)).toBeGreaterThan(0); expect(CAP_LIMITS[t].capital).toBeLessThanOrEqual(CAP_LIMITS[t].share); }
  });
});

describe('hranice kapitulace', () => {
  /** Země `o` ve válce s Německem; Němci drží její hlavní město a provincie, dokud nedrží aspoň podíl `share` jejích bodů. */
  const occupy = (o, share) => {
    let s = war(base(), GER, o);
    const ctrl = s.ctrl.slice();
    const provs = []; let total = 0;
    for (let p = 1; p <= W.L; p++) if (s.stateOwner[W.provState[p]] === o) { provs.push(p); total += W.vp[p] + 1; }
    const cap = W.owners[o].cap;
    let held = W.vp[cap] + 1; ctrl[cap] = GER;
    for (const p of provs.sort((a, b) => a - b)) { if (held / total >= share) break; if (p !== cap) { ctrl[p] = GER; held += W.vp[p] + 1; } }
    return { ...s, ctrl, ownerVer: s.ownerVer + 1 };
  };
  it('Francie se po pádu Paříže vzdá dřív než ostatní; SSSR vydrží i ztrátu Moskvy', () => {
    expect(capLimitOf(FRA).capital).toBeLessThan(DIP.CAP_CAPITAL_SHARE);
    expect(capLimitOf(POL)).toEqual({ share: DIP.CAP_SHARE, capital: DIP.CAP_CAPITAL_SHARE });
    expect(dipDay(occupy(FRA, 0.3)).dip.cap[FRA]).toBe(1);
    expect(dipDay(occupy(POL, 0.3)).dip.cap[POL]).toBe(0);
    expect(dipDay(occupy(SOV, 0.6)).dip.cap[SOV]).toBe(0);
  });
});

describe('duchové ze strategií', () => {
  it('Barbarossa: na začátku války překvapivý úder a šok z napadení, po půl roce vlastenecká válka; bez historické AI nic', () => {
    const s = at(war(at(base(), 2021), GER, SOV), 2021);
    let t = histStrategies(histStrategies(s, GER), SOV);
    expect(sp(t, GER).prekvapivy_uder).toBeGreaterThan(t.tick);
    expect(sp(t, SOV).sok_z_napadeni).toBeGreaterThan(sp(t, GER).prekvapivy_uder);
    expect(histStrategies(t, GER)).toBe(t);   // opakované spuštění nic nemění
    const later = histStrategies({ ...t, tick: t.tick + 24 * 181 }, SOV);
    expect(sp(later, SOV).vlastenecka_valka).toBe(0);   // trvale
    const off = { ...s, ai: { ...s.ai, hist: 0 } };
    expect(histStrategies(off, GER)).toBe(off);
    expect(warDays(t, GER, SOV)).toBe(0);
    expect(warDays(base(), GER, SOV)).toBe(-1);
  });
  it('okenní duchové: blesková válka jen ve válce s Francií v okně; po konci války zanikne', () => {
    const s = at(war(base(), GER, FRA), 1600);
    const t = histStrategies(histStrategies(s, GER), FRA);
    expect(sp(t, GER).bleskova_valka).toBeGreaterThan(t.tick);
    expect(sp(t, FRA).podivna_valka).toBeGreaterThan(t.tick);
    const peace = at(base(), 1600);
    expect(sp(histStrategies(peace, GER), GER).bleskova_valka).toBeUndefined();
    const ended = { ...t, mil: { ...t.mil, wars: [] } };
    expect(sp(histStrategies(ended, GER), GER).bleskova_valka).toBeUndefined();
    expect(validateState(t)).toBeNull();
  });
});

describe('záměrné chyby a chytré tahy ve strategii', () => {
  it('Francie v okně drží pětinu divizí v záloze; mimo okno ne', () => {
    const s = at(war(base(), GER, FRA), 1500);
    expect(holdBackOf(s, FRA)).toBeCloseTo(0.2, 6);
    expect(holdBackOf(at(s, 1000), FRA)).toBe(0);
    expect(holdBackOf({ ...s, ai: { ...s.ai, hist: 0 } }, FRA)).toBe(0);
    const d = decideStrategy(s, FRA);
    const all = d.armies.reduce((a, x) => a + x.n, 0), placed = d.got.flat().reduce((a, id) => a + d.byId.get(id).n, 0);
    expect(placed).toBeLessThanOrEqual(all * 0.8 + Math.max(...d.armies.map((a) => a.n)));
    expect(d.reserve.length).toBeGreaterThan(0);
  });
  it('SSSR v prvních měsících Barbarossy jen brání: žádná armáda nemá cíle útoku proti Německu', () => {
    let s = at(war(at(base(), 2021), GER, SOV), 2021);
    expect(defendOnlyOf(s, SOV).has(GER)).toBe(true);
    expect(defendOnlyOf(at(s, 2021 + 200), SOV).has(GER)).toBe(false);
    s = aiStrategy(s, SOV);
    const attackers = s.mil.armies.filter((a) => a && a.o === SOV && a.plan && a.plan.k === 'front' && a.plan.to.some((p) => s.ctrl[p] === GER));
    expect(attackers).toHaveLength(0);
    void ITA;
  });
  it('fronta bez zásobovaných postů a vzdálené armády se nepřidělují', () => {
    const th = (posts, fed, x) => ({ posts: Array.from({ length: posts }, (_, i) => i + 1), targets: [1], viable: [1], eff: 2, enemy: 2, x, y: 0, fed });
    const armies = [{ id: 1, n: 10, x: 0, y: 0 }, { id: 2, n: 10, x: 100, y: 0 }];
    const dist = (a, t) => Math.abs(a.x - t.x);
    const dead = allocateArmies([th(4, 0, 0)], armies, { dist, ratioNeed: 1 });
    expect(dead.got[0]).toEqual([]);
    const far = allocateArmies([th(4, 4, AI.PICK_KM + 500)], [{ id: 1, n: 10, x: 0, y: 0 }], { dist, ratioNeed: 1 });
    expect(far.got[0]).toEqual([]);
    const near = allocateArmies([th(4, 4, 50)], armies, { dist, ratioNeed: 1 });
    expect(near.got[0].length).toBeGreaterThan(0);
  });
});
