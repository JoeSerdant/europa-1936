// Krok 6c: síť – sousednosti provincií (souš, řeka, průliv, pobřeží, moře), přístavy a železnice.
import { components, MinHeap } from './raster.js';
import { nearest } from './placesStep.js';
import { TERRAIN } from './terrainStep.js';
import { PORT_BOOST, STRAIT_EXTRA, STRAIT_SKIP, RAIL_FACTOR } from './data/networkData.js';

export const ADJ = { land: 0, river: 1, strait: 2 };

export function buildAdjacency(W, log) {
  const { grid, lab, kinds, river, land, provOf, dLand } = W;
  const { W: GW, H: GH } = grid;
  const L = W.nLand, S = W.nSea;
  const N = GW * GH;
  const K = 4096;
  const cnt = new Map(), riv = new Map();
  const add = (a, b, i, j) => {
    if (a === b) return;
    const lo = a < b ? a : b, hi = a < b ? b : a;
    const k = lo * K + hi;
    cnt.set(k, (cnt.get(k) || 0) + 1);
    if (river[i] || river[j]) riv.set(k, (riv.get(k) || 0) + 1);
  };
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x, a = lab[i];
      if (x + 1 < GW) { const b = lab[i + 1]; if (b !== a) add(a, b, i, i + 1); }
      if (y + 1 < GH) { const b = lab[i + GW]; if (b !== a) add(a, b, i, i + GW); }
    }
  }
  const landAdj = Array.from({ length: L + 1 }, () => new Map());       // p -> Map(q -> {len, kind})
  const coast = Array.from({ length: L + 1 }, () => new Map());         // p -> Map(seaId(1..S) -> len)
  const seaAdj = Array.from({ length: S + 1 }, () => new Map());        // s -> Map(s2 -> len)
  const seaCoast = Array.from({ length: S + 1 }, () => new Map());      // s -> Map(p -> len)
  let nl = 0, nr = 0, nc = 0, ns = 0;
  for (const [k, c] of cnt) {
    const a = Math.floor(k / K), b = k % K;
    const ka = kinds[a], kb = kinds[b];
    const len = Math.max(1, Math.round(c * grid.res));
    if (ka === 'land' && kb === 'land') {
      const isRiv = (riv.get(k) || 0) / c >= 0.35;
      const rec = { len, kind: isRiv ? ADJ.river : ADJ.land };
      landAdj[a].set(b, rec); landAdj[b].set(a, rec);
      nl++; if (isRiv) nr++;
    } else if (ka === 'land' && kb === 'sea') {
      coast[a].set(b - L, len); seaCoast[b - L].set(a, len); nc++;
    } else if (ka === 'sea' && kb === 'land') {
      coast[b].set(a - L, len); seaCoast[a - L].set(b, len); nc++;
    } else if (ka === 'sea' && kb === 'sea') {
      seaAdj[a - L].set(b - L, len); seaAdj[b - L].set(a - L, len); ns++;
    }
  }
  log(`sousednosti: souš ${nl} (z toho přes řeku ${nr}), pobřeží ${nc}, moře ${ns}`);

  // ---- průlivy: dva ostrovy/pevniny, mezi nimiž je ≤ ~10 km vody (okno ±2 px) ----
  const okLand = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (land[i] === 1 && provOf[i]) okLand[i] = 1;
  const { comp } = components(GW, GH, okLand);
  const pairs = new Map();
  const R = 1;
  for (let y = R; y < GH - R; y++) {
    for (let x = R; x < GW - R; x++) {
      const i = y * GW + x;
      if (land[i] !== 0 || dLand[i] > 2.2) continue;
      let first = 0, second = 0, c1 = -1;
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const j = i + dy * GW + dx;
          if (!okLand[j]) continue;
          const p = provOf[j];
          if (!first) { first = p; c1 = comp[j]; }
          else if (p !== first && comp[j] !== c1 && !second) second = p;
        }
      }
      if (first && second) {
        const lo = Math.min(first, second), hi = Math.max(first, second);
        const k = lo * K + hi;
        pairs.set(k, (pairs.get(k) || 0) + 1);
      }
    }
  }
  const straits = [];
  const nm = (p) => `${W.provName[p]} [${W.ownerTags[W.provOwner[p]]}]`;
  const skipSet = new Set(STRAIT_SKIP.map(([a, b]) => `${a}|${b}`));
  for (const [k, c] of pairs) {
    const a = Math.floor(k / K), b = k % K;
    if (c < 2 || landAdj[a].has(b)) continue;
    if (W.provOwner[a] !== W.provOwner[b]) continue;      // přes hranici jen ručně uvedené průlivy
    straits.push({ a, b, c });
  }
  // pár vynecháme, pokud jeho jména (v obou pořadích) leží na seznamu výjimek
  const kept = [];
  for (const s of straits) {
    const key = `${W.provName[s.a]}|${W.provName[s.b]}`, key2 = `${W.provName[s.b]}|${W.provName[s.a]}`;
    if (skipSet.has(key) || skipSet.has(key2)) continue;
    kept.push(s);
  }
  // ruční spojení (Velký Belt apod.): souřadnice → provincie
  const snapProv = (lon, lat) => {
    const [x, y] = grid.toPx(lon, lat);
    const s = nearest(GW, GH, x, y, 10, (i) => okLand[i] === 1);
    return s ? provOf[s.idx] : 0;
  };
  for (const [name, a, b] of STRAIT_EXTRA) {
    const pa = snapProv(a[0], a[1]), pb = snapProv(b[0], b[1]);
    if (!pa || !pb || pa === pb) { console.warn(`!! průliv ${name}: provincie nenalezeny (${pa}, ${pb})`); continue; }
    if (landAdj[pa].has(pb)) continue;
    if (!kept.some((s) => (s.a === pa && s.b === pb) || (s.a === pb && s.b === pa))) kept.push({ a: pa, b: pb, c: 0, name });
  }
  for (const s of kept) {
    const rec = { len: Math.max(1, s.c) * 2, kind: ADJ.strait, name: s.name };
    landAdj[s.a].set(s.b, rec); landAdj[s.b].set(s.a, rec);
  }
  log(`průlivová spojení: ${kept.length}${process.env.SHOW_STRAITS ? '\n' + kept.map((s) => `   ${nm(s.a)} ↔ ${nm(s.b)} (${s.c})`).join('\n') : ''}`);
  W.landAdj = landAdj; W.coast = coast; W.seaAdj = seaAdj; W.seaCoast = seaCoast; W.straits = kept;

  // izolované provincie (bez sousedů): upozornění
  const iso = [];
  for (let p = 1; p <= L; p++) if (!landAdj[p].size) iso.push(nm(p));
  if (iso.length) log(`  ostrovní provincie bez pozemního souseda: ${iso.length}${iso.length < 25 ? ' – ' + iso.join('; ') : ''}`);
}

// ---------------------------------------------------------------- přístavy
export function buildPorts(W, log) {
  const { grid, land, seaOf, provCities, provTerrain, kinds } = W;
  const { W: GW, H: GH } = grid;
  const L = W.nLand;
  const ports = [];   // [prov, sea, level]
  const portOf = new Int16Array(L + 1).fill(-1);
  const boost = new Map(PORT_BOOST);
  const known = new Set();
  for (let p = 1; p <= L; p++) for (const c of provCities[p]) known.add(c.name);
  const unknown = PORT_BOOST.filter(([n]) => !known.has(n)).map(([n]) => n);
  if (unknown.length) log(`  přístavy: města z PORT_BOOST nejsou v seznamu měst: ${unknown.join(', ')}`);
  for (let p = 1; p <= L; p++) {
    if (!provCities[p].length || !W.coast[p].size) continue;
    // nejvyšší úroveň přístavu mezi městy provincie (podle obyvatel nebo námořní základny)
    let c = null, lvl = 0;
    for (const ct of provCities[p]) {
      let l = ct.pop >= 1000 ? 4 : ct.pop >= 400 ? 3 : ct.pop >= 100 ? 2 : ct.pop >= 30 ? 1 : 0;
      const b = boost.get(ct.name) || 0;
      if (b) l = Math.max(l, b);
      if (l > lvl) { lvl = l; c = ct; }
    }
    if (!lvl) continue;
    // moře u města = nejbližší mořský pixel
    const s = nearest(GW, GH, c.x, c.y, 14, (i) => land[i] === 0 && seaOf[i] > 0);
    let sea = s ? seaOf[s.idx] : 0;
    if (!sea || !W.coast[p].has(sea)) {
      // nejdelší pobřeží provincie
      let best = 0, bl = -1;
      for (const [sid, len] of W.coast[p]) if (len > bl) { bl = len; best = sid; }
      sea = best;
    }
    if (!sea) continue;
    portOf[p] = ports.length;
    ports.push([p, sea, lvl]);
  }
  W.ports = ports; W.portOf = portOf;
  const by = {};
  for (const [p] of ports) { const t = W.ownerTags[W.provOwner[p]]; by[t] = (by[t] || 0) + 1; }
  log(`přístavy: ${ports.length} (${Object.entries(by).map(([t, n]) => `${t} ${n}`).join(', ')})`);
}

// ---------------------------------------------------------------- železnice
export function buildRails(W, log) {
  const { grid, landAdj, provTerrain, provUrban, info, provCities, provOwner, ownerTags } = W;
  const GW = grid.W;
  const L = W.nLand;
  const TF = { plains: 1, forest: 1.3, hills: 1.45, mountains: 2.6, marsh: 1.9, desert: 1.5 };
  const tf = (p) => (provUrban && provUrban[p] ? 0.9 : TF[TERRAIN[provTerrain[p]]]);
  const X = new Float32Array(L + 1), Y = new Float32Array(L + 1);
  for (let p = 1; p <= L; p++) { X[p] = info.bestI[p] % GW; Y[p] = (info.bestI[p] / GW) | 0; }
  const adj = Array.from({ length: L + 1 }, () => []);
  for (let p = 1; p <= L; p++) {
    for (const [q, rec] of landAdj[p]) {
      if (q < p) continue;
      let w = Math.hypot(X[p] - X[q], Y[p] - Y[q]) * ((tf(p) + tf(q)) / 2);
      if (rec.kind === 1) w *= 1.12;
      if (rec.kind === 2) w *= 5;
      if (provOwner[p] !== provOwner[q]) w *= 1.08;
      adj[p].push([q, w]); adj[q].push([p, w]);
    }
  }
  const fac = (p) => RAIL_FACTOR[ownerTags[provOwner[p]]] ?? -1;
  const hubs = [];
  const capSet = new Set(Object.values(W.capitalProv));
  for (let p = 1; p <= L; p++) {
    const c = provCities[p][0];
    if (fac(p) <= -3) continue;
    if ((c && c.pop >= 40) || capSet.has(p)) hubs.push({ p, pop: c ? c.pop : 0 });
  }
  hubs.sort((a, b) => b.pop - a.pop);
  const isHub = new Map(hubs.map((h, i) => [h.p, i]));

  const CAP = 340;
  const dist = new Float32Array(L + 1), prev = new Int32Array(L + 1);
  const heap = new MinHeap(1 << 15);
  const dijkstra = (src) => {
    dist.fill(Infinity); prev.fill(0);
    dist[src] = 0;
    heap.n = 0;
    heap.push(0, src);
    const reached = [];
    while (heap.n > 0) {
      const u = heap.popVal(), d = heap.lastKey;
      if (d > dist[u]) continue;
      if (d > CAP) break;
      reached.push(u);
      for (const [v, w] of adj[u]) {
        const nd = d + w;
        if (nd < dist[v]) { dist[v] = nd; prev[v] = u; heap.push(nd, v); }
      }
    }
    return reached;
  };
  const use = new Map();     // klíč hrany -> { lvl, n }
  const K = 4096;
  const addPath = (src, dst, strength) => {
    // prev[] platí pro poslední dijkstra(src)
    let v = dst;
    const lvl = strength >= 1000 ? 5 : strength >= 400 ? 4 : strength >= 150 ? 3 : strength >= 60 ? 2 : 1;
    while (v !== src && prev[v]) {
      const u = prev[v];
      const k = Math.min(u, v) * K + Math.max(u, v);
      const r = use.get(k) || { lvl: 0, n: 0 };
      r.lvl = Math.max(r.lvl, lvl); r.n++;
      use.set(k, r);
      v = u;
    }
  };
  let links = 0;
  const done = new Set();
  for (let h = 0; h < hubs.length; h++) {
    const H = hubs[h];
    const reached = dijkstra(H.p);
    const cand = reached.filter((q) => q !== H.p && isHub.has(q)).map((q) => ({ q, d: dist[q], rank: isHub.get(q) }));
    // rodič: nejbližší hub s větším/rovným významem (menší index)
    const bigger = cand.filter((c) => c.rank < h).sort((a, b) => a.d - b.d);
    const picks = [];
    if (bigger.length) picks.push(bigger[0]);
    // druhé spojení (smyčky v síti): druhý nejbližší hub libovolného významu
    if (H.pop >= 80) {
      const others = cand.filter((c) => !picks.includes(c)).sort((a, b) => a.d - b.d);
      if (others.length && others[0].d <= CAP * 0.7) picks.push(others[0]);
    }
    for (const c of picks) {
      const key = Math.min(H.p, c.q) * K + Math.max(H.p, c.q);
      if (done.has(key)) continue;
      done.add(key);
      addPath(H.p, c.q, Math.min(H.pop, hubs[c.rank].pop));
      links++;
    }
  }
  const rails = [];
  for (const [k, r] of use) {
    const a = Math.floor(k / K), b = k % K;
    let lvl = r.lvl + (r.n >= 6 ? 1 : 0);
    lvl = Math.min(5, lvl);
    lvl += Math.min(fac(a), fac(b));
    if (lvl < 1) { if (Math.min(fac(a), fac(b)) <= -3) continue; lvl = 1; }
    rails.push([a, b, Math.min(5, lvl)]);
  }
  rails.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  W.rails = rails; W.hubs = hubs.map((h) => h.p);
  const lv = [0, 0, 0, 0, 0, 0];
  for (const r of rails) lv[r[2]]++;
  log(`železnice: ${hubs.length} uzlů, ${links} spojení, ${rails.length} úseků (úrovně 1–5: ${lv.slice(1).join('/')})`);
}
