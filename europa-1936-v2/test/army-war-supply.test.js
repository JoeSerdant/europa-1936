// M18 – války, cesty, mír, zásobování.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, declareWar, makePeace, atWar, enemiesOf, findPath, pathHours, advanceHour, advance, supplyReach, supplyFlow, frontEdges,
  ARMY, divisionsByProvince,
} from '../src/engine/index.js';
import { emptyBattlefield, addDivision, duel, neighbors, idx, W } from './armyKit.js';

/** Hranice dvou zemí: [provincie a, provincie b]. */
function borderOf(ta, tb, s = createGame()) {
  for (let p = 1; p <= W.L; p++) {
    if (s.ctrl[p] !== idx(ta)) continue;
    for (const q of neighbors(p)) if (s.ctrl[q] === idx(tb)) return [p, q];
  }
  return null;
}

describe('války', () => {
  it('vyhlášení války je symetrické, jednorázové a neplatný vstup nic nemění', () => {
    const s = createGame({ player: 'GER' });
    expect(atWar(s, 'GER', 'POL')).toBe(false);
    const t = declareWar(s, 'GER', 'POL');
    expect(t).not.toBe(s);
    expect(atWar(t, 'GER', 'POL')).toBe(true);
    expect(atWar(t, 'POL', 'GER')).toBe(true);
    expect(enemiesOf(t, 'GER')).toEqual([idx('POL')]);
    expect(declareWar(t, 'POL', 'GER')).toBe(t);
    expect(declareWar(s, 'GER', 'GER')).toBe(s);
    expect(declareWar(s, 'GER', 'XXX')).toBe(s);
    expect(declareWar(s, 'XXX', 'GER')).toBe(s);
    expect(s.mil.wars).toEqual([]);                                     // původní stav se nezměnil
  });

  it('obranná AI dostane po vyhlášení války plán Hájit oblast, hráč ne', () => {
    const s = declareWar(createGame({ player: 'GER' }), 'GER', 'POL');
    const polish = s.mil.armies.filter((a) => a && a.o === idx('POL'));
    expect(polish.length).toBeGreaterThan(0);
    for (const a of polish) { expect(a.plan && a.plan.k).toBe('area'); expect(a.plan.auto).toBe(true); expect(a.plan.area.length).toBeGreaterThan(0); }
    for (const a of s.mil.armies) if (a && a.o === idx('GER')) expect(a.plan).toBe(null);
  });

  it('mír vrátí okupované provincie, ukončí bitvy a pošle cizí jednotky domů', () => {
    const d = duel({});
    let s = d.s;
    s = advance(s, 30);
    expect(s.mil.battles.length).toBe(1);
    // simulovaná okupace: provincie obránce patří Polsku, ale drží ji Německo
    const ctrl = s.ctrl.slice();
    ctrl[d.to] = idx('GER');
    const stateOwner = s.stateOwner.slice();
    stateOwner[W.provState[d.to]] = idx('POL');
    s = { ...s, ctrl, stateOwner, ownerVer: s.ownerVer + 1 };
    const before = s;
    const t = makePeace(s, 'POL', 'GER');
    expect(t).not.toBe(before);
    expect(atWar(t, 'GER', 'POL')).toBe(false);
    expect(t.mil.battles).toEqual([]);
    expect(t.ctrl[d.to]).toBe(idx('POL'));
    expect(t.ownerVer).toBeGreaterThan(before.ownerVer);
    for (const id of [...d.A, ...d.D]) {
      const dv = t.mil.divs[id];
      if (!dv) continue;
      expect(dv.b).toBe(0);
      expect(t.ctrl[dv.p]).toBe(dv.o);
    }
    expect(makePeace(t, 'POL', 'GER')).toBe(t);                         // už není válka
  });

  it('mír mezi jinými zeměmi se války GER–POL netýká', () => {
    let s = declareWar(createGame(), 'GER', 'POL');
    s = declareWar(s, 'FRA', 'ITA');
    const t = makePeace(s, 'FRA', 'ITA');
    expect(atWar(t, 'GER', 'POL')).toBe(true);
    expect(atWar(t, 'FRA', 'ITA')).toBe(false);
  });

  it('linie fronty: sousední provincie s držiteli ve válce', () => {
    const [a, b] = borderOf('GER', 'POL');
    const s = createGame();
    const w1 = frontEdges(s);
    expect(w1.size).toBe(0);
    const t = declareWar(s, 'GER', 'POL');
    const e = frontEdges(t);
    expect(e.size).toBeGreaterThan(5);
    expect(e.has(Math.min(a, b) * 4096 + Math.max(a, b))).toBe(true);
    expect(frontEdges(t)).toBe(e);                                      // cachováno
  });
});

describe('hledání cest', () => {
  it('neutrální cizí území je zavřené, nepřátelské otevřené', () => {
    const s = createGame();
    const [a, b] = borderOf('GER', 'POL', s);
    expect(findPath(s.mil, s.ctrl, idx('GER'), a, b)).toBe(null);
    const t = declareWar(s, 'GER', 'POL');
    expect(findPath(t.mil, t.ctrl, idx('GER'), a, b)).toEqual([b]);
  });

  it('cesta vede jen po sousedních provinciích a nepoužívá průlivy', () => {
    const s = createGame();
    const g = idx('GER');
    const own = [];
    for (let p = 1; p <= W.L; p++) if (s.ctrl[p] === g) own.push(p);
    const from = own[0], to = own[own.length - 1];
    const path = findPath(s.mil, s.ctrl, g, from, to);
    if (path) {
      let prev = from;
      for (const q of path) {
        let kind = -1;
        W.forLandNeighbors(prev, (t, k) => { if (t === q) kind = k; });
        expect(kind, `${prev}→${q}`).toBeGreaterThanOrEqual(0);
        expect(kind).not.toBe(2);
        expect(s.ctrl[q]).toBe(g);
        prev = q;
      }
      expect(prev).toBe(to);
      expect(pathHours(from, path)).toBeGreaterThan(0);
    }
  });

  it('průliv nelze přejít ani když oba břehy patří téže zemi', () => {
    const s = createGame();
    for (let p = 1; p <= W.L; p++) {
      let found = 0;
      W.forLandNeighbors(p, (q, k) => { if (k === 2 && s.ctrl[q] === s.ctrl[p] && !found) found = q; });
      if (!found) continue;
      const path = findPath(s.mil, s.ctrl, s.ctrl[p], p, found);
      expect(path === null || path.length > 1).toBe(true);
      return;
    }
  });

  it('neplatné vstupy', () => {
    const s = createGame();
    expect(findPath(s.mil, s.ctrl, idx('GER'), 1, 1)).toBe(null);
    expect(findPath(s.mil, s.ctrl, idx('GER'), 0, 5)).toBe(null);
    expect(findPath(s.mil, s.ctrl, idx('GER'), 5, W.L + 10)).toBe(null);
  });
});

describe('zásobování', () => {
  const s = createGame();

  it('nejsilnější je hlavní město a tok existuje jen na vlastním území', () => {
    for (const tag of ['GER', 'FRA', 'SOV', 'POL']) {
      const o = idx(tag), f = supplyFlow(s.ctrl, o), cap = W.owners[o].cap;
      expect(f[cap], tag).toBeCloseTo(ARMY.SUP_CAPITAL, 3);
      for (let p = 1; p <= W.L; p++) {
        if (s.ctrl[p] !== o) expect(f[p]).toBe(0);
        expect(f[p]).toBeLessThanOrEqual(ARMY.SUP_CAPITAL + 1e-6);
      }
    }
  });

  it('většina území Německa a Polska je zásobená, kolonie a periferie hůř', () => {
    for (const tag of ['GER', 'POL']) {
      const o = idx(tag), f = supplyFlow(s.ctrl, o);
      let ok = 0, n = 0;
      for (let p = 1; p <= W.L; p++) if (s.ctrl[p] === o) { n++; if (f[p] * ARMY.SUP_CAPACITY >= 3) ok++; }
      expect(ok / n, tag).toBeGreaterThan(0.6);
    }
  });

  it('pro stejné obsazení vrací mezipaměť tentýž objekt, po změně nový', () => {
    const o = idx('GER');
    const f1 = supplyFlow(s.ctrl, o);
    expect(supplyFlow(s.ctrl.slice(), o)).toBe(f1);                      // stejný obsah = stejný výsledek
    expect(supplyReach(s, 'GER')).toBe(f1);
    const ctrl = s.ctrl.slice();
    const cap = W.owners[o].cap;
    ctrl[cap] = idx('FRA');
    const f2 = supplyFlow(ctrl, o);
    expect(f2).not.toBe(f1);
    expect(f2[cap]).toBe(0);
    expect(supplyFlow(s.ctrl, o)[cap]).toBeGreaterThan(0);               // původní není ovlivněn
  });

  it('bez hlavního města zbudou jen slabé místní zásoby v uzlech', () => {
    const o = idx('GER');
    const ctrl = s.ctrl.slice();
    ctrl[W.owners[o].cap] = idx('FRA');
    const f = supplyFlow(ctrl, o);
    let max = 0;
    for (let p = 1; p <= W.L; p++) max = Math.max(max, f[p]);
    expect(max).toBeLessThanOrEqual(ARMY.SUP_LOCAL + 1e-6);
    expect(max).toBeGreaterThan(0);
  });

  it('denní krok: přeplněná provincie vyčerpá zásobu v batohu a sníží strop organizace', () => {
    // 24 divizí v hlavním městě: potřebují asi 14 zásob za hodinu, město jich dá 7,5
    const cap = W.owners[idx('POL')].cap;
    let st = emptyBattlefield();
    const ids = [];
    for (let i = 0; i < 24; i++) { let id; [st, id] = addDivision(st, 'POL', 'pesi', cap); ids.push(id); }
    st = advance(st, 24 * 2);
    const d2 = st.mil.divs[ids[0]];
    expect(d2.sup).toBeLessThan(0.7);
    expect(d2.sg).toBeLessThan(ARMY.SUP_GRACE);
    st = advance(st, 24 * 6);
    const d8 = st.mil.divs[ids[0]];
    expect(d8.sg).toBe(0);
    expect(d8.org).toBeLessThan(50 * 0.8);                               // strop organizace klesá s nedostatkem
    expect(d8.hp).toBeLessThan(d2.hp);                                   // a síla se ztrácí
  });

  it('dobře zásobená divize si drží plnou zásobu', () => {
    let st = emptyBattlefield();
    const cap = W.owners[idx('GER')].cap;
    let id;
    [st, id] = addDivision(st, 'GER', 'pesi', cap, { sg: 10, sup: 0.5 });
    st = advance(st, 24 * 6);
    const d = st.mil.divs[id];
    expect(d.sup).toBe(1);
    expect(d.sg).toBe(ARMY.SUP_GRACE);
  });

  it('divisionsByProvince je cachované podle pole divizí', () => {
    const t = createGame();
    expect(divisionsByProvince(t)).toBe(divisionsByProvince(t));
    const u = advanceHour(t);
    expect([...divisionsByProvince(u).values()].reduce((n, a) => n + a.length, 0)).toBe(t.mil.divs.length - 1);
  });
});
