// S9: přestavby flotil (jako v HOI4). Flotila si pamatuje úrovně techniky a návrhy svých typů lodí z doby stavby nebo poslední
// přestavby (`f.lv` = { typ: úroveň, des: { typ: návrh } }, stejný tvar jako `mil.lv[o]`); novinky z výzkumu a návrháře se projeví
// až po přestavbě v přístavu s námořní základnou (`f.rf` = zbývající dny). Během přestavby flotila neplují, v boji má poloviční sílu
// a zabírá loděnice (`refitDok`). Čisté funkce a příkazy (neplatný vstup = tentýž stav).
import { getWorld } from '../world.js';
import { SHIP_IDS } from '../../data/navy/index.js';
import { NAV } from './constants.js';
import { logAdd } from '../log.js';

/** Snímek úrovní a návrhů typů lodí `ships` země `o` (pro `f.lv`). */
export function shipLvSnap(state, o, ships) {
  const lv = (state.mil.lv && state.mil.lv[o]) || {}, out = {}, des = {};
  for (const id of SHIP_IDS) {
    if (!ships[id]) continue;
    out[id] = lv[id] || 1;
    if (lv.des && lv.des[id]) des[id] = lv.des[id];
  }
  if (Object.keys(des).length) out.des = des;
  return out;
}

/** Typy lodí flotily, které zastaraly (nižší úroveň nebo jiný návrh než má země teď). */
export function refitNeed(state, f) {
  if (!f || !f.lv) return [];
  const lv = (state.mil.lv && state.mil.lv[f.o]) || {}, out = [];
  for (const id of SHIP_IDS) {
    if (!f.ships[id]) continue;
    const cur = lv[id] || 1, des = lv.des && lv.des[id], old = f.lv.des && f.lv.des[id];
    if ((f.lv[id] || 1) < cur || JSON.stringify(des || null) !== JSON.stringify(old || null)) out.push(id);
  }
  return out;
}

/** Nejvyšší úroveň námořní základny v přístavech oblasti `label`, které ovládá země `o`. */
export function refitBaseAt(state, o, label) {
  const w = getWorld();
  let best = 0;
  for (let p = 1; p <= w.L; p++) {
    if (!w.portLevel[p] || w.portSea[p] !== label || state.ctrl[p] !== o) continue;
    const st = state.ind && state.ind.st[w.provState[p]];
    best = Math.max(best, (st && st.nb) || 0);
  }
  return best;
}

/** Proč flotilu nejde přestavět (český text), nebo null. */
export function refitBlock(state, id) {
  const f = state.nav.fleets[id];
  if (!f) return 'Flotila neexistuje.';
  if (f.rf) return 'Flotila se už přestavuje.';
  if (!refitNeed(state, f).length) return 'Flotila je moderní – není co přestavovat.';
  if (f.path.length) return 'Flotila je na cestě – nejdřív ji zastavte v přístavu.';
  if (!refitBaseAt(state, f.o, f.p)) return 'Přestavba jen v oblasti s vlastním přístavem s námořní základnou.';
  return null;
}

/** Dní přestavby flotily `f` (rychleji s vyšší úrovní námořní základny). */
export const refitDaysOf = (state, f) => Math.ceil(NAV.REFIT_DAYS * (1 - 0.1 * Math.max(0, refitBaseAt(state, f.o, f.p) - 1)));

/** Zahájí přestavbu: flotila zůstane v přístavu `refitDaysOf` dní, mise se zruší. */
export function refitFleet(state, id) {
  if (refitBlock(state, id)) return state;
  const f = state.nav.fleets[id], fleets = state.nav.fleets.slice();
  fleets[id] = { ...f, rf: refitDaysOf(state, f), m: '' };
  return { ...state, nav: { ...state.nav, fleets, ver: state.nav.ver + 1 } };
}

/** Loděnice země `o` zabrané přestavbami (chybí výrobním linkám lodí). */
export function refitDok(state, o) {
  let n = 0;
  for (const f of state.nav.fleets) if (f && f.o === o && f.rf) for (const id in f.ships) n += f.ships[id];
  return Math.ceil(n * NAV.REFIT_DOK);
}

/** Denní krok přestaveb: odpočet dnů; hotová flotila dostane nový snímek úrovní; ztráta základny přestavbu přeruší. */
export function refitDay(state) {
  let fleets = state.nav.fleets, copy = false, out = state;
  const done = [];
  for (let i = 1; i < fleets.length; i++) {
    const f = fleets[i];
    if (!f || !f.rf) continue;
    if (!copy) { fleets = fleets.slice(); copy = true; }
    if (!refitBaseAt(state, f.o, f.p)) { const nf = { ...f }; delete nf.rf; fleets[i] = nf; continue; }
    if (f.rf > 1) { fleets[i] = { ...f, rf: f.rf - 1 }; continue; }
    const nf = { ...f, lv: shipLvSnap(state, f.o, f.ships) };
    delete nf.rf;
    fleets[i] = nf;
    done.push(f);
  }
  if (!copy) return state;
  out = { ...state, nav: { ...state.nav, fleets, ver: state.nav.ver + 1 } };
  const w = getWorld(), me = state.player ? w.ownerIdx[state.player] : 0;
  for (const f of done) if (f.o === me) out = logAdd(out, { k: 'refit', o: f.o, x: f.nm });
  return out;
}

/** Snímek úrovní pro všechny flotily (nová hra, po scénáři). */
export function snapFleets(state) {
  const fleets = state.nav.fleets.map((f) => (f ? { ...f, lv: shipLvSnap(state, f.o, f.ships) } : f));
  return { ...state, nav: { ...state.nav, fleets } };
}
