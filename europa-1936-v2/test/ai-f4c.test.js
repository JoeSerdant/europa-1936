// F4c: AI používá miny a odminování, úder na lodě a stíhání, přesun vlakem a stavby námořních základen, pobřežních pevností a zásobovacích uzlů.
import { describe, it, expect } from 'vitest';
import { createGame, getWorld, declareWar, orderMove, enemyMines, PLANES } from '../src/engine/index.js';
import { aiMines, aiAirMissions, aiRail, aiBuildsF4c, navStrikeTarget, interceptTarget } from '../src/engine/ai/hoi.js';
import { AI } from '../src/engine/ai/constants.js';
import { coastStatesOf, homeSeas } from '../src/engine/nav/core.js';

const W = getWorld();
const GER = W.ownerIdx.GER, ENG = W.ownerIdx.ENG, POL = W.ownerIdx.POL;

describe('AI F4c: miny', () => {
  it('za války nečinná flotila klade miny v domovském moři u nepřátelského pobřeží; nepřátelské miny doma odminuje', () => {
    let s = declareWar(createGame({ player: null, aiLevel: 2 }), 'GER', 'POL');
    const homes = [...homeSeas(s, GER)];
    const sea = homes.find((l) => coastStatesOf(l).some((st) => s.stateOwner[st] === POL));
    expect(sea).toBeTruthy();
    // dvě nečinné flotily s torpédoborci
    const fleets = s.nav.fleets.slice();
    const g = fleets.findIndex((f, i) => i && f && f.o === GER);
    fleets[g] = { ...fleets[g], m: '', path: [] };
    fleets.push({ ...fleets[g], nm: 'Druhá', ships: { dd: 6 }, pl: 0 });
    s = { ...s, nav: { ...s.nav, fleets } };
    const t = aiMines(s, GER);
    const layer = t.nav.fleets.findIndex((f, i) => i && f && f.o === GER && f.m === 'mine');
    expect(layer).toBeGreaterThan(0);
    expect(t.nav.fleets[layer].to === sea || t.nav.fleets[layer].p === sea).toBe(true);
    // nepřátelské miny doma → odminování
    const u = { ...s, nav: { ...s.nav, mn: { [homes[0]]: { [POL]: 50 } } } };
    expect(enemyMines(u, GER, homes[0])).toBe(50);
    const v = aiMines(u, GER);
    expect(v.nav.fleets.some((f) => f && f.o === GER && f.m === 'sweep')).toBe(true);
    expect(aiMines(createGame({ player: null, aiLevel: 2 }), GER)).toEqual(createGame({ player: null, aiLevel: 2 }));   // v míru nic
  });
});

describe('AI F4c: letectvo', () => {
  it('úderné křídlo letí na nepřátelskou flotilu u vlastního pobřeží, stíhač stíhá nepřátelské bombardéry', () => {
    let s = declareWar(createGame({ player: null, aiLevel: 2 }), 'GER', 'ENG');
    const e = s.nav.fleets.findIndex((f, i) => i && f && f.o === ENG);
    const gsea = [...homeSeas(s, GER)][0];
    const fleets = s.nav.fleets.slice(); fleets[e] = { ...fleets[e], p: gsea, path: [] };
    s = { ...s, nav: { ...s.nav, fleets } };
    const wid = s.air.wings.findIndex((x, i) => i && x && x.o === GER && PLANES[x.t].roles.includes('nav'));
    expect(navStrikeTarget(s, GER, s.air.wings[wid].s, 5000)).toBeGreaterThan(0);
    const t = aiAirMissions(s, GER);
    expect(t.air.wings.some((x) => x && x.o === GER && x.m === 'nav')).toBe(true);
    // nepřátelský bombardér nad německým státem
    const ew = s.air.wings.findIndex((x, i) => i && x && x.o === ENG);
    const target = s.air.wings.find((x) => x && x.o === GER).s;
    const wings = s.air.wings.slice(); wings[ew] = { ...wings[ew], m: 'bomb', to: target };
    const u = { ...s, air: { ...s.air, wings } };
    expect(interceptTarget(u, GER, target, 600)).toBe(target);
    const v = aiAirMissions(u, GER);
    const sti = v.air.wings.filter((x) => x && x.o === GER && PLANES[x.t].roles.includes('int') && x.id % 2 === 0);
    if (sti.length) expect(sti.some((x) => x.m === 'int')).toBe(true);
  });
});

describe('AI F4c: přesun vlakem a stavby', () => {
  it('dlouhá cesta vlastním územím se změní na přesun vlakem', () => {
    const s = createGame({ player: null, aiLevel: 2 });
    let id = 0, far = 0;
    for (let i = 1; i < s.mil.divs.length && !far; i++) {
      const d = s.mil.divs[i];
      if (!d || d.o !== GER) continue;
      for (let p = 1; p <= W.L; p++) {
        if (s.ctrl[p] !== GER) continue;
        const m = orderMove(s, [i], p);
        const path = m.mil.divs[i].path;
        if (path.length >= AI.F4C_RAIL_STEPS && path.every((q) => s.ctrl[q] === GER)) { id = i; far = p; break; }
      }
    }
    expect(far).toBeGreaterThan(0);
    const t = aiRail(orderMove(s, [id], far), GER);
    expect(t.mil.divs[id].rd).toBe(1);
  });
  it('námořní mocnost staví námořní základnu; za války pobřežní pevnost v cenném přístavu', () => {
    let s = createGame({ player: null, aiLevel: 2 });
    s = { ...s, ind: { ...s.ind, build: [] } };
    const t = aiBuildsF4c(s, ENG);
    expect(t.ind.build.some((b) => b.o === ENG && b.k === 'nb')).toBe(true);
    let w = declareWar(s, 'ENG', 'GER');
    const sti = w.ind.st.map((x) => (x ? { ...x, nb: 5 } : x));
    w = { ...w, ind: { ...w.ind, st: sti } };
    const u = aiBuildsF4c(w, ENG);
    expect(u.ind.build.some((b) => b.o === ENG && b.k === 'cfort')).toBe(true);
  });
});
