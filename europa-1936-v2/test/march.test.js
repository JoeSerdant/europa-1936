// F3 – pohyb divizí jako v HOI4: odhad příjezdu (marchEta, marchPreview), přímý rozkaz má přednost před plánem armády (`mo`),
// ruční velení armády (`takeCommand`, `man`) a čáry rozkazů na mapě (začátek u posunutého žetonu, cizí rozkazy v mlze skryté).
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGame, findPath, orderMove, createArmy, setPlan, clearPlan, takeCommand, marchEta, marchPreview, advance, advanceHour, declareWar,
} from '../src/engine/index.js';
import { gameStore, uiStore, NONE } from '../src/ui/store.js';
import * as A from '../src/ui/actions.js';
import { routesOf, routeStart } from '../src/ui/map/units.js';
import { geo } from '../src/engine/index.js';
import { fmtEta } from '../src/ui/format.js';
import { emptyBattlefield, addDivision, realBorder, giveSides, idx, W } from './armyKit.js';

const GER = idx('GER'), POL = idx('POL');
const cap = W.owners[GER].cap;

/** Vlastní provincie Německa, kam vede cesta o `min`–`max` krocích (pro pochod bez bojů). */
function farHome(s, min = 5, max = 8) {
  for (let p = 1; p <= W.L; p++) {
    if (s.ctrl[p] !== GER || p === cap) continue;
    const path = findPath(s.mil, s.ctrl, GER, cap, p, { dip: s.dip });
    if (path && path.length >= min && path.length <= max) return { p, path };
  }
  throw new Error('nenalezeno');
}

describe('odhad příjezdu', () => {
  it('marchEta odpovídá skutečné době pochodu (bez bojů)', () => {
    let s = emptyBattlefield('GER'), id;
    [s, id] = addDivision(s, 'GER', 'pesi', cap);
    const { p } = farHome(s);
    s = orderMove(s, [id], p);
    const eta = marchEta(s, [id]);
    expect(eta.dest).toBe(p);
    expect(eta.moving).toBe(1);
    expect(eta.hours).toBeGreaterThan(0);
    let h = 0;
    while (s.mil.divs[id].path.length && h < 24 * 60) { s = advanceHour(s); h++; }
    expect(s.mil.divs[id].p).toBe(p);
    expect(Math.abs(h - eta.hours) / h).toBeLessThan(0.3);   // odhad: počasí a organizace cestou se mění
  });
  it('bez rozkazu není co odhadovat; nejpomalejší divize určuje čas', () => {
    let s = emptyBattlefield('GER'), a, b;
    [s, a] = addDivision(s, 'GER', 'pesi', cap);
    [s, b] = addDivision(s, 'GER', 'pesi', cap, { org: 1 });   // bez organizace pochoduje pomaleji
    expect(marchEta(s, [a, b]).hours).toBe(-1);
    const { p } = farHome(s);
    s = orderMove(s, [a, b], p);
    const ha = marchEta(s, [a]).hours, hb = marchEta(s, [b]).hours;
    expect(hb).toBeGreaterThan(ha);
    expect(marchEta(s, [a, b]).hours).toBe(hb);
  });
  it('náhled rozkazu vede stejnou cestou jako rozkaz a hlásí útok', () => {
    let s = emptyBattlefield('GER'), id;
    [s, id] = addDivision(s, 'GER', 'pesi', cap);
    const { p, path } = farHome(s);
    const pv = marchPreview(s, [id], p);
    expect(pv.routes).toHaveLength(1);
    expect(pv.routes[0].nodes).toEqual([cap, ...path]);
    expect(pv.attack).toBe(false);
    expect(pv.hours).toBe(marchEta(orderMove(s, [id], p), [id]).hours);
    expect(marchPreview(s, [id], cap)).toBe(null);             // už tam stojí
    expect(marchPreview(s, [id], W.L + 1)).toBe(null);         // moře
    const border = realBorder('GER', 'POL');
    let w = giveSides(emptyBattlefield('GER'), 'GER', 'POL', border.from, border.to), d;
    [w, d] = addDivision(w, 'GER', 'pesi', border.from);
    w = declareWar(w, 'GER', 'POL');
    expect(marchPreview(w, [d], border.to).attack).toBe(true);
  });
  it('formát odhadu', () => {
    expect(fmtEta(5)).toBe('5 h');
    expect(fmtEta(52)).toBe('2 d 4 h');
    expect(fmtEta(48)).toBe('2 d');
    expect(fmtEta(24 * 12 + 5)).toBe('12 d');
  });
});

describe('přímý rozkaz a plán armády', () => {
  /** Německo s jednou divizí v armádě, která má hráčův plán Hájit oblast (hlavní město). */
  function withPlan() {
    let s = emptyBattlefield('GER'), id;
    [s, id] = addDivision(s, 'GER', 'pesi', cap);
    s = createArmy(s, 'GER', 'Test', [id]);
    const army = s.mil.armies.length - 1;
    s = setPlan(s, army, { k: 'area', area: [cap] });
    return { s, id, army };
  }
  it('rozkaz si pamatuje cíl (`mo`) a plán ho nechá doběhnout', () => {
    const { s: s0, id } = withPlan();
    const { p } = farHome(s0);
    const s = orderMove(s0, [id], p);
    expect(s.mil.divs[id].mo).toBe(p);
    const later = advance(s, 24);                                 // půlnoc: plánovač armád
    expect(later.mil.divs[id].path.at(-1)).toBe(p);
    // bez značky přímého rozkazu by plán divizi vrátil k hlavnímu městu (dřívější chování)
    const divs = s.mil.divs.slice(); divs[id] = { ...divs[id], mo: 0 };
    const old = advance({ ...s, mil: { ...s.mil, divs } }, 24);
    expect(old.mil.divs[id].path.at(-1) ?? old.mil.divs[id].p).toBe(cap);
  });
  it('po příchodu do cíle se divize vrátí k plánu', () => {
    const { s: s0, id } = withPlan();
    const { p } = farHome(s0);
    let s = orderMove(s0, [id], p), h = 0;
    while (s.mil.divs[id].path.length && h < 24 * 60) { s = advanceHour(s); h++; }
    expect(s.mil.divs[id].p).toBe(p);
    s = advance(s, 24);
    expect(s.mil.divs[id].path.at(-1)).toBe(cap);
  });
  it('ruční velení: automatický plán zmizí a automatická obrana armádu už nepřebírá', () => {
    let s = declareWar(createGame({ player: 'POL', aiLevel: 2 }), 'GER', 'POL');
    const army = s.mil.armies.findIndex((a) => a && a.o === POL && a.plan && a.plan.auto);
    expect(army).toBeGreaterThan(0);
    s = takeCommand(s, [army]);
    expect(s.mil.armies[army]).toMatchObject({ plan: null, man: 1 });
    expect(takeCommand(s, [army])).toBe(s);                      // podruhé nic
    s = advance(s, 24 * 8);                                       // týdenní posun automatických plánů
    expect(s.mil.armies[army].plan).toBe(null);
    s = declareWar(s, 'SOV', 'POL');                              // nová válka: ostatní bez plánu dostanou obranu, tahle ne
    expect(s.mil.armies[army].plan).toBe(null);
  });
  it('vlastní plán hráče takeCommand nechá', () => {
    const { s, army } = withPlan();
    const t = takeCommand(s, [army]);
    expect(t.mil.armies[army].plan).toEqual(s.mil.armies[army].plan);
    expect(t.mil.armies[army].man).toBe(1);
    expect(clearPlan(t, army).mil.armies[army].plan).toBe(null);
  });
});

describe('rozhraní: rozkaz a čáry na mapě', () => {
  beforeEach(() => {
    A.goMenu();
    A.startGame('GER');
    gameStore.setState(emptyBattlefield('GER'));
    uiStore.setState({ ...uiStore.getState(), selDivs: NONE, panel: null, planEdit: null, toast: null });
  });
  it('přímý rozkaz divizím armády s automatickým plánem převezme armádu do ručního velení', () => {
    let s = gameStore.getState(), id;
    [s, id] = addDivision(s, 'GER', 'pesi', cap);
    s = createArmy(s, 'GER', 'Test', [id]);
    const army = s.mil.armies.length - 1;
    const armies = s.mil.armies.slice(); armies[army] = { ...armies[army], plan: { k: 'area', area: [cap], auto: true } };
    gameStore.setState({ ...s, mil: { ...s.mil, armies } });
    A.setSelection([id]);
    const { p } = farHome(s);
    const pv = A.routePreview(p);
    expect(pv.hours).toBeGreaterThan(0);
    expect(A.orderSelected(p)).toBe(true);
    expect(gameStore.getState().mil.armies[army]).toMatchObject({ plan: null, man: 1 });
    expect(uiStore.getState().toast.text).toMatch(/automatická obrana zrušena/);
  });
  it('čára rozkazu začíná u žetonu na cestě; cizí rozkazy v mlze války nejsou vidět', () => {
    const border = realBorder('GER', 'POL');
    let s = giveSides(gameStore.getState(), 'GER', 'POL', border.from, border.to), a, b;
    [s, a] = addDivision(s, 'GER', 'pesi', border.from, { path: [border.to], prog: 50 });
    [s, b] = addDivision(s, 'POL', 'pesi', border.to, { path: [border.from] });
    const g = geo(W);
    const routes = routesOf(s);
    expect(routes).toHaveLength(1);                               // polský rozkaz hráč nevidí
    expect(routes[0].ids).toEqual([a]);
    const [x, y] = routeStart(g, routes[0]);
    expect(x).toBeCloseTo((g.cx[border.from] + g.cx[border.to]) / 2, 5);
    expect(y).toBeCloseTo((g.cy[border.from] + g.cy[border.to]) / 2, 5);
    expect(routesOf({ ...s, rules: { ...s.rules, fog: 0 } }).map((r) => r.ids[0]).sort()).toEqual([a, b].sort());   // bez mlhy vidět vše
  });
});
