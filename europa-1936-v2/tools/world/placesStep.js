// Krok 6b: základní údaje o oblastech (plocha, obálka, vnitřní bod), města → provincie, jména provincií, vítězné body a hlavní města.
import { boundaryDistance } from './raster.js';
import { CITIES } from './data/citiesEurope.js';
import { CITIES_EXTRA } from './data/citiesExtra.js';
import { OWNERS } from './config.js';

// hodnota vítězných bodů podle počtu obyvatel města (v tisících)
const VP_TIERS = [[2500, 40], [1500, 32], [1000, 26], [600, 20], [400, 15], [250, 11], [150, 8], [100, 6], [60, 4], [40, 3], [25, 2], [12, 1]];
export const vpOfPop = (popK) => { for (const [lim, v] of VP_TIERS) if (popK >= lim) return v; return 0; };
const CAPITAL_BONUS = 10;

// nejbližší pixel splňující podmínku (spirála po čtvercových prstencích do poloměru R)
export function nearest(GW, GH, x0, y0, R, ok) {
  x0 = Math.round(x0); y0 = Math.round(y0);
  let best = -1, bd = Infinity;
  for (let r = 0; r <= R; r++) {
    if (bd <= (r - 1) * (r - 1) && best >= 0) break;
    for (let dy = -r; dy <= r; dy++) {
      const y = y0 + dy;
      if (y < 0 || y >= GH) continue;
      const edge = Math.abs(dy) === r;
      for (let dx = -r; dx <= r; dx += edge ? 1 : 2 * r || 1) {
        const x = x0 + dx;
        if (x < 0 || x >= GW) continue;
        const i = y * GW + x;
        if (!ok(i)) continue;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = i; }
      }
    }
  }
  return best < 0 ? null : { idx: best, dist: Math.sqrt(bd) };
}

export function buildPlaces(W, log) {
  const { grid, lab, kinds, land, provOf, ownerIdx, stateOf, states, ownerTags } = W;
  const { W: GW, H: GH } = grid;
  const N = GW * GH;
  const L = W.nLand;
  const nLab = kinds.length;

  // ---- 1) plocha, obálka, vnitřní bod každé oblasti ----
  const px = new Int32Array(nLab), area = new Float64Array(nLab);
  const bb = new Int32Array(nLab * 4);
  for (let l = 0; l < nLab; l++) { bb[l * 4] = 1e9; bb[l * 4 + 1] = 1e9; bb[l * 4 + 2] = -1; bb[l * 4 + 3] = -1; }
  const dist = boundaryDistance(GW, GH, lab);
  const bestD = new Float32Array(nLab).fill(-1), bestI = new Int32Array(nLab).fill(-1);
  for (let y = 0; y < GH; y++) {
    const km2row = (x) => grid.km2At(x, y);
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x, l = lab[i];
      px[l]++; area[l] += km2row(x);
      const o = l * 4;
      if (x < bb[o]) bb[o] = x;
      if (y < bb[o + 1]) bb[o + 1] = y;
      if (x > bb[o + 2]) bb[o + 2] = x;
      if (y > bb[o + 3]) bb[o + 3] = y;
      if (dist[i] > bestD[l]) { bestD[l] = dist[i]; bestI[l] = i; }
    }
  }
  W.info = { px, area, bb, bestI, bestD };

  // ---- 2) města → provincie ----
  const all = [];
  const seen = new Map();
  for (const c of [...CITIES, ...CITIES_EXTRA]) {
    const [name, lon, lat, pop] = c;
    const key = name.toLowerCase();
    const prev = seen.get(key);
    if (prev) {
      const dKm = Math.hypot((prev[1] - lon) * 70, (prev[2] - lat) * 111);
      if (dKm < 40) { if (pop > prev[3]) prev[3] = pop; continue; }
    }
    seen.set(key, c);
    all.push({ name, lon, lat, pop });
  }
  const provCities = Array.from({ length: L + 1 }, () => []);
  const skipped = [];
  for (const c of all) {
    const [x, y] = grid.toPx(c.lon, c.lat);
    if (x < -5 || y < -5 || x > GW + 5 || y > GH + 5) { skipped.push(c.name + '(rámec)'); continue; }
    const okPix = (i) => land[i] === 1 && provOf[i] > 0 && ownerIdx[i] > 0 && ownerIdx[i] < 255;
    const s = nearest(GW, GH, x, y, 8, okPix);
    if (!s) {
      const i0 = Math.round(y) * GW + Math.round(x);
      if (!(i0 >= 0 && i0 < N && ownerIdx[i0] === 255)) skipped.push(c.name);
      continue;
    }
    const p = provOf[s.idx];
    provCities[p].push({ name: c.name, pop: c.pop, x: s.idx % GW, y: (s.idx / GW) | 0, lon: c.lon, lat: c.lat, snap: s.dist });
  }
  for (const a of provCities) a.sort((p, q) => q.pop - p.pop);
  const placed = provCities.reduce((n, a) => n + a.length, 0);
  log(`města: ${all.length}, v provinciích ${placed}${skipped.length ? `, mimo hru ${skipped.length}: ${skipped.slice(0, 14).join(', ')}` : ''}`);
  W.provCities = provCities;

  // ---- 3) hlavní města zemí ----
  const capitalProv = {};
  for (const [tag, v] of Object.entries(OWNERS)) {
    const own = ownerTags.indexOf(tag);
    const [x, y] = grid.toPx(v[2][0], v[2][1]);
    const s = nearest(GW, GH, x, y, 30, (i) => land[i] === 1 && ownerIdx[i] === own && provOf[i] > 0);
    if (!s) { console.warn(`!! hlavní město ${tag} mimo území`); continue; }
    capitalProv[tag] = provOf[s.idx];
    if (s.dist > 8) console.warn(`   hlavní město ${tag} (${v[0]}) posunuto o ${(s.dist * grid.res).toFixed(0)} km`);
  }
  W.capitalProv = capitalProv;

  // ---- 4) jména a vítězné body provincií ----
  const stateName = (p) => states[W.provs[p].state].name;
  const names = new Array(L + 1).fill('');
  const vp = new Uint8Array(L + 1);
  const cityPop = new Int32Array(L + 1);       // součet obyvatel měst v provincii (tis.)
  // nejbližší pojmenované město téhož státu pro provincie bez města
  const stateCities = new Map();
  for (let p = 1; p <= L; p++) {
    if (!provCities[p].length) continue;
    const st = W.provs[p].state;
    if (!stateCities.has(st)) stateCities.set(st, []);
    stateCities.get(st).push({ ...provCities[p][0], p });
  }
  const noCityCount = new Map();
  for (let p = 1; p <= L; p++) {
    const cs = provCities[p];
    if (cs.length) {
      names[p] = cs[0].name;
      let v = vpOfPop(cs[0].pop);
      for (let k = 1; k < cs.length; k++) if (cs[k].pop >= 60) v += Math.round(vpOfPop(cs[k].pop) * 0.5);
      vp[p] = Math.min(60, v);
      cityPop[p] = cs.reduce((n, c) => n + c.pop, 0);
    } else {
      const st = W.provs[p].state;
      const near = stateCities.get(st);
      const cx = bestI[p] % GW, cy = (bestI[p] / GW) | 0;
      if (near && near.length) {
        let b = near[0], bd = Infinity;
        for (const c of near) { const d = (c.x - cx) ** 2 + (c.y - cy) ** 2; if (d < bd) { bd = d; b = c; } }
        const dx = cx - b.x, dy = cy - b.y;
        const ang = Math.atan2(-dy, dx);         // y roste dolů
        const dirs = ['východ', 'severovýchod', 'sever', 'severozápad', 'západ', 'jihozápad', 'jih', 'jihovýchod'];
        const dir = dirs[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
        names[p] = `${b.name} – ${dir}`;
      } else {
        const n = (noCityCount.get(st) || 0) + 1; noCityCount.set(st, n);
        names[p] = `${stateName(p)} ${n}`;
      }
    }
  }
  {
    const roman = ['', '', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];
    const seenN = new Map();
    for (let p = 1; p <= L; p++) {
      const k = (seenN.get(names[p]) || 0) + 1; seenN.set(names[p], k);
      if (k > 1) names[p] += roman[k] || ` ${k}`;
    }
  }
  for (const [tag, p] of Object.entries(capitalProv)) vp[p] = Math.min(80, vp[p] + CAPITAL_BONUS);
  W.provName = names; W.provVP = vp; W.provCityPop = cityPop;

  // městské provincie (≥ 300 tis.) mají městský terén
  let urban = 0;
  if (W.provTerrain) {
    for (let p = 1; p <= L; p++) if (provCities[p].length && provCities[p][0].pop >= 300) { W.provUrban = W.provUrban || new Uint8Array(L + 1); W.provUrban[p] = 1; urban++; }
  }
  const nvp = vp.reduce((n, v) => n + (v ? 1 : 0), 0), sumvp = vp.reduce((n, v) => n + v, 0);
  log(`vítězné body: ${nvp} provincií, součet ${sumvp}; městských provincií ${urban}; hlavních měst ${Object.keys(capitalProv).length}`);
}
