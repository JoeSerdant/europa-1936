// Krok 9: zápis světa do src/data/world.json (geometrie jako sdílené oblouky + data provincií, států, regionů, sítí).
//
// Formát (v = 1). Štítky (label) jsou jednotný číselný prostor: 1..L pevninské provincie, L+1..L+S moře, L+S+1.. jezera; 0 = prázdno.
//  arcs:   [třída, štítek vlevo, štítek vpravo, x0, y0, dx1, dy1, ...]  (souřadnice v desetinách pixelu, další body jako přírůstky; -1 = rám)
//  rings:  pole podle štítku (0 = prázdná pevnina) → pole okruhů → pole čísel oblouků (i ≥ 0 dopředu, ~i = ‑i‑1 obráceně)
//  land:   pole podle id provincie (index 0 = null): n jméno, s stát, o vlastník, t terén, v vítězné body, p obyvatelé (tis.), a plocha km²,
//          b obálka [x0,y0,x1,y1], c bod pro popisek [x,y], r region, k města [[jméno, tis., x, y]], j sousedé [[id, druh, délka km]] (druh 0 souš, 1 řeka, 2 průliv),
//          q pobřeží [[moře, délka km]], h přístav [moře, úroveň]
//  sea:    pole podle id moře (1..S; štítek = L + id): n jméno, r název oblasti, a plocha, b, c, j sousední moře [[id, délka]], q pevnina [[provincie, délka]]
//  states: n jméno, id, o vlastník, p obyvatelé, a plocha, v provincie, cap hlavní provincie
//  rails:  [[provincie A, provincie B, úroveň 1–5]]
import fs from 'node:fs';
import path from 'node:path';
import { OWNERS } from './config.js';
import { SEA_REGIONS } from './data/seaRegions.js';
import { TERRAIN } from './terrainStep.js';

export const WORLD_FORMAT = 1;
export const TERRAIN_NAMES = [...TERRAIN, 'urban'];

export function exportWorld(W, file, log) {
  const { grid, arcs, rings, kinds, info } = W;
  const L = W.nLand, S = W.nSea, K = W.nLake;
  const GW = grid.W;
  const ri = (v) => Math.round(v);

  // ---- oblouky ----
  const arcOut = arcs.map((a) => {
    const row = [a.cls, a.l, a.r];
    let px = 0, py = 0;
    a.pts.forEach(([x, y], k) => {
      const ix = ri(x * 10), iy = ri(y * 10);
      if (k === 0) row.push(ix, iy); else row.push(ix - px, iy - py);
      px = ix; py = iy;
    });
    return row;
  });
  const ringOut = Array.from({ length: kinds.length }, () => []);
  for (const [lbl, rs] of rings) if (lbl >= 0) ringOut[lbl] = rs;        // 0 = prázdná pevnina (mimo hru)

  // ---- provincie ----
  const bboxOf = (l) => [info.bb[l * 4], info.bb[l * 4 + 1], info.bb[l * 4 + 2] + 1, info.bb[l * 4 + 3] + 1];
  const ptOf = (l) => [info.bestI[l] % GW, (info.bestI[l] / GW) | 0];
  const land = [null];
  for (let p = 1; p <= L; p++) {
    const t = W.provUrban && W.provUrban[p] ? 6 : W.provTerrain[p];
    const j = [...W.landAdj[p]].sort((a, b) => a[0] - b[0]).map(([q, r]) => [q, r.kind, r.len]);
    const q = [...W.coast[p]].sort((a, b) => b[1] - a[1]).map(([s, len]) => [L + s, len]);
    const o = {
      n: W.provName[p], s: W.provs[p].state, o: W.provOwner[p], t, v: W.provVP[p], p: Math.round(W.provPop[p]), a: Math.round(info.area[p]),
      b: bboxOf(p), c: ptOf(p), r: W.provRegion[p],
      k: W.provCities[p].slice(0, 3).map((c) => [c.name, c.pop, c.x, c.y]),
      j, q,
    };
    const port = W.portOf[p] >= 0 ? W.ports[W.portOf[p]] : null;
    if (port) o.h = [L + port[1], port[2]];
    land.push(o);
  }
  // ---- moře ----
  const regNames = SEA_REGIONS.map((r) => r[0]);
  const sea = [null];
  for (let s = 1; s <= S; s++) {
    const l = L + s;
    sea.push({
      n: W.seaName[s], r: regNames.indexOf(W.seas[s].region), a: Math.round(info.area[l]), b: bboxOf(l), c: ptOf(l),
      j: [...W.seaAdj[s]].sort((a, b) => a[0] - b[0]).map(([id, len]) => [L + id, len]),
      q: [...W.seaCoast[s]].sort((a, b) => b[1] - a[1]).map(([p, len]) => [p, len]),
    });
  }
  // ---- jezera (jen geometrie a obálka) ----
  const lakes = [];
  for (let k = 1; k <= K; k++) { const l = L + S + k; lakes.push({ b: bboxOf(l), a: Math.round(info.area[l]) }); }

  // ---- státy, regiony, vlastníci ----
  const states = [null];
  W.states.forEach((s, l) => {
    if (!l) return;
    states.push({ id: s.id, n: s.name, o: W.ownerTags.indexOf(s.owner), p: s.pop || 0, a: s.areaKm2 || 0, v: s.provs || [], cap: s.capital || 0 });
  });
  const owners = [null];
  for (const [tag, v] of Object.entries(OWNERS)) owners.push({ tag, name: v[0], color: v[1], cap: W.capitalProv[tag] || 0 });

  const world = {
    v: WORLD_FORMAT,
    frame: { w: grid.W, h: grid.H, km: grid.res },
    counts: { land: L, sea: S, lake: K },
    terrains: TERRAIN_NAMES,
    owners, states,
    regions: W.regions.map((r) => [r.name, r.climate]),
    seaRegions: regNames,
    arcs: arcOut, rings: ringOut,
    land, sea, lakes,
    rails: W.rails, hubs: W.hubs,
  };
  const json = JSON.stringify(world);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, json);
  log(`world.json: ${(json.length / 1e6).toFixed(2)} MB (oblouky ${arcOut.length}, provincie ${L}, moře ${S}, jezera ${K}, státy ${states.length - 1})`);
}
