import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, advance, formWing, disbandWing, reinforceWing, setMission, missionBlock, airOf, targetsFor, basesOf, afbOf, airSupport,
  build, declareWar, runCheat, packGame, unpackGame, PLANES, AIR, addLine, setLineFactories, industryOf,
} from '../src/engine/index.js';

const W = getWorld();
const GER = W.ownerIdx.GER, POL = W.ownerIdx.POL, FRA = W.ownerIdx.FRA;
const game = () => createGame({ player: 'GER' });

describe('letectvo: počáteční stav', () => {
  it('země mají letiště, křídla a stíhače na hlídce nad domovskou základnou', () => {
    const s = game();
    const a = airOf(s, GER);
    expect(a.total).toBeGreaterThan(300);
    expect(a.bases.length).toBeGreaterThan(0);
    expect(a.used).toBeLessThanOrEqual(a.cap);
    for (const wg of a.wings) { expect(afbOf(s.ind, wg.s)).toBeGreaterThan(0); if (wg.t === 'sti') { expect(wg.m).toBe('air'); expect(wg.to).toBe(wg.s); } }
    expect(airOf(s, POL).total).toBeGreaterThan(0);
  });
  it('stav je serializovatelný a projde uložením', () => {
    const s = game();
    expect(JSON.parse(JSON.stringify(s.air))).toEqual(s.air);
    expect(unpackGame(JSON.parse(JSON.stringify(packGame(s)))).error).toBeUndefined();
  });
});

describe('letectvo: příkazy', () => {
  it('formWing, reinforceWing a disbandWing hlídají rezervu a kapacitu letiště', () => {
    let s = runCheat(game(), 'plane sti 200').state;
    const base = basesOf(s, GER).sort((a, b) => b.free - a.free)[0];
    expect(base.free).toBeGreaterThan(10);
    expect(formWing(s, GER, 'sti', 9999, base.s)).toBe(s);
    expect(formWing(s, GER, 'str', 5, base.s)).toBe(s);   // zamčeno technologií
    expect(formWing(s, GER, 'sti', base.free + 1 > 200 ? 201 : base.free + 1, base.s)).toBe(s);
    const n = Math.min(base.free, 50);
    s = formWing(s, GER, 'sti', n, base.s);
    const id = s.air.wings.length - 1;
    expect(s.air.wings[id].n).toBe(n);
    expect(s.air.pool[GER].sti).toBe(200 - n);
    expect(reinforceWing(s, id, 0)).toBe(s);
    const after = disbandWing(s, id);
    expect(after.air.wings[id]).toBe(null);
    expect(after.air.pool[GER].sti).toBe(200);
    expect(disbandWing(after, id)).toBe(after);
  });
  it('mise: role, dolet a válka', () => {
    const s = game();
    const bit = s.air.wings.find((w) => w && w.o === GER && w.t === 'bit');
    const sti = s.air.wings.find((w) => w && w.o === GER && w.t === 'sti');
    const near = targetsFor(s, bit.id, 'cas');
    expect(near.length).toBeGreaterThan(0);
    expect(setMission(s, bit.id, 'air', bit.s)).toBe(s);          // bitevní letoun nehlídá
    expect(setMission(s, sti.id, 'bomb', near[0].s)).toBe(s);       // stíhač nebombarduje
    const ok = setMission(s, bit.id, 'cas', near[0].s);
    expect(ok.air.wings[bit.id].m).toBe('cas');
    expect(setMission(ok, bit.id, 'cas', near[0].s)).toBe(ok);
    expect(setMission(ok, bit.id, null).air.wings[bit.id].m).toBe(null);
    const far = [...Array(W.states.length).keys()].slice(1).find((x) => missionBlock(s, bit.id, 'cas', x) && /dolet/.test(missionBlock(s, bit.id, 'cas', x)));
    expect(far).toBeTruthy();
    const tac = s.air.wings.find((w) => w && w.o === GER && w.t === 'tac');
    const polState = [...Array(W.states.length).keys()].slice(1).find((x) => s.stateOwner[x] === POL && !missionBlock({ ...s, mil: { ...s.mil, wars: [[Math.min(GER, POL), Math.max(GER, POL)]] } }, tac.id, 'bomb', x));
    expect(missionBlock(s, tac.id, 'bomb', polState || 1)).toBeTruthy();   // bez války nelze
  });
});

describe('letectvo: denní krok', () => {
  it('podpora z letadel dává divizím bonus a je deterministická', () => {
    let s = declareWar(game(), 'GER', 'POL');
    const bit = s.air.wings.find((w) => w && w.o === GER && w.t === 'bit');
    const tgt = targetsFor(s, bit.id, 'cas')[0].s;
    s = setMission(s, bit.id, 'cas', tgt);
    const a = advance(s, 24 * 3), b = advance(s, 24 * 3);
    expect(airSupport(a, GER, tgt)).toBeGreaterThan(0);
    expect(airSupport(a, GER, tgt)).toBeLessThanOrEqual(AIR.CAS_MAX);
    expect(JSON.stringify(a.air)).toBe(JSON.stringify(b.air));
  });
  it('nepřátelské hlídky snižují krytí a způsobují ztráty', () => {
    let s = declareWar(game(), 'GER', 'POL');
    const tac = s.air.wings.find((w) => w && w.o === GER && w.t === 'tac');
    const z = targetsFor(s, tac.id, 'cas').find((x) => s.stateOwner[x.s] === POL) || targetsFor(s, tac.id, 'cas')[0];
    s = setMission(s, tac.id, 'cas', z.s);
    const polSti = s.air.wings.filter((w) => w && w.o === POL && w.t === 'sti');
    const clear = advance(s, 24 * 10);
    let hot = s;
    for (const wg of polSti) hot = setMission(hot, wg.id, 'air', z.s);
    hot = advance(hot, 24 * 10);
    const left = (x) => x.air.wings[tac.id] ? x.air.wings[tac.id].n : 0;
    expect(left(hot)).toBeLessThanOrEqual(left(clear));
  });
  it('bombardování ubírá podporu války a sklady cíle', () => {
    let s = declareWar(game(), 'GER', 'POL');
    s = runCheat(s, 'research all').state;
    s = runCheat(s, 'plane str 60').state;
    const b = basesOf(s, GER).sort((x, y) => y.free - x.free)[0];
    s = formWing(s, GER, 'str', 60, b.s);
    const wg = s.air.wings[s.air.wings.length - 1];
    const tgt = targetsFor(s, wg.id, 'bomb').find((x) => s.stateOwner[x.s] === POL);
    expect(tgt).toBeTruthy();
    s = setMission(s, wg.id, 'bomb', tgt.s);
    const e = advance(s, 24 * 5);
    expect(e.pol.own[POL].ws).toBeLessThan(s.pol.own[POL].ws);
    expect(e.mil.stock[POL].pusky).toBeLessThan(s.mil.stock[POL].pusky);
  });
  it('křídlo na ztraceném letišti zaniká s částí ztrát', () => {
    let s = game();
    const wg = s.air.wings.find((w) => w && w.o === GER && w.t === 'bit');
    const ctrl = s.ctrl.slice(); ctrl[W.states[wg.s].cap] = FRA;
    const so = s.stateOwner.slice();
    s = advance({ ...s, ctrl, ownerVer: 1 }, 24);
    expect(s.air.wings[wg.id]).toBe(null);
    expect(s.air.pool[GER].bit).toBe(Math.floor(wg.n * (1 - AIR.LOST_BASE_LOSS)));
    void so;
  });
});

describe('letectvo: výroba a letiště', () => {
  it('letecká linka dodává letadla do rezervy a letiště se staví', () => {
    let s = game();
    const sum = industryOf(s, GER);
    const big = sum.lines.find((l) => l.fac > 2);
    s = setLineFactories(s, big.id, big.fac - 1);
    const lined = addLine(s, GER, 'sti', 1);
    expect(lined).not.toBe(s);
    const out = advance(lined, 24 * 30);
    expect(out.air.pool[GER].sti).toBeGreaterThan(0);
    const st = [...Array(W.states.length).keys()].slice(1).find((x) => s.stateOwner[x] === GER && afbOf(s.ind, x) < AIR.BASE_MAX - 1);
    const b = build(s, st, 'afb');
    expect(b.ind.build.some((x) => x.k === 'afb')).toBe(true);
    let t = b;
    for (let i = 0; i < 6; i++) t = build(t, st, 'afb');
    expect(t.ind.build.filter((x) => x.s === st && x.k === 'afb').length + afbOf(t.ind, st)).toBeLessThanOrEqual(AIR.BASE_MAX);
    expect(addLine(s, GER, 'str', 1)).toBe(s);    // zamčeno technologií
  });
  it('výzkum zvedá úroveň letounů a síla roste', () => {
    const s = runCheat(game(), 'research sti2').state;
    expect(s.mil.lv[GER].sti).toBe(2);
  });
  it('AI staví letecké linky a posílá křídla na misi bez porušení determinismu', () => {
    let s = createGame({ player: 'GER', aiLevel: 2 });
    s = declareWar(s, 'FRA', 'GER');
    const a = advance(s, 24 * 60), b = advance(s, 24 * 60);
    expect(JSON.stringify(a.air)).toBe(JSON.stringify(b.air));
    expect(airOf(a, FRA).wings.some((w) => w.m === 'air')).toBe(true);
    expect(PLANES.sti.range).toBeGreaterThan(0);
  });
});
