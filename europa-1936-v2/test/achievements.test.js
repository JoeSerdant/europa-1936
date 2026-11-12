// Úspěchy (M86): data, vyhodnocení ze stavu hry, uložení v prohlížeči, ohlášení kartou a okno.
import { describe, it, expect, beforeEach } from 'vitest';
import { createGame, getWorld, proposePact } from '../src/engine/index.js';
import { ACHIEVEMENTS, ACH_BY_ID, achievedNow } from '../src/ui/achievements/list.js';
import { achDone, markAch, resetAch } from '../src/ui/achievements/store.js';
import { gameStore, uiStore } from '../src/ui/store.js';
import * as A from '../src/ui/actions.js';

const W = getWorld();
const GER = W.ownerIdx.GER, ITA = W.ownerIdx.ITA;
const game = () => createGame({ player: 'GER', aiLevel: 0 });

describe('data', () => {
  it('každý úspěch má jedinečné id, název, popis a test', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(15);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.n && a.info, a.id).toBeTruthy();
      expect(typeof a.test).toBe('function');
      expect(ACH_BY_ID[a.id]).toBe(a);
    }
  });
});

describe('vyhodnocení', () => {
  it('na začátku hry není splněný žádný úspěch a pozorovatel žádné nemá', () => {
    expect(achievedNow(game(), GER)).toEqual([]);
    expect(achievedNow(createGame({ player: null }), 0)).toEqual([]);
    expect(achievedNow(null, GER)).toEqual([]);
  });
  it('úspěchy se splní podle stavu hry', () => {
    let s = game();
    const pol = s.pol.own.slice(); pol[GER] = { ...pol[GER], pp: 300, stab: 0.95 };
    s = proposePact({ ...s, pol: { ...s.pol, own: pol } }, GER, ITA);
    expect(achievedNow(s, GER)).toEqual(expect.arrayContaining(['diplomat', 'stabilita']));
    const sub = s.dip.sub.slice(); sub[ITA] = GER;
    expect(achievedNow({ ...s, dip: { ...s.dip, sub } }, GER)).toContain('loutkar');
    const nuke = s.air.nuke.slice(); nuke[GER] = { n: 1, p: 0 };
    expect(achievedNow({ ...s, air: { ...s.air, nuke } }, GER)).toContain('atom');
    const logged = { ...s, log: { n: 2, items: [{ id: 1, t: 0, k: 'built', o: GER, x: 'civ' }, { id: 2, t: 0, k: 'drop', o: GER, x: 5, a: 1 }] } };
    expect(achievedNow(logged, GER)).toEqual(expect.arrayContaining(['stavitel', 'vysadek']));
    expect(achievedNow({ ...s, end: { kind: 'win' } }, GER)).toContain('vitez');
    expect(achievedNow({ ...s, tick: 3300 * 24 }, GER)).toContain('prezil');
  });
  it('chyba v testu úspěch jen nesplní', () => {
    expect(() => achievedNow({ log: { items: [] } }, GER)).not.toThrow();
  });
});

describe('uložení a ohlášení', () => {
  beforeEach(() => { resetAch(); A.goMenu(); });
  it('markAch vrací jen nově splněné a pamatuje si je', () => {
    expect(achDone().size).toBe(0);
    expect(markAch(['stavitel', 'vedec'])).toEqual(['stavitel', 'vedec']);
    expect(markAch(['stavitel', 'atom'])).toEqual(['atom']);
    expect(achDone().has('vedec')).toBe(true);
    resetAch();
    expect(achDone().size).toBe(0);
  });
  it('checkAchievements ohlásí nový úspěch kartou jen jednou', () => {
    A.startGame('GER');
    const s = gameStore.getState();
    const pol = s.pol.own.slice(); pol[GER] = { ...pol[GER], stab: 0.95 };
    gameStore.setState({ ...s, pol: { ...s.pol, own: pol } });
    expect(A.checkAchievements()).toEqual(['stabilita']);
    expect(uiStore.getState().popups.some((p) => p.kind === 'ach' && p.text === ACH_BY_ID.stabilita.n)).toBe(true);
    expect(A.checkAchievements()).toEqual([]);
  });
  it('okno Úspěchy se otevírá a zavírá', () => {
    A.startGame('GER');
    A.setAchOpen(true);
    expect(uiStore.getState().achOpen).toBe(true);
    expect(uiStore.getState().menuOpen).toBe(false);
    A.setAchOpen(false);
    expect(uiStore.getState().achOpen).toBe(false);
  });
});
