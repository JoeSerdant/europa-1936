// Scénáře (M39): `applyScenario(state, id)` upraví základní stav 1936 podle dat (data/scenarios.js): přesuny států, zaniklé země, růst průmyslu a vojska,
// technologie, bloky a války a čas. Čistá funkce bez náhody; scénář 1936 vrací stav beze změny.
import { getWorld } from './world.js';
import { SCENARIOS } from '../data/scenarios.js';
import { COUNTRIES } from '../data/countries.js';
import { DEFAULT_SPLIT } from '../data/industry/index.js';
import { EQUIP } from '../data/army/equipment.js';
import { TECHS, TECH_IDS } from '../data/research/index.js';
import { apportion } from './industry/setup.js';
import { I } from './industry/constants.js';
import { slotsOf } from './industry/core.js';
import { disband, declareWar } from './army/commands.js';
import { grantTech } from './research/commands.js';
import { AIR } from './air/constants.js';
import { PLANE_IDS } from '../data/air/planes.js';

const growthOf = (sc, tag) => sc.growth[tag] || sc.growth.default;

/** Převede stát `s` na zemi `to`: vlastnictví i kontrola provincií; jednotky původního vlastníka v něm zaniknou. */
function transferState(state, s, to) {
  const w = getWorld(), from = state.stateOwner[s];
  if (!from || from === to) return state;
  const stateOwner = state.stateOwner.slice(), ctrl = state.ctrl.slice();
  stateOwner[s] = to;
  for (const p of w.states[s].v) ctrl[p] = to;
  const ids = [];
  const provs = new Set(w.states[s].v);
  for (let i = 1; i < state.mil.divs.length; i++) { const d = state.mil.divs[i]; if (d && d.o === from && provs.has(d.p)) ids.push(i); }
  const next = { ...state, stateOwner, ctrl, ownerVer: state.ownerVer + 1 };
  return ids.length ? disband(next, ids) : next;
}

/** Zvětší počet továren země podle násobků; vojenské linky se přepočítají podle výchozího rozdělení. */
function growIndustry(state, o, g) {
  const w = getWorld();
  const st = state.ind.st.map((e) => (e ? { ...e } : e));
  const own = [];
  for (let s = 1; s < w.states.length; s++) if (state.stateOwner[s] === o) own.push(s);
  if (!own.length) return state;
  const sumOf = (k) => own.reduce((a, s) => a + st[s][k], 0);
  const free = (s) => slotsOf(state.ind, s) - st[s].civ - st[s].mil - (st[s].dok || 0);
  for (const [k, f] of [['civ', g.ind], ['mil', g.mil]]) {
    const add = Math.round(sumOf(k) * (f - 1));
    if (add <= 0) continue;
    const got = apportion(own.map((s) => st[s][k] + 0.5), add, own.map((s) => Math.max(0, free(s))));
    own.forEach((s, i) => { st[s][k] += got[i]; });
  }
  const mil = sumOf('mil');
  let jn = state.ind.jn;
  const lines = state.ind.lines.filter((l) => l.o !== o);
  if (mil > 0) {
    const eqs = Object.keys(DEFAULT_SPLIT).filter((e) => !EQUIP[e].unlock);
    const got = apportion(eqs.map((e) => DEFAULT_SPLIT[e]), mil, eqs.map(() => I.LINE_MAX_FAC));
    eqs.forEach((e, i) => { if (got[i] > 0) lines.push({ id: ++jn, o, eq: e, fac: got[i], eff: I.EFF_INIT, acc: 0, f: 1, out: 0 }); });
  }
  return { ...state, ind: { ...state.ind, st, lines, jn, ver: state.ind.ver + 1 } };
}

/** Přidá divize klonováním existujících divizí země (bez armády); zachová poměr druhů. */
function growArmy(state, o, f) {
  const mine = [];
  for (let i = 1; i < state.mil.divs.length; i++) if (state.mil.divs[i] && state.mil.divs[i].o === o) mine.push(i);
  const add = Math.round(mine.length * (f - 1));
  if (!mine.length || add <= 0) return state;
  const divs = state.mil.divs.slice();
  const nr = {};
  for (const d of divs) if (d) nr[`${d.o}:${d.tpl}`] = Math.max(nr[`${d.o}:${d.tpl}`] || 0, d.nr);
  for (let k = 0; k < add; k++) {
    const src = divs[mine[Math.floor((k * mine.length) / add) % mine.length]];
    const key = `${o}:${src.tpl}`;
    nr[key] = (nr[key] || 0) + 1;
    divs.push({ ...src, nr: nr[key], army: 0, path: [], prog: 0, b: 0, rt: 0, hold: 0, dig: 0 });
  }
  return { ...state, mil: { ...state.mil, divs, ver: state.mil.ver + 1 } };
}

/** Zvětší letectvo (křídla v rezervě a na letištích do kapacity, zbytek do rezervy). */
function growAir(state, o, f) {
  const wings = state.air.wings.map((w) => w);
  const pool = state.air.pool.slice();
  pool[o] = { ...pool[o] };
  const baseUse = new Map();
  for (const w of wings) if (w && w.o === o) baseUse.set(w.s, (baseUse.get(w.s) || 0) + w.n);
  for (let i = 1; i < wings.length; i++) {
    const w = wings[i];
    if (!w || w.o !== o) continue;
    const cap = (state.ind.st[w.s].afb || 0) * AIR.PER_LEVEL;
    const want = Math.round(w.n * f), used = baseUse.get(w.s) || 0;
    const n = Math.max(w.n, Math.min(want, w.n + Math.max(0, cap - used)));
    baseUse.set(w.s, used + n - w.n);
    wings[i] = { ...w, n };
    pool[o][w.t] = (pool[o][w.t] || 0) + Math.max(0, want - n);
  }
  void PLANE_IDS;
  return { ...state, air: { ...state.air, wings, pool, ver: state.air.ver + 1 } };
}

/** Zvětší námořnictvo (lodě ve flotilách i v rezervě). */
function growNavy(state, o, f) {
  const fleets = state.nav.fleets.map((fl) => {
    if (!fl || fl.o !== o) return fl;
    const ships = {};
    for (const k in fl.ships) ships[k] = k === 'tr' ? fl.ships[k] : Math.round(fl.ships[k] * f);
    return { ...fl, ships, mx: Math.round(fl.mx * f) };
  });
  const pool = state.nav.pool.slice();
  pool[o] = { ...pool[o], tr: Math.round((pool[o].tr || 0) * f) };
  return { ...state, nav: { ...state.nav, fleets, pool, ver: state.nav.ver + 1 } };
}

/** Dá zemi všechny technologie do daného roku (opakovaně kvůli předpokladům). */
function grantTechs(state, o, year) {
  let s = state;
  for (let pass = 0; pass < 8; pass++) {
    let any = false;
    for (const id of TECH_IDS) {
      if (TECHS[id].year > year) continue;
      const n = grantTech(s, o, id);
      if (n !== s) { s = n; any = true; }
    }
    if (!any) break;
  }
  return s;
}

export function applyScenario(state, id) {
  const sc = SCENARIOS[id];
  if (!sc || !sc.transfer) return state;
  const w = getWorld();
  let s = state;
  // 1) zaniklé země a přesuny států
  for (const t of sc.transfer) {
    const to = w.ownerIdx[t.to];
    const ids = [];
    for (let st = 1; st < w.states.length; st++) {
      const own = w.stateOwner0[st];
      if (t.from && w.owners[own].tag === t.from && !(t.except || []).includes(w.states[st].n)) ids.push(st);
      if (t.states && t.states.includes(w.states[st].n)) ids.push(st);
    }
    for (const st of ids) s = transferState(s, st, to);
  }
  const cap = s.dip.cap.slice();
  for (const tag of sc.dead) {
    const o = w.ownerIdx[tag];
    cap[o] = 1;
    const left = [];
    for (let i = 1; i < s.mil.divs.length; i++) if (s.mil.divs[i] && s.mil.divs[i].o === o) left.push(i);
    if (left.length) s = disband(s, left);
  }
  s = { ...s, dip: { ...s.dip, cap, ver: s.dip.ver + 1 } };
  // 2) růst zemí
  for (let o = 1; o < w.owners.length; o++) {
    if (cap[o]) continue;
    const tag = w.owners[o].tag, g = growthOf(sc, tag), tier = COUNTRIES[tag]?.tier ?? 3;
    s = growIndustry(s, o, g);
    s = growArmy(s, o, g.army);
    if (sc.xp && sc.xp[tag]) s = { ...s, mil: { ...s.mil, divs: s.mil.divs.map((d) => (d && d.o === o && d.xp < sc.xp[tag] ? { ...d, xp: sc.xp[tag] } : d)), ver: s.mil.ver + 1 } };
    s = growAir(s, o, g.air);
    s = growNavy(s, o, g.navy);
    s = grantTechs(s, o, sc.tech[tier] || 1937);
    const pol = s.pol.own.slice();
    pol[o] = { ...pol[o], pp: pol[o].pp + (sc.pp || 0) };
    s = { ...s, pol: { ...s.pol, own: pol } };
  }
  // 3) bloky a války
  const fac = s.dip.fac.slice(), facs = [null];
  fac.fill(0);
  for (const f of sc.factions) {
    const mem = f.mem.map((t) => w.ownerIdx[t]).filter((o) => o && !cap[o]);
    facs.push({ nm: f.nm, ldr: w.ownerIdx[f.ldr], mem });
    for (const o of mem) fac[o] = facs.length - 1;
  }
  s = { ...s, dip: { ...s.dip, fac, facs, ver: s.dip.ver + 1 } };
  for (const [a, b] of sc.wars) s = declareWar(s, a, b);
  // 4) čas
  return { ...s, tick: sc.tick };
}
