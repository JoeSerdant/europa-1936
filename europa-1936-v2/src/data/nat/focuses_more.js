// Národní cíle pro všechny země a rozšíření velmocí (M57). Vlastní obsah a čísla. Poloha cíle v mřížce se dopočítá z hloubky stromu (`tree`).
//  Položka: [id, název, dny, předpoklady, účinky, doplňky { ai, info, mod, excl, any }]
const civ = (n = 1) => ({ t: 'factory', k: 'civ', n });
const mil = (n = 1) => ({ t: 'factory', k: 'mil', n });
const stab = (v) => ({ t: 'stab', v });
const ws = (v) => ({ t: 'ws', v });
const pp = (v) => ({ t: 'pp', v });
const man = (v) => ({ t: 'man', v });
const infra = (n = 1) => ({ t: 'infra', n });
const stock = (eq, n) => ({ t: 'stock', eq, n });
const boost = (id, v = 0.3) => ({ t: 'boost', id, v });
const slot = (v = 0.25) => ({ t: 'boostslot', v });
const law = (cat, id) => ({ t: 'law', cat, id });
const adv = (s, id) => ({ t: 'adv', slot: s, id });
const xp = (b, n = 20) => ({ t: 'xp', b, n });

function F(id, n, x, y, days, req, fx, extra = {}) {
  return { id, n, x, y, days, req, fx, any: [], excl: [], mod: null, ai: 100, info: '', ...extra };
}

/** Sestaví strom: x, y z hloubky předpokladů (každý řádek je zleva zaplněn), AI priorita podle pořadí. */
function tree(list) {
  const depth = {};
  const rows = {};
  return list.map(([id, n, days, req, fx, extra], i) => {
    const d = req.length ? 1 + Math.max(...req.map((r) => depth[r])) : 0;
    depth[id] = d;
    rows[d] = (rows[d] || 0) + 1;
    return F(id, n, rows[d] - 1, d, days, req, fx, { ai: i + 1, ...extra });
  });
}

export const MORE_TREES = {
  IRE: tree([
    ['ire_ind', 'Hospodářská nezávislost', 45, [], [civ(), pp(20)], { info: 'Obrana domácí výroby před britským trhem.' }],
    ['ire_farm', 'Zemědělský vývoz', 35, ['ire_ind'], [civ(), law('trd', 'free')], { mod: { imp: -0.05 } }],
    ['ire_army', 'Obranné síly', 35, ['ire_ind'], [man(0.004), stock('pusky', 1200)]],
    ['ire_neutral', 'Politika neutrality', 35, ['ire_army'], [stab(0.06), pp(30)], { info: 'Zůstat stranou evropských sporů.' }],
    ['ire_coast', 'Pobřežní hlídky', 35, ['ire_army'], [xp('sea', 15), infra()]],
    ['ire_sci', 'Univerzitní program', 35, ['ire_farm'], [slot()], { mod: { research: 0.04 } }],
    ['ire_arm', 'Zbrojní dílny', 45, ['ire_neutral'], [mil()]],
    ['ire_unity', 'Národní jednota', 35, ['ire_neutral', 'ire_coast'], [stab(0.05), ws(0.05)]],
  ]),
  HOL: tree([
    ['hol_trade', 'Obchodní přístavy', 45, [], [civ(2)], { mod: { imp: -0.08 } }],
    ['hol_dyke', 'Ochranné hráze', 45, [], [infra(), stab(0.04)], { info: 'Voda je spojenec i nepřítel.' }],
    ['hol_flood', 'Záplavová obrana', 35, ['hol_dyke'], [ws(0.05), stock('pdela', 40)]],
    ['hol_army', 'Reforma branné moci', 35, ['hol_flood'], [man(0.004), adv('arm', 'reform')]],
    ['hol_colony', 'Zámořské zdroje', 35, ['hol_trade'], [boost('tez1'), civ()], { mod: { extract: 0.06 } }],
    ['hol_philips', 'Elektrotechnický průmysl', 45, ['hol_trade'], [mil(), slot()], { mod: { research: 0.04 } }],
    ['hol_neutral', 'Ozbrojená neutralita', 35, ['hol_army'], [stab(0.05), pp(30)]],
    ['hol_air', 'Letecká obrana', 45, ['hol_army', 'hol_philips'], [boost('sti2'), xp('air', 15)]],
  ]),
  BEL: tree([
    ['bel_ind', 'Slévárny a doly', 45, [], [civ(), mil()], { mod: { extract: 0.05 } }],
    ['bel_fort', 'Pevnostní pás', 45, [], [infra(), ws(0.05)], { info: 'Opevnění hranic s Německem.' }],
    ['bel_army', 'Modernizace armády', 35, ['bel_fort'], [man(0.004), stock('dela', 60)]],
    ['bel_neutral', 'Obnovená neutralita', 35, ['bel_fort'], [stab(0.06), pp(40)]],
    ['bel_rail', 'Železniční uzel', 35, ['bel_ind'], [infra(), civ()]],
    ['bel_congo', 'Africké zdroje', 35, ['bel_ind'], [boost('tez1'), law('trd', 'free')], { mod: { extract: 0.06 } }],
    ['bel_arm', 'Zbrojovky', 45, ['bel_army', 'bel_rail'], [mil(2)]],
  ]),
  LUX: tree([
    ['lux_steel', 'Ocelářské závody', 45, [], [civ(), mil()], { mod: { prod: 0.03 } }],
    ['lux_neutral', 'Prohlášená neutralita', 35, [], [stab(0.05), pp(30)]],
    ['lux_rail', 'Železniční spoje', 35, ['lux_steel'], [infra()]],
    ['lux_guard', 'Dobrovolnický sbor', 35, ['lux_neutral'], [man(0.003), stock('pusky', 600)]],
    ['lux_bank', 'Finanční služby', 35, ['lux_rail'], [pp(50), civ()]],
    ['lux_unity', 'Národní svornost', 35, ['lux_guard'], [stab(0.05), ws(0.04)]],
  ]),
  SWI: tree([
    ['swi_ind', 'Přesné strojírenství', 45, [], [civ(), mil()], { mod: { prod: 0.03 } }],
    ['swi_redoubt', 'Alpský opevněný prostor', 45, [], [infra(2), ws(0.06)], { info: 'Hory jako pevnost.' }],
    ['swi_militia', 'Všeobecná branná povinnost', 35, ['swi_redoubt'], [man(0.006), stock('pusky', 1500)]],
    ['swi_neutral', 'Ozbrojená neutralita', 35, ['swi_militia'], [stab(0.06), pp(40)]],
    ['swi_bank', 'Bankovní tajemství', 35, ['swi_ind'], [pp(60), law('trd', 'free')]],
    ['swi_air', 'Letecká obrana', 45, ['swi_militia', 'swi_ind'], [boost('sti2'), xp('air', 15)]],
    ['swi_sci', 'Technické univerzity', 35, ['swi_bank'], [slot()], { mod: { research: 0.06 } }],
    ['swi_arm', 'Zbrojní program', 45, ['swi_neutral', 'swi_air'], [mil(2), stock('dela', 80)]],
  ]),
  AUS: tree([
    ['aus_order', 'Stavovský řád', 45, [], [stab(0.08), pp(50)]],
    ['aus_ind', 'Obnova průmyslu', 45, ['aus_order'], [civ(2)]],
    ['aus_army', 'Spolkové vojsko', 35, ['aus_order'], [man(0.004), stock('pusky', 1000)]],
    ['aus_border', 'Obrana hranic', 35, ['aus_army'], [infra(), ws(0.05)]],
    ['aus_mine', 'Alpská těžba', 35, ['aus_ind'], [boost('tez1'), civ()], { mod: { extract: 0.06 } }],
    ['aus_alliance', 'Hledání záruk', 35, ['aus_border'], [pp(40), stab(0.03)]],
    ['aus_arm', 'Zbrojní podniky', 45, ['aus_ind', 'aus_army'], [mil(2)]],
  ]),
  POR: tree([
    ['por_order', 'Korporativní stát', 45, [], [stab(0.08), pp(40)]],
    ['por_ind', 'Hospodářský plán', 45, ['por_order'], [civ(2)]],
    ['por_colony', 'Zdroje z kolonií', 35, ['por_ind'], [boost('tez1'), law('trd', 'closed')], { mod: { extract: 0.07 } }],
    ['por_army', 'Reforma armády', 35, ['por_order'], [man(0.004), stock('pusky', 1000)]],
    ['por_fleet', 'Pobřežní flotila', 45, ['por_army'], [xp('sea', 20), infra()]],
    ['por_neutral', 'Stará aliance a neutralita', 35, ['por_army'], [pp(40), stab(0.04)]],
    ['por_arm', 'Zbrojní dílny', 45, ['por_ind', 'por_fleet'], [mil()]],
  ]),
  DEN: tree([
    ['den_agri', 'Zemědělská produkce', 35, [], [civ(), law('trd', 'free')], { mod: { imp: -0.06 } }],
    ['den_welfare', 'Sociální smír', 35, [], [stab(0.08), pp(30)]],
    ['den_ind', 'Lodní a strojírenský průmysl', 45, ['den_agri'], [civ(), mil()]],
    ['den_army', 'Obranné reformy', 35, ['den_welfare'], [man(0.004), stock('pusky', 900)]],
    ['den_neutral', 'Neutralita a dohody', 35, ['den_welfare'], [pp(40), stab(0.04)]],
    ['den_coast', 'Pobřežní obrana', 35, ['den_army'], [xp('sea', 15), infra()]],
    ['den_sci', 'Vědecké ústavy', 35, ['den_ind'], [slot()], { mod: { research: 0.05 } }],
  ]),
  NOR: tree([
    ['nor_ship', 'Obchodní loďstvo', 45, [], [civ(2)], { mod: { imp: -0.06 } }],
    ['nor_hydro', 'Vodní elektrárny', 45, [], [civ(), infra()]],
    ['nor_neutral', 'Politika neutrality', 35, [], [stab(0.06), pp(30)]],
    ['nor_army', 'Reforma branné moci', 35, ['nor_neutral'], [man(0.004), stock('pusky', 900)]],
    ['nor_coast', 'Pobřežní děla', 45, ['nor_army'], [xp('sea', 15), stock('dela', 50)]],
    ['nor_alu', 'Hliníkárny', 45, ['nor_hydro'], [boost('tez2', 0.3), mil()], { mod: { extract: 0.05 } }],
    ['nor_mountain', 'Horské jednotky', 35, ['nor_army'], [xp('land', 20), ws(0.05)]],
  ]),
  SWE: tree([
    ['swe_ore', 'Těžba železné rudy', 45, [], [civ(), boost('tez1')], { mod: { extract: 0.08 } }],
    ['swe_ind', 'Strojírenský průmysl', 45, ['swe_ore'], [civ(), mil()], { mod: { prod: 0.03 } }],
    ['swe_neutral', 'Ozbrojená neutralita', 35, [], [stab(0.06), pp(30)]],
    ['swe_army', 'Modernizace armády', 35, ['swe_neutral'], [man(0.004), stock('dela', 70)]],
    ['swe_air', 'Letecké zbrojení', 45, ['swe_ind'], [boost('sti2'), xp('air', 15)]],
    ['swe_navy', 'Pobřežní flotila', 45, ['swe_army'], [xp('sea', 20), infra()]],
    ['swe_sci', 'Technické ústavy', 35, ['swe_ind'], [slot()], { mod: { research: 0.05 } }],
    ['swe_unity', 'Lidový domov', 35, ['swe_neutral'], [stab(0.06), ws(0.04)]],
  ]),
  FIN: tree([
    ['fin_forest', 'Lesní průmysl', 35, [], [civ(2)]],
    ['fin_east', 'Opevnění na východě', 45, [], [infra(), ws(0.08)], { info: 'Dlouhá hranice s východním sousedem.' }],
    ['fin_guard', 'Ochranné sbory', 35, ['fin_east'], [man(0.006), stock('pusky', 1500)]],
    ['fin_ski', 'Lyžařské prapory', 35, ['fin_guard'], [xp('land', 25), ws(0.05)]],
    ['fin_arm', 'Zbrojovky', 45, ['fin_forest'], [mil(2)]],
    ['fin_unity', 'Národní svornost', 35, ['fin_guard'], [stab(0.06), pp(40)]],
    ['fin_north', 'Severní spolupráce', 35, ['fin_forest'], [pp(30), law('trd', 'free')]],
    ['fin_winter', 'Příprava na zimní válku', 45, ['fin_ski', 'fin_arm'], [stock('pdela', 60), xp('land', 20)]],
  ]),
  EST: tree([
    ['est_order', 'Autoritářský řád', 35, [], [stab(0.06), pp(40)]],
    ['est_ind', 'Břidlicový průmysl', 45, ['est_order'], [civ(), boost('tez1')]],
    ['est_army', 'Obranná liga', 35, ['est_order'], [man(0.005), stock('pusky', 800)]],
    ['est_border', 'Opevnění hranic', 35, ['est_army'], [infra(), ws(0.05)]],
    ['est_baltic', 'Baltská spolupráce', 35, ['est_ind'], [pp(30), stab(0.03)]],
    ['est_arm', 'Zbrojní dílny', 45, ['est_border', 'est_ind'], [mil()]],
  ]),
  LAT: tree([
    ['lat_order', 'Vláda pevné ruky', 35, [], [stab(0.06), pp(40)]],
    ['lat_agri', 'Zemědělský vývoz', 35, ['lat_order'], [civ(), law('trd', 'free')]],
    ['lat_port', 'Přístavy', 45, ['lat_agri'], [infra(), civ()]],
    ['lat_army', 'Obranné sbory', 35, ['lat_order'], [man(0.005), stock('pusky', 800)]],
    ['lat_border', 'Opevnění hranic', 35, ['lat_army'], [infra(), ws(0.05)]],
    ['lat_baltic', 'Baltská spolupráce', 35, ['lat_port'], [pp(30), stab(0.03)]],
    ['lat_arm', 'Zbrojní dílny', 45, ['lat_border', 'lat_port'], [mil()]],
  ]),
  LIT: tree([
    ['lit_order', 'Národní jednota', 35, [], [stab(0.06), pp(40)]],
    ['lit_agri', 'Zemědělský vývoz', 35, ['lit_order'], [civ(), law('trd', 'free')]],
    ['lit_rail', 'Železniční spoje', 35, ['lit_agri'], [infra()]],
    ['lit_army', 'Střelecký svaz', 35, ['lit_order'], [man(0.005), stock('pusky', 800)]],
    ['lit_border', 'Opevnění hranic', 35, ['lit_army'], [infra(), ws(0.05)]],
    ['lit_baltic', 'Baltská spolupráce', 35, ['lit_rail'], [pp(30), stab(0.03)]],
    ['lit_arm', 'Zbrojní dílny', 45, ['lit_border', 'lit_rail'], [mil()]],
  ]),
  HUN: tree([
    ['hun_order', 'Regentova vláda', 35, [], [stab(0.06), pp(40)]],
    ['hun_agri', 'Zemědělský přebytek', 35, ['hun_order'], [civ(), law('trd', 'free')]],
    ['hun_ind', 'Zbrojní průmysl', 45, ['hun_agri'], [mil(2)]],
    ['hun_army', 'Rozšíření armády', 35, ['hun_order'], [man(0.005), stock('pusky', 1500)], { info: 'Skryté zbrojení.' }],
    ['hun_rev', 'Revize hranic', 45, ['hun_army'], [ws(0.1), xp('land', 20)], { info: 'Nároky na ztracená území.' }],
    ['hun_tank', 'Lehké tanky', 45, ['hun_ind', 'hun_army'], [boost('ltank2'), stock('ltanky', 40)]],
    ['hun_rail', 'Železnice', 35, ['hun_agri'], [infra()]],
    ['hun_unity', 'Národní svornost', 35, ['hun_rev'], [stab(0.05), pp(40)]],
  ]),
  ROM: tree([
    ['rom_oil', 'Ropné vrty', 45, [], [civ(), boost('tez1')], { mod: { extract: 0.1 }, info: 'Ploešťská ropa je poklad země.' }],
    ['rom_order', 'Královský dvůr', 35, [], [stab(0.06), pp(40)]],
    ['rom_agri', 'Zemědělský export', 35, ['rom_order'], [civ(), law('trd', 'free')]],
    ['rom_army', 'Reforma armády', 35, ['rom_order'], [man(0.005), stock('pusky', 1500)]],
    ['rom_fort', 'Karpatské opevnění', 45, ['rom_army'], [infra(), ws(0.06)]],
    ['rom_arm', 'Zbrojovky', 45, ['rom_oil', 'rom_army'], [mil(2)]],
    ['rom_alliance', 'Malá dohoda', 35, ['rom_order'], [pp(40), stab(0.04)]],
    ['rom_air', 'Letecká výroba', 45, ['rom_arm'], [boost('sti2'), xp('air', 15)]],
  ]),
  YUG: tree([
    ['yug_order', 'Regentská rada', 35, [], [stab(0.06), pp(40)]],
    ['yug_mine', 'Měděné a bauxitové doly', 45, ['yug_order'], [civ(), boost('tez1')], { mod: { extract: 0.08 } }],
    ['yug_agri', 'Zemědělský vývoz', 35, ['yug_order'], [civ(), law('trd', 'free')]],
    ['yug_army', 'Modernizace armády', 35, ['yug_order'], [man(0.005), stock('pusky', 1500)]],
    ['yug_mountain', 'Horská obrana', 45, ['yug_army'], [infra(), ws(0.06), xp('land', 15)]],
    ['yug_arm', 'Zbrojní program', 45, ['yug_mine', 'yug_army'], [mil(2)]],
    ['yug_unity', 'Národní svornost', 35, ['yug_agri'], [stab(0.06), pp(40)], { info: 'Smíření národů v jedné zemi.' }],
    ['yug_alliance', 'Balkánská dohoda', 35, ['yug_unity'], [pp(30), ws(0.04)]],
  ]),
  BUL: tree([
    ['bul_order', 'Carský dvůr', 35, [], [stab(0.06), pp(40)]],
    ['bul_agri', 'Zemědělský export', 35, ['bul_order'], [civ(), law('trd', 'free')]],
    ['bul_army', 'Tajné přezbrojení', 35, ['bul_order'], [man(0.005), stock('pusky', 1200)], { info: 'Omezení mírových smluv povolují.' }],
    ['bul_rail', 'Železnice', 35, ['bul_agri'], [infra()]],
    ['bul_rev', 'Revize hranic', 45, ['bul_army'], [ws(0.08), xp('land', 15)]],
    ['bul_arm', 'Zbrojní dílny', 45, ['bul_rail', 'bul_army'], [mil()]],
  ]),
  GRE: tree([
    ['gre_order', 'Královská vláda', 35, [], [stab(0.06), pp(40)]],
    ['gre_ship', 'Obchodní loďstvo', 45, ['gre_order'], [civ(), law('trd', 'free')]],
    ['gre_army', 'Reforma armády', 35, ['gre_order'], [man(0.005), stock('pusky', 1200)]],
    ['gre_fort', 'Pevnostní linie', 45, ['gre_army'], [infra(), ws(0.06)], { info: 'Opevnění severních hranic.' }],
    ['gre_mountain', 'Horské jednotky', 35, ['gre_army'], [xp('land', 20), ws(0.04)]],
    ['gre_tobacco', 'Vývoz tabáku', 35, ['gre_ship'], [pp(40), civ()]],
    ['gre_navy', 'Pobřežní flotila', 45, ['gre_ship'], [xp('sea', 20), infra()]],
    ['gre_arm', 'Zbrojovky', 45, ['gre_fort', 'gre_tobacco'], [mil()]],
  ]),
  ALB: tree([
    ['alb_order', 'Královská autorita', 35, [], [stab(0.06), pp(40)]],
    ['alb_road', 'Silnice', 35, ['alb_order'], [infra(2)]],
    ['alb_oil', 'Ropné prameny', 45, ['alb_road'], [civ(), boost('tez1')], { mod: { extract: 0.07 } }],
    ['alb_army', 'Královská garda', 35, ['alb_order'], [man(0.006), stock('pusky', 700)]],
    ['alb_mountain', 'Horská obrana', 45, ['alb_army'], [ws(0.07), xp('land', 15)]],
    ['alb_arm', 'Zbrojní dílny', 45, ['alb_oil', 'alb_army'], [mil()]],
  ]),
  TUR: tree([
    ['tur_reform', 'Reformní program', 45, [], [stab(0.06), civ()]],
    ['tur_ind', 'Státní průmysl', 45, ['tur_reform'], [civ(2), mil()]],
    ['tur_rail', 'Železniční síť', 45, ['tur_ind'], [infra(2)]],
    ['tur_mine', 'Chromové a uhelné doly', 45, ['tur_ind'], [boost('tez1'), civ()], { mod: { extract: 0.08 }, info: 'Chrom je cenná strategická surovina.' }],
    ['tur_army', 'Reforma armády', 35, ['tur_reform'], [man(0.005), adv('arm', 'reform')]],
    ['tur_straits', 'Kontrola průlivů', 45, ['tur_army'], [ws(0.06), infra()], { info: 'Klíč k Černému moři.' }],
    ['tur_neutral', 'Aktivní neutralita', 35, ['tur_army'], [pp(60), stab(0.04)]],
    ['tur_arm', 'Zbrojní program', 45, ['tur_mine', 'tur_straits'], [mil(2), stock('dela', 80)]],
    ['tur_sci', 'Technické školy', 35, ['tur_reform'], [slot()], { mod: { research: 0.05 } }],
  ]),
  ICE: tree([
    ['ice_fish', 'Rybářská flotila', 35, [], [civ(), law('trd', 'free')], { mod: { imp: -0.08 } }],
    ['ice_port', 'Přístavy', 45, ['ice_fish'], [infra(), civ()]],
    ['ice_neutral', 'Trvalá neutralita', 35, [], [stab(0.06), pp(40)]],
    ['ice_coast', 'Pobřežní hlídka', 35, ['ice_neutral'], [xp('sea', 15), stock('pusky', 300)]],
    ['ice_sci', 'Vzdělání a věda', 35, ['ice_port'], [slot()], { mod: { research: 0.04 } }],
    ['ice_unity', 'Národní svornost', 35, ['ice_coast'], [stab(0.05), ws(0.03)]],
  ]),
  EGY: tree([
    ['egy_cotton', 'Bavlnářský vývoz', 35, [], [civ(2), law('trd', 'free')]],
    ['egy_order', 'Královský dvůr', 35, [], [stab(0.06), pp(40)]],
    ['egy_canal', 'Správa průplavu', 45, ['egy_cotton'], [pp(60), infra()], { info: 'Průplav je tepna říše.' }],
    ['egy_army', 'Reforma armády', 35, ['egy_order'], [man(0.005), stock('pusky', 1000)]],
    ['egy_oil', 'Ropné vrty', 45, ['egy_canal'], [civ(), boost('tez1')], { mod: { extract: 0.07 } }],
    ['egy_alliance', 'Spojenecká smlouva', 35, ['egy_army'], [pp(30), ws(0.04)]],
    ['egy_arm', 'Zbrojní dílny', 45, ['egy_oil', 'egy_army'], [mil()]],
  ]),
  IRQ: tree([
    ['irq_oil', 'Ropné vrty', 45, [], [civ(), boost('tez1')], { mod: { extract: 0.1 }, info: 'Ropa z Mosulu a Kirkúku.' }],
    ['irq_order', 'Hašimovský dvůr', 35, [], [stab(0.06), pp(40)]],
    ['irq_pipeline', 'Ropovod', 45, ['irq_oil'], [civ(), infra()]],
    ['irq_army', 'Reforma armády', 35, ['irq_order'], [man(0.005), stock('pusky', 1000)]],
    ['irq_agri', 'Zavlažování', 35, ['irq_order'], [civ(), stab(0.03)]],
    ['irq_ally', 'Spojenecká smlouva', 35, ['irq_army'], [pp(30), ws(0.04)]],
    ['irq_arm', 'Zbrojní dílny', 45, ['irq_pipeline', 'irq_army'], [mil()]],
  ]),
  PER: tree([
    ['per_reform', 'Modernizační program', 45, [], [stab(0.05), civ()]],
    ['per_oil', 'Ropné rafinerie', 45, ['per_reform'], [civ(), boost('tez1')], { mod: { extract: 0.1 }, info: 'Ropa z Chúzistánu.' }],
    ['per_rail', 'Transíránská železnice', 45, ['per_reform'], [infra(2)]],
    ['per_army', 'Reforma armády', 35, ['per_reform'], [man(0.005), stock('pusky', 1200)]],
    ['per_mountain', 'Horské prapory', 35, ['per_army'], [xp('land', 15), ws(0.05)]],
    ['per_neutral', 'Politika vyvažování', 35, ['per_army'], [pp(50), stab(0.04)]],
    ['per_arm', 'Zbrojní dílny', 45, ['per_oil', 'per_rail'], [mil()]],
  ]),
  SAU: tree([
    ['sau_unite', 'Sjednocení kmenů', 45, [], [stab(0.08), pp(40)]],
    ['sau_oil', 'Ropné koncese', 45, ['sau_unite'], [civ(), boost('tez1')], { mod: { extract: 0.1 } }],
    ['sau_pilgrim', 'Správa poutí', 35, ['sau_unite'], [pp(50), civ()]],
    ['sau_army', 'Královská garda', 35, ['sau_unite'], [man(0.005), stock('pusky', 800)]],
    ['sau_road', 'Cesty a studny', 35, ['sau_oil'], [infra()]],
    ['sau_arm', 'Zbrojní nákupy', 45, ['sau_army', 'sau_road'], [mil(), stock('dela', 30)]],
  ]),
  OMA: tree([
    ['oma_trade', 'Obchod s přístavy', 35, [], [civ(), law('trd', 'free')]],
    ['oma_order', 'Sultánův dvůr', 35, [], [stab(0.06), pp(40)]],
    ['oma_road', 'Cesty', 35, ['oma_trade'], [infra()]],
    ['oma_army', 'Sultánova garda', 35, ['oma_order'], [man(0.006), stock('pusky', 500)]],
    ['oma_fort', 'Pobřežní pevnosti', 45, ['oma_army'], [infra(), ws(0.05)]],
    ['oma_oil', 'Průzkum ropy', 45, ['oma_road'], [civ(), boost('tez1')], { mod: { extract: 0.06 } }],
  ]),
};

// Rozšíření stromů velmocí: letectvo, námořnictvo, zpravodajství a rozpracované větve. Navazují na cíle základních stromů.
export const EXTRA = {
  GER: [
    F('ger_luft', 'Letecký program', 0, 4, 45, ['ger_tank'], [boost('sti2'), xp('air', 25), { t: 'factory', k: 'mil', n: 1 }], { ai: 9 }),
    F('ger_sci', 'Technické ústavy', 4, 3, 35, ['ger_auto'], [slot()], { ai: 10, mod: { research: 0.05 } }),
    F('ger_navy', 'Námořní program', 4, 4, 45, ['ger_sci'], [xp('sea', 20), { t: 'factory', k: 'civ', n: 1 }], { ai: 11 }),
    F('ger_spy', 'Vojenská rozvědka', 2, 4, 35, ['ger_conscr'], [pp(40), xp('land', 15)], { ai: 12 }),
  ],
  FRA: [
    F('fra_air', 'Letecká reforma', 4, 2, 45, ['fra_col'], [boost('sti2'), xp('air', 20)], { ai: 8 }),
    F('fra_sci', 'Vědecké ústavy', 1, 3, 35, ['fra_army'], [{ t: 'boostslot', v: 0.25 }], { ai: 9, mod: { research: 0.05 } }),
    F('fra_navy', 'Zámořské loďstvo', 3, 3, 45, ['fra_unity'], [xp('sea', 20), infra()], { ai: 10 }),
    F('fra_spy', 'Druhé oddělení', 2, 3, 35, ['fra_unity'], [pp(40), xp('land', 15)], { ai: 11 }),
  ],
  ENG: [
    F('eng_air', 'Stíhací velení', 1, 3, 45, ['eng_sci'], [boost('sti2'), xp('air', 25)], { ai: 7 }),
    F('eng_navy', 'Posílení loďstva', 3, 3, 45, ['eng_nav'], [xp('sea', 25), { t: 'factory', k: 'civ', n: 1 }], { ai: 8 }),
    F('eng_spy', 'Tajná služba', 0, 3, 35, ['eng_unity'], [pp(50), xp('land', 15)], { ai: 9 }),
    F('eng_empire', 'Říšská spolupráce', 4, 3, 35, ['eng_nav'], [pp(40), { t: 'man', v: 0.003 }], { ai: 10 }),
  ],
  ITA: [
    F('ita_air', 'Letecké síly', 4, 3, 45, ['ita_sci'], [boost('sti2'), xp('air', 20)], { ai: 7 }),
    F('ita_navy', 'Námořní program', 0, 3, 45, ['ita_arm'], [xp('sea', 25), infra()], { ai: 8 }),
    F('ita_spy', 'Vojenská zpravodajská služba', 3, 3, 35, ['ita_road'], [pp(40), xp('land', 15)], { ai: 9 }),
  ],
  SOV: [
    F('sov_air', 'Letecké závody', 4, 3, 45, ['sov_sci'], [boost('sti2'), xp('air', 20)], { ai: 7 }),
    F('sov_navy', 'Lodní program', 0, 3, 45, ['sov_army'], [xp('sea', 15), infra()], { ai: 8 }),
    F('sov_spy', 'Bezpečnostní aparát', 3, 4, 35, ['sov_tank'], [pp(50), stab(0.04)], { ai: 9 }),
    F('sov_conscr', 'Všeobecná výcviková příprava', 1, 4, 35, ['sov_tank'], [{ t: 'man', v: 0.004 }, { t: 'ws', v: 0.05 }], { ai: 10 }),
  ],
  POL: [
    F('pol_air', 'Letecká výroba', 2, 3, 45, ['pol_arm'], [boost('sti2'), xp('air', 15)], { ai: 6 }),
    F('pol_navy', 'Pobřežní obrana', 4, 3, 35, ['pol_unity'], [xp('sea', 10), infra()], { ai: 7 }),
    F('pol_spy', 'Šifrovací ústav', 0, 3, 35, ['pol_arm'], [pp(40), xp('land', 15)], { ai: 8 }),
  ],
  CZE: [
    F('cze_air', 'Letecký průmysl', 0, 3, 45, ['cze_unity'], [boost('sti2'), xp('air', 15)], { ai: 6 }),
    F('cze_spy', 'Vojenské zpravodajství', 2, 3, 35, ['cze_unity'], [pp(40), xp('land', 15)], { ai: 7 }),
    F('cze_sci', 'Technické univerzity', 4, 3, 35, ['cze_export'], [slot()], { ai: 8, mod: { research: 0.05 } }),
  ],
  SPR: [
    F('spr_air', 'Letecký sbor', 4, 3, 45, ['spr_arm'], [boost('sti2'), xp('air', 15)], { ai: 6 }),
    F('spr_spy', 'Bezpečnostní služba', 0, 3, 35, ['spr_mine'], [pp(40), stab(0.04)], { ai: 7 }),
    F('spr_unity', 'Národní smíření', 2, 3, 45, ['spr_mine', 'spr_arm'], [stab(0.08), ws(0.05)], { ai: 8 }),
  ],
};
