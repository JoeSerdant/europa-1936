// Krok 6d: strategické regiony (pevnina), obyvatelstvo provincií a států, jména námořních provincií.
import { growRegions } from './raster.js';
import { snapToGroup } from './statesStep.js';
import { LAND_REGIONS } from './data/landRegions.js';
import { SEA_REGIONS } from './data/seaRegions.js';
import { POP_1936, POP_AREAS, TERRAIN_DENSITY, CLIMATE_DENSITY, REGION_DENSITY } from './data/population.js';
import { TERRAIN } from './terrainStep.js';

export function buildRegions(W, log) {
  const { grid, land, provOf, ownerIdx, ownerTags } = W;
  const { W: GW, H: GH } = grid;
  const N = GW * GH;
  const L = W.nLand;

  // ---- pevninské regiony: geodetický růst ze středů po celé pevnině ----
  const group = new Uint16Array(N);
  for (let i = 0; i < N; i++) if (land[i] === 1 && provOf[i]) group[i] = 1;
  const seeds = [], regs = [];
  const missing = [];
  LAND_REGIONS.forEach(([name, lon, lat, climate]) => {
    const [px, py] = grid.toPx(lon, lat);
    const sn = snapToGroup(GW, GH, group, 1, px, py, 90);
    if (!sn) { missing.push(name); return; }
    regs.push({ name, climate, lon, lat });
    seeds.push({ idx: sn.idx, label: regs.length });
  });
  if (missing.length) log(`  regiony bez území: ${missing.join(', ')}`);
  const { lab } = growRegions(GW, GH, group, seeds, null);
  // ostrovy a oddělené kusy: nejbližší střed
  const sp = seeds.map((s) => [s.idx % GW, (s.idx / GW) | 0]);
  const regionOfPx = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (lab[i]) regionOfPx[i] = lab[i];
  const cnt = new Int32Array((L + 1) * (regs.length + 1));
  const R1 = regs.length + 1;
  for (let i = 0; i < N; i++) {
    const p = provOf[i];
    if (p && land[i] === 1 && regionOfPx[i]) cnt[p * R1 + regionOfPx[i]]++;
  }
  const provRegion = new Uint8Array(L + 1);
  for (let p = 1; p <= L; p++) {
    let b = 0, bc = 0;
    for (let r = 1; r <= regs.length; r++) if (cnt[p * R1 + r] > bc) { bc = cnt[p * R1 + r]; b = r; }
    if (!b) {
      // provincie bez zasaženého regionu (ostrov): nejbližší střed
      const x = W.info.bestI[p] % GW, y = (W.info.bestI[p] / GW) | 0;
      let bd = Infinity;
      sp.forEach(([sx, sy], k) => { const d = (sx - x) ** 2 + (sy - y) ** 2; if (d < bd) { bd = d; b = k + 1; } });
    }
    provRegion[p] = b;
  }
  W.regions = regs; W.provRegion = provRegion;
  const rc = new Int32Array(regs.length + 1);
  for (let p = 1; p <= L; p++) rc[provRegion[p]]++;
  const empty = regs.filter((r, k) => !rc[k + 1]).map((r) => r.name);
  log(`strategické regiony: ${regs.length}${empty.length ? `, prázdné: ${empty.join(', ')}` : ''}; provincií v regionu min ${Math.min(...Array.from(rc).slice(1).filter(Boolean))}, max ${Math.max(...rc)}`);

  // ---- obyvatelstvo: města + venkov podle plochy × hustota terénu × hustota regionu × přitažlivost měst ----
  const pop = new Float64Array(L + 1);     // tisíce
  const w = new Float64Array(L + 1);
  const groups = new Map();                // klíč skupiny -> { total, list }
  for (let p = 1; p <= L; p++) {
    const t = ownerTags[W.provOwner[p]];
    const terr = W.provUrban && W.provUrban[p] ? 'urban' : TERRAIN[W.provTerrain[p]];
    const reg = regs[provRegion[p] - 1];
    const dens = REGION_DENSITY[reg.name] ?? CLIMATE_DENSITY[reg.climate];
    const cp = W.provCityPop[p];
    w[p] = W.info.area[p] * TERRAIN_DENSITY[terr] * dens * (1 + 0.6 * Math.log(1 + cp / 50));
    let key = t, total = POP_1936[t];
    for (const [names, n] of POP_AREAS[t] || []) if (names.includes(reg.name)) { key = `${t}:${names[0]}`; total = n; break; }
    if (!total) { console.warn(`!! chybí počet obyvatel pro ${key}`); continue; }
    if (!groups.has(key)) groups.set(key, { total, list: [], owner: t });
    groups.get(key).list.push(p);
  }
  const short = [];
  for (const [key, g] of groups) {
    let urban = 0, ws = 0;
    for (const p of g.list) { urban += W.provCityPop[p]; ws += w[p]; }
    // seznam měst nepokrývá všechny; kdyby města přesáhla 70 % skupiny, stáhneme je
    const k = urban > 0.7 * g.total ? (0.7 * g.total) / urban : 1;
    const rural = g.total - urban * k;
    for (const p of g.list) pop[p] = W.provCityPop[p] * k + (ws > 0 ? (rural * w[p]) / ws : 0);
    if (k < 1) short.push(key);
  }
  W.provPop = pop;
  if (short.length) log(`  města stažena na 70 % počtu obyvatel: ${short.join(', ')}`);
  const byOwner = new Map();
  for (const g of groups.values()) { if (!byOwner.has(g.owner)) byOwner.set(g.owner, []); byOwner.get(g.owner).push(...g.list); }

  // ---- státy: součty, hlavní provincie ----
  const stProvs = W.states.map(() => []);
  for (let p = 1; p <= L; p++) stProvs[W.provs[p].state].push(p);
  W.states.forEach((s, l) => {
    if (!l) return;
    s.provs = stProvs[l];
    s.pop = Math.round(s.provs.reduce((n, p) => n + pop[p], 0));
    s.capital = s.provs.slice().sort((a, b) => W.provVP[b] - W.provVP[a] || pop[b] - pop[a])[0] || 0;
  });
  const tp = Object.fromEntries([...byOwner.keys()].map((t) => [t, Math.round(byOwner.get(t).reduce((n, p) => n + pop[p], 0))]));
  log(`obyvatelstvo: celkem ${Math.round(pop.reduce((n, v) => n + v, 0) / 1000)} M; stát s nejvíc lidmi: ${W.states.filter((s) => s.pop).sort((a, b) => b.pop - a.pop).slice(0, 3).map((s) => `${s.name} ${(s.pop / 1000).toFixed(1)} M`).join(', ')}`);
  W.ownerPop = tp;

  // ---- jména námořních provincií ----
  const S = W.nSea;
  const seaName = new Array(S + 1).fill('');
  const per = new Map();
  for (let s = 1; s <= S; s++) { const r = W.seas[s].region; if (r) per.set(r, (per.get(r) || 0) + 1); }
  const idx = new Map();
  for (let s = 1; s <= S; s++) {
    const r = W.seas[s].region;
    if (!r) { seaName[s] = ''; continue; }
    const n = (idx.get(r) || 0) + 1; idx.set(r, n);
    seaName[s] = per.get(r) > 1 ? `${r} ${n}` : r;
  }
  W.seaName = seaName;
}
