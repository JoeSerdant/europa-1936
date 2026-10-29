// Denní krok AI zemí (M24): průmysl, armáda, diplomacie; týdně útočné plány. Pořadí zemí podle indexu, žádná náhoda.
import { getWorld } from '../world.js';
import { AI } from './constants.js';
import { playerOf } from './core.js';
import { aiIndustry } from './industry.js';
import { aiArmy, aiOffense, scanArmies } from './army.js';
import { aiDiplomacy } from './diplomacy.js';
import { aiNavy } from './navy.js';
import { aiAir } from './air.js';
import { aiDoctrine } from './doc.js';
import { aiDecisions } from './decisions.js';
import { aiSpy } from './spy.js';
import { aiForts } from './forts.js';
import { aiCommand } from '../cmd/index.js';
import { aiLend } from '../dip/lend.js';

export function aiDay(state) {
  const w = getWorld();
  const player = playerOf(state);
  const weekly = state.tick % (24 * AI.PLAN_DAYS) === 0;
  const scan = scanArmies(state);
  for (let o = 1; o < w.owners.length; o++) {
    if (o === player || state.dip.cap[o]) continue;
    state = aiDecisions(state, o);
    state = aiSpy(state, o);
    state = aiForts(state, o);
    state = aiIndustry(state, o);
    state = aiArmy(state, o, scan);
    state = aiNavy(state, o);
    state = aiAir(state, o);
    state = aiDoctrine(state, o);
    state = aiLend(state, o);
    state = aiCommand(state, o);
    if (weekly) state = aiOffense(state, o);
    if (!state.dip.sub[o]) state = aiDiplomacy(state, o);   // loutky nevedou vlastní diplomacii (M33)
  }
  return state;
}
