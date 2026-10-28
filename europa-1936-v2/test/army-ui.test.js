// M18 – rozhraní armády: čistá logika (souhrny, návrhář šablon, žetony na mapě), akce (výběr, rozkazy, plány, nábor, šablony), mapový režim Zásobování
// a vykreslování okupace. Samotné React komponenty se tu netestují (běží v Node bez DOM) – ty hlídá Playwright (tools/smoke.mjs).
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGame, getWorld, geo, deriveStats, declareWar, atWar, suggestFront, divisionCount, armyTree, templatesOf, createArmy, assignDivisions,
  supplyFlow, TPL_KINDS,
} from '../src/engine/index.js';
import { gameStore, uiStore, NONE } from '../src/ui/store.js';
import * as A from '../src/ui/actions.js';
import { summarize, planText, provName } from '../src/ui/army/helpers.js';
import { placeBattalion, removeBattalion, toggleSupport, setName } from '../src/ui/army/designer.js';
import { buildCounters, clusterCounters, clusterCell, routesOf, battlesOf } from '../src/ui/map/units.js';
import { fillColors, supplyColor, rgbCss, MODES } from '../src/ui/map/colors.js';
import { buildGeometry } from '../src/ui/map/geometry.js';
import { MapRenderer } from '../src/ui/map/renderer.js';
import { createCamera, resizeCamera } from '../src/ui/map/camera.js';
import { emptyBattlefield, addDivision, realBorder, giveSides, neighbors, idx, W } from './armyKit.js';

const GER = idx('GER'), POL = idx('POL');

/** Hra za Německo bez jednotek, vložená do úložiště rozhraní. */
function freshBattlefield() {
  A.goMenu();
  A.startGame('GER');
  const s = emptyBattlefield('GER');
  gameStore.setState(s);
  uiStore.setState({ ...uiStore.getState(), selDivs: NONE, panel: null, planEdit: null, designer: null, toast: null, open: {}, selected: 0 });
  return s;
}
const put = (tag, kind, p, extra) => {
  let id;
  const [s, i] = addDivision(gameStore.getState(), tag, kind, p, extra);
  id = i;
  gameStore.setState(s);
  return id;
};
const game = () => gameStore.getState();
const ui = () => uiStore.getState();
const capital = W.owners[GER].cap;

// ------------------------------------------------------------------------------------------------------------------------------
describe('souhrny a texty panelu armády', () => {
  it('summarize: počty, průměrná síla a organizace, druhy a stavy', () => {
    let s = emptyBattlefield('GER');
    let a, b, c;
    [s, a] = addDivision(s, 'GER', 'pesi', capital);
    const max = deriveStats(s.mil.tpl[s.mil.divs[a].tpl]);
    [s, b] = addDivision(s, 'GER', 'pesi', capital, { hp: max.hp / 2, path: [neighbors(capital)[0]] });
    [s, c] = addDivision(s, 'GER', 'tank', capital, { sup: 0.4, sg: 10 });
    const sum = summarize(s, [a, b, c, 999]);                      // neexistující id se přeskočí
    expect(sum.n).toBe(3);
    expect(sum.hp).toBeCloseTo((1 + 0.5 + 1) / 3, 5);
    expect(sum.moving).toBe(1);
    expect(sum.idle).toBe(2);
    expect(sum.lack).toBe(1);
    expect(sum.classes).toEqual({ inf: 2, arm: 1 });
    expect([...sum.owners]).toEqual([GER]);
    expect(summarize(s, []).n).toBe(0);
  });

  it('planText: bez plánu, hájení oblasti i linie fronty se správným skloňováním', () => {
    expect(planText(null)).toBe('Bez plánu');
    expect(planText({ k: 'area', area: [1, 2, 3] })).toBe('Hájit oblast · 3 provincie');
    expect(planText({ k: 'area', area: [1, 2, 3, 4, 5] })).toBe('Hájit oblast · 5 provincií');
    expect(planText({ k: 'front', line: [1], to: [2], mode: 'balanced' })).toBe('Linie fronty · 1 provincie → 1 cíl · Vyváženě');
    expect(planText({ k: 'front', line: [1, 2], to: [], mode: 'rush' })).toBe('Linie fronty · 2 provincie · Zteče');
    expect(planText({ k: 'front', line: [1, 2], to: [3, 4, 5, 6, 7], mode: 'careful' })).toBe('Linie fronty · 2 provincie → 5 cílů · Opatrně');
    expect(provName(capital).length).toBeGreaterThan(0);
  });
});

// ------------------------------------------------------------------------------------------------------------------------------
describe('návrhář šablon: úpravy rozpracované šablony', () => {
  const base = Object.freeze({ nm: 'T', reg: Object.freeze([Object.freeze(['pesi', 'pesi']), Object.freeze(['pesi'])]), sup: Object.freeze([]) });

  it('položení praporu: přepíše obsazené místo, přidá na konec pluku nebo založí nový pluk; vstup se nemění', () => {
    expect(placeBattalion(base, 0, 0, 'jezdci').reg[0]).toEqual(['jezdci', 'pesi']);
    expect(placeBattalion(base, 0, 4, 'jezdci').reg[0]).toEqual(['pesi', 'pesi', 'jezdci']);      // volné místo → konec pluku, bez mezer
    expect(placeBattalion(base, 4, 0, 'motor').reg).toEqual([['pesi', 'pesi'], ['pesi'], ['motor']]);
    expect(placeBattalion(base, 0, 0, 'pesi')).toBe(base);                                         // beze změny
    expect(base.reg[0]).toEqual(['pesi', 'pesi']);
  });

  it('limity: nejvýš 5 pluků po 5 praporech', () => {
    let d = { nm: 'T', reg: [['pesi']], sup: [] };
    for (let c = 1; c < 8; c++) d = placeBattalion(d, c, 0, 'pesi');
    expect(d.reg.length).toBe(5);
    expect(placeBattalion(d, 5, 0, 'pesi')).toBe(d);
    for (let r = 1; r < 8; r++) d = placeBattalion(d, 0, r, 'pesi');
    expect(d.reg[0].length).toBe(5);
    expect(placeBattalion(d, 0, 5, 'pesi')).toBe(d);
  });

  it('odebrání praporu: prázdný pluk zanikne, neplatné místo nic nezmění', () => {
    expect(removeBattalion(base, 0, 1).reg).toEqual([['pesi'], ['pesi']]);
    expect(removeBattalion(base, 1, 0).reg).toEqual([['pesi', 'pesi']]);
    expect(removeBattalion(base, 2, 0)).toBe(base);
    expect(removeBattalion(base, 0, 7)).toBe(base);
    expect(removeBattalion(base, -1, 0)).toBe(base);
  });

  it('podpůrné roty se přepínají a je jich nejvýš pět', () => {
    let d = toggleSupport(base, 'del');
    expect(d.sup).toEqual(['del']);
    expect(toggleSupport(d, 'del').sup).toEqual([]);
    d = { ...base, sup: ['ing', 'del', 'pt', 'zvid', 'spoj'] };
    expect(toggleSupport(d, 'log')).toBe(d);
    expect(toggleSupport(d, 'pt').sup).toEqual(['ing', 'del', 'zvid', 'spoj']);
    expect(setName(base, 'Nový').nm).toBe('Nový');
    expect(setName(base, 'T')).toBe(base);
  });
});

// ------------------------------------------------------------------------------------------------------------------------------
describe('žetony na mapě: data', () => {
  const border = realBorder('GER', 'POL');

  it('divize stejné země ve stejné provincii tvoří jeden žeton, cizí země zvlášť', () => {
    let s = emptyBattlefield('GER');
    [s] = addDivision(s, 'GER', 'pesi', border.from);
    [s] = addDivision(s, 'GER', 'tank', border.from);
    [s] = addDivision(s, 'GER', 'pesi', capital);
    [s] = addDivision(s, 'POL', 'pesi', border.from);
    const list = buildCounters(s, W);
    expect(list.length).toBe(3);
    const merged = list.find((c) => c.o === GER && c.p === border.from);
    expect(merged.n).toBe(2);
    expect(merged.ids.length).toBe(2);
    expect(merged.kinds).toEqual({ inf: 1, arm: 1 });
    const g = geo(W);
    expect(merged.x).toBeCloseTo(g.cx[border.from], 5);
    expect(list.some((c) => c.o === POL && c.n === 1)).toBe(true);
  });

  it('divize na pochodu mají vlastní žeton mezi provinciemi, stojící divize v bitvě zůstane v provincii', () => {
    let s = emptyBattlefield('GER');
    let moving, still;
    [s, moving] = addDivision(s, 'GER', 'pesi', border.from, { path: [border.to], prog: 50 });
    [s, still] = addDivision(s, 'GER', 'pesi', border.from);
    const list = buildCounters(s, W);
    expect(list.length).toBe(2);
    const m = list.find((c) => c.ids.includes(moving)), o = list.find((c) => c.ids.includes(still));
    const g = geo(W);
    expect(m.next).toBe(border.to);
    expect(m.x).toBeCloseTo((g.cx[border.from] + g.cx[border.to]) / 2, 3);
    expect(o.next).toBe(0);
    // postup pod hranicí 6 % se kreslí ještě v provincii
    const [s2] = addDivision(emptyBattlefield('GER'), 'GER', 'pesi', border.from, { path: [border.to], prog: 3 });
    expect(buildCounters(s2, W)[0].next).toBe(0);
  });

  it('odznak nedostatku zásob: jen s nízkým zásobováním a vybraným batohem', () => {
    let s = emptyBattlefield('GER');
    [s] = addDivision(s, 'GER', 'pesi', capital, { sup: 0.2, sg: 10 });
    [s] = addDivision(s, 'GER', 'pesi', border.from, { sup: 0.2, sg: 70 });
    const [a, b] = buildCounters(s, W);
    expect(a.lack + b.lack).toBe(1);
  });

  it('shlukování: blízké žetony jedné země se sloučí, cizí ne; samotný žeton zůstane týž objekt', () => {
    let s = emptyBattlefield('GER');
    const nb = neighbors(border.from)[0];
    [s] = addDivision(s, 'GER', 'pesi', border.from);
    [s] = addDivision(s, 'GER', 'pesi', nb);
    [s] = addDivision(s, 'POL', 'pesi', border.from);
    const list = buildCounters(s, W);
    const huge = clusterCounters(list, 4096);
    expect(huge.length).toBe(2);                                    // německé dva jsou jeden shluk, polský zvlášť
    const ger = huge.find((c) => c.o === GER);
    expect(ger.n).toBe(2);
    expect(ger.merged).toBe(2);
    expect(ger.ids.length).toBe(2);
    const tiny = clusterCounters(list, 0.001);
    expect(tiny.length).toBe(3);
    expect(tiny.every((c) => list.includes(c))).toBe(true);
  });

  it('buňka shlukování je mocnina dvou (shluky se při posunu mapy nemění)', () => {
    for (const z of [0.1, 0.37, 1, 2.2, 5]) {
      const c = clusterCell(z, 40);
      expect(Math.log2(c) % 1).toBe(0);
      expect(c * z).toBeGreaterThanOrEqual(40);
    }
  });

  it('cesty a bitvy pro mapu: útok je cesta do nepřátelské provincie ve válce', () => {
    let s = emptyBattlefield('GER');
    s = giveSides(s, 'GER', 'POL', border.from, border.to);
    let a, b;
    [s, a] = addDivision(s, 'GER', 'pesi', border.from, { path: [border.to] });
    [s, b] = addDivision(s, 'GER', 'pesi', border.from, { path: [neighbors(border.from).find((q) => s.ctrl[q] === GER)] });
    expect(routesOf(s).every((r) => !r.attack)).toBe(true);        // bez války není co útočit
    s = declareWar(s, 'GER', 'POL');
    const routes = routesOf(s);
    expect(routes.length).toBe(2);
    expect(routes.find((r) => r.ids.includes(a)).attack).toBe(true);
    expect(routes.find((r) => r.ids.includes(b)).attack).toBe(false);
    expect(battlesOf(s)).toEqual([]);
  });
});

// ------------------------------------------------------------------------------------------------------------------------------
describe('výběr a rozkazy (akce)', () => {
  const border = realBorder('GER', 'POL');
  beforeEach(() => { freshBattlefield(); });

  it('klik na vlastní žeton vybere divize, Shift přidává a odebírá, cizí žeton jen k prohlídce', () => {
    const a = put('GER', 'pesi', capital), b = put('GER', 'pesi', neighbors(capital)[0]), p = put('POL', 'pesi', border.to);
    const [ca, cb, cp] = buildCounters(game(), W);
    A.clickCounter(ca, {});
    expect(ui().selDivs).toEqual([a]);
    A.clickCounter(cb, { shift: true });
    expect(ui().selDivs).toEqual([a, b]);
    A.clickCounter(cb, { shift: true });
    expect(ui().selDivs).toEqual([a]);
    A.clickCounter(cp, { shift: true });                           // cizí žeton Shiftem nepřidá k vlastním
    expect(ui().selDivs).toEqual([p]);
    expect(A.ownSelected()).toEqual([]);
  });

  it('dvojklik na žeton vybere celou armádu', () => {
    const a = put('GER', 'pesi', capital), b = put('GER', 'pesi', border.from), c = put('GER', 'pesi', capital);
    gameStore.setState(createArmy(game(), 'GER', 'Test', [a, b]));
    const list = buildCounters(game(), W);
    const ca = list.find((x) => x.ids.includes(a));
    A.clickCounter(ca, { dbl: true });
    expect(ui().selDivs.slice().sort()).toEqual([a, b].sort());
    expect(ui().selDivs).not.toContain(c);
  });

  it('rozkaz dostanou jen vlastní vybrané divize; cizí zůstanou stát', () => {
    const mine = put('GER', 'pesi', capital), foe = put('POL', 'pesi', border.to);
    A.setSelection([mine, foe]);
    expect(A.ownSelected()).toEqual([mine]);
    const target = neighbors(capital).find((q) => game().ctrl[q] === GER);
    expect(A.orderSelected(target)).toBe(true);
    expect(game().mil.divs[mine].path.length).toBeGreaterThan(0);
    expect(game().mil.divs[foe].path).toEqual([]);
    A.setSelection([foe]);
    const before = game();
    expect(A.orderSelected(target)).toBe(false);
    expect(game()).toBe(before);                                    // žádná změna stavu
    expect(A.stopSelected()).toBe(false);
  });

  it('pravé tlačítko bez výběru nic nedělá; s výběrem pošle jednotky, nedosažitelný cíl ukáže oznámení', () => {
    const mine = put('GER', 'pesi', capital);
    expect(A.contextClick(neighbors(capital)[0])).toBe(false);
    A.setSelection([mine]);
    expect(A.contextClick(neighbors(capital).find((q) => game().ctrl[q] === GER))).toBe(true);
    A.setSelection([mine]);
    expect(A.contextClick(W.L + 2)).toBe(false);                    // moře
    A.stopSelected();
    expect(game().mil.divs[mine].path).toEqual([]);
  });

  it('klik na mapu: zruší výběr jednotek a označí oblast; Shift výběr nechá; při úpravě plánu maluje provincie', () => {
    const a = put('GER', 'pesi', capital);
    A.setSelection([a]);
    A.mapClick(capital, {});
    expect(ui().selDivs.length).toBe(0);
    expect(ui().selected).toBe(capital);
    A.setSelection([a]);
    A.mapClick(border.from, { shift: true });
    expect(ui().selDivs).toEqual([a]);
    // úprava plánu
    gameStore.setState(createArmy(game(), 'GER', 'Plán', [a]));
    const army = game().mil.armies.length - 1;
    A.startPlanEdit(army, 'area');
    const before = ui().selected;
    A.mapClick(capital, {});
    expect(ui().planEdit.area).toEqual([capital]);
    expect(ui().selected).toBe(before);                             // během úpravy se označení oblasti nemění
    A.mapClick(capital, {});
    expect(ui().planEdit.area).toEqual([]);
  });

  it('Shift při malování plánu přidá celý stát; linie a cíle se nepřekrývají', () => {
    const a = put('GER', 'pesi', capital);
    gameStore.setState(createArmy(game(), 'GER', 'Plán', [a]));
    const army = game().mil.armies.length - 1;
    A.startPlanEdit(army, 'front');
    A.planPaint(border.from, { shift: true });
    const st = W.states[W.land[border.from].s].v;
    expect(ui().planEdit.line.slice().sort()).toEqual(st.slice().sort());
    A.setPlanTool('to');
    A.planPaint(border.from, {});                                    // už je v linii → přesune se do cílů
    expect(ui().planEdit.to).toEqual([border.from]);
    expect(ui().planEdit.line).not.toContain(border.from);
    A.planClearLists();
    expect(ui().planEdit.line.length + ui().planEdit.to.length + ui().planEdit.area.length).toBe(0);
  });

  it('plán: potvrzení bez provincií selže s oznámením, s provinciemi plán uloží; návrh podle fronty', () => {
    let s = game();
    s = giveSides(s, 'GER', 'POL', border.from, border.to);
    gameStore.setState(s);
    const a = put('GER', 'pesi', border.from);
    gameStore.setState(createArmy(game(), 'GER', 'Fronta', [a]));
    const army = game().mil.armies.length - 1;
    A.startPlanEdit(army, 'front');
    expect(A.confirmPlan()).toBe(false);
    expect(ui().toast).not.toBeNull();
    expect(ui().planEdit).not.toBeNull();
    expect(A.planSuggest()).toBe(false);                             // bez války není nepřítel
    A.declareWarOn('POL');
    expect(A.planSuggest()).toBe(true);
    expect(ui().planEdit.line).toContain(border.from);
    expect(ui().planEdit.to).toContain(border.to);
    A.setEditMode('rush');
    expect(A.confirmPlan()).toBe(true);
    expect(ui().planEdit).toBeNull();
    expect(game().mil.armies[army].plan).toMatchObject({ k: 'front', mode: 'rush' });
    expect(game().mil.armies[army].plan.line).toContain(border.from);
    A.setArmyPlanMode(army, 'careful');
    expect(game().mil.armies[army].plan.mode).toBe('careful');
    A.clearArmyPlan(army);
    expect(game().mil.armies[army].plan).toBeNull();
    A.startPlanEdit(army, 'area');
    A.cancelPlanEdit();
    expect(ui().planEdit).toBeNull();
  });

  it('úpravu plánu cizí armády rozhraní odmítne', () => {
    const foe = put('POL', 'pesi', border.to);
    gameStore.setState(createArmy(game(), 'POL', 'Cizí', [foe]));
    const army = game().mil.armies.length - 1;
    A.startPlanEdit(army, 'area');
    expect(ui().planEdit).toBeNull();
  });

  it('nová armáda z výběru otevře panel Armáda a rozbalí se; divize bez armády se dají přiřadit a vyřadit', () => {
    const a = put('GER', 'pesi', capital), b = put('GER', 'pesi', capital), foe = put('POL', 'pesi', border.to);
    A.setSelection([a, b, foe]);
    const id = A.newArmy(true);
    expect(id).toBeGreaterThan(0);
    expect(game().mil.divs[a].army).toBe(id);
    expect(game().mil.divs[b].army).toBe(id);
    expect(game().mil.divs[foe].army).toBe(0);                      // cizí divize nepřibyla
    expect(ui().panel).toBe('army');
    expect(ui().armyFocus).toBe(id);
    expect(ui().open[`a${id}`]).toBe(true);
    A.setSelection([a]);
    expect(A.removeSelectionFromArmy()).toBe(true);
    expect(game().mil.divs[a].army).toBe(0);
    expect(A.addSelectionToArmy(id)).toBe(true);
    expect(game().mil.divs[a].army).toBe(id);
    expect(armyTree(game(), GER).loose.armies.map((x) => x.id)).toEqual([id]);
  });

  it('skupiny armád: vytvoření, přesun armád, velitel a rozpuštění', () => {
    const a = put('GER', 'pesi', capital);
    A.setSelection([a]);
    const army = A.newArmy(true);
    const group = A.newGroup();
    expect(group).toBeGreaterThan(0);
    expect(A.moveArmiesToGroup([army], group)).toBe(true);
    expect(game().mil.armies[army].grp).toBe(group);
    expect(A.renameGroupTo(group, 'Skupina Východ')).toBe(true);
    expect(game().mil.groups[group].nm).toBe('Skupina Východ');
    expect(A.renameArmyTo(army, 'Armáda Jih')).toBe(true);
    const marshal = game().mil.gens.findIndex((g) => g && g.o === GER && g.r === 'M');
    const general = game().mil.gens.findIndex((g) => g && g.o === GER && g.r === 'G');
    expect(A.setCommander('group', group, general)).toBe(false);    // skupinu smí vést jen maršál
    expect(A.setCommander('group', group, marshal)).toBe(true);
    expect(A.setCommander('army', army, general)).toBe(true);
    expect(A.disbandGroupById(group)).toBe(true);
    expect(game().mil.armies[army].grp).toBe(0);
    expect(A.disbandArmyById(army)).toBe(true);
    expect(game().mil.divs[a].army).toBe(0);
    expect(ui().armyFocus).toBe(0);
  });

  it('rozpuštění vybraných divizí je vyřadí i z výběru; divize v boji se přeskočí, samotná divize v boji nejde', () => {
    const a = put('GER', 'pesi', capital), b = put('GER', 'pesi', capital, { b: 1 });
    A.setSelection([b]);
    const before = game();
    expect(A.disbandSelected()).toBe(false);                         // jediná vybraná divize je v boji → beze změny + oznámení
    expect(game()).toBe(before);
    expect(ui().toast.text).toMatch(/v boji/);
    A.setSelection([a, b]);
    expect(A.disbandSelected()).toBe(true);                          // smíšený výběr: rozpustí se, co jde, bojující zůstane
    expect(game().mil.divs[a]).toBeFalsy();
    expect(game().mil.divs[b]).toBeTruthy();
    expect(ui().selDivs).toEqual([b]);                               // výběr se očistil jen od zaniklé divize
  });

  it('válka a mír z rozhraní: jen za hráče, dvakrát nic; pozorovatel nemůže', () => {
    expect(A.declareWarOn('GER')).toBe(false);                       // sám sobě ne
    expect(A.declareWarOn('POL')).toBe(true);
    expect(atWar(game(), 'GER', 'POL')).toBe(true);
    expect(A.declareWarOn('POL')).toBe(false);
    expect(A.makePeaceWith('FRA')).toBe(false);
    expect(A.makePeaceWith('POL')).toBe(true);
    expect(atWar(game(), 'GER', 'POL')).toBe(false);
    A.startGame(null);
    expect(A.declareWarOn('POL')).toBe(false);
  });

  it('zaměření kamery na výběr a na provincii nespadne a prázdný výběr ignoruje', () => {
    A.focusSelection();
    const a = put('GER', 'pesi', capital);
    A.setSelection([a]);
    A.focusSelection();
    A.focusProvince(capital);
    expect(ui().selDivs).toEqual([a]);
  });

  it('výběr se čistí od zaniklých divizí a stejné pole se nevyměňuje', () => {
    const a = put('GER', 'pesi', capital), b = put('GER', 'pesi', capital);
    A.setSelection([a, b]);
    const cur = ui().selDivs;
    A.setSelection([a, b]);
    expect(ui().selDivs).toBe(cur);                                  // stejný obsah = stejná reference (žádné zbytečné překreslení)
    const s = game();
    const divs = s.mil.divs.slice();
    divs[b] = null;
    gameStore.setState({ ...s, mil: { ...s.mil, divs } });
    A.pruneSelection();
    expect(ui().selDivs).toEqual([a]);
  });

  it('panely: přepínání a Esc-řetěz stavů (panel, výběr)', () => {
    A.openPanel('army');
    expect(ui().panel).toBe('army');
    A.togglePanel('army');
    expect(ui().panel).toBeNull();
    A.togglePanel('recruit');
    expect(ui().panel).toBe('recruit');
    A.closeSide();
    expect(ui().panel).toBeNull();
    expect(ui().selected).toBe(0);
  });
});

// ------------------------------------------------------------------------------------------------------------------------------
describe('nábor a šablony z rozhraní', () => {
  beforeEach(() => { freshBattlefield(); });
  const infantry = () => templatesOf(game().mil, GER).find((id) => game().mil.tpl[id].short === 'pěší divize');

  it('nábor: odečte lidskou sílu a výzbroj, založí výcvik na vybrané vlastní provincii, jinak v hlavním městě', () => {
    const tpl = infantry();
    const st = deriveStats(game().mil.tpl[tpl]);
    const man0 = game().mil.man[GER], rifles0 = game().mil.stock[GER].pusky;
    expect(A.recruitSite()).toBe(capital);
    const own = neighbors(capital).find((q) => game().ctrl[q] === GER);
    A.selectLabel(own);
    expect(A.recruitSite()).toBe(own);
    A.selectLabel(neighbors(capital).find((q) => game().ctrl[q] !== GER) || 0);   // cizí provincie: místo zůstane vlastní
    A.selectLabel(own);
    expect(A.recruitDivisions(tpl, 2)).toBe(true);
    expect(game().mil.man[GER]).toBe(man0 - st.men * 2);
    expect(game().mil.stock[GER].pusky).toBe(rifles0 - st.need.pusky * 2);
    expect(game().mil.queue.length).toBe(2);
    expect(game().mil.queue[0].p).toBe(own);
    const id = game().mil.queue[0].id;
    expect(A.cancelTraining(id)).toBe(true);
    expect(game().mil.queue.length).toBe(1);
    expect(game().mil.man[GER]).toBe(man0 - st.men);
  });

  it('nábor bez zásob selže s oznámením a stav zůstane', () => {
    const tpl = infantry();
    const s = game();
    const man = s.mil.man.slice();
    man[GER] = 10;
    gameStore.setState({ ...s, mil: { ...s.mil, man } });
    const before = game();
    expect(A.recruitDivisions(tpl, 1)).toBe(false);
    expect(game()).toBe(before);
    expect(ui().toast.text).toMatch(/chybí/);
  });

  it('návrhář: nová šablona se uloží, neplatná vrátí český popis chyby, úprava a smazání fungují', () => {
    const n0 = templatesOf(game().mil, GER).length;
    A.openDesigner(0);
    expect(ui().designer.tplId).toBe(0);
    expect(ui().designer.draft.reg.length).toBeGreaterThan(0);
    A.updateDraft({ ...ui().designer.draft, nm: '   ' });
    expect(A.saveDesigner()).toMatch(/název/);
    expect(ui().designer).not.toBeNull();
    A.updateDraft({ ...ui().designer.draft, nm: 'Moje divize', reg: [['pesi', 'pesi'], ['ltank']], sup: ['del'] });
    expect(A.saveDesigner()).toBeNull();
    expect(ui().designer).toBeNull();
    const ids = templatesOf(game().mil, GER);
    expect(ids.length).toBe(n0 + 1);
    const mine = ids[ids.length - 1];
    expect(game().mil.tpl[mine].nm).toBe('Moje divize');
    // úprava existující šablony
    A.openDesigner(mine);
    expect(ui().designer.draft.nm).toBe('Moje divize');
    A.updateDraft({ ...ui().designer.draft, nm: 'Přejmenovaná' });
    expect(A.saveDesigner()).toBeNull();
    expect(game().mil.tpl[mine].nm).toBe('Přejmenovaná');
    // zamčený prapor (výzkum) nelze uložit
    A.openDesigner(mine);
    A.updateDraft({ ...ui().designer.draft, reg: [['mtank']] });
    expect(A.saveDesigner()).toMatch(/odemčen/);
    A.closeDesigner();
    expect(ui().designer).toBeNull();
    // smazání: šablonu používá výcvik → odmítnuto; po zrušení výcviku jde smazat
    expect(A.recruitDivisions(mine, 1)).toBe(true);
    expect(A.removeTemplate(mine)).toBe(false);
    A.cancelTraining(game().mil.queue[0].id);
    expect(A.removeTemplate(mine)).toBe(true);
    expect(templatesOf(game().mil, GER).length).toBe(n0);
  });
});

// ------------------------------------------------------------------------------------------------------------------------------
describe('selektory armády pro rozhraní', () => {
  const border = realBorder('GER', 'POL');

  it('divisionCount: počty podle země, stejná odpověď pro stejné pole divizí', () => {
    let s = emptyBattlefield('GER');
    expect(divisionCount(s, 'GER')).toBe(0);
    [s] = addDivision(s, 'GER', 'pesi', capital);
    [s] = addDivision(s, 'GER', 'pesi', capital);
    [s] = addDivision(s, 'POL', 'pesi', border.to);
    expect(divisionCount(s, 'GER')).toBe(2);
    expect(divisionCount(s, GER)).toBe(2);
    expect(divisionCount(s, 'POL')).toBe(1);
    expect(divisionCount(s, 'FRA')).toBe(0);
  });

  it('suggestFront: linie = vlastní provincie u nepřítele, cíle = jeho sousedé; bez války nebo bez divizí prázdné', () => {
    let s = emptyBattlefield('GER');
    s = giveSides(s, 'GER', 'POL', border.from, border.to);
    let a;
    [s, a] = addDivision(s, 'GER', 'pesi', border.from);
    s = createArmy(s, 'GER', 'Fronta', [a]);
    const army = s.mil.armies.length - 1;
    expect(suggestFront(s, army)).toEqual({ line: [], to: [] });     // mír
    s = declareWar(s, 'GER', 'POL');
    const sg = suggestFront(s, army);
    expect(sg.line).toContain(border.from);
    expect(sg.to).toContain(border.to);
    expect(sg.line.every((p) => s.ctrl[p] === GER)).toBe(true);
    expect(sg.to.every((p) => s.ctrl[p] === POL)).toBe(true);
    expect(sg.line.length).toBeLessThanOrEqual(80);
    expect(suggestFront(s, 9999)).toEqual({ line: [], to: [] });
    const empty = createArmy(s, 'GER', 'Prázdná', []);
    expect(suggestFront(empty, empty.mil.armies.length - 1)).toEqual({ line: [], to: [] });
    // stejný vstup → stejný výstup (čistá funkce)
    expect(suggestFront(s, army)).toEqual(sg);
  });

  it('přiřazení divize do cizí armády engine odmítne (hlídá vlastníka)', () => {
    let s = emptyBattlefield('GER');
    let a, p;
    [s, a] = addDivision(s, 'GER', 'pesi', capital);
    [s, p] = addDivision(s, 'POL', 'pesi', border.to);
    s = createArmy(s, 'GER', 'Test', [a]);
    const army = s.mil.armies.length - 1;
    expect(assignDivisions(s, army, [p])).toBe(s);
  });
});

// ------------------------------------------------------------------------------------------------------------------------------
describe('mapový režim Zásobování', () => {
  it('je sedmý v seznamu režimů (klávesa 7), za ním Průmysl (klávesa 8)', () => {
    expect(MODES.length).toBe(8);
    expect(MODES[6].id).toBe('supply');
    expect(MODES[7].id).toBe('industry');
  });

  it('supplyColor: bez toku tmavě červená, s rostoucím tokem přes žlutou do zelené; nad 3 se nemění', () => {
    const [r0, g0] = supplyColor(0);
    const lo = supplyColor(0.4), mid = supplyColor(1.2), hi = supplyColor(3), top = supplyColor(9);
    expect(r0).toBeGreaterThan(g0);
    expect(lo[0]).toBeGreaterThan(lo[1]);
    expect(mid[0]).toBeGreaterThan(150);
    expect(hi[1]).toBeGreaterThan(hi[0]);
    expect(top).toEqual(hi);
  });

  it('fillColors v režimu supply: provincie pod kontrolou hráče podle toku, ostatní ztlumené, moře bez barvy', () => {
    const g = createGame({ player: 'GER' });
    const fills = fillColors(W, g, 'supply');
    const flow = supplyFlow(g.ctrl, GER);
    expect(fills[capital]).toBe(rgbCss(supplyColor(flow[capital])));
    const polish = W.owners[POL].cap;
    expect(fills[polish]).not.toBe(rgbCss(supplyColor(flow[polish])));           // cizí provincie nemá barvu toku
    expect(fills[polish]).not.toBe(fillColors(W, g, 'political')[polish]);        // ale ztlumenou politickou
    expect(fills[0]).toBeNull();
    expect(fills[W.L + 1]).toBeNull();
  });

  it('bez hry (náhled) a bez hráče (pozorovatel) není čí tok ukazovat: celá mapa je ztlumená', () => {
    for (const game of [null, createGame()]) {
      const f = fillColors(W, game, 'supply');
      const pol = fillColors(W, game, 'political');
      expect(f[capital]).toBeTypeOf('string');
      expect(f[capital]).not.toBe(pol[capital]);
    }
  });

  it('provincie, kterou hráč ztratil, už neukazuje tok jeho zásobování', () => {
    const g = createGame({ player: 'GER' });
    const before = fillColors(W, g, 'supply')[capital];
    const ctrl = g.ctrl.slice();
    ctrl[capital] = POL;
    const lost = fillColors(W, { ...g, ctrl }, 'supply')[capital];
    expect(lost).not.toBe(before);
  });
});

// ------------------------------------------------------------------------------------------------------------------------------
function fakeCtx() {
  const target = { measureText: (s) => ({ width: String(s).length * 50 }), createPattern: () => ({}) };
  return new Proxy(target, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
}
function installFakeDom() {
  globalThis.Path2D = class { moveTo() {} lineTo() {} closePath() {} };
  const mk = () => ({ width: 0, height: 0, getContext: () => fakeCtx() });
  globalThis.document = { createElement: () => mk() };
  return mk();
}

describe('vykreslovač: okupace a vrstva jednotek', () => {
  const geom = buildGeometry(W);
  let canvas, r, cam;
  beforeEach(() => {
    canvas = installFakeDom();
    r = new MapRenderer(canvas, W, geom);
    cam = createCamera(W.frame.w, W.frame.h);
    resizeCamera(cam, 1280, 720);
    cam.zoom = 1; cam.x = 1100; cam.y = 900;
  });

  it('změna držitele provincie zneplatní jen dlaždice v jejím okolí a zapíše okupaci', () => {
    const g = createGame({ player: 'GER' });
    r.setGame(g);
    r.draw(cam, 1);
    let guard = 0;
    while (r.pending && guard++ < 200) r.draw(cam, 1);
    r.draw(cam, 1);
    const tiles = [...r.tiles.map.values()].filter((t) => t.lvl !== undefined);
    expect(tiles.length).toBeGreaterThan(1);
    expect(tiles.every((t) => t.ver === r.version)).toBe(true);
    // provincie nejblíž středu pohledu přejde pod kontrolu Polska
    const gg = geo(W);
    let best = 0, bd = Infinity;
    for (let p = 1; p <= W.L; p++) { const d = Math.hypot(gg.cx[p] - cam.x, gg.cy[p] - cam.y); if (d < bd) { bd = d; best = p; } }
    const ctrl = g.ctrl.slice();
    const owner = g.stateOwner[W.provState[best]];
    const taker = owner === POL ? GER : POL;
    ctrl[best] = taker;
    const v0 = r.version;
    r.setGame({ ...g, ctrl });
    expect(r.occ[best]).toBe(taker);
    expect(r.version).toBe(v0);                                      // celá mapa se nezneplatnila
    const stale = tiles.filter((t) => t.ver !== r.version).length;
    expect(stale).toBeGreaterThan(0);
    expect(stale).toBeLessThan(tiles.length);
    r.draw(cam, 1);
    expect(r.stats.rendered).toBeGreaterThan(0);
    // návrat držitele okupaci smaže
    r.setGame({ ...g, ctrl: g.ctrl });
    expect(r.occ[best]).toBe(0);
  });

  it('v režimu zásobování se po změně držitele přebarví celá mapa', () => {
    const g = createGame({ player: 'GER' });
    r.setGame(g);
    r.setMode('supply');
    r.draw(cam, 1);
    const v0 = r.version;
    const ctrl = g.ctrl.slice();
    ctrl[capital] = POL;
    r.setGame({ ...g, ctrl });
    expect(r.version).toBe(v0 + 1);
  });

  it('vrstva jednotek se přebuduje jen při změně divizí, držitelů nebo válek a hledá žeton i obdélník', () => {
    let s = emptyBattlefield('GER');
    [s] = addDivision(s, 'GER', 'pesi', capital);
    [s] = addDivision(s, 'GER', 'pesi', neighbors(capital)[0]);
    r.setUnitsVisible(true);
    r.setGame(s);
    expect(r.units.counters.length).toBe(2);
    const first = r.units.counters;
    r.setGame({ ...s, tick: 5 });
    expect(r.units.counters).toBe(first);                             // čas plyne, divize stejné → žádná přestavba
    r.setGame({ ...s, mil: { ...s.mil, wars: [[GER, POL]] } });
    expect(r.units.counters).not.toBe(first);
    r.setUnitsVisible(false);
    expect(r.units.counters.length).toBe(0);
  });
});

describe('úložiště rozhraní', () => {
  it('prázdný výběr je sdílená zmražená konstanta', () => {
    expect(Object.isFrozen(NONE)).toBe(true);
    A.goMenu();
    expect(ui().selDivs).toBe(NONE);
    expect(TPL_KINDS.pesi.reg.length).toBeGreaterThan(0);
  });
});
