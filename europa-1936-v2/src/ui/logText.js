// Texty záznamů deníku dění (M26): čistá funkce záznam → { icon, tone, text, mine, world }. `me` = index země hráče (0 = pozorovatel).
import { getWorld } from '../engine/world.js';
import { TECHS } from '../data/research/techs.js';
import { FOCUS_BY_ID } from '../data/nat/focuses.js';
import { EVENT_BY_ID } from '../data/nat/events.js';
import { BUILDINGS } from '../data/industry/buildings.js';

const nm = (o) => getWorld().owners[o]?.name || '?';

export function logLine(e, me = 0) {
  const w = getWorld();
  switch (e.k) {
    case 'war': return { icon: 'swords', tone: 'bad', world: true, mine: e.a === me || e.b === me, text: `Válka: ${nm(e.a)} napadá zemi ${nm(e.b)}.` };
    case 'peace': return { icon: 'check', tone: 'good', world: true, mine: e.a === me || e.b === me, text: `Bílý mír mezi zeměmi ${nm(e.a)} a ${nm(e.b)}.` };
    case 'cap': return { icon: 'flag', tone: 'bad', world: true, mine: e.o === me, text: `Kapitulace: ${nm(e.o)}.` };
    case 'faction': return { icon: 'dip', tone: 'info', world: true, mine: e.o === me, text: `Nový blok „${e.x}“ (zakladatel: ${nm(e.o)}).` };
    case 'join': return { icon: 'dip', tone: 'info', world: true, mine: e.o === me, text: `${nm(e.o)} vstupuje do bloku „${e.x}“.` };
    case 'tech': return { icon: 'research', tone: 'good', world: false, mine: true, text: `Výzkum dokončen: ${TECHS[e.x]?.n || e.x}.` };
    case 'focus': return { icon: 'flag', tone: 'good', world: false, mine: true, text: `Národní cíl splněn: ${FOCUS_BY_ID[e.x]?.n || e.x}.` };
    case 'built': return { icon: 'industry', tone: 'good', world: false, mine: true, text: `Stavba dokončena: ${BUILDINGS[e.x]?.n || e.x}${e.s && w.states[e.s] ? ` (${w.states[e.s].n})` : ''}.` };
    case 'landing': return { icon: 'army', tone: e.a ? 'good' : 'info', world: false, mine: true, text: e.a ? `Vylodění dokončeno: ${w.provName(e.x)}.` : `Vylodění se nezdařilo, divize se vrátila: ${w.provName(e.x)}.` };
    case 'bombed': return { icon: 'air', tone: 'bad', world: false, mine: true, text: `Letecký útok na ${w.states[e.s]?.n || 'váš stát'}: klesla podpora války a část zásob byla zničena.` };
    case 'sunk': return { icon: 'close', tone: 'bad', world: false, mine: true, text: `Transportní loď s divizí potopena na cestě do provincie ${w.provName(e.x)}.` };
    case 'event': return { icon: 'politics', tone: 'info', world: false, mine: true, text: `Událost: ${EVENT_BY_ID[e.x]?.n || e.x}.` };
    default: return { icon: 'help', tone: 'info', world: false, mine: false, text: `Neznámý záznam: ${e.k}.` };
  }
}

/** Je záznam důležitý natolik, aby se ohlásil oznámením? (válka a kapitulace se zemí hráče nebo cizí kapitulace, dokončený výzkum a cíl hráče) */
export function logImportant(e, me) {
  if (e.k === 'war') return e.a === me || e.b === me;
  return e.k === 'cap' || e.k === 'tech' || e.k === 'focus' || e.k === 'sunk' || e.k === 'landing';
}
