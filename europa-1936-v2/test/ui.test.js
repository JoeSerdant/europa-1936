import { describe, it, expect, beforeEach } from 'vitest';
import { getWorld } from '../src/engine/world.js';
import { createGame } from '../src/engine/index.js';
import {
  TILE, MIN_LEVEL, MAX_LEVEL, levelFor, tileSize, tileKey, tileRange, Grid, LruCache, rectsOverlap,
} from '../src/ui/map/tiles.js';
import { fmtInt, fmtPop, fmtArea, plural } from '../src/ui/format.js';
import { gameStore, uiStore } from '../src/ui/store.js';
import { startGame, goMenu, goSelect, pickCountry, selectLabel, ownerTagAt, setMode, closeDossier, INSETS } from '../src/ui/actions.js';
import { mapController } from '../src/ui/map/controller.js';
import { buildGeometry } from '../src/ui/map/geometry.js';
import { MapRenderer } from '../src/ui/map/renderer.js';
import { createCamera, resizeCamera } from '../src/ui/map/camera.js';

const W = getWorld();

describe('dlaždice: čistá logika', () => {
  it('úroveň podle přiblížení a hustoty pixelů', () => {
    expect(levelFor(1, 1)).toBe(0);
    expect(levelFor(0.5, 1)).toBe(-1);
    expect(levelFor(1.01, 1)).toBe(1);
    expect(levelFor(1, 2)).toBe(1);
    expect(levelFor(12, 2)).toBe(MAX_LEVEL);
    expect(levelFor(0.001, 1)).toBe(MIN_LEVEL);
    expect(tileSize(0)).toBe(TILE);
    expect(tileSize(1)).toBe(TILE / 2);
    expect(tileKey(1, 2, 3)).toBe('1/2/3');
  });
  it('rozsah dlaždic je omezen na mapový list', () => {
    expect(tileRange([-500, -500, 99999, 99999], 0, 2728, 2048)).toEqual([0, 0, 5, 3]);
    expect(tileRange([0, 0, 10, 10], 0, 2728, 2048)).toEqual([0, 0, 0, 0]);
    const [a, , b] = tileRange([5000, 100, 6000, 200], 0, 2728, 2048);
    expect(b).toBeLessThan(a);                                   // mimo list = prázdný rozsah
  });
  it('prostorový rastr vrací každou položku jednou', () => {
    const g = new Grid(1000, 1000, 100, 4);
    g.add(0, 0, 0, 450, 450);       // zasahuje do mnoha buněk
    g.add(1, 800, 800, 850, 850);
    g.add(2, 90, 90, 110, 110);
    g.add(3, -50, -50, 10, 10);     // částečně mimo
    const q = g.query(0, 0, 200, 200);
    expect(q.sort()).toEqual([0, 2, 3]);
    expect(g.query(700, 700, 900, 900)).toEqual([1]);
    expect(g.query(5000, 5000, 6000, 6000)).toEqual([]);
  });
  it('LRU: čtení oživí položku, trim respektuje limit i chráněné klíče', () => {
    const c = new LruCache(3);
    ['a', 'b', 'c', 'd', 'e'].forEach((k, i) => c.set(k, i));
    c.get('a');                                   // „a“ je nejstarší, čtením se oživí
    const dropped = c.trim(new Set(['b']));
    expect(c.size).toBe(3);
    expect(c.has('a')).toBe(true);                // oživené zůstává
    expect(c.has('b')).toBe(true);                // chráněné zůstává i přes stáří
    expect(c.has('c')).toBe(false);               // nejstarší nechráněné padá
    expect(dropped.length).toBe(2);
    expect(c.trim().length).toBe(0);
  });
  it('překrytí obdélníků', () => {
    expect(rectsOverlap([0, 0, 10, 10], [5, 5, 15, 15])).toBe(true);
    expect(rectsOverlap([0, 0, 10, 10], [10, 0, 20, 10])).toBe(false);
    expect(rectsOverlap([0, 0, 10, 10], [20, 20, 30, 30])).toBe(false);
  });
});

describe('formátování', () => {
  it('čísla, obyvatelé a plocha', () => {
    expect(fmtInt(1234567)).toBe('1 234 567');
    expect(fmtPop(477)).toBe('477 tis.');
    expect(fmtPop(67400)).toBe('67,4 mil.');
    expect(fmtArea(470279)).toBe('470 279 km²');
    expect(plural(1, 'provincie', 'provincie', 'provincií')).toBe('provincie');
    expect(plural(5, 'provincie', 'provincie', 'provincií')).toBe('provincií');
  });
});

describe('akce rozhraní', () => {
  beforeEach(() => { goMenu(); mapController.setInsets(INSETS.menu); });
  it('nová hra za zemi nastaví stav, obrazovku a pozastavený čas', () => {
    startGame('GER');
    expect(uiStore.getState().screen).toBe('game');
    expect(gameStore.getState().player).toBe('GER');
    expect(gameStore.getState().paused).toBe(true);
    expect(gameStore.getState().tick).toBe(0);
  });
  it('pozorovatel nemá zemi', () => {
    startGame(null);
    expect(gameStore.getState().player).toBeNull();
    expect(uiStore.getState().screen).toBe('game');
  });
  it('návrat do menu vrátí čerstvou hru', () => {
    startGame('FRA');
    selectLabel(100);
    goMenu();
    expect(uiStore.getState().screen).toBe('menu');
    expect(uiStore.getState().selected).toBe(0);
    expect(gameStore.getState().player).toBeNull();
    expect(gameStore.getState().tick).toBe(0);
  });
  it('výběr oblasti přijme provincii a moře, jezero a prázdno zruší', () => {
    startGame('GER');
    selectLabel(50);
    expect(uiStore.getState().selected).toBe(50);
    selectLabel(W.L + 3);
    expect(uiStore.getState().selected).toBe(W.L + 3);
    selectLabel(W.L + W.S + 2);                  // jezero
    expect(uiStore.getState().selected).toBe(0);
    selectLabel(50);
    selectLabel(0);
    expect(uiStore.getState().selected).toBe(0);
    selectLabel(50);
    closeDossier();
    expect(uiStore.getState().selected).toBe(0);
  });
  it('výběr země: neznámý tag se ignoruje, obrazovka výběru drží zvolenou zemi', () => {
    goSelect();
    expect(uiStore.getState().screen).toBe('select');
    pickCountry('POL');
    expect(uiStore.getState().pickTag).toBe('POL');
    pickCountry('XXX');
    expect(uiStore.getState().pickTag).toBe('POL');
  });
  it('vlastník pod klikem: pevnina má tag, moře ne', () => {
    const capital = W.owners[W.ownerIdx.CZE].cap;
    expect(ownerTagAt(capital)).toBe('CZE');
    expect(ownerTagAt(W.L + 1)).toBeNull();
    expect(ownerTagAt(0)).toBeNull();
  });
  it('mapový režim', () => {
    setMode('terrain');
    expect(uiStore.getState().mode).toBe('terrain');
  });
});

// ---- vykreslovač s falešným plátnem (Node nemá Canvas ani Path2D) ----------------------------------------------------------------
function fakeCtx() {
  const target = { measureText: (s) => ({ width: String(s).length * 50 }), createPattern: () => ({}) };
  return new Proxy(target, {
    get: (t, k) => (k in t ? t[k] : () => {}),
    set: (t, k, v) => { t[k] = v; return true; },
  });
}
function installFakeDom() {
  globalThis.Path2D = class { moveTo() {} lineTo() {} closePath() {} };
  const mk = () => ({ width: 0, height: 0, getContext: () => fakeCtx() });
  globalThis.document = { createElement: () => mk() };
  return mk();
}

describe('vykreslovač (falešné plátno)', () => {
  const geo = buildGeometry(W);
  let canvas, r, cam;
  beforeEach(() => {
    canvas = installFakeDom();
    r = new MapRenderer(canvas, W, geo);
    cam = createCamera(W.frame.w, W.frame.h);
    resizeCamera(cam, 1280, 720);
    cam.zoom = 1; cam.x = 1100; cam.y = 900;
  });
  it('první snímek dokreslí všechny viditelné dlaždice, další snímek nic', () => {
    r.draw(cam, 1);
    expect(r.stats.drawn).toBeGreaterThan(0);
    expect(r.pending).toBe(0);
    const first = r.stats.rendered;
    expect(first).toBeGreaterThan(0);
    r.draw(cam, 1);
    expect(r.stats.rendered).toBe(0);
    expect(canvas.width).toBe(1280);
  });
  it('změna režimu, ztlumení a vlastníků zneplatní dlaždice', () => {
    r.draw(cam, 1);
    r.setMode('terrain');
    r.draw(cam, 1);
    expect(r.stats.rendered).toBeGreaterThan(0);
    r.draw(cam, 1);
    expect(r.stats.rendered).toBe(0);
    r.setFocus(W.ownerIdx.GER);
    r.draw(cam, 1);
    expect(r.stats.rendered).toBeGreaterThan(0);
    r.setMode('terrain');                         // stejný režim = nic
    r.draw(cam, 1);
    expect(r.stats.rendered).toBe(0);
  });
  it('posun do nové oblasti dokreslí jen nové dlaždice a nepřekročí rozpočet snímku', () => {
    r.draw(cam, 1);
    const before = r.tiles.size;
    cam.x += 900;
    r.draw(cam, 1);
    expect(r.tiles.size).toBeGreaterThan(before);
    let guard = 0;
    while (r.pending && guard++ < 100) r.draw(cam, 1);
    expect(r.pending).toBe(0);
  });
  it('přiblížení přes hranici úrovně použije náhradu a po dokreslení je vše hotové', () => {
    r.draw(cam, 1);
    cam.zoom = 3;
    let guard = 0;
    do { r.draw(cam, 1); } while (r.pending && guard++ < 200);
    expect(r.pending).toBe(0);
    expect(r.stats.drawn).toBeGreaterThan(0);
  });
  it('změna hustoty pixelů zneplatní dlaždice; označení a ukazatel se nakreslí bez chyby', () => {
    r.draw(cam, 1);
    r.selected = 200; r.hover = 201;
    r.draw(cam, 2);
    expect(r.stats.rendered).toBeGreaterThan(0);
    expect(canvas.width).toBe(2560);
  });
  it('vlastnictví: po převodu státu se hranice zemí přepočítají', () => {
    const g = createGame({ player: 'GER' });
    r.setGame(g);
    r.draw(cam, 1);                               // první snímek nastaví hustotu pixelů (a tím zneplatní dlaždice jednou)
    const stateOfBerlin = W.provState[W.owners[W.ownerIdx.GER].cap];
    const owner = g.stateOwner.slice();
    owner[stateOfBerlin] = W.ownerIdx.POL;
    const v0 = r.version;
    r.setGame({ ...g, stateOwner: owner });
    expect(r.version).toBe(v0 + 1);
    r.draw(cam, 1);
    expect(r.stats.rendered).toBeGreaterThan(0);
    r.setGame({ ...g, stateOwner: owner, tick: 5 });      // jen plynutí času – bez zneplatnění
    expect(r.version).toBe(v0 + 1);
  });
});
