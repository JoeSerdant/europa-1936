// Mlha války (M76): viditelnost provincií a moří, radar, letectvo, zpravodajství, spojenci, pravidlo hry, žetony na mapě a cheat.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, validateState, GAME_VERSION, packGame, unpackGame, declareWar, runCheat,
  FOG, fogOn, visibleLand, visibleSeas, seesDivision, seesFleet, RULES, RULE_IDS, createRules, ruleOf,
} from '../src/engine/index.js';
import { adjacency } from '../src/engine/army/geo.js';
import { buildCounters, battlesOf } from '../src/ui/map/units.js';
import { buildFleetTokens } from '../src/ui/map/fleets.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), FRA = idx('FRA'), SOV = idx('SOV'), PLN = idx('POL'), BEL = idx('BEL'), ENG = idx('ENG');
const game = (extra = {}) => createGame({ player: 'GER', aiLevel: 0, ...extra });
const capOf = (o) => W.owners[o].cap;

describe('pravidla hry', () => {
  it('výchozí pravidla, neplatné hodnoty a neznámé klíče', () => {
    expect(RULE_IDS).toContain('fog');
    expect(createRules(null)).toEqual({ fog: 1 });
    expect(createRules({ fog: 0, nic: 5 })).toEqual({ fog: 0 });
    expect(createRules({ fog: 7 })).toEqual({ fog: RULES.fog.def });
    const s = game({ rules: { fog: 0 } });
    expect(s.rules).toEqual({ fog: 0 });
    expect(ruleOf(s, 'fog')).toBe(0);
    expect(ruleOf({ }, 'fog')).toBe(1);
  });
  it('mlha platí jen pro hráče a se zapnutým pravidlem; stav projde kontrolou a uložením', () => {
    expect(fogOn(game())).toBe(true);
    expect(fogOn(game({ rules: { fog: 0 } }))).toBe(false);
    expect(fogOn(createGame({ player: null }))).toBe(false);
    expect(GAME_VERSION).toBeGreaterThanOrEqual(35);
    const s = game();
    expect(validateState(s)).toBeNull();
    expect(validateState({ ...s, rules: null })).toMatch(/pravidla/);
    expect(unpackGame(JSON.parse(JSON.stringify(packGame(s)))).state.rules).toEqual({ fog: 1 });
  });
});

describe('viditelnost na souši', () => {
  const s = game();
  const vis = visibleLand(s, GER);
  it('vlastní území a sousední provincie jsou vidět, vnitrozemí cizí země ne', () => {
    const adj = adjacency(W);
    for (let p = 1; p <= W.L; p++) {
      if (s.ctrl[p] !== GER) continue;
      expect(vis[p]).toBe(1);
      for (const e of adj[p]) expect(vis[e.to]).toBe(1);
    }
    expect(vis[capOf(SOV)]).toBe(0);
    expect(vis[capOf(FRA)]).toBe(0);
    expect(seesDivision(s, SOV, capOf(SOV))).toBe(false);
    expect(seesDivision(s, GER, capOf(SOV))).toBe(true);
  });
  it('území spojence z bloku je vidět celé a jeho divize také', () => {
    const f = game({ player: 'FRA' });
    const v = visibleLand(f, FRA);
    expect(v[capOf(PLN)]).toBe(1);
    expect(v[capOf(BEL)]).toBe(1);
    expect(seesDivision(f, PLN, capOf(SOV))).toBe(true);
  });
  it('vlastní divize v cizí zemi odkryje své okolí', () => {
    const far = capOf(SOV);
    const id = s.mil.divs.findIndex((d) => d && d.o === GER);
    const divs = s.mil.divs.slice();
    divs[id] = { ...divs[id], p: far };
    const v = visibleLand({ ...s, mil: { ...s.mil, divs } }, GER);
    expect(v[far]).toBe(1);
    for (const e of adjacency(W)[far]) expect(v[e.to]).toBe(1);
  });
  it('radar, letectvo na misi a zpravodajský přehled rozšiřují dohled', () => {
    const st = s.ind.st.slice();
    let home = 0;
    for (let x = 1; x < W.states.length; x++) if (s.stateOwner[x] === GER) { home = x; break; }
    st[home] = { ...st[home], radar: 3 };
    const r = visibleLand({ ...s, ind: { ...s.ind, st } }, GER);
    expect(r.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(vis.reduce((a, b) => a + b, 0));
    const target = W.provState[capOf(SOV)];
    const wi = s.air.wings.findIndex((wg) => wg && wg.o === GER);
    const wings = s.air.wings.slice();
    wings[wi] = { ...wings[wi], m: 'air', to: target };
    expect(visibleLand({ ...s, air: { ...s.air, wings } }, GER)[capOf(SOV)]).toBe(1);
    const spy = s.spy.own.slice();
    spy[GER] = { ...spy[GER], intel: { [SOV]: FOG.INTEL_FULL } };
    const iv = visibleLand({ ...s, spy: { ...s.spy, own: spy } }, GER);
    expect(iv[capOf(SOV)]).toBe(1);
    expect(iv[capOf(FRA)]).toBe(0);
  });
  it('výsledek se cachuje a po změně stavu přepočítá', () => {
    const v1 = visibleLand(s, GER);
    expect(visibleLand(s, GER)).toBe(v1);
    expect(v1).toEqual(vis);
    const ctrl = s.ctrl.slice();
    ctrl[capOf(FRA)] = GER;
    expect(visibleLand({ ...s, ctrl }, GER)).not.toBe(v1);
    expect(visibleLand({ ...s, ctrl }, GER)[capOf(FRA)]).toBe(1);
  });
});

describe('viditelnost na moři', () => {
  const s = game();
  it('moře u vlastního pobřeží a kolem vlastních flotil je vidět, vzdálené ne', () => {
    const seas = visibleSeas(s, GER);
    const mine = s.nav.fleets.find((f) => f && f.o === GER);
    expect(seas.has(mine.p)).toBe(true);
    const sov = s.nav.fleets.find((f) => f && f.o === SOV);
    expect(seesFleet(s, GER, mine.p)).toBe(true);
    expect(seesFleet(s, SOV, sov.p)).toBe(seas.has(sov.p));
    const far = s.nav.fleets.find((f) => f && !seas.has(f.p));
    expect(far).toBeTruthy();
    expect(seesFleet(s, far.o, far.p)).toBe(false);
  });
});

describe('mapa', () => {
  it('žetony cizích divizí mimo dohled se nekreslí; bez mlhy a pro pozorovatele jsou vidět všechny', () => {
    const s = game();
    const fogged = buildCounters(s, W);
    const all = buildCounters({ ...s, rules: { fog: 0 } }, W);
    const obs = buildCounters(createGame({ player: null }), W);
    expect(fogged.length).toBeLessThan(all.length);
    expect(obs.length).toBe(all.length);
    const vis = visibleLand(s, GER);
    for (const c of fogged) expect(c.o === GER || vis[c.p] === 1).toBe(true);
    expect(fogged.filter((c) => c.o === GER).length).toBe(all.filter((c) => c.o === GER).length);
    expect(fogged.some((c) => c.o === SOV && c.p === capOf(SOV))).toBe(false);
  });
  it('flotily mimo dohled se nekreslí a bitvy v neviditelných provinciích také ne', () => {
    const s = game();
    expect(buildFleetTokens(s, W).length).toBeLessThan(buildFleetTokens({ ...s, rules: { fog: 0 } }, W).length);
    const w = declareWar(s, 'SOV', 'ENG');
    const battles = [{ id: 1, p: capOf(SOV), from: [], adv: 0.5, att: [], dep: [], hrs: 0, fa: [], fd: [] }];
    const withBattle = { ...w, mil: { ...w.mil, battles } };
    expect(battlesOf(withBattle)).toHaveLength(0);
    expect(battlesOf({ ...withBattle, rules: { fog: 0 } })).toHaveLength(1);
    void ENG;
  });
  it('cheat fow mlhu přepíná', () => {
    const s = game();
    const off = runCheat(s, 'fow').state;
    expect(fogOn(off)).toBe(false);
    expect(fogOn(runCheat(off, 'fow').state)).toBe(true);
  });
});
