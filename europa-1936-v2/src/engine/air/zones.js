// S8: vzdušné zóny jako v HOI4 – převaha ve vzduchu nad strategickým regionem (`w.region` hlavní provincie státu).
//  air.az[region] = { vlastník: síla } – hlídky (mise `air`) a stíhání (`int`, poloviční váha) křídel, jejichž cílový stát leží v regionu.
//  Převahu strany čte `airSupOf`, postih pozemních bojů při nepřátelské převaze `airPenalty` (čte `army/combat.js`).
import { getWorld } from '../world.js';
import { atWar } from '../army/war.js';
import { AIR } from './constants.js';

/** Strategický region státu (podle hlavní provincie). */
export const regionOfState = (w, s) => w.region[w.states[s].cap];

/** Síla hlídek v regionech: { [region]: { [vlastník]: síla } } (celá čísla) z map `vlastník:stát` → síla. */
export function zonePowers(w, patrol, intc) {
  const az = {};
  const add = (m, k) => {
    for (const [key, v] of m) {
      const [o, s] = key.split(':').map(Number), r = regionOfState(w, s);
      if (!r || !(v > 0)) continue;
      const z = az[r] || (az[r] = {});
      z[o] = (z[o] || 0) + v * k;
    }
  };
  add(patrol, 1);
  add(intc, AIR.AZ_INT);
  for (const r in az) for (const o in az[r]) { az[r][o] = Math.round(az[r][o]); if (!az[r][o]) delete az[r][o]; }
  for (const r in az) if (!Object.keys(az[r]).length) delete az[r];
  return az;
}

/** Síla vlastní strany a nepřátel země `o` v regionu `r`: { m, e } (spojenci = kdo bojuje s některým z jejích nepřátel v regionu). */
export function zoneSides(state, o, r) {
  const z = state.air && state.air.az && state.air.az[r];
  let m = 0, e = 0;
  if (!z) return { m, e };
  const ps = Object.keys(z).map(Number), foes = ps.filter((p) => p !== o && atWar(state.mil, o, p));
  for (const p of ps) {
    if (p === o) m += z[p];
    else if (foes.includes(p)) e += z[p];
    else if (foes.some((q) => atWar(state.mil, p, q))) m += z[p];
  }
  return { m, e };
}

/** Podíl převahy země `o` (a spojenců) v regionu `r` (0–1), nebo null, když tam nikdo nelétá. */
export function airSupOf(state, o, r) {
  const { m, e } = zoneSides(state, o, r);
  return m + e > 0 ? m / (m + e) : null;
}

const penCache = new WeakMap();   // air.az → { wars, map: `o:r` → postih }
/** Nepřátelská převaha nad regionem `r` pro divize země `o`: 0 (nic) až 1 (úplná); počítá se od 50 % podílu nepřátel. */
export function airPenalty(state, o, r) {
  const az = state.air && state.air.az;
  if (!az || !az[r]) return 0;
  let c = penCache.get(az);
  if (!c || c.wars !== state.mil.wars) { c = { wars: state.mil.wars, map: new Map() }; penCache.set(az, c); }
  const k = o * 100000 + r;
  let v = c.map.get(k);
  if (v === undefined) {
    const { m, e } = zoneSides(state, o, r);
    v = e >= AIR.AZ_MIN ? Math.max(0, (e / (m + e) - 0.5) * 2) : 0;
    c.map.set(k, v);
  }
  return v;
}

/** Poškození továren státu `s` (0–`AIR.DMG_MAX`) strategickým bombardováním. */
export const bombDamageOf = (ind, s) => (ind && ind.dmg && ind.dmg[s]) || 0;

/** Úroveň protiletadlové obrany státu. */
export const aaOf = (ind, s) => (ind.st[s] && ind.st[s].aa) || 0;
