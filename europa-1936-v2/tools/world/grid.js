// Projekce a pixelová mřížka světa + načítání geodat Natural Earth.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoConicConformal } from 'd3-geo';
import { RES_KM, PROJECTION, FRAME_POINTS, FRAME_PAD_KM } from './config.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const CACHE = path.join(ROOT, 'tools/cache');

export function makeGrid() {
  const proj = geoConicConformal()
    .rotate([-PROJECTION.centralMeridian, 0])
    .parallels(PROJECTION.parallels)
    .scale(6371)            // výstup v km
    .translate([0, 0]);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of FRAME_POINTS) {
    const [x, y] = proj(p);
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  x0 -= FRAME_PAD_KM; y0 -= FRAME_PAD_KM; x1 += FRAME_PAD_KM; y1 += FRAME_PAD_KM;
  const W = Math.ceil((x1 - x0) / RES_KM), H = Math.ceil((y1 - y0) / RES_KM);
  const toPx = (lon, lat) => {
    const p = proj([lon, lat]);
    return [(p[0] - x0) / RES_KM, (p[1] - y0) / RES_KM];
  };
  const toLonLat = (px, py) => proj.invert([px * RES_KM + x0, py * RES_KM + y0]);
  // měřítko: km na pixel v daném místě (vůči délce 1° rovnoběžky) – konformní projekce, takže izotropní
  const kmPerPx = (px, py) => {
    const [lon, lat] = toLonLat(px, py);
    const a = proj([lon, lat]), b = proj([lon + 0.1, lat]);
    const proj_km = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const real_km = 6371 * Math.cos((lat * Math.PI) / 180) * ((0.1 * Math.PI) / 180);
    return RES_KM * (real_km / proj_km);
  };
  // hrubá mřížka měřítka (km² na pixel), aby se plochy nepočítaly pro každý pixel zvlášť
  const SG = 32;
  const sw = Math.ceil(W / SG) + 1, sh = Math.ceil(H / SG) + 1;
  const sc = new Float32Array(sw * sh);
  for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) {
    const k = kmPerPx(Math.min(W - 1, i * SG), Math.min(H - 1, j * SG));
    sc[j * sw + i] = k * k;
  }
  const km2At = (x, y) => sc[Math.min(sh - 1, Math.round(y / SG)) * sw + Math.min(sw - 1, Math.round(x / SG))];
  return { proj, W, H, x0, y0, res: RES_KM, toPx, toLonLat, kmPerPx, km2At };
}

export function loadGeoJSON(name) {
  return JSON.parse(fs.readFileSync(path.join(CACHE, `${name}.geojson`), 'utf8'));
}

// MultiPolygon/Polygon -> pole polygonů [[ring, hole...], ...] (lon/lat), s bboxem
export function polygonsOf(geometry) {
  if (!geometry) return [];
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  return polys.map((poly) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of poly[0]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { rings: poly, bbox: [x0, y0, x1, y1] };
  });
}

// jen polygony, jejichž bbox zasáhne okno lon/lat
export function inWindow(bbox, win) {
  return !(bbox[2] < win[0] || bbox[0] > win[2] || bbox[3] < win[1] || bbox[1] > win[3]);
}
