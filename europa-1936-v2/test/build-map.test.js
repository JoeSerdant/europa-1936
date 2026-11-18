// Stavby jako v HOI4 (M103): volné místo pro budovu (`buildRoom`, `fortRoom`), režim mapy Stavby, stavění klikem na mapu a plány armád na mapě.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, geo, build, buildFort, buildRoom, fortRoom, slotsOf, slotsUsed, setPlan, createArmy, declareWar } from '../src/engine/index.js';
import { gameStore, uiStore } from '../src/ui/store.js';
import * as A from '../src/ui/actions.js';
import { fillColors } from '../src/ui/map/colors.js';
import { planMarks, PLAN_COLORS } from '../src/ui/map/units.js';

const W = getWorld();
const GER = W.ownerIdx.GER, POL = W.ownerIdx.POL;
const gerState = (s, pred) => { for (let st = 1; st < W.states.length; st++) if (s.stateOwner[st] === GER && pred(st)) return st; return 0; };

describe('volné místo pro stavbu', () => {
  it('odpovídá příkazu build: sloty továren, strop letišť, přístav loděnic, cizí stát', () => {
    const s = createGame({ player: 'GER' });
    const st = gerState(s, (x) => slotsUsed(s.ind, x) < slotsOf(s.ind, x));
    const r = buildRoom(s, st, 'civ', GER);
    expect(r.n).toBe(slotsOf(s.ind, st) - slotsUsed(s.ind, st));
    let t = s;
    for (let i = 0; i < r.n; i++) t = build(t, st, 'civ');
    expect(buildRoom(t, st, 'civ', GER).n).toBe(0);
    expect(buildRoom(t, st, 'civ', GER).why).toMatch(/slot/);
    expect(build(t, st, 'civ')).toBe(t);   // stejně jako příkaz
    expect(buildRoom(s, st, 'afb', GER).n).toBe(5 - (s.ind.st[st].afb || 0));
    const inland = gerState(s, (x) => !W.states[x].v.some((p) => W.portLevel[p] > 0));
    expect(buildRoom(s, inland, 'dok', GER).n).toBe(0);
    const pol = (() => { for (let x = 1; x < W.states.length; x++) if (s.stateOwner[x] === POL) return x; return 0; })();
    expect(buildRoom(s, pol, 'civ', GER).n).toBe(0);
    expect(buildRoom(s, st, 'fort', GER).n).toBe(0);   // pevnost jde přes fortRoom
  });
  it('pevnost v provincii: strop úrovní a rozestavěné', () => {
    const s = createGame({ player: 'GER' });
    const p = W.states[gerState(s, () => true)].cap;
    const n = fortRoom(s, p, GER).n;
    expect(n).toBe(5 - (s.ind.fort[p] || 0));
    const t = buildFort(s, p);
    expect(fortRoom(t, p, GER).n).toBe(n - 1);
    expect(fortRoom(s, p, POL).n).toBe(0);
  });
});

describe('mapa a klik', () => {
  it('režim Stavby: vlastní státy s místem zeleně, plné hnědě, cizí ztlumené', () => {
    const s = createGame({ player: 'GER' });
    const fills = fillColors(W, s, 'build:civ');
    const own = W.states[gerState(s, (x) => buildRoom(s, x, 'civ', GER).n > 0)].cap;
    const rgb = (c) => c.match(/\d+/g).map(Number);
    const [r, g, b] = rgb(fills[own]);
    expect(g).toBeGreaterThan(r); expect(g).toBeGreaterThan(b);
    const polP = W.states[(() => { for (let x = 1; x < W.states.length; x++) if (s.stateOwner[x] === POL) return x; return 0; })()].cap;
    expect(fills[polP]).not.toBe(fills[own]);
  });
  it('zvolená budova + klik na stát zadá stavbu, Shift zaplní stát, Esc (null) vrátí režim mapy', () => {
    A.goMenu(); A.startGame('GER');
    const s = gameStore.getState();
    const st = gerState(s, (x) => buildRoom(s, x, 'civ', GER).n >= 2);
    A.pickBuild('civ');
    expect(uiStore.getState().mode).toBe('build:civ');
    const q0 = s.ind.build.length;
    A.mapClick(W.states[st].cap);
    expect(gameStore.getState().ind.build.length).toBe(q0 + 1);
    const left = buildRoom(gameStore.getState(), st, 'civ', GER).n;
    A.mapClick(W.states[st].cap, { shift: true });
    expect(gameStore.getState().ind.build.length).toBe(q0 + 1 + left);
    expect(buildRoom(gameStore.getState(), st, 'civ', GER).n).toBe(0);
    A.pickBuild(null);
    expect(uiStore.getState().buildKind).toBeNull();
    expect(uiStore.getState().mode).toBe('political');
  });
});

describe('plány armád na mapě', () => {
  it('linie fronty jako čára v barvě armády a šípy jen k nepřátelským cílům', () => {
    let s = createGame({ player: 'GER' });
    const g = geo(W);
    const border = [];
    for (let p = 1; p <= W.L && border.length < 4; p++) if (s.ctrl[p] === GER) W.forLandNeighbors(p, (q) => { if (s.ctrl[q] === POL && !border.includes(p)) border.push(p); });
    const targets = [];
    for (const p of border) W.forLandNeighbors(p, (q) => { if (s.ctrl[q] === POL && !targets.includes(q)) targets.push(q); });
    const ids = s.mil.divs.map((d, i) => (d && d.o === GER ? i : 0)).filter(Boolean).slice(0, 2);
    s = createArmy(s, 'GER', 'Zkouška', ids);
    const a = s.mil.armies.length - 1;
    s = setPlan(s, a, { k: 'front', line: border, to: targets.slice(0, 3), mode: 'balanced' });
    expect(planMarks(s, GER, g).find((m) => m.id === a).arrows).toHaveLength(0);   // bez války žádné šípy útoku
    s = declareWar(s, 'GER', 'POL');
    const m = planMarks(s, GER, g).find((x) => x.id === a);
    expect(m.color).toBe(PLAN_COLORS[a % PLAN_COLORS.length]);
    expect(m.segs.flat().length).toBe(border.length);
    expect(m.arrows.length).toBeGreaterThan(0);
    expect(m.arrows.length).toBeLessThanOrEqual(4);
    expect(planMarks(s, 0, g)).toEqual([]);
  });
});
