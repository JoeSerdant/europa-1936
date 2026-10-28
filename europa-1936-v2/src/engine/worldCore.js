// Jádro načítání světa (bez importu JSON, aby šlo použít i v nástrojích běžících čistě v Node): buildWorld, decodeArcs, ringToPoints.
// Svět je neměnný – nikdy ho nezapisujeme do herního stavu; stav drží jen to, co se ve hře mění (vlastníci, jednotky, ...).

export const TERRAIN = { PLAINS: 0, FOREST: 1, HILLS: 2, MOUNTAINS: 3, MARSH: 4, DESERT: 5, URBAN: 6 };
export const TERRAIN_CS = ['Rovina', 'Les', 'Pahorkatina', 'Hory', 'Bažiny', 'Poušť', 'Město'];
export const ADJ = { LAND: 0, RIVER: 1, STRAIT: 2 };
export const CLIMATE_CS = {
  oceanic: 'Oceánské', temperate: 'Mírné', continental: 'Kontinentální', subarctic: 'Subarktické', arctic: 'Arktické',
  mediterranean: 'Středomořské', steppe: 'Stepní', semiarid: 'Polosuché', desert: 'Pouštní', alpine: 'Horské',
};

// sousednosti v „komprimovaném“ tvaru: start[i]..start[i+1] jsou záznamy souseda i
function csr(n, listOf, fields) {
  const start = new Int32Array(n + 2);
  let total = 0;
  for (let i = 1; i <= n; i++) { start[i] = total; total += listOf(i).length; }
  start[n + 1] = total;
  const out = { start, to: new Int32Array(total) };
  for (const [name, Type] of fields) out[name] = new Type(total);
  for (let i = 1; i <= n; i++) {
    let k = start[i];
    for (const rec of listOf(i)) {
      out.to[k] = rec[0];
      fields.forEach(([name], f) => { out[name][k] = rec[f + 1]; });
      k++;
    }
  }
  return out;
}

export function buildWorld(raw) {
  const L = raw.counts.land, S = raw.counts.sea, K = raw.counts.lake;
  const nLabel = 1 + L + S + K;
  const owners = raw.owners;
  const ownerIdx = {};
  owners.forEach((o, i) => { if (o) ownerIdx[o.tag] = i; });

  // ---- vlastnosti pevninských provincií ----
  const provOwner0 = new Uint8Array(L + 1), provState = new Uint16Array(L + 1), terrain = new Uint8Array(L + 1);
  const vp = new Uint8Array(L + 1), pop = new Int32Array(L + 1), area = new Int32Array(L + 1), region = new Uint8Array(L + 1);
  const portSea = new Uint16Array(L + 1), portLevel = new Uint8Array(L + 1);
  for (let p = 1; p <= L; p++) {
    const o = raw.land[p];
    provOwner0[p] = o.o; provState[p] = o.s; terrain[p] = o.t; vp[p] = o.v; pop[p] = o.p; area[p] = o.a; region[p] = o.r;
    if (o.h) { portSea[p] = o.h[0]; portLevel[p] = o.h[1]; }
  }
  const landAdj = csr(L, (p) => raw.land[p].j, [['kind', Uint8Array], ['len', Uint16Array]]);
  const coast = csr(L, (p) => raw.land[p].q, [['len', Uint16Array]]);                      // provincie → moře
  // moře: id moře = štítek (L+1..L+S); pole CSR indexujeme 1..S
  const seaAdj = csr(S, (s) => raw.sea[s].j, [['len', Uint16Array]]);                      // moře → moře (to = štítek)
  const seaCoast = csr(S, (s) => raw.sea[s].q, [['len', Uint16Array]]);                    // moře → provincie

  // ---- železnice: CSR přes provincie ----
  const rl = Array.from({ length: L + 1 }, () => []);
  for (const [a, b, lv] of raw.rails) { rl[a].push([b, lv]); rl[b].push([a, lv]); }
  const rails = csr(L, (p) => rl[p], [['level', Uint8Array]]);

  // ---- státy ----
  const states = raw.states;
  const stateOwner0 = new Uint8Array(states.length);
  states.forEach((s, i) => { if (s) stateOwner0[i] = s.o; });

  const world = {
    raw, L, S, K, nLabel,
    owners, ownerIdx, tags: owners.map((o) => (o ? o.tag : '')),
    states, stateOwner0, regions: raw.regions, seaRegions: raw.seaRegions,
    land: raw.land, sea: raw.sea,
    provOwner0, provState, terrain, vp, pop, area, region, portSea, portLevel,
    landAdj, coast, seaAdj, seaCoast, rails,
    frame: raw.frame,
    kind(label) { return label === 0 ? 'void' : label <= L ? 'land' : label <= L + S ? 'sea' : 'lake'; },
    isLand: (l) => l >= 1 && l <= L,
    isSea: (l) => l > L && l <= L + S,
    seaId: (l) => l - L,
    provName: (p) => raw.land[p].n,
    seaName: (l) => raw.sea[l - L].n,
    stateName: (s) => states[s].n,
    ownerTag: (i) => owners[i].tag,
    // sousedé pevninské provincie: volání cb(sousední id, druh, délka km)
    forLandNeighbors(p, cb) { for (let k = landAdj.start[p]; k < landAdj.start[p + 1]; k++) cb(landAdj.to[k], landAdj.kind[k], landAdj.len[k]); },
    forSeaNeighbors(sl, cb) { const s = sl - L; for (let k = seaAdj.start[s]; k < seaAdj.start[s + 1]; k++) cb(seaAdj.to[k], seaAdj.len[k]); },
    forCoast(p, cb) { for (let k = coast.start[p]; k < coast.start[p + 1]; k++) cb(coast.to[k], coast.len[k]); },
  };
  return world;
}

// ---- geometrie (jen pro mapu a testy) ------------------------------------------------------------------------------------------
// oblouky → Float32Array [x0,y0,x1,y1,...] v pixelech světa
export function decodeArcs(raw) {
  return raw.arcs.map((row) => {
    const n = (row.length - 3) / 2;
    const pts = new Float32Array(n * 2);
    let x = 0, y = 0;
    for (let k = 0; k < n; k++) {
      x += row[3 + 2 * k]; y += row[4 + 2 * k];
      pts[2 * k] = x / 10; pts[2 * k + 1] = y / 10;
    }
    return { cls: row[0], l: row[1], r: row[2], pts };
  });
}

// okruh (pole čísel oblouků) → Float32Array bodů (uzavřený okruh bez opakování prvního bodu)
export function ringToPoints(arcs, ring) {
  let total = 0;
  const parts = [];
  for (const id of ring) {
    const rev = id < 0;
    const a = arcs[rev ? ~id : id];
    parts.push([a.pts, rev]);
    total += a.pts.length / 2 - 1;
  }
  const out = new Float32Array((total + 1) * 2);
  let k = 0;
  let first = true;
  for (const [pts, rev] of parts) {
    const n = pts.length / 2;
    for (let i = first ? 0 : 1; i < n; i++) {
      const j = rev ? n - 1 - i : i;
      out[k++] = pts[2 * j]; out[k++] = pts[2 * j + 1];
    }
    first = false;
  }
  return out.subarray(0, k);
}
