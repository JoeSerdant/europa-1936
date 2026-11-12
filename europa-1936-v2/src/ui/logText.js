// Texty záznamů deníku dění (M26): čistá funkce záznam → { icon, tone, text, mine, world }. `me` = index země hráče (0 = pozorovatel).
import { getWorld } from '../engine/world.js';
import { TECHS } from '../data/research/techs.js';
import { SPY_OPS } from '../data/spy/ops.js';
import { DOCTRINES } from '../data/doc/doctrines.js';
import { FOCUS_BY_ID } from '../data/nat/focuses.js';
import { EVENT_BY_ID } from '../data/nat/events.js';
import { DEMAND_BY_ID } from '../data/dip/demands.js';
import { IDEOLOGIES } from '../data/countries.js';
import { OVERSEAS } from '../data/dip/overseas.js';
import { PLANES } from '../data/air/planes.js';
import { ACE_NAMES } from '../engine/air/constants.js';
import { EQUIP } from '../data/army/index.js';
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
    case 'built': return { icon: 'industry', tone: 'good', world: false, mine: true, text: `Stavba dokončena: ${BUILDINGS[e.x]?.n || e.x}${e.p ? ` (${w.provName(e.p)})` : e.s && w.states[e.s] ? ` (${w.states[e.s].n})` : ''}.` };
    case 'landing': return { icon: 'army', tone: e.a ? 'good' : 'info', world: false, mine: true, text: e.a ? `Vylodění dokončeno: ${w.provName(e.x)}.` : `Vylodění se nezdařilo, divize se vrátila: ${w.provName(e.x)}.` };
    case 'bombed': return { icon: 'air', tone: 'bad', world: false, mine: true, text: `Letecký útok na ${w.states[e.s]?.n || 'váš stát'}: klesla podpora války a část zásob byla zničena.` };
    case 'convoy': return { icon: 'close', tone: 'bad', world: false, mine: true, text: `Nepřátelské lodě potopily ${e.x} ${e.x === 1 ? 'konvoj' : e.x < 5 ? 'konvoje' : 'konvojů'} s vaším zbožím.` };
    case 'puppet': return { icon: 'flag', tone: 'info', world: true, mine: true, text: `${w.owners[e.x].name} se stala loutkovým státem (${w.owners[e.o].name}).` };
    case 'annex': return { icon: 'flag', tone: 'info', world: true, mine: true, text: `${w.owners[e.o].name} anektovala ${w.owners[e.x].name}.` };
    case 'doctrine': return { icon: 'general', tone: 'good', world: false, mine: true, text: `Přijata doktrína: ${DOCTRINES[e.x]?.n || e.x}.` };
    case 'rebel': return { icon: 'flag', tone: 'info', world: true, mine: true, text: `Povstání ve státě ${w.states[e.s]?.n || ''}: ${w.owners[e.o].name} vyhnala okupační správu (${w.owners[e.x].name}).` };
    case 'spy': {
      const op = SPY_OPS[e.y], t = w.owners[e.x].name, me = w.owners[e.o].name;
      return { icon: 'target', tone: e.z === 1 ? 'good' : 'bad', world: false, mine: true, text: `${me}: operace „${op.n}“ proti zemi ${t} ${e.z === 1 ? 'uspěla' : e.z === 2 ? 'selhala a agent byl odhalen' : 'selhala'}.` };
    }
    case 'sunk': return { icon: 'close', tone: 'bad', world: false, mine: true, text: `Transportní loď s divizí potopena na cestě do provincie ${w.provName(e.x)}.` };
    case 'event': return { icon: 'politics', tone: 'info', world: false, mine: true, text: `Událost: ${EVENT_BY_ID[e.x]?.n || e.x}.` };
    case 'lend': return { icon: 'trade', tone: 'good', world: false, mine: e.a === me || e.b === me, text: `${nm(e.a)} posílá zemi ${nm(e.b)} výzbroj: ${EQUIP[e.x]?.n || e.x} × ${e.y}.` };
    case 'gar': return { icon: 'dip', tone: 'info', world: true, mine: e.a === me || e.b === me, text: `${nm(e.a)} zaručuje nezávislost země ${nm(e.b)}.` };
    case 'ult': return { icon: 'dip', tone: e.y ? 'info' : 'bad', world: true, mine: e.a === me || e.b === me, text: `${nm(e.a)} předložila ultimátum zemi ${nm(e.b)} (${DEMAND_BY_ID[e.x]?.n || e.x}): ${e.y ? 'požadavek byl přijat.' : 'požadavek byl odmítnut.'}` };
    case 'ultq': return { icon: 'dip', tone: 'bad', world: true, mine: e.a === me || e.b === me, text: `${nm(e.a)} předložila ultimátum zemi ${nm(e.b)} (${DEMAND_BY_ID[e.x]?.n || e.x}).` };
    case 'civil': return { icon: 'swords', tone: 'bad', world: true, mine: e.o === me || e.x === me, text: e.y ? `V zemi ${nm(e.o)} vypukla občanská válka: povstalci vyhlásili stát ${nm(e.x)}.` : `Od země ${nm(e.o)} se oddělil stát ${nm(e.x)}.` };
    case 'gov': return { icon: 'flag', tone: e.o === me ? 'bad' : 'info', world: true, mine: e.o === me, text: `V zemi ${nm(e.o)} proběhl převrat: vládu převzala strana „${IDEOLOGIES[e.x]?.name || e.x}“.` };
    case 'inv': return { icon: 'army', tone: e.b === me ? 'bad' : 'info', world: true, mine: e.o === me || e.b === me, text: e.a ? `${nm(e.o)} vysílá ${e.y} divizí k vylodění u ${w.provName(e.x)} (${nm(e.b)}).` : `${nm(e.o)} posílá ${e.y} divizí jako posily do předmostí u ${w.provName(e.x)}.` };
    case 'lands': return { icon: 'army', tone: 'bad', world: false, mine: true, text: e.y ? `Nepřátelský výsadek (${nm(e.o)}): ${w.provName(e.x)}.` : `Nepřítel (${nm(e.o)}) se vylodil: ${w.provName(e.x)}.` };
    case 'release': return { icon: 'flag', tone: 'info', world: true, mine: e.o === me || e.y === me, text: `${nm(e.o)} z území poražené země ${nm(e.y)} vytvořila loutkový stát ${nm(e.x)}.` };
    case 'nuke': return { icon: 'air', tone: 'bad', world: true, mine: e.o === me || e.b === me, text: `${nm(e.o)} svrhla atomovou bombu na ${w.states[e.x]?.n || 'stát'} (${nm(e.b)}).` };
    case 'nukeready': return { icon: 'air', tone: 'good', world: false, mine: true, text: 'Atomová bomba je připravena k použití.' };
    case 'drop': return { icon: 'air', tone: e.a ? 'good' : 'bad', world: false, mine: true, text: e.a ? `Výsadek dopadl: ${w.provName(e.x)}.` : `Výsadek se vrátil na letiště (${w.provName(e.x)}): cíl obsadili obránci.` };
    case 'aid': return { icon: 'trade', tone: e.y ? 'good' : 'bad', world: e.y === 1, mine: e.o === me, text: e.y === 1 ? `${OVERSEAS.n} začínají dodávat výzbroj a palivo zemi ${nm(e.o)}.` : e.y ? `Dorazila ${OVERSEAS.adj} zásilka výzbroje a paliva.` : `Zásilka ze zámoří nedorazila: přístav je zablokovaný.` };
    case 'nap': return { icon: 'dip', tone: e.y ? 'info' : 'bad', world: !!e.y, mine: e.a === me || e.b === me, text: e.y ? `${nm(e.a)} a ${nm(e.b)} uzavřely pakt o neútočení.` : `${nm(e.b)} odmítla pakt o neútočení se zemí ${nm(e.a)}.` };
    case 'napq': return { icon: 'dip', tone: 'info', world: false, mine: e.b === me, text: `${nm(e.a)} vám nabízí pakt o neútočení.` };
    case 'napend': return { icon: 'dip', tone: 'bad', world: true, mine: e.a === me || e.b === me, text: `${nm(e.a)} vypověděla pakt o neútočení se zemí ${nm(e.b)}.` };
    case 'access': return { icon: 'dip', tone: 'info', world: true, mine: e.a === me || e.b === me, text: `${nm(e.a)} dovoluje armádám země ${nm(e.b)} průchod svým územím.` };
    case 'accend': return { icon: 'dip', tone: 'info', world: true, mine: e.a === me || e.b === me, text: `${nm(e.a)} odvolala přístup armádám země ${nm(e.b)}.` };
    case 'garend': return { icon: 'dip', tone: 'info', world: true, mine: e.a === me || e.b === me, text: `${nm(e.a)} už nezaručuje nezávislost země ${nm(e.b)}.` };
    case 'ace': return { icon: 'air', tone: 'good', world: false, mine: true, text: `Křídlo ${PLANES[e.x]?.n || e.x}: ${ACE_NAMES[e.y] || 'eso'} se vyznamenal ve vzdušném boji.` };
    case 'free': return { icon: 'flag', tone: 'info', world: true, mine: true, text: `${w.owners[e.x].name} se osamostatnila a přestala být loutkou země ${w.owners[e.o].name}.` };
    case 'take': return { icon: 'flag', tone: 'info', world: true, mine: true, text: `${nm(e.o)} převzala ${e.y} ${e.y === 1 ? 'stát' : e.y < 5 ? 'státy' : 'států'} země ${nm(e.x)}.` };
    case 'tribute': return { icon: 'flag', tone: 'info', world: true, mine: true, text: `${nm(e.x)} musela zaplatit zemi ${nm(e.o)} válečné odškodné.` };
    default: return { icon: 'help', tone: 'info', world: false, mine: false, text: `Neznámý záznam: ${e.k}.` };
  }
}

/** Je záznam důležitý natolik, aby se ohlásil oznámením? (válka a kapitulace se zemí hráče nebo cizí kapitulace, dokončený výzkum a cíl hráče) */
export function logImportant(e, me) {
  if (e.k === 'war') return e.a === me || e.b === me;
  if (e.k === 'gov' || e.k === 'nuke' || e.k === 'nukeready') return true;
  if (e.k === 'aid') return e.y === 1 || (e.o === me && e.y === 0);
  if (e.k === 'napq' || e.k === 'napend') return e.b === me;
  if (e.k === 'nap') return !!e.y && (e.a === me || e.b === me);
  if (e.k === 'inv') return e.b === me && !!e.a;
  return e.k === 'cap' || e.k === 'tech' || e.k === 'focus' || e.k === 'sunk' || e.k === 'landing' || e.k === 'lands' || e.k === 'drop' || e.k === 'built' || e.k === 'doctrine' || e.k === 'free';
}
