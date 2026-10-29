// Geometrie mapy: okruhy oblastí (Float32Array), obálky, prostorový rastr pro hledání oblasti pod kurzorem a Path2D (jen v prohlížeči).
import { decodeArcs, ringToPoints } from '../../engine/worldCore.js';

const CELL = 64;      // velikost buňky prostorového rastru ve světových pixelech

export function buildGeometry(world) {
  const raw = world.raw;
  const arcs = decodeArcs(raw);
  const n = world.nLabel;
  const polys = new Array(n).fill(null);
  const bbox = new Float32Array(n * 4);          // x0, y0, x1, y1
  const L = world.L, S = world.S;
  if (raw.rings[0] && raw.rings[0].length) polys[0] = raw.rings[0].map((r) => ringToPoints(arcs, r));   // prázdná pevnina
  for (let l = 1; l < n; l++) {
    const rs = raw.rings[l];
    if (!rs || !rs.length) continue;
    polys[l] = rs.map((r) => ringToPoints(arcs, r));
    let b;
    if (l <= L) b = raw.land[l].b; else if (l <= L + S) b = raw.sea[l - L].b; else b = raw.lakes[l - L - S - 1].b;
    bbox[l * 4] = b[0]; bbox[l * 4 + 1] = b[1]; bbox[l * 4 + 2] = b[2]; bbox[l * 4 + 3] = b[3];
  }
  // prostorový rastr: buňka → štítky, jejichž obálka ji protíná
  const gw = Math.ceil(raw.frame.w / CELL), gh = Math.ceil(raw.frame.h / CELL);
  const cells = Array.from({ length: gw * gh }, () => []);
  for (let l = 1; l < n; l++) {
    if (!polys[l]) continue;
    const x0 = Math.max(0, Math.floor(bbox[l * 4] / CELL)), x1 = Math.min(gw - 1, Math.floor(bbox[l * 4 + 2] / CELL));
    const y0 = Math.max(0, Math.floor(bbox[l * 4 + 1] / CELL)), y1 = Math.min(gh - 1, Math.floor(bbox[l * 4 + 3] / CELL));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cells[y * gw + x].push(l);
  }
  const g = { arcs, polys, bbox, gw, gh, cell: CELL, cells, world, pathCache: new Map() };
  g.pick = (x, y) => pickLabel(g, x, y);
  return g;
}

function inside(pts, x, y) {
  let c = false;
  const n = pts.length >> 1;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[2 * i], yi = pts[2 * i + 1], xj = pts[2 * j], yj = pts[2 * j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Štítek oblasti (provincie / moře / jezero) pod světovým bodem, nebo 0 (prázdno). */
export function pickLabel(g, x, y) {
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  if (cx < 0 || cy < 0 || cx >= g.gw || cy >= g.gh) return 0;
  for (const l of g.cells[cy * g.gw + cx]) {
    const b = g.bbox;
    if (x < b[l * 4] || x > b[l * 4 + 2] || y < b[l * 4 + 1] || y > b[l * 4 + 3]) continue;
    let c = false;
    for (const ring of g.polys[l]) if (inside(ring, x, y)) c = !c;
    if (c) return l;
  }
  return 0;
}

/** Path2D oblasti (evenodd se použije při vykreslení). Jen v prohlížeči. */
export function labelPath(g, l) {
  let p = g.pathCache.get(l);
  if (p) return p;
  p = new Path2D();
  for (const ring of g.polys[l]) {
    p.moveTo(ring[0], ring[1]);
    for (let i = 2; i < ring.length; i += 2) p.lineTo(ring[i], ring[i + 1]);
    p.closePath();
  }
  g.pathCache.set(l, p);
  return p;
}

/** Jeden Path2D ze seznamu oblouků (otevřené čáry). Jen v prohlížeči. */
export function arcsPath(g, indices) {
  const p = new Path2D();
  for (const i of indices) {
    const pts = g.arcs[i].pts;
    p.moveTo(pts[0], pts[1]);
    for (let k = 2; k < pts.length; k += 2) p.lineTo(pts[k], pts[k + 1]);
  }
  return p;
}
