// Příkazy letectva (M30): čisté funkce `(state, …) → state`; neplatný vstup vrací tentýž objekt. Letiště se staví příkazem průmyslu `build(state, s, 'afb')`.
// Příkazy nehlídají vlastnictví vůči hráči – to dělá `ui/actions.js` (engine je neutrální pro AI).
import { getWorld } from '../world.js';
import { AIR } from './constants.js';
import { PLANES } from '../../data/air/planes.js';
import { isUnlocked } from '../research/core.js';
import { atWar } from '../army/war.js';
import { afbOf, capacityOf, planesAt, stateKm, roleOk } from './core.js';

const isInt = (n) => Number.isInteger(n);
const patch = (state, p) => ({ ...state, air: { ...state.air, ...p, ver: state.air.ver + 1 } });
const validOwner = (w, o) => isInt(o) && o >= 1 && o < w.owners.length;
const ownBase = (state, o, s) => {
  const w = getWorld();
  return isInt(s) && s >= 1 && s < w.states.length && state.stateOwner[s] === o && state.ctrl[w.states[s].cap] === o;
};

/** Volné místo na letišti státu `s` pro letadla země `o`. */
export function baseFree(state, o, s) {
  return capacityOf(state.ind, s) - (planesAt(state, o).get(s) || 0);
}

/** Sestaví křídlo `n` letadel typu `t` z rezervy na letišti státu `s`. */
export function formWing(state, o, t, n, s) {
  const w = getWorld(), air = state.air;
  if (!validOwner(w, o) || !PLANES[t] || !isInt(n) || n < 1 || n > AIR.FORM_MAX) return state;
  if (!isUnlocked(state, o, PLANES[t].unlock) || (air.pool[o][t] || 0) < n) return state;
  if (!ownBase(state, o, s) || !afbOf(state.ind, s) || n > baseFree(state, o, s)) return state;
  if (air.wings.filter((x) => x && x.o === o).length >= AIR.WINGS_MAX) return state;
  const id = air.wings.length;
  const pool = air.pool.slice();
  pool[o] = { ...pool[o], [t]: pool[o][t] - n };
  return patch(state, { wings: [...air.wings, { id, o, t, n, s, m: null, to: 0, c: 0, a: 0 }], pool, wn: id });
}

/** Rozpustí křídlo: letadla se vrátí do rezervy země. */
export function disbandWing(state, id) {
  const wg = state.air.wings[id];
  if (!wg) return state;
  const pool = state.air.pool.slice();
  pool[wg.o] = { ...pool[wg.o], [wg.t]: (pool[wg.o][wg.t] || 0) + wg.n };
  const wings = state.air.wings.slice();
  wings[id] = null;
  return patch(state, { wings, pool });
}

/** Doplní křídlo `n` letadly z rezervy (do kapacity letiště). */
export function reinforceWing(state, id, n) {
  const wg = state.air.wings[id];
  if (!wg || !isInt(n) || n < 1 || (state.air.pool[wg.o][wg.t] || 0) < n || wg.n + n > AIR.FORM_MAX) return state;
  if (!ownBase(state, wg.o, wg.s) || n > baseFree(state, wg.o, wg.s)) return state;
  const pool = state.air.pool.slice();
  pool[wg.o] = { ...pool[wg.o], [wg.t]: pool[wg.o][wg.t] - n };
  const wings = state.air.wings.slice();
  wings[id] = { ...wg, n: wg.n + n };
  return patch(state, { wings, pool });
}

/** Přesune křídlo na jiné vlastní letiště se stejným nebo větším volným místem; mise se ruší. */
export function rebaseWing(state, id, s) {
  const wg = state.air.wings[id];
  if (!wg || s === wg.s || !ownBase(state, wg.o, s) || !afbOf(state.ind, s) || wg.n > baseFree(state, wg.o, s)) return state;
  const wings = state.air.wings.slice();
  wings[id] = { ...wg, s, m: null, to: 0 };
  return patch(state, { wings, });
}

/** Proč křídlo nemůže plnit misi `m` ve státě `to` (česky), jinak null. `m` = null ruší misi. */
export function missionBlock(state, id, m, to) {
  const wg = state.air.wings[id], w = getWorld();
  if (!wg) return 'Křídlo neexistuje.';
  if (!m) return null;
  if (!roleOk(wg.t, m)) return 'Tento typ letadel tuto misi nelétá.';
  if (!isInt(to) || to < 1 || to >= w.states.length) return 'Zvolte cílový stát.';
  const km = stateKm(wg.s, to);
  if (km > PLANES[wg.t].range) return `Mimo dolet (${Math.round(km)} z ${PLANES[wg.t].range} km).`;
  if (m === 'bomb') {
    const e = state.stateOwner[to];
    if (!e || !atWar(state.mil, wg.o, e)) return 'Bombardovat lze jen stát země, se kterou jste ve válce.';
  }
  return null;
}

/** Zadá misi křídlu: 'air' (hlídky nad státem), 'cas' (podpora boje ve státě), 'bomb' (bombardování nepřátelského státu) nebo null (klid). */
export function setMission(state, id, m, to = 0) {
  const wg = state.air.wings[id];
  if (!wg || missionBlock(state, id, m, to)) return state;
  const nm = m || null, nt = m ? to : 0;
  if (wg.m === nm && wg.to === nt) return state;
  const wings = state.air.wings.slice();
  wings[id] = { ...wg, m: nm, to: nt };
  return patch(state, { wings });
}
