// Denní krok politiky (M21): politická moc, přiblížení stability a podpory války k cílům, AI-lite zemí bez hráče (zákony za války, poradci).
import { getWorld } from '../world.js';
import { LAWS, LAW_CATS, ADVISORS, ADV_SLOT_IDS, ADVISOR_IDS } from '../../data/politics/index.js';
import { hasWar } from '../army/war.js';
import { tallyOwners } from '../industry/core.js';
import { POL } from './constants.js';
import { polMods, lawBlock } from './core.js';
import { polBase } from './setup.js';

const step = (v, target, d) => (v < target ? Math.min(target, v + d) : Math.max(target, v - d));
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Cíle stability a podpory války země. */
export function targetsOf(state, o, own, occ) {
  const b = polBase(getWorld().owners[o].tag), m = polMods(own);
  const stab = clamp01(b.stab + m.stab - Math.min(POL.OCC_MAX, occ * POL.OCC_STAB));
  const ws = clamp01(b.ws + m.ws + (hasWar(state.mil, o) ? POL.WAR_WS : 0));
  return { stab, ws };
}

/** AI-lite: za války zvýší zákon ekonomiky nebo odvodu (nejlevnější dostupný krok vpřed), jinak najme nejlevnějšího poradce do prázdného slotu. */
function aiMove(state, o, own) {
  if (hasWar(state.mil, o)) {
    for (const cat of ['eco', 'con']) {
      const order = LAW_CATS[cat].order, at = order.indexOf(own.laws[cat]);
      for (let i = order.length - 1; i > at; i--) {
        if (!lawBlock(own, cat, order[i])) return { ...own, pp: own.pp - LAWS[cat][order[i]].pp, laws: { ...own.laws, [cat]: order[i] } };
      }
    }
  }
  for (const slot of ADV_SLOT_IDS) {
    if (own.adv[slot]) continue;
    const opts = ADVISOR_IDS.filter((id) => ADVISORS[id].slot === slot).sort((a, b) => ADVISORS[a].pp - ADVISORS[b].pp || (a < b ? -1 : 1));
    if (opts.length && own.pp >= ADVISORS[opts[0]].pp + 50) return { ...own, pp: own.pp - ADVISORS[opts[0]].pp, adv: { ...own.adv, [slot]: opts[0] } };
  }
  return null;
}

export function politicsDay(state) {
  const w = getWorld();
  const player = state.player ? w.ownerIdx[state.player] : 0;
  const tally = tallyOwners(state);
  let arr = state.pol.own, copy = false, structural = false;
  for (let o = 1; o < arr.length; o++) {
    const cur = arr[o];
    if (!cur) continue;
    let next = cur;
    if (o !== player) { const mv = aiMove(state, o, cur); if (mv) { next = mv; structural = true; } }
    const t = targetsOf(state, o, next, tally[o].occ);
    const stab = step(next.stab, t.stab, POL.DRIFT), ws = step(next.ws, t.ws, POL.DRIFT);
    const pp = Math.min(POL.PP_MAX, next.pp + POL.PP_BASE);
    if (stab !== next.stab || ws !== next.ws || pp !== next.pp || next !== cur) {
      if (!copy) { arr = arr.slice(); copy = true; }
      arr[o] = { ...next, stab, ws, pp };
    }
  }
  if (!copy) return state;
  return { ...state, pol: { ver: state.pol.ver + (structural ? 1 : 0), own: arr } };
}
