// Příkazy námořnictva (M27): čisté funkce `(state, …) → state`; neplatný vstup vrací tentýž objekt. Země jsou indexy.
// Příkazy nehlídají, komu věc patří vůči hráči – to dělá `ui/actions.js`.
import { getWorld } from '../world.js';
import { SHIP_IDS } from '../../data/navy/index.js';
import { cleanName } from '../army/commands.js';
import { atWar } from '../army/war.js';
import { NAV } from './constants.js';
import { homeSea, powerOf, seaRoute, seaBlocked, transportsOf, coastSeasOf, isSeaLabel } from './core.js';

const patch = (state, p) => ({ ...state, nav: { ...state.nav, ...p, ver: state.nav.ver + 1 } });
const ok = (state, o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length && !!state.nav.pool[o];

/** Sestaví flotilu z lodí v rezervě (`ships` = { druh: počet }) v domovské oblasti. */
export function formFleet(state, o, ships, nm = '') {
  if (!ok(state, o) || !ships || typeof ships !== 'object') return state;
  const pool = state.nav.pool[o];
  let total = 0;
  for (const k in ships) {
    const n = ships[k];
    if (!SHIP_IDS.includes(k) || !Number.isInteger(n) || n < 0 || n > (pool[k] || 0)) return state;
    total += n;
  }
  if (total < 1) return state;
  if (state.nav.fleets.filter((f) => f && f.o === o).length >= NAV.FLEET_MAX) return state;
  const home = homeSea(state, o);
  if (!home) return state;
  const clean = {};
  const rest = { ...pool };
  for (const k of SHIP_IDS) if (ships[k]) { clean[k] = ships[k]; rest[k] -= ships[k]; }
  const poolArr = state.nav.pool.slice();
  poolArr[o] = rest;
  const id = state.nav.fn + 1;
  const fleet = { o, nm: cleanName(nm) || `${id}. flotila`, p: home.sea, ships: clean, c: {}, mx: powerOf(clean).hp, to: 0, path: [], prog: 0 };
  return patch(state, { fn: id, pool: poolArr, fleets: [...state.nav.fleets, ...new Array(id - state.nav.fleets.length).fill(null), fleet] });
}

/** Rozpustí flotilu v domovské oblasti: lodě se vrátí do rezervy. */
export function disbandFleet(state, id) {
  const f = fleetOf(state, id);
  if (!f) return state;
  const home = homeSea(state, f.o);
  if (!home || f.p !== home.sea) return state;
  const poolArr = state.nav.pool.slice();
  const rest = { ...poolArr[f.o] };
  for (const k in f.ships) rest[k] = (rest[k] || 0) + f.ships[k];
  poolArr[f.o] = rest;
  const fleets = state.nav.fleets.slice();
  fleets[id] = null;
  return patch(state, { pool: poolArr, fleets });
}

export const fleetOf = (state, id) => (Number.isInteger(id) && id > 0 && id < state.nav.fleets.length ? state.nav.fleets[id] : null);

/** Přejmenuje flotilu. */
export function renameFleet(state, id, nm) {
  const f = fleetOf(state, id), name = cleanName(nm);
  if (!f || !name || name === f.nm) return state;
  const fleets = state.nav.fleets.slice();
  fleets[id] = { ...f, nm: name };
  return patch(state, { fleets });
}

/** Pošle flotilu do mořské oblasti `label` (cesta po mořských oblastech). */
export function orderFleet(state, id, label) {
  const f = fleetOf(state, id);
  if (!f || !isSeaLabel(label)) return state;
  if (label === f.p) return f.path.length ? setFleet(state, id, { to: 0, path: [], prog: 0 }) : state;
  const r = seaRoute(f.p, new Set([label]), null);
  if (!r) return state;
  return setFleet(state, id, { to: label, path: r.path, prog: 0 });
}

/** Zastaví flotilu v aktuální oblasti. */
export function stopFleet(state, id) {
  const f = fleetOf(state, id);
  if (!f || !f.path.length) return state;
  return setFleet(state, id, { to: 0, path: [], prog: 0 });
}

function setFleet(state, id, p) {
  const fleets = state.nav.fleets.slice();
  fleets[id] = { ...fleets[id], ...p };
  return patch(state, { fleets });
}

/** Proč divize nemohou vyplout (český text), nebo null. Pomocná funkce rozhraní i příkazu. */
export function sailBlock(state, divIds, dest) {
  const w = getWorld(), mil = state.mil;
  if (!Array.isArray(divIds) || !divIds.length) return 'Nejsou vybrané žádné divize.';
  if (!Number.isInteger(dest) || !w.isLand(dest)) return 'Cíl musí být pevninská provincie.';
  const first = mil.divs[divIds[0]];
  if (!first) return 'Divize neexistuje.';
  const o = first.o;
  const caps = transportsOf(state, o);
  if (divIds.length > caps.free) return `Chybí transportní lodě (volných ${caps.free}, potřeba ${divIds.length}).`;
  const coast = coastSeasOf(dest);
  if (!coast.length) return 'Cíl není na pobřeží.';
  const c = state.ctrl[dest];
  if (c !== o) {
    if (!atWar(mil, o, c)) return 'Na cizí neutrální území se vylodit nelze.';
    for (const d of mil.divs) if (d && d.p === dest && atWar(mil, o, d.o)) return 'Cíl hájí nepřátelské divize – vylodění jen na nehájenou provincii.';
  }
  for (const id of divIds) {
    const d = mil.divs[id];
    if (!d || d.o !== o) return 'Divize patří různým zemím nebo neexistuje.';
    if (d.b) return 'Divize v boji nemůže vyplout.';
    if (!w.portLevel[d.p]) return 'Divize musí stát v přístavu.';
    if (state.ctrl[d.p] !== o) return 'Přístav musí ovládat vlastní země.';
  }
  return null;
}

/** Vyšle divize lodní přepravou do pobřežní provincie `dest` (viz SPEC § 4j). Všechny musí stát v přístavech téže země. */
export function orderSail(state, divIds, dest) {
  if (sailBlock(state, divIds, dest)) return state;
  const w = getWorld(), mil = state.mil;
  const o = mil.divs[divIds[0]].o;
  const goals = new Set(coastSeasOf(dest));
  const blocked = (l) => seaBlocked(state, o, l);
  const divs = mil.divs.slice();
  const sail = state.nav.sail.slice();
  for (const id of divIds) {
    const d = mil.divs[id];
    const r = seaRoute(w.portSea[d.p], goals, blocked);
    if (!r) return state;
    const hours = NAV.LOAD_H + Math.ceil(r.km / NAV.TR_SPEED);
    sail.push({ id, o, from: d.p, to: dest, route: [w.portSea[d.p], ...r.path], t0: state.tick, arrive: state.tick + hours, div: d });
    divs[id] = null;
  }
  return { ...state, mil: { ...mil, divs, ver: mil.ver + 1 }, nav: { ...state.nav, sail, ver: state.nav.ver + 1 } };
}
