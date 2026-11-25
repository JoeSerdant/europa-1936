// Projekce a pixelová mřížka světa + načítání geodat Natural Earth.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoMercator } from 'd3-geo';
import { PROJECTION } from './config.js';

const RAD = Math.PI / 180;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const CACHE = path.join(ROOT, 'tools/cache');

/**
 * Mřížka celého světa (W1, „Dark Times“): Mercatorova projekce (konformní – tvary jako dřív), mapa se vodorovně opakuje (šev v Pacifiku
 * na poledníku `PROJECTION.seam`, jen oceán). Pixel má na rovníku `res` km a ve šířce φ `res · cos φ` km; šířka mapy je přesně celý obvod Země,
 * takže sloupec W navazuje na sloupec 0. `km2At` / `kmAt` dávají skutečné měřítko pixelu podle řádku.
 */
export function makeGrid() {
  const R = 6371;
  const { seam, latN, latS, refLat, refKm } = PROJECTION;
  const W = Math.round((2 * Math.PI * R * Math.cos(refLat * RAD)) / refKm);
  const res = (2 * Math.PI * R) / W;                       // km na pixel na rovníku (přesně, aby šev navazoval)
  const proj = geoMercator().rotate([-(seam + 180), 0]).scale(R).translate([0, 0]);
  const x0 = -Math.PI * R, y0 = proj([seam + 180, latN])[1];
  const H = Math.ceil((proj([seam + 180, latS])[1] - y0) / res);
  const toPx = (lon, lat) => {
    const p = proj([lon, Math.max(-85, Math.min(85, lat))]);
    return [(p[0] - x0) / res, (p[1] - y0) / res];
  };
  const toLonLat = (px, py) => proj.invert([px * res + x0, py * res + y0]);
  const latOfRow = (py) => toLonLat(0, py)[1];
  const cosRow = new Float32Array(H + 1);
  for (let y = 0; y <= H; y++) cosRow[y] = Math.cos(latOfRow(y + 0.5) * RAD);
  const rowOf = (y) => Math.max(0, Math.min(H, Math.round(y)));
  const kmAt = (y) => res * cosRow[rowOf(y)];             // km na pixel v řádku y (izotropně)
  const kmPerPx = (px, py) => kmAt(py);
  const km2At = (x, y) => { const k = kmAt(y); return k * k; };
  return { proj, W, H, x0, y0, res, wrap: true, seam, toPx, toLonLat, kmAt, kmPerPx, km2At, latOfRow };
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

// jen polygony, jejichž bbox zasáhne okno lon/lat; polygon, který přetíná šev mapy (W1), se vynechá (vyplnil by pás přes celou mapu)
export function inWindow(bbox, win) {
  if (bbox[0] < PROJECTION.seam && bbox[2] > PROJECTION.seam && bbox[2] - bbox[0] < 300) return false;
  return !(bbox[2] < win[0] || bbox[0] > win[2] || bbox[3] < win[1] || bbox[1] > win[3]);
}
