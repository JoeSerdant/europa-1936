// AI: doktríny (M34). Používá stejný příkaz jako hráč: adoptDoctrine. Směr větve určuje pořadí země (každá AI jde jiným směrem), stupně bere postupně.
import { TRACKS, TRACK_IDS, BRANCH_IDS } from '../../data/doc/doctrines.js';
import { adoptDoctrine } from '../doc/commands.js';

export function aiDoctrine(state, o) {
  const own = state.doc.own[o];
  for (const b of BRANCH_IDS) {
    const tracks = TRACK_IDS.filter((t) => TRACKS[t].branch === b);
    const track = own.track[b] || tracks[o % tracks.length];
    const next = TRACKS[track].levels.find((l) => !own.done[l.id]);
    if (next) state = adoptDoctrine(state, o, next.id);
  }
  return state;
}
