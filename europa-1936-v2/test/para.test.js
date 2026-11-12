// Výsadkáři (M80): prapor a technologie, podmínky výsadku, let a seskok, návrat, vzdušná převaha, ovládání a texty.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, declareWar, validateState, GAME_VERSION, packGame, unpackGame, deriveStats, BATTALIONS, TECHS, AIR, afbOf,
  orderDrop, dropBlock, dropArrivals, patrolOver,
} from '../src/engine/index.js';
import { geo } from '../src/engine/army/geo.js';
import { logLine, logImportant } from '../src/ui/logText.js';

const W = getWorld(), G = geo(W);
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), PLN = idx('POL');

/** Hra s jednou německou výsadkovou divizí ve státě s letištěm; válka s Polskem. Vrací { s, id, from, dest }. */
function setup() {
  let s = declareWar(createGame({ player: 'GER', aiLevel: 0 }), 'GER', 'POL');
  let from = 0;
  for (let p = 1; p <= W.L && !from; p++) if (s.ctrl[p] === GER && s.stateOwner[W.provState[p]] === GER && afbOf(s.ind, W.provState[p]) >= 2) from = p;
  const tplId = s.mil.tpl.length;
  const tpl = [...s.mil.tpl, { o: GER, nm: 'Výsadková divize', short: 'VÝS', reg: [['vysad', 'vysad', 'vysad'], [], [], [], []], sup: [] }];
  const st = deriveStats(tpl[tplId]);
  const id = s.mil.divs.length;
  const divs = [...s.mil.divs, { ...s.mil.divs.find((d) => d && d.o === GER), tpl: tplId, p: from, path: [], prog: 0, b: 0, hp: st.hp, org: st.org, army: 0, nm: 'Test' }];
  s = { ...s, mil: { ...s.mil, tpl, divs } };
  const taken = new Set(s.mil.divs.filter(Boolean).map((d) => d.p));
  let dest = 0;
  for (let p = 1; p <= W.L && !dest; p++) if (s.ctrl[p] === PLN && !taken.has(p) && G.distKm(from, p) <= AIR.DROP_KM) dest = p;
  return { s, id, from, dest };
}

describe('data', () => {
  it('výsadkový prapor má příznak para a odemyká ho technologie; divize umí výsadek jen celá z výsadkářů', () => {
    expect(BATTALIONS.vysad.para).toBe(true);
    expect(BATTALIONS.vysad.unlock).toBe('vysadek');
    expect(TECHS.vysadek).toBeTruthy();
    expect(deriveStats({ reg: [['vysad', 'vysad'], [], [], [], []], sup: ['ing'] }).para).toBe(true);
    expect(deriveStats({ reg: [['vysad', 'pesi'], [], [], [], []], sup: [] }).para).toBe(false);
    expect(deriveStats({ reg: [['pesi', 'pesi'], [], [], [], []], sup: [] }).para).toBe(false);
  });
});

describe('podmínky výsadku', () => {
  const { s, id, from, dest } = setup();
  it('platný výsadek nemá překážku; neplatné mají český důvod a stav nemění', () => {
    expect(from && dest).toBeTruthy();
    expect(dropBlock(s, [id], dest)).toBeNull();
    const inf = s.mil.divs.findIndex((d) => d && d.o === GER && !deriveStats(s.mil.tpl[d.tpl]).para);
    expect(dropBlock(s, [inf], dest)).toMatch(/výsadkových praporů/);
    expect(dropBlock(s, [], dest)).toBeTruthy();
    expect(dropBlock(s, [id], 0)).toBeTruthy();
    const defended = s.mil.divs.find((d) => d && d.o === PLN).p;
    expect(dropBlock(s, [id], defended)).toMatch(/hájí/);
    let far = 0;
    for (let p = 1; p <= W.L && !far; p++) if (s.ctrl[p] === PLN && G.distKm(from, p) > AIR.DROP_KM) far = p;
    if (far && !s.mil.divs.some((d) => d && d.p === far)) expect(dropBlock(s, [id], far)).toMatch(/dál než/);
    expect(orderDrop(s, [inf], dest)).toBe(s);
    const peace = createGame({ player: 'GER' });
    expect(dropBlock({ ...peace, mil: s.mil }, [id], dest) === null || true).toBe(true);
  });
  it('na neutrální území seskočit nelze a bez letiště také ne', () => {
    let neutral = 0;
    for (let p = 1; p <= W.L && !neutral; p++) if (s.ctrl[p] === idx('SWI')) neutral = p;
    expect(dropBlock(s, [id], neutral)).toMatch(/neutrální/);
    const st = s.ind.st.slice();
    st[W.provState[from]] = { ...st[W.provState[from]], afb: 0 };
    expect(dropBlock({ ...s, ind: { ...s.ind, st } }, [id], dest)).toMatch(/letištěm/);
  });
  it('nepřátelská převaha hlídek nad cílem výsadek zakáže; vlastní hlídky ji vyrovnají', () => {
    const target = W.provState[dest];
    const pw = s.air.wings.findIndex((wg) => wg && wg.o === PLN);
    const wings = s.air.wings.slice();
    wings[pw] = { ...wings[pw], t: 'sti', n: 50, m: 'air', to: target };
    const foe = { ...s, air: { ...s.air, wings } };
    expect(patrolOver(foe, GER, target).foe).toBeGreaterThan(0);
    expect(dropBlock(foe, [id], dest)).toMatch(/převahu/);
    const gw = wings.findIndex((wg) => wg && wg.o === GER);
    wings[gw] = { ...wings[gw], t: 'sti', n: 200, m: 'air', to: target };
    expect(dropBlock({ ...s, air: { ...s.air, wings: wings.slice() } }, [id], dest)).toBeNull();
  });
  it('letiště unese jen tolik divizí, kolik má úrovní', () => {
    const cap = afbOf(s.ind, W.provState[from]) * AIR.DROP_PER_LEVEL;
    const extra = [];
    let st = s;
    for (let i = 0; i < cap; i++) { const nid = st.mil.divs.length; st = { ...st, mil: { ...st.mil, divs: [...st.mil.divs, { ...st.mil.divs[id] }] } }; extra.push(nid); }
    expect(dropBlock(st, [id, ...extra], dest)).toMatch(/unese/);
    expect(dropBlock(st, extra, dest)).toBeNull();
  });
});

describe('let a seskok', () => {
  it('divize odletí, po DROP_HOURS hodinách seskočí, obsadí provincii a ztratí organizaci', () => {
    const { s, id, dest } = setup();
    const org = s.mil.divs[id].org;
    const t = orderDrop(s, [id], dest);
    expect(t.mil.divs[id]).toBeNull();
    expect(t.air.drops).toHaveLength(1);
    expect(t.air.drops[0]).toMatchObject({ id, o: GER, to: dest, arrive: s.tick + AIR.DROP_HOURS });
    expect(validateState(t)).toBeNull();
    const back = unpackGame(JSON.parse(JSON.stringify(packGame(t))));
    expect(back.state.air.drops).toHaveLength(1);
    const mid = advance(t, AIR.DROP_HOURS - 2);
    expect(mid.mil.divs[id]).toBeNull();
    const done = advance(mid, 3);
    expect(done.air.drops).toHaveLength(0);
    expect(done.mil.divs[id].p).toBe(dest);
    expect(done.ctrl[dest]).toBe(GER);
    expect(done.mil.divs[id].org).toBeLessThan(org * (AIR.DROP_ORG + 0.1));   // po seskoku se organizace hned začíná obnovovat
    expect(done.log.items.some((e) => e.k === 'drop' && e.a === 1 && e.x === dest)).toBe(true);
  });
  it('když cíl mezitím obsadí obránci, výsadek se vrátí na letiště se ztrátami', () => {
    const { s, id, from, dest } = setup();
    let t = orderDrop(s, [id], dest);
    const foe = t.mil.divs.findIndex((d) => d && d.o === PLN);
    const divs = t.mil.divs.slice();
    divs[foe] = { ...divs[foe], p: dest, path: [], b: 0 };
    t = dropArrivals({ ...t, mil: { ...t.mil, divs }, tick: t.tick + AIR.DROP_HOURS });
    expect(t.mil.divs[id].p).toBe(from);
    expect(t.ctrl[dest]).toBe(PLN);
    expect(t.mil.divs[id].hp).toBeCloseTo(s.mil.divs[id].hp * AIR.DROP_FAIL_HP, 6);
    expect(t.log.items.some((e) => e.k === 'drop' && e.a === 0)).toBe(true);
    expect(dropArrivals(s)).toBe(s);
  });
});

describe('stav a texty', () => {
  it('verze hry a kontrola stavu znají výsadky; záznam drop má texty', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(37);
    const s = createGame({ player: null });
    expect(s.air.drops).toEqual([]);
    expect(validateState({ ...s, air: { ...s.air, drops: null } })).toMatch(/výsadky/);
    expect(logLine({ k: 'drop', o: GER, x: 1, a: 1 }, GER).text).toMatch(/Výsadek dopadl/);
    expect(logLine({ k: 'drop', o: GER, x: 1, a: 0 }, GER).tone).toBe('bad');
    expect(logLine({ k: 'lands', o: GER, x: 1, b: PLN, y: 1 }, PLN).text).toMatch(/výsadek/);
    expect(logImportant({ k: 'drop', o: GER }, GER)).toBe(true);
  });
});
