// Denní krok letectva (M30), po půlnoci: ztráta letišť → vzdušné boje hlídek → krytí misí → podpora pozemních bojů (`air.sup`) → bombardování → opotřebení.
// Bez náhody: ztráty se zaokrouhlují s přenosem zbytku (`c`) v křídle.
import { getWorld } from '../world.js';
import { AIR } from './constants.js';
import { PLANES } from '../../data/air/planes.js';
import { atWar } from '../army/war.js';
import { afbOf, radarOf, levelMult } from './core.js';
import { docMods } from '../doc/core.js';
import { logAdd } from '../log.js';
import { rand01 } from '../nat/core.js';

const key = (o, s) => `${o}:${s}`;

export function airDay(state) {
  const air = state.air, w = getWorld();
  const wings = air.wings.slice();
  let pool = air.pool, poolOwn = false;
  const addPool = (o, t, n) => {
    if (!poolOwn) { pool = pool.slice(); poolOwn = true; }
    pool[o] = { ...pool[o], [t]: (pool[o][t] || 0) + n };
  };

  // 1) křídla na ztraceném letišti: část letadel zanikne, zbytek do rezervy
  for (let id = 1; id < wings.length; id++) {
    const wg = wings[id];
    if (!wg) continue;
    const ok = state.stateOwner[wg.s] === wg.o && state.ctrl[w.states[wg.s].cap] === wg.o && afbOf(state.ind, wg.s) > 0;
    if (!ok) { addPool(wg.o, wg.t, Math.floor(wg.n * (1 - AIR.LOST_BASE_LOSS))); wings[id] = null; }
  }

  // 2) síla hlídek podle země a cílového státu
  const patrol = new Map();      // `${o}:${s}` → síla
  const dmul = { atk: 'patrol', cas: 'cas', bomb: 'bomb' };
  const power = (wg, field) => wg.n * PLANES[wg.t][field] * levelMult(state, wg.o, wg.t) * (1 + AIR.ACE_BONUS * (wg.a || 0)) * (1 + (dmul[field] ? docMods(state, wg.o)[dmul[field]] : 0));
  for (const wg of wings) if (wg && wg.m === 'air') patrol.set(key(wg.o, wg.to), (patrol.get(key(wg.o, wg.to)) || 0) + power(wg, 'atk'));
  const foesPatrol = (o, s) => {
    let e = 0;
    for (const [k, v] of patrol) { const [p, z] = k.split(':').map(Number); if (z === s && p !== o && atWar(state.mil, o, p)) e += v; }
    const t = state.stateOwner[s];   // M50: radar státu nad kterým nepřítel operuje
    if (t && t !== o && atWar(state.mil, o, t)) e += radarOf(state.ind, s) * AIR.RADAR_K;
    return e;
  };
  const cover = (o, s, e) => ((patrol.get(key(o, s)) || 0) + AIR.COVER_K) / ((patrol.get(key(o, s)) || 0) + e + AIR.COVER_K);

  // 3) mise: ztráty, podpora pozemních bojů, bombardování
  const sup = {};
  const aces = [];
  const bombs = new Map();       // `${e}` → { power, from, s }
  for (let id = 1; id < wings.length; id++) {
    const wg = wings[id];
    if (!wg || !wg.m) continue;
    const e = foesPatrol(wg.o, wg.to);
    let frac = AIR.ATTRITION, newA = wg.a || 0;
    if (wg.m === 'air') {
      const mine = patrol.get(key(wg.o, wg.to)) || 0;
      if (e > 0) {
        frac += AIR.LOSS_AIR * (e / (e + mine));
        const a = wg.a || 0;   // M52: letečtí esa vznikají v bojích; šance klesá s dosaženým stupněm
        if (a < AIR.ACE_MAX && rand01(state.tick, wg.id, 'ace') < AIR.ACE_CHANCE * (e / (e + mine)) / (1 + a)) {
          newA = a + 1;
          aces.push({ k: 'ace', o: wg.o, x: wg.t, y: newA });
        }
      }
    } else {
      const cov = cover(wg.o, wg.to, e);
      frac += AIR.LOSS_INT * (1 - cov);
      if (wg.m === 'cas') {
        sup[key(wg.o, wg.to)] = (sup[key(wg.o, wg.to)] || 0) + power(wg, 'cas') * cov;
      } else if (wg.m === 'bomb') {
        const t = state.stateOwner[wg.to];
        if (t && atWar(state.mil, wg.o, t)) {
          const b = bombs.get(t) || { p: 0, from: wg.o, s: wg.to };
          b.p += power(wg, 'bomb') * cov;
          bombs.set(t, b);
        }
      }
    }
    const raw = wg.n * frac + wg.c;
    const lost = Math.min(wg.n, Math.floor(raw));
    wings[id] = lost || raw !== wg.c || newA !== (wg.a || 0) ? { ...wg, n: wg.n - lost, c: raw - lost, a: newA } : wg;
    if (wings[id].n <= 0) wings[id] = null;
  }
  const supOut = {};
  for (const k in sup) supOut[k] = Math.min(AIR.CAS_MAX, sup[k] * AIR.CAS_COEF);

  // 4) bombardování: podpora války, stabilita a sklady cíle
  let pol = state.pol, mil = state.mil, next = state;
  for (const [t, b] of bombs) {
    const ws = Math.min(AIR.BOMB_WS_MAX, b.p * AIR.BOMB_WS), st = Math.min(AIR.BOMB_STOCK_MAX, b.p * AIR.BOMB_STOCK);
    const own = pol.own.slice();
    own[t] = { ...own[t], ws: Math.max(0, own[t].ws - ws), stab: Math.max(0, own[t].stab - ws * 0.3) };
    pol = { ...pol, own };
    const stock = mil.stock[t];
    if (stock) {
      const ns = {};
      for (const e in stock) ns[e] = Math.floor(stock[e] * (1 - st));
      const all = mil.stock.slice(); all[t] = ns;
      mil = { ...mil, stock: all };
    }
    if (state.player && w.ownerIdx[state.player] === t) next = logAdd({ ...next, pol, mil }, { k: 'bombed', o: t, x: b.from, s: b.s });
  }
  // 5) výsledek: zrušená křídla s nulou letadel nezůstávají
  const changedSup = JSON.stringify(supOut) !== JSON.stringify(air.sup);
  const out = { ...air, wings, pool, sup: changedSup ? supOut : air.sup, ver: air.ver + 1 };
  const player = state.player ? w.ownerIdx[state.player] : 0;
  let res = { ...next, pol, mil, air: out };
  for (const a of aces) if (a.o === player) res = logAdd(res, a);
  return res;
}
