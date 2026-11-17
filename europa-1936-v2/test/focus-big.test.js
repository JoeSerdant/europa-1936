// Velké stromy národních cílů (M94): rozsah stromů, rozvržení větví, nové účinky `rel` a `bld`, platné odkazy na duchy a země.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, FOCUS_TREES, FOCUS_BY_ID, applyFx, fxText } from '../src/engine/index.js';
import { big, grow, BIG_TREES, GROW, DEFAULT_BIG } from '../src/data/nat/focuses_big.js';
import { SPIRITS } from '../src/data/nat/spirits.js';
import { relOf } from '../src/engine/dip/core.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];

describe('rozsah stromů', () => {
  it('velmoci mají přes 40 cílů, zajímavé země aspoň 16, výchozí strom přes 30; celkem přes 600', () => {
    for (const t of ['GER', 'SOV', 'ENG', 'FRA', 'ITA']) expect(FOCUS_TREES[t].length, t).toBeGreaterThan(40);
    for (const t of Object.keys(GROW)) expect(FOCUS_TREES[t].length, t).toBeGreaterThanOrEqual(16);
    expect(FOCUS_TREES.DEFAULT).toBe(DEFAULT_BIG);
    expect(DEFAULT_BIG.length).toBeGreaterThan(30);
    expect(Object.values(FOCUS_TREES).reduce((a, t) => a + t.length, 0)).toBeGreaterThan(600);
  });
  it('původní cíle velmocí zůstaly (stejná id a první cíl dostupný hned)', () => {
    for (const id of ['ger_plan', 'ger_rearm', 'ger_luft', 'sov_plan', 'sov_conscr', 'eng_ind', 'eng_empire', 'fra_front', 'fra_spy', 'ita_ind', 'ita_navy', 'def_ind', 'def_def']) expect(FOCUS_BY_ID[id], id).toBeTruthy();
    for (const t of Object.keys(BIG_TREES)) expect(FOCUS_TREES[t].some((f) => !f.req.length && !f.any.length)).toBe(true);
  });
  it('duchové a země v účincích existují; každý duch z cíle má jen klíče bonusů', () => {
    for (const f of Object.values(FOCUS_BY_ID)) for (const e of f.fx) {
      if (e.t === 'spirit' || e.t === 'unspirit') expect(SPIRITS[e.id], `${f.id}: ${e.id}`).toBeTruthy();
      if (e.t === 'rel') { expect(idx(e.tag), `${f.id}: ${e.tag}`).toBeGreaterThan(0); expect(e.nm).toBeTruthy(); }
      if (e.t === 'bld') expect(['afb', 'radar', 'dok']).toContain(e.k);
      expect(fxText(e) === null || typeof fxText(e) === 'string').toBe(true);
    }
  });
});

describe('rozvržení', () => {
  it('big: větve vedle sebe, řádek = hloubka předpokladů i přes větve, AI podle hloubky a priority větve', () => {
    const t = big([
      { prio: 0, list: [['a1', 'A', 35, [], []], ['a2', 'A2', 35, ['a1'], []], ['a3', 'A3', 35, ['a1'], []]] },
      { prio: 2, list: [['b1', 'B', 35, ['a2'], []], ['b2', 'B2', 35, [], []]] },
    ]);
    const at = Object.fromEntries(t.map((f) => [f.id, f]));
    expect([at.a1.x, at.a1.y, at.a2.x, at.a2.y, at.a3.x, at.a3.y]).toEqual([0, 0, 0, 1, 1, 1]);
    expect([at.b1.x, at.b1.y, at.b2.x, at.b2.y]).toEqual([2, 2, 2, 0]);   // druhá větev začíná za nejširším řádkem první
    expect(at.b1.ai).toBe(22);
    expect(at.a1.ai).toBe(0);
  });
  it('grow: nové cíle pod původní strom a AI je plní až po něm', () => {
    const base = [{ id: 'x_a', x: 0, y: 0, ai: 1 }, { id: 'x_b', x: 1, y: 2, ai: 5 }];
    const t = grow(base, [['x_c', 'C', 35, ['x_b'], []], ['x_d', 'D', 35, ['x_c'], []]]);
    expect(t.slice(2).map((f) => [f.x, f.y])).toEqual([[0, 3], [0, 4]]);
    expect(Math.min(...t.slice(2).map((f) => f.ai))).toBeGreaterThan(5);
  });
});

describe('nové účinky', () => {
  it('rel zlepší vztahy, bld přidá letiště (do stropu státu) a loděnici do státu s přístavem', () => {
    const s = createGame({ player: null, aiLevel: 2 });
    const GER = idx('GER'), ITA = idx('ITA');
    const r = applyFx(s, GER, [{ t: 'rel', tag: 'ITA', nm: 'Itálie', v: 40 }]);
    expect(relOf(r, GER, ITA)).toBeGreaterThan(relOf(s, GER, ITA));
    expect(applyFx(s, GER, [{ t: 'rel', tag: 'GER', v: 40 }])).toBe(s);   // sama se sebou nic
    const sum = (st, k) => st.ind.st.reduce((n, x, i) => n + (x && st.stateOwner[i] === GER ? x[k] || 0 : 0), 0);
    const a = applyFx(s, GER, [{ t: 'bld', k: 'afb', n: 2 }]);
    expect(sum(a, 'afb')).toBe(sum(s, 'afb') + 2);   // hlavní stát, a když je plný, největší další
    expect(a.ind.st.every((x) => !x || (x.afb || 0) <= 5)).toBe(true);
    const docks = (st) => sum(st, 'dok');
    const d = applyFx(s, GER, [{ t: 'bld', k: 'dok', n: 1 }]);
    expect(docks(d)).toBe(docks(s) + 1);
    expect(applyFx(s, GER, [{ t: 'bld', k: 'civ', n: 1 }])).toBe(s);   // továrny jdou přes `factory`
    expect(fxText({ t: 'rel', tag: 'ITA', nm: 'Itálie', v: 40 })).toBe('Vztahy: Itálie +40');
    expect(fxText({ t: 'bld', k: 'radar', n: 2 })).toBe('2× radarová stanice');
  });
});
