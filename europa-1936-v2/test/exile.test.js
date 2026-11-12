// Exilové vlády (M83): hostitel, přechod divizí, flotil a zásob při kapitulaci, zánik exilu, obnova země po osvobození, stav a texty.
import { describe, it, expect } from 'vitest';
import {
  createGame, getWorld, declareWar, capitulate, validateState, GAME_VERSION, packGame, unpackGame, diplomacyOf, DIP, divisionCount,
  exileHost, exileCandidate, restorable, restoreCountry, exileDay, sameFaction,
} from '../src/engine/index.js';
import { atWar } from '../src/engine/army/war.js';
import { logLine, logImportant } from '../src/ui/logText.js';
import { popupFor } from '../src/ui/popups.js';

const W = getWorld();
const idx = (t) => W.ownerIdx[t];
const GER = idx('GER'), FRA = idx('FRA'), PLN = idx('POL'), BEL = idx('BEL'), ENG = idx('ENG'), SWI = idx('SWI');

/** Německo válčí s Francií, Polskem a Belgií (Francouzský systém); Německo drží všechny polské provincie a pár polských divizí stojí ve Francii. */
function fallOfPoland() {
  let s = createGame({ player: null, aiLevel: 0 });
  for (const t of ['FRA', 'POL', 'BEL']) s = declareWar(s, 'GER', t);
  const ctrl = s.ctrl.slice();
  for (let p = 1; p <= W.L; p++) if (ctrl[p] === PLN) ctrl[p] = GER;
  const fr = W.owners[FRA].cap;
  const divs = s.mil.divs.slice();
  const abroad = [];
  for (let id = 1; id < divs.length && abroad.length < 3; id++) if (divs[id] && divs[id].o === PLN) { divs[id] = { ...divs[id], p: fr, path: [], b: 0 }; abroad.push(id); }
  return { s: { ...s, ctrl, mil: { ...s.mil, divs } }, abroad };
}

describe('hostitel', () => {
  it('exil přijme vedoucí bloku, který ještě bojuje; země mimo blok nebo bez bojujícího spojence hostitele nemá', () => {
    const { s } = fallOfPoland();
    expect(exileCandidate(s, PLN)).toBe(FRA);
    expect(exileCandidate(s, SWI)).toBe(0);
    const peace = createGame({ player: null });
    expect(exileCandidate(peace, PLN)).toBe(0);   // nikdo neválčí
    const frDown = { ...s, dip: { ...s.dip, cap: s.dip.cap.map((v, i) => (i === FRA ? 1 : v)) } };
    expect(exileCandidate(frDown, PLN)).toBe(BEL);
  });
});

describe('kapitulace s exilem', () => {
  const { s, abroad } = fallOfPoland();
  const t = capitulate(s, PLN);
  it('divize na území spojenců přejdou k hostiteli se zkopírovanou šablonou a nižší organizací', () => {
    expect(exileHost(t, PLN)).toBe(FRA);
    for (const id of abroad) {
      const d = t.mil.divs[id];
      expect(d).toBeTruthy();
      expect(d.o).toBe(FRA);
      expect(t.mil.tpl[d.tpl].o).toBe(FRA);
      expect(t.mil.tpl[d.tpl].nm).toMatch(/exil/);
      expect(d.org).toBeCloseTo(s.mil.divs[id].org * DIP.EXILE_ORG, 6);
    }
    expect(divisionCount(t, PLN)).toBe(0);
    expect(t.log.items.some((e) => e.k === 'exile' && e.o === PLN && e.x === FRA && e.y === abroad.length)).toBe(true);
  });
  it('flotily, lodě v rezervě a podíl zásob přejdou k hostiteli', () => {
    expect(t.nav.fleets.some((f) => f && f.o === PLN)).toBe(false);
    const before = s.nav.fleets.filter((f) => f && f.o === PLN).length;
    expect(t.nav.fleets.filter((f) => f && f.o === FRA).length).toBe(s.nav.fleets.filter((f) => f && f.o === FRA).length + before);
    expect(t.nav.pool[FRA].tr).toBe(s.nav.pool[FRA].tr + s.nav.pool[PLN].tr);
    expect(t.nav.pool[PLN].tr).toBe(0);
    expect(t.mil.stock[FRA].pusky).toBe((s.mil.stock[FRA].pusky || 0) + Math.floor((s.mil.stock[PLN].pusky || 0) * DIP.EXILE_STOCK));
    expect(validateState(t)).toBeNull();
  });
  it('země bez bloku nebo bez bojujícího spojence do exilu nejde', () => {
    let a = declareWar(createGame({ player: null, aiLevel: 0 }), 'GER', 'SWI');
    const ctrl = a.ctrl.slice();
    for (let p = 1; p <= W.L; p++) if (ctrl[p] === SWI) ctrl[p] = GER;
    a = capitulate({ ...a, ctrl }, SWI);
    expect(exileHost(a, SWI)).toBe(0);
    expect(a.log.items.some((e) => e.k === 'exile')).toBe(false);
  });
  it('když kapituluje hostitel, exily u něj zanikají', () => {
    const ctrl = t.ctrl.slice();
    for (let p = 1; p <= W.L; p++) if (ctrl[p] === FRA) ctrl[p] = GER;
    const u = capitulate({ ...t, ctrl }, FRA);
    expect(exileHost(u, PLN)).toBe(0);
  });
});

describe('obnova země', () => {
  const { s } = fallOfPoland();
  const t = capitulate(s, PLN);
  it('dokud blok hostitele nevlastní stát s hlavním městem, země se neobnoví', () => {
    expect(restorable(t, PLN)).toEqual([]);
    expect(restoreCountry(t, PLN)).toBe(t);
    expect(exileDay(t)).toBe(t);
  });
  it('po osvobození hlavního města se země obnoví: dostane své státy, vstoupí do bloku a válčí po boku hostitele', () => {
    const stateOwner = t.stateOwner.slice(), ctrl = t.ctrl.slice();
    let n = 0;
    for (let x = 1; x < W.states.length; x++) if (W.stateOwner0[x] === PLN) { stateOwner[x] = FRA; for (const p of W.states[x].v) ctrl[p] = FRA; n++; }
    const freed = { ...t, stateOwner, ctrl };
    expect(restorable(freed, PLN)).toHaveLength(n);
    const r = exileDay(freed);
    expect(r.dip.cap[PLN]).toBe(0);
    expect(exileHost(r, PLN)).toBe(0);
    expect(r.stateOwner[W.provState[W.owners[PLN].cap]]).toBe(PLN);
    expect(r.ctrl[W.owners[PLN].cap]).toBe(PLN);
    expect(sameFaction(r, PLN, FRA)).toBe(true);
    expect(atWar(r.mil, PLN, GER)).toBe(true);
    expect(r.pol.own[PLN].stab).toBe(DIP.RESTORE_STAB);
    expect(r.mil.man[PLN]).toBeGreaterThanOrEqual(DIP.RESTORE_MAN);
    expect(r.log.items.some((e) => e.k === 'restore' && e.o === PLN && e.x === FRA)).toBe(true);
    expect(validateState(r)).toBeNull();
    expect(exileDay(r)).toBe(r);
  });
});

describe('stav, přehled a texty', () => {
  it('verze hry, kontrola stavu, uložení a přehled diplomacie znají exil', () => {
    expect(GAME_VERSION).toBeGreaterThanOrEqual(40);
    const { s } = fallOfPoland();
    const t = capitulate(s, PLN);
    expect(validateState({ ...t, dip: { ...t.dip, exile: null } })).toBeTruthy();
    expect(unpackGame(JSON.parse(JSON.stringify(packGame(t)))).state.dip.exile[PLN]).toBe(FRA);
    expect(diplomacyOf(t, ENG).list.find((c) => c.o === PLN)).toMatchObject({ capitulated: true, exile: FRA });
    expect(createGame({ player: null }).dip.exile.every((x) => x === 0)).toBe(true);
  });
  it('záznamy exile a restore mají texty a karty', () => {
    expect(logLine({ k: 'exile', o: PLN, x: FRA, y: 3 }, ENG).text).toMatch(/do exilu/);
    expect(logLine({ k: 'restore', o: PLN, x: FRA, y: 5 }, ENG).text).toMatch(/osvobozena/);
    expect(logImportant({ k: 'exile', o: PLN, x: FRA }, FRA)).toBe(true);
    expect(logImportant({ k: 'exile', o: PLN, x: FRA }, ENG)).toBe(false);
    expect(logImportant({ k: 'restore', o: PLN, x: FRA }, ENG)).toBe(true);
    expect(popupFor({ k: 'exile', o: PLN, x: FRA, y: 3 }, FRA)).toMatchObject({ kind: 'exile', sticky: true });
    expect(popupFor({ k: 'exile', o: PLN, x: FRA, y: 3 }, ENG)).toBeNull();
    expect(popupFor({ k: 'restore', o: PLN, x: FRA }, ENG)).toMatchObject({ kind: 'restore' });
  });
});
