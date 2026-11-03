// AI: strany (M72). Země týdně podpoří svou vládnoucí stranu, když jí hrozí soupeř (méně než `AI.PARTY_MARGIN` bodů náskoku) a má politickou moc nad cenou
// s rezervou; stejný příkaz jako hráč (`supportParty`). Země bez hrozby nic nedělá, takže se historie bez zásahu zvenčí nemění.
import { rivalOf, supportBlock, supportParty } from '../politics/parties.js';
import { AI } from './constants.js';

export function aiParties(state, o) {
  if (state.tick % (24 * 7) !== 0) return state;
  const own = state.pol.own[o];
  if (!own || !own.par || own.pp < AI.PARTY_RESERVE) return state;
  if (rivalOf(own).gap < -AI.PARTY_MARGIN || supportBlock(state, o, own.gov)) return state;
  return supportParty(state, o, own.gov);
}
