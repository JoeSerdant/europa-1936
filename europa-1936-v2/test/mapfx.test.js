// Grafika mapy (M91): projekce a Slunce (den a noc), šum, stínování reliéfu, hloubka moře, maska mlhy a mřížka noci – čisté funkce bez prohlížeče.
import { describe, it, expect } from 'vitest';
import { geoConicConformal } from 'd3-geo';
import { getWorld } from '../src/engine/index.js';
import { PROJ, pxOf, lonLatOf, utcOf, sunElevation, nightOf } from '../src/ui/map/sun.js';
import { TERRAIN_RELIEF, hash2, valueNoise, ridged, boxBlur, hillshade, distanceToLand, seaColor } from '../src/ui/map/relief.js';
import { labelGrid, fogMask, nightGrid, FOG_ALPHA } from '../src/ui/map/shade.js';
import { buildGeometry } from '../src/ui/map/geometry.js';

const W = getWorld();

describe('projekce a Slunce', () => {
  const d3 = geoConicConformal().rotate([-PROJ.cm, 0]).parallels([PROJ.p1, PROJ.p2]).scale(PROJ.R).translate([0, 0]);
  it('pixel světa odpovídá projekci generátoru (d3-geo) a převod tam a zpět sedí', () => {
    for (const [lon, lat] of [[13.4, 52.52], [2.35, 48.86], [-0.12, 51.51], [37.6, 55.75], [-9, 39], [44, 33]]) {
      const [x, y] = pxOf(lon, lat), p = d3([lon, lat]);
      expect(x).toBeCloseTo((p[0] - PROJ.x0) / PROJ.km, 3);
      expect(y).toBeCloseTo((p[1] - PROJ.y0) / PROJ.km, 3);
      const [lo, la] = lonLatOf(x, y);
      expect(lo).toBeCloseTo(lon, 4);
      expect(la).toBeCloseTo(lat, 4);
    }
    const [bx, by] = pxOf(13.4, 52.52);   // Berlín leží na mapovém listu blízko středu německého hlavního města
    const cap = W.land[W.owners[W.ownerIdx.GER].cap].c;
    expect(Math.hypot(bx - cap[0], by - cap[1])).toBeLessThan(25);
    expect(bx).toBeGreaterThan(0); expect(bx).toBeLessThan(W.frame.w); expect(by).toBeGreaterThan(0); expect(by).toBeLessThan(W.frame.h);
  });
  it('herní čas: středoevropský čas, den v roce', () => {
    expect(utcOf(1)).toEqual({ day: 0, utc: 0 });
    expect(utcOf(24 * 10 + 13)).toEqual({ day: 10, utc: 12 });
    expect(utcOf(24 * 365 + 1).day).toBe(0);
  });
  it('Slunce: v létě v poledne vysoko, o půlnoci pod obzorem, v zimě nízko; tma podle výšky', () => {
    const noonJune = 24 * 172 + 13, midnight = 24 * 172 + 1, noonDec = 24 * 355 + 13;
    expect(sunElevation(noonJune, 13.4, 52.5)).toBeGreaterThan(55);
    expect(sunElevation(midnight, 13.4, 52.5)).toBeLessThan(-5);
    expect(sunElevation(noonDec, 13.4, 52.5)).toBeLessThan(20);
    expect(sunElevation(noonDec, 13.4, 52.5)).toBeGreaterThan(5);
    // večer je dřív tma na východě (Moskva) než na západě (Lisabon)
    const evening = 24 * 120 + 21;
    expect(nightOf(sunElevation(evening, 37.6, 55.75))).toBeGreaterThan(nightOf(sunElevation(evening, -9.1, 38.7)));
    expect(nightOf(10)).toBe(0); expect(nightOf(-20)).toBe(1);
    expect(nightOf(-3)).toBeGreaterThan(nightOf(0));
  });
});

describe('šum a reliéf', () => {
  it('hash a šum jsou deterministické a v mezích 0–1; šum je spojitý', () => {
    expect(hash2(3, 4, 1)).toBe(hash2(3, 4, 1));
    expect(hash2(3, 4, 1)).not.toBe(hash2(4, 3, 1));
    for (let i = 0; i < 200; i++) {
      const x = i * 0.37, y = i * 0.61;
      const v = valueNoise(x, y, 2), r = ridged(x, y, 3);
      expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1);
      expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThanOrEqual(1);
      expect(Math.abs(valueNoise(x + 0.001, y, 2) - v)).toBeLessThan(0.02);
    }
  });
  it('terén má výšku i členitost a hory jsou nejvyšší', () => {
    expect(TERRAIN_RELIEF.length).toBe(7);
    expect(TERRAIN_RELIEF[3].h).toBe(Math.max(...TERRAIN_RELIEF.map((t) => t.h)));
    expect(TERRAIN_RELIEF[3].amp).toBe(Math.max(...TERRAIN_RELIEF.map((t) => t.amp)));
  });
  it('rozmazání zachová rovnou plochu a zjemní skok', () => {
    const w = 20, h = 10, flat = new Float32Array(w * h).fill(0.5);
    for (const v of boxBlur(flat, w, h, 3)) expect(v).toBeCloseTo(0.5, 5);
    const step = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 10; x < w; x++) step[y * w + x] = 1;
    const b = boxBlur(step, w, h, 2);
    expect(b[5 * w + 9]).toBeGreaterThan(0); expect(b[5 * w + 10]).toBeLessThan(1);
    expect(b[5 * w + 2]).toBeCloseTo(0, 5); expect(b[5 * w + 18]).toBeCloseTo(1, 5);
  });
  it('stínování: rovina je neutrální šedá, svah ke světlu (severozápad) světlejší než odvrácený', () => {
    const w = 30, h = 30;
    const flat = hillshade(new Float32Array(w * h).fill(0.3), w, h, 8, 140);
    expect(flat[15 * w + 15]).toBe(128);
    const hill = new Float32Array(w * h);   // kopec uprostřed
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) hill[y * w + x] = Math.max(0, 1 - Math.hypot(x - 15, y - 15) / 10);
    const s = hillshade(hill, w, h, 8, 140);
    expect(s[10 * w + 10]).toBeGreaterThan(s[20 * w + 20]);   // severozápadní svah proti jihovýchodnímu
  });
  it('vzdálenost od pevniny a barva moře: mělčina u břehu je světlejší než hlubina', () => {
    const w = 12, h = 3, m = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) m[y * w] = 1;
    const d = distanceToLand(m, w, h);
    expect(d[1 * w]).toBe(0);
    expect(d[1 * w + 1]).toBeCloseTo(1, 5);
    expect(d[1 * w + 10]).toBeCloseTo(10, 5);
    const lum = (c) => c[0] + c[1] + c[2];
    expect(lum(seaColor(2))).toBeGreaterThan(lum(seaColor(80)));
    expect(lum(seaColor(80))).toBeGreaterThan(lum(seaColor(600)));
    expect(seaColor(5, 0.5)).toEqual(seaColor(5, 0.5));
  });
});

describe('mlha a noc (vrstvy nad dlaždicemi)', () => {
  const geo = buildGeometry(W);
  const grid = labelGrid(W.frame, geo.pick, 16);
  it('mřížka štítků pokrývá mapový list a obsahuje pevninu i moře', () => {
    expect(grid.w).toBe(Math.ceil(W.frame.w / 16));
    expect(grid.cells.some((l) => l >= 1 && l <= W.L)).toBe(true);
    expect(grid.cells.some((l) => l > W.L && l <= W.L + W.S)).toBe(true);
  });
  it('maska: pevnina mimo dohled ztmavená, v dohledu ne; moře mimo dohled slaběji; bez údajů o moři moře ne', () => {
    const land = new Uint8Array(W.L + 1);
    const i = grid.cells.findIndex((l) => l >= 1 && l <= W.L), j = grid.cells.findIndex((l) => l > W.L && l <= W.L + W.S);
    const dark = fogMask(grid, land, new Set(), W.L, W.S);
    expect(dark[i]).toBe(Math.round(FOG_ALPHA * 255));
    expect(dark[j]).toBeGreaterThan(0); expect(dark[j]).toBeLessThan(dark[i]);
    land[grid.cells[i]] = 1;
    const lit = fogMask(grid, land, new Set([grid.cells[j]]), W.L, W.S);
    expect(lit[i]).toBe(0); expect(lit[j]).toBe(0);
    expect(fogMask(grid, land, null, W.L, W.S)[j]).toBe(0);
  });
  it('noc: o půlnoci je tma skoro všude, v poledne skoro nikde', () => {
    const avg = (t) => { const g = nightGrid(W.frame, t, 64); return g.night.reduce((a, v) => a + v, 0) / g.night.length; };
    expect(avg(24 * 150 + 1)).toBeGreaterThan(0.6);
    expect(avg(24 * 150 + 13)).toBeLessThan(0.1);
  });
});
