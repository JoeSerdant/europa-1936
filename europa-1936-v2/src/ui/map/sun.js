// Den a noc na mapě (M91): převod pixelů světa na zeměpisné souřadnice a výška Slunce podle herního času. Čisté funkce bez DOM (testují se v Node).
// W1: svět je v Mercatorově projekci dokola (šev na poledníku −169,3°, v 50° s. š. 2,5 km na pixel, horní okraj 78° s. š.) – stejná čísla
// jako `PROJECTION` v generátoru (`tools/world/config.js`, `grid.js`); test je ověřuje proti d3-geo.

const RAD = Math.PI / 180;
const R = 6371, SEAM = -169.3, LAT_N = 78, REF_LAT = 50, REF_KM = 2.5;
const W = Math.round((2 * Math.PI * R * Math.cos(REF_LAT * RAD)) / REF_KM);
const KM = (2 * Math.PI * R) / W;
const LON0 = SEAM + 180;
const Y0 = -R * Math.log(Math.tan(Math.PI / 4 + (LAT_N * RAD) / 2));
export const PROJ = { lon0: LON0, R, km: KM, y0: Y0, w: W };

/** Zeměpisná délka a šířka (stupně) → pixel světa [x, y] (x v rozsahu 0..W). */
export function pxOf(lon, lat) {
  let l = (lon - LON0) % 360;
  if (l < -180) l += 360; else if (l >= 180) l -= 360;
  const f = Math.max(-85, Math.min(85, lat)) * RAD;
  const x = R * l * RAD, y = -R * Math.log(Math.tan(Math.PI / 4 + f / 2));
  return [(x + Math.PI * R) / KM, (y - Y0) / KM];
}

/** Pixel světa → [zeměpisná délka, šířka] ve stupních. */
export function lonLatOf(px, py) {
  const x = px * KM - Math.PI * R, y = py * KM + Y0;
  let lon = x / R / RAD + LON0;
  if (lon > 180) lon -= 360; else if (lon < -180) lon += 360;
  return [lon, (2 * Math.atan(Math.exp(-y / R)) - Math.PI / 2) / RAD];
}

/** Herní čas (tick = hodina od 1. 1. 1936 0:00 středoevropského času) → { day: den v roce od nuly, utc: hodina UTC 0–24 }. */
export function utcOf(tick) {
  const h = tick - 1;   // středoevropský čas = UTC + 1
  const d = Math.floor(h / 24);
  return { day: ((d % 365) + 365) % 365, utc: h - d * 24 };
}

/** Výška Slunce nad obzorem (stupně) v místě `lon`, `lat` v herní hodině `tick` (přibližný vzorec: deklinace podle dne v roce, bez rovnice času). */
export function sunElevation(tick, lon, lat) {
  const { day, utc } = utcOf(tick);
  const dec = -23.44 * Math.cos((2 * Math.PI * (day + 10)) / 365) * RAD;
  const ha = ((utc + lon / 15 - 12) * 15) * RAD;
  const f = lat * RAD;
  return Math.asin(Math.sin(f) * Math.sin(dec) + Math.cos(f) * Math.cos(dec) * Math.cos(ha)) / RAD;
}

/** Tma 0–1 podle výšky Slunce: plný den nad 2°, plná noc pod −10° (soumrak mezi tím, plynule). */
export function nightOf(elev) {
  const t = Math.max(0, Math.min(1, (2 - elev) / 12));
  return t * t * (3 - 2 * t);
}
