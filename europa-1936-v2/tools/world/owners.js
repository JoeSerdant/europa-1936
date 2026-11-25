// Krok 1: rastr zemí → vlastníci v r. 1936 → jezera → průlivy → úklid ostrůvků.
import { OWNERS, OWNER_OF, TRANSFERS, STRAITS, MIN_LAKE_KM2, MIN_ISLAND_KM2, MIN_ISLAND_FAR_KM2, ISLAND_KEEP, FORCE_ISLANDS, inOldFrame } from './config.js';
import { makeGrid, loadGeoJSON, polygonsOf, inWindow } from './grid.js';
import { fillRings, stampPolyline, components } from './raster.js';

// ostrovy a území, která na mapě nechceme (jsou mimo dějiště) – bod v lon/lat
export const DELETE_AT = [
  [-8.5, 71.0],   // Jan Mayen
  [19.0, 74.4],   // Medvědí ostrov
  [-170.3, 63.4], // ostrov sv. Vavřince (leží na švu mapy)
];

export function buildOwners(W, log) {
  const grid = makeGrid();
  W.grid = grid;
  const { W: GW, H: GH } = grid;
  const N = GW * GH;
  log(`mřížka ${GW}×${GH} px (${(N / 1e6).toFixed(1)} M), na rovníku ${grid.res.toFixed(2)} km/px, v 50° ${grid.kmAt(grid.toPx(0, 50)[1]).toFixed(2)} km/px`);

  const win = [-181, -90, 181, 90];   // W1: celý svět
  log(`okno lon/lat ${win.map((v) => v.toFixed(1)).join(' ')}`);
  W.window = win;

  const ownerTags = ['', ...Object.keys(OWNERS)];
  const ownerNum = Object.fromEntries(ownerTags.map((t, i) => [t, i]));
  W.ownerTags = ownerTags;
  const land = new Uint8Array(N);      // 0 moře, 1 pevnina, 2 jezero
  const ownerIdx = new Uint8Array(N);  // 0 nic, 1.. vlastník, 255 prázdno
  const neId = new Uint16Array(N);     // číslo země v Natural Earth (pro převody)
  const moved = new Uint8Array(N);

  const countries = loadGeoJSON('ne_10m_admin_0_countries');
  const neNames = [''];
  for (const f of countries.features) {
    const name = f.properties.NAME;
    const parts = polygonsOf(f.geometry).filter((p) => inWindow(p.bbox, win));
    if (!parts.length) continue;
    const id = neNames.length;
    neNames.push(name);
    
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

  // země bez vlastníka v r. 1936 (chybí v OWNER_OF) – upozornění
  { const miss = neNames.filter((n) => n && !OWNER_OF[n]); if (miss.length) log(`!! země bez vlastníka (prázdno): ${miss.join(', ')}`); }

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
      let km2 = 0;
      fillRings(GW, GH, rings, (y, c0, c1) => { const a = grid.km2At(0, y); for (let x = c0; x < c1; x++) { cnt++; km2 += a; tmp.push(y * GW + x); } });
      if (km2 < MIN_LAKE_KM2) continue;
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
    stampPolyline(GW, GH, px, wkm / grid.kmAt(px[0][1]), (x, y) => {
      const i = y * GW + x;
      if (land[i] === 1) { land[i] = 0; ownerIdx[i] = 0; }
    });
  }

  // W1: vnitrozemská voda oddělená od oceánu (jezera vyříznutá z hranic států, ústí řek) → jezero; velké uzavřené moře (Kaspik) zůstává mořem
  {
    const wat = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (land[i] === 0) wat[i] = 1;
    const { comp: wc, list: wl } = components(GW, GH, wat);
    const km2 = (c) => c.size * grid.km2At(0, c.cy);
    let ocean = null;
    for (const c of wl) if (!ocean || c.size > ocean.size) ocean = c;
    const toLake = new Set(wl.filter((c) => c !== ocean && km2(c) < 300000).map((c) => c.id));
    let px = 0;
    for (let i = 0; i < N; i++) if (wc[i] >= 0 && toLake.has(wc[i])) { land[i] = 2; ownerIdx[i] = 0; px++; }
    log(`vnitrozemská voda → jezera: ${toLake.size} ploch (${px} px)`);
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
  const keep = new Set();
  for (const [lon, lat] of [...ISLAND_KEEP, ...FORCE_ISLANDS.map((f) => [f[1], f[2]])]) {
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
    if (del.has(c.id) || (c.size * grid.km2At(0, c.cy) < (inOldFrame(...grid.toLonLat(c.cx, c.cy)) ? MIN_ISLAND_KM2 : MIN_ISLAND_FAR_KM2) && !keep.has(c.id))) { c.drop = true; removed++; }
  }
  for (let i = 0; i < N; i++) {
    const c = comp[i];
    if (c >= 0 && list[c].drop) { land[i] = 0; ownerIdx[i] = 0; }
  }
  log(`odstraněno ostrovů/ostrůvků: ${removed}`);
  // W1: strategické ostrůvky – vyrazit malý kotouč pevniny s daným vlastníkem (poloměr 0 = jen ponechat, ostrov je dost velký)
  let forced = 0;
  for (const [name, lon, lat, tag, r] of FORCE_ISLANDS) {
    if (!r) continue;
    const [px, py] = grid.toPx(lon, lat);
    const own = ownerNum[tag];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + 0.5) continue;
      const x = Math.round(px) + dx, y = Math.round(py) + dy;
      if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
      const i = y * GW + x;
      if (land[i] !== 2) { land[i] = 1; ownerIdx[i] = own; forced++; }
    }
  }
  log(`vynucené ostrůvky: ${FORCE_ISLANDS.filter((f) => f[4]).length} (${forced} px)`);
  W.land = land; W.ownerIdx = ownerIdx; W.neId = neId; W.neNames = neNames;
}
