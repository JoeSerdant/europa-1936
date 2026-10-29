// Dotazy na doktríny pro rozhraní a AI (čisté).
import { getWorld } from '../world.js';
import { BRANCHES, BRANCH_IDS, TRACKS, TRACK_IDS } from '../../data/doc/doctrines.js';
import { DOC } from './constants.js';
import { docBlock } from './core.js';

/** Přehled doktrín země: větve se zkušenostmi a směry; každý stupeň má stav (done / available / locked) a důvod zamčení. */
export function doctrinesOf(state, o) {
  o = typeof o === 'string' ? getWorld().ownerIdx[o] : o;
  const own = state.doc.own[o];
  return BRANCH_IDS.map((b) => ({
    id: b, ...BRANCHES[b], have: own.xp[b], chosen: own.track[b] || null,
    tracks: TRACK_IDS.filter((t) => TRACKS[t].branch === b).map((t) => ({
      id: t, n: TRACKS[t].n, info: TRACKS[t].info, excluded: !!own.track[b] && own.track[b] !== t,
      levels: TRACKS[t].levels.map((l, i) => {
        const block = docBlock(state, o, l.id);
        return { ...l, level: i + 1, cost: DOC.COST[i], done: !!own.done[l.id], block, can: !block };
      }),
    })),
  }));
}
