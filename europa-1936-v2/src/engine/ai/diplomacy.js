// AI: diplomacie (M24). Používá stejné příkazy jako hráč: proposePeace, justifyWar, startWar.
import { getWorld } from '../world.js';
import { HIST_WARS, HIST_FACTIONS, HIST_GUARANTEES } from '../../data/ai/plans.js';
import { HIST_DEMANDS, HIST_JACKALS } from '../../data/dip/demands.js';
import { hasWar, enemiesOf, atWar } from '../army/war.js';
import { divisionCount } from '../army/selectors.js';
import { justifyWar, startWar, proposePeace, justReady, warBlock, createFaction, inviteToFaction } from '../dip/commands.js';
import { subjectsOf, autonomyOf, tightenControl } from '../dip/subjects.js';
import { guarantee } from '../dip/guarantee.js';
import { campOf, hasCapitulated, warScore, pairKey, vpHeld } from '../dip/core.js';
import { demandSpec, demandBlock, demandForce, demand } from '../dip/demand.js';
import { adjacency } from '../army/geo.js';
import { AI } from './constants.js';
import { playerOf } from './core.js';
import { theatersOf } from './strategy.js';

export function aiDiplomacy(state, o) {
  const w = getWorld(), tag = w.owners[o].tag;
  for (const p of subjectsOf(state, o)) if (autonomyOf(state, p) >= 70) state = tightenControl(state, o, p);   // M55: pán drží loutku na uzdě
  // mír, když prohrává
  if (hasWar(state.mil, o)) {
    const p = state.pol.own[o];
    const weary = p.stab < AI.PEACE_STAB || p.ws < AI.PEACE_WS;
    for (const e of enemiesOf(state.mil, o)) {
      if (e === playerOf(state)) continue;   // hráči AI mír nevnucuje: ten navrhuje sám
      if (state.dip.sub[e] && atWar(state.mil, state.dip.sub[e], o)) continue;   // loutka vede válku pána
      const since = state.dip.since[pairKey(o, e)];
      const days = since != null ? (state.tick - since) / 24 : Infinity;
      const score = warScore(state, o, e);
      const stalled = days >= AI.STALEMATE_DAYS && Math.abs(score) < AI.STALEMATE_SCORE;
      const losing = score < -AI.PEACE_LOSING;
      // unavená země žádá o mír, jen když prohrává (nebo válka trvá dlouho); na začátku války se neodevzdává (M66)
      const want = (weary && (losing || days >= AI.PEACE_MIN_DAYS)) || stalled || (losing && days >= AI.PEACE_MIN_DAYS && score < -AI.PEACE_LOSING * 2);
      if (want && score <= AI.PEACE_WINNING) state = proposePeace(state, o, e);   // vítěz o bílý mír nežádá
      else if (days >= AI.FROZEN_DAYS && state.tick % (24 * 7) === 0 && !theatersOf(state, o, new Set([e])).length) state = proposePeace(state, o, e);   // M68: zamrzlá válka bez styku (např. spojenecký spor na druhém konci Evropy) se ukončí i vítězi
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
  // historické záruky nezávislosti
  if (state.ai && state.ai.hist) {
    for (const g of HIST_GUARANTEES) {
      if (g.tag !== tag || state.tick / 24 < g.from) continue;
      const t = w.ownerIdx[g.target];
      if (t) state = guarantee(state, o, t);   // pokud už platí nebo nejde, příkaz nic neudělá
    }
  }
  const day = state.tick / 24;
  // historická ultimáta (M68): vznese je jen země s přesilou, takže cíl obvykle ustoupí; odmítnutí dá ospravedlnění války
  if (state.ai && state.ai.hist && !hasCapitulated(state, o) && state.pol.own[o].stab >= AI.STAB_MIN) {
    for (const d of HIST_DEMANDS) {
      if (d.tag !== tag || day < d.from || day > d.until) continue;
      const b = w.ownerIdx[d.target];
      if (!b) continue;
      if (d.after && !(state.dip.ult || []).some((u) => u.id === d.after && u.a === o && u.b === b && u.ok === 1)) continue;
      const spec = demandSpec(state, d, b);
      if (demandBlock(state, o, b, spec)) continue;
      const f = demandForce(state, o, b);
      if (f.mine >= Math.max(1, f.theirs) * d.ratio) return demand(state, o, b, spec);   // jedno ultimátum za den
    }
  }
  // historické válečné plány (drobná válka s okrajovou zemí další tažení nebrání)
  if (!state.ai || !state.ai.hist || warBusy(state, o) || state.pol.own[o].stab < AI.STAB_MIN) return state;
  for (const plan of HIST_WARS) {
    if (plan.tag !== tag || day < plan.from || day > plan.until) continue;
    const t = w.ownerIdx[plan.target];
    if (!t || hasCapitulated(state, t) || warBlock(state, o, t) || state.dip.goal[`${o}>${t}`]) continue;   // M68: historická válka je jednorázová
    if (justReady(state, o, t)) {
      const mine = campOf(state, o).reduce((a, m) => a + divisionCount(state, m), 0);
      const theirs = campOf(state, t).reduce((a, m) => a + divisionCount(state, m), 0);
      if (!theirs || mine / theirs >= plan.ratio) return startWar(state, o, t);
    } else if (!state.dip.just.some((j) => j.a === o && j.b === t)) {
      const next = justifyWar(state, o, t);
      if (next !== state) return next;
    }
  }
  // oportunistické války (M68): země se přidá k zemi, kterou už z velké části dobyli jiní
  for (const j of HIST_JACKALS) {
    if (j.tag !== tag || day < j.from || day > j.until) continue;
    const t = w.ownerIdx[j.target];
    if (!t || hasCapitulated(state, t) || warBlock(state, o, t) || !hasWar(state.mil, t) || state.dip.goal[`${o}>${t}`]) continue;
    if (vpHeld(state, t).share < AI.JACKAL_SHARE || !bordersOn(state, o, t)) continue;
    const mine = campOf(state, o).reduce((a, m) => a + divisionCount(state, m), 0);
    const theirs = campOf(state, t).reduce((a, m) => a + divisionCount(state, m), 0);
    if (mine >= Math.max(1, theirs) * j.ratio) return startWar(state, o, t, true);
  }
  return state;
}

/** Je země zaměstnaná válkou? Ano, když protivníci jejího bloku mají aspoň `AI.BUSY_SHARE` jejích sil. */
export function warBusy(state, o) {
  if (!hasWar(state.mil, o)) return false;
  const camp = campOf(state, o), foes = new Set();
  for (const m of camp) for (const e of enemiesOf(state.mil, m)) if (!camp.includes(e)) foes.add(e);
  const mine = camp.reduce((s, m) => s + divisionCount(state, m), 0);
  const theirs = [...foes].reduce((s, e) => s + divisionCount(state, e), 0);
  return theirs >= AI.BUSY_SHARE * Math.max(1, mine);
}

/** Sousedí území země `o` (podle kontroly provincií) s vlastnictvím země `t`? */
function bordersOn(state, o, t) {
  const w = getWorld(), adj = adjacency(w);
  for (let p = 1; p <= w.L; p++) {
    if (state.ctrl[p] !== o) continue;
    for (const e of adj[p]) if (e.kind !== 2 && state.stateOwner[w.provState[e.to]] === t) return true;
  }
  return false;
}
