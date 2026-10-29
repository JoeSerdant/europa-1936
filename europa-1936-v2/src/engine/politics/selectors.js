// Dotazy na politiku pro rozhraní a AI (čisté, bez změn stavu).
import { getWorld } from '../world.js';
import { LAWS, LAW_CATS, LAW_CAT_IDS, ADVISORS, ADV_SLOTS, ADV_SLOT_IDS, ADVISOR_IDS } from '../../data/politics/index.js';
import { tallyOwners } from '../industry/core.js';
import { POL } from './constants.js';
import { polModsOf, lawBlock, stabMult, outMult, manMult, consOf } from './core.js';
import { targetsOf } from './day.js';

const idxOf = (o) => (typeof o === 'string' ? getWorld().ownerIdx[o] : o);

/** Přehled politiky země: hodnoty, cíle, příjem, zákony (se stavem a důvodem zamčení), poradci a bonusy. */
export function politicsOf(state, o) {
  o = idxOf(o);
  const own = state.pol.own[o];
  const t = targetsOf(state, o, own, tallyOwners(state)[o].occ);
  return {
    o, stab: own.stab, ws: own.ws, pp: own.pp, income: POL.PP_BASE, target: t, mods: polModsOf(state, o),
    out: outMult(state, o), man: manMult(state, o), cons: consOf(state, o), stabMult: stabMult(own.stab),
    laws: LAW_CAT_IDS.map((cat) => ({
      cat, n: LAW_CATS[cat].n, current: own.laws[cat],
      options: LAW_CATS[cat].order.map((id) => ({ id, ...LAWS[cat][id], active: own.laws[cat] === id, block: lawBlock(own, cat, id) })),
    })),
    advisors: ADV_SLOT_IDS.map((slot) => ({
      slot, n: ADV_SLOTS[slot].n, current: own.adv[slot] ? { id: own.adv[slot], ...ADVISORS[own.adv[slot]] } : null,
      options: ADVISOR_IDS.filter((id) => ADVISORS[id].slot === slot).map((id) => ({ id, ...ADVISORS[id], active: own.adv[slot] === id, block: own.pp < ADVISORS[id].pp && own.adv[slot] !== id ? `Chybí politická moc (${Math.ceil(ADVISORS[id].pp - own.pp)}).` : null })),
    })),
  };
}
