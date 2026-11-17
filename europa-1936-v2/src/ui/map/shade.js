// Stínové vrstvy mapy nad dlaždicemi (M91): ztmavení mimo dohled (mlha války) a den a noc se světly měst.
// Obě vrstvy jsou malé obrázky přes celý mapový list, které se přepočítají jen při změně (dohled, herní hodina) a každý snímek se jen jednou
// zvětšeně vykreslí (`drawImage` s vyhlazením) – snímek tak nestojí žádné nové vektory (pravidlo 13). Výpočty jsou v čistých funkcích (`fogMask`,
// `nightGrid`) testovatelných v Node; kreslení potřebuje prohlížeč.
import { lonLatOf, sunElevation, nightOf } from './sun.js';

export const FOG_RES = 8;          // pixelů světa na buňku masky mlhy
export const FOG_ALPHA = 0.32;     // ztmavení oblastí mimo dohled
export const NIGHT_RES = 28;       // pixelů světa na buňku mřížky noci
export const NIGHT_ALPHA = 0.5;    // nejtmavší noc
export const NIGHT_RGB = [8, 14, 34];

/** Štítky oblastí pro střed každé buňky mřížky (`pick(x, y)` = štítek pod bodem světa). Vrací { w, h, cells }. */
export function labelGrid(frame, pick, res = FOG_RES) {
  const w = Math.ceil(frame.w / res), h = Math.ceil(frame.h / res), cells = new Int32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells[y * w + x] = pick((x + 0.5) * res, (y + 0.5) * res);
  return { w, h, cells };
}

/**
 * Maska mlhy: neprůhlednost 0–255 pro každou buňku – pevnina mimo dohled (`land[p]` = 0) a moře mimo dohled (`seas` neobsahuje štítek) se ztmaví,
 * prázdná pevnina za okrajem hrací plochy a jezera ne. `L` = počet provincií, `S` = počet moří.
 */
export function fogMask(grid, land, seas, L, S, alpha = FOG_ALPHA) {
  const out = new Uint8ClampedArray(grid.cells.length), a = Math.round(alpha * 255);
  for (let i = 0; i < grid.cells.length; i++) {
    const l = grid.cells[i];
    if (l >= 1 && l <= L) out[i] = land[l] ? 0 : a;
    else if (l > L && l <= L + S) out[i] = seas && !seas.has(l) ? Math.round(a * 0.7) : 0;
  }
  return out;
}

/** Tma 0–1 v buňkách mřížky noci přes mapový list v herní hodině `tick` (střed buňky → zeměpisné souřadnice → výška Slunce). */
export function nightGrid(frame, tick, res = NIGHT_RES) {
  const w = Math.ceil(frame.w / res), h = Math.ceil(frame.h / res), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [lon, lat] = lonLatOf((x + 0.5) * res, (y + 0.5) * res);
    out[y * w + x] = nightOf(sunElevation(tick, lon, lat));
  }
  return { w, h, night: out };
}

/** Vrstva mlhy války a noci pro renderer. */
export class ShadeLayer {
  constructor(world, geo) {
    this.world = world;
    this.geo = geo;
    this.grid = null;          // štítky buněk mlhy (líně, ~30 ms)
    this.fogCanvas = null;
    this.fogKey = null;        // poslední maska dohledu (objekt z `visibleLand`)
    this.fogAt = 0;            // kdy se maska naposledy přepočítala (ms) – nejvýš dvakrát za sekundu
    this.nightCanvas = null;
    this.nightHour = -1;
    this.night = 0;            // průměrná tma na mapě
    this.nightMax = 0;         // nejtmavší místo (0 = všude den, vrstva se nekreslí)
    this.nightData = null;
    this.glow = null;          // předkreslená záře světel města
  }

  /** Přepočítá masku mlhy, když se změnil dohled (nejvýš jednou za 500 ms). `land` = Uint8Array z `visibleLand`, `seas` = Set z `visibleSeas`. */
  updateFog(land, seas, now) {
    if (land === this.fogKey && this.fogCanvas) return false;
    if (this.fogCanvas && now - this.fogAt < 500) return false;
    if (!this.grid) this.grid = labelGrid(this.world.frame, this.geo.pick, FOG_RES);
    const { w, h } = this.grid;
    const mask = fogMask(this.grid, land, seas, this.world.L, this.world.S);
    if (!this.fogCanvas) { this.fogCanvas = document.createElement('canvas'); this.fogCanvas.width = w; this.fogCanvas.height = h; }
    const c = this.fogCanvas.getContext('2d');
    const img = c.createImageData(w, h);
    for (let i = 0; i < mask.length; i++) { img.data[i * 4] = 6; img.data[i * 4 + 1] = 10; img.data[i * 4 + 2] = 18; img.data[i * 4 + 3] = mask[i]; }
    c.putImageData(img, 0, 0);
    this.fogKey = land; this.fogAt = now;
    return true;
  }

  /** Přepočítá obrázek noci pro herní hodinu (jen při změně hodiny). */
  updateNight(tick) {
    if (tick === this.nightHour && this.nightCanvas) return false;
    const g = nightGrid(this.world.frame, tick, NIGHT_RES);
    if (!this.nightCanvas) { this.nightCanvas = document.createElement('canvas'); this.nightCanvas.width = g.w; this.nightCanvas.height = g.h; }
    const c = this.nightCanvas.getContext('2d');
    const img = c.createImageData(g.w, g.h);
    let sum = 0, max = 0;
    for (let i = 0; i < g.night.length; i++) {
      const a = g.night[i];
      sum += a; if (a > max) max = a;
      img.data[i * 4] = NIGHT_RGB[0]; img.data[i * 4 + 1] = NIGHT_RGB[1]; img.data[i * 4 + 2] = NIGHT_RGB[2]; img.data[i * 4 + 3] = Math.round(a * NIGHT_ALPHA * 255);
    }
    c.putImageData(img, 0, 0);
    this.night = sum / g.night.length;
    this.nightMax = max;
    this.nightData = g;
    this.nightHour = tick;
    return true;
  }

  /** Tma 0–1 v bodě světa (z poslední mřížky, nejbližší buňka). */
  nightAt(x, y) {
    const g = this.nightData;
    if (!g) return 0;
    const cx = Math.min(g.w - 1, Math.max(0, Math.floor(x / NIGHT_RES))), cy = Math.min(g.h - 1, Math.max(0, Math.floor(y / NIGHT_RES)));
    return g.night[cy * g.w + cx];
  }

  /** Vykreslí masku (mlhu nebo noc, `res` pixelů světa na buňku) přes mapový list; `ctx` má nastavenou transformaci světa. */
  drawWorld(ctx, canvas, res) {
    if (!canvas) return;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width * res, canvas.height * res);
  }

  /** Předkreslená záře světel města (jednou). */
  glowSprite() {
    if (this.glow) return this.glow;
    const S = 32, cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c = cv.getContext('2d');
    const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,236,170,0.95)');
    g.addColorStop(0.25, 'rgba(255,206,110,0.55)');
    g.addColorStop(1, 'rgba(255,180,80,0)');
    c.fillStyle = g; c.fillRect(0, 0, S, S);
    this.glow = cv;
    return cv;
  }
}
