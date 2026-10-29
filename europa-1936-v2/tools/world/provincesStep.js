// Krok 3: řeky (rastr) a provincie – k-means semínka uvnitř států + geodetický růst.
import { loadGeoJSON, polygonsOf } from './grid.js';
import { growRegions, components, noiseCost, lineCells } from './raster.js';
import { mulberry32 } from '../lib/geom.js';
import { PROV_BASE_KM2, PROV_MAX_PER_STATE, OWNER_SPARSE } from './config.js';

export function buildRivers(W, log) {
  const { grid, land } = W;
  const { W: GW, H: GH } = grid;
  const river = new Uint8Array(GW * GH);
  const gj = loadGeoJSON('ne_10m_rivers_lake_centerlines');
  let n = 0, kept = 0;
  for (const f of gj.features) {
    const sr = f.properties.scalerank;
    if (sr > 8) continue;
    const g = f.geometry;
    const lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
    for (const l of lines) {
      if (!l.some(([x, y]) => x > W.window[0] && x < W.window[2] && y > W.window[1] && y < W.window[3])) continue;
      n++;
      for (let k = 0; k + 1 < l.length; k++) {
        const a = grid.toPx(l[k][0], l[k][1]), b = grid.toPx(l[k + 1][0], l[k + 1][1]);
        if (Math.abs(a[0] - b[0]) > 400 || Math.abs(a[1] - b[1]) > 400) continue;
        lineCells(a[0], a[1], b[0], b[1], (x, y) => {
          if (x < 0 || y < 0 || x >= GW || y >= GH) return;
          const i = y * GW + x;
          if (land[i] === 1 && !river[i]) { river[i] = 1; kept++; }
        });
      }
    }
  }
  log(`řek: ${n}, pixelů ${kept}`);
  W.river = river;
}

// k-means v rovině; vstup: pole souřadnic xs, ys (Float32Array), počet n; vrací pole [x, y]
function kmeans(xs, ys, n, rng, iters = 8) {
  const m = xs.length;
  const cx = new Float64Array(n), cy = new Float64Array(n);
  // k-means++
  let first = Math.floor(rng() * m);
  cx[0] = xs[first]; cy[0] = ys[first];
  const d2 = new Float64Array(m).fill(Infinity);
  for (let k = 1; k < n; k++) {
    let sum = 0;
    for (let i = 0; i < m; i++) {
      const dx = xs[i] - cx[k - 1], dy = ys[i] - cy[k - 1];
      const d = dx * dx + dy * dy;
      if (d < d2[i]) d2[i] = d;
      sum += d2[i];
    }
    let r = rng() * sum, pick = m - 1;
    for (let i = 0; i < m; i++) { r -= d2[i]; if (r <= 0) { pick = i; break; } }
    cx[k] = xs[pick]; cy[k] = ys[pick];
  }
  const sx = new Float64Array(n), sy = new Float64Array(n), cnt = new Int32Array(n);
  for (let it = 0; it < iters; it++) {
    sx.fill(0); sy.fill(0); cnt.fill(0);
    for (let i = 0; i < m; i++) {
      let best = 0, bd = Infinity;
      for (let k = 0; k < n; k++) {
        const dx = xs[i] - cx[k], dy = ys[i] - cy[k];
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = k; }
      }
      sx[best] += xs[i]; sy[best] += ys[i]; cnt[best]++;
    }
    for (let k = 0; k < n; k++) if (cnt[k]) { cx[k] = sx[k] / cnt[k]; cy[k] = sy[k] / cnt[k]; }
  }
  return Array.from(cx, (x, k) => [x, cy[k]]);
}

export function buildProvinces(W, log) {
  const { grid, stateOf, states, ownerTags } = W;
  const { W: GW, H: GH } = grid;
  const N = GW * GH;
  const rng = mulberry32(1936);

  // plocha států v km² (přesněji s měřítkem) a komponenty
  const { comp, list } = components(GW, GH, stateOf);
  // pixely komponent
  const members = list.map(() => []);
  for (let i = 0; i < N; i++) { const c = comp[i]; if (c >= 0) members[c].push(i); }
  const compKm2 = list.map((c, k) => {
    let a = 0;
    const m = members[k];
    const step = Math.max(1, Math.floor(m.length / 400));
    for (let t = 0; t < m.length; t += step) { const i = m[t]; a += grid.km2At(i % GW, (i / GW) | 0) * step; }
    return a;
  });
  const stateKm2 = new Float64Array(states.length);
  list.forEach((c, k) => { stateKm2[c.key] += compKm2[k]; });
  states.forEach((s, l) => { if (l) s.areaKm2 = Math.round(stateKm2[l]); });

  // kolik provincií pro který stát
  const nState = new Int32Array(states.length);
  for (let l = 1; l < states.length; l++) {
    const s = states[l];
    if (!s.areaKm2) continue;
    const sparse = (OWNER_SPARSE[s.owner] ?? 1) * s.sp;
    nState[l] = Math.max(1, Math.min(PROV_MAX_PER_STATE, Math.round(s.areaKm2 / (PROV_BASE_KM2 * sparse))));
  }

  const seeds = [];
  const provs = [{ state: 0 }];
  list.forEach((c, k) => {
    const l = c.key;
    const total = stateKm2[l];
    let n = Math.max(1, Math.round(nState[l] * (compKm2[k] / total)));
    // velký ostrov/komponenta dostane aspoň tolik, kolik mu podle plochy patří
    n = Math.min(n, Math.max(1, Math.floor(members[k].length / 12)));
    const m = members[k];
    let idxs;
    if (n === 1) {
      // nejbližší pixel těžišti
      let bi = m[0], bd = Infinity;
      for (const i of m) { const d = (i % GW - c.cx) ** 2 + ((i / GW) | 0 - c.cy) ** 2; if (d < bd) { bd = d; bi = i; } }
      idxs = [bi];
    } else {
      const stride = Math.max(1, Math.floor(m.length / 30000));
      const sample = [];
      for (let t = 0; t < m.length; t += stride) sample.push(m[t]);
      const xs = Float32Array.from(sample, (i) => i % GW), ys = Float32Array.from(sample, (i) => (i / GW) | 0);
      const cs = kmeans(xs, ys, Math.min(n, sample.length), rng);
      idxs = cs.map(([x, y]) => {
        let bi = sample[0], bd = Infinity;
        for (let t = 0; t < sample.length; t++) { const d = (xs[t] - x) ** 2 + (ys[t] - y) ** 2; if (d < bd) { bd = d; bi = sample[t]; } }
        return bi;
      });
      idxs = [...new Set(idxs)];
    }
    for (const idx of idxs) {
      const label = provs.length;
      provs.push({ state: l, seedIdx: idx });
      seeds.push({ idx, label });
    }
  });
  if (provs.length > 6000) throw new Error('moc provincií: ' + provs.length);
  log(`provincií: ${provs.length - 1} (cíl ${(20.6e6 / 6000).toFixed(0)}+)`);

  // růst provincií uvnitř států; hranice zvlněné šumem a mírně přitahované řekami
  const river = W.river;
  const rv = new Float32Array(N);
  if (river) for (let i = 0; i < N; i++) if (river[i]) rv[i] = 1.2;
  const cost = noiseCost(GW, GH, { scale: Number(process.env.SCALE_P || 20), seed: 23, lo: Number(process.env.LO_P || 0.5), hi: Number(process.env.HI_P || 2.0), contrast: Number(process.env.CON_P || 3), oct: 3, extra: rv });
  const { lab } = growRegions(GW, GH, stateOf, seeds, cost);
  // nepokryté (nemělo by být) → nejbližší provincie téhož státu
  let miss = 0;
  for (let i = 0; i < N; i++) if (stateOf[i] && !lab[i]) miss++;
  if (miss) log(`!! nepřiřazeno ${miss} px`);
  W.provOf = lab;
  W.provs = provs;
  W.nLand = provs.length - 1;
}
