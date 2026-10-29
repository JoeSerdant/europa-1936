// M19 – rozhraní průmyslu: akce hráče (vlastnictví se kontroluje v actions.js), mapový režim Průmysl, panel a klávesa. React komponenty se tu netestují (viz smoke.mjs).
import { describe, it, expect, beforeEach } from 'vitest';
import { getWorld, stateIndustry, slotsOf, slotsUsed, industryOf, declareWar, IND } from '../src/engine/index.js';
import { gameStore, uiStore } from '../src/ui/store.js';
import * as A from '../src/ui/actions.js';
import { fillColors, MODES } from '../src/ui/map/colors.js';
import { MapRenderer } from '../src/ui/map/renderer.js';
import { buildGeometry } from '../src/ui/map/geometry.js';

const W = getWorld();
const GER = W.ownerIdx.GER, FRA = W.ownerIdx.FRA;
const game = () => gameStore.getState();
const ui = () => uiStore.getState();
const statesOf = (o) => { const r = []; for (let s = 1; s < W.states.length; s++) if (game().stateOwner[s] === o) r.push(s); return r; };
const freeState = (o) => statesOf(o).find((s) => slotsUsed(game().ind, s) < slotsOf(game().ind, s));

beforeEach(() => { A.goMenu(); A.startGame('GER'); });

describe('akce průmyslu', () => {
  it('stavět lze jen ve vlastním státě; cizí stát, plný stav slotů a infrastruktura hlásí důvod', () => {
    const own = freeState(GER), foreign = freeState(FRA);
    expect(A.buildIn(foreign, 'civ')).toBe(false);
    expect(ui().toast.text).toMatch(/vlastním/);
    expect(game().ind.build).toHaveLength(0);
    expect(A.buildIn(own, 'civ')).toBe(true);
    expect(game().ind.build).toHaveLength(1);
    expect(ui().toast.text).toMatch(/Civilní továrna/);
    const free = slotsOf(game().ind, own) - slotsUsed(game().ind, own);
    for (let i = 0; i < free; i++) A.buildIn(own, 'mil');
    expect(A.buildIn(own, 'civ')).toBe(false);
    expect(ui().toast.text).toMatch(/slot/);
    for (let i = 0; i < IND.INF_MAX; i++) expect(A.buildIn(own, 'inf')).toBe(true);
    expect(A.buildIn(own, 'inf')).toBe(false);
  });

  it('okupovaný vlastní stát nejde stavět', () => {
    const own = freeState(GER);
    const ctrl = game().ctrl.slice(); ctrl[W.states[own].cap] = FRA;
    gameStore.setState({ ...game(), ctrl });
    expect(A.buildIn(own, 'civ')).toBe(false);
  });

  it('fronta: přeřazení a zrušení jen vlastních staveb', () => {
    const states = statesOf(GER).filter((s) => slotsUsed(game().ind, s) + 1 < slotsOf(game().ind, s));
    A.buildIn(states[0], 'civ'); A.buildIn(states[1], 'mil');
    const [a, b] = game().ind.build.map((x) => x.id);
    expect(A.moveProject(b, -Infinity)).toBe(true);
    expect(game().ind.build[0].id).toBe(b);
    // cizí projekt hráč neovládá
    const foreign = freeState(FRA);
    const s = game();
    const id = s.ind.jn + 1;
    gameStore.setState({ ...s, ind: { ...s.ind, jn: id, build: [...s.ind.build, { id, o: FRA, s: foreign, k: 'civ', prog: 0 }] } });
    expect(A.cancelProject(id)).toBeFalsy();
    expect(game().ind.build.some((x) => x.id === id)).toBe(true);
    expect(A.cancelProject(a)).toBe(true);
  });

  it('linky: nová linka potřebuje volnou továrnu, cizí linku hráč nemění', () => {
    expect(A.newLine('vozy')).toBe(false);          // žádná továrna není volná
    expect(ui().toast.text).toMatch(/volná/);
    const mine = game().ind.lines.find((l) => l.o === GER && l.eq === 'pusky');
    expect(A.setLineFac(mine.id, mine.fac - 1)).toBe(true);
    expect(A.newLine('vozy')).toBe(true);
    expect(game().ind.lines.at(-1)).toMatchObject({ o: GER, eq: 'vozy', fac: 1 });
    const foreign = game().ind.lines.find((l) => l.o === FRA);
    expect(A.setLineFac(foreign.id, foreign.fac + 1)).toBe(false);
    expect(A.setLineEq(foreign.id, 'dela')).toBeFalsy();
    expect(A.setLineEq(mine.id, 'pdela')).toBe(true);
  });

  it('obchod: hráč smí uzavřít jen smlouvu, ve které je stranou; ve válce ne', () => {
    const n = game().ind.trade.length;
    expect(A.newTrade(W.ownerIdx.SWE, 'ocel', 2, false)).toBe(true);        // dovoz
    expect(game().ind.trade.at(-1)).toMatchObject({ from: W.ownerIdx.SWE, to: GER, res: 'ocel', amt: 2 });
    expect(A.newTrade(W.ownerIdx.SWE, 'hlinik', 1, true)).toBe(true);        // vývoz
    expect(game().ind.trade.at(-1)).toMatchObject({ from: GER, to: W.ownerIdx.SWE });
    expect(game().ind.trade).toHaveLength(n + 2);
    const foreign = game().ind.trade.find((d) => d.from !== GER && d.to !== GER);
    expect(A.changeTrade(foreign.id, 5)).toBe(false);
    expect(A.dropTrade(foreign.id)).toBe(false);
    const mine = game().ind.trade.at(-1);
    expect(A.changeTrade(mine.id, 3)).toBe(true);
    expect(A.dropTrade(mine.id)).toBe(true);
    gameStore.setState(declareWar(game(), 'GER', 'FRA'));
    expect(A.newTrade(FRA, 'ocel', 1, false)).toBe(false);
    expect(ui().toast.text).toMatch(/Smlouvu/);
  });

  it('pozorovatel nic nestaví ani nevyrábí', () => {
    A.goMenu(); A.startGame(null);
    expect(A.buildIn(freeState(GER), 'civ')).toBe(false);
    expect(A.newLine('pusky')).toBe(false);
    expect(A.newTrade(GER, 'ocel', 1, true)).toBe(false);
  });

  it('záložka panelu a otevření panelu Průmysl', () => {
    A.setIndTab('trade');
    expect(ui().indTab).toBe('trade');
    A.openPanel('industry');
    expect(ui().panel).toBe('industry');
    A.goMenu();
    expect(ui().indTab).toBe('build');
  });
});

describe('mapový režim Průmysl', () => {
  it('je osmý v seznamu režimů a barví státy s továrnami jinak než bez nich', () => {
    expect(MODES[7].id).toBe('industry');
    const s = game();
    const colors = fillColors(W, s, 'industry');
    const withF = statesOf(GER).find((x) => s.ind.st[x].civ + s.ind.st[x].mil >= 3);
    const without = statesOf(W.ownerIdx.POR).find((x) => s.ind.st[x].civ + s.ind.st[x].mil === 0) || statesOf(W.ownerIdx.ICE)[0];
    const p1 = W.states[withF].v[0], p2 = W.states[without].v[0];
    expect(colors[p1]).not.toBe(colors[p2]);
    // víc továren = jiný odstín
    const big = statesOf(GER).reduce((a, b) => (s.ind.st[b].civ + s.ind.st[b].mil > s.ind.st[a].civ + s.ind.st[a].mil ? b : a));
    const small = statesOf(GER).find((x) => s.ind.st[x].civ + s.ind.st[x].mil === 1);
    if (small) expect(colors[W.states[big].v[0]]).not.toBe(colors[W.states[small].v[0]]);
  });

  it('renderer přebarví mapu po změně továren (ne při změně linek)', () => {
    globalThis.Path2D = class { moveTo() {} lineTo() {} closePath() {} };
    const ctx = new Proxy({ measureText: (x) => ({ width: String(x).length * 50 }), createPattern: () => ({}) }, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
    const mk = () => ({ width: 0, height: 0, getContext: () => ctx });
    globalThis.document = { createElement: () => mk() };
    const r = new MapRenderer(mk(), W, buildGeometry(W));
    r.setGame(game());
    r.setMode('industry');
    const v0 = r.version;
    const s = game();
    r.setGame({ ...s, ind: { ...s.ind, lines: [] } });
    expect(r.version).toBe(v0);
    const st = s.ind.st.slice();
    const x = statesOf(GER)[0];
    st[x] = { ...st[x], civ: st[x].civ + 1 };
    r.setGame({ ...s, ind: { ...s.ind, st } });
    expect(r.version).toBeGreaterThan(v0);
    expect(industryOf(s, 'GER').civ).toBeGreaterThan(0);
    expect(stateIndustry(s, x).civ).toBe(s.ind.st[x].civ);
  });
});
