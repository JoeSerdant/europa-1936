// S7: AI a okupace – okupační zákon podle historie (`HIST_OCC_LAW`) nebo ideologie (`OCC_LAW_IDEO`), kolaborantská vláda z přebytku politické moci.
// Stejné příkazy jako hráč (`setOccLaw`, `setCollab`), týdně (rozprostřeně podle země).
import { getWorld } from '../world.js';
import { HIST_OCC_LAW, OCC_LAW_IDEO, OCC_LAW_DEFAULT } from '../../data/occ/laws.js';
import { occupiedBy, setOccLaw, collabBlock, setCollab } from '../occ/laws.js';
import { ideologyOf } from '../politics/parties.js';
import { OCC } from '../occ/constants.js';
import { AI } from './constants.js';

/** Zákon, který AI okupant `c` chce pro okupovanou zemi `o`. */
export function aiOccLawFor(state, c, o) {
  const w = getWorld(), h = state.ai && state.ai.hist ? HIST_OCC_LAW[w.owners[c].tag] : null;
  if (h) return h[w.owners[o].tag] || h.default || OCC_LAW_DEFAULT;
  return OCC_LAW_IDEO[ideologyOf(state, c)] || OCC_LAW_DEFAULT;
}

export function aiOccupation(state, c) {
  if ((Math.floor(state.tick / 24) + c) % 7 !== 3 || !state.occ) return state;
  for (const x of occupiedBy(state, c)) {
    state = setOccLaw(state, c, x.o, aiOccLawFor(state, c, x.o));
    if (!collabBlock(state, c, x.o) && state.pol.own[c].pp >= OCC.COL_PP + AI.S7_COL_PP_KEEP) state = setCollab(state, c, x.o);
  }
  return state;
}
