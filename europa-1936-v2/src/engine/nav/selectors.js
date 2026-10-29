// Dotazy na námořnictvo pro rozhraní a AI (čisté, bez změn stavu).
import { getWorld } from '../world.js';
import { SHIPS, SHIP_IDS } from '../../data/navy/index.js';
import { powerOf, fleetSpeed, transportsOf, homeSea, seaBlocked } from './core.js';

const idxOf = (o) => (typeof o === 'string' ? getWorld().ownerIdx[o] : o);

/** Souhrn námořnictva země: rezerva, flotily (se silou a polohou), transportní kapacita, divize na moři, loděnice. */
export function navyOf(state, o) {
  o = idxOf(o);
  const w = getWorld();
  const fleets = [];
  for (let i = 1; i < state.nav.fleets.length; i++) {
    const f = state.nav.fleets[i];
    if (!f || f.o !== o) continue;
    const pw = powerOf(f.ships);
    fleets.push({ id: i, ...f, hp: pw.hp, atk: pw.atk, count: pw.n, speed: fleetSpeed(f.ships), at: w.seaName(f.p), moving: f.path.length > 0, dest: f.to ? w.seaName(f.to) : '', blocked: seaBlocked(state, o, f.p) });
  }
  const pool = state.nav.pool[o];
  const sail = state.nav.sail.filter((s) => s.o === o).map((s) => ({ ...s, left: Math.max(0, Math.ceil(s.arrive - state.tick)) }));
  const home = homeSea(state, o);
  const total = { };
  for (const k of SHIP_IDS) total[k] = (pool[k] || 0) + fleets.reduce((a, f) => a + (f.ships[k] || 0), 0);
  return { o, fleets, pool, total, sail, transports: transportsOf(state, o), home: home ? { ...home, name: w.seaName(home.sea) } : null, ships: SHIPS };
}

/** Flotily všech zemí v mořské oblasti `label` (pro tooltip a kartu moře). */
export function fleetsInSea(state, label) {
  const out = [];
  for (let i = 1; i < state.nav.fleets.length; i++) { const f = state.nav.fleets[i]; if (f && f.p === label) out.push({ id: i, ...f, ...powerOf(f.ships) }); }
  return out;
}
