// Vyvážení výzkumu: všechna čísla na jednom místě (vlastní hodnoty). Čas ve dnech.
export const RES = {
  SPEED_BASE: 1,                         // dnů výzkumu za den při rychlosti 1
  SLOTS_TIER: { 1: 3, 2: 3, 3: 2 },      // sloty podle velikosti země
  SLOTS_MAX: 5,
  AHEAD_PEN: 1.5,                        // zpomalení za každý rok před historickým rokem: rychlost / (1 + AHEAD_PEN · roky)
  HOURS_PER_YEAR: 8766,
  START_YEAR: 1936,
};
