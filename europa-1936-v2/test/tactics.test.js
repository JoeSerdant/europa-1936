// Bojové taktiky (M77): data, výběr (deterministický, velitel, tanky, průzkum), účinky a rušení, bitva v čase a okno bitvy.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, advance, battleView, validateState, GAME_VERSION } from '../src/engine/index.js';
import { TACTICS, TACTIC_IDS, ATT_TACTICS, DEP_TACTICS } from '../src/data/army/tactics.js';
import { chooseTactics, tacticEffects, NO_TACTIC } from '../src/engine/army/tactics.js';
import { C } from '../src/engine/army/constants.js';

const W = getWorld();
const plain = { lead: 0, arm: false, rec: 0 };

describe('data', () => {
  it('pět taktik na stranu, každá s názvem, popisem a platnými odkazy', () => {
    expect(ATT_TACTICS).toHaveLength(5);
    expect(DEP_TACTICS).toHaveLength(5);
    for (const id of TACTIC_IDS) {
      const T = TACTICS[id];
      expect(T.n && T.info, id).toBeTruthy();
      expect(T.w).toBeGreaterThan(0);
      for (const b of T.beats) { expect(TACTICS[b], `${id}→${b}`).toBeTruthy(); expect(TACTICS[b].side).not.toBe(T.side); }
    }
    expect(TACTICS.celni.atk).toBe(0);
    expect(TACTICS.linie.def).toBe(0);
  });
});

describe('výběr', () => {
  it('je deterministický a vrací taktiky správných stran', () => {
    const a = chooseTactics(100, 7, plain, plain), b = chooseTactics(100, 7, plain, plain);
    expect(a).toEqual(b);
    expect(ATT_TACTICS).toContain(a.ta);
    expect(DEP_TACTICS).toContain(a.td);
  });
  it('v mnoha bitvách se vystřídají všechny taktiky a základní je nejčastější', () => {
    const seen = {};
    for (let i = 0; i < 2000; i++) { const r = chooseTactics(i * 24, i, plain, plain); seen[r.ta] = (seen[r.ta] || 0) + 1; seen[r.td] = (seen[r.td] || 0) + 1; }
    for (const id of TACTIC_IDS) expect(seen[id], id).toBeGreaterThan(50);
    for (const id of ATT_TACTICS) if (id !== 'celni') expect(seen.celni).toBeGreaterThan(seen[id]);
  });
  it('zkušený velitel volí pokročilé taktiky častěji a tanky průlom', () => {
    const count = (side, key) => { let n = 0; for (let i = 0; i < 3000; i++) if (chooseTactics(i * 24, i, side, plain).ta === key) n++; return n; };
    expect(count({ ...plain, lead: 8 }, 'celni')).toBeLessThan(count(plain, 'celni'));
    expect(count({ ...plain, arm: true }, 'prulom')).toBeGreaterThan(count(plain, 'prulom') * 1.3);
  });
  it('strana s převahou v průzkumu častěji ruší taktiku protivníka', () => {
    const beats = (att, dep) => { let a = 0, d = 0; for (let i = 0; i < 4000; i++) { const r = chooseTactics(i * 24, i, att, dep), fx = tacticEffects(r.ta, r.td); if (fx.beaten === 'dep') a++; if (fx.beaten === 'att') d++; } return { a, d }; };
    const even = beats(plain, plain), attRec = beats({ ...plain, rec: 3 }, plain), depRec = beats(plain, { ...plain, rec: 3 });
    expect(attRec.a).toBeGreaterThan(even.a * 1.4);
    expect(depRec.d).toBeGreaterThan(even.d * 1.4);
  });
});

describe('účinky', () => {
  it('nezrušená taktika dává své bonusy, zrušená jen své zápory', () => {
    const fx = tacticEffects('prulom', 'linie');
    expect(fx.att).toMatchObject({ atk: 0.15, def: -0.05 });
    expect(fx.beaten).toBe('');
    const beaten = tacticEffects('prulom', 'pruzna');
    expect(beaten.beaten).toBe('att');
    expect(beaten.att).toEqual({ atk: 0, def: -0.05, foe: 0 });
    expect(beaten.dep.def).toBe(0.12);
    const other = tacticEffects('prulom', 'protiutok');
    expect(other.beaten).toBe('dep');
    expect(other.dep).toEqual({ atk: 0, def: -0.05, foe: 0 });
    expect(tacticEffects('', '')).toEqual({ att: NO_TACTIC, dep: NO_TACTIC, beaten: '' });
  });
});

describe('bitva', () => {
  it('v bitvě si strany zvolí taktiky, po TACTIC_HOURS hodinách je mohou změnit a okno bitvy je ukazuje', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(36);
    let s = createGame({ player: null, aiLevel: 2, scenario: '1939' });   // Německo útočí na Polsko
    let b = null;
    for (let h = 0; h < 24 * 30 && !b; h += 6) { s = advance(s, 6); b = s.mil.battles.find((x) => x.hrs > 2) || null; }
    expect(b).toBeTruthy();
    expect(ATT_TACTICS).toContain(b.ta);
    expect(DEP_TACTICS).toContain(b.td);
    const v = battleView(s, b.id);
    expect(v.tactics.att).toMatchObject({ id: b.ta, n: TACTICS[b.ta].n });
    expect(v.tactics.dep).toMatchObject({ id: b.td, n: TACTICS[b.td].n });
    expect(['', 'att', 'dep']).toContain(v.tactics.beaten);
    expect(validateState(s)).toBeNull();
    expect(C.TACTIC_HOURS).toBe(24);
    void W;
  }, 120000);
});
