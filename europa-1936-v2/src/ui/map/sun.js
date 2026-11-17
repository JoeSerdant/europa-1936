// Den a noc na mapě (M91): převod pixelů světa na zeměpisné souřadnice a výška Slunce podle herního času. Čisté funkce bez DOM (testují se v Node).
// Svět je v kuželové konformní projekci (střední poledník 16° v. d., nedeformované rovnoběžky 38° a 62°, poloměr Země 6371 km, 2,5 km na pixel);
// posun počátku odpovídá rámci generátoru (`tools/world/grid.js`) – test ho ověřuje proti d3-geo.

const RAD = Math.PI / 180;
export const PROJ = { cm: 16, p1: 38, p2: 62, R: 6371, km: 2.5, x0: -2313.9501740663636, y0: -8613.754303785294 };

const tany = (y) => Math.tan((Math.PI / 2 + y) / 2);
const N = Math.log(Math.cos(PROJ.p1 * RAD) / Math.cos(PROJ.p2 * RAD)) / Math.log(tany(PROJ.p2 * RAD) / tany(PROJ.p1 * RAD));
const F = (Math.cos(PROJ.p1 * RAD) * Math.pow(tany(PROJ.p1 * RAD), N)) / N;

/** Zeměpisná délka a šířka (stupně) → pixel světa [x, y]. */
export function pxOf(lon, lat) {
  const l = (lon - PROJ.cm) * RAD, f = Math.max(-89.9, Math.min(89.9, lat)) * RAD;
  const r = F / Math.pow(tany(f), N);
  const x = r * Math.sin(N * l), y = F - r * Math.cos(N * l);
  return [(x * PROJ.R - PROJ.x0) / PROJ.km, (-y * PROJ.R - PROJ.y0) / PROJ.km];
}

/** Pixel světa → [zeměpisná délka, šířka] ve stupních. */
export function lonLatOf(px, py) {
  const x = (px * PROJ.km + PROJ.x0) / PROJ.R, y = -(py * PROJ.km + PROJ.y0) / PROJ.R;
  const fy = F - y, r = Math.sign(N) * Math.sqrt(x * x + fy * fy);
  let l = Math.atan2(x, Math.abs(fy)) * Math.sign(fy);
  if (fy * N < 0) l -= Math.PI * Math.sign(x) * Math.sign(fy);
  return [l / N / RAD + PROJ.cm, (2 * Math.atan(Math.pow(F / r, 1 / N)) - Math.PI / 2) / RAD];
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
