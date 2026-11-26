// S10: společné cíle bloků a hlasování členů (obdoba cílů frakcí z HOI4). Čisté funkce a příkazy (neplatný vstup = tentýž stav).
//  blok: facs[id] = { nm, ldr, mem, g: [rozpracované cíle], gd: [splněné cíle] } (chybějící pole = prázdné)
//  hlasování: o přijetí nové země a o vyloučení člena; váha hlasu = 1 + továrny / `DIP.VOTE_FAC`, vedoucí × `DIP.VOTE_LDR`;
//  člen hlasuje podle vztahů ke kandidátovi (navrhovatel vždy pro). Projde s nadpoloviční vahou hlasů.
import { getWorld } from '../world.js';
import { FAC_GOALS } from '../../data/dip/facgoals.js';
import { DIP } from './constants.js';
import { atWar, hasWar } from '../army/war.js';
import { tallyOwners } from '../industry/core.js';
import { relOf, setRel } from './core.js';
import { logAdd } from '../log.js';

const facOf = (state, o) => { const id = state.dip.fac[o]; return id ? { id, f: state.dip.facs[id] } : null; };
const setFac = (state, id, f) => { const facs = state.dip.facs.slice(); facs[id] = f; return { ...state, dip: { ...state.dip, facs, ver: state.dip.ver + 1 } }; };

/** Postup cíle `gid` bloku `f`: { cur, need }. */
export function facProgress(state, f, gid) {
  const G = FAC_GOALS[gid], w = getWorld(), mem = new Set(f.mem);
  let cur = 0;
  if (G.kind === 'divs') { for (const d of state.mil.divs) if (d && mem.has(d.o)) cur++; }
  else if (G.kind === 'fac') { const t = tallyOwners(state); for (const o of f.mem) cur += t[o].civ + t[o].mil; }
  else if (G.kind === 'ships') { for (const fl of state.nav.fleets) if (fl && mem.has(fl.o)) for (const k in fl.ships) cur += fl.ships[k]; }
  else if (G.kind === 'planes') { for (const wg of state.air.wings) if (wg && mem.has(wg.o)) cur += wg.n; }
  else if (G.kind === 'mem') cur = f.mem.length;
  else if (G.kind === 'vp') { for (let p = 1; p <= w.L; p++) if (w.vp[p] && mem.has(state.ctrl[p])) cur += w.vp[p]; }
  return { cur, need: G.v };
}

/** Proč vedoucí `o` nemůže zvolit cíl `gid` (český text), nebo null. */
export function facGoalBlock(state, o, gid) {
  const x = facOf(state, o);
  if (!FAC_GOALS[gid]) return 'Neznámý cíl.';
  if (!x) return 'Nejste v žádném bloku.';
  if (x.f.ldr !== o) return 'Cíle volí vedoucí bloku.';
  if ((x.f.gd || []).includes(gid)) return 'Cíl už blok splnil.';
  if ((x.f.g || []).includes(gid)) return 'Cíl už blok sleduje.';
  if ((x.f.g || []).length >= DIP.FAC_GOAL_SLOTS) return `Blok sleduje nejvýš ${DIP.FAC_GOAL_SLOTS} cíle najednou.`;
  return null;
}

/** Vedoucí `o` zvolí společný cíl bloku. */
export function setFacGoal(state, o, gid) {
  if (facGoalBlock(state, o, gid)) return state;
  const { id, f } = facOf(state, o);
  return setFac(state, id, { ...f, g: [...(f.g || []), gid] });
}

/** Vedoucí `o` cíl zruší (uvolní místo). */
export function dropFacGoal(state, o, gid) {
  const x = facOf(state, o);
  if (!x || x.f.ldr !== o || !(x.f.g || []).includes(gid)) return state;
  return setFac(state, x.id, { ...x.f, g: x.f.g.filter((g) => g !== gid) });
}

/** Týdenní krok: splněné cíle bloků se přesunou mezi splněné (trvalý bonus členům, záznam deníku `facgoal`). */
export function facGoalsDay(state) {
  if (Math.floor(state.tick / 24) % 7 !== 0) return state;
  for (let id = 1; id < state.dip.facs.length; id++) {
    const f = state.dip.facs[id];
    if (!f || !(f.g || []).length) continue;
    const done = f.g.filter((g) => { const p = facProgress(state, f, g); return p.cur >= p.need; });
    if (!done.length) continue;
    state = setFac(state, id, { ...f, g: f.g.filter((g) => !done.includes(g)), gd: [...(f.gd || []), ...done] });
    for (const g of done) state = logAdd(state, { k: 'facgoal', o: f.ldr, x: f.nm, y: g });
  }
  return state;
}

/** Váha hlasu člena `m` bloku `f`. */
export function voteWeight(state, f, m) {
  const t = tallyOwners(state)[m];
  return Math.round((1 + (t.civ + t.mil) / DIP.VOTE_FAC) * (m === f.ldr ? DIP.VOTE_LDR : 1) * 10) / 10;
}

/**
 * Hlasování bloku země `o` o zemi `target` (`kind` 'join' = přijetí, 'kick' = vyloučení): { list: [{ o, w, y }], yes, no, pass }.
 * Navrhovatel hlasuje pro; o vyloučení vylučovaný nehlasuje.
 */
export function facVote(state, o, target, kind = 'join') {
  const x = facOf(state, o);
  if (!x) return { list: [], yes: 0, no: 0, pass: false };
  const list = [];
  for (const m of x.f.mem) {
    if (kind === 'kick' && m === target) continue;
    const r = relOf(state, m, target);
    const y = m === o || (kind === 'join' ? r >= DIP.VOTE_REL && !atWar(state.mil, m, target) : r < DIP.VOTE_KICK_REL);
    list.push({ o: m, w: voteWeight(state, x.f, m), y });
  }
  const yes = list.reduce((a, v) => a + (v.y ? v.w : 0), 0), no = list.reduce((a, v) => a + (v.y ? 0 : v.w), 0);
  return { list, yes, no, pass: yes > no };
}

/** Proč vedoucí `o` nemůže navrhnout vyloučení `target` (český text), nebo null. */
export function kickBlock(state, o, target) {
  const x = facOf(state, o);
  if (!x) return 'Nejste v žádném bloku.';
  if (x.f.ldr !== o) return 'Vyloučení navrhuje vedoucí bloku.';
  if (target === o || !x.f.mem.includes(target)) return 'Země není členem bloku.';
  if (x.f.mem.some((m) => hasWar(state.mil, m))) return 'Za války blok nikoho nevylučuje.';
  if (!facVote(state, o, target, 'kick').pass) return 'Členové bloku vyloučení odmítli.';
  return null;
}

/** Vyloučí člena `target` z bloku vedoucího `o` (po úspěšném hlasování); vztah vyloučeného k vedoucímu klesne. */
export function kickFromFaction(state, o, target) {
  if (kickBlock(state, o, target)) return state;
  const { id, f } = facOf(state, o);
  const fac = state.dip.fac.slice(); fac[target] = 0;
  const facs = state.dip.facs.slice(); facs[id] = { ...f, mem: f.mem.filter((m) => m !== target) };
  const next = { ...state, dip: { ...state.dip, fac, facs, rel: setRel(state.dip.rel, target, o, DIP.KICK_REL), ver: state.dip.ver + 1 } };
  return logAdd(next, { k: 'kick', o: target, x: f.nm });
}
