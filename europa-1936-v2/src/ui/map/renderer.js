// Vykreslení mapy do Canvas 2D.
// Svět (moře, provincie, hranice, železnice) se kreslí do dlaždic a ukládá do mezipaměti (viz tiles.js); každý snímek jen skládá dlaždice,
// přidá zvýraznění označené oblasti, značky měst a popisky (s ochranou proti překrývání) a rám mapového listu.
// Změna vlastníků, režimu nebo ztlumení zneplatní dlaždice (`version`), překreslí se jen ty, které jsou vidět.
import { labelPath, arcsPath } from './geometry.js';
import { SEA_COLOR, LAKE_COLOR, VOID_COLOR, fillColors, ownerLabelColor, hexToRgb } from './colors.js';
import { viewRect, worldToScreen } from './camera.js';
import { countryLabels, stateLabels } from './labels.js';
import { TILE, MIN_LEVEL, MAX_LEVEL, levelFor, tileSize, tileKey, tileRange, Grid, LruCache, rectsOverlap } from './tiles.js';
import { FONT_DISPLAY, FONT_TEXT } from './fonts.js';
import { UnitLayer } from './units.js';
import { frontEdges } from '../../engine/index.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, v) => clamp01((v - a) / (b - a));

export { FONT_DISPLAY, FONT_TEXT };

const OUTER = '#0c1a27';                                   // pozadí mimo mapový list
const KIND = { PROV: 0, STATE: 1, COUNTRY: 2, COAST: 3, LAKE: 4, SEA: 5, VOID: 6, NONE: 255 };
const MAX_TILES = 150;                                     // ≈ 150 MB pixelů v nejhorším případě
const TILE_BUDGET_MS = 9;                                  // kolik času na snímek smí zabrat dokreslování dlaždic při pohybu kamery
const HATCH_MODES = new Set(['political', 'states']);      // režimy, ve kterých okupované provincie dostanou pruhy barvy držitele
const HATCH_CSS_PX = 9;                                    // perioda pruhů v obrazovkových pixelech

export class MapRenderer {
  constructor(canvas, world, geo) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.world = world;
    this.geo = geo;
    this.mode = 'political';
    this.game = null;
    this.fills = fillColors(world, null, 'political');
    this.stateLabels = stateLabels(world);
    this.stateOrder = this.stateLabels.map((l, i) => (l ? i : 0)).filter(Boolean).sort((a, b) => this.stateLabels[b].w * this.stateLabels[b].h - this.stateLabels[a].w * this.stateLabels[a].h);
    this.countryLabels = countryLabels(world, null);
    this.lastOwner = null;
    this.hover = 0;
    this.selected = 0;
    this.player = 0;                // idx země hráče
    this.focus = 0;                 // idx země v plné barvě (výběr země), 0 = bez ztlumení
    this.options = { rails: true, labels: true, vp: true, front: true, units: true };
    this.cityPos = world.land.map((o, p) => (p && o ? (o.k[0] ? [o.k[0][2], o.k[0][3]] : o.c) : null));
    // body se značkou (vítězné body, přístavy) a pořadí jmen měst podle důležitosti
    this.markers = [];
    for (let p = 1; p <= world.L; p++) if (world.vp[p] || world.portSea[p]) this.markers.push(p);
    this.cityOrder = this.markers.filter((p) => world.vp[p]).sort((a, b) => world.vp[b] - world.vp[a]);
    // dlaždice
    this.version = 1;
    this.urgent = true;             // po změně dat se viditelné dlaždice dokreslí hned v tomto snímku
    this.pending = 0;               // kolik viditelných dlaždic ještě čeká na dokreslení
    this.dpr = 0;
    this.tiles = new LruCache(MAX_TILES);
    this.pool = [];
    this.stamp = new Int32Array(world.nLabel);
    this.stampId = 0;
    this.stats = { drawn: 0, rendered: 0, pending: 0, ms: 0, unitsMs: 0 };
    this.widthCache = new Map();
    // armáda: vrstva jednotek, okupace (kdo provincii drží, když není vlastník), fronta, plán armády a náhled trasy
    this.units = new UnitLayer(world);
    this.showUnits = false;
    this.planView = null;
    this.route = null;
    this.occ = new Uint8Array(world.L + 1);
    this.lastCtrl = null;
    this.lastIndSt = null;   // továrny států (M19) – režim Průmysl se překreslí jen při jejich změně
    this.hatchCache = new Map();
    this.pairArcs = null;
    this.frontSrc = null;
    this.frontPath = null;
    this.buildIndexes();
    this.rebuildBorders();
  }

  // ---------------------------------------------------------------- příprava
  buildIndexes() {
    const { geo, world } = this;
    const fw = world.frame.w, fh = world.frame.h;
    this.arcKind = new Uint8Array(geo.arcs.length).fill(KIND.NONE);
    this.arcGrid = new Grid(fw, fh, 128, geo.arcs.length);
    geo.arcs.forEach((a, i) => {
      const p = a.pts;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let k = 0; k < p.length; k += 2) {
        if (p[k] < x0) x0 = p[k]; if (p[k] > x1) x1 = p[k];
        if (p[k + 1] < y0) y0 = p[k + 1]; if (p[k + 1] > y1) y1 = p[k + 1];
      }
      this.arcGrid.add(i, x0, y0, x1, y1);
    });
    const rails = world.raw.rails;
    this.railGrid = new Grid(fw, fh, 128, rails.length);
    rails.forEach(([a, b], i) => {
      const A = world.land[a].c, B = world.land[b].c;
      this.railGrid.add(i, Math.min(A[0], B[0]), Math.min(A[1], B[1]), Math.max(A[0], B[0]), Math.max(A[1], B[1]));
    });
  }

  /** Zneplatní všechny dlaždice (změna vlastníků, režimu, ztlumení, hustoty pixelů). */
  invalidate() {
    this.version++;
    this.urgent = true;
  }

  setGame(game) {
    if (game === this.game) return;
    const ownerChanged = !this.game || game.stateOwner !== this.lastOwner;
    const indSt = game.ind ? game.ind.st : null;
    const indChanged = indSt !== this.lastIndSt;
    this.lastIndSt = indSt;
    this.game = game;
    if (ownerChanged) {
      this.lastOwner = game.stateOwner;
      this.fills = fillColors(this.world, game, this.mode, this.focus);
      this.countryLabels = countryLabels(this.world, game);
      this.rebuildBorders();
      this.updateOccupation(game);
      this.invalidate();
    } else if (game.ctrl !== this.lastCtrl) {
      const changed = this.updateOccupation(game);
      if (this.mode === 'supply') { this.fills = fillColors(this.world, game, this.mode, this.focus); this.invalidate(); }
      else if (HATCH_MODES.has(this.mode)) this.invalidateProvinces(changed);
    }
    if (!ownerChanged && indChanged && this.mode === 'industry') { this.fills = fillColors(this.world, game, this.mode, this.focus); this.invalidate(); }
    this.units.player = game.player ? this.world.ownerIdx[game.player] : 0;
    if (this.showUnits) this.units.setGame(game);
  }

  /** Zapne/vypne vrstvu jednotek (jen na obrazovce hry). */
  setUnitsVisible(on) {
    if (on === this.showUnits) return;
    this.showUnits = on;
    if (on && this.game) this.units.setGame(this.game); else if (!on) this.units.setGame(null);
  }

  /** Přepočítá, které provincie drží někdo jiný než vlastník; vrací provincie, kterým se držitel změnil. */
  updateOccupation(game) {
    const w = this.world, ctrl = game.ctrl, so = game.stateOwner;
    const changed = [];
    for (let p = 1; p <= w.L; p++) {
      const c = ctrl[p];
      const v = c !== so[w.provState[p]] ? c : 0;
      if (this.occ[p] !== v) { this.occ[p] = v; changed.push(p); }
    }
    this.lastCtrl = ctrl;
    return changed;
  }

  /** Zneplatní jen dlaždice, které zasahují do daných provincií (např. po dobytí provincie); ostatní zůstanou. */
  invalidateProvinces(list) {
    if (!list.length) return;
    const w = this.world;
    for (const tile of this.tiles.map.values()) {
      if (tile.lvl === undefined) continue;
      const size = tileSize(tile.lvl), m = 14 / (2 ** tile.lvl / (this.dpr || 1));
      const x0 = tile.tx * size - m, y0 = tile.ty * size - m, x1 = x0 + size + 2 * m, y1 = y0 + size + 2 * m;
      for (const p of list) {
        const b = w.land[p].b;
        if (b[0] <= x1 && b[2] >= x0 && b[1] <= y1 && b[3] >= y0) { tile.ver = -1; break; }
      }
    }
    this.urgent = true;
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.fills = fillColors(this.world, this.game, mode, this.focus);
    this.invalidate();
  }

  setFocus(idx) {
    if (idx === this.focus) return;
    this.focus = idx;
    this.fills = fillColors(this.world, this.game, this.mode, idx);
    this.invalidate();
  }

  /** Po načtení písem: popisky se musí znovu změřit. */
  fontsChanged() { this.widthCache.clear(); }

  ownerOf(p) { return this.game ? this.game.stateOwner[this.world.provState[p]] : this.world.provOwner0[p]; }

  // druh každého oblouku podle aktuálních vlastníků: hranice zemí, států, provincií, pobřeží ...
  rebuildBorders() {
    const { geo, world } = this;
    const L = world.L;
    geo.arcs.forEach((a, i) => {
      let k = KIND.NONE;
      if (a.l >= 1 && a.l <= L && a.r >= 1 && a.r <= L) {
        if (this.ownerOf(a.l) !== this.ownerOf(a.r)) k = KIND.COUNTRY;
        else if (world.provState[a.l] !== world.provState[a.r]) k = KIND.STATE;
        else k = KIND.PROV;
      } else if (a.cls === 4) k = KIND.COAST;
      else if (a.cls === 5) k = KIND.LAKE;
      else if (a.cls === 6) k = KIND.SEA;
      else if (a.cls === 7) k = KIND.VOID;
      this.arcKind[i] = k;
    });
  }

  // ---------------------------------------------------------------- dlaždice
  makeTile() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = TILE;
    return { canvas, ctx: canvas.getContext('2d', { alpha: false }), ver: 0 };
  }

  /** Provincie a jezera, jejichž obálka zasahuje do obdélníku světa. */
  labelsIn(x0, y0, x1, y1) {
    const { geo } = this;
    const C = geo.cell;
    const out = [];
    const id = ++this.stampId;
    const cx0 = Math.max(0, Math.floor(x0 / C)), cx1 = Math.min(geo.gw - 1, Math.floor(x1 / C));
    const cy0 = Math.max(0, Math.floor(y0 / C)), cy1 = Math.min(geo.gh - 1, Math.floor(y1 / C));
    const L = this.world.L, S = this.world.S;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        for (const l of geo.cells[cy * geo.gw + cx]) {
          if ((l > L && l <= L + S) || this.stamp[l] === id) continue;     // moře se nevyplňují (je to pozadí)
          this.stamp[l] = id;
          out.push(l);
        }
      }
    }
    return out;
  }

  /** Vykreslí jednu dlaždici do její mezipaměti. Měřítko dlaždice je 2^lvl zařízení pixelů na pixel světa. */
  renderTile(lvl, tx, ty) {
    const key = tileKey(lvl, tx, ty);
    let tile = this.tiles.peek(key);
    if (!tile) { tile = this.pool.pop() || this.makeTile(); this.tiles.set(key, tile); } else this.tiles.get(key);
    tile.lvl = lvl; tile.tx = tx; tile.ty = ty;
    const { world, geo } = this;
    const g = tile.ctx;
    const T = 2 ** lvl, size = TILE / T;
    const wx0 = tx * size, wy0 = ty * size;
    const z = T / this.dpr;                          // přiblížení v CSS pixelech – podle něj se volí tloušťky čar a průhlednosti
    const px = 1 / z;                                // jeden CSS pixel ve světových jednotkách
    const L = world.L;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = OUTER; g.fillRect(0, 0, TILE, TILE);
    g.setTransform(T, 0, 0, T, -wx0 * T, -wy0 * T);
    g.lineJoin = 'round'; g.lineCap = 'round';
    const m = 24 * px;
    const x0 = wx0 - m, y0 = wy0 - m, x1 = wx0 + size + m, y1 = wy0 + size + m;

    // moře, prázdná pevnina, jezera
    g.fillStyle = SEA_COLOR; g.fillRect(0, 0, world.frame.w, world.frame.h);
    if (geo.polys[0]) { g.fillStyle = VOID_COLOR; g.fill(labelPath(geo, 0), 'evenodd'); }
    const labels = this.labelsIn(x0, y0, x1, y1);
    g.fillStyle = LAKE_COLOR;
    for (const l of labels) if (l > L) g.fill(labelPath(geo, l), 'evenodd');

    // oblouky v dlaždici podle druhu
    const byKind = [[], [], [], [], [], [], []];
    for (const i of this.arcGrid.query(x0, y0, x1, y1)) { const k = this.arcKind[i]; if (k < 7) byKind[k].push(i); }

    // záře pobřeží (vodní mělčina)
    let coast = null;
    if (byKind[KIND.COAST].length) {
      coast = arcsPath(geo, byKind[KIND.COAST]);
      g.strokeStyle = 'rgba(110,165,205,0.10)'; g.lineWidth = 16 * px; g.stroke(coast);
      g.strokeStyle = 'rgba(120,178,214,0.13)'; g.lineWidth = 8 * px; g.stroke(coast);
      g.strokeStyle = 'rgba(150,200,230,0.16)'; g.lineWidth = 3.5 * px; g.stroke(coast);
    }

    // provincie
    for (const l of labels) {
      if (l > L) continue;
      g.fillStyle = this.fills[l];
      g.fill(labelPath(geo, l), 'evenodd');
    }
    // okupace: pruhy barvy držitele přes barvu vlastníka
    if (HATCH_MODES.has(this.mode)) {
      for (const l of labels) {
        if (l > L || !this.occ[l]) continue;
        const pat = this.hatchPattern(g, this.occ[l], T);
        if (!pat) continue;
        g.fillStyle = pat;
        g.fill(labelPath(geo, l), 'evenodd');
      }
    }

    // hranice
    const stroke = (kind, style, width) => {
      if (!byKind[kind].length) return;
      g.strokeStyle = style; g.lineWidth = width * px;
      g.stroke(arcsPath(geo, byKind[kind]));
    };
    stroke(KIND.PROV, `rgba(10,14,20,${(0.10 + 0.22 * smooth(0.45, 3, z)).toFixed(3)})`, 0.8);
    stroke(KIND.STATE, 'rgba(10,14,20,0.55)', 1.1);
    stroke(KIND.COUNTRY, 'rgba(8,10,14,0.22)', 5);
    stroke(KIND.COUNTRY, 'rgba(8,10,14,0.9)', 1.7);
    if (coast) { g.strokeStyle = 'rgba(9,24,40,0.85)'; g.lineWidth = 1.0 * px; g.stroke(coast); }
    stroke(KIND.LAKE, 'rgba(25,55,85,0.8)', 0.8);
    stroke(KIND.VOID, 'rgba(0,0,0,0.5)', 1.0);
    if (z > 0.8) stroke(KIND.SEA, `rgba(190,220,245,${(0.05 + 0.1 * smooth(0.8, 2, z)).toFixed(3)})`, 0.8);

    // železnice
    if (this.options.rails && z > 0.9) {
      const ids = this.railGrid.query(x0, y0, x1, y1);
      if (ids.length) {
        const rails = world.raw.rails;
        const byLevel = [null, new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()];
        for (const i of ids) {
          const [a, b, lv] = rails[i];
          const A = world.land[a].c, B = world.land[b].c;
          byLevel[lv].moveTo(A[0], A[1]); byLevel[lv].lineTo(B[0], B[1]);
        }
        g.globalAlpha = 0.65 * smooth(0.9, 1.5, z);
        g.strokeStyle = '#3a2418';
        for (let lv = 1; lv <= 5; lv++) { g.lineWidth = (0.5 + lv * 0.22) * px * 1.2; g.stroke(byLevel[lv]); }
        g.globalAlpha = 1;
      }
    }
    tile.ver = this.version;
    return tile;
  }

  /** Vzor pruhů v barvě země `o` pro dlaždici s měřítkem T (zařízení pixelů na pixel světa); jeden pixel vzoru = jeden pixel zařízení. */
  hatchPattern(g, o, T) {
    const dpr = this.dpr || 1;
    let e = this.hatchCache.get(o);
    if (!e || e.dpr !== dpr) {
      const S = Math.max(4, Math.round(HATCH_CSS_PX * dpr));
      const cv = document.createElement('canvas');
      cv.width = cv.height = S;
      const c = cv.getContext('2d');
      const [r, gg, b] = hexToRgb(this.world.owners[o].color);
      c.strokeStyle = `rgba(${r},${gg},${b},0.78)`;
      c.lineWidth = Math.max(2, 3.2 * dpr);
      c.lineCap = 'butt';
      c.beginPath();
      c.moveTo(0, S); c.lineTo(S, 0);
      c.moveTo(-S / 2, S / 2); c.lineTo(S / 2, -S / 2);
      c.moveTo(S / 2, S * 1.5); c.lineTo(S * 1.5, S / 2);
      c.stroke();
      e = { dpr, pat: g.createPattern(cv, 'repeat') };
      this.hatchCache.set(o, e);
    }
    const pat = e.pat;
    if (pat && pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix([1 / T, 0, 0, 1 / T, 0, 0]));
    return pat;
  }

  /** Oblouky mezi dvěma provinciemi: klíč `min * 4096 + max` → pole indexů oblouků (staví se líně). */
  buildPairArcs() {
    const L = this.world.L;
    const m = new Map();
    this.geo.arcs.forEach((a, i) => {
      if (a.l < 1 || a.l > L || a.r < 1 || a.r > L) return;
      const k = a.l < a.r ? a.l * 4096 + a.r : a.r * 4096 + a.l;
      const list = m.get(k);
      if (list) list.push(i); else m.set(k, [i]);
    });
    this.pairArcs = m;
  }

  /** Čára fronty: hranice sousedních provincií, jejichž držitelé spolu válčí. Cesta se staví znovu jen při změně kontroly nebo válek. */
  drawFront(px) {
    const { ctx, game } = this;
    if (!game || !game.mil.wars.length) return;
    const edges = frontEdges(game);
    if (edges !== this.frontSrc) {
      this.frontSrc = edges;
      this.frontPath = null;
      if (edges.size) {
        if (!this.pairArcs) this.buildPairArcs();
        const idx = [];
        for (const k of edges) { const a = this.pairArcs.get(k); if (a) for (const i of a) idx.push(i); }
        if (idx.length) this.frontPath = arcsPath(this.geo, idx);
      }
    }
    if (!this.frontPath) return;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(28,6,3,0.9)'; ctx.lineWidth = 5.4 * px; ctx.stroke(this.frontPath);
    ctx.strokeStyle = '#ee5a3a'; ctx.lineWidth = 3 * px; ctx.stroke(this.frontPath);
    ctx.strokeStyle = '#ffd0b8'; ctx.lineWidth = 0.9 * px; ctx.stroke(this.frontPath);
  }

  blit(tile, r) {
    this.ctx.drawImage(tile.canvas, 0, 0, TILE, TILE, r[0], r[1], r[2] - r[0], r[3] - r[1]);
  }

  /** Dlaždice, která ještě není hotová: zatím se použije nejbližší jiná úroveň (zvětšená nebo zmenšená). */
  drawFallback(lvl, tx, ty, r, rectOf) {
    const { ctx } = this;
    const sz = tileSize(lvl);
    const wx0 = tx * sz, wy0 = ty * sz, wx1 = wx0 + sz, wy1 = wy0 + sz;
    ctx.save();
    ctx.beginPath(); ctx.rect(r[0], r[1], r[2] - r[0], r[3] - r[1]); ctx.clip();
    for (const d of [1, -1, 2, -2, 3, -3]) {
      const l2 = lvl + d;
      if (l2 < MIN_LEVEL || l2 > MAX_LEVEL) continue;
      const sz2 = tileSize(l2);
      let found = false;
      for (let ay = Math.floor(wy0 / sz2); ay <= Math.floor((wy1 - 1e-6) / sz2); ay++) {
        for (let ax = Math.floor(wx0 / sz2); ax <= Math.floor((wx1 - 1e-6) / sz2); ax++) {
          const t2 = this.tiles.peek(tileKey(l2, ax, ay));
          if (t2) { this.blit(t2, rectOf(l2, ax, ay)); found = true; }
        }
      }
      if (found) break;
    }
    ctx.restore();
  }

  drawTiles(cam, dpr, view) {
    const { ctx, world } = this;
    const lvl = levelFor(cam.zoom, dpr);
    const s = cam.zoom * dpr;
    const ox = (cam.w / 2 - cam.x * cam.zoom) * dpr, oy = (cam.h / 2 - cam.y * cam.zoom) * dpr;
    const rectOf = (l, tx, ty) => {
      const sz = tileSize(l);
      return [Math.floor(ox + tx * sz * s), Math.floor(oy + ty * sz * s), Math.ceil(ox + (tx + 1) * sz * s), Math.ceil(oy + (ty + 1) * sz * s)];
    };
    const [tx0, ty0, tx1, ty1] = tileRange(view, lvl, world.frame.w, world.frame.h);
    const used = new Set();
    const need = [];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    let drawn = 0;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const key = tileKey(lvl, tx, ty);
        used.add(key);
        const t = this.tiles.get(key);
        if (t && t.ver === this.version) { this.blit(t, rectOf(lvl, tx, ty)); drawn++; } else need.push({ tx, ty, t });
      }
    }
    // co ještě není hotové: zastaralá dlaždice, jinak náhrada z jiné úrovně
    for (const n of need) {
      const r = rectOf(lvl, n.tx, n.ty);
      if (n.t) this.blit(n.t, r); else this.drawFallback(lvl, n.tx, n.ty, r, rectOf);
    }
    let rendered = 0;
    if (need.length) {
      const cx = (view[0] + view[2]) / 2, cy = (view[1] + view[3]) / 2, sz = tileSize(lvl);
      const dist = (n) => ((n.tx + 0.5) * sz - cx) ** 2 + ((n.ty + 0.5) * sz - cy) ** 2;
      need.sort((a, b) => dist(a) - dist(b));
      const t0 = performance.now();
      const budget = this.urgent ? Infinity : TILE_BUDGET_MS;
      for (const n of need) {
        if (rendered > 0 && performance.now() - t0 > budget) break;
        const tile = this.renderTile(lvl, n.tx, n.ty);
        this.blit(tile, rectOf(lvl, n.tx, n.ty));
        rendered++;
      }
    }
    this.pending = need.length - rendered;
    this.urgent = false;
    this.stats.drawn = drawn + rendered; this.stats.rendered = rendered; this.stats.pending = this.pending;
    for (const t of this.tiles.trim(used)) this.pool.push(t);
  }

  // ---------------------------------------------------------------- snímek
  draw(cam, dpr = 1) {
    const t0 = performance.now();
    const { ctx, canvas } = this;
    if (dpr !== this.dpr) { this.dpr = dpr; this.invalidate(); }
    const w = Math.round(cam.w * dpr), h = Math.round(cam.h * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const z = cam.zoom;
    const view = viewRect(cam);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = OUTER;
    ctx.fillRect(0, 0, w, h);
    this.drawTiles(cam, dpr, view);

    // zvýraznění označené oblasti a oblasti pod kurzorem (ve světových souřadnicích)
    ctx.setTransform(z * dpr, 0, 0, z * dpr, (cam.w / 2 - cam.x * z) * dpr, (cam.h / 2 - cam.y * z) * dpr);
    const px = 1 / z;
    if (this.selected) this.drawOutline(this.selected, '#f2c14e', 2.6, 'rgba(255,240,200,0.22)', px);
    if (this.hover && this.hover !== this.selected) this.drawOutline(this.hover, 'rgba(255,255,255,0.9)', 1.6, 'rgba(255,255,255,0.10)', px);
    if (this.showUnits && this.options.units) {
      this.units.drawPlan(ctx, cam, this.geo, this.planView);
      if (this.options.front) this.drawFront(px);
      this.units.drawWorld(ctx, cam, view, this.planView, this.route);
    }

    // značky a popisky v obrazovkovém prostoru
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const placed = [];
    if (this.options.labels) this.drawCountryNames(cam, view, placed);
    if (this.options.vp && z > 1.0) this.drawMarkers(cam, view);
    if (this.options.labels) { this.drawStateNames(cam, view, placed); this.drawCityNames(cam, view, placed); }
    if (this.showUnits && this.options.units) { this.units.drawScreen(ctx, cam, view); this.stats.unitsMs = this.units.stats.ms; }
    this.drawNeatline(cam);
    this.stats.ms = performance.now() - t0;
  }

  drawOutline(label, stroke, width, fill, px) {
    const { ctx, geo } = this;
    if (!geo.polys[label]) return;
    const path = labelPath(geo, label);
    if (fill) { ctx.fillStyle = fill; ctx.fill(path, 'evenodd'); }
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = (width + 2.2) * px; ctx.stroke(path);
    ctx.strokeStyle = stroke; ctx.lineWidth = width * px; ctx.stroke(path);
  }

  // ---------------------------------------------------------------- značky a popisky
  /** Šířka textu při dané velikosti (změřeno jednou při 100 px a přepočítáno). */
  textWidth(str, weight, family, size, spacing = 0) {
    const key = `${weight}|${family.length}|${str}`;
    let w = this.widthCache.get(key);
    if (w === undefined) {
      const { ctx } = this;
      ctx.save();
      ctx.font = `${weight} 100px ${family}`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      w = ctx.measureText(str).width;
      ctx.restore();
      this.widthCache.set(key, w);
    }
    return (w * size) / 100 + str.length * spacing;
  }

  // vítězné body a přístavy (jen značky, jména měst řeší drawCityNames)
  drawMarkers(cam, view) {
    const { ctx, world } = this;
    const z = cam.zoom;
    const a = smooth(1.0, 1.5, z);
    const [vx0, vy0, vx1, vy1] = view;
    ctx.globalAlpha = a;
    for (const p of this.markers) {
      const c = this.cityPos[p];
      if (c[0] < vx0 || c[0] > vx1 || c[1] < vy0 || c[1] > vy1) continue;
      const vp = world.vp[p];
      const [sx, sy] = worldToScreen(cam, c[0], c[1]);
      if (world.portSea[p]) {
        const s = 3.2 + world.portLevel[p] * 0.4;
        ctx.fillStyle = '#2d6fb3'; ctx.strokeStyle = '#eaf3fb'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.rect(sx - s, sy - s, s * 2, s * 2); ctx.fill(); ctx.stroke();
      }
      if (vp && !(vp < 3 && z < 1.8)) {
        const r = 2.4 + Math.sqrt(vp) * 0.7;
        ctx.fillStyle = '#f7d65a'; ctx.strokeStyle = '#3b2f10'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawCityNames(cam, view, placed) {
    const { ctx, world } = this;
    const z = cam.zoom;
    if (z <= 2.0) return;
    const alpha = smooth(2.0, 2.6, z);
    const [vx0, vy0, vx1, vy1] = view;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.globalAlpha = alpha;
    for (const p of this.cityOrder) {
      const vp = world.vp[p];
      if (!(vp >= 4 || z > 3.4)) continue;
      const c = this.cityPos[p];
      if (c[0] < vx0 || c[0] > vx1 || c[1] < vy0 || c[1] > vy1) continue;
      const [sx, sy] = worldToScreen(cam, c[0], c[1]);
      const r = 2.4 + Math.sqrt(vp) * 0.7;
      const size = Math.min(15, 10 + vp * 0.12);
      const name = world.land[p].k[0] ? world.land[p].k[0][0] : world.land[p].n;
      const wd = this.textWidth(name, 600, FONT_TEXT, size);
      const rect = [sx + r + 3, sy - size * 0.6, sx + r + 5 + wd, sy + size * 0.6];
      if (placed.some((q) => rectsOverlap(rect, q))) continue;
      placed.push(rect);
      ctx.font = `600 ${size}px ${FONT_TEXT}`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,16,22,0.75)'; ctx.fillStyle = '#fff6dc';
      ctx.strokeText(name, sx + r + 4, sy); ctx.fillText(name, sx + r + 4, sy);
    }
    ctx.globalAlpha = 1;
  }

  // názvy států (správních celků): větší státy mají přednost, překrývající se se nekreslí
  drawStateNames(cam, view, placed) {
    const { ctx } = this;
    const z = cam.zoom;
    const a = smooth(0.85, 1.1, z) * (1 - smooth(2.8, 3.6, z));
    if (a < 0.02) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.globalAlpha = a * 0.9;
    const spacingEm = 0.04;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacingEm}em`;
    for (const s of this.stateOrder) {
      const l = this.stateLabels[s];
      const sw = l.w * z, sh = l.h * z;
      if (sw < 46 || sh < 16) continue;
      if (l.x < view[0] || l.x > view[2] || l.y < view[1] || l.y > view[3]) continue;
      const size = Math.max(10, Math.min(22, sw / (l.name.length * 0.52), sh * 0.5));
      if (size < 10.5) continue;
      const [sx, sy] = worldToScreen(cam, l.x, l.y);
      const wd = this.textWidth(l.name, 500, FONT_TEXT, size, size * spacingEm);
      const rect = [sx - wd / 2 - 2, sy - size * 0.62, sx + wd / 2 + 2, sy + size * 0.62];
      if (placed.some((q) => rectsOverlap(rect, q))) continue;
      placed.push(rect);
      ctx.font = `500 ${size.toFixed(1)}px ${FONT_TEXT}`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(245,240,225,0.55)'; ctx.strokeText(l.name, sx, sy);
      ctx.fillStyle = 'rgba(20,24,30,0.9)'; ctx.fillText(l.name, sx, sy);
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.globalAlpha = 1;
  }

  // názvy zemí (při velkém oddálení)
  drawCountryNames(cam, view, placed) {
    const { ctx } = this;
    const z = cam.zoom;
    const a = 1 - smooth(0.95, 1.5, z);
    if (a < 0.02 || !['political', 'states', 'victory', 'terrain'].includes(this.mode)) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.globalAlpha = a;
    const labels = [...this.countryLabels].sort((p, q) => q.w * q.h - p.w * p.h);
    for (const l of labels) {
      const sw = l.w * z, sh = l.h * z;
      const chars = l.name.length;
      let size = Math.min((sw * 0.8) / (chars * 0.74), sh * 0.45, 40);
      if (l.n < 6) size = Math.min(size, 13);
      if (size < 9) continue;
      const [sx, sy] = worldToScreen(cam, l.x, l.y);
      const spacing = Math.max(1, size * 0.18);
      const wd = this.textWidth(l.name, 600, FONT_DISPLAY, size, spacing);
      const rect = [sx - wd / 2, sy - size * 0.6, sx + wd / 2, sy + size * 0.6];
      if (placed.some((q) => rectsOverlap(rect, q))) continue;
      placed.push(rect);
      ctx.font = `600 ${size.toFixed(1)}px ${FONT_DISPLAY}`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing.toFixed(1)}px`;
      ctx.lineWidth = Math.max(2.5, size * 0.16); ctx.strokeStyle = 'rgba(14,20,26,0.55)';
      ctx.strokeText(l.name, sx, sy);
      ctx.fillStyle = 'rgba(250,246,232,0.93)';
      ctx.fillText(l.name, sx, sy);
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.globalAlpha = 1;
  }

  // dvojitá linka kolem mapového listu
  drawNeatline(cam) {
    const { ctx, world } = this;
    const a = worldToScreen(cam, 0, 0), b = worldToScreen(cam, world.frame.w, world.frame.h);
    ctx.strokeStyle = 'rgba(214,182,92,0.55)'; ctx.lineWidth = 1.2;
    ctx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
    ctx.strokeStyle = 'rgba(214,182,92,0.25)'; ctx.lineWidth = 1;
    ctx.strokeRect(a[0] - 5, a[1] - 5, b[0] - a[0] + 10, b[1] - a[1] + 10);
  }
}

export { ownerLabelColor };
