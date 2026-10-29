// Geometrické pomůcky pro generátor mapy.
// Formáty (jako polygon-clipping): Ring = [[x,y],...], Polygon = [outer, ...holes], MultiPolygon = [Polygon,...]

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ringSignedArea(r) {
  let s = 0;
  for (let i = 0, n = r.length, j = n - 1; i < n; j = i++) {
    s += r[j][0] * r[i][1] - r[i][0] * r[j][1];
  }
  return s / 2;
}

export function polyArea(poly) {
  let a = Math.abs(ringSignedArea(poly[0]));
  for (let i = 1; i < poly.length; i++) a -= Math.abs(ringSignedArea(poly[i]));
  return a;
}

export function mpArea(mp) {
  let a = 0;
  for (const p of mp) a += polyArea(p);
  return a;
}

function ringCentroidSigned(r) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, n = r.length, j = n - 1; i < n; j = i++) {
    const cross = r[j][0] * r[i][1] - r[i][0] * r[j][1];
    a += cross;
    cx += (r[j][0] + r[i][0]) * cross;
    cy += (r[j][1] + r[i][1]) * cross;
  }
  a /= 2;
  if (Math.abs(a) < 1e-12) return { a: 0, cx: r[0][0], cy: r[0][1] };
  return { a, cx: cx / (6 * a), cy: cy / (6 * a) };
}

export function mpCentroid(mp) {
  let A = 0, X = 0, Y = 0;
  for (const poly of mp) {
    poly.forEach((ring, idx) => {
      const { a, cx, cy } = ringCentroidSigned(ring);
      const w = Math.abs(a) * (idx === 0 ? 1 : -1);
      A += w; X += cx * w; Y += cy * w;
    });
  }
  if (Math.abs(A) < 1e-12) return mp[0][0][0];
  return [X / A, Y / A];
}

export function pointInRing(pt, ring) {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pointInPoly(pt, poly) {
  if (!pointInRing(pt, poly[0])) return false;
  for (let i = 1; i < poly.length; i++) if (pointInRing(pt, poly[i])) return false;
  return true;
}

export function pointInMp(pt, mp) {
  for (const p of mp) if (pointInPoly(pt, p)) return true;
  return false;
}

export function mpBBox(mp) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const poly of mp) {
    for (const [x, y] of poly[0]) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return [x0, y0, x1, y1];
}

export function distPointSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const x = a[0] + t * dx, y = a[1] + t * dy;
  return Math.hypot(p[0] - x, p[1] - y);
}

export function samplePointsIn(mp, n, rng, maxTries = 4000) {
  const [x0, y0, x1, y1] = mpBBox(mp);
  const pts = [];
  let tries = 0;
  while (pts.length < n && tries++ < maxTries) {
    const p = [x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0)];
    if (pointInMp(p, mp)) pts.push(p);
  }
  return pts;
}

// Přibližný "pól nepřístupnosti": bod uvnitř, nejdál od hranice (pro umístění popisků).
export function labelPoint(mp, rng, samples = 350) {
  const edges = [];
  for (const poly of mp) for (const ring of poly) {
    for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) edges.push([ring[j], ring[i]]);
  }
  const pts = samplePointsIn(mp, samples, rng, samples * 20);
  if (!pts.length) return mpCentroid(mp);
  const c = mpCentroid(mp);
  if (pointInMp(c, mp)) pts.push(c);
  let best = pts[0], bestD = -1;
  for (const p of pts) {
    let d = Infinity;
    for (const [a, b] of edges) {
      const dd = distPointSeg(p, a, b);
      if (dd < d) d = dd;
      if (d < bestD) break;
    }
    if (d > bestD) { bestD = d; best = p; }
  }
  return best;
}

export function openRing(r) {
  const a = r[0], b = r[r.length - 1];
  return a[0] === b[0] && a[1] === b[1] ? r.slice(0, -1) : r;
}

const fmt = (v, d) => {
  const s = v.toFixed(d);
  return s.indexOf('.') === -1 ? s : s.replace(/\.?0+$/, '');
};

export function ringToPath(ring, digits = 1) {
  const pts = [];
  let last = '';
  for (const [x, y] of openRing(ring)) {
    const key = fmt(x, digits) + ' ' + fmt(y, digits);
    if (key !== last) { pts.push(key); last = key; }
  }
  if (pts.length > 1 && pts[0] === pts[pts.length - 1]) pts.pop();
  if (pts.length < 3) return '';
  return 'M' + pts.join('L') + 'Z';
}

export function mpToPath(mp, digits = 1) {
  let d = '';
  for (const poly of mp) for (const ring of poly) d += ringToPath(ring, digits);
  return d;
}
