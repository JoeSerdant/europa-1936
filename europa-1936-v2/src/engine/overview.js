// Přehled zemí (M26): pořadí a síly všech zemí vypočtené ze stavu (nic se neukládá).
import { getWorld } from './world.js';
import { countryStats } from './selectors.js';
import { divisionCount } from './army/selectors.js';
import { hasWar } from './army/war.js';
import { tallyOwners } from './industry/core.js';
import { factionOf } from './dip/core.js';

/** Řádky přehledu seřazené podle vítězných bodů (sestupně), při shodě podle názvu: { o, tag, name, vp, pop, divs, civ, mil, stab, ws, war, cap, faction, player }. */
export function countryTable(state) {
  const w = getWorld();
  const tally = tallyOwners(state);
  const rows = [];
  for (let o = 1; o < w.owners.length; o++) {
    const tag = w.owners[o].tag;
    const st = countryStats(state, tag);
    if (!st) continue;
    const p = state.pol.own[o];
    const f = factionOf(state, o);
    rows.push({
      o, tag, name: w.owners[o].name, vp: st.vp, pop: st.pop, divs: divisionCount(state, o), civ: tally[o].civ, mil: tally[o].mil, dok: tally[o].dok,
      stab: p.stab, ws: p.ws, war: hasWar(state.mil, o), cap: !!state.dip.cap[o], faction: f ? f.nm : null, player: state.player === tag,
    });
  }
  rows.sort((a, b) => b.vp - a.vp || a.name.localeCompare(b.name, 'cs'));
  return rows;
}
