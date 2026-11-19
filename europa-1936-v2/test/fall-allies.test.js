// Kapitulace a bývalí spojenci (F2 A1): loutka nikdy nebojuje proti zemím, které byly v době její kapitulace na její straně (`dip.ally0`);
// exilová vláda žije dál u hostitele a při jeho pádu se stěhuje k jeho hostiteli; obnovená země přestává být loutkou okupanta.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, declareWar, capitulate, validateState, packGame, unpackGame, exileHost, exileDay, makePuppet, subjectsDay, warBlock,
  sameFaction, overlordOf,
} from '../src/engine/index.js';
import { atWar, enemiesOf } from '../src/engine/army/war.js';
import { alliesAtFall, formerAlly } from '../src/engine/dip/core.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), FRA = idx('FRA'), PLN = idx('POL'), BEL = idx('BEL'), ENG = idx('ENG'), SOV = idx('SOV');

/** Německo válčí s Francií, Polskem, Británií a Belgií (všichni v bloku Francie); Německo drží jen stát s Varšavou (zbytek Polska zůstane Polsku). */
function war39() {
  let s = createGame({ player: null, aiLevel: 0 });
  const fid = s.dip.fac[FRA], fac = s.dip.fac.slice(), facs = s.dip.facs.slice();
  fac[BEL] = fid; fac[ENG] = fid; facs[fid] = { ...facs[fid], mem: [...facs[fid].mem, BEL, ENG] };
  s = { ...s, dip: { ...s.dip, fac, facs, ver: s.dip.ver + 1 } };
  for (const t of ['FRA', 'POL', 'BEL', 'ENG']) s = declareWar(s, 'GER', t);
  const ctrl = s.ctrl.slice();
  for (const p of W.states[W.provState[W.owners[PLN].cap]].v) ctrl[p] = GER;
  return { ...s, ctrl };
}
/** Polsko kapituluje a Německo z něj udělá loutku (jako AI na konferenci). */
function puppetPoland() {
  let t = capitulate(war39(), PLN);
  if (!overlordOf(t, PLN)) t = makePuppet(t, GER, PLN);
  return t;
}
/** `n` dní diplomatického denního kroku loutek a exilů (bez armád – jen logika válek). */
const days = (s, n) => { for (let i = 0; i < n; i++) s = exileDay(subjectsDay(s)); return s; };

describe('spojenci z doby kapitulace', () => {
  it('kapitulace zapíše blok a spolubojovníky poraženého', () => {
    const s = war39();
    const al = alliesAtFall(s, PLN);
    expect(al).toContain(FRA);
    expect(al).toContain(BEL);
    expect(al).not.toContain(GER);
    expect(al).not.toContain(PLN);
    const t = capitulate(s, PLN);
    expect(t.dip.ally0[PLN]).toEqual(al);
    expect(formerAlly(t, PLN, FRA)).toBe(true);
    expect(formerAlly(t, PLN, SOV)).toBe(false);
    expect(createGame({ player: null }).dip.ally0.every((x) => x === 0)).toBe(true);
    expect(alliesAtFall(createGame({ player: null }), idx('SWI'))).toBe(0);
  });
  it('loutka po kapitulaci nevstoupí do války proti bývalým spojencům – ani po 1 a 5 letech', () => {
    const t = puppetPoland();
    expect(overlordOf(t, PLN)).toBe(GER);
    expect(exileHost(t, PLN)).toBe(FRA);   // exilová vláda žije dál ve Francii
    expect(overlordOf(days(t, 1), PLN)).toBe(GER);
    for (const n of [1, 365, 5 * 365]) {   // bez AI pána autonomie roste a loutka se může osamostatnit – s bývalými spojenci nebojuje ani tak
      const u = days(t, n);
      for (const e of enemiesOf(u.mil, PLN)) expect(formerAlly(u, PLN, e)).toBe(false);
      expect(atWar(u.mil, PLN, FRA)).toBe(false);
      expect(atWar(u.mil, PLN, BEL)).toBe(false);
      expect(exileHost(u, PLN)).toBe(FRA);
      expect(validateState(u)).toBeNull();
    }
  });
  it('do nových válek pána proti jiným zemím loutka vstupuje dál', () => {
    let t = declareWar(puppetPoland(), 'GER', 'SOV');
    t = days(t, 1);
    expect(atWar(t.mil, PLN, SOV)).toBe(true);
    expect(atWar(t.mil, PLN, FRA)).toBe(false);
  });
  it('bývalý spojenec nemůže loutce vyhlásit válku', () => {
    const t = puppetPoland();
    expect(warBlock(t, FRA, PLN)).toMatch(/bývalým spojencům/);
    expect(warBlock(t, SOV, PLN) || '').not.toMatch(/bývalým spojencům/);
  });
  it('uvolněný národ (Vichy) zdědí spojence mateřské země', () => {
    let s = war39();
    s = declareWar(s, 'GER', 'ENG');
    const ctrl = s.ctrl.slice();
    for (let p = 1; p <= W.L; p++) if (ctrl[p] === FRA && W.provOwner0[p] === FRA && W.vp[p] > 0) ctrl[p] = GER;
    const t = capitulate({ ...s, ctrl }, FRA);
    const vic = idx('VIC');
    if (overlordOf(t, vic) === GER) {   // Vichy vzniká, jen když konference uvolní národ
      expect(t.dip.ally0[vic]).toEqual(t.dip.ally0[FRA]);
      expect(atWar(days(t, 30).mil, vic, ENG)).toBe(false);
    }
    expect(t.dip.ally0[FRA]).toContain(ENG);
  });
});

describe('exilová vláda', () => {
  it('když padne hostitel, exil se stěhuje k jeho hostiteli; bez něj zaniká', () => {
    const t = puppetPoland();
    const ctrl = t.ctrl.slice();
    for (let p = 1; p <= W.L; p++) if (ctrl[p] === FRA) ctrl[p] = GER;
    const u = capitulate({ ...t, ctrl }, FRA);
    expect(exileHost(u, FRA)).toBe(ENG);   // Británie ještě bojuje
    expect(exileHost(u, PLN)).toBe(ENG);   // polská vláda odešla s francouzskou
    const c2 = u.ctrl.slice();
    for (let p = 1; p <= W.L; p++) if (c2[p] === ENG) c2[p] = GER;
    const v = capitulate({ ...u, ctrl: c2 }, ENG);   // poslední bojující země bloku – exily nemají kam jít
    expect(exileHost(v, PLN)).toBe(0);
    expect(exileHost(v, FRA)).toBe(0);
  });
  it('když padlý hostitel sám do exilu nejde, exil převezme nejsilnější bývalý spojenec, který ještě válčí', () => {
    let s = createGame({ player: null, aiLevel: 0 });   // Británie mimo blok Francie, ale ve válce s Německem (jako v roce 1940)
    for (const t of ['FRA', 'POL', 'ENG']) s = declareWar(s, 'GER', t);
    let ctrl = s.ctrl.slice();
    for (const p of W.states[W.provState[W.owners[PLN].cap]].v) ctrl[p] = GER;
    let t = capitulate({ ...s, ctrl }, PLN);
    expect(exileHost(t, PLN)).toBe(FRA);
    expect(t.dip.ally0[PLN]).toContain(ENG);
    ctrl = t.ctrl.slice();
    for (let p = 1; p <= W.L; p++) if (ctrl[p] === FRA) ctrl[p] = GER;
    t = capitulate({ ...t, ctrl }, FRA);
    expect(exileHost(t, FRA)).toBe(0);   // Francie mimo blok s bojujícím spojencem do exilu nejde
    expect(exileHost(t, PLN)).toBe(ENG);
  });
  it('kapitulovaná loutka přestane být loutkou, konference z ní může udělat loutku vítěze; spojenci se slučují', () => {
    let t = days(declareWar(puppetPoland(), 'GER', 'SOV'), 1);
    expect(atWar(t.mil, PLN, SOV)).toBe(true);
    const ctrl = t.ctrl.slice();
    let n = 0;
    for (let x = 1; x < W.states.length; x++) if (t.stateOwner[x] === PLN && n++ < 2) for (const p of W.states[x].v) ctrl[p] = SOV;
    const before = t.dip.ally0[PLN];
    t = capitulate({ ...t, ctrl }, PLN);
    expect([0, SOV]).toContain(overlordOf(t, PLN));
    for (const c of before) expect(t.dip.ally0[PLN]).toContain(c);   // staří spojenci zůstávají
    expect(t.dip.ally0[PLN]).toContain(GER);                        // a přibyl dosavadní pán (spojenec v této válce)
    const u = days(t, 30);
    for (const e of enemiesOf(u.mil, PLN)) expect(formerAlly(u, PLN, e)).toBe(false);
    expect(validateState(u)).toBeNull();
  });
  it('obnovená země přestane být loutkou okupanta a bojuje po boku hostitele', () => {
    const t = puppetPoland();
    const stateOwner = t.stateOwner.slice(), ctrl = t.ctrl.slice();
    for (let x = 1; x < W.states.length; x++) if (W.stateOwner0[x] === PLN && stateOwner[x] !== PLN) { stateOwner[x] = FRA; for (const p of W.states[x].v) ctrl[p] = FRA; }
    const r = exileDay({ ...t, stateOwner, ctrl });
    expect(overlordOf(r, PLN)).toBe(0);
    expect(r.dip.ally0[PLN]).toBe(0);
    expect(sameFaction(r, PLN, FRA)).toBe(true);
    expect(atWar(r.mil, PLN, GER)).toBe(true);
    expect(atWar(r.mil, PLN, FRA)).toBe(false);
    expect(validateState(r)).toBeNull();
  });
  it('uložení a kontrola stavu znají ally0', () => {
    const t = puppetPoland();
    expect(unpackGame(JSON.parse(JSON.stringify(packGame(t)))).state.dip.ally0[PLN]).toEqual(t.dip.ally0[PLN]);
    expect(validateState({ ...t, dip: { ...t.dip, ally0: null } })).toBeTruthy();
  });
});
