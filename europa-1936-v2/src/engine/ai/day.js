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
import { aiDesign } from './design.js';
import { aiDecisions } from './decisions.js';
import { aiSpy } from './spy.js';
import { aiForts } from './forts.js';
import { aiStrategy } from './strategy.js';
import { aiParties } from './parties.js';
import { aiFuel, aiTrade } from './logistics.js';
import { histStrategies } from './hist.js';
import { aiPara } from './para.js';
import { aiPacts } from './pacts.js';
import { advanceInvasions } from './invasion.js';
import { aiCommand } from '../cmd/index.js';
import { aiLend } from '../dip/lend.js';
import { aiVolunteers } from './volunteers.js';
import { aiMines, aiAirMissions, aiRail, aiBuildsF4c } from './hoi.js';
import { COUNTRIES_WORLD } from '../../data/world/countries.js';
const QUIET_TAGS = new Set(Object.keys(COUNTRIES_WORLD));

/** Válčí země a některá její armáda má jen automatický plán (nebo žádný)? Pak se strategie spustí hned, ne až za týden. */
function newWar(state, o) {
  if (!hasWar(state.mil, o)) return false;
  for (let id = 1; id < state.mil.armies.length; id++) { const a = state.mil.armies[id]; if (a && a.o === o && (!a.plan || a.plan.auto)) return true; }
  return false;
}

/** Útočí země a některá její armáda už dobyla všechny cíle plánu? Pak dostane nové dřív než za týden (M88: průlom se nezastaví na první provincii). */
function spentOffensive(state, o) {
  if (!hasWar(state.mil, o)) return false;
  for (let id = 1; id < state.mil.armies.length; id++) { const a = state.mil.armies[id]; if (a && a.o === o && a.plan && a.plan.k === 'front' && a.plan.to.length === 0) return true; }
  return false;
}

/** Denní krok AI jako generátor (F2): přestávka (`yield`) po každé zemi; vrací nový stav (stejný jako `aiDay`). */
export function* aiDaySteps(state) {
  const w = getWorld();
  const player = playerOf(state);
  const weekly = state.tick % (24 * AI.PLAN_DAYS) === 0, soon = state.tick % (24 * AI.PLAN_DAYS_WAR) === 0;
  const scan = scanArmies(state);
  const day = Math.floor(state.tick / 24);
  for (let o = 1; o < w.owners.length; o++) {
    if (o === player || state.dip.cap[o]) continue;
    // W1 (výkon): země mimo Evropu bez války hrají plné kolo AI jen každý třetí den (rozprostřeně podle země); evropské země beze změny
    if (QUIET_TAGS.has(w.owners[o].tag) && (day + o) % AI.QUIET_DAYS !== 0 && !hasWar(state.mil, o)) continue;
    state = histStrategies(state, o);   // M92: historické strategie (duchové ze spouštěčů válek)
    state = aiDecisions(state, o);
    state = aiParties(state, o);
    state = aiSpy(state, o);
    state = aiForts(state, o);
    state = aiTrade(state, o);     // M88: dovoz surovin, které brzdí zbrojovky
    state = aiIndustry(state, o);
    yield;   // F2: přestávky i uvnitř jedné země (velmoci počítají desítky ms)
    state = aiArmy(state, o, scan);
    state = aiNavy(state, o);
    state = aiAir(state, o);
    state = aiDoctrine(state, o);
    state = aiDesign(state, o);   // M97: návrhy variant tanků, lodí a letadel
    state = aiLend(state, o);
    state = aiVolunteers(state, o);   // F4: dobrovolníci, licence a atašé
    state = aiAirMissions(aiMines(state, o), o);   // F4c: miny, úder na lodě, stíhání
    state = aiRail(state, o);   // F4c: dlouhé přesuny vlakem
    if ((Math.floor(state.tick / 24) + o) % 7 === 0) state = aiBuildsF4c(state, o);   // F4c: základny, pobřežní pevnosti, zásobovací uzly (týdně)
    state = aiFuel(state, o);    // M87: dovoz ropy při nedostatku paliva
    state = aiPara(state, o);    // M87: výsadkové divize a výsadky
    state = aiCommand(state, o);
    state = advanceInvasions(state, o);   // M71: shromáždění, nalodění a pauzy námořních invazí
    yield;
    if (weekly || newWar(state, o) || (soon && spentOffensive(state, o))) state = aiStrategy(state, o);   // M66: divadla války, přidělení armád, útok a obrana; v míru domácí rozmístění
    if (!state.dip.sub[o]) state = aiPacts(aiDiplomacy(state, o), o);   // M87: AI si pakty o neútočení nabízí i sama   // loutky nevedou vlastní diplomacii (M33)
    yield;
  }
  return state;
}

export function aiDay(state) {
  const g = aiDaySteps(state);
  let r = g.next();
  while (!r.done) r = g.next();
  return r.value;
}
