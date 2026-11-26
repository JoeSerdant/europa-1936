// S9: přestavby flotil, úder na přístav, příprava vylodění.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, declareWar, validateState, GAME_VERSION, advance, fleetPower, homeSea, sailBlock,
  refitNeed, refitBlock, refitFleet, refitDok, refitBaseAt, NAV, orderFleet, missionBlock,
} from '../src/engine/index.js';
import { navDay } from '../src/engine/nav/day.js';
import { airDay } from '../src/engine/air/day.js';
import { portStrikeTarget } from '../src/engine/ai/hoi.js';
import { addDivision } from './armyKit.js';

const W = getWorld();
const ENG = W.ownerIdx.ENG, GER = W.ownerIdx.GER, FRA = W.ownerIdx.FRA;
const firstFleet = (s, o) => s.nav.fleets.findIndex((f) => f && f.o === o);
/** Země `o` dostane o úroveň lepší techniku všech typů lodí své první flotily. */
function upgrade(s, o) {
  const f = s.nav.fleets[firstFleet(s, o)], lv = s.mil.lv.slice(), cur = { ...lv[o] };
  for (const k in f.ships) cur[k] = (cur[k] || 1) + 1;
  lv[o] = cur;
  return { ...s, mil: { ...s.mil, lv } };
}
/** Námořní základna v přístavu, u kterého flotila stojí. */
function withBase(s, o, label, lvl = 1) {
  const st = s.ind.st.slice();
  for (let p = 1; p <= W.L; p++) if (W.portLevel[p] && W.portSea[p] === label && s.ctrl[p] === o) { const x = W.provState[p]; st[x] = { ...st[x], nb: lvl }; break; }
  return { ...s, ind: { ...s.ind, st } };
}

describe('S9: přestavby flotil', () => {
  const s0 = createGame({ player: 'ENG' });
  const id = firstFleet(s0, ENG), f0 = s0.nav.fleets[id];
  it('flotila si pamatuje úrovně lodí; výzkum ji nezlepší, dokud se nepřestaví', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(56);
    expect(f0.lv).toBeTruthy();
    expect(refitNeed(s0, f0)).toEqual([]);
    const s = upgrade(s0, ENG);
    expect(refitNeed(s, s.nav.fleets[id]).length).toBeGreaterThan(0);
    expect(fleetPower(s, ENG, f0.ships, f0.lv).atk).toBe(fleetPower(s0, ENG, f0.ships, f0.lv).atk);
    expect(fleetPower(s, ENG, f0.ships).atk).toBeGreaterThan(fleetPower(s0, ENG, f0.ships).atk);
    expect(validateState(s0)).toBeNull();
  });
  it('přestavba jen v přístavu se základnou; trvá dny, zabírá loděnice a flotila zatím nepluje', () => {
    let s = upgrade(s0, ENG);
    const noBase = { ...s, ind: { ...s.ind, st: s.ind.st.map((e) => (e ? { ...e, nb: 0 } : e)) } };
    expect(refitBlock(noBase, id)).toMatch(/námořní základnou/);
    s = withBase(s, ENG, f0.p);
    expect(refitBaseAt(s, ENG, f0.p)).toBeGreaterThan(0);
    expect(refitBlock(s, id)).toBeNull();
    let r = refitFleet(s, id);
    expect(r.nav.fleets[id].rf).toBe(NAV.REFIT_DAYS);
    expect(refitDok(r, ENG)).toBeGreaterThan(0);
    expect(orderFleet(r, id, homeSea(r, FRA).sea)).toBe(r);
    expect(refitFleet(r, id)).toBe(r);
    for (let i = 0; i < NAV.REFIT_DAYS; i++) r = navDay(r);
    const f = r.nav.fleets[id];
    expect(f.rf).toBeUndefined();
    expect(refitNeed(r, f)).toEqual([]);
    expect(fleetPower(r, ENG, f.ships, f.lv).atk).toBeGreaterThan(fleetPower(r, ENG, f0.ships, f0.lv).atk);
    expect(r.log.items.some((e) => e.k === 'refit')).toBe(true);
    expect(validateState(r)).toBeNull();
  });
});

describe('S9: úder na přístav', () => {
  it('bombardéry poškodí flotilu stojící v přístavních vodách nepřítele silněji než úder na lodě', () => {
    const s0 = declareWar(createGame({ player: null }), 'GER', 'ENG');
    const fid = firstFleet(s0, ENG), f = s0.nav.fleets[fid];
    let ps = 0;
    for (let p = 1; p <= W.L && !ps; p++) if (W.portLevel[p] && W.portSea[p] === f.p && s0.stateOwner[W.provState[p]] === ENG) ps = W.provState[p];
    expect(ps).toBeGreaterThan(0);
    const base = (() => { for (let x = 1; x < W.states.length; x++) if (s0.stateOwner[x] === GER && s0.ind.st[x].afb > 0) return x; return 0; })();
    const strike = (m) => {
      const wings = [null, { id: 1, o: GER, t: 'tac', n: 200, s: base, m, to: ps, c: 0, a: 0 }];
      return airDay({ ...s0, air: { ...s0.air, wings, wn: 1 } });
    };
    expect(missionBlock({ ...s0, air: { ...s0.air, wings: [null, { id: 1, o: GER, t: 'tac', n: 1, s: base, m: null, to: 0, c: 0, a: 0 }] } }, 1, 'port', ps)).not.toMatch(/přístav|válce/);
    const port = strike('port').nav.fleets[fid].dm || 0, nav = strike('nav').nav.fleets[fid].dm || 0;
    expect(port).toBeGreaterThan(nav);
    expect(portStrikeTarget(s0, GER, base, 5000)).toBeGreaterThan(0);
  });
});

describe('S9: příprava vylodění', () => {
  it('divize v přístavu se připravuje; nepřipravená nevypluje na nepřátelské pobřeží', () => {
    let s = declareWar(createGame({ player: 'ENG' }), 'ENG', 'FRA');
    const port = homeSea(s, ENG).prov;
    const [s2, id] = addDivision(s, 'ENG', 'pesi', port);
    s = { ...s2, nav: { ...s2.nav, pool: s2.nav.pool.map((x, i) => (i === ENG ? { ...x, tr: 5000 } : x)) } };
    let dest = 0;
    for (let p = 1; p <= W.L && !dest; p++) if (s.ctrl[p] === FRA && W.portLevel[p] && W.sea && !s.mil.divs.some((d) => d && d.p === p)) dest = p;
    expect(sailBlock(s, [id], dest)).toMatch(/připravené/);
    s = advance(s, 24 * Math.ceil(NAV.PREP_DAYS * NAV.PREP_MIN + 1));
    expect(s.mil.divs[id].ip).toBeGreaterThanOrEqual(NAV.PREP_MIN);
    expect(sailBlock(s, [id], dest) || '').not.toMatch(/připravené/);
  });
});
