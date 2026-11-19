// F3 – nastavení upozornění (jako v HOI4): skupiny zpráv deníku, volby v localStorage a jejich účinek při ohlašování (`announceLog`).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import { getWorld } from '../src/engine/index.js';
import { gameStore, uiStore, NONE } from '../src/ui/store.js';
import * as A from '../src/ui/actions.js';
import { announceLog } from '../src/ui/hooks.js';
import { NOTIFY_GROUPS, NOTIFY_IDS, NOTIFY_MODES, groupOf, notifyPrefs, setNotify, resetNotify, notifyMode, resetNotifyCache } from '../src/ui/notify.js';

const W = getWorld();
let prev;
const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
beforeEach(() => { prev = globalThis.localStorage; globalThis.localStorage = memStore(); resetNotifyCache(); });
afterEach(() => { globalThis.localStorage = prev; resetNotifyCache(); });

describe('skupiny a volby', () => {
  it('každý druh záznamu deníku s textem patří do právě jedné skupiny', () => {
    const src = fs.readFileSync('src/ui/logText.js', 'utf8');
    const kinds = [...src.matchAll(/case '([a-z]+)'/gi)].map((m) => m[1]);
    expect(kinds.length).toBeGreaterThan(20);
    const seen = new Map();
    for (const id of NOTIFY_IDS) for (const k of NOTIFY_GROUPS[id].kinds) { expect(seen.has(k), k).toBe(false); seen.set(k, id); }
    for (const k of kinds) expect(seen.has(k), `druh ${k} bez skupiny`).toBe(true);
    expect(groupOf('war')).toBe('war');
    expect(groupOf('neznamy')).toBe('other');
  });
  it('výchozí je oznámit; volba se uloží, neplatná se ignoruje, výchozí obnoví vše', () => {
    for (const id of NOTIFY_IDS) expect(notifyPrefs()[id]).toBe('show');
    setNotify('research', 'log');
    setNotify('war', 'pause');
    setNotify('war', 'nesmysl');
    setNotify('nic', 'log');
    resetNotifyCache();   // načte se znovu z localStorage
    expect(notifyMode('tech')).toBe('log');
    expect(notifyMode('cap')).toBe('pause');
    expect(NOTIFY_MODES.map(([m]) => m)).toEqual(['log', 'show', 'pause']);
    resetNotify();
    expect(notifyMode('cap')).toBe('show');
  });
});

describe('ohlašování podle voleb', () => {
  beforeEach(() => {
    A.goMenu();
    A.startGame('GER');
    A.setNewsEnabled(false);   // noviny ze světa mají vlastní pauzu
    gameStore.setState({ ...gameStore.getState(), paused: false });
    uiStore.setState({ ...uiStore.getState(), popups: [], banners: [], news: [], toast: null, selDivs: NONE });
  });
  const cap = () => ({ id: 1, k: 'cap', o: W.ownerIdx.POL, t: gameStore.getState().tick });
  it('jen deník: kapitulace nevyskočí', () => {
    setNotify('war', 'log');
    announceLog(gameStore.getState(), [cap()]);
    expect(uiStore.getState().popups).toHaveLength(0);
    expect(gameStore.getState().paused).toBe(false);
  });
  it('oznámit: karta, hra běží; oznámit a pozastavit: karta a pauza', () => {
    announceLog(gameStore.getState(), [cap()]);
    expect(uiStore.getState().popups.length).toBeGreaterThan(0);
    expect(gameStore.getState().paused).toBe(false);
    setNotify('war', 'pause');
    announceLog(gameStore.getState(), [cap()]);
    expect(gameStore.getState().paused).toBe(true);
    expect(uiStore.getState().newsResume).toBeFalsy();   // zavření novin hru znovu nespustí
  });
  afterEach(() => A.setNewsEnabled(true));
  it('okno nastavení se otvírá z nabídky a zavírá', () => {
    A.setNotifyOpen(true);
    expect(uiStore.getState().notifyOpen).toBe(true);
    expect(uiStore.getState().menuOpen).toBe(false);
    A.setNotifyOpen(false);
    expect(uiStore.getState().notifyOpen).toBe(false);
  });
});
