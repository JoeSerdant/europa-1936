// Dotazy na diplomacii pro rozhraní a AI (čisté, bez změn stavu).
import { getWorld } from '../world.js';
import { DIP } from './constants.js';
import { WARGOALS, WARGOAL_IDS } from '../../data/dip/wargoals.js';
import { relOf, factionOf, sameFaction, warScore, vpHeld, hasCapitulated } from './core.js';
import { atWar } from '../army/war.js';
import { overlordOf, autonomyOf, autonomyLevel, autonomyBlock } from './subjects.js';
import { lendFriend } from './lend.js';
import { guarantees, guaranteeBlock } from './guarantee.js';
import { warBlock, justReady, peaceBlock, inviteBlock } from './commands.js';

const idxOf = (o) => (typeof o === 'string' ? getWorld().ownerIdx[o] : o);

/** Přehled diplomacie země: blok, země se vztahem, stavem a možnostmi (včetně důvodů zamčení). */
export function diplomacyOf(state, o) {
  o = idxOf(o);
  const w = getWorld();
  const fac = factionOf(state, o);
  const list = [];
  for (let t = 1; t < w.owners.length; t++) {
    if (t === o) continue;
    const war = atWar(state.mil, o, t);
    const j = state.dip.just.find((x) => x.a === o && x.b === t);
    const wb = warBlock(state, o, t);
    list.push({
      o: t, tag: w.owners[t].tag, name: w.owners[t].name, rel: relOf(state, o, t),
      war, ally: sameFaction(state, o, t), capitulated: hasCapitulated(state, t), faction: factionOf(state, t),
      just: j ? { ready: j.ready, left: Math.max(0, Math.ceil((j.ready - state.tick) / 24)), done: justReady(state, o, t) } : null,
      canJustify: !wb && !j && state.dip.just.filter((x) => x.a === o).length < DIP.JUST_MAX && state.pol.own[o].pp >= WARGOALS.tribute.pp,
      justifyBlock: wb || (j ? 'Už se ospravedlňuje.' : state.dip.just.filter((x) => x.a === o).length >= DIP.JUST_MAX ? 'Příliš mnoho ospravedlnění.' : state.pol.own[o].pp < WARGOALS.tribute.pp ? `Chybí politická moc (${Math.ceil(WARGOALS.tribute.pp - state.pol.own[o].pp)}).` : null),
      canDeclare: !wb && justReady(state, o, t),
      goals: WARGOAL_IDS.map((g) => ({ id: g, n: WARGOALS[g].n, pp: WARGOALS[g].pp, days: WARGOALS[g].days, info: WARGOALS[g].info, block: wb || (j ? 'Už se ospravedlňuje.' : state.dip.just.filter((x) => x.a === o).length >= DIP.JUST_MAX ? 'Příliš mnoho ospravedlnění.' : state.pol.own[o].pp < WARGOALS[g].pp ? `Chybí politická moc (${Math.ceil(WARGOALS[g].pp - state.pol.own[o].pp)}).` : null) })),
      garMine: guarantees(state, o, t), garTheirs: guarantees(state, t, o), garBlock: guaranteeBlock(state, o, t),
      friend: lendFriend(state, o, t) && !hasCapitulated(state, t) && !war,
      peaceBlock: war ? peaceBlock(state, o, t) : 'Nejste ve válce.',
      inviteBlock: fac ? inviteBlock(state, o, t) : 'Nejste v žádném bloku.',
      score: war ? warScore(state, o, t) : 0,
      overlord: overlordOf(state, t), mine: overlordOf(state, t) === o,
      au: autonomyOf(state, t), auLevel: autonomyLevel(autonomyOf(state, t)), tightBlock: autonomyBlock(state, o, t, true), looseBlock: autonomyBlock(state, o, t, false),
      annexBlock: overlordOf(state, t) !== o ? 'Není to vaše loutka.' : state.pol.own[o].pp < DIP.ANNEX_PP ? `Chybí politická moc (${Math.ceil(DIP.ANNEX_PP - state.pol.own[o].pp)}).` : null,
    });
  }
  return { o, faction: fac, canFound: !fac && !hasCapitulated(state, o) && state.pol.own[o].pp >= DIP.FAC_PP, capitulated: hasCapitulated(state, o), held: vpHeld(state, o), list };
}

export { relOf, factionOf, warScore, vpHeld };
