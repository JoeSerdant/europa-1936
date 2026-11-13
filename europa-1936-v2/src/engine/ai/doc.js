// AI: doktríny (M34). Používá stejný příkaz jako hráč: adoptDoctrine. Směr větve určuje sklon země (`DOCTRINE_PREF`, M88), jinak její pořadí; stupně bere postupně.
import { TRACKS, TRACK_IDS, BRANCH_IDS } from '../../data/doc/doctrines.js';
import { DOCTRINE_PREF } from '../../data/ai/personality.js';
import { adoptDoctrine } from '../doc/commands.js';
import { getWorld } from '../world.js';

export function aiDoctrine(state, o) {
  const own = state.doc.own[o];
  for (const b of BRANCH_IDS) {
    const tracks = TRACK_IDS.filter((t) => TRACKS[t].branch === b);
    const pref = (DOCTRINE_PREF[getWorld().owners[o].tag] || {})[b];   // M88: velmoci tíhnou ke své historické doktríně
    const track = own.track[b] || (tracks.includes(pref) ? pref : tracks[o % tracks.length]);
    const next = TRACKS[track].levels.find((l) => !own.done[l.id]);
    if (next) state = adoptDoctrine(state, o, next.id);
  }
  return state;
}
