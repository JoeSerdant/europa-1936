// AI: pakty o neútočení (M87). Válčící velmoc nebo regionální mocnost si jednou za čas kryje záda: nabídne pakt nejsilnějšímu sousedovi, se kterým
// neválčí, není s ním v bloku a nemá na něj historický plán (válka, oportunistická válka, ultimátum). Zemi řízené AI nabídne jen pakt, který přijme;
// hráči ho nabídne vždy (rozhodne se sám). Stejný příkaz jako hráč: `proposePact`. Kdy se naposledy ptala, si pamatuje v `nat.flags`.
import { getWorld } from '../world.js';
import { COUNTRIES } from '../../data/countries.js';
import { HIST_WARS } from '../../data/ai/plans.js';
import { HIST_DEMANDS, HIST_JACKALS } from '../../data/dip/demands.js';
import { adjacency } from '../army/geo.js';
import { hasWar, enemiesOf } from '../army/war.js';
import { divisionCount } from '../army/selectors.js';
import { pactBlock, pactAccepts, proposePact } from '../dip/pact.js';
import { relOf } from '../dip/core.js';
import { DIP } from '../dip/constants.js';
import { AI } from './constants.js';
import { playerOf } from './core.js';

/** Má země `tag` historický plán proti `target`, který ještě může nastat? */
function planned(tag, target, day) {
  const hit = (x) => x.tag === tag && x.target === target && x.until >= day;
  return HIST_WARS.some(hit) || HIST_JACKALS.some(hit) || HIST_DEMANDS.some(hit);
}

/** Sousedé země `o` po souši (podle kontroly provincií): množina zemí. */
function neighbors(state, o) {
  const w = getWorld(), adj = adjacency(w), out = new Set();
  for (let p = 1; p <= w.L; p++) {
    if (state.ctrl[p] !== o) continue;
    for (const e of adj[p]) { const c = state.ctrl[e.to]; if (e.kind !== 2 && c && c !== o) out.add(c); }
  }
  return out;
}

/** Komu by země `o` teď nabídla pakt (0 = nikomu). */
export function pactTarget(state, o) {
  const w = getWorld(), tag = w.owners[o].tag, day = state.tick / 24, player = playerOf(state);
  if ((COUNTRIES[tag]?.tier ?? 3) > 2 || !hasWar(state.mil, o) || state.dip.sub[o]) return 0;
  if (state.pol.own[o].pp < DIP.NAP_PP + AI.NAP_PP_RESERVE) return 0;
  const flags = state.nat.own[o].flags;
  const mine = new Set(enemiesOf(state.mil, o));
  let best = 0, bn = 0;
  for (const t of [...neighbors(state, o)].sort((a, b) => a - b)) {
    if (pactBlock(state, o, t)) continue;
    const tt = w.owners[t].tag;
    if (planned(tag, tt, day) || planned(tt, tag, day)) continue;
    const asked = flags[`nap_${t}`];
    if (asked && state.tick - asked < AI.NAP_ASK_DAYS * 24) continue;
    if (relOf(state, o, t) < DIP.NAP_REL - DIP.NAP_ENEMY) continue;
    if (enemiesOf(state.mil, t).some((e) => mine.has(e))) continue;   // kdo bojuje se stejným nepřítelem, je spojenec i bez paktu
    if (t !== player && !pactAccepts(state, o, t).ok) continue;
    const n = divisionCount(state, t);
    if (n > bn) { bn = n; best = t; }
  }
  return best;
}

/** Jednou za `AI.NAP_DAYS` dní (posunuto podle země): nabídka paktu. */
export function aiPacts(state, o) {
  if ((Math.floor(state.tick / 24) + o) % AI.NAP_DAYS !== 0) return state;
  const t = pactTarget(state, o);
  if (!t) return state;
  const next = proposePact(state, o, t);
  if (next === state) return state;
  const own = next.nat.own.slice();
  own[o] = { ...own[o], flags: { ...own[o].flags, [`nap_${t}`]: next.tick || 1 } };
  return { ...next, nat: { ...next.nat, ver: next.nat.ver + 1, own } };
}
