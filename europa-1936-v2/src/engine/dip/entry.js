// Vstup členů bloků do válek (F2 B1): podle `HIST_ENTRY` se člen bloku zapojuje do válek bloku až od historického data (Itálie 1940,
// Bulharsko a Maďarsko 1941) a se zeměmi ze `skip` nikdy neválčí kvůli bloku. Ve volné historii se datum posouvá jako ostatní události země.
// Platí jen se zapnutou AI zemí (engine bez AI – testy ostatních systémů – volá bloky jako dřív).
import { getWorld } from '../world.js';
import { HIST_ENTRY } from '../../data/ai/plans.js';
import { shiftOf } from '../ai/free.js';

const ROWS = new Map(HIST_ENTRY.map((r) => [r.tag, r]));
const rowOf = (o) => ROWS.get(getWorld().owners[o].tag) || null;

/** Je člen bloku `o` zatím mimo války svého bloku? */
export function heldBack(state, o) {
  if (!state.ai || !state.ai.level) return false;
  const r = rowOf(o);
  return !!r && state.tick / 24 < r.from + shiftOf(state, o);
}

/** Odmítá země `o` kvůli bloku válčit se zemí `e` (`skip`)? Platí oběma směry a i pro loutky takové země (loutka vede války pána). */
export function skipsWar(state, o, e) {
  if (!state.ai || !state.ai.level) return false;
  const w = getWorld();
  const pair = (x, y) => { const r = rowOf(x); return !!(r && r.skip && r.skip.includes(w.owners[y].tag)); };
  const lord = (x) => (state.dip.sub && state.dip.sub[x]) || 0;
  return pair(o, e) || pair(e, o) || (!!lord(e) && pair(o, lord(e))) || (!!lord(o) && pair(e, lord(o)));
}

/** Řádek vstupu země `o` (pro AI, která se k válkám bloku přidá sama), nebo null. */
export const entryOf = rowOf;
