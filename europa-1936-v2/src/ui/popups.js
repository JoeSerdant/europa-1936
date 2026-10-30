// Vyskakovací oznámení hráči (M58): z důležitých záznamů deníku se sestaví karta { kind, icon, tone, title, text, lines, sticky }.
import { getWorld } from '../engine/world.js';
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
    case 'release':
      return e.y === me ? { kind: 'release', icon: 'flag', tone: 'bad', title: 'Vznik nového státu', text: `${nm(e.o)} z vašich států vytvořila loutku ${nm(e.x)}.`, lines: [], sticky: true } : null;
    case 'ult':
      if (e.a === me) return { kind: 'ult', icon: 'dip', tone: e.y ? 'good' : 'bad', title: e.y ? 'Ultimátum přijato' : 'Ultimátum odmítnuto', text: e.y ? `${nm(e.b)} ustoupila vašemu požadavku.` : `${nm(e.b)} odmítla váš požadavek. Máte hotové ospravedlnění války.`, lines: [], sticky: !e.y };
      return null;
    case 'free': return { kind: 'free', icon: 'flag', tone: 'info', title: 'Loutka se osamostatnila', text: `${nm(e.x)} už není loutkou země ${nm(e.o)}.`, lines: [] };
    default: return null;
  }
}
