// AI: pevnosti (M42). Ve válce staví pevnosti ve vlastních provinciích na frontě (stejný příkaz jako hráč: buildFort), nejvýš dvě rozestavěné najednou.
import { getWorld } from '../world.js';
import { hasWar } from '../army/war.js';
import { frontEdges } from '../army/selectors.js';
import { buildFort } from '../industry/commands.js';
import { fortOf } from '../industry/selectors.js';
import { BUILDINGS } from '../../data/industry/index.js';

export function aiForts(state, o) {
  if (!hasWar(state.mil, o) || state.ind.build.filter((b) => b.o === o && b.k === 'fort').length >= 2) return state;
  const w = getWorld();
  let best = 0, bl = 99;
  for (const k of frontEdges(state)) {
    const a = Math.floor(k / 4096), b = k % 4096;
    for (const p of [a, b]) {
      if (state.ctrl[p] !== o || state.stateOwner[w.provState[p]] !== o) continue;
      const lv = fortOf(state, p) + state.ind.build.filter((x) => x.p === p).length;
      if (lv < BUILDINGS.fort.max && (lv < bl || (lv === bl && p < best))) { bl = lv; best = p; }
    }
  }
  return best ? buildFort(state, best) : state;
}
