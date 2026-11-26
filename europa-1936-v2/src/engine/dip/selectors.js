// Dotazy na diplomacii pro rozhraní a AI (čisté, bez změn stavu).
import { facVote, kickBlock, facProgress, facGoalBlock } from './facgoals.js';
import { FAC_GOAL_IDS } from '../../data/dip/facgoals.js';
import { getWorld } from '../world.js';
import { DIP } from './constants.js';
import { WARGOALS, WARGOAL_IDS } from '../../data/dip/wargoals.js';
import { relOf, factionOf, sameFaction, warScore, vpHeld, hasCapitulated, isDormant } from './core.js';
import { atWar, hasWar } from '../army/war.js';
import { overlordOf, autonomyOf, autonomyLevel, autonomyBlock } from './subjects.js';
import { lendFriend } from './lend.js';
import { guarantees, guaranteeBlock } from './guarantee.js';
import { hasAccess, grants, accessBlock, grantBlock } from './access.js';
import { demandSpec, demandBlock, demandForce } from './demand.js';
import { HIST_DEMANDS } from '../../data/dip/demands.js';
import { exileHost } from './exile.js';
import { pactOf, pactBlock, pactAccepts, breakBlock, improveBlock, pactOffers } from './pact.js';

/** Pakt o neútočení se zemí `t` pro rozhraní: { days (jak dlouho platí), breakBlock } nebo null. */
const pactView = (state, o, t) => { const p = pactOf(state, o, t); return p ? { days: Math.floor((state.tick - p.t) / 24), breakBlock: breakBlock(state, o, t) } : null; };
import { warBlock, justReady, peaceBlock, inviteBlock } from './commands.js';
import { volKind, volCap } from './volunteers.js';
import { attBlock } from './attache.js';
import { licOffers } from './licence.js';

const idxOf = (o) => (typeof o === 'string' ? getWorld().ownerIdx[o] : o);

/** Přehled diplomacie země: blok, země se vztahem, stavem a možnostmi (včetně důvodů zamčení). */
export function diplomacyOf(state, o) {
  o = idxOf(o);
  const w = getWorld();
  const fac = factionOf(state, o);
  const myTag = w.owners[o].tag, day = state.tick / 24;
  const list = [];
  const away = new Map();   // F4: vlastní divize sloužící u jiných zemí (příjemce → počet)
  let awayAll = 0;
  for (const d of state.mil.divs) if (d && d.vo === o) { away.set(d.o, (away.get(d.o) || 0) + 1); awayAll++; }
  const cap = volCap(state, o), att = state.dip.att || [];
  for (let t = 1; t < w.owners.length; t++) {
    if (t === o || isDormant(state, t)) continue;
    const war = atWar(state.mil, o, t);
    const j = state.dip.just.find((x) => x.a === o && x.b === t);
    const wb = warBlock(state, o, t);
    list.push({
      o: t, tag: w.owners[t].tag, name: w.owners[t].name, rel: relOf(state, o, t),
      war, ally: sameFaction(state, o, t), capitulated: hasCapitulated(state, t), exile: exileHost(state, t), faction: factionOf(state, t),   // exile = hostitel exilové vlády (M83)
      just: j ? { ready: j.ready, left: Math.max(0, Math.ceil((j.ready - state.tick) / 24)), done: justReady(state, o, t) } : null,
      canJustify: !wb && !j && state.dip.just.filter((x) => x.a === o).length < DIP.JUST_MAX && state.pol.own[o].pp >= WARGOALS.tribute.pp,
      justifyBlock: wb || (j ? 'Už se ospravedlňuje.' : state.dip.just.filter((x) => x.a === o).length >= DIP.JUST_MAX ? 'Příliš mnoho ospravedlnění.' : state.pol.own[o].pp < WARGOALS.tribute.pp ? `Chybí politická moc (${Math.ceil(WARGOALS.tribute.pp - state.pol.own[o].pp)}).` : null),
      canDeclare: !wb && justReady(state, o, t),
      goals: WARGOAL_IDS.map((g) => ({ id: g, n: WARGOALS[g].n, pp: WARGOALS[g].pp, days: WARGOALS[g].days, info: WARGOALS[g].info, block: wb || (j ? 'Už se ospravedlňuje.' : state.dip.just.filter((x) => x.a === o).length >= DIP.JUST_MAX ? 'Příliš mnoho ospravedlnění.' : state.pol.own[o].pp < WARGOALS[g].pp ? `Chybí politická moc (${Math.ceil(WARGOALS[g].pp - state.pol.own[o].pp)}).` : null) })),
      garMine: guarantees(state, o, t), garTheirs: guarantees(state, t, o), garBlock: guaranteeBlock(state, o, t),
      pact: pactView(state, o, t), pactBlock: pactBlock(state, o, t), pactOdds: pactAccepts(state, o, t).ok, improveBlock: improveBlock(state, o, t),   // M75
      access: hasAccess(state.dip, o, t), accGiven: hasAccess(state.dip, t, o),   // M67: smíte na jejich území / smějí na vaše
      accDeal: grants(state, t, o), accMine: grants(state, o, t), accBlock: accessBlock(state, o, t), giveBlock: grantBlock(state, o, t),
      demands: HIST_DEMANDS.filter((d) => d.tag === myTag && d.target === w.owners[t].tag && day >= d.from).map((d) => {   // M68: ultimáta, která smí hráč vznést
        const f = demandForce(state, o, t);
        return { id: d.id, n: d.n, kind: d.kind, need: d.ratio, have: f.theirs ? f.mine / f.theirs : 99, block: demandBlock(state, o, t, demandSpec(state, d, t)) };
      }),
      friend: lendFriend(state, o, t) && !hasCapitulated(state, t) && !war,
      peaceBlock: war ? peaceBlock(state, o, t) : 'Nejste ve válce.',
      inviteBlock: fac ? inviteBlock(state, o, t) : 'Nejste v žádném bloku.',
      vote: fac && fac.ldr === o && !state.dip.fac[t] ? facVote(state, o, t, 'join') : null,   // S10: předpověď hlasování o přijetí
      kick: fac && fac.ldr === o && fac.mem.includes(t) && t !== o ? { block: kickBlock(state, o, t) } : null,   // S10: vyloučení z bloku (jen vedoucí)
      score: war ? warScore(state, o, t) : 0,
      overlord: overlordOf(state, t), mine: overlordOf(state, t) === o,
      au: autonomyOf(state, t), auLevel: autonomyLevel(autonomyOf(state, t)), tightBlock: autonomyBlock(state, o, t, true), looseBlock: autonomyBlock(state, o, t, false),
      fighting: hasWar(state.mil, t),
      volKind: volKind(state, o, t), volAway: away.get(t) || 0, volLeft: Math.max(0, cap - awayAll), volCap: cap,   // F4: dobrovolníci / expediční sbor
      attMine: att.some((x) => x.a === o && x.b === t), attHere: att.filter((x) => x.b === t).length, attBlock: attBlock(state, o, t),   // F4: atašé
      lic: licOffers(state, o, t),   // F4: licence, které by od této země šly koupit
      annexBlock: overlordOf(state, t) !== o ? 'Není to vaše loutka.' : state.pol.own[o].pp < DIP.ANNEX_PP ? `Chybí politická moc (${Math.ceil(DIP.ANNEX_PP - state.pol.own[o].pp)}).` : null,
    });
  }
  const goals = fac ? { act: (fac.g || []).map((g) => ({ id: g, ...facProgress(state, fac, g) })), done: fac.gd || [], open: FAC_GOAL_IDS.map((g) => ({ id: g, block: facGoalBlock(state, o, g), ...facProgress(state, fac, g) })) } : null;   // S10
  return { o, offers: pactOffers(state, o).map((x) => ({ ...x, tag: w.owners[x.a].tag, name: w.owners[x.a].name })), faction: fac, goals, canFound: !fac && !hasCapitulated(state, o) && state.pol.own[o].pp >= DIP.FAC_PP, capitulated: hasCapitulated(state, o), held: vpHeld(state, o), list };
}

export { relOf, factionOf, warScore, vpHeld };
