// Mlha války (M76): které provincie a mořské oblasti země `o` vidí. Čistý dotaz nad stavem (nic se neukládá), AI ho nepoužívá – slouží rozhraní hráče.
// Viditelné jsou: vlastní a přátelské území (blok, loutky, pán, dohody o přístupu), provincie sousedící s vlastním územím nebo s vlastní divizí,
// okolí radarů, státy, nad kterými operují vlastní letecká křídla, a celé území země, o které má zpravodajská služba dobrý přehled.
// Na moři: oblasti u vlastního a přátelského pobřeží a oblasti s vlastní nebo přátelskou flotilou (a jejich sousedé).
import { getWorld } from './world.js';
import { geo, adjacency } from './army/geo.js';
import { friendsOf } from './dip/accessCore.js';
import { sameFaction } from './dip/core.js';
import { seaGraph, subOnly, aswOf } from './nav/core.js';

export const FOG = {
  RADAR_KM: 120,      // dosah radaru na úroveň (od hlavní provincie státu)
  INTEL_FULL: 0.6,    // od tohoto přehledu zpravodajství je vidět celé území cíle
};

/** Platí ve hře mlha války? (pravidlo hry `rules.fog`; pozorovatel vidí vše) */
export const fogOn = (state) => !!state.player && !(state.rules && state.rules.fog === 0);

const cache = new WeakMap();   // mil.divs → { ctrl, o, dip, air, spy, land, sea }

function compute(state, o) {
  const w = getWorld(), g = geo(w), adj = adjacency(w), ctrl = state.ctrl;
  const land = new Uint8Array(w.L + 1), sea = new Set();
  const fr = new Uint8Array(w.owners.length);
  fr[o] = 1;
  for (const f of friendsOf(state.dip, o)) fr[f] = 1;
  for (let c = 1; c < fr.length; c++) if (!fr[c] && sameFaction(state, o, c)) fr[c] = 1;
  const see = (p) => { land[p] = 1; };
  const around = (p) => { land[p] = 1; for (const e of adj[p]) land[e.to] = 1; w.forCoast(p, (s) => { sea.add(s); }); };
  for (let p = 1; p <= w.L; p++) {
    const c = ctrl[p];
    if (c === o) around(p);
    else if (fr[c]) { see(p); w.forCoast(p, (s) => { sea.add(s); }); }
  }
  const divs = state.mil.divs;
  for (let id = 1; id < divs.length; id++) { const d = divs[id]; if (d && fr[d.o]) around(d.p); }
  // radar: okolí hlavní provincie státu podle úrovně
  const st = state.ind.st;
  for (let s = 1; s < st.length; s++) {
    const lvl = st[s] && st[s].radar;
    if (!lvl || state.stateOwner[s] !== o) continue;
    const cap = w.states[s].cap, r = FOG.RADAR_KM * lvl;
    for (let p = 1; p <= w.L; p++) if (!land[p] && g.distKm(cap, p) <= r) land[p] = 1;
  }
  // letectvo na misi: stát, nad kterým křídlo operuje
  if (state.air) for (const wg of state.air.wings) if (wg && wg.o === o && wg.m && wg.to && w.states[wg.to]) for (const p of w.states[wg.to].v) land[p] = 1;
  // zpravodajství: dobrý přehled o cíli odkryje jeho území
  const intel = state.spy && state.spy.own[o] ? state.spy.own[o].intel : null;
  if (intel) {
    const full = new Uint8Array(w.owners.length);
    let any = false;
    for (const t in intel) if (intel[t] >= FOG.INTEL_FULL) { full[+t] = 1; any = true; }
    if (any) for (let p = 1; p <= w.L; p++) if (full[ctrl[p]]) land[p] = 1;
  }
  // moře: oblasti s vlastní nebo přátelskou flotilou a jejich sousedé
  if (state.nav) {
    const sg = seaGraph(w);
    for (const f of state.nav.fleets) if (f && fr[f.o]) { sea.add(f.p); for (const e of sg.get(f.p) || []) sea.add(e.to); }
  }
  return { land, sea };
}

function viewOf(state, o) {
  const hit = cache.get(state.mil.divs);
  const air = state.air ? state.air.wings : null, spy = state.spy ? state.spy.own : null, fleets = state.nav ? state.nav.fleets : null;
  if (hit && hit.o === o && hit.ctrl === state.ctrl && hit.dip === state.dip.ver && hit.air === air && hit.spy === spy && hit.fleets === fleets && hit.st === state.ind.st) return hit.view;
  const view = compute(state, o);
  cache.set(state.mil.divs, { o, ctrl: state.ctrl, dip: state.dip.ver, air, spy, fleets, st: state.ind.st, view });
  return view;
}

/** Viditelnost provincií pro zemi `o`: Uint8Array (index = provincie, 1 = vidí). */
export const visibleLand = (state, o) => viewOf(state, o).land;
/** Viditelné mořské oblasti pro zemi `o`: Set štítků. */
export const visibleSeas = (state, o) => viewOf(state, o).sea;

/** Vidí hráč divize země `owner` v provincii `p`? Bez mlhy, pro pozorovatele a u vlastních a spojeneckých jednotek vždy. */
export function seesDivision(state, owner, p) {
  if (!fogOn(state)) return true;
  const me = getWorld().ownerIdx[state.player];
  return owner === me || sameFaction(state, me, owner) || !!visibleLand(state, me)[p];
}

/** Vidí hráč flotilu země `owner` v mořské oblasti `label`? Flotilu jen z ponorek (`ships`) odhalí až vlastní nebo spojenecké torpédoborce či letadlová loď v téže oblasti (M81). */
export function seesFleet(state, owner, label, ships = null) {
  if (!fogOn(state)) return true;
  const me = getWorld().ownerIdx[state.player];
  if (owner === me || sameFaction(state, me, owner)) return true;
  if (!visibleSeas(state, me).has(label)) return false;
  if (!ships || !subOnly(ships)) return true;
  return state.nav.fleets.some((f) => f && f.p === label && (f.o === me || sameFaction(state, me, f.o)) && aswOf(f.ships) > 0);
}
