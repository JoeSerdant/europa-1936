// F4c: mechaniky HOI4 – strategický přesun po železnici, ústupová linie, námořní základny a opravy, miny, stíhání a úder na lodě,
// pobřežní pevnosti a zásobovací uzly.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, declareWar, orderRail, railBlock, orderMove, setPlan, createArmy, marchEta, validateState, GAME_VERSION,
  build, buildFort, buildRoom, fortRoom, BUILDINGS, builtHubs, seaPorts, supplyFlow, infraOf,
  NAV, NAV_MISSIONS, minesAndRepairs, enemyMines, baseLevelAt, seasOfState, missionBlock, AIR, PLANES,
} from '../src/engine/index.js';
import { C } from '../src/engine/army/constants.js';
import { airDay } from '../src/engine/air/day.js';

const W = getWorld();
const GER = W.ownerIdx.GER, POL = W.ownerIdx.POL, ENG = W.ownerIdx.ENG;
const myDiv = (s, o) => s.mil.divs.findIndex((d, i) => i && d && d.o === o && !d.b);
const ownProv = (s, o, avoid) => { for (let p = 1; p <= W.L; p++) if (s.ctrl[p] === o && p !== avoid && W.provState[p] !== W.provState[avoid]) return p; return 0; };

describe('F4c: tvar stavu', () => {
  it('verze 51, prázdné miny a pobřežní pevnosti, platné uložení', () => {
    const s = createGame({ player: 'GER' });
    expect(GAME_VERSION).toBeGreaterThanOrEqual(51);
    expect(s.nav.mn).toEqual({});
    expect(s.ind.cf).toEqual({});
    expect(validateState(JSON.parse(JSON.stringify(s)))).toBeNull();
    expect(validateState({ ...s, nav: { ...s.nav, mn: null } })).toBeTruthy();
  });
});

describe('F4c: strategický přesun po železnici', () => {
  it('jen vlastním územím; divize jede rychleji, bez organizace, po příjezdu přesun skončí', () => {
    const s = createGame({ player: 'GER' });
    const id = myDiv(s, GER), d = s.mil.divs[id];
    let far = 0;
    for (let p = 1; p <= W.L && !far; p++) if (s.ctrl[p] === GER && W.provState[p] !== W.provState[d.p] && !railBlock(s, id, p) && Math.hypot(W.land[p].c[0] - W.land[d.p].c[0], W.land[p].c[1] - W.land[d.p].c[1]) > 150) far = p;
    expect(railBlock(s, id, far)).toBeNull();
    expect(railBlock(s, id, W.owners[POL].cap)).toMatch(/vlastní/);
    const r = orderRail(s, [id], far), m = orderMove(s, [id], far);
    expect(r.mil.divs[id].rd).toBe(1);
    expect(r.mil.divs[id].mo).toBe(far);
    expect(marchEta(r, [id]).hours).toBeLessThan(marchEta(m, [id]).hours);
    expect(orderMove(r, [id], far).mil.divs[id].rd).toBeUndefined();   // běžný rozkaz přesun ruší
    let t = advance(r, 1);
    expect(t.mil.divs[id].org).toBeLessThanOrEqual(r.mil.divs[id].org);
    const max = t.mil.divs[id].org;
    expect(max).toBeGreaterThan(0);
    t = r;
    for (let h = 0; h < marchEta(r, [id]).hours * 2 && t.mil.divs[id].path.length; h++) t = advance(t, 1);
    expect(t.mil.divs[id].p).toBe(far);
    expect(t.mil.divs[id].rd).toBeUndefined();
  });
  it('přes nepřátelské území přesun nejde', () => {
    const s = declareWar(createGame({ player: 'GER' }), 'GER', 'POL');
    const id = myDiv(s, GER);
    expect(railBlock(s, id, W.owners[POL].cap)).toBeTruthy();
    expect(orderRail(s, [id], W.owners[POL].cap)).toBe(s);
  });
});

describe('F4c: ústupová linie', () => {
  it('plán fronty si ponechá ústupovou linii a armáda na ni přejde, když nepřítel drží třetinu linie', () => {
    let s = declareWar(createGame({ player: 'GER' }), 'GER', 'POL');
    const ids = s.mil.divs.map((d, i) => (d && d.o === GER ? i : 0)).filter(Boolean).slice(0, 3);
    s = createArmy(s, 'GER', 'Zkušební', ids);
    const a = s.mil.armies.findIndex((x, i) => i && x && x.nm === 'Zkušební');
    const line = [], fb = [];
    for (let p = 1; p <= W.L && (line.length < 3 || fb.length < 2); p++) if (s.ctrl[p] === GER) (line.length < 3 ? line : fb).push(p);
    s = setPlan(s, a, { k: 'front', line, to: [], mode: 'balanced', fb });
    expect(s.mil.armies[a].plan.fb).toEqual(fb);
    const ctrl = s.ctrl.slice(); ctrl[line[0]] = POL; ctrl[line[1]] = POL;
    const t = advance({ ...s, ctrl, tick: s.tick + (24 - (s.tick % 24)) - 1 }, 1);
    expect(t.mil.armies[a].plan.line).toEqual(fb);
    expect(t.mil.armies[a].plan.fb).toBeUndefined();
  });
});

describe('F4c: stavby', () => {
  it('námořní základna jen s přístavem, zásobovací uzel jen se železnicí, pobřežní pevnost jen u moře', () => {
    const s = createGame({ player: 'GER' });
    let port = 0, inland = 0;
    for (let st = 1; st < W.states.length; st++) {
      if (s.stateOwner[st] !== GER) continue;
      const hasPort = W.states[st].v.some((p) => W.portLevel[p] > 0);
      if (hasPort && !port) port = st; if (!hasPort && !inland) inland = st;
    }
    expect(buildRoom(s, port, 'nb', GER).n).toBe(BUILDINGS.nb.max);
    expect(buildRoom(s, inland, 'nb', GER).why).toMatch(/přístav/);
    expect(build(s, inland, 'nb')).toBe(s);
    const pp = W.states[port].v.find((p) => W.portLevel[p] > 0);
    expect(fortRoom(s, pp, GER, 'cfort').n).toBe(BUILDINGS.cfort.max);
    const b = buildFort(s, pp, 'cfort');
    expect(b.ind.build.at(-1)).toMatchObject({ k: 'cfort', p: pp });
    const dry = W.states[inland].cap;
    expect(fortRoom(s, dry, GER, 'cfort').why).toMatch(/moře/);
  });
  it('postavený zásobovací uzel je zdrojem zásob', () => {
    const s = createGame({ player: 'GER' });
    let st = 0;
    for (let i = 1; i < W.states.length; i++) if (s.stateOwner[i] === GER && W.states[i].cap !== W.owners[GER].cap && buildRoom(s, i, 'hub', GER).n) { st = i; break; }
    expect(st).toBeGreaterThan(0);
    const sti = s.ind.st.slice(); sti[st] = { ...sti[st], hub: 1 };
    const t = { ...s, ind: { ...s.ind, st: sti } };
    expect(builtHubs(t, GER)).toContain(W.states[st].cap);
    const before = supplyFlow(s.ctrl, GER, infraOf(s), null, seaPorts(s, GER))[W.states[st].cap];
    const after = supplyFlow(t.ctrl, GER, infraOf(t), null, seaPorts(t, GER))[W.states[st].cap];
    expect(after).toBeGreaterThanOrEqual(before);
    expect(seaPorts(t, GER)).toEqual(seaPorts(s, GER));   // uzly nejsou v seznamu přístavů
  });
});

describe('F4c: miny a opravy', () => {
  const withFleets = () => {
    let s = declareWar(createGame({ player: 'GER' }), 'GER', 'ENG');
    const g = s.nav.fleets.findIndex((f, i) => i && f && f.o === GER), e = s.nav.fleets.findIndex((f, i) => i && f && f.o === ENG);
    return { s, g, e };
  };
  it('kladení min, poškození nepřátelské flotily, odminování a úbytek', () => {
    let { s, g, e } = withFleets();
    expect(NAV_MISSIONS.mine && NAV_MISSIONS.sweep).toBeTruthy();
    const fleets = s.nav.fleets.slice();
    const sea = fleets[e].p;
    fleets[g] = { ...fleets[g], p: sea, path: [], m: 'mine', ships: { ...fleets[g].ships, dd: 10 } };
    s = { ...s, nav: { ...s.nav, fleets } };
    const t = minesAndRepairs(s);
    expect(t.nav.mn[sea][GER]).toBeCloseTo(NAV.MINE_LAY * (10 + (fleets[g].ships.ss || 0)) * (1 - NAV.MINE_DECAY), 1);
    expect(enemyMines(t, ENG, sea)).toBeGreaterThan(0);
    const u = minesAndRepairs(t);
    expect(u.nav.fleets[e].dm).toBeGreaterThan(0);
    const f2 = u.nav.fleets.slice(); f2[e] = { ...f2[e], m: 'sweep', ships: { ...f2[e].ships, dd: 30 } }; f2[g] = { ...f2[g], m: '' };
    const v = minesAndRepairs({ ...u, nav: { ...u.nav, fleets: f2 } });
    expect(enemyMines(v, ENG, sea)).toBeLessThan(enemyMines(u, ENG, sea));
  });
  it('poškozená flotila v oblasti vlastního přístavu se opravuje rychleji s námořní základnou', () => {
    let { s, g } = withFleets();
    const fleets = s.nav.fleets.slice(); fleets[g] = { ...fleets[g], dm: 0.5, path: [] };
    s = { ...s, nav: { ...s.nav, fleets } };
    expect(baseLevelAt(s, GER, fleets[g].p)).toBeGreaterThan(0);
    const t = minesAndRepairs(s);
    expect(t.nav.fleets[g].dm).toBeLessThan(0.5);
    const port = Array.from({ length: W.L }, (_, i) => i + 1).find((p) => W.portLevel[p] && W.portSea[p] === fleets[g].p && s.ctrl[p] === GER);
    const sti = s.ind.st.slice(); const st = W.provState[port]; sti[st] = { ...sti[st], nb: 5 };
    const u = minesAndRepairs({ ...s, ind: { ...s.ind, st: sti } });
    expect(u.nav.fleets[g].dm).toBeLessThan(t.nav.fleets[g].dm);
  });
});

describe('F4c: letectvo – stíhání a úder na lodě', () => {
  it('úder na lodě míří jen na pobřežní stát a poškodí nepřátelské flotily u jeho pobřeží', () => {
    let s = declareWar(createGame({ player: 'GER' }), 'GER', 'ENG');
    expect(PLANES.sti.roles).toContain('int');
    expect(PLANES.tac.roles).toContain('nav');
    const e = s.nav.fleets.findIndex((f, i) => i && f && f.o === ENG);
    const sea = s.nav.fleets[e].p;
    let coast = 0;
    for (let st = 1; st < W.states.length && !coast; st++) if (seasOfState(st).includes(sea)) coast = st;
    expect(coast).toBeGreaterThan(0);
    const wid = s.air.wings.findIndex((x, i) => i && x && x.o === GER && PLANES[x.t].roles.includes('nav'));
    expect(wid).toBeGreaterThan(0);
    const wings = s.air.wings.slice(); wings[wid] = { ...wings[wid], m: 'nav', to: coast };
    const t = airDay({ ...s, air: { ...s.air, wings } });
    expect(t.nav.fleets[e].dm).toBeGreaterThan(0);
    expect(t.nav.fleets[e].dm).toBeLessThanOrEqual(AIR.NAV_DMG_MAX + 1e-9);
    let inland = 0;
    for (let st = 1; st < W.states.length && !inland; st++) if (!seasOfState(st).length && s.stateOwner[st] === GER) inland = st;
    expect(missionBlock(s, wid, 'nav', inland)).toMatch(/pobřež/);
  });
});

void C;
