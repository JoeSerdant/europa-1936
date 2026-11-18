// Odezva hry (M101): z nových záznamů deníku sestaví velký pruh uprostřed obrazovky (`bannerFor`) a novinovou zprávu ze světa (`newsFor`).
// Čisté funkce bez stavu rozhraní; texty jsou vlastní, variantu vybírá hash id záznamu (stejný záznam = stejný text).
import { getWorld } from '../engine/world.js';
import { IDEOLOGIES } from '../data/countries.js';
import { FOCUS_BY_ID } from '../data/nat/focuses.js';
import { fxLinesOf, modLines } from '../data/nat/describe.js';
import { TECHS } from '../data/research/techs.js';
import { DOCTRINES } from '../data/doc/doctrines.js';

const GREAT = new Set(['GER', 'SOV', 'ENG', 'FRA', 'ITA']);
const nm = (o) => getWorld().owners[o]?.name || '?';
const tag = (o) => getWorld().owners[o]?.tag || '';
const great = (o) => GREAT.has(tag(o));
const pick = (list, seed) => list[Math.abs(Math.imul(seed | 0, 2654435761)) % list.length];

/** Velký pruh uprostřed nahoře pro záznam hráče `me`: { kind, icon, tone, title, text, chips, sound }, nebo null. */
export function bannerFor(e, me) {
  if (!me) return null;
  switch (e.k) {
    case 'focus': {
      const f = FOCUS_BY_ID[e.x];
      if (!f) return null;
      return { kind: 'focus', icon: 'flag', tone: 'good', title: 'Národní cíl splněn', text: f.n, chips: [...fxLinesOf(f.fx), ...(f.mod ? modLines(f.mod) : [])].slice(0, 5), sound: 'fanfare' };
    }
    case 'tech': {
      const t = TECHS[e.x];
      return t ? { kind: 'tech', icon: 'research', tone: 'good', title: 'Výzkum dokončen', text: t.n, chips: t.info ? [t.info] : [], sound: 'chime' } : null;
    }
    case 'doctrine': {
      const d = DOCTRINES[e.x];
      return d ? { kind: 'doctrine', icon: 'general', tone: 'good', title: 'Nová doktrína', text: d.n, chips: [], sound: 'chime' } : null;
    }
    case 'war':
      if (e.a === me) return { kind: 'war', icon: 'swords', tone: 'bad', title: 'Vyhlásili jste válku', text: nm(e.b), chips: ['Armády překračují hranice'], sound: 'drum' };
      if (e.b === me) return { kind: 'war', icon: 'swords', tone: 'bad', title: 'Napadla nás', text: nm(e.a), chips: ['Země je ve válce'], sound: 'drum' };
      return null;
    case 'peace':
      return e.a === me || e.b === me ? { kind: 'peace', icon: 'check', tone: 'good', title: 'Mír', text: nm(e.a === me ? e.b : e.a), chips: ['Zbraně utichly'], sound: 'fanfare' } : null;
    case 'cap':
      if (e.o === me) return { kind: 'cap', icon: 'flag', tone: 'bad', title: 'Kapitulace', text: nm(e.o), chips: ['Země složila zbraně'], sound: 'end' };
      return null;
    case 'gov':
      return e.o === me ? { kind: 'gov', icon: 'politics', tone: 'info', title: 'Nová vláda', text: IDEOLOGIES[e.x]?.name || e.x, chips: ['Stabilita klesla', 'Politická moc vynulována'], sound: 'drum' } : null;
    case 'annex':
      return e.o === me ? { kind: 'annex', icon: 'flag', tone: 'good', title: 'Anexe', text: nm(e.x), chips: ['Území připojeno'], sound: 'fanfare' } : null;
    default: return null;
  }
}

/** Je zpráva o záznamu `e` dost velká pro noviny? (velmoci, hráč a jeho sousedé ve válce; kapitulace a převraty kdekoli) */
function newsworthy(e, me) {
  switch (e.k) {
    case 'war': return great(e.a) || great(e.b) || e.a === me || e.b === me;
    case 'cap': case 'gov': case 'civil': case 'nuke': case 'restore': case 'exile': case 'annex': case 'release': return true;
    case 'faction': return true;
    case 'join': return great(e.o) || e.o === me;
    case 'ult': return !!e.y;
    case 'nap': return !!e.y && (great(e.a) && great(e.b));
    case 'inv': return !!e.a && great(e.o) && great(e.b);
    case 'puppet': return great(e.o);
    default: return false;
  }
}

/**
 * Novinová zpráva ze světa (M101): { id, kind, art, paper, headline, sub, body }, nebo null. `state` slouží jen k datu.
 * Válku, ve které je hráč sám, ohlásí pruh i noviny (jako v HOI4).
 */
export function newsFor(e, me) {
  if (!newsworthy(e, me)) return null;
  const w = getWorld(), s = e.id || 0;
  const A = nm(e.a), B = nm(e.b), O = nm(e.o), X = e.x && w.owners[e.x] ? nm(e.x) : '';
  const base = { id: e.id, paper: pick(['Evropský kurýr', 'Večerní hlasatel', 'Světová kronika', 'Denní telegraf'], s) };
  switch (e.k) {
    case 'war': return { ...base, kind: 'war', art: 'war', headline: pick([`Válka! ${A} vtrhla do země ${B}`, `${A} vyhlásila válku zemi ${B}`, `Děla promluvila: ${A} proti zemi ${B}`], s),
      sub: pick(['Vojska překročila hranice za úsvitu. Svět čeká, kdo se přidá.', 'Diplomaté opouštějí velvyslanectví, nádraží jsou plná vojáků.', 'Mobilizační vyhlášky visí na každém rohu.'], s),
      body: `Podle prvních zpráv postupují jednotky země ${A} na několika místech fronty. Vláda země ${B} vyzvala obyvatelstvo ke klidu a spojence k pomoci.` };
    case 'cap': return { ...base, kind: 'cap', art: 'surrender', headline: pick([`${O} kapitulovala`, `Konec odporu: ${O} skládá zbraně`, `${O} podepsala kapitulaci`], s),
      sub: 'Na vládních budovách vlají bílé prapory. O osudu země rozhodnou vítězové.', body: `Armáda země ${O} přestala klást odpor. Vítězné mocnosti se sejdou, aby rozhodly o novém uspořádání.` };
    case 'gov': {
      const ideo = IDEOLOGIES[e.x]?.name || String(e.x);
      return { ...base, kind: 'gov', art: 'crowd', headline: pick([`Převrat v zemi ${O}`, `${O}: moc převzala strana „${ideo}“`, `Revoluce otřásla zemí ${O}`], s),
        sub: `Nová vláda (${ideo.toLowerCase()}) slibuje pořádek a nový kurz zahraniční politiky.`, body: `Ulice hlavního města zaplnily davy. Sousední země sledují vývoj s obavami a přepočítávají svá spojenectví.` };
    }
    case 'civil': return { ...base, kind: 'civil', art: 'war', headline: `Občanská válka v zemi ${O}`, sub: X ? `Povstalci vyhlásili vlastní stát ${X}.` : 'Země se rozpadla na dva tábory.', body: 'Bratr stojí proti bratrovi. Cizí mocnosti zvažují, kterou stranu podpořit.' };
    case 'nuke': return { ...base, kind: 'nuke', art: 'nuke', headline: `Nová zbraň: ${O} svrhla atomovou bombu`, sub: `Zasažen byl ${w.states[e.x]?.n || 'stát'} (${B}).`, body: 'Jediný letoun srovnal se zemí celé město. Svět se probouzí do nového věku.' };
    case 'restore': return { ...base, kind: 'restore', art: 'peace', headline: `${O} je osvobozena`, sub: 'Exilová vláda se vrací do hlavního města.', body: 'Zvony vyzvánějí a lidé vítají vojáky květinami.' };
    case 'exile': return { ...base, kind: 'exile', art: 'navy', headline: `Vláda země ${O} odešla do exilu`, sub: X ? `Útočiště našla v zemi ${X}.` : '', body: 'Ministři odpluli s posledními loděmi a slibují pokračovat v boji.' };
    case 'annex': return { ...base, kind: 'annex', art: 'treaty', headline: `${O} připojila zemi ${X}`, sub: 'Hranice na mapách Evropy se znovu mění.', body: `Úřady země ${X} předaly správu novým pánům.` };
    case 'release': return { ...base, kind: 'release', art: 'treaty', headline: `Vzniká nový stát: ${X}`, sub: `Vytvořila jej ${O} z území poražené země ${nm(e.y)}.`, body: 'Nová vláda slibuje věrnost svému ochránci.' };
    case 'puppet': return { ...base, kind: 'puppet', art: 'treaty', headline: `${X} pod ochranou země ${O}`, sub: 'Loutková vláda podepsala smlouvu o spojenectví.', body: '' };
    case 'faction': return { ...base, kind: 'faction', art: 'treaty', headline: `Nový blok: „${e.x}“`, sub: `Zakladatelem je ${O}.`, body: 'Smlouva zavazuje členy k vzájemné pomoci v případě války.' };
    case 'join': return { ...base, kind: 'join', art: 'treaty', headline: `${O} vstupuje do bloku „${e.x}“`, sub: 'Rovnováha sil v Evropě se posouvá.', body: '' };
    case 'ult': return { ...base, kind: 'ult', art: 'treaty', headline: `${B} ustoupila požadavkům země ${A}`, sub: 'Válka byla odvrácena – prozatím.', body: 'Diplomaté mluví o míru pro naši dobu. Kritici varují, že ústupky jen povzbudí další požadavky.' };
    case 'nap': return { ...base, kind: 'nap', art: 'treaty', headline: `${A} a ${B} uzavřely pakt o neútočení`, sub: 'Svět žasne nad nečekaným spojenectvím.', body: '' };
    case 'inv': return { ...base, kind: 'inv', art: 'landing', headline: `${O} se vylodila na pobřeží: ${w.provName(e.x)}`, sub: `Na pláže míří ${e.y} divizí.`, body: 'Lodě zahalil kouř z dělostřelecké přípravy.' };
    default: return null;
  }
}

/** Ilustrace události podle klíčových slov v názvu a textu (M101). */
const ART_WORDS = [
  ['war', /válk|front|útok|armád|vojsk|mobiliz|bitv|zbra/i],
  ['navy', /lod|flot|námoř|přístav|ponork/i],
  ['air', /leten|letadl|letect|letiš|bombard/i],
  ['industry', /továr|průmysl|výrob|stavb|ocel|hut|železnic|surovin|ropa|ropy|doly|důl/i],
  ['science', /výzkum|vědc|vynález|laborato|inženýr|univerzit/i],
  ['crowd', /stávk|demonstr|dav|nepokoj|převrat|revoluc|stran|volb|parlament|vlád/i],
  ['treaty', /smlouv|pakt|dohod|ultimát|vyjedn|diploma|spojen/i],
  ['farm', /úrod|sklize|potravin|zemědě|venkov|hlad/i],
  ['peace', /slavnost|sport|oslav|mír|výstav/i],
];
export function artFor(ev) {
  const t = `${ev.n || ''} ${ev.text || ''}`;
  for (const [k, re] of ART_WORDS) if (re.test(t)) return k;
  return 'flag';
}
