// Autonomie loutek (M55): úrovně, růst, utažení/uvolnění, osamostatnění, příspěvky podle úrovně, AI, uložení.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, DIP, autonomyLevel, autonomyOf, autonomyBlock, tightenControl, loosenControl, overlordOf, diplomacyOf, validateState, makePuppet, subjectsDay, AUTONOMY_NAMES,
} from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER, HUN = W.ownerIdx.HUN;
const rich = (s, o, pp = 500) => { const own = s.pol.own.slice(); own[o] = { ...own[o], pp }; return { ...s, pol: { ...s.pol, own } }; };
const puppeted = (au = DIP.AU_START) => {
  const s = rich(createGame({ player: 'GER' }), GER);
  const sub = s.dip.sub.slice(); sub[HUN] = GER;
  const a = s.dip.au.slice(); a[HUN] = au;
  return { ...s, dip: { ...s.dip, sub, au: a } };
};

describe('autonomie loutek (M55)', () => {
  it('úrovně podle hranic', () => {
    expect(autonomyLevel(0)).toBe(0);
    expect(autonomyLevel(DIP.AU_LEVELS[0])).toBe(1);
    expect(autonomyLevel(DIP.AU_LEVELS[1])).toBe(2);
    expect(autonomyLevel(99)).toBe(3);
    expect(AUTONOMY_NAMES.length).toBe(4);
  });
  it('nová loutka z konference začíná na AU_START', () => {
    let s = createGame({ player: 'GER' });
    const cap = s.dip.cap.slice(); cap[HUN] = 1;
    s = makePuppet({ ...s, dip: { ...s.dip, cap } }, GER, HUN);
    expect(overlordOf(s, HUN)).toBe(GER);
    expect(autonomyOf(s, HUN)).toBe(DIP.AU_START);
  });
  it('autonomie denně roste a pán ji může utáhnout nebo uvolnit', () => {
    const s = puppeted();
    const t = advance(s, 24 * 10);
    expect(autonomyOf(t, HUN)).toBeGreaterThan(DIP.AU_START);
    const u = tightenControl(s, GER, HUN);
    expect(autonomyOf(u, HUN)).toBe(DIP.AU_START - DIP.AU_TIGHT);
    expect(u.pol.own[GER].pp).toBe(s.pol.own[GER].pp - DIP.AU_TIGHT_PP);
    const v = loosenControl(s, GER, HUN);
    expect(autonomyOf(v, HUN)).toBe(DIP.AU_START + DIP.AU_LOOSE);
    expect(validateState(v)).toBeNull();
  });
  it('neplatné změny vrací tentýž stav', () => {
    const s = puppeted();
    expect(tightenControl(s, W.ownerIdx.FRA, HUN)).toBe(s);
    const poor = rich(s, GER, 0);
    expect(tightenControl(poor, GER, HUN)).toBe(poor);
    expect(autonomyBlock(rich(s, GER, 0), GER, HUN, true)).toMatch(/Chybí/);
    expect(autonomyBlock(puppeted(0), GER, HUN, true)).toMatch(/úplná/);
    const full = puppeted(100);
    expect(loosenControl(full, GER, HUN)).toBe(full);
  });
  it('při 100 se loutka osamostatní a deník to zapíše', () => {
    const s = puppeted(99.99);
    const t = subjectsDay(s);
    expect(overlordOf(t, HUN)).toBe(0);
    expect(autonomyOf(t, HUN)).toBe(0);
    expect(t.log.items[t.log.items.length - 1]).toMatchObject({ k: 'free', o: GER, x: HUN });
  });
  it('kolonie platí pánovi víc než nespokojená loutka', () => {
    const base = (au) => { const s = puppeted(au); const man = s.mil.man.slice(); man[HUN] = 100000; man[GER] = 0; return { ...s, mil: { ...s.mil, man } }; };
    const lo = subjectsDay(base(5)), hi = subjectsDay(base(80));
    expect(lo.mil.man[GER]).toBeGreaterThan(hi.mil.man[GER]);
    expect(lo.pol.own[GER].pp - base(5).pol.own[GER].pp).toBeGreaterThan(hi.pol.own[GER].pp - base(80).pol.own[GER].pp);
  });
  it('řádek diplomacie ukazuje autonomii a AI utahuje nespokojené loutky', () => {
    const s = puppeted(75);
    const row = diplomacyOf(s, GER).list.find((r) => r.o === HUN);
    expect(row.mine).toBe(true);
    expect(row.auLevel).toBe(3);
    const ai = advance({ ...s, ai: { ...s.ai, level: 2 }, player: null }, 24 * 3);
    expect(autonomyOf(ai, HUN)).toBeLessThan(75);
    expect(validateState(ai)).toBeNull();
  });
});
