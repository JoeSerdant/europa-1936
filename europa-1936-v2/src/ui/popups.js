// Vyskakovací oznámení hráči (M58): z důležitých záznamů deníku se sestaví karta { kind, icon, tone, title, text, lines, sticky }.
import { getWorld } from '../engine/world.js';
import { IDEOLOGIES } from '../data/countries.js';
import { OVERSEAS } from '../data/dip/overseas.js';
import { FOCUS_BY_ID } from '../data/nat/focuses.js';
import { fxLinesOf, modLines } from '../data/nat/describe.js';
import { TECHS } from '../data/research/techs.js';
import { BUILDINGS } from '../data/industry/buildings.js';
import { DOCTRINES } from '../data/doc/doctrines.js';

const nm = (o) => getWorld().owners[o]?.name || '?';

/** Karta oznámení pro záznam `e` hráče `me`, nebo null, když se záznam jen ohlásí krátkým oznámením. */
export function popupFor(e, me) {
  const w = getWorld();
  switch (e.k) {
    case 'focus': {
      const f = FOCUS_BY_ID[e.x];
      if (!f) return null;
      return { kind: 'focus', icon: 'flag', tone: 'good', title: 'Národní cíl splněn', text: f.n, lines: [...fxLinesOf(f.fx), ...(f.mod ? modLines(f.mod) : [])] };
    }
    case 'tech': {
      const t = TECHS[e.x];
      return t ? { kind: 'tech', icon: 'research', tone: 'good', title: 'Výzkum dokončen', text: t.n, lines: t.info ? [t.info] : [] } : null;
    }
    case 'built': {
      const b = BUILDINGS[e.x];
      if (!b) return null;
      const where = e.p ? w.provName(e.p) : e.s && w.states[e.s] ? w.states[e.s].n : '';
      return { kind: 'built', icon: 'build', tone: 'good', title: 'Stavba dokončena', text: b.n, lines: where ? [where] : [] };
    }
    case 'doctrine': {
      const d = DOCTRINES[e.x];
      return d ? { kind: 'doctrine', icon: 'general', tone: 'good', title: 'Přijata doktrína', text: d.n, lines: [] } : null;
    }
    case 'war':
      if (e.b === me) return { kind: 'war', icon: 'swords', tone: 'bad', title: 'Byla vám vyhlášena válka', text: `${nm(e.a)} napadla vaši zemi.`, lines: [], sticky: true };
      if (e.a === me) return { kind: 'war', icon: 'swords', tone: 'bad', title: 'Válka', text: `Vaše země válčí s ${nm(e.b)}.`, lines: [], sticky: true };
      return null;
    case 'cap':
      return e.o === me ? { kind: 'cap', icon: 'flag', tone: 'bad', title: 'Kapitulace', text: 'Vaše země kapitulovala.', lines: [], sticky: true } : { kind: 'cap', icon: 'flag', tone: 'info', title: 'Kapitulace', text: `${nm(e.o)} kapitulovala.`, lines: [] };
    case 'civil':
      if (e.o === me) return { kind: 'civil', icon: 'swords', tone: 'bad', title: 'Občanská válka', text: `Část armády a území se postavily proti vládě. Povstalci vyhlásili stát ${nm(e.x)}.`, lines: ['Mír nelze uzavřít – rozhodne se na bojišti.'], sticky: true };
      return null;
    case 'nuke':
      return { kind: 'nuke', icon: 'air', tone: 'bad', title: 'Jaderný úder', text: e.b === me ? `${nm(e.o)} svrhla atomovou bombu na váš stát ${getWorld().states[e.x]?.n || ''}.` : `${nm(e.o)} svrhla atomovou bombu na ${getWorld().states[e.x]?.n || 'stát'} (${nm(e.b)}).`, lines: e.b === me ? ['Továrny státu jsou zčásti zničené, divize v něm oslabené a země otřesená.'] : [], sticky: e.b === me || e.o === me };
    case 'nukeready':
      return e.o === me ? { kind: 'nukeready', icon: 'air', tone: 'good', title: 'Atomová bomba', text: 'První bomba je hotová. Svrhnout ji může křídlo strategických bombardérů (okno Letectvo).', lines: [], sticky: true } : null;
    case 'aid':
      if (e.y === 1) return e.o === me ? { kind: 'aid', icon: 'trade', tone: 'good', title: 'Zámořská pomoc', text: `${OVERSEAS.n} vám začínají každý měsíc posílat výzbroj, letouny a palivo.`, lines: ['Zásilky chodí, dokud válčíte a váš hlavní přístav není zablokovaný.'], sticky: true } : { kind: 'aid', icon: 'trade', tone: 'info', title: 'Zámořská pomoc', text: `${OVERSEAS.n} začínají zásobovat zemi ${nm(e.o)}.`, lines: [] };
      return e.o === me && e.y === 0 ? { kind: 'aid', icon: 'trade', tone: 'bad', title: 'Zásilka nedorazila', text: 'Nepřátelská flotila blokuje váš hlavní přístav.', lines: [] } : null;
    case 'napq':
      return e.b === me ? { kind: 'napq', icon: 'dip', tone: 'info', title: 'Nabídka paktu', text: `${nm(e.a)} vám nabízí pakt o neútočení.`, lines: ['Odpovězte v okně Diplomacie; nabídka za měsíc vyprší.'], sticky: true } : null;
    case 'napend':
      return e.b === me ? { kind: 'napend', icon: 'dip', tone: 'bad', title: 'Pakt vypovězen', text: `${nm(e.a)} vypověděla pakt o neútočení s vaší zemí.`, lines: ['Počítejte s tím, že chystá válku.'], sticky: true } : null;
    case 'nap':
      return e.y && (e.a === me || e.b === me) ? { kind: 'nap', icon: 'dip', tone: 'good', title: 'Pakt o neútočení', text: `${nm(e.a)} a ${nm(e.b)} se zavázaly, že na sebe nezaútočí.`, lines: [] } : null;
    case 'gov':
      return e.o === me ? { kind: 'gov', icon: 'flag', tone: 'bad', title: 'Státní převrat', text: `Vládu převzala strana „${IDEOLOGIES[e.x]?.name || e.x}“. Stabilita klesla a politická moc byla vynulována.`, lines: ['Vztahy s ostatními zeměmi se přepočítávají podle nové ideologie.'], sticky: true } : { kind: 'gov', icon: 'flag', tone: 'info', title: 'Převrat ve světě', text: `V zemi ${nm(e.o)} se ujala moci strana „${IDEOLOGIES[e.x]?.name || e.x}“.`, lines: [] };
    case 'inv':
      return e.b === me && e.a ? { kind: 'inv', icon: 'army', tone: 'bad', title: 'Nepřátelská invaze', text: `${nm(e.o)} vysílá ${e.y} divizí k vylodění u ${getWorld().provName(e.x)}.`, lines: ['Přesuňte obranu k pobřeží nebo vyšlete flotilu.'], sticky: true } : null;
    case 'lands':
      return e.b === me ? { kind: 'lands', icon: 'army', tone: 'bad', title: 'Vylodění nepřítele', text: `${nm(e.o)} se vylodila: ${getWorld().provName(e.x)}.`, lines: [], sticky: true } : null;
    case 'release':
      return e.y === me ? { kind: 'release', icon: 'flag', tone: 'bad', title: 'Vznik nového státu', text: `${nm(e.o)} z vašich států vytvořila loutku ${nm(e.x)}.`, lines: [], sticky: true } : null;
    case 'ult':
      if (e.a === me) return { kind: 'ult', icon: 'dip', tone: e.y ? 'good' : 'bad', title: e.y ? 'Ultimátum přijato' : 'Ultimátum odmítnuto', text: e.y ? `${nm(e.b)} ustoupila vašemu požadavku.` : `${nm(e.b)} odmítla váš požadavek. Máte hotové ospravedlnění války.`, lines: [], sticky: !e.y };
      return null;
    case 'free': return { kind: 'free', icon: 'flag', tone: 'info', title: 'Loutka se osamostatnila', text: `${nm(e.x)} už není loutkou země ${nm(e.o)}.`, lines: [] };
    default: return null;
  }
}
