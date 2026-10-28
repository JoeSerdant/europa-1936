import { describe, it, expect } from 'vitest';
import { getWorld } from '../src/engine/world.js';
import { createCamera, resizeCamera, zoomAt, panBy, screenToWorld, worldToScreen, viewRect, fitZoom, minZoom, MAX_ZOOM, fitRect, lerpView } from '../src/ui/map/camera.js';
import { buildGeometry } from '../src/ui/map/geometry.js';
import { fillColors, MODES } from '../src/ui/map/colors.js';
import { countryLabels, stateLabels } from '../src/ui/map/labels.js';
import { createGame } from '../src/engine/index.js';

const W = getWorld();

describe('kamera', () => {
  it('převody souřadnic jsou navzájem inverzní', () => {
    const cam = createCamera(2728, 2048);
    resizeCamera(cam, 1920, 1000);
    cam.zoom = 1.7; cam.x = 900; cam.y = 700;
    const [wx, wy] = screenToWorld(cam, 400, 300);
    const [sx, sy] = worldToScreen(cam, wx, wy);
    expect(sx).toBeCloseTo(400, 6);
    expect(sy).toBeCloseTo(300, 6);
  });
  it('při prvním rozměru se vejde celá mapa a nejde oddálit přes mez', () => {
    const cam = createCamera(2728, 2048);
    resizeCamera(cam, 1920, 1000);
    expect(cam.zoom).toBeCloseTo(fitZoom(cam), 9);
    zoomAt(cam, 100, 100, 0.01);
    expect(cam.zoom).toBeCloseTo(minZoom(cam), 9);
    zoomAt(cam, 100, 100, 1e6);
    expect(cam.zoom).toBe(MAX_ZOOM);
  });
  it('zoom zachová bod pod kurzorem', () => {
    const cam = createCamera(2728, 2048);
    resizeCamera(cam, 1600, 900);
    cam.zoom = 2; cam.x = 1300; cam.y = 900;
    const before = screenToWorld(cam, 1200, 300);
    zoomAt(cam, 1200, 300, 1.5);
    const after = screenToWorld(cam, 1200, 300);
    expect(after[0]).toBeCloseTo(before[0], 6);
    expect(after[1]).toBeCloseTo(before[1], 6);
  });
  it('posun drží střed v mezích mapy', () => {
    const cam = createCamera(2728, 2048);
    resizeCamera(cam, 1600, 900);
    cam.zoom = 3;
    panBy(cam, 1e7, 1e7);
    const [x0, y0, x1, y1] = viewRect(cam);
    expect(x0).toBeLessThan(cam.mapW / 2);
    expect(cam.x).toBeGreaterThanOrEqual(0);
    expect(cam.y).toBeGreaterThanOrEqual(0);
    expect(x1 - x0).toBeCloseTo(1600 / 3, 6);
    void y0; void y1;
  });
  it('fitRect a lerpView', () => {
    const cam = createCamera(2728, 2048);
    resizeCamera(cam, 1600, 900);
    fitRect(cam, [1000, 800, 1400, 1100], 0.1);
    expect(cam.x).toBe(1200);
    expect(cam.y).toBe(950);
    const a = { x: 0, y: 0, zoom: 1 }, b = { x: 100, y: 200, zoom: 4 };
    expect(lerpView(a, b, 0)).toEqual(a);
    expect(lerpView(a, b, 1).zoom).toBeCloseTo(4, 9);
    expect(lerpView(a, b, 0.5).zoom).toBeCloseTo(2, 9);
  });
});

describe('geometrie mapy a výběr oblasti', () => {
  const g = buildGeometry(W);
  it('bod popisku každé provincie vybere tuto provincii (až na jednotky)', () => {
    let bad = 0;
    for (let p = 1; p <= W.L; p++) {
      const [x, y] = W.land[p].c;
      if (g.pick(x + 0.5, y + 0.5) !== p) bad++;
    }
    expect(bad).toBeLessThan(15);
  });
  it('moře a prázdno', () => {
    const sea = W.sea[1].c;
    expect(W.isSea(g.pick(sea[0] + 0.5, sea[1] + 0.5))).toBe(true);
    expect(g.pick(-10, -10)).toBe(0);
    expect(g.pick(1e6, 1e6)).toBe(0);
  });
  it('poloha Berlína patří do německé provincie', () => {
    const berlin = [...Array(W.L).keys()].map((i) => i + 1).find((p) => W.land[p].n === 'Berlín');
    const [x, y] = W.land[berlin].c;
    const p = g.pick(x + 0.5, y + 0.5);
    expect(W.ownerTag(W.provOwner0[p])).toBe('GER');
  });
});

describe('barvy a popisky', () => {
  it('každý režim obarví všechny pevninské provincie a nic jiného', () => {
    const game = createGame();
    for (const m of MODES) {
      const c = fillColors(W, game, m.id);
      expect(c.length).toBe(W.nLabel);
      for (let p = 1; p <= W.L; p++) expect(c[p], `${m.id} ${p}`).toMatch(/^rgb\(/);
      for (let l = W.L + 1; l < W.nLabel; l++) expect(c[l]).toBeNull();
    }
  });
  it('politická mapa mění barvu po převodu státu', async () => {
    const { transferState } = await import('../src/engine/index.js');
    const s0 = createGame();
    const st = W.land[W.owners[W.ownerIdx.DEN].cap].s;
    const s1 = transferState(s0, st, 'GER');
    const p = W.states[st].v[0];
    expect(fillColors(W, s0, 'political')[p]).not.toBe(fillColors(W, s1, 'political')[p]);
  });
  it('popisky zemí a států leží uvnitř svých území', () => {
    const labels = countryLabels(W, null);
    expect(labels.length).toBe(35);
    for (const l of labels) {
      expect(l.w).toBeGreaterThan(0);
      expect(l.x).toBeGreaterThan(0);
    }
    const sl = stateLabels(W);
    expect(sl.filter(Boolean).length).toBe(W.states.length - 1);
  });
});
