// AI: diplomacie (M24). Používá stejné příkazy jako hráč: proposePeace, justifyWar, startWar.
import { getWorld } from '../world.js';
import { HIST_WARS, HIST_FACTIONS } from '../../data/ai/plans.js';
import { hasWar, enemiesOf } from '../army/war.js';
import { divisionCount } from '../army/selectors.js';
import { justifyWar, startWar, proposePeace, justReady, warBlock, createFaction, inviteToFaction } from '../dip/commands.js';
import { campOf, hasCapitulated, warScore, pairKey } from '../dip/core.js';
import { AI } from './constants.js';
import { playerOf } from './core.js';

export function aiDiplomacy(state, o) {
  const w = getWorld(), tag = w.owners[o].tag;
  // mír, když prohrává
  if (hasWar(state.mil, o)) {
    const p = state.pol.own[o];
    const tired = p.stab < AI.PEACE_STAB || p.ws < AI.PEACE_WS;
    for (const e of enemiesOf(state.mil, o)) {
      if (e === playerOf(state)) continue;   // hráči AI mír nevnucuje: ten navrhuje sám
      const since = state.dip.since[pairKey(o, e)];
      const stalled = since != null && (state.tick - since) / 24 >= AI.STALEMATE_DAYS && Math.abs(warScore(state, o, e)) < AI.STALEMATE_SCORE;
      if (tired || stalled) state = proposePeace(state, o, e);
    }
  }
  // historické bloky: založení a zvaní členů
  if (state.ai && state.ai.hist) {
    const day0 = state.tick / 24;
    for (const f of HIST_FACTIONS) {
      if (f.tag !== tag || day0 < f.from) continue;
      if (!state.dip.fac[o]) { state = createFaction(state, o, f.nm); continue; }
      if (state.dip.facs[state.dip.fac[o]].ldr !== o) continue;
      for (const t of f.invite) { const to = w.ownerIdx[t]; if (to && !state.dip.fac[to]) state = inviteToFaction(state, o, to); }
    }
  }
  // historické válečné plány
  if (!state.ai || !state.ai.hist || hasWar(state.mil, o) || state.pol.own[o].stab < AI.STAB_MIN) return state;
  const day = state.tick / 24;
  for (const plan of HIST_WARS) {
    if (plan.tag !== tag || day < plan.from || day > plan.until) continue;
    const t = w.ownerIdx[plan.target];
    if (!t || hasCapitulated(state, t) || warBlock(state, o, t)) continue;
    if (justReady(state, o, t)) {
      const mine = campOf(state, o).reduce((a, m) => a + divisionCount(state, m), 0);
      const theirs = campOf(state, t).reduce((a, m) => a + divisionCount(state, m), 0);
      if (!theirs || mine / theirs >= plan.ratio) return startWar(state, o, t);
    } else if (!state.dip.just.some((j) => j.a === o && j.b === t)) {
      const next = justifyWar(state, o, t);
      if (next !== state) return next;
    }
  }
  return state;
}
