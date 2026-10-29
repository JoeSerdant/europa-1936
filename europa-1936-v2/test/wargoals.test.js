// Válečné cíle (M56): cena a doba, uložení cíle při vyhlášení války, možnosti mírové konference podle cíle.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, justifyWar, startWar, justReady, WARGOALS, WARGOAL_IDS, diplomacyOf, confTake, confTribute, confPuppet, confAnnex, confSkip, validateState, overlordOf,
} from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER, POL = W.ownerIdx.POL;
const rich = (s, o, pp = 500) => { const own = s.pol.own.slice(); own[o] = { ...own[o], pp }; return { ...s, pol: { ...s.pol, own } }; };
const base = () => rich(createGame({ player: 'GER' }), GER);
const withConf = (g) => {
  const s = base();
  const cap = s.dip.cap.slice(); cap[POL] = 1;
  return { ...s, dip: { ...s.dip, cap, conf: [{ id: 1, loser: POL, victor: GER, g }] } };
};

describe('válečné cíle (M56)', () => {
  it('cena a doba ospravedlnění podle cíle', () => {
    for (const g of WARGOAL_IDS) {
      const s = justifyWar(base(), GER, POL, g);
      expect(s.pol.own[GER].pp).toBe(base().pol.own[GER].pp - WARGOALS[g].pp);
      const j = s.dip.just.find((x) => x.b === POL);
      expect(j.g).toBe(g);
      expect(j.ready).toBe(WARGOALS[g].days * 24);
    }
    const s = base();
    expect(justifyWar(s, GER, POL, 'nic')).toBe(s);
    expect(justifyWar(rich(s, GER, 3), GER, POL, 'conquest')).toEqual(rich(s, GER, 3));
  });
  it('cíl se uloží při vyhlášení války a řádek diplomacie nabízí všechny cíle', () => {
    let s = justifyWar(base(), GER, POL, 'border');
    s = advance(s, 24 * WARGOALS.border.days + 1);
    expect(justReady(s, GER, POL)).toBe(true);
    const w = startWar(s, GER, POL);
    expect(w.dip.goal[`${GER}>${POL}`]).toBe('border');
    const row = diplomacyOf(base(), GER).list.find((r) => r.o === POL);
    expect(row.goals.map((g) => g.id)).toEqual(WARGOAL_IDS);
    expect(row.goals.every((g) => !g.block)).toBe(true);
    expect(validateState(w)).toBeNull();
  });
  it('konference s cílem Územní nároky: převzetí států, poražený zůstane samostatný', () => {
    const s = withConf('border');
    expect(confPuppet(s, 1)).toBe(s);
    expect(confAnnex(s, 1)).toBe(s);
    const own = (x, o) => x.stateOwner.filter((v) => v === o).length;
    const t = confTake(s, 1);
    expect(t.dip.conf.length).toBe(0);
    expect(t.dip.cap[POL]).toBe(0);
    expect(own(t, POL)).toBeGreaterThan(0);
    expect(own(t, GER)).toBeGreaterThan(own(s, GER));
    expect(own(t, GER) - own(s, GER)).toBeLessThanOrEqual(WARGOALS.border.take);
    expect(overlordOf(t, POL)).toBe(0);
    expect(validateState(t)).toBeNull();
  });
  it('konference s cílem Ponížení: odškodné v politické moci a oslabení poraženého', () => {
    const s = withConf('tribute');
    const t = confTribute(s, 1);
    expect(t.pol.own[GER].pp).toBe(s.pol.own[GER].pp + WARGOALS.tribute.pp_gain);
    expect(t.pol.own[POL].ws).toBeLessThan(s.pol.own[POL].ws);
    expect(t.dip.cap[POL]).toBe(0);
    expect(confTake(s, 1)).toBe(s);
    expect(confSkip(s, 1).dip.conf.length).toBe(0);
  });
  it('výchozí cíl Podmanění zachová loutku i anexi', () => {
    const s = withConf('conquest');
    expect(confPuppet(s, 1)).not.toBe(s);
    expect(confTribute(s, 1)).toBe(s);
  });
});
