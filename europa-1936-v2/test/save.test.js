// Uložené hry (M25): obálka a kontrola stavu, sloty v úložišti (s falešným localStorage), načtení a pokračování hry, chybové stavy a akce rozhraní.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createGame, advance, packGame, unpackGame, validateState, SAVE_FORMAT, GAME_VERSION, startFocus, getWorld } from '../src/engine/index.js';
import { listSaves, writeSave, readSave, deleteSave, SLOTS, slotName } from '../src/ui/saves.js';
import { gameStore, uiStore } from '../src/ui/store.js';
import * as A from '../src/ui/actions.js';

const W = getWorld();
const fake = (opts = {}) => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (opts.full) throw new Error('quota'); m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    _m: m,
  };
};
let prev;
beforeEach(() => { prev = globalThis.localStorage; globalThis.localStorage = fake(); });
afterEach(() => { if (prev === undefined) delete globalThis.localStorage; else globalThis.localStorage = prev; });

describe('obálka a kontrola', () => {
  const s = advance(createGame({ player: 'GER', aiLevel: 2 }), 24 * 10);
  it('zabalení nese verzi, čas a hráče; po rozbalení je stav shodný', () => {
    const p = packGame(s);
    expect(p).toMatchObject({ fmt: SAVE_FORMAT, v: GAME_VERSION, tick: s.tick, player: 'GER' });
    const r = unpackGame(JSON.parse(JSON.stringify(p)));
    expect(r.error).toBeUndefined();
    expect(r.state).toEqual(s);
    expect(validateState(s)).toBeNull();
  });
  it('odmítne cizí soubor, jinou verzi i poškozený stav s českou hláškou', () => {
    expect(unpackGame(null).error).toMatch(/není uložená hra/);
    expect(unpackGame({ fmt: 99 }).error).toMatch(/není uložená hra/);
    expect(unpackGame({ ...packGame(s), v: GAME_VERSION - 1 }).error).toMatch(/jiné verze/);
    const bad = (patch) => unpackGame({ ...packGame(s), state: { ...s, ...patch } }).error;
    expect(bad({ tick: -5 })).toMatch(/čas/);
    expect(bad({ player: 'XXX' })).toMatch(/hráče/);
    expect(bad({ stateOwner: [1, 2] })).toMatch(/státy/);
    expect(bad({ ctrl: [] })).toMatch(/provincie/);
    expect(bad({ rng: 'a' })).toMatch(/náhoda/);
    expect(bad({ pol: null })).toMatch(/„pol“/);
    expect(bad({ ind: { ...s.ind, st: [] } })).toMatch(/průmysl/);
    expect(bad({ tech: { ...s.tech, own: [] } })).toMatch(/tech/);
    expect(bad({ dip: { ...s.dip, fac: [] } })).toMatch(/diplomacie/);
    expect(bad({ mil: { ...s.mil, stock: [] } })).toMatch(/armáda/);
    expect(validateState(null)).toMatch(/stav/);
  });
  it('načtená hra pokračuje stejně jako souvislý běh', () => {
    const r = unpackGame(JSON.parse(JSON.stringify(packGame(s))));
    const a = advance(r.state, 24 * 20), b = advance(s, 24 * 20);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('sloty v úložišti', () => {
  const s = createGame({ player: 'FRA', aiLevel: 1 });
  it('uložení, výpis, načtení a smazání', () => {
    expect(listSaves()).toEqual([]);
    expect(writeSave(3, s, '1. 1. 2026 10:00')).toBeNull();
    const l = listSaves();
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ slot: 3, player: 'FRA', name: 'Francie', savedAt: '1. 1. 2026 10:00' });
    expect(l[0].size).toBeGreaterThan(50000);
    expect(l[0].date).toMatch(/1936/);
    const r = readSave(3);
    expect(r.state).toEqual(s);
    deleteSave(3);
    expect(listSaves()).toEqual([]);
    expect(readSave(3).error).toMatch(/prázdný/);
  });
  it('pozorovatel se uloží s popisem; sloty jsou v pořadí a mají jména', () => {
    writeSave('quick', createGame({ player: null }));
    expect(listSaves()[0].name).toBe('Pozorovatel');
    writeSave('auto', s); writeSave(1, s);
    expect(listSaves().map((x) => x.slot)).toEqual(['auto', 'quick', 1]);
    expect(SLOTS).toContain('auto');
    expect(slotName('auto')).toBe('Automatické uložení');
    expect(slotName(2)).toBe('Slot 2');
  });
  it('chyby úložiště: plné, zakázané, vadná data', () => {
    globalThis.localStorage = fake({ full: true });
    expect(writeSave(1, s)).toMatch(/plné/);
    delete globalThis.localStorage;
    expect(writeSave(1, s)).toMatch(/není dostupné/);
    expect(readSave(1).error).toMatch(/není dostupné/);
    expect(listSaves()).toEqual([]);
    deleteSave(1);
    globalThis.localStorage = fake();
    globalThis.localStorage.setItem('e1936:save:2', '{nesmysl');
    expect(readSave(2).error).toMatch(/poškozená/);
    globalThis.localStorage.setItem('e1936:meta:2', 'nesmysl');
    expect(listSaves()).toEqual([]);
    globalThis.localStorage.setItem('e1936:save:2', JSON.stringify({ fmt: SAVE_FORMAT, v: 1, state: {} }));
    expect(readSave(2).error).toMatch(/jiné verze/);
  });
});

describe('akce rozhraní', () => {
  beforeEach(() => { A.goMenu(); });
  it('uložení a načtení z rozehrané hry vrátí stav, výběr se vyčistí a hra se přepne', () => {
    A.startGame('GER');
    gameStore.setState(startFocus(gameStore.getState(), W.ownerIdx.GER, 'def_ind') || gameStore.getState());
    gameStore.setState(advance(gameStore.getState(), 24 * 5));
    const saved = gameStore.getState();
    expect(A.saveGame(2)).toBe(true);
    expect(uiStore.getState().saveMsg).toMatch(/uložena/);
    gameStore.setState(advance(saved, 24 * 30));
    A.goMenu();
    expect(uiStore.getState().screen).toBe('menu');
    expect(A.loadGame(2)).toBe(true);
    expect(uiStore.getState().screen).toBe('game');
    expect(uiStore.getState().saveDialog).toBeNull();
    expect(gameStore.getState()).toEqual(saved);
    expect(gameStore.getState().tick).toBe(saved.tick);
  });
  it('načtení prázdného nebo poškozeného slotu nic nezmění a ohlásí důvod', () => {
    A.startGame('GER');
    const before = gameStore.getState();
    expect(A.loadGame(4)).toBe(false);
    expect(uiStore.getState().saveMsg).toMatch(/prázdný/);
    expect(gameStore.getState()).toBe(before);
    globalThis.localStorage.setItem('e1936:save:4', '[]');
    expect(A.loadGame(4)).toBe(false);
    expect(uiStore.getState().saveMsg).toMatch(/není uložená hra|poškozená/);
    expect(gameStore.getState()).toBe(before);
  });
  it('rychlé uložení a načtení; dialog se otevře a zavře', () => {
    expect(A.quickSave()).toBe(false);                    // mimo hru nic
    A.startGame('FRA');
    expect(A.quickSave()).toBe(true);
    const saved = gameStore.getState();
    gameStore.setState(advance(saved, 24));
    expect(A.quickLoad()).toBe(true);
    expect(gameStore.getState().tick).toBe(saved.tick);
    A.openSaveDialog('load');
    expect(uiStore.getState().saveDialog).toBe('load');
    A.removeSave('quick');
    expect(listSaves()).toEqual([]);
    A.closeSaveDialog();
    expect(uiStore.getState().saveDialog).toBeNull();
  });
});
