// Denní krok letectva (M30), po půlnoci: ztráta letišť → vzdušné boje hlídek → krytí misí → podpora pozemních bojů (`air.sup`) → bombardování → opotřebení.
// Bez náhody: ztráty se zaokrouhlují s přenosem zbytku (`c`) v křídle.
import { getWorld } from '../world.js';
import { AIR } from './constants.js';
import { PLANES } from '../../data/air/planes.js';
import { atWar } from '../army/war.js';
import { afbOf, radarOf, levelMult, seasOfState } from './core.js';
import { docMods } from '../doc/core.js';
import { logAdd } from '../log.js';
import { rand01 } from '../nat/core.js';
import { fuelAirMult } from '../fuel/index.js';
import { nukeProduction } from './nuke.js';
import { modsOf as techModsOf } from '../research/core.js';
import { designMultOf } from '../design/core.js';
import { zonePowers, aaOf } from './zones.js';

const DFIELD = { atk: 'atk', cas: 'cas', bomb: 'bomb' };   // M97: pole síly letounu → násobek návrhu
import { planesOf, coastStatesOf, powerOf } from '../nav/core.js';
const fleetPowerHp = (f) => powerOf(f.ships).hp;
import { NAV } from '../nav/constants.js';

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
  const power = (wg, field) => wg.n * PLANES[wg.t][field] * levelMult(state, wg.o, wg.t) * (1 + AIR.ACE_BONUS * (wg.a || 0)) * fuelAirMult(state, wg.o) * (1 + (dmul[field] ? docMods(state, wg.o)[dmul[field]] : 0)) * (1 + techModsOf(state, wg.o).air) * (DFIELD[field] ? designMultOf(state, wg.o, wg.t)[DFIELD[field]] : 1);   // M96: letecké technologie; M97: návrh varianty
  for (const wg of wings) if (wg && wg.m === 'air') patrol.set(key(wg.o, wg.to), (patrol.get(key(wg.o, wg.to)) || 0) + power(wg, 'atk'));
  // F4c: stíhání – stíhači nad státem napadají jen bombardéry, bitevní letouny a úderná letadla (ne hlídky)
  const intc = new Map();
  for (const wg of wings) if (wg && wg.m === 'int') intc.set(key(wg.o, wg.to), (intc.get(key(wg.o, wg.to)) || 0) + power(wg, 'atk') * AIR.INT_MULT);
  const foesInt = (o, s) => { let e = 0; for (const [k, v] of intc) { const [p, z] = k.split(':').map(Number); if (z === s && p !== o && atWar(state.mil, o, p)) e += v; } return e; };
  const strikers = new Set();   // `${o}:${s}` – země s údernými misemi nad státem (stíhání má co stíhat)
  for (const wg of wings) if (wg && (wg.m === 'cas' || wg.m === 'bomb' || wg.m === 'nav')) strikers.add(key(wg.o, wg.to));
  const enemyStrikes = (o, s) => { for (const k of strikers) { const [p, z] = k.split(':').map(Number); if (z === s && p !== o && atWar(state.mil, o, p)) return true; } return false; };
  // F4c: úder na lodě – nepřátelské flotily v mořích u cílového státu
  const fleetsNear = (o, s) => (state.nav ? state.nav.fleets.map((f, i) => (f && atWar(state.mil, o, f.o) && seasOfState(s).includes(f.p) ? i : 0)).filter(Boolean) : []);
  const navStrikes = [];
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
    } else if (wg.m === 'int') {
      if (enemyStrikes(wg.o, wg.to)) frac += AIR.LOSS_INT * 0.5;   // F4c: stíhači utrží ztráty jen v boji s údernými letadly
    } else {
      const rocket = !!PLANES[wg.t].rocket;   // M82: raketu nikdo nezastaví, ale letí jen jednou
      const cov = rocket ? 1 : cover(wg.o, wg.to, e + foesInt(wg.o, wg.to));   // F4c: nepřátelské stíhání oslabí krytí úderných misí
      frac = rocket ? AIR.ROCKET_USE : frac + AIR.LOSS_INT * (1 - cov);
      const tgt = state.stateOwner[wg.to];   // S8: protiletadlová obrana nepřátelského státu sestřeluje bombardéry a bitevní letouny
      if (!rocket && (wg.m === 'bomb' || wg.m === 'cas') && tgt && tgt !== wg.o && atWar(state.mil, wg.o, tgt)) frac += AIR.AA_LOSS * aaOf(state.ind, wg.to);
      if (wg.m === 'nav') {
        const near = fleetsNear(wg.o, wg.to);
        if (near.length) { frac += AIR.LOSS_NAV; navStrikes.push({ ids: near, p: power(wg, 'cas') * cov }); }
      }
      if (wg.m === 'cas') {
        sup[key(wg.o, wg.to)] = (sup[key(wg.o, wg.to)] || 0) + power(wg, 'cas') * cov;
      } else if (wg.m === 'bomb') {
        const t = state.stateOwner[wg.to];
        if (t && atWar(state.mil, wg.o, t)) {
          const b = bombs.get(t) || { p: 0, from: wg.o, s: wg.to, st: new Map() };
          const v = power(wg, 'bomb') * cov;
          b.p += v;
          b.st.set(wg.to, (b.st.get(wg.to) || 0) + v);   // S8: síla nad jednotlivými státy (poškození továren)
          bombs.set(t, b);
        }
      }
    }
    const raw = wg.n * frac + wg.c;
    const lost = Math.min(wg.n, Math.floor(raw));
    wings[id] = lost || raw !== wg.c || newA !== (wg.a || 0) ? { ...wg, n: wg.n - lost, c: raw - lost, a: newA } : wg;
    if (wings[id].n <= 0) wings[id] = null;
  }
  // M90: palubní letouny válčících flotil podporují boje ve státech s pobřežím v mořské oblasti flotily (ne v den, kdy flotila sama bojuje s nepřátelským loďstvem)
  if (state.nav) for (const f of state.nav.fleets) {
    if (!f || !(f.pl > 0) || !state.mil.wars.some(([a, b]) => a === f.o || b === f.o)) continue;
    const pl = planesOf(f);
    if (!pl || state.nav.fleets.some((x) => x && x.p === f.p && atWar(state.mil, f.o, x.o))) continue;
    const v = pl * PLANES.pal.cas * NAV.PLANE_CAS * fuelAirMult(state, f.o);
    for (const s of coastStatesOf(f.p)) sup[key(f.o, s)] = (sup[key(f.o, s)] || 0) + v;   // bonus platí divizím vlastníka flotily v pobřežním státě
  }
  // F4c: poškození flotil z úderů na lodě (rozdělené podle odolnosti zasažených flotil)
  let nav = state.nav;
  if (navStrikes.length && nav) {
    const fleets = nav.fleets.slice();
    for (const st of navStrikes) {
      let hp = 0;
      for (const i of st.ids) if (fleets[i]) hp += fleetPowerHp(fleets[i]);
      if (hp <= 0) continue;
      const dmg = Math.min(AIR.NAV_DMG_MAX, AIR.NAV_K * st.p / hp);
      for (const i of st.ids) if (fleets[i]) fleets[i] = { ...fleets[i], dm: Math.round(Math.min(NAV.DMG_MAX, (fleets[i].dm || 0) + dmg) * 1000) / 1000 };
    }
    nav = { ...nav, fleets, ver: nav.ver + 1 };
  }
  const supOut = {};
  for (const k in sup) supOut[k] = Math.min(AIR.CAS_MAX, sup[k] * AIR.CAS_COEF);

  // 4) bombardování: podpora války, stabilita a sklady cíle; S8: poškození továren bombardovaného státu (`ind.dmg`, menší s protiletadlovou obranou)
  let pol = state.pol, mil = state.mil, next = state, dmg = state.ind.dmg || {}, dmgOwn = false;
  for (const [t, b] of bombs) {
    for (const [s, v] of b.st) {
      if (state.stateOwner[s] !== t || state.ctrl[w.states[s].cap] !== t) continue;   // okupovaný stát okupant nebombarduje kvůli továrnám
      const d = Math.min(AIR.BOMB_DMG_DAY, v * AIR.BOMB_DMG) * Math.max(0, 1 - AIR.AA_RED * aaOf(state.ind, s));
      if (!(d > 0)) continue;
      if (!dmgOwn) { dmg = { ...dmg }; dmgOwn = true; }
      dmg[s] = Math.round(Math.min(AIR.DMG_MAX, (dmg[s] || 0) + d) * 1000) / 1000;
    }
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
  const az = zonePowers(w, patrol, intc);   // S8: vzdušné zóny (stejný objekt, když se nic nezměnilo)
  const out = { ...air, wings, pool, sup: changedSup ? supOut : air.sup, az: JSON.stringify(az) === JSON.stringify(air.az) ? air.az : az, ver: air.ver + 1 };
  const made = nukeProduction(state);   // M82: výroba atomových bomb
  if (made) out.nuke = made.nuke;
  const player = state.player ? w.ownerIdx[state.player] : 0;
  let res = { ...next, pol, mil, air: out, ...(nav !== state.nav ? { nav } : {}), ...(dmgOwn ? { ind: { ...next.ind, dmg, ver: next.ind.ver + 1 } } : {}) };
  for (const a of aces) if (a.o === player) res = logAdd(res, a);
  if (made) for (const o of made.ready) if (o === player) res = logAdd(res, { k: 'nukeready', o });
  return res;
}
