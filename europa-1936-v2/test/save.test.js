// Uložené hry (M25): obálka a kontrola stavu, sloty v úložišti (s falešným localStorage), načtení a pokračování hry, chybové stavy a akce rozhraní.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createGame, advance, packGame, unpackGame, validateState, SAVE_FORMAT, GAME_VERSION, startFocus, getWorld } from '../src/engine/index.js';
import { listSaves, writeSave, readSave, deleteSave, SLOTS, slotName, gzip, gunzip, resetSaveDb } from '../src/ui/saves.js';
import { fakeIndexedDB } from './fakeIdb.js';
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
beforeEach(() => { prev = globalThis.localStorage; globalThis.localStorage = fake(); resetSaveDb(); });
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

describe('sloty v úložišti (localStorage, bez IndexedDB)', () => {
  const s = createGame({ player: 'FRA', aiLevel: 1 });
  it('uložení, výpis, načtení a smazání; data jsou komprimovaná', async () => {
    expect(await listSaves()).toEqual([]);
    expect(await writeSave(3, s, '1. 1. 2026 10:00')).toBeNull();
    const l = await listSaves();
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ slot: 3, player: 'FRA', name: 'Francie', savedAt: '1. 1. 2026 10:00' });
    expect(l[0].size).toBeGreaterThan(50000);
    expect(l[0].zip).toBeGreaterThan(0);
    expect(l[0].zip).toBeLessThan(l[0].size / 4);   // gzip zmenší uložení aspoň čtyřikrát
    expect(l[0].date).toMatch(/1936/);
    const raw = globalThis.localStorage.getItem('e1936:save:3');
    expect(raw.startsWith('gz1:')).toBe(true);
    expect(raw.length).toBeLessThan(l[0].size / 3);
    const r = await readSave(3);
    expect(r.state).toEqual(s);
    await deleteSave(3);
    expect(await listSaves()).toEqual([]);
    expect((await readSave(3)).error).toMatch(/prázdný/);
  });
  it('starší nekomprimovaný slot jde dál načíst', async () => {
    globalThis.localStorage.setItem('e1936:save:5', JSON.stringify(packGame(s)));
    globalThis.localStorage.setItem('e1936:meta:5', JSON.stringify({ player: 'FRA', name: 'Francie', date: '1. 1. 1936', tick: 0, savedAt: '', size: 1 }));
    expect((await listSaves()).map((x) => x.slot)).toEqual([5]);
    expect((await readSave(5)).state).toEqual(s);
  });
  it('pozorovatel se uloží s popisem; sloty jsou v pořadí a mají jména', async () => {
    await writeSave('quick', createGame({ player: null }));
    expect((await listSaves())[0].name).toBe('Pozorovatel');
    await writeSave('auto', s); await writeSave(1, s);
    expect((await listSaves()).map((x) => x.slot)).toEqual(['auto', 'quick', 1]);
    expect(SLOTS).toContain('auto');
    expect(slotName('auto')).toBe('Automatické uložení');
    expect(slotName(2)).toBe('Slot 2');
  });
  it('chyby úložiště: plné, zakázané, vadná data', async () => {
    globalThis.localStorage = fake({ full: true });
    expect(await writeSave(1, s)).toMatch(/plné/);
    delete globalThis.localStorage;
    expect(await writeSave(1, s)).toMatch(/není dostupné/);
    expect((await readSave(1)).error).toMatch(/není dostupné/);
    expect(await listSaves()).toEqual([]);
    await deleteSave(1);
    globalThis.localStorage = fake();
    globalThis.localStorage.setItem('e1936:save:2', '{nesmysl');
    expect((await readSave(2)).error).toMatch(/poškozená/);
    globalThis.localStorage.setItem('e1936:save:2', 'gz1:QUJDRA==');
    expect((await readSave(2)).error).toMatch(/rozbalit/);
    globalThis.localStorage.setItem('e1936:meta:2', 'nesmysl');
    expect(await listSaves()).toEqual([]);
    globalThis.localStorage.setItem('e1936:save:2', JSON.stringify({ fmt: SAVE_FORMAT, v: 1, state: {} }));
    expect((await readSave(2)).error).toMatch(/jiné verze/);
  });
  it('komprese a rozbalení vrátí stejný text', async () => {
    const text = JSON.stringify(packGame(s));
    expect(await gunzip(await gzip(text))).toBe(text);
  });
});

describe('sloty v IndexedDB', () => {
  const s = createGame({ player: 'GER', aiLevel: 1 });
  beforeEach(() => { globalThis.indexedDB = fakeIndexedDB(); resetSaveDb(); });
  afterEach(() => { delete globalThis.indexedDB; resetSaveDb(); });
  it('uloží komprimovaná data do databáze, ne do localStorage; načte a smaže', async () => {
    expect(await writeSave(2, s, 'teď')).toBeNull();
    const db = globalThis.indexedDB._dbs.get('e1936');
    expect(db.get('data').get('2')).toBeInstanceOf(Uint8Array);
    expect(db.get('meta').get('2')).toMatchObject({ slot: 2, player: 'GER', savedAt: 'teď' });
    expect(globalThis.localStorage.getItem('e1936:save:2')).toBeNull();
    expect((await listSaves()).map((x) => x.slot)).toEqual([2]);
    expect((await readSave(2)).state).toEqual(s);
    await deleteSave(2);
    expect(await listSaves()).toEqual([]);
    expect((await readSave(2)).error).toMatch(/prázdný/);
  });
  it('starý slot z localStorage se zobrazí a načte; nové uložení ho z localStorage smaže', async () => {
    globalThis.localStorage.setItem('e1936:save:1', JSON.stringify(packGame(s)));
    globalThis.localStorage.setItem('e1936:meta:1', JSON.stringify({ player: 'GER', name: 'Německo', date: '1. 1. 1936', tick: 0, savedAt: '', size: 1 }));
    expect((await listSaves()).map((x) => x.slot)).toEqual([1]);
    expect((await readSave(1)).state).toEqual(s);
    expect(await writeSave(1, s)).toBeNull();
    expect(globalThis.localStorage.getItem('e1936:save:1')).toBeNull();
    expect((await listSaves())[0].zip).toBeGreaterThan(0);
  });
  it('plná databáze vrátí českou chybu', async () => {
    globalThis.indexedDB = fakeIndexedDB({ full: true }); resetSaveDb();
    expect(await writeSave(3, s)).toMatch(/plné/);
  });
  it('zápisy jdou za sebou ve stejném pořadí', async () => {
    const a = writeSave('auto', s, 'první'), b = writeSave('auto', s, 'druhý');
    expect(await a).toBeNull(); expect(await b).toBeNull();
    expect((await listSaves())[0].savedAt).toBe('druhý');
  });
});

describe('akce rozhraní', () => {
  beforeEach(() => { A.goMenu(); });
  it('uložení a načtení z rozehrané hry vrátí stav, výběr se vyčistí a hra se přepne', async () => {
    A.startGame('GER');
    gameStore.setState(startFocus(gameStore.getState(), W.ownerIdx.GER, 'def_ind') || gameStore.getState());
    gameStore.setState(advance(gameStore.getState(), 24 * 5));
    const saved = gameStore.getState();
    expect(await A.saveGame(2)).toBe(true);
    expect(uiStore.getState().saveMsg).toMatch(/uložena/);
    gameStore.setState(advance(saved, 24 * 30));
    A.goMenu();
    expect(uiStore.getState().screen).toBe('menu');
    expect(await A.loadGame(2)).toBe(true);
    expect(uiStore.getState().screen).toBe('game');
    expect(uiStore.getState().saveDialog).toBeNull();
    expect(gameStore.getState()).toEqual(saved);
    expect(gameStore.getState().tick).toBe(saved.tick);
  });
  it('načtení prázdného nebo poškozeného slotu nic nezmění a ohlásí důvod', async () => {
    A.startGame('GER');
    const before = gameStore.getState();
    expect(await A.loadGame(4)).toBe(false);
    expect(uiStore.getState().saveMsg).toMatch(/prázdný/);
    expect(gameStore.getState()).toBe(before);
    globalThis.localStorage.setItem('e1936:save:4', '[]');
    expect(await A.loadGame(4)).toBe(false);
    expect(uiStore.getState().saveMsg).toMatch(/není uložená hra|poškozená/);
    expect(gameStore.getState()).toBe(before);
  });
  it('rychlé uložení a načtení; dialog se otevře a zavře', async () => {
    expect(await A.quickSave()).toBe(false);                    // mimo hru nic
    A.startGame('FRA');
    expect(await A.quickSave()).toBe(true);
    const saved = gameStore.getState();
    gameStore.setState(advance(saved, 24));
    expect(await A.quickLoad()).toBe(true);
    expect(gameStore.getState().tick).toBe(saved.tick);
    A.openSaveDialog('load');
    expect(uiStore.getState().saveDialog).toBe('load');
    const rev = uiStore.getState().saveRev;
    await A.removeSave('quick');
    expect(uiStore.getState().saveRev).toBe(rev + 1);
    expect(await listSaves()).toEqual([]);
    A.closeSaveDialog();
    expect(uiStore.getState().saveDialog).toBeNull();
  });
  it('selhání automatického uložení ukáže červené upozornění (nejvýš jednou za minutu)', async () => {
    A.startGame('FRA');
    expect(await A.autoSave(gameStore.getState(), 1000)).toBe(true);
    expect(uiStore.getState().autoSaveErr).toBe('');
    globalThis.localStorage = fake({ full: true });
    expect(await A.autoSave(gameStore.getState(), 10 * 60000)).toBe(false);
    expect(uiStore.getState().autoSaveErr).toMatch(/plné/);
    expect(uiStore.getState().toast).toMatchObject({ kind: 'error' });
    expect(uiStore.getState().toast.text).toMatch(/Automatické uložení selhalo/);
    const id = uiStore.getState().toast.id;
    expect(await A.autoSave(gameStore.getState(), 10 * 60000 + 5000)).toBe(false);
    expect(uiStore.getState().toast.id).toBe(id);   // znovu se neopakuje hned
    globalThis.localStorage = fake();
    expect(await A.autoSave(gameStore.getState(), 12 * 60000)).toBe(true);
    expect(uiStore.getState().autoSaveErr).toBe('');
  });
});
