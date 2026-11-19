// Alternativní cesty a modernizace (M100): rozsah stromů, vzájemně výlučné cesty, účinek `gov`, volba AI s historií i bez ní, zakořenění nové vlády.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, FOCUS_TREES, FOCUS_BY_ID, applyFx, fxText, ideologyOf } from '../src/engine/index.js';
import { IDEO_ORDER } from '../src/data/politics/ideology.js';
import { SPIRITS } from '../src/data/nat/spirits.js';
import { aiMayFocus } from '../src/engine/nat/day.js';
import { focusStatus } from '../src/engine/nat/core.js';
import { partiesDay } from '../src/engine/politics/parties.js';
import { ALT_BRANCHES, ALT_GROW, MOD_GROW } from '../src/data/nat/focuses_alt.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const tags = Object.keys(FOCUS_TREES);

describe('rozsah', () => {
  it('celkem přes 2000 cílů; každá země má cesty i modernizaci', () => {
    expect(Object.values(FOCUS_TREES).reduce((a, t) => a + t.length, 0)).toBeGreaterThan(2000);
    for (const t of tags) {
      const tree = FOCUS_TREES[t];
      expect(tree.filter((f) => f.path === 'hist').length, t).toBe(1);
      expect(tree.filter((f) => f.path === 'alt').length, t).toBeGreaterThanOrEqual(3);
      expect(tree.some((f) => f.id.includes('_mod_final')), t).toBe(true);
    }
    for (const t of ['GER', 'SOV', 'ENG', 'FRA', 'ITA']) expect(FOCUS_TREES[t].length, t).toBeGreaterThan(105);
    for (const t of Object.keys(ALT_GROW)) expect(FOCUS_TREES[t].length, t).toBeGreaterThanOrEqual(45);
    expect(Object.keys(MOD_GROW).length).toBe(30);
  });
  it('cesty se navzájem vylučují; alternativa má cíl se změnou vlády a duchy existují', () => {
    for (const t of tags) {
      const roots = FOCUS_TREES[t].filter((f) => f.path);
      for (const r of roots) for (const o of roots) if (o !== r) expect(r.excl, `${t}: ${r.id}`).toContain(o.id);
      // aspoň dvě alternativy vedou (do dvou kroků) ke změně vlády; ostatní jsou reformy uvnitř režimu (NEP, imperiální federace)
      const govs = roots.filter((f) => f.path === 'alt').filter((r) => FOCUS_TREES[t].some((f) => (f.req.includes(r.id) || f.req.some((q) => FOCUS_BY_ID[q]?.req.includes(r.id))) && f.fx.some((e) => e.t === 'gov')));
      expect(govs.length, t).toBeGreaterThanOrEqual(2);
      for (const f of FOCUS_TREES[t]) for (const e of f.fx) {
        if (e.t === 'gov') { expect(IDEO_ORDER).toContain(e.i); expect(fxText(e)).toMatch(/^Nová vláda: /); }
        if (e.t === 'spirit' || e.t === 'unspirit') expect(SPIRITS[e.id], `${f.id}: ${e.id}`).toBeTruthy();
      }
    }
    expect(ALT_BRANCHES.GER[0].list.length).toBeGreaterThan(20);
  });
});

describe('účinek gov', () => {
  it('změní vládu, podpoří stranu a nová vláda se udrží (podpora se vrací k prohozenému rozložení)', () => {
    const s = createGame({ player: null });
    const CZE = idx('CZE');
    expect(ideologyOf(s, CZE)).toBe('democracy');
    let t = applyFx(s, CZE, [{ t: 'gov', i: 'communism', v: 30 }]);
    expect(ideologyOf(t, CZE)).toBe('communism');
    expect(t.pol.own[CZE].par.communism).toBeGreaterThan(s.pol.own[CZE].par.communism + 20);
    for (let d = 0; d < 400; d++) t = { ...partiesDay(t, () => false), tick: t.tick + 24 };
    expect(ideologyOf(t, CZE)).toBe('communism');
    expect(t.pol.own[CZE].par.communism).toBeGreaterThan(t.pol.own[CZE].par.democracy);
    expect(applyFx(s, CZE, [{ t: 'gov', i: 'neco', v: 30 }])).toBe(s);
  });
});

describe('volba AI', () => {
  it('historická AI cesty vynechá; bez historie zvolí z dostupných právě jednu', () => {
    const s = createGame({ player: null, aiLevel: 2 });
    const GER = idx('GER'), own = s.nat.own[GER];
    const roots = FOCUS_TREES.GER.filter((f) => f.path);
    expect(roots.every((f) => focusStatus(own, f) === 'available')).toBe(true);
    expect(roots.some((f) => aiMayFocus(s, GER, own, f))).toBe(false);
    expect(aiMayFocus(s, GER, own, FOCUS_BY_ID.ger_plan)).toBe(true);
    const free = { ...s, ai: { ...s.ai, hist: 0 } };
    const pick = (st0) => {
      const chosen = new Set();
      for (let day = 0; day < 60; day++) {
        const st = { ...st0, tick: day * 24 };
        const ok = roots.filter((f) => aiMayFocus(st, GER, own, f));
        expect(ok).toHaveLength(1);
        chosen.add(ok[0].id);
      }
      return chosen;
    };
    // F2: bez opory v zemi (velmoc pod 30 %) se alternativní cesta nevolí – Německo zůstane na historické
    expect([...pick(free)]).toEqual(roots.filter((f) => f.path === 'hist').map((f) => f.id));
    // se silnou komunistickou stranou je komunistická cesta možná (ale vzácná): různé dny a hry dávají různé cesty
    const pol = free.pol.own.slice();
    pol[GER] = { ...pol[GER], par: { ...pol[GER].par, communism: 35 } };
    const strong = pick({ ...free, pol: { ...free.pol, own: pol } });
    expect(strong.size).toBeGreaterThan(1);
    expect([...strong].every((id) => FOCUS_BY_ID[id].path === 'hist' || /com/.test(id))).toBe(true);
  });
});
