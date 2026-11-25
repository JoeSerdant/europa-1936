// Denní krok okupace (M38): poddajnost a odboj okupovaných států, ztráty garnizony a povstání. Bez náhody.
import { getWorld } from '../world.js';
import { OCC } from './constants.js';
import { atWar } from '../army/war.js';
import { logAdd } from '../log.js';
import { occLawOf, hasCollab } from './laws.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const r4 = (v) => Math.round(v * 10000) / 10000;

/** Počet divizí podle státu a vlastníka: Map(stát → Map(vlastník → počet)). */
function garrisons(state) {
  const w = getWorld(), m = new Map();
  for (let i = 1; i < state.mil.divs.length; i++) {
    const d = state.mil.divs[i];
    if (!d) continue;
    const s = w.provState[d.p];
    let x = m.get(s);
    if (!x) { x = new Map(); m.set(s, x); }
    x.set(d.o, (x.get(d.o) || 0) + 1);
  }
  return m;
}

/** Potřebná garnizona okupovaného státu (počet divizí). */
export const needOf = (s) => Math.max(1, Math.round(getWorld().states[s].p / OCC.POP_PER_DIV));

export function occDay(state) {
  const w = getWorld(), old = state.occ.st;
  const at = garrisons(state);
  const st = {};
  let changed = false;
  const dmg = new Map();             // id divize → ztráta organizace
  const rebel = [];                  // [stát, původní vlastník, okupant]
  const mpLoss = new Map();          // S7: okupant → ztráta lidské síly posádek
  for (let s = 1; s < w.states.length; s++) {
    const o = state.stateOwner[s], c = state.ctrl[w.states[s].cap];
    if (!o || !c || o === c) { if (old[s]) changed = true; continue; }
    const e = old[s] || { r: OCC.R0, c: 0, g: 0 };
    const here = at.get(s);
    const n = here ? here.get(c) || 0 : 0;
    const law = occLawOf(state, c, o), col = hasCollab(state, c, o);   // S7: okupační zákon a kolaborantská vláda
    const pol = law.pol && (state.mil.man[c] || 0) > 0 ? law.pol : 0;   // posádky (bez lidské síly nejsou)
    const g = Math.min(1, n / needOf(s) + pol);
    if (law.mp) mpLoss.set(c, (mpLoss.get(c) || 0) + needOf(s) * OCC.MP_LOSS * law.mp * e.r);
    const comp = clamp01(e.c + OCC.C_GAIN * (0.4 + 0.6 * g) * law.c + (col ? OCC.COL_C_GAIN : 0));
    const exile = !state.dip.cap[o] && atWar(state.mil, o, c) ? OCC.R_EXILE : 0;
    const target = clamp01((OCC.R_BASE * (1 - comp) + exile) * (1 - OCC.R_GARRISON * g) * law.r * (col ? OCC.COL_R : 1));
    const r = r4(e.r + (target - e.r) * OCC.R_RATE);
    const next = { r, c: r4(comp), g: n };
    if (old[s] && old[s].r === next.r && old[s].c === next.c && old[s].g === next.g) st[s] = old[s]; else { st[s] = next; changed = true; }
    if (r > OCC.R_DMG_FROM && n) for (let i = 1; i < state.mil.divs.length; i++) {
      const d = state.mil.divs[i];
      if (d && d.o === c && w.provState[d.p] === s) dmg.set(i, (r - OCC.R_DMG_FROM) * OCC.R_DMG * 2);
    }
    if (r >= OCC.R_REBEL && g < OCC.G_REBEL && !state.dip.cap[o]) rebel.push([s, o, c]);
  }
  // S7: kolaborantská vláda zaniká, když okupant už žádný stát země nedrží
  let colNew = state.occ.col || {};
  for (const o in colNew) {
    const c = colNew[o];
    let any = false;
    for (const k in st) if (state.stateOwner[k] === +o && state.ctrl[w.states[k].cap] === c) { any = true; break; }
    if (!any) { if (colNew === state.occ.col) colNew = { ...colNew }; delete colNew[o]; changed = true; }
  }
  if (!changed && !dmg.size && !rebel.length && !mpLoss.size && Object.keys(old).length === Object.keys(st).length) return state;
  let next = { ...state, occ: { ...state.occ, st, col: colNew, ver: state.occ.ver + 1 } };
  if (mpLoss.size) {
    const man = next.mil.man.slice();
    for (const [c, v] of mpLoss) man[c] = Math.max(0, man[c] - Math.round(v));
    next = { ...next, mil: { ...next.mil, man } };
  }
  if (dmg.size) {
    const divs = next.mil.divs.slice();
    for (const [i, v] of dmg) divs[i] = { ...divs[i], org: Math.max(0, divs[i].org - v) };
    next = { ...next, mil: { ...next.mil, divs, ver: next.mil.ver + 1 } };
  }
  for (const [s, o, c] of rebel) {
    const ctrl = next.ctrl.slice();
    for (const p of w.states[s].v) if (ctrl[p] === c) ctrl[p] = o;
    const stNew = { ...next.occ.st };
    delete stNew[s];
    next = logAdd({ ...next, ctrl, ownerVer: next.ownerVer + 1, occ: { ...next.occ, st: stNew } }, { k: 'rebel', o, x: c, s });
  }
  return next;
}
