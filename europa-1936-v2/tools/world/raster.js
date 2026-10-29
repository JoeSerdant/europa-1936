// Rastrové pomůcky generátoru: výplň polygonů, tlusté čáry, šum, halda, Dijkstrův růst oblastí, komponenty, vzdálenosti.

// ---- výplň polygonu (sudo-liché pravidlo) --------------------------------------------------
// rings: pole okruhů [[x,y],...] v pixelových souřadnicích (float). span(y, c0, c1) dostane sloupce c0..c1-1,
// jejichž střed (c+0.5) leží uvnitř.
export function fillRings(W, H, rings, span) {
  const rows = new Map();
  for (const r of rings) {
    const n = r.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      let x0 = r[j][0], y0 = r[j][1], x1 = r[i][0], y1 = r[i][1];
      if (y0 === y1) continue;
      if (y0 > y1) { const tx = x0, ty = y0; x0 = x1; y0 = y1; x1 = tx; y1 = ty; }
      const rs = Math.max(0, Math.ceil(y0 - 0.5));
      const re = Math.min(H - 1, Math.ceil(y1 - 0.5) - 1);
      if (re < rs) continue;
      const k = (x1 - x0) / (y1 - y0);
      for (let y = rs; y <= re; y++) {
        let arr = rows.get(y);
        if (!arr) { arr = []; rows.set(y, arr); }
        arr.push(x0 + (y + 0.5 - y0) * k);
      }
    }
  }
  for (const [y, xs] of rows) {
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.ceil(xs[k] - 0.5));
      const c1 = Math.min(W, Math.ceil(xs[k + 1] - 0.5));
      if (c1 > c0) span(y, c0, c1);
    }
  }
}

// ---- tlustá lomená čára (pixely do vzdálenosti w/2 od úsečky) ----------------------------------
export function stampPolyline(W, H, pts, widthPx, plot) {
  const r = widthPx / 2;
  for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1];
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r - 1)), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + r + 1));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - r - 1)), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + r + 1));
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        let t = ((px - ax) * dx + (py - ay) * dy) / l2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const qx = ax + t * dx - px, qy = ay + t * dy - py;
        if (qx * qx + qy * qy <= r * r) plot(x, y);
      }
    }
  }
}

// ---- tenká čára (1 px) -----------------------------------------------------------------------------
export function lineCells(ax, ay, bx, by, plot) {
  let x0 = Math.floor(ax), y0 = Math.floor(ay);
  const x1 = Math.floor(bx), y1 = Math.floor(by);
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    plot(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

// ---- šum -----------------------------------------------------------------------------------------------
function hash2(ix, iy, seed) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function smooth(t) { return t * t * (3 - 2 * t); }
export function valueNoise(x, y, seed = 1) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smooth(x - ix), fy = smooth(y - iy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
export function fbm(x, y, seed = 1, oct = 4) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let o = 0; o < oct; o++) {
    s += amp * valueNoise(x * f, y * f, seed + o * 17);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return s / norm;
}

// ---- halda (min) ---------------------------------------------------------------------------------------
export class MinHeap {
  constructor(cap = 1 << 20) {
    this.k = new Float32Array(cap);
    this.v = new Int32Array(cap);
    this.n = 0;
  }
  push(key, val) {
    if (this.n === this.k.length) {
      const nk = new Float32Array(this.n * 2); nk.set(this.k); this.k = nk;
      const nv = new Int32Array(this.n * 2); nv.set(this.v); this.v = nv;
    }
    let i = this.n++;
    const k = this.k, v = this.v;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  }
  popVal() { // vrací hodnotu, klíč uloží do this.lastKey
    const k = this.k, v = this.v;
    const rv = v[0];
    this.lastKey = k[0];
    const n = --this.n;
    if (n > 0) {
      const key = k[n], val = v[n];
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && k[c + 1] < k[c]) c++;
        if (k[c] >= key) break;
        k[i] = k[c]; v[i] = v[c]; i = c;
      }
      k[i] = key; v[i] = val;
    }
    return rv;
  }
}

// ---- Dijkstrův růst oblastí -------------------------------------------------------------------------------
// group: Uint16Array – pixel smí obsadit jen semínko se stejnou skupinou (0 = neprůchozí)
// seeds: [{ idx, label }] (skupina semínka = group[idx])
// cost: Float32Array násobitel kroku (>= 0.3), nebo null
// vrací { lab: Uint16Array (0 = neobsazeno), dist: Float32Array }
export function growRegions(W, H, group, seeds, cost = null, maxDist = Infinity, mult = null) {
  const N = W * H;
  const lab = new Uint16Array(N);
  const dist = new Float32Array(N).fill(Infinity);
  const heap = new MinHeap(1 << 20);
  for (const s of seeds) {
    if (group[s.idx] === 0) continue;
    dist[s.idx] = 0;
    heap.push(0, s.idx);
    lab[s.idx] = s.label; // předběžně; potvrdí se při vyjmutí
  }
  const done = new Uint8Array(N);
  const D8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  const owner = new Uint16Array(N); // kdo pixel zatím nejlépe nabízí
  for (const s of seeds) owner[s.idx] = s.label;
  while (heap.n > 0) {
    const i = heap.popVal();
    const d = heap.lastKey;
    if (done[i]) continue;
    if (d > dist[i]) continue;
    done[i] = 1;
    lab[i] = owner[i];
    if (d > maxDist) continue;
    const x = i % W, y = (i / W) | 0;
    const g = group[i];
    const ci = cost ? cost[i] : 1;
    const mi = mult ? mult[owner[i]] : 1;
    for (let k = 0; k < 8; k++) {
      const nx = x + D8[k][0], ny = y + D8[k][1];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (done[j] || group[j] !== g) continue;
      const step = (D8[k][0] !== 0 && D8[k][1] !== 0 ? 1.41421356 : 1) * (cost ? 0.5 * (ci + cost[j]) : 1) * mi;
      const nd = d + step;
      if (nd < dist[j]) { dist[j] = nd; owner[j] = owner[i]; heap.push(nd, j); }
    }
  }
  return { lab, dist };
}

// ---- souvislé komponenty (8-okolí) pixelů se stejnou hodnotou `key[i]` (0 = přeskočit) --------------------------
export function components(W, H, key) {
  const N = W * H;
  const comp = new Int32Array(N).fill(-1);
  const queue = new Int32Array(N);
  const list = []; // { id, key, size, sx, sy, first }
  for (let s = 0; s < N; s++) {
    if (key[s] === 0 || comp[s] >= 0) continue;
    const id = list.length;
    let qh = 0, qt = 0;
    queue[qt++] = s; comp[s] = id;
    let size = 0, sx = 0, sy = 0;
    const kv = key[s];
    while (qh < qt) {
      const i = queue[qh++];
      const x = i % W, y = (i / W) | 0;
      size++; sx += x; sy += y;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= W || (dx === 0 && dy === 0)) continue;
          const j = ny * W + nx;
          if (comp[j] >= 0 || key[j] !== kv) continue;
          comp[j] = id; queue[qt++] = j;
        }
      }
    }
    list.push({ id, key: kv, size, cx: sx / size, cy: sy / size, first: s });
  }
  return { comp, list };
}

// ---- vzdálenost (v px) od nejbližšího pixelu s jinou hodnotou `lab` – dvouprůchodová chamfer 3-4 ---------------------
export function boundaryDistance(W, H, lab) {
  const N = W * H;
  const INF = 1e9;
  const d = new Float32Array(N).fill(INF);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, v = lab[i];
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || lab[i - 1] !== v || lab[i + 1] !== v || lab[i - W] !== v || lab[i + W] !== v) d[i] = 0.5;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let m = d[i];
      if (x > 0) m = Math.min(m, d[i - 1] + 1);
      if (y > 0) {
        m = Math.min(m, d[i - W] + 1);
        if (x > 0) m = Math.min(m, d[i - W - 1] + 1.4142);
        if (x < W - 1) m = Math.min(m, d[i - W + 1] + 1.4142);
      }
      d[i] = m;
    }
  }
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      let m = d[i];
      if (x < W - 1) m = Math.min(m, d[i + 1] + 1);
      if (y < H - 1) {
        m = Math.min(m, d[i + W] + 1);
        if (x < W - 1) m = Math.min(m, d[i + W + 1] + 1.4142);
        if (x > 0) m = Math.min(m, d[i + W - 1] + 1.4142);
      }
      d[i] = m;
    }
  }
  return d;
}

// ---- pole „ceny“ pohybu pro zvlnění hranic oblastí --------------------------------------------------------------------
// scale = vlnová délka šumu v px, lo..hi = rozsah ceny kroku, contrast zesílí kontrast šumu (fbm má jinak malý rozptyl)
export function noiseCost(W, H, { scale = 40, seed = 1, lo = 0.4, hi = 2.4, contrast = 3, oct = 3, extra = null }) {
  const c = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let t = (fbm(x / scale, y / scale, seed, oct) - 0.5) * contrast + 0.5;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const i = y * W + x;
      c[i] = lo + (hi - lo) * t + (extra ? extra[i] : 0);
    }
  }
  return c;
}
