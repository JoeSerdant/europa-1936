// Krok 1: rastr zemí → vlastníci v r. 1936 → jezera → průlivy → úklid ostrůvků.
import { OWNERS, OWNER_OF, TRANSFERS, STRAITS, MIN_LAKE_KM2, MIN_ISLAND_KM2, ISLAND_KEEP, RES_KM, EAST_LIMIT_LON } from './config.js';
import { makeGrid, loadGeoJSON, polygonsOf, inWindow } from './grid.js';
import { fillRings, stampPolyline, components } from './raster.js';

// ostrovy a území, která na mapě nechceme (jsou mimo dějiště) – bod v lon/lat
export const DELETE_AT = [
  [-8.5, 71.0],   // Jan Mayen
  [19.0, 74.4],   // Medvědí ostrov
  [55.0, 72.0], [53.0, 71.0], [58.0, 71.0],   // Novaja Zemlja
  [49.0, 69.1], [60.0, 69.9],                  // Kolgujev, Vajgač
  [-15.4, 28.1], [-16.6, 28.3], [-13.9, 28.4], [-13.6, 29.0], [-17.9, 28.7], [-17.0, 28.1], [-16.3, 28.0], // Kanárské ostrovy
  [-16.9, 32.7], [-16.4, 32.6],                // Madeira
  [-25.5, 37.8], [-27.1, 38.6],                // Azory
];

export function buildOwners(W, log) {
  const grid = makeGrid();
  W.grid = grid;
  const { W: GW, H: GH } = grid;
  const N = GW * GH;
  log(`mřížka ${GW}×${GH} px (${(N / 1e6).toFixed(1)} M), ${RES_KM} km/px, rámec ${(GW * RES_KM).toFixed(0)}×${(GH * RES_KM).toFixed(0)} km`);

  // okno lon/lat, které rámec pokrývá (s rezervou)
  let lo0 = 1e9, la0 = 1e9, lo1 = -1e9, la1 = -1e9;
  for (let i = 0; i <= 40; i++) {
    for (const [px, py] of [[i * GW / 40, 0], [i * GW / 40, GH], [0, i * GH / 40], [GW, i * GH / 40]]) {
      const [lon, lat] = grid.toLonLat(px, py);
      lo0 = Math.min(lo0, lon); lo1 = Math.max(lo1, lon); la0 = Math.min(la0, lat); la1 = Math.max(la1, lat);
    }
  }
  const win = [lo0 - 1, la0 - 1, lo1 + 1, la1 + 1];
  log(`okno lon/lat ${win.map((v) => v.toFixed(1)).join(' ')}`);
  W.window = win;

  const ownerTags = ['', ...Object.keys(OWNERS)];
  const ownerNum = Object.fromEntries(ownerTags.map((t, i) => [t, i]));
  W.ownerTags = ownerTags;
  const land = new Uint8Array(N);      // 0 moře, 1 pevnina, 2 jezero
  const ownerIdx = new Uint8Array(N);  // 0 nic, 1.. vlastník, 255 prázdno
  const neId = new Uint8Array(N);      // číslo země v Natural Earth (pro převody)
  const moved = new Uint8Array(N);

  const countries = loadGeoJSON('ne_10m_admin_0_countries');
  const neNames = [''];
  for (const f of countries.features) {
    const name = f.properties.NAME;
    const parts = polygonsOf(f.geometry).filter((p) => inWindow(p.bbox, win));
    if (!parts.length) continue;
    const id = neNames.length;
    neNames.push(name);
    if (id > 254) throw new Error('moc zemí v okně');
    const tag = OWNER_OF[name];
    const own = tag ? ownerNum[tag] : 255;
    if (tag && own === undefined) throw new Error(`neznámý tag ${tag}`);
    for (const part of parts) {
      const rings = part.rings.map((r) => r.map(([lon, lat]) => grid.toPx(lon, lat)));
      fillRings(GW, GH, rings, (y, c0, c1) => {
        for (let x = c0, i = y * GW + c0; x < c1; x++, i++) { land[i] = 1; ownerIdx[i] = own; neId[i] = id; }
      });
    }
  }
  const neNum = Object.fromEntries(neNames.map((n, i) => [n, i]));
  log(`zemí v okně: ${neNames.length - 1}`);

  // převody na stav z r. 1936
  for (const t of TRANSFERS) {
    const fromIds = new Set(t.from.map((n) => neNum[n]).filter((v) => v !== undefined));
    if (!fromIds.size) { console.warn('převod: země nenalezena', t.from); continue; }
    const to = ownerNum[t.to];
    const rings = [t.ring.map(([lon, lat]) => grid.toPx(lon, lat))];
    let n = 0;
    fillRings(GW, GH, rings, (y, c0, c1) => {
      for (let x = c0, i = y * GW + c0; x < c1; x++, i++) {
        if (land[i] === 1 && !moved[i] && fromIds.has(neId[i])) { ownerIdx[i] = to; moved[i] = 1; n++; }
      }
    });
    if (!n) console.warn(`převod ${t.from} -> ${t.to}: žádný pixel`);
  }

  // východní okraj hrací plochy: vše východněji je prázdno (pevnina bez vlastníka)
  {
    const ring = [];
    for (let lat = 10; lat <= 84; lat += 1) ring.push(grid.toPx(EAST_LIMIT_LON, lat));
    ring.push(grid.toPx(150, 84), grid.toPx(150, 10));
    fillRings(GW, GH, [ring], (y, c0, c1) => {
      for (let x = c0, i = y * GW + c0; x < c1; x++, i++) if (land[i] === 1) { ownerIdx[i] = 255; }
    });
  }

  // jezera (velká) a průlivy = voda
  const lakes = loadGeoJSON('ne_10m_lakes');
  let nLakes = 0;
  for (const f of lakes.features) {
    const parts = polygonsOf(f.geometry).filter((p) => inWindow(p.bbox, win));
    for (const part of parts) {
      const rings = part.rings.map((r) => r.map(([lon, lat]) => grid.toPx(lon, lat)));
      // plocha v km² (hrubě): pixely * RES²
      let cnt = 0;
      const tmp = [];
      fillRings(GW, GH, rings, (y, c0, c1) => { for (let x = c0; x < c1; x++) { cnt++; tmp.push(y * GW + x); } });
      if (cnt * RES_KM * RES_KM < MIN_LAKE_KM2) continue;
      let hit = 0;
      for (const i of tmp) if (land[i] === 1) hit++;
      if (hit / Math.max(1, cnt) < 0.5) continue;   // jezero mimo pevninu (moře apod.)
      for (const i of tmp) if (land[i] === 1) { land[i] = 2; ownerIdx[i] = 0; }
      nLakes++;
    }
  }
  log(`jezer: ${nLakes}`);
  for (const [name, wkm, pts] of STRAITS) {
    const px = pts.map(([lon, lat]) => grid.toPx(lon, lat));
    stampPolyline(GW, GH, px, wkm / RES_KM, (x, y) => {
      const i = y * GW + x;
      if (land[i] === 1) { land[i] = 0; ownerIdx[i] = 0; }
    });
  }

  // vymazání ostrovů mimo dějiště + drobných ostrůvků
  const { comp, list } = components(GW, GH, land.map((v) => (v === 1 ? 1 : 0)));
  const del = new Set();
  for (const [lon, lat] of DELETE_AT) {
    const [px, py] = grid.toPx(lon, lat);
    const x = Math.round(px), y = Math.round(py);
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue;
      const c = comp[yy * GW + xx];
      if (c >= 0) del.add(c);
    }
  }
  const minPx = MIN_ISLAND_KM2 / (RES_KM * RES_KM);
  const keep = new Set();
  for (const [lon, lat] of ISLAND_KEEP) {
    const [px, py] = grid.toPx(lon, lat);
    const x = Math.round(px), y = Math.round(py);
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue;
      const c = comp[yy * GW + xx];
      if (c >= 0) keep.add(c);
    }
  }
  let removed = 0;
  for (const c of list) {
    if (del.has(c.id) || (c.size < minPx && !keep.has(c.id))) { c.drop = true; removed++; }
  }
  for (let i = 0; i < N; i++) {
    const c = comp[i];
    if (c >= 0 && list[c].drop) { land[i] = 0; ownerIdx[i] = 0; }
  }
  log(`odstraněno ostrovů/ostrůvků: ${removed}`);
  W.land = land; W.ownerIdx = ownerIdx; W.neId = neId; W.neNames = neNames;
}
