// P2: další větve národních cílů pro všechny země (vlastní obsah, názvy a čísla) – hospodářství, věda, pozemní vojsko, letectvo,
// námořnictvo a vnitřní politika; v každé větvi volba ze dvou vzájemně se vylučujících směrů. Připojují se ke všem stromům přes `grow`
// (prefix id `<tag>_p2_`). Cíle hlavně urychlují výzkum a dávají zkušenosti; trvalé bonusy jsou malé (pravidlo 92).
import { COUNTRIES } from '../countries.js';

const stab = (v) => ({ t: 'stab', v });
const ws = (v) => ({ t: 'ws', v });
const pp = (v) => ({ t: 'pp', v });
const man = (v) => ({ t: 'man', v });
const infra = (n = 1) => ({ t: 'infra', n });
const boost = (id, v = 0.3) => ({ t: 'boost', id, v });
const slot = (v = 0.2) => ({ t: 'boostslot', v });
const xp = (b, n = 20) => ({ t: 'xp', b, n });
const stock = (eq, n) => ({ t: 'stock', eq, n });

/** Dvojice vzájemně se vylučujících cílů; první je ta, kterou bere AI (nižší pořadí). */
function pair(a, b) {
  return [[...a.slice(0, 5), { ...(a[5] || {}), excl: [b[0]] }], [...b.slice(0, 5), { ...(b[5] || {}), excl: [a[0]] }]];
}

/** Další cíle země `tag` (`DEF` = výchozí strom). Malé státy (tier 3) mají kratší námořní a leteckou větev. */
export function moreRows(tag) {
  const q = (s) => `${tag.toLowerCase()}_p2_${s}`;
  const small = (COUNTRIES[tag]?.tier ?? 3) >= 3;
  const rows = [];
  // ---- hospodářství
  rows.push(
    [q('eco1'), 'Hospodářská rada', 35, [], [pp(20), boost('org1')], { info: 'Odborníci radí vládě, jak řídit výrobu.' }],
    [q('eco2'), 'Silnice do provincií', 35, [q('eco1')], [infra(), boost('stav1')]],
    ...pair(
      [q('eco3a'), 'Státní zakázky', 35, [q('eco2')], [boost('org2')], { mod: { prod: 0.02 }, info: 'Stát objednává, továrny vyrábějí.' }],
      [q('eco3b'), 'Volný trh', 35, [q('eco2')], [boost('stav2')], { mod: { build: 0.04 }, info: 'Soukromý kapitál staví rychleji.' }],
    ),
    [q('eco4'), 'Normalizace výroby', 35, [], [boost('ind_pas'), boost('ind_bet')], { any: [q('eco3a'), q('eco3b')] }],
    [q('eco5'), 'Hledání nalezišť', 35, [q('eco4')], [boost('tez1'), boost('tez2', 0.2)], { mod: { extract: 0.03 } }],
    [q('eco6'), 'Strojní pokrok', 49, [q('eco5')], [boost('ind_mech'), boost('ind_prefab')]],
  );
  // ---- věda
  rows.push(
    [q('sci1'), 'Vědecká rada', 35, [], [slot(0.2)], { info: 'Koordinace výzkumu napříč ústavy.' }],
    [q('sci2'), 'Technické univerzity', 35, [q('sci1')], [boost('vyz_univ'), boost('vyz1')]],
    ...pair(
      [q('sci3a'), 'Vojenský výzkum', 35, [q('sci2')], [boost('el_radio'), boost('el_sifr')], { info: 'Výzkum slouží především armádě.' }],
      [q('sci3b'), 'Otevřená věda', 35, [q('sci2')], [boost('lab1'), stab(0.02)], { mod: { research: 0.02 }, info: 'Svobodné bádání a výměna poznatků.' }],
    ),
    [q('sci4'), 'Laboratoře', 49, [], [boost('vyz_lab'), slot(0.25)], { any: [q('sci3a'), q('sci3b')] }],
    [q('sci5'), 'Radiotechnika', 35, [q('sci4')], [boost('el_radar'), boost('el_comp', 0.2)]],
  );
  // ---- pozemní vojsko
  rows.push(
    [q('land1'), 'Inspekce pěchoty', 35, [], [boost('inf_kul'), xp('land', 15)]],
    [q('land2'), 'Dělostřelecká škola', 35, [q('land1')], [boost('art_opt'), boost('art_pl')]],
    ...pair(
      [q('land3a'), 'Obranné opevnění', 35, [q('land2')], [boost('pdela2'), boost('sup_zen')], { info: 'Pevná obrana a protitanková děla.' }],
      [q('land3b'), 'Útočná taktika', 35, [q('land2')], [boost('inf_sam'), boost('art_mot')], { info: 'Rychlý útok podporovaný palbou.' }],
    ),
    [q('land4'), 'Zimní a horský výcvik', 35, [], [boost('inf_zima'), boost('inf_hory')], { any: [q('land3a'), q('land3b')] }],
    [q('land5'), 'Motorizace týlu', 35, [q('land4')], [boost('auta2'), stock('auta', small ? 60 : 200)]],
    [q('land6'), 'Obrněné prapory', 49, [q('land5')], [boost('ltank2'), boost('tank_rad'), xp('land', 20)]],
    [q('land7'), 'Zásobovací služba', 35, [q('land5')], [boost('sup_dop'), boost('log'), man(0.002)]],
  );
  // ---- letectvo
  rows.push(
    [q('air1'), 'Letecká škola', 35, [], [xp('air', 20), boost('sti2')]],
    ...pair(
      [q('air2a'), 'Stíhací obrana', 35, [q('air1')], [boost('air_rad'), boost('sti3', 0.2)], { info: 'Nebe nad vlastní zemí má přednost.' }],
      [q('air2b'), 'Podpora vojska', 35, [q('air1')], [boost('bit2'), boost('tac2')], { info: 'Letadla doprovázejí pozemní útok.' }],
    ),
  );
  if (!small) rows.push(
    [q('air3'), 'Letecký průmysl', 49, [], [boost('pal2'), boost('air_kys')], { any: [q('air2a'), q('air2b')] }],
    [q('air4'), 'Dálkové letectvo', 49, [q('air3')], [boost('strbomb'), boost('air_nadr')]],
  );
  // ---- námořnictvo
  rows.push(
    [q('sea1'), 'Pobřežní stráž', 35, [], [xp('sea', 15), boost('dd2')]],
  );
  if (!small) rows.push(
    ...pair(
      [q('sea2a'), 'Bitevní loďstvo', 49, [q('sea1')], [boost('bb2'), boost('ca2')], { info: 'Velké lodě ovládnou moře.' }],
      [q('sea2b'), 'Ponorková válka', 49, [q('sea1')], [boost('ss2'), boost('nav_torp')], { info: 'Ponorky přetnou nepříteli zásobování.' }],
    ),
    [q('sea3'), 'Námořní radiolokace', 35, [], [boost('nav_sonar'), boost('nav_radar', 0.2)], { any: [q('sea2a'), q('sea2b')] }],
    [q('sea4'), 'Námořní letectvo', 49, [q('sea3')], [boost('cv2'), xp('sea', 20)]],
  );
  // ---- vnitřní politika
  rows.push(
    [q('pol1'), 'Celostátní rozhlas', 35, [], [ws(0.03), boost('el_radio', 0.2)]],
    ...pair(
      [q('pol2a'), 'Národní jednota', 35, [q('pol1')], [stab(0.04)], { mod: { stab: 0.02 }, info: 'Vláda hledá podporu napříč společností.' }],
      [q('pol2b'), 'Branná výchova mládeže', 35, [q('pol1')], [ws(0.04), man(0.003)], { mod: { ws: 0.02 }, info: 'Mládež se připravuje na obranu vlasti.' }],
    ),
    [q('pol3'), 'Úřednická reforma', 35, [], [pp(40)], { any: [q('pol2a'), q('pol2b')] }],
    [q('pol4'), 'Mobilizační zákony', 49, [q('pol3')], [man(0.004), ws(0.02)]],
  );
  return rows;
}
