// Krok 4: námořní provincie – Poissonovo vzorkování s proměnným poloměrem (hustěji u pobřeží) + geodetický růst + Lloydova relaxace.
import { SEA_REGIONS } from './data/seaRegions.js';
import { growRegions, components, noiseCost } from './raster.js';
import { mulberry32 } from '../lib/geom.js';

const SEA_R0_KM = Number(process.env.SEA_R0 || 110);     // poloměr u pobřeží
const SEA_K = Number(process.env.SEA_K || 0.5);        // přírůstek poloměru na km od pobřeží
const SEA_R1_KM = Number(process.env.SEA_R1 || 300);    // maximální poloměr

// vzdálenost od pevniny/jezer (px), chamfer 3-4 přes mořské pixely
function distFromLand(GW, GH, land) {
  const N = GW * GH;
  const d = new Float32Array(N).fill(1e9);
  for (let i = 0; i < N; i++) if (land[i] !== 0) d[i] = 0;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = y * GW + x;
    let m = d[i];
    if (x > 0) m = Math.min(m, d[i - 1] + 1);
    if (y > 0) { m = Math.min(m, d[i - GW] + 1); if (x > 0) m = Math.min(m, d[i - GW - 1] + 1.4142); if (x < GW - 1) m = Math.min(m, d[i - GW + 1] + 1.4142); }
    d[i] = m;
  }
  for (let y = GH - 1; y >= 0; y--) for (let x = GW - 1; x >= 0; x--) {
    const i = y * GW + x;
    let m = d[i];
    if (x < GW - 1) m = Math.min(m, d[i + 1] + 1);
    if (y < GH - 1) { m = Math.min(m, d[i + GW] + 1); if (x < GW - 1) m = Math.min(m, d[i + GW + 1] + 1.4142); if (x > 0) m = Math.min(m, d[i + GW - 1] + 1.4142); }
    d[i] = m;
  }
  return d;
}

export function buildSea(W, log) {
  const { grid, land } = W;
  const { W: GW, H: GH } = grid;
  const N = GW * GH;
  const rng = mulberry32(7);
  const dL = distFromLand(GW, GH, land);
  W.dLand = dL;

  const group = new Uint16Array(N);
  for (let i = 0; i < N; i++) if (land[i] === 0) group[i] = 1;

  const radius = (d) => Math.min(SEA_R1_KM, SEA_R0_KM + SEA_K * d * grid.res) / grid.res;   // v px
  // kandidáty: každý 3. pixel v náhodném pořadí
  const cand = [];
  for (let y = 1; y < GH; y += 3) for (let x = 1; x < GW; x += 3) if (group[y * GW + x]) cand.push(y * GW + x);
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = cand[i]; cand[i] = cand[j]; cand[j] = t; }

  const CELL = 30;
  const gw = Math.ceil(GW / CELL), gh = Math.ceil(GH / CELL);
  const hash = Array.from({ length: gw * gh }, () => []);
  const seeds = [];
  const rmaxPx = SEA_R1_KM / grid.res;
  const reach = Math.ceil(rmaxPx / CELL);
  for (const i of cand) {
    const x = i % GW, y = (i / GW) | 0;
    const r = radius(dL[i]);
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    let ok = true;
    const rr = Math.min(reach, Math.ceil(r / CELL) + Math.ceil(rmaxPx / CELL));
    for (let gy = Math.max(0, cy - rr); gy <= Math.min(gh - 1, cy + rr) && ok; gy++) {
      for (let gx = Math.max(0, cx - rr); gx <= Math.min(gw - 1, cx + rr); gx++) {
        for (const s of hash[gy * gw + gx]) {
          const d = Math.hypot(s.x - x, s.y - y);
          if (d < 0.5 * (r + s.r)) { ok = false; break; }
        }
        if (!ok) break;
      }
    }
    if (!ok) continue;
    const s = { x, y, r, idx: i };
    seeds.push(s);
    hash[cy * gw + cx].push(s);
  }
  log(`námořních semínek (Poisson): ${seeds.length}`);

  // každá vodní plocha bez semínka dostane jedno (nejdál od břehu)
  const { comp, list } = components(GW, GH, group);
  const has = new Set();
  for (const s of seeds) has.add(comp[s.idx]);
  const best = new Map();
  for (let i = 0; i < N; i++) {
    const c = comp[i];
    if (c < 0 || has.has(c)) continue;
    if (!best.has(c) || dL[i] > dL[best.get(c)]) best.set(c, i);
  }
  for (const [c, i] of best) { if (list[c].size >= 40) seeds.push({ x: i % GW, y: (i / GW) | 0, idx: i }); }
  log(`vodních ploch: ${list.length}, doplněno semínek: ${[...best].filter(([c]) => list[c].size >= 40).length}`);

  const cost = noiseCost(GW, GH, { scale: 60, seed: 31, lo: 0.6, hi: 1.7, contrast: 3, oct: 3 });
  let labels = null;
  for (let it = 0; it < 3; it++) {
    const sd = seeds.map((s, k) => ({ idx: s.idx, label: k + 1 }));
    const { lab } = growRegions(GW, GH, group, sd, cost);
    labels = lab;
    if (it === 2) break;
    // Lloyd: těžiště oblasti → nové semínko (nejbližší pixel oblasti)
    const sx = new Float64Array(seeds.length + 1), sy = new Float64Array(seeds.length + 1), cnt = new Int32Array(seeds.length + 1);
    for (let i = 0; i < N; i++) { const l = lab[i]; if (l) { sx[l] += i % GW; sy[l] += (i / GW) | 0; cnt[l]++; } }
    const move = [];
    for (let k = 0; k < seeds.length; k++) {
      const l = k + 1;
      if (!cnt[l]) continue;
      move.push({ k, tx: sx[l] / cnt[l], ty: sy[l] / cnt[l] });
    }
    // najdi nejbližší pixel patřící téže oblasti k těžišti (hledání do okolí)
    for (const m of move) {
      const l = m.k + 1;
      const x0 = Math.round(m.tx), y0 = Math.round(m.ty);
      let bi = seeds[m.k].idx, bd = Infinity;
      for (let R = 0; R < 60 && bd === Infinity; R += 6) {
        for (let dy = -R - 6; dy <= R + 6; dy++) for (let dx = -R - 6; dx <= R + 6; dx++) {
          const x = x0 + dx, y = y0 + dy;
          if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
          const i = y * GW + x;
          if (lab[i] !== l) continue;
          const d = dx * dx + dy * dy;
          if (d < bd) { bd = d; bi = i; }
        }
      }
      seeds[m.k].idx = bi; seeds[m.k].x = bi % GW; seeds[m.k].y = (bi / GW) | 0;
    }
  }
  // nepřiřazené mořské pixely (malé uzavřené plochy bez semínka): sjednotit s nejbližším sousedem
  let miss = 0;
  for (let i = 0; i < N; i++) if (group[i] && !labels[i]) miss++;
  if (miss) log(`!! moře bez oblasti: ${miss} px`);

  // pojmenování: nejbližší středový bod oblasti
  const regPts = SEA_REGIONS.map(([name, lon, lat]) => ({ name, p: grid.toPx(lon, lat) }));
  const seas = [{ name: '' }];
  const sx = new Float64Array(seeds.length + 1), sy = new Float64Array(seeds.length + 1), cnt = new Int32Array(seeds.length + 1);
  for (let i = 0; i < N; i++) { const l = labels[i]; if (l) { sx[l] += i % GW; sy[l] += (i / GW) | 0; cnt[l]++; } }
  for (let k = 0; k < seeds.length; k++) {
    const l = k + 1;
    if (!cnt[l]) { seas.push({ empty: true }); continue; }
    const cx = sx[l] / cnt[l], cy = sy[l] / cnt[l];
    let bn = 0, bd = Infinity;
    regPts.forEach((r, j) => { const d = (r.p[0] - cx) ** 2 + (r.p[1] - cy) ** 2; if (d < bd) { bd = d; bn = j; } });
    seas.push({ region: regPts[bn].name, px: cnt[l], seedIdx: seeds[k].idx });
  }
  W.seaOf = labels;
  W.seas = seas;
  log(`námořních provincií: ${seas.length - 1}`);
}
