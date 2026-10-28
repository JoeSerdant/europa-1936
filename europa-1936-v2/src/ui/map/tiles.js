// Dlaždicová mezipaměť mapy: čistá logika bez DOM (výběr úrovně a dlaždic, prostorový rastr, LRU), aby šla testovat.
// Svět se kreslí do dlaždic 512×512 zařízení pixelů v měřítkách 2^úroveň (zařízení pixelů na pixel světa); při posunu a přiblížení se
// jen skládají hotové dlaždice, takže snímek stojí zlomek ceny kreslení všech vektorů.

export const TILE = 512;
export const MIN_LEVEL = -2;
export const MAX_LEVEL = 5;

/** Úroveň dlaždic pro dané přiblížení a hustotu pixelů: nejmenší, ve které se dlaždice nezvětšují. */
export function levelFor(zoom, dpr = 1) {
  const l = Math.ceil(Math.log2(Math.max(1e-6, zoom * dpr)) - 1e-9) | 0;     // `| 0` odstraní záporné nuly
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, l));
}

/** Strana dlaždice ve světových pixelech. */
export const tileSize = (lvl) => TILE / 2 ** lvl;

export const tileKey = (lvl, tx, ty) => `${lvl}/${tx}/${ty}`;

/** Rozsah dlaždic [tx0, ty0, tx1, ty1] (včetně), které protínají výřez světa a leží v mapovém listu; prázdný rozsah má tx1 < tx0. */
export function tileRange(view, lvl, mapW, mapH) {
  const size = tileSize(lvl);
  const nx = Math.ceil(mapW / size), ny = Math.ceil(mapH / size);
  const tx0 = Math.max(0, Math.floor(view[0] / size)), ty0 = Math.max(0, Math.floor(view[1] / size));
  const tx1 = Math.min(nx - 1, Math.floor(view[2] / size)), ty1 = Math.min(ny - 1, Math.floor(view[3] / size));
  return [tx0, ty0, tx1, ty1];
}

/** Prostorový rastr: položky (id s obálkou) → buňky; dotaz vrátí každé id nejvýše jednou. */
export class Grid {
  constructor(w, h, cell, count) {
    this.cell = cell;
    this.gw = Math.max(1, Math.ceil(w / cell));
    this.gh = Math.max(1, Math.ceil(h / cell));
    this.cells = Array.from({ length: this.gw * this.gh }, () => []);
    this.mark = new Int32Array(count);
    this.stamp = 0;
  }

  add(id, x0, y0, x1, y1) {
    const { cell, gw, gh } = this;
    const cx0 = Math.max(0, Math.floor(x0 / cell)), cx1 = Math.min(gw - 1, Math.floor(x1 / cell));
    const cy0 = Math.max(0, Math.floor(y0 / cell)), cy1 = Math.min(gh - 1, Math.floor(y1 / cell));
    for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) this.cells[y * gw + x].push(id);
  }

  query(x0, y0, x1, y1) {
    const { cell, gw, gh } = this;
    const out = [];
    const cx0 = Math.max(0, Math.floor(x0 / cell)), cx1 = Math.min(gw - 1, Math.floor(x1 / cell));
    const cy0 = Math.max(0, Math.floor(y0 / cell)), cy1 = Math.min(gh - 1, Math.floor(y1 / cell));
    const st = ++this.stamp;
    for (let y = cy0; y <= cy1; y++) {
      for (let x = cx0; x <= cx1; x++) {
        for (const id of this.cells[y * gw + x]) {
          if (this.mark[id] !== st) { this.mark[id] = st; out.push(id); }
        }
      }
    }
    return out;
  }
}

/** Mezipaměť s vyřazováním nejdéle nepoužité položky. `get` položku „oživí“, `peek` ne. */
export class LruCache {
  constructor(max) { this.max = max; this.map = new Map(); }
  get size() { return this.map.size; }
  peek(key) { return this.map.get(key); }
  get(key) {
    const v = this.map.get(key);
    if (v !== undefined) { this.map.delete(key); this.map.set(key, v); }
    return v;
  }
  set(key, value) { this.map.delete(key); this.map.set(key, value); }
  has(key) { return this.map.has(key); }
  /** Zahodí nejstarší položky nad limit (kromě chráněných klíčů); vrací zahozené hodnoty. */
  trim(protect) {
    const dropped = [];
    if (this.map.size <= this.max) return dropped;
    for (const [k, v] of this.map) {
      if (this.map.size - dropped.length <= this.max) break;
      if (protect && protect.has(k)) continue;
      dropped.push([k, v]);
    }
    for (const [k] of dropped) this.map.delete(k);
    return dropped.map((d) => d[1]);
  }
}

/** Zda se dva obdélníky [x0,y0,x1,y1] překrývají (pro popisky mapy). */
export const rectsOverlap = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
