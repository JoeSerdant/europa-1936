// Dotazy na okupaci pro rozhraní (čisté).
import { OCC } from './constants.js';
import { needOf } from './day.js';

/** Okupace státu `s`: { r (odboj 0–1), c (poddajnost 0–1), n (divize garnizony), need (potřebná garnizona) } nebo null. */
export function occupationOf(state, s) {
  const e = state.occ && state.occ.st[s];
  return e ? { r: e.r, c: e.c, n: e.g, need: needOf(s) } : null;
}
/** Podíl těžby okupovaného státu, který dostane okupant, podle poddajnosti. */
export const occResFactor = (comp) => OCC.RES_BASE + (1 - OCC.RES_BASE) * comp;
