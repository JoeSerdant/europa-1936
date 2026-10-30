// Ovládání ve stylu HOI4 (M59): fronta rozkazů (Shift + pravé tlačítko), skupiny jednotek (Alt/Shift + 1–9), volba posunu okrajem.
import { describe, it, expect } from 'vitest';
import { orderMove, createGame } from '../src/engine/index.js';
import { gameStore, uiStore, NONE } from '../src/ui/store.js';
import * as A from '../src/ui/actions.js';
import { edgeScrollOn, setEdgeScroll } from '../src/ui/edge.js';
import { emptyBattlefield, addDivision, neighbors, idx, W } from './armyKit.js';

const GER = idx('GER');
const capital = W.owners[GER].cap;
// řetěz vlastních provincií: a → b → c
function chain() {
  const s = emptyBattlefield('GER');
  const a = capital;
  const b = neighbors(a).find((p) => s.ctrl[p] === GER && W.isLand(p));
  const c = neighbors(b).find((p) => p !== a && s.ctrl[p] === GER && W.isLand(p));
  return { s, a, b, c };
}

describe('fronta rozkazů (M59)', () => {
  it('append připojí cestu za dosavadní rozkaz, bez append se rozkaz přepíše', () => {
    const { s, a, b, c } = chain();
    let [t, id] = addDivision(s, 'GER', 'pesi', a);
    t = orderMove(t, [id], b);
    expect(t.mil.divs[id].path[t.mil.divs[id].path.length - 1]).toBe(b);
    const q = orderMove(t, [id], c, true);
    const path = q.mil.divs[id].path;
    expect(path[path.length - 1]).toBe(c);
    expect(path).toContain(b);
    expect(path.indexOf(b)).toBeLessThan(path.length - 1);
    const r = orderMove(q, [id], b);   // bez fronty se přepíše
    expect(r.mil.divs[id].path[r.mil.divs[id].path.length - 1]).toBe(b);
    expect(orderMove(q, [id], c, true)).toBe(q);   // už tam míří
  });
  it('append bez rozkazu se chová jako obyčejný rozkaz', () => {
    const { s, a, b } = chain();
    const [t, id] = addDivision(s, 'GER', 'pesi', a);
    const q = orderMove(t, [id], b, true);
    expect(q.mil.divs[id].path[q.mil.divs[id].path.length - 1]).toBe(b);
  });
  it('akce contextClick s Shiftem řadí rozkazy', () => {
    const { s, a, b, c } = chain();
    A.goMenu(); A.startGame('GER');
    const [t, id] = addDivision(s, 'GER', 'pesi', a);
    gameStore.setState(t);
    uiStore.setState({ ...uiStore.getState(), selDivs: [id], planEdit: null, fleetSel: 0 });
    expect(A.contextClick(b)).toBe(true);
    expect(A.contextClick(c, { shift: true })).toBe(true);
    const p = gameStore.getState().mil.divs[id].path;
    expect(p[p.length - 1]).toBe(c);
    expect(p).toContain(b);
  });
});

describe('skupiny jednotek (M59)', () => {
  it('uložení a vyvolání výběru', () => {
    const { s, a } = chain();
    A.goMenu(); A.startGame('GER');
    let [t, x] = addDivision(s, 'GER', 'pesi', a); let y;
    [t, y] = addDivision(t, 'GER', 'pesi', a);
    gameStore.setState(t);
    uiStore.setState({ ...uiStore.getState(), selDivs: NONE });
    expect(A.saveUnitGroup(1)).toBe(false);   // nic nevybráno
    A.setSelection([x, y]);
    expect(A.saveUnitGroup(1)).toBe(true);
    A.clearSelection();
    expect(uiStore.getState().selDivs).toEqual(NONE);
    expect(A.recallUnitGroup(1)).toBe(true);
    expect(uiStore.getState().selDivs).toEqual([x, y]);
    expect(A.recallUnitGroup(7)).toBe(false);   // prázdná skupina
  });
  it('rozpuštěné divize ze skupiny vypadnou', () => {
    const { s, a } = chain();
    A.goMenu(); A.startGame('GER');
    let [t, x] = addDivision(s, 'GER', 'pesi', a); let y;
    [t, y] = addDivision(t, 'GER', 'pesi', a);
    gameStore.setState(t);
    A.setSelection([x, y]); A.saveUnitGroup(2);
    const divs = gameStore.getState().mil.divs.slice(); divs[y] = null;
    gameStore.setState({ ...gameStore.getState(), mil: { ...gameStore.getState().mil, divs } });
    A.recallUnitGroup(2);
    expect(uiStore.getState().selDivs).toEqual([x]);
  });
});

describe('posun okrajem (M59)', () => {
  it('volba se pamatuje a bez úložiště nepadá', () => {
    expect(typeof edgeScrollOn()).toBe('boolean');
    setEdgeScroll(false); setEdgeScroll(true);
    expect(createGame()).toBeTruthy();
  });
});
