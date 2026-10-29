// Krok 6a: terén. Rastr terénu vzniká vrstvením: les (hustota × šum) → plošiny → pouště → vlastní zóny → pohoří → bažiny → podhůří.
// Terén provincie = většinové hlasování přes její pixely s prahy (hory a bažiny mají přednost před lesem a pahorkatinou).
import { loadGeoJSON, polygonsOf, inWindow } from './grid.js';
import { fillRings, fbm } from './raster.js';
import {
  MOUNTAIN_NAMES, HILL_RANGE_NAMES, HILL_PLATEAU_NAMES, DESERT_PLATEAU_NAMES, MARSH_NAMES, DESERT_PLAIN_NAMES,
  CUSTOM_ZONES, FOREST_ZONES, NO_FOREST_ZONES,
} from './data/terrainData.js';

export const TERRAIN = ['plains', 'forest', 'hills', 'mountains', 'marsh', 'desert'];
const T = Object.fromEntries(TERRAIN.map((t, i) => [t, i]));

// přibližná kumulativní normální distribuce → rovnoměrné rozdělení šumu 0..1
function uniformize(v) {
  const z = (v - 0.5) / 0.115;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export function buildTerrain(W, log) {
  const { grid, land, provOf, ownerIdx } = W;
  const { W: GW, H: GH } = grid;
  const N = GW * GH;
  const win = W.window;
  const toRing = (r) => r.map(([lon, lat]) => grid.toPx(lon, lat));

  const terr = new Uint8Array(N);                 // výchozí = plains

  // ---- 1) lesy ----
  const dens = new Float32Array(N);
  for (const z of FOREST_ZONES) {
    fillRings(GW, GH, [toRing(z.ring)], (y, c0, c1) => {
      for (let x = c0, i = y * GW + c0; x < c1; x++, i++) if (dens[i] < z.d) dens[i] = z.d;
    });
  }
  for (const z of NO_FOREST_ZONES) {
    fillRings(GW, GH, [toRing(z.ring)], (y, c0, c1) => { for (let x = c0, i = y * GW + c0; x < c1; x++, i++) dens[i] = 0; });
  }
  let nForest = 0;
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x;
      if (land[i] !== 1 || dens[i] <= 0) continue;
      const u = uniformize(fbm(x / 16, y / 16, 31, 3));
      if (u < dens[i]) { terr[i] = T.forest; nForest++; }
    }
  }

  // ---- 2) vrstvy z Natural Earth + vlastní zóny ----
  const paint = (rings, type) => {
    fillRings(GW, GH, rings, (y, c0, c1) => {
      for (let x = c0, i = y * GW + c0; x < c1; x++, i++) if (land[i] === 1) terr[i] = type;
    });
  };
  const ne = loadGeoJSON('ne_10m_geography_regions_polys');
  const feats = ne.features.map((f) => ({ cls: f.properties.FEATURECLA, name: f.properties.NAME || '', parts: polygonsOf(f.geometry).filter((p) => inWindow(p.bbox, win)) })).filter((f) => f.parts.length);
  const paintFeature = (f, type) => { for (const part of f.parts) paint(part.rings.map(toRing), type); };
  const matched = new Set();
  const byName = (set, type) => {
    for (const f of feats) if (set.has(f.name)) { paintFeature(f, type); matched.add(f.name); }
  };
  const missing = [];
  for (const set of [MOUNTAIN_NAMES, HILL_RANGE_NAMES, HILL_PLATEAU_NAMES, DESERT_PLATEAU_NAMES, MARSH_NAMES, DESERT_PLAIN_NAMES]) {
    for (const n of set) if (!feats.some((f) => f.name === n)) missing.push(n);
  }
  if (missing.length) log(`  terén: názvy bez shody v Natural Earth: ${missing.join(', ')}`);

  byName(HILL_PLATEAU_NAMES, T.hills);
  byName(DESERT_PLATEAU_NAMES, T.desert);
  byName(DESERT_PLAIN_NAMES, T.desert);
  for (const f of feats) if (f.cls === 'Desert' && f.name !== 'Jabal as Sawdä’') paintFeature(f, T.desert);
  for (const z of CUSTOM_ZONES) paint([toRing(z.ring)], T[z.type]);
  for (const f of feats) if (f.name === 'Jabal Nafüsah' || f.name === 'Jabal as Sawdä’' || f.name === 'Jabal bin Ghunaymah') paintFeature(f, T.hills);
  byName(HILL_RANGE_NAMES, T.hills);
  byName(MOUNTAIN_NAMES, T.mountains);
  for (const f of feats) if (f.name === 'Central Makran') paintFeature(f, T.mountains);
  byName(MARSH_NAMES, T.marsh);

  // ---- 3) podhůří: pás 17 km kolem hor je pahorkatina (les zůstává lesem) ----
  const d = new Float32Array(N).fill(1e9);
  for (let i = 0; i < N; i++) if (terr[i] === T.mountains) d[i] = 0;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = y * GW + x; let m = d[i];
    if (x > 0) m = Math.min(m, d[i - 1] + 1);
    if (y > 0) { m = Math.min(m, d[i - GW] + 1); if (x > 0) m = Math.min(m, d[i - GW - 1] + 1.4142); if (x < GW - 1) m = Math.min(m, d[i - GW + 1] + 1.4142); }
    d[i] = m;
  }
  for (let y = GH - 1; y >= 0; y--) for (let x = GW - 1; x >= 0; x--) {
    const i = y * GW + x; let m = d[i];
    if (x < GW - 1) m = Math.min(m, d[i + 1] + 1);
    if (y < GH - 1) { m = Math.min(m, d[i + GW] + 1); if (x < GW - 1) m = Math.min(m, d[i + GW + 1] + 1.4142); if (x > 0) m = Math.min(m, d[i + GW - 1] + 1.4142); }
    d[i] = m;
  }
  let nFoot = 0;
  for (let i = 0; i < N; i++) if (land[i] === 1 && terr[i] === T.plains && d[i] <= 7) { terr[i] = T.hills; nFoot++; }
  W.terr = terr;

  // ---- 4) terén provincií: většinové hlasování ----
  const L = W.nLand;
  const cnt = new Int32Array((L + 1) * 6);
  const tot = new Int32Array(L + 1);
  for (let i = 0; i < N; i++) {
    const p = provOf[i];
    if (!p || land[i] !== 1) continue;
    cnt[p * 6 + terr[i]]++; tot[p]++;
  }
  const out = new Uint8Array(L + 1);
  const hist = {};
  for (let p = 1; p <= L; p++) {
    const n = Math.max(1, tot[p]);
    const f = (t) => cnt[p * 6 + t] / n;
    let t = T.plains;
    if (f(T.mountains) >= 0.35) t = T.mountains;
    else if (f(T.marsh) >= 0.4) t = T.marsh;
    else if (f(T.desert) >= 0.5) t = T.desert;
    else if (f(T.forest) >= 0.45) t = T.forest;
    else if (f(T.hills) + f(T.mountains) * 0.8 >= 0.45) t = T.hills;
    out[p] = t;
    hist[TERRAIN[t]] = (hist[TERRAIN[t]] || 0) + 1;
  }
  W.provTerrain = out;
  W.provTerrainFrac = { cnt, tot };
  log(`terén: lesních pixelů ${nForest}, podhůří ${nFoot}; provincie ${Object.entries(hist).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
