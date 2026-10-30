// Denní krok AI zemí (M24): průmysl, armáda, diplomacie; týdně útočné plány. Pořadí zemí podle indexu, žádná náhoda.
import { getWorld } from '../world.js';
import { AI } from './constants.js';
import { playerOf } from './core.js';
import { aiIndustry } from './industry.js';
import { aiArmy, scanArmies } from './army.js';
import { hasWar } from '../army/war.js';
import { aiDiplomacy } from './diplomacy.js';
import { aiNavy } from './navy.js';
import { aiAir } from './air.js';
import { aiDoctrine } from './doc.js';
import { aiDecisions } from './decisions.js';
import { aiSpy } from './spy.js';
import { aiForts } from './forts.js';
import { aiStrategy } from './strategy.js';
import { aiCommand } from '../cmd/index.js';
import { aiLend } from '../dip/lend.js';

/** Válčí země a některá její armáda má jen automatický plán (nebo žádný)? Pak se strategie spustí hned, ne až za týden. */
function newWar(state, o) {
  if (!hasWar(state.mil, o)) return false;
  for (let id = 1; id < state.mil.armies.length; id++) { const a = state.mil.armies[id]; if (a && a.o === o && (!a.plan || a.plan.auto)) return true; }
  return false;
}

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
    if (weekly || newWar(state, o)) state = aiStrategy(state, o);   // M66: divadla války, přidělení armád, útok a obrana; v míru domácí rozmístění
    if (!state.dip.sub[o]) state = aiDiplomacy(state, o);   // loutky nevedou vlastní diplomacii (M33)
  }
  return state;
}
