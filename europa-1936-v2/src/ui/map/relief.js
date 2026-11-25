// Reliéf a hloubka moře (M91): vlastní kresba mapy odvozená jen z dat světa – terén provincií dá výšku, šum vrásnění a z výšky se spočítá
// stínování (světlo od severozápadu). Moře se barví podle vzdálenosti od pobřeží (mělčiny světlejší, hlubiny tmavší). Výsledkem jsou dva obrázky
// v nízkém rozlišení (`RELIEF_RES` pixelů světa na buňku), které renderer kreslí do dlaždic (reliéf v režimu „soft-light“ přes barvy zemí, moře jako podklad).
// Čisté výpočty (šum, rozmazání, stínování, vzdálenost, barva moře) jsou bez DOM a testují se v Node; `buildRelief` potřebuje prohlížeč (canvas, Path2D).
import { labelPath } from './geometry.js';

export const RELIEF_RES = 4;     // pixelů světa na buňku rastru (W1: celý svět – hrubší, aby se reliéf postavil rychle)

/** Výška a členitost podle terénu (index = kód terénu: rovina, les, pahorkatina, hory, bažiny, poušť, město). Vlastní hodnoty. */
export const TERRAIN_RELIEF = [
  { h: 0.12, amp: 0.03 },   // rovina
  { h: 0.2, amp: 0.06 },    // les
  { h: 0.42, amp: 0.28 },   // pahorkatina
  { h: 0.9, amp: 0.72 },    // hory
  { h: 0.04, amp: 0.02 },   // bažiny
  { h: 0.16, amp: 0.1 },    // poušť
  { h: 0.12, amp: 0.03 },   // město
];

/** Celočíselný hash dvou souřadnic → 0–1 (deterministický, bez Math.random). */
export function hash2(x, y, seed = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t) => t * t * (3 - 2 * t);
/** Hodnotový šum 0–1 s hladkou interpolací mezi uzly celočíselné mřížky. */
export function valueNoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = fade(x - xi), fy = fade(y - yi);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Hřebenový šum (vrásnění pohoří): `octaves` vrstev, výsledek 0–1. */
export function ridged(x, y, octaves = 3, seed = 7) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(valueNoise(x * f, y * f, seed + i) * 2 - 1);
    s += n * n * amp; norm += amp; amp *= 0.5; f *= 2.03;
  }
  return s / norm;
}

/** Oddělitelné krabicové rozmazání pole `src` (šířka `w`, výška `h`) s poloměrem `r`; dvakrát po sobě ≈ gaussovské. Vrací nové pole. */
export function boxBlur(src, w, h, r) {
  if (r < 1) return Float32Array.from(src);
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), k = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    for (let i = -r; i <= r; i++) acc += src[row + Math.min(w - 1, Math.max(0, i))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc * k;
      acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let i = -r; i <= r; i++) acc += tmp[Math.min(h - 1, Math.max(0, i)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc * k;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/**
 * Stínování z výšky (0–1): světlo od severozápadu, `z` = převýšení. Vrací šedou 0–255, kde 128 je rovina (v režimu „soft-light“ beze změny barvy),
 * svah ke světlu je světlejší, odvrácený tmavší; `gain` = kontrast.
 */
export function hillshade(height, w, h, z = 10, gain = 150, mask = null) {
  const out = new Uint8ClampedArray(w * h), raw = new Float32Array(w * h);
  const lx = -0.5, ly = -0.5, lz = 0.7071, flat = lz;   // jednotkový vektor ke světlu (azimut 315°, výška 45°)
  let sum = 0, cnt = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const dx = (height[y * w + Math.min(w - 1, x + 1)] - height[y * w + Math.max(0, x - 1)]) * z * 0.5;
      const dy = (height[Math.min(h - 1, y + 1) * w + x] - height[Math.max(0, y - 1) * w + x]) * z * 0.5;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      raw[i] = (-dx * lx - dy * ly + lz) * inv - flat;
      if (!mask || mask[i]) { sum += raw[i]; cnt++; }
    }
  }
  // průměrný jas se vyrovná na neutrální šedou: stínování jen modeluje tvary, mapu jako celek neztmavuje
  const mean = cnt ? sum / cnt : 0;
  for (let i = 0; i < w * h; i++) out[i] = 128 + (raw[i] - mean) * (raw[i] > mean ? gain : gain * 0.8);
  return out;
}

/** Vzdálenost každé buňky k nejbližší buňce pevniny (`mask[i]` = 1) v buňkách – dvouprůchodová zkosená metrika (chamfer 3-4). */
export function distanceToLand(mask, w, h) {
  const INF = 1e9, d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = mask[i] ? 0 : INF;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? INF : d[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4);
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4);
  }
  for (let i = 0; i < w * h; i++) d[i] = d[i] >= INF ? INF : d[i] / 3;
  return d;
}

const SEA_STOPS = [   // vzdálenost od pobřeží v kilometrech → barva (mělčina u břehu, šelf, hlubina)
  [0, [64, 112, 138]],
  [12, [44, 88, 116]],
  [60, [30, 66, 92]],
  [180, [22, 52, 76]],
  [420, [15, 38, 58]],
];
/** Barva moře [r, g, b] ve vzdálenosti `km` od pobřeží; `n` (0–1) = jemné vlnění. */
export function seaColor(km, n = 0.5) {
  let a = SEA_STOPS[0], b = SEA_STOPS[SEA_STOPS.length - 1];
  for (let i = 1; i < SEA_STOPS.length; i++) if (km <= SEA_STOPS[i][0]) { a = SEA_STOPS[i - 1]; b = SEA_STOPS[i]; break; }
  const t = km >= b[0] ? 1 : fade(Math.max(0, (km - a[0]) / Math.max(1e-6, b[0] - a[0])));
  const v = 1 + (n - 0.5) * 0.08;
  return [0, 1, 2].map((k) => Math.round((a[1][k] + (b[1][k] - a[1][k]) * t) * v));
}

/**
 * Postaví obrázky reliéfu a moře pro svět (jen v prohlížeči). Vrací { relief, sea, res, ms } – oba canvasy pokrývají celý mapový list
 * (`w × h` buněk po `res` pixelech světa). Trvá desítky až stovky milisekund, proto ho renderer volá jednou a líně.
 */
export function buildRelief(world, geo, res = RELIEF_RES) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const W = Math.ceil(world.frame.w / res), H = Math.ceil(world.frame.h / res), n = W * H;
  // 1) rastr terénu: R = výška, G = členitost, alfa = pevnina
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.setTransform(1 / res, 0, 0, 1 / res, 0, 0);
  if (geo.polys[0]) { c.fillStyle = 'rgb(30,10,0)'; c.fill(labelPath(geo, 0), 'evenodd'); }   // prázdná pevnina za okrajem hrací plochy
  for (let p = 1; p <= world.L; p++) {
    const t = TERRAIN_RELIEF[world.terrain[p]] || TERRAIN_RELIEF[0];
    c.fillStyle = `rgb(${Math.round(t.h * 255)},${Math.round(t.amp * 255)},0)`;
    c.fill(labelPath(geo, p), 'evenodd');
  }
  const px = c.getImageData(0, 0, W, H).data;
  const base = new Float32Array(n), amp = new Float32Array(n), land = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = px[i * 4 + 3];
    if (a < 8) continue;
    base[i] = px[i * 4] / 255; amp[i] = px[i * 4 + 1] / 255;
    if (a > 127) land[i] = 1;
  }
  // 2) výška: rozmazaný základ (svahy mezi provinciemi) + vrásnění podle členitosti
  const hb = boxBlur(boxBlur(base, W, H, 3), W, H, 3), ab = boxBlur(amp, W, H, 2);
  const height = new Float32Array(n);
  const sc = res / 22;   // perioda šumu ≈ 22 pixelů světa
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!land[i] && hb[i] < 0.01) continue;
    const fine = valueNoise(x * sc * 3.1, y * sc * 3.1, 11);
    const r = ab[i] > 0.12 ? ridged(x * sc, y * sc, 3) : valueNoise(x * sc, y * sc, 7);   // vrásnění jen v členitém terénu, jinde jedna vrstva šumu
    height[i] = hb[i] + ab[i] * (r - 0.35) + 0.025 * (fine - 0.5);
  }
  const shade = hillshade(height, W, H, 7 / res * 2.5, 140, land);
  // 3) obrázek reliéfu: šedá, mimo pevninu neutrální
  const reliefCv = document.createElement('canvas');
  reliefCv.width = W; reliefCv.height = H;
  const rc = reliefCv.getContext('2d');
  const rimg = rc.createImageData(W, H);
  for (let i = 0; i < n; i++) {
    const v = land[i] ? shade[i] : 128;
    rimg.data[i * 4] = v; rimg.data[i * 4 + 1] = v; rimg.data[i * 4 + 2] = v; rimg.data[i * 4 + 3] = 255;
  }
  rc.putImageData(rimg, 0, 0);
  // 4) obrázek moře v polovičním rozlišení: barva podle vzdálenosti od pobřeží, jemné vlnění
  const SW = Math.ceil(W / 2), SH = Math.ceil(H / 2), half = new Uint8Array(SW * SH);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (land[y * W + x]) half[(y >> 1) * SW + (x >> 1)] = 1;
  const dist = distanceToLand(half, SW, SH);
  const seaCv = document.createElement('canvas');
  seaCv.width = SW; seaCv.height = SH;
  const sctx = seaCv.getContext('2d');
  const simg = sctx.createImageData(SW, SH);
  const kmPerCell = 2 * res * world.frame.km;
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const i = y * SW + x;
    const [r, g, b] = seaColor(dist[i] * kmPerCell, valueNoise(x * 0.18, y * 0.7, 5));
    simg.data[i * 4] = r; simg.data[i * 4 + 1] = g; simg.data[i * 4 + 2] = b; simg.data[i * 4 + 3] = 255;
  }
  sctx.putImageData(simg, 0, 0);
  const ms = typeof performance !== 'undefined' ? performance.now() - t0 : 0;
  return { relief: reliefCv, sea: seaCv, res, w: W, h: H, sw: SW, sh: SH, ms };
}
