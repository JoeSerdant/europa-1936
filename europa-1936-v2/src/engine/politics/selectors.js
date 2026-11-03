// Dotazy na politiku pro rozhraní a AI (čisté, bez změn stavu).
import { getWorld } from '../world.js';
import { LAWS, LAW_CATS, LAW_CAT_IDS, ADVISORS, ADV_SLOTS, ADV_SLOT_IDS, ADVISOR_IDS } from '../../data/politics/index.js';
import { tallyOwners } from '../industry/core.js';
import { POL } from './constants.js';
import { polModsOf, lawBlock, stabMult, outMult, manMult, consOf } from './core.js';
import { targetsOf } from './day.js';
import { rivalOf, supportBlock, ideologyOf } from './parties.js';
import { IDEO_ORDER } from '../../data/politics/ideology.js';

const idxOf = (o) => (typeof o === 'string' ? getWorld().ownerIdx[o] : o);

/** Strany země (M72): { gov, par (body), rows [{ id, pct, gov, block }], rival, gap, risk (blíží se převrat?), cost }. */
function partiesView(state, o, own) {
  const rv = rivalOf(own);
  return {
    gov: ideologyOf(state, o), par: own.par, rival: rv.id, gap: rv.gap, cost: POL.PARTY_PP, gain: POL.PARTY_GAIN,
    risk: rv.gap >= POL.COUP_GAP / 2 && own.stab < POL.COUP_STAB + 0.1,
    rows: IDEO_ORDER.map((id) => ({ id, pct: own.par[id], gov: own.gov === id, block: supportBlock(state, o, id) })),
  };
}

/** Přehled politiky země: hodnoty, cíle, příjem, zákony (se stavem a důvodem zamčení), poradci a bonusy. */
export function politicsOf(state, o) {
  o = idxOf(o);
  const own = state.pol.own[o];
  const t = targetsOf(state, o, own, tallyOwners(state)[o].occ);
  return {
    o, stab: own.stab, ws: own.ws, pp: own.pp, income: POL.PP_BASE, target: t, mods: polModsOf(state, o),
    parties: partiesView(state, o, own),
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
