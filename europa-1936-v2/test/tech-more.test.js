// Rozšířený strom výzkumu (M96): rozsah, vojenské bonusy technologií v divizích, úrovně lodí v síle flotily, drobné technologie až po hlavních.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, TECHS, TECH_IDS, CATS, fxLines } from '../src/engine/index.js';
import { MOD_KEYS } from '../src/engine/army/leaders.js';
import { techArmyMods, NO_TECH_ARMY, NO_MODS, modsOf as techModsOf } from '../src/engine/research/core.js';
import { modsOf } from '../src/engine/army/unit.js';
import { openCtx } from '../src/engine/army/ctx.js';
import { fleetPower, powerOf } from '../src/engine/nav/core.js';
import { aiPick } from '../src/engine/research/day.js';

const W = getWorld();
const GER = W.ownerIdx.GER;
const withDone = (s, o, ids) => {
  const own = s.tech.own.slice();
  own[o] = { ...own[o], done: { ...own[o].done, ...Object.fromEntries(ids.map((x) => [x, 1])) } };
  return { ...s, tech: { ...s.tech, own } };
};

describe('rozsah', () => {
  it('přes 140 technologií v osmi oborech včetně námořnictva a elektroniky; vojenské klíče jsou z MOD_KEYS', () => {
    expect(TECH_IDS.length).toBeGreaterThan(140);
    expect(CATS.namor).toBeTruthy();
    expect(CATS.elektro).toBeTruthy();
    for (const id of TECH_IDS) {
      for (const k in TECHS[id].fx.army || {}) expect(MOD_KEYS).toContain(k);
      for (const k in TECHS[id].fx.mod || {}) expect(k in NO_MODS).toBe(true);
      for (const r of TECHS[id].req) expect(TECHS[r].year).toBeLessThanOrEqual(TECHS[id].year);
    }
    expect(fxLines('inf_hory')).toEqual(['útok v horách +5 %', 'obrana v horách +5 %']);
    expect(fxLines('dd2')).toEqual(['Torpédoborce: úroveň 2']);
  });
});

describe('účinky', () => {
  it('vojenské bonusy hotových technologií se sečtou do bonusů divizí', () => {
    expect(techArmyMods({})).toBe(NO_TECH_ARMY);
    expect(techArmyMods({ inf_kul: 1, inf_sam: 1 }).atkInf).toBeCloseTo(0.06, 6);
    const s = createGame({ player: null });
    const id = s.mil.divs.findIndex((d) => d && d.o === GER);
    const before = modsOf(openCtx(s), s.mil.divs[id]);
    const t = withDone(s, GER, ['inf_kul', 'art_opt']);
    const after = modsOf(openCtx(t), t.mil.divs[id]);
    expect(after.atkInf).toBeCloseTo((before.atkInf || 0) + 0.03, 6);
    expect(after.atk).toBeCloseTo((before.atk || 0) + 0.02, 6);
  });
  it('úrovně lodí zvyšují palbu a odolnost flotily; bonusy letectva a loďstva jsou v modech technologií', () => {
    const s = createGame({ player: null });
    const ships = { dd: 4, bb: 1 };
    expect(fleetPower(s, GER, ships)).toEqual(powerOf(ships));
    const lv = s.mil.lv.slice(); lv[GER] = { ...(lv[GER] || {}), dd: 3, bb: 2 };
    const t = { ...s, mil: { ...s.mil, lv } };
    const p = fleetPower(t, GER, ships), p0 = powerOf(ships);
    expect(p.atk).toBeGreaterThan(p0.atk);
    expect(p.hp).toBeGreaterThan(p0.hp);
    expect(p.n).toBe(p0.n);
    expect(techModsOf(withDone(s, GER, ['air_rad', 'el_radar2']), GER).air).toBeCloseTo(0.06, 6);
    expect(techModsOf(withDone(s, GER, ['el_radar2']), GER).nav).toBeCloseTo(0.03, 6);
  });
  it('AI zkoumá drobné technologie až po hlavních téhož roku', () => {
    const own = { o: GER, done: {}, prog: {}, slots: [] };
    const pick = aiPick(own, 1936, new Set());
    expect(TECHS[pick].minor).toBeFalsy();
  });
});
