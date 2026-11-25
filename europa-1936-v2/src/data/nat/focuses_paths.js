// W5: rozšíření stromů všech zemí o větve s volbou cesty (vlastní obsah, názvy a čísla). Přidávají se pod strom přes `grow`:
//  - armádní doktrína: lidová armáda × profesionální armáda × pohyblivá válka (vzájemně se vylučují),
//  - průmysl: těžký průmysl × spotřební průmysl × těžba surovin, společné vyústění „Průmyslová zralost“,
//  - zahraniční politika (ne velmoci): demokracie × Osa × Moskva × přísná neutralita,
//  - podpůrné služby: zdravotníci, ženisté, spojaři, protiletadlová obrana, letecká škola, pobřežní obrana, velitelský sbor,
//  - W6: cíle odemykající rozhodnutí (velitelský sbor → Velká ofenziva, mobilizační plán → Povolání záloh, mimořádné pravomoci → Vláda národní jednoty).
// Cíle hlavně urychlují výzkum a dávají zkušenosti; továrny jen výjimečně (pravidlo 92). Historická AI bere volbu, která je
// v seznamu první (`grow` řadí AI podle pořadí v řádku) – historické volby zemí jsou v `DOCTRINE`, `INDUSTRY` a `ALIGN`.
import { COUNTRIES } from '../countries.js';

const civ = (n = 1) => ({ t: 'factory', k: 'civ', n });
const mil = (n = 1) => ({ t: 'factory', k: 'mil', n });
const stab = (v) => ({ t: 'stab', v });
const ws = (v) => ({ t: 'ws', v });
const pp = (v) => ({ t: 'pp', v });
const man = (v) => ({ t: 'man', v });
const infra = (n = 1) => ({ t: 'infra', n });
const stock = (eq, n) => ({ t: 'stock', eq, n });
const boost = (id, v = 0.3) => ({ t: 'boost', id, v });
const xp = (b, n = 20) => ({ t: 'xp', b, n });
const party = (i, v) => ({ t: 'party', i, v });
const NAMES = { ENG: 'Británie', USA: 'Spojené státy', FRA: 'Francie', GER: 'Německo', ITA: 'Itálie', JAP: 'Japonsko', SOV: 'SSSR' };
const rel = (tag, v) => ({ t: 'rel', tag, nm: NAMES[tag] || tag, v });

/** Velmoci: bez větve zahraniční politiky (mají vlastní diplomatické větve a politické cesty). */
const MAJOR = new Set(['GER', 'SOV', 'ENG', 'FRA', 'ITA', 'USA', 'JAP', 'CHI']);
/** Historická armádní doktrína (výchozí: profesionální armáda pro velmoci a regionální mocnosti, lidová armáda pro malé státy). */
const DOCTRINE = { GER: 'mob', USA: 'mob', SOV: 'mass', CHI: 'mass', PRC: 'mass', ENG: 'qual', FRA: 'mass', ITA: 'qual', JAP: 'qual', POL: 'mass', FIN: 'qual', RAJ: 'mass' };
/** Historický průmysl (výchozí: těžký pro velmoci a regionální mocnosti, spotřební pro malé státy). */
const INDUSTRY = { ROM: 'res', PER: 'res', IRQ: 'res', SAU: 'res', VEN: 'res', MEX: 'res', BOL: 'res', CHL: 'res', PRU: 'res', SWE: 'res', MAN: 'res', SIK: 'res' };
/** Historický zahraniční příklon malých zemí (výchozí: demokracie). */
const ALIGN = {
  HUN: 'axis', ROM: 'axis', BUL: 'axis', MAN: 'axis', SIA: 'axis', SLO: 'axis', CRO: 'axis', NSP: 'axis', VIC: 'axis',
  MON: 'com', TAN: 'com', PRC: 'com', SIK: 'com',
  SWI: 'neut', SWE: 'neut', IRE: 'neut', POR: 'neut', SPR: 'neut', TUR: 'neut', ARG: 'neut', AFG: 'neut', TIB: 'neut', YEM: 'neut',
  SAU: 'neut', CHL: 'neut', ICE: 'neut', FIN: 'neut', PER: 'neut',
};

/** Seřadí skupinu vzájemně se vylučujících kořenů tak, aby historická volba byla první, a doplní `excl`. */
function choice(list, first) {
  const ids = list.map((r) => r[0]);
  const sorted = [...list].sort((a, b) => (a[0].endsWith(first) ? -1 : b[0].endsWith(first) ? 1 : 0));
  return sorted.map(([id, n, days, req, fx, extra = {}]) => [id, n, days, req, fx, { ...extra, excl: ids.filter((x) => x !== id) }]);
}

/** Rozšiřující cíle země `tag` (prefix id `<tag>_px_`); `DEF` = výchozí strom vydaných a nových zemí. */
export function pathRows(tag) {
  const p = `${tag.toLowerCase()}_px_`, q = (s) => p + s;
  const tier = COUNTRIES[tag]?.tier ?? 3;
  const doc = DOCTRINE[tag] || (tier <= 2 ? 'qual' : 'mass');
  const ind = INDUSTRY[tag] || (tier <= 2 ? 'heavy' : 'cons');
  const rows = [];
  // ---- armádní doktrína
  rows.push(...choice([
    [q('mass'), 'Lidová armáda', 35, [], [man(0.003), ws(0.03)], { info: 'Početná armáda z branců: kvantita před kvalitou.' }],
    [q('qual'), 'Profesionální armáda', 35, [], [xp('land', 20), pp(15)], { info: 'Menší, ale dokonale vycvičená armáda.' }],
    [q('mob'), 'Pohyblivá válka', 35, [], [boost('auta2', 0.3), xp('land', 10)], { info: 'Motory místo pochodu: rychlost rozhoduje.' }],
  ], doc));
  rows.push(
    [q('mass2'), 'Krátký výcvik', 35, [q('mass')], [boost('inf_kul', 0.3), man(0.002)]],
    [q('mass3'), 'Obrana do hloubky', 35, [q('mass2')], [boost('inf_zak', 0.4), xp('land', 15)]],
    [q('mass4'), 'Válka vyčerpání', 70, [q('mass3')], [boost('art_opt', 0.3), stock('pusky', 1500)]],
    [q('qual2'), 'Poddůstojnická škola', 35, [q('qual')], [boost('sup_pruz', 0.4), xp('land', 10)]],
    [q('qual3'), 'Elitní prapory', 35, [q('qual2')], [boost('inf_komando', 0.3), boost('inf_pzbr', 0.3)]],
    [q('qual4'), 'Spolupráce zbraní', 70, [q('qual3')], [boost('art_mot', 0.3), xp('land', 15)]],
    [q('mob2'), 'Motorizovaná pěchota', 35, [q('mob')], [boost('auta3', 0.3), boost('vozy2', 0.3)]],
    [q('mob3'), 'Obrněné svazy', 35, [q('mob2')], [boost('ltank2', 0.3), boost('tank_rad', 0.3)]],
    [q('mob4'), 'Průlom a obchvat', 70, [q('mob3')], [boost('tank_sus', 0.3), xp('land', 15)]],
  );
  // ---- průmysl
  rows.push(...choice([
    [q('heavy'), 'Těžký průmysl', 70, [], [mil(), boost('ind_mech', 0.2)], { info: 'Ocel, stroje a zbrojovky.' }],
    [q('cons'), 'Spotřební průmysl', 70, [], [civ(), stab(0.02)], { info: 'Továrny pro obyvatele: stabilní a bohatší země.' }],
    [q('res'), 'Těžba surovin', 70, [], [boost('tez1', 0.4)], { mod: { extract: 0.05 }, info: 'Bohatství leží pod zemí.' }],
  ], ind));
  rows.push(
    [q('heavy2'), 'Válečné rezervy', 35, [q('heavy')], [boost('ind_obr', 0.3)]],
    [q('heavy3'), 'Přesné strojírenství', 35, [q('heavy2')], [boost('ind_mech', 0.3)], { mod: { prod: 0.02 } }],
    [q('cons2'), 'Obchodní síť', 35, [q('cons')], [infra(), pp(20)]],
    [q('cons3'), 'Stavební rozmach', 35, [q('cons2')], [boost('ind_bet', 0.3)], { mod: { build: 0.02 } }],
    [q('res2'), 'Hlubinné doly', 35, [q('res')], [boost('tez2', 0.4)]],
    [q('res3'), 'Rafinerie', 35, [q('res2')], [boost('ind_rafin', 0.4)], { mod: { extract: 0.02 } }],
    [q('indfin'), 'Průmyslová zralost', 35, [], [boost('ind_pas', 0.3), boost('stav1', 0.3)], { any: [q('heavy3'), q('cons3'), q('res3')] }],
  );
  // ---- zahraniční politika (malé a střední země)
  if (!MAJOR.has(tag)) {
    const al = ALIGN[tag] || 'dem';
    rows.push(...choice([
      [q('dem'), 'Příklon k demokraciím', 35, [], [rel('ENG', 25), rel('USA', 20)], { info: 'Hledat ochranu u západních demokracií.' }],
      [q('axis'), 'Příklon k Ose', 35, [], [rel('GER', 25), rel('ITA', 20)], { info: 'Sázka na vzestup nových mocností.' }],
      [q('com'), 'Příklon k Moskvě', 35, [], [rel('SOV', 30), pp(10)], { info: 'Spojenectví se sovětským státem.' }],
      [q('neut'), 'Přísná neutralita', 35, [], [stab(0.04), pp(30)], { info: 'Do cizích válek se nemíchat.' }],
    ], al));
    rows.push(
      [q('dem2'), 'Poradci ze západu', 35, [q('dem')], [xp('land', 15), rel('FRA', 20)]],
      [q('axis2'), 'Obchod s Osou', 35, [q('axis')], [pp(20), rel('JAP', 15), rel('GER', 10)]],
      [q('com2'), 'Dělnické hnutí', 35, [q('com')], [party('communism', 6), man(0.002)]],
      [q('neut2'), 'Ozbrojená neutralita', 35, [q('neut')], [boost('inf_zak', 0.3), ws(0.03)]],
    );
  }
  // ---- podpůrné služby
  rows.push(
    [q('med'), 'Polní nemocnice', 35, [], [boost('sup_san', 0.3), man(0.001)]],
    [q('eng'), 'Ženijní vojsko', 35, [], [boost('sup_zen', 0.4)]],
    [q('sig'), 'Spojovací vojsko', 35, [q('eng')], [boost('el_radio', 0.3), boost('sup_sifr', 0.2)]],
    [q('aa'), 'Protiletadlová obrana', 35, [q('med')], [boost('art_pl', 0.4)]],
    [q('air'), 'Letecká škola', 35, [q('aa')], [xp('air', 15), boost('pal2', 0.2)]],
    [q('coast'), 'Pobřežní obrana', 35, [q('sig')], [boost('dd2', 0.2), xp('sea', 10)]],
    [q('cmd'), 'Velitelský sbor', 70, [q('air'), q('coast')], [xp('land', 15), pp(25)], { info: 'Odemkne rozhodnutí Velká ofenziva.' }],
  );
  // ---- W6: cíle, které odemykají rozhodnutí
  rows.push(
    [q('mobplan'), 'Mobilizační plán', 35, [], [man(0.002), xp('land', 10)], { any: [q('mass4'), q('qual4'), q('mob4')], info: 'Odemkne rozhodnutí Povolání záloh.' }],
    [q('decree'), 'Mimořádné pravomoci', 35, MAJOR.has(tag) ? [q('indfin')] : [], [pp(40), stab(0.02)],
      { ...(MAJOR.has(tag) ? {} : { any: [q('dem2'), q('axis2'), q('com2'), q('neut2')] }), info: 'Odemkne rozhodnutí Vláda národní jednoty.' }],
  );
  return rows;
}
