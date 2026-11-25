// Další národní cíle (M98): nové větve velmocí, druhé rozšíření zajímavých zemí, rozšíření malých zemí a výchozího stromu. Vlastní obsah, bez skutečných osob.
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
const xp = (b, n = 20) => ({ t: 'xp', b, n });
const spirit = (id) => ({ t: 'spirit', id });
const bld = (k, n = 1) => ({ t: 'bld', k, n });
const party = (i, v) => ({ t: 'party', i, v });
const NAMES = {
  GER: 'Německo', ITA: 'Itálie', SOV: 'SSSR', ENG: 'Británie', FRA: 'Francie', POL: 'Polsko', CZE: 'Československo', HUN: 'Maďarsko', ROM: 'Rumunsko',
  YUG: 'Jugoslávie', BUL: 'Bulharsko', GRE: 'Řecko', TUR: 'Turecko', SPR: 'Španělsko', POR: 'Portugalsko', SWE: 'Švédsko', FIN: 'Finsko', NOR: 'Norsko',
  DEN: 'Dánsko', HOL: 'Nizozemsko', BEL: 'Belgie', SWI: 'Švýcarsko', AUS: 'Rakousko', EST: 'Estonsko', LAT: 'Lotyšsko', LIT: 'Litva', ALB: 'Albánie', EGY: 'Egypt',
  IRE: 'Irsko', IRQ: 'Irák', PER: 'Persie', SAU: 'Saúdská Arábie', OMA: 'Omán', ICE: 'Island', LUX: 'Lucembursko',

  // W1
  USA: 'Spojené státy', CAN: 'Kanada', MEX: 'Mexiko', GUA: 'Guatemala', HON: 'Honduras', ELS: 'Salvador', NIC: 'Nikaragua', COS: 'Kostarika', PAN: 'Panama', CUB: 'Kuba', HAI: 'Haiti', DOM: 'Dominikánská republika', COL: 'Kolumbie', VEN: 'Venezuela', ECU: 'Ekvádor', PRU: 'Peru', BOL: 'Bolívie', CHL: 'Chile', ARG: 'Argentina', URG: 'Uruguay', PAR: 'Paraguay', BRA: 'Brazílie', ETH: 'Etiopie', LBR: 'Libérie', SAF: 'Jihoafrická unie', JAP: 'Japonsko', MAN: 'Mandžukuo', CHI: 'Čína', PRC: 'Čínští komunisté', SIK: 'Sin-ťiang', TIB: 'Tibet', MON: 'Mongolsko', TAN: 'Tuva', SIA: 'Siam', AFG: 'Afghánistán', RAJ: 'Indie', NEP: 'Nepál', YEM: 'Jemen', PHI: 'Filipíny', AST: 'Austrálie', NZL: 'Nový Zéland',
};
const rel = (tag, v) => ({ t: 'rel', tag, nm: NAMES[tag] || tag, v });

// ---------------------------------------------------------------- nové větve velmocí (přidávají se k `big` stromům)
export const XL_BRANCHES = {
  GER: [
    { prio: 5, list: [   // hospodářství okupované Evropy
      ['ger_xl_eco', 'Hospodářský velkoprostor', 70, ['ger_reichsw'], [civ(), pp(30)], { info: 'Suroviny a továrny celé Evropy pro jednu válečnou ekonomiku.' }],
      ['ger_xl_ore', 'Ruda ze severu', 35, ['ger_xl_eco'], [boost('ind_mech', 0.4)], { mod: { extract: 0.03 } }],
      ['ger_xl_oil', 'Ropa z Podunají', 35, ['ger_xl_eco'], [boost('ind_rafin', 0.5)]],
      ['ger_xl_lab', 'Nucené pracovní nasazení', 35, ['ger_xl_ore'], [man(0.003)], { mod: { stab: -0.02 } }],
      ['ger_xl_alu', 'Hliníkové hutě', 35, ['ger_xl_oil'], [boost('ind_slit', 0.5)], { mod: { extract: 0.02 } }],
      ['ger_xl_pas', 'Pásová výroba letadel', 35, ['ger_xl_alu'], [boost('ind_pas', 0.5), boost('ind_obr', 0.3)]],
      ['ger_xl_disp', 'Rozptýlení výroby', 70, ['ger_xl_pas', 'ger_xl_lab'], [civ()], { mod: { build: 0.03 } }],
      ['ger_xl_bunk', 'Podzemní továrny', 70, ['ger_xl_disp'], [mil()], { ai: 800 }],
    ] },
    { prio: 6, list: [   // obrněné síly a pozdní armáda
      ['ger_xl_pz', 'Generální inspekce tankových vojsk', 35, ['ger_panzer'], [boost('tank_rad', 0.5), xp('land', 20)]],
      ['ger_xl_opt', 'Tankové optiky', 35, ['ger_xl_pz'], [boost('tank_opt', 0.5)]],
      ['ger_xl_sik', 'Šikmý pancíř', 35, ['ger_xl_opt'], [boost('tank_sik', 0.5)]],
      ['ger_xl_stug', 'Útočná děla', 35, ['ger_xl_pz'], [boost('art_sp', 0.5), stock('mtanky', 40)]],
      ['ger_xl_jagd', 'Stíhače tanků', 35, ['ger_xl_stug'], [boost('art_stih', 0.5)]],
      ['ger_xl_half', 'Polopásové transportéry', 35, ['ger_motor'], [boost('vozy_pul', 0.5), boost('mech2', 0.3)]],
      ['ger_xl_mg', 'Univerzální kulomet', 35, ['ger_inf'], [boost('inf_kul', 0.5), boost('inf_tez', 0.3)]],
      ['ger_xl_sturm', 'Útočná puška', 70, ['ger_xl_mg'], [boost('pusky4', 0.4), boost('inf_sam', 0.3)]],
      ['ger_xl_faust', 'Pancéřové pěsti', 35, ['ger_xl_sturm'], [boost('inf_pzbr', 0.5)]],
      ['ger_xl_winter', 'Zimní výstroj', 35, ['ger_mountain'], [boost('inf_zima', 0.5), boost('inf_hory', 0.3)]],
      ['ger_xl_reserve', 'Náhradní armáda', 70, ['ger_xl_winter'], [man(0.004)], { ai: 700 }],
    ] },
    { prio: 7, list: [   // letectvo a námořnictvo II
      ['ger_xl_air2', 'Druhá generace stíhaček', 35, ['ger_fight'], [boost('air_kys', 0.5), boost('air_nadr', 0.3)]],
      ['ger_xl_night', 'Noční stíhací divize', 35, ['ger_xl_air2'], [boost('air_noc', 0.5), bld('radar', 1)]],
      ['ger_xl_turbo', 'Výškové motory', 35, ['ger_xl_night'], [boost('air_turbo', 0.5)]],
      ['ger_xl_jetmot', 'Proudové motory', 70, ['ger_xl_turbo', 'ger_jet'], [boost('el_jet', 0.5)]],
      ['ger_xl_ss2', 'Oceánské ponorky', 35, ['ger_uboat'], [boost('ss2', 0.5), boost('ss3', 0.3)]],
      ['ger_xl_snork', 'Šnorchl', 35, ['ger_xl_ss2'], [boost('ss4', 0.5)]],
      ['ger_xl_torp', 'Magnetická torpéda', 35, ['ger_xl_ss2'], [boost('nav_torp', 0.5)]],
      ['ger_xl_bb', 'Rychlé bitevní lodě', 70, ['ger_raider'], [boost('bb2', 0.5), xp('sea', 20)]],
    ] },
    { prio: 8, list: [   // věda a elektronika
      ['ger_xl_radio', 'Spojovací vojsko', 35, ['ger_council'], [boost('el_radio', 0.5), boost('el_sifr', 0.3)]],
      ['ger_xl_enig', 'Šifrovací stroje', 35, ['ger_xl_radio'], [boost('sup_sifr', 0.5)]],
      ['ger_xl_radar', 'Radiolokace', 35, ['ger_xl_radio'], [boost('el_radar', 0.5)]],
      ['ger_xl_comp', 'Počítací stroje', 70, ['ger_xl_enig'], [boost('el_comp', 0.5)], { mod: { research: 0.02 } }],
      ['ger_xl_rak', 'Raketové motory', 35, ['ger_rocket'], [boost('el_rak', 0.5)]],
    ] },
    { prio: 6, list: [   // politika II
      ['ger_xl_youth', 'Mládež pod zbraní', 35, ['ger_unity'], [man(0.003), ws(0.03)]],
      ['ger_xl_finn', 'Spojenectví na severu', 35, ['ger_north'], [rel('FIN', 40), rel('SWE', 20)]],
      ['ger_xl_balk', 'Balkánské spojence', 35, ['ger_oil'], [rel('BUL', 30), rel('YUG', 20)]],
      ['ger_xl_spain', 'Pomoc nacionalistům', 35, ['ger_axis'], [rel('SPR', 30), xp('air', 20), xp('land', 15)]],
      ['ger_xl_prop2', 'Totální propaganda', 35, ['ger_xl_youth'], [ws(0.06), stab(-0.02)]],
    ] },
  ],
  SOV: [
    { prio: 5, list: [
      ['sov_xl_kuz', 'Kuzněcká pánev', 70, ['sov_ural'], [civ(), boost('ind_mech', 0.3)]],
      ['sov_xl_magn', 'Ocelové město na Uralu', 70, ['sov_xl_kuz'], [mil()], { mod: { extract: 0.03 } }],
      ['sov_xl_volga', 'Továrny na Volze', 35, ['sov_xl_kuz'], [boost('ind_pas', 0.5)]],
      ['sov_xl_oil2', 'Druhé Baku', 35, ['sov_oil'], [boost('ind_rafin', 0.5)], { mod: { extract: 0.02 } }],
      ['sov_xl_rail2', 'Transsibiřská magistrála', 35, ['sov_rail'], [infra(), boost('sup_zel', 0.4)]],
      ['sov_xl_tank_gr', 'Tankograd', 70, ['sov_xl_magn', 'sov_t34'], [mil(), boost('tank_diesel', 0.4)]],
      ['sov_xl_norms', 'Pracovní normy', 35, ['sov_xl_volga'], [boost('ind_obr', 0.4)], { mod: { stab: -0.02 } }],
      ['sov_xl_alu', 'Hliník z Uralu', 35, ['sov_xl_norms'], [boost('ind_slit', 0.5)]],
    ] },
    { prio: 6, list: [
      ['sov_xl_guards', 'Gardové divize', 35, ['sov_winter'], [xp('land', 30), stock('pusky', 4000)]],
      ['sov_xl_ppsh', 'Samopaly pro celé roty', 35, ['sov_inf'], [boost('inf_sam', 0.5)]],
      ['sov_xl_mortar', 'Minomety', 35, ['sov_xl_ppsh'], [boost('inf_mino', 0.5)]],
      ['sov_xl_ski', 'Lyžařské prapory', 35, ['sov_winter'], [boost('inf_zima', 0.5)]],
      ['sov_xl_ag', 'Protiletadlové pluky', 35, ['sov_art'], [boost('art_pl', 0.5), boost('art_pl2', 0.3)]],
      ['sov_xl_su', 'Samohybná děla', 35, ['sov_rocketart'], [boost('art_sp', 0.5)]],
      ['sov_xl_slope', 'Šikmý pancíř', 35, ['sov_t34'], [boost('tank_sik', 0.5)]],
      ['sov_xl_radio', 'Rádia v tancích', 35, ['sov_xl_slope'], [boost('tank_rad', 0.5)]],
      ['sov_xl_deepbat', 'Hluboká bitva', 70, ['sov_deep', 'sov_xl_radio'], [xp('land', 30), boost('sup_vys', 0.4)]],
      ['sov_xl_trucks', 'Nákladní auta z dovozu', 35, ['sov_cav'], [stock('auta', 600), boost('auta3', 0.3)]],
      ['sov_xl_reserve', 'Strategické zálohy', 70, ['sov_fareast'], [man(0.004)], { ai: 700 }],
    ] },
    { prio: 7, list: [
      ['sov_xl_il', 'Létající tanky', 35, ['sov_shturm'], [boost('bit3', 0.5), boost('air_pan', 0.3)]],
      ['sov_xl_yak', 'Lehké stíhačky', 35, ['sov_fight'], [boost('sti3', 0.3), boost('air_rad', 0.4)]],
      ['sov_xl_airfield', 'Polní letiště za Uralem', 35, ['sov_afb'], [bld('afb', 2)]],
      ['sov_xl_long', 'Dálkové letectvo', 70, ['sov_xl_yak'], [boost('strbomb', 0.4)]],
      ['sov_xl_dd', 'Torpédoborce', 35, ['sov_dock'], [boost('dd2', 0.5)]],
      ['sov_xl_ss', 'Ponorky pro Baltské moře', 35, ['sov_subs'], [boost('ss2', 0.5)]],
    ] },
    { prio: 8, list: [
      ['sov_xl_inst', 'Výzkumné ústavy ve vězení', 35, ['sov_design'], [slot(0.3)], { mod: { research: 0.02 } }],
      ['sov_xl_radar', 'Radiolokace', 35, ['sov_radio'], [boost('el_radar', 0.5)]],
      ['sov_xl_rak', 'Raketové laboratoře', 35, ['sov_xl_inst'], [boost('el_rak', 0.5)]],
      ['sov_xl_spy2', 'Zahraniční rozvědka', 35, ['sov_spy'], [pp(40), boost('el_sifr', 0.3)]],
    ] },
    { prio: 6, list: [
      ['sov_xl_party', 'Strana a armáda', 35, ['sov_unity'], [stab(0.04), ws(0.04)]],
      ['sov_xl_slav', 'Slovanská solidarita', 35, ['sov_comintern'], [rel('YUG', 30), rel('BUL', 30), rel('CZE', 20)]],
      ['sov_xl_turkey', 'Úžiny a Turecko', 35, ['sov_xl_slav'], [rel('TUR', 30)]],
      ['sov_xl_church', 'Smír s církví', 35, ['sov_xl_party'], [stab(0.05), ws(0.03)]],
      ['sov_xl_civil', 'Civilní obrana', 35, ['sov_partisan'], [man(0.002), ws(0.04)]],
      ['sov_xl_hero', 'Hrdinská města', 35, ['sov_xl_church'], [ws(0.06)]],
    ] },
  ],
  ENG: [
    { prio: 5, list: [
      ['eng_xl_ship', 'Loděnice na Clydu', 70, ['eng_dock'], [bld('dok', 2)]],
      ['eng_xl_coal2', 'Velšské uhlí', 35, ['eng_coal'], [boost('ind_mech', 0.4)]],
      ['eng_xl_aircraft', 'Ministerstvo leteckého průmyslu', 70, ['eng_shadow'], [mil(), boost('ind_pas', 0.4)]],
      ['eng_xl_tank', 'Tanková komise', 35, ['eng_tank'], [boost('mtank2', 0.4), boost('tank_sus', 0.3)]],
      ['eng_xl_bev', 'Mobilizace pracovní síly', 35, ['eng_ration'], [man(0.003)], { mod: { stab: -0.01 } }],
      ['eng_xl_oil', 'Perská ropa', 35, ['eng_xl_bev'], [boost('ind_rafin', 0.4), rel('PER', 20)]],
      ['eng_xl_util', 'Úsporné výrobky', 35, ['eng_xl_bev'], [spirit('f_spotrebni_vyroba')]],
    ] },
    { prio: 6, list: [
      ['eng_xl_bren', 'Lehké kulomety', 35, ['eng_inf'], [boost('inf_kul', 0.5)]],
      ['eng_xl_sten', 'Levné samopaly', 35, ['eng_xl_bren'], [boost('inf_sam', 0.5)]],
      ['eng_xl_piat', 'Protitankové granátomety', 35, ['eng_xl_sten'], [boost('inf_pzbr', 0.5)]],
      ['eng_xl_25p', 'Dělohoufnice', 35, ['eng_art'], [boost('dela3', 0.4), boost('art_rad', 0.4)]],
      ['eng_xl_sas', 'Pouštní nájezdníci', 35, ['eng_commando'], [boost('inf_komando', 0.5), xp('land', 20)]],
      ['eng_xl_para', 'Výsadkové brigády', 35, ['eng_xl_sas'], [boost('vysadek', 0.5), boost('air_trans', 0.4)]],
      ['eng_xl_gurkha', 'Pluky z kolonií', 70, ['eng_dominion'], [man(0.003), stock('pusky', 2000)]],
      ['eng_xl_engineer', 'Královští ženisté', 35, ['eng_supply'], [boost('sup_most', 0.5), boost('sup_zen', 0.4)]],
    ] },
    { prio: 7, list: [
      ['eng_xl_rad2', 'Centimetrový radar', 70, ['eng_radar'], [boost('el_radar2', 0.5)]],
      ['eng_xl_night', 'Noční stíhači', 35, ['eng_xl_rad2'], [boost('air_noc', 0.5)]],
      ['eng_xl_mosq', 'Dřevěné rychlé bombardéry', 35, ['eng_tactical'], [boost('tac3', 0.4)]],
      ['eng_xl_coastal', 'Pobřežní letectvo', 35, ['eng_carrier'], [boost('pal2', 0.4), xp('air', 15)]],
      ['eng_xl_hedgehog', 'Protiponorkové vrhače', 35, ['eng_convoy'], [boost('nav_sonar', 0.5), boost('dd3', 0.3)]],
      ['eng_xl_escort', 'Doprovodné lodě', 70, ['eng_xl_hedgehog'], [boost('dd4', 0.5), xp('sea', 20)]],
      ['eng_xl_bb', 'Nové bitevní lodě', 70, ['eng_navy'], [boost('bb2', 0.5), boost('bb3', 0.3)]],
      ['eng_xl_cv', 'Pancéřované letadlové lodě', 70, ['eng_carrier'], [boost('cv2', 0.5)]],
    ] },
    { prio: 8, list: [
      ['eng_xl_tizard', 'Výměna vědců za oceánem', 35, ['eng_code'], [slot(0.3), boost('el_comp', 0.3)]],
      ['eng_xl_colossus', 'Elektronkový počítač', 70, ['eng_xl_tizard'], [boost('el_comp2', 0.5)], { mod: { research: 0.02 } }],
      ['eng_xl_jam', 'Rušení radarů', 35, ['eng_xl_tizard'], [boost('el_rus', 0.5)]],
      ['eng_xl_ops', 'Operační výzkum', 35, ['eng_xl_tizard'], [boost('vyz_lab', 0.5)]],
    ] },
    { prio: 6, list: [
      ['eng_xl_bbc', 'Rozhlas pro okupovanou Evropu', 35, ['eng_finest'], [pp(40), ws(0.03)]],
      ['eng_xl_exile', 'Exilové vlády v Londýně', 35, ['eng_xl_bbc'], [rel('POL', 30), rel('NOR', 30), rel('HOL', 30)]],
      ['eng_xl_turkey', 'Získat Turecko', 35, ['eng_guarantee'], [rel('TUR', 40)]],
      ['eng_xl_portugal', 'Atlantické základny', 35, ['eng_guarantee'], [rel('POR', 40)]],
      ['eng_xl_egypt', 'Obrana Suezu', 35, ['eng_xl_turkey'], [rel('EGY', 30), xp('land', 15)]],
      ['eng_xl_home', 'Vítězství nade vše', 35, ['eng_xl_exile'], [ws(0.06), stab(0.02)]],
    ] },
  ],
  FRA: [
    { prio: 5, list: [
      ['fra_xl_aero', 'Znárodněné letecké závody', 70, ['fra_aircons'], [mil(), boost('ind_pas', 0.4)]],
      ['fra_xl_steel', 'Lotrinské hutě', 35, ['fra_lorraine'], [boost('ind_mech', 0.4)]],
      ['fra_xl_colony2', 'Africké suroviny', 35, ['fra_col'], [boost('ind_slit', 0.4)], { mod: { extract: 0.02 } }],
      ['fra_xl_plan', 'Plán vyzbrojení', 70, ['fra_north'], [mil(), civ()]],
      ['fra_xl_rail', 'Železnice k hranicím', 35, ['fra_ind'], [infra(), boost('sup_zel', 0.3)]],
      ['fra_xl_fuel', 'Rafinerie u Atlantiku', 35, ['fra_xl_colony2'], [boost('ind_rafin', 0.5)]],
    ] },
    { prio: 6, list: [
      ['fra_xl_mg', 'Lehké kulomety', 35, ['fra_inf'], [boost('inf_kul', 0.5)]],
      ['fra_xl_mortar', 'Pěchotní minomety', 35, ['fra_xl_mg'], [boost('inf_mino', 0.5)]],
      ['fra_xl_zak', 'Polní opevnění', 35, ['fra_maginot'], [boost('inf_zak', 0.5), boost('sup_zen', 0.3)]],
      ['fra_xl_b1', 'Těžké průlomové tanky', 35, ['fra_heavy'], [boost('htank2', 0.3), stock('htanky', 20)]],
      ['fra_xl_radio2', 'Tanková rádia', 35, ['fra_radio'], [boost('tank_rad', 0.5)]],
      ['fra_xl_cav', 'Mechanizovaná jízda', 35, ['fra_dlm'], [boost('vozy_pul', 0.5)]],
      ['fra_xl_legion', 'Cizinecká legie', 35, ['fra_colonial'], [xp('land', 25), stock('pusky', 1500)]],
      ['fra_xl_alpine2', 'Horské divize', 35, ['fra_alpine'], [boost('inf_hory', 0.5)]],
      ['fra_xl_army2', 'Armáda pro útok', 70, ['fra_staff'], [xp('land', 30), boost('sup_vys', 0.3)]],
    ] },
    { prio: 7, list: [
      ['fra_xl_fight2', 'Nové stíhačky', 35, ['fra_fight'], [boost('air_kys', 0.5)]],
      ['fra_xl_cv', 'Letadlová loď', 70, ['fra_navy'], [boost('cv2', 0.4), boost('pal2', 0.3)]],
      ['fra_xl_bb', 'Rychlé bitevní lodě', 70, ['fra_med'], [boost('bb2', 0.5)]],
      ['fra_xl_dd', 'Velké torpédoborce', 35, ['fra_dock'], [boost('dd2', 0.5), boost('dd3', 0.3)]],
      ['fra_xl_sub', 'Ponorky', 35, ['fra_dock'], [boost('ss2', 0.5)]],
    ] },
    { prio: 8, list: [
      ['fra_xl_radar', 'Radiolokace', 35, ['fra_cnrs'], [boost('el_radar', 0.5)]],
      ['fra_xl_univ', 'Vysoké školy', 35, ['fra_cnrs'], [boost('vyz_univ', 0.5)]],
      ['fra_xl_heavyw', 'Těžká voda', 70, ['fra_atom'], [boost('jadro2', 0.3)]],
    ] },
    { prio: 6, list: [
      ['fra_xl_belg', 'Spojenectví s Belgií', 35, ['fra_entente'], [rel('BEL', 40), rel('HOL', 20)]],
      ['fra_xl_pol', 'Vojenská úmluva s Polskem', 35, ['fra_east'], [rel('POL', 30)]],
      ['fra_xl_turk', 'Levantské záruky', 35, ['fra_little'], [rel('TUR', 30), rel('GRE', 30)]],
      ['fra_xl_empire', 'Říše za mořem', 70, ['fra_resolve'], [man(0.003), stock('pusky', 2000)]],
      ['fra_xl_unity2', 'Svatá jednota', 35, ['fra_xl_empire'], [stab(0.04), ws(0.05)]],
      ['fra_xl_resist', 'Odboj', 35, ['fra_xl_unity2'], [ws(0.05), xp('land', 15)], { info: 'Kdyby přišla porážka, boj pokračuje.' }],
    ] },
  ],
  ITA: [
    { prio: 5, list: [
      ['ita_xl_iri', 'Státní holding průmyslu', 70, ['ita_north'], [civ(), mil()]],
      ['ita_xl_aqu', 'Akvadukty a elektrárny', 35, ['ita_south'], [infra(), civ()]],
      ['ita_xl_libya', 'Libyjské pobřeží', 35, ['ita_road'], [infra(), boost('sup_dop', 0.3)]],
      ['ita_xl_oil', 'Hledání ropy v Libyi', 35, ['ita_xl_libya'], [boost('ind_rafin', 0.5)], { mod: { extract: 0.02 } }],
      ['ita_xl_auto', 'Automobilky severu', 35, ['ita_xl_iri'], [boost('auta2', 0.4), boost('ind_pas', 0.3)]],
      ['ita_xl_alu', 'Hliník z bauxitu', 35, ['ita_mines'], [boost('ind_slit', 0.5)]],
    ] },
    { prio: 6, list: [
      ['ita_xl_bers', 'Bersaglieri', 35, ['ita_motor'], [xp('land', 20), boost('vozy2', 0.4)]],
      ['ita_xl_mg', 'Lehké kulomety', 35, ['ita_inf'], [boost('inf_kul', 0.5)]],
      ['ita_xl_mortar', 'Minomety', 35, ['ita_xl_mg'], [boost('inf_mino', 0.5)]],
      ['ita_xl_desert', 'Pouštní výcvik', 35, ['ita_africa'], [boost('sup_dop', 0.4), boost('sup_kuch', 0.4)]],
      ['ita_xl_semov', 'Samohybná děla', 35, ['ita_mtank'], [boost('art_sp', 0.5)]],
      ['ita_xl_folg', 'Výsadková divize', 35, ['ita_para'], [boost('air_trans', 0.4), xp('land', 15)]],
      ['ita_xl_alp2', 'Alpské divize', 35, ['ita_alpini'], [boost('inf_hory', 0.5), boost('inf_zima', 0.3)]],
      ['ita_xl_pzbr', 'Protitankové pušky', 35, ['ita_at'], [boost('inf_pzbr', 0.4)]],
    ] },
    { prio: 7, list: [
      ['ita_xl_fight', 'Stíhačky s motorem z dovozu', 35, ['ita_fight'], [boost('air_kys', 0.5)]],
      ['ita_xl_torpbomb', 'Torpédové bombardéry', 35, ['ita_torp'], [boost('tac3', 0.3), xp('air', 15)]],
      ['ita_xl_bb', 'Moderní bitevní lodě', 70, ['ita_mare'], [boost('bb2', 0.5), boost('bb3', 0.3)]],
      ['ita_xl_cv', 'Přestavba na letadlovou loď', 70, ['ita_xl_bb'], [boost('cv2', 0.4)]],
      ['ita_xl_mas', 'Torpédové čluny', 35, ['ita_frogmen'], [boost('nav_torp', 0.5)]],
      ['ita_xl_sub', 'Oceánské ponorky', 35, ['ita_dock'], [boost('ss2', 0.5)]],
    ] },
    { prio: 8, list: [
      ['ita_xl_radio', 'Rádiový průmysl', 35, ['ita_cnr'], [boost('el_radio', 0.5)]],
      ['ita_xl_radar', 'Radiolokace', 35, ['ita_xl_radio'], [boost('el_radar', 0.4)]],
      ['ita_xl_phys', 'Fyzikální ústav v Římě', 70, ['ita_cnr'], [slot(0.3)], { mod: { research: 0.02 } }],
    ] },
    { prio: 6, list: [
      ['ita_xl_albania', 'Protektorát nad Albánií', 35, ['ita_balkan'], [rel('ALB', 40), pp(30)]],
      ['ita_xl_hun', 'Římské protokoly', 35, ['ita_empire'], [rel('HUN', 30), rel('AUS', 30)]],
      ['ita_xl_spain2', 'Latinský blok', 35, ['ita_spain'], [rel('SPR', 30), rel('POR', 20)]],
      ['ita_xl_youth', 'Mládež na pochodu', 35, ['ita_unity'], [man(0.002), ws(0.03)]],
      ['ita_xl_empire2', 'Středomořská říše', 70, ['ita_xl_youth'], [ws(0.05), stab(0.02)]],
      ['ita_xl_peace', 'Mírové řešení', 35, ['ita_stresa'], [stab(0.05), rel('FRA', 20), rel('ENG', 20)]],
    ] },
  ],
};

// ---------------------------------------------------------------- druhé rozšíření zajímavých zemí (pod strom)
const kit = (tag, x) => [   // společná osnova + národní cíle `x`
  [`${tag}_xl_ind`, x.ind || 'Průmyslový program', 70, [], [civ(), boost('ind_pas', 0.3)]],
  [`${tag}_xl_arm`, x.arm || 'Zbrojní zakázky', 70, [`${tag}_xl_ind`], [mil(), stock('pusky', 1000)]],
  [`${tag}_xl_inf`, x.inf || 'Moderní pěchota', 35, [], [boost('inf_kul', 0.4), boost('inf_zak', 0.3)]],
  [`${tag}_xl_art`, x.art || 'Dělostřelectvo', 35, [`${tag}_xl_inf`], [boost('dela2', 0.4), boost('art_opt', 0.4)]],
  [`${tag}_xl_air`, x.air || 'Letecké síly', 35, [`${tag}_xl_inf`], [boost('air_rad', 0.4), bld('afb', 1)]],
  [`${tag}_xl_sci`, x.sci || 'Vědecké ústavy', 35, [], [boost('vyz_univ', 0.4)], { mod: { research: 0.02 } }],
  [`${tag}_xl_res`, x.res || 'Zálohy', 35, [`${tag}_xl_art`], [man(0.003), ws(0.03)]],
  ...(x.more || []),
];
export const XL_GROW = {
  POL: kit('pol', { ind: 'Druhý průmyslový okruh', arm: 'Puškárny v Radomi', air: 'Moderní stíhačky', more: [
    ['pol_xl_cav', 'Jezdecké brigády', 35, ['pol_xl_inf'], [xp('land', 20), boost('vozy_pul', 0.3)]],
    ['pol_xl_navy', 'Ponorky pro Baltské moře', 35, [], [boost('ss2', 0.4), xp('sea', 10)]],
    ['pol_xl_brit', 'Záruka z Londýna', 35, ['pol_xl_res'], [rel('ENG', 30)]],
  ] }),
  CZE: kit('cze', { ind: 'Moravské hutě', arm: 'Zbrojovka v Plzni', inf: 'Lehký kulomet z Brna', more: [
    ['cze_xl_tank2', 'Tanky pro export', 35, ['cze_xl_arm'], [boost('ltank3', 0.4), stock('ltanky', 40)]],
    ['cze_xl_fort3', 'Dokončení opevnění', 70, ['cze_xl_res'], [boost('inf_zak', 0.4), ws(0.04)]],
    ['cze_xl_sov', 'Smlouva o pomoci', 35, [], [rel('SOV', 30), rel('FRA', 20)]],
  ] }),
  SPR: kit('spr', { ind: 'Asturské doly', more: [
    ['spr_xl_morocco', 'Africká armáda', 35, ['spr_xl_res'], [xp('land', 20), man(0.002)]],
    ['spr_xl_navy2', 'Křižníky z Ferrolu', 35, [], [boost('ca2', 0.4), bld('dok', 1)]],
    ['spr_xl_peace', 'Usmíření', 35, [], [stab(0.05)]],
  ] }),
  HUN: kit('hun', { ind: 'Ocelárny v Diósgyőru', arm: 'Zbrojovky Manfréda', more: [
    ['hun_xl_danube', 'Dunajská flotila', 35, [], [xp('sea', 10), infra()]],
    ['hun_xl_rev2', 'Ztracená území', 35, ['hun_xl_res'], [ws(0.05), rel('GER', 20)]],
  ] }),
  ROM: kit('rom', { ind: 'Rafinerie a petrochemie', more: [
    ['rom_xl_oil2', 'Nová naleziště', 35, ['rom_xl_ind'], [boost('ind_rafin', 0.4)], { mod: { extract: 0.03 } }],
    ['rom_xl_cav2', 'Jezdecké divize', 35, ['rom_xl_inf'], [xp('land', 15), stock('auta', 100)]],
  ] }),
  YUG: kit('yug', { ind: 'Doly v Srbsku', more: [
    ['yug_xl_mount2', 'Obrana hor', 35, ['yug_xl_inf'], [boost('inf_hory', 0.4)]],
    ['yug_xl_navy', 'Jadranská flotila', 35, [], [boost('dd2', 0.4), xp('sea', 10)]],
  ] }),
  TUR: kit('tur', { ind: 'Anatolský průmysl', more: [
    ['tur_xl_rail2', 'Železnice na východ', 35, ['tur_xl_ind'], [infra(), boost('sup_zel', 0.3)]],
    ['tur_xl_navy', 'Námořnictvo úžin', 35, [], [boost('dd2', 0.4), bld('dok', 1)]],
  ] }),
  SWE: kit('swe', { ind: 'Švédské strojírny', arm: 'Kanóny pro celý svět', more: [
    ['swe_xl_tank2', 'Lehké tanky ze Švédska', 35, ['swe_xl_arm'], [boost('ltank3', 0.4)]],
    ['swe_xl_neutral2', 'Neutralita do posledka', 35, [], [stab(0.05), pp(30)]],
  ] }),
  FIN: kit('fin', { ind: 'Papírny a loděnice', more: [
    ['fin_xl_ski2', 'Lesní válka', 35, ['fin_xl_inf'], [boost('inf_zima', 0.5), xp('land', 15)]],
    ['fin_xl_line2', 'Druhá obranná linie', 35, ['fin_xl_res'], [boost('inf_zak', 0.4)]],
  ] }),
  GRE: kit('gre', { ind: 'Pireus a jeho továrny', more: [
    ['gre_xl_navy3', 'Ostrovní obrana', 35, [], [boost('dd2', 0.4), xp('sea', 10)]],
    ['gre_xl_epirus', 'Horská obrana Epiru', 35, ['gre_xl_inf'], [boost('inf_hory', 0.4)]],
  ] }),
  HOL: kit('hol', { ind: 'Rotterdamský přístav', more: [
    ['hol_xl_subs', 'Ponorky pro Indie', 35, [], [boost('ss2', 0.4), xp('sea', 10)]],
    ['hol_xl_flood2', 'Zaplavitelná území', 35, ['hol_xl_res'], [boost('inf_zak', 0.4)]],
  ] }),
  BEL: kit('bel', { ind: 'Valonské oceláry', more: [
    ['bel_xl_fort2', 'Pevnosti kolem Lutychu', 35, ['bel_xl_res'], [boost('inf_zak', 0.4), ws(0.03)]],
  ] }),
  POR: kit('por', { ind: 'Lisabonské loděnice', more: [
    ['por_xl_navy2', 'Atlantická eskadra', 35, [], [boost('dd2', 0.4), bld('dok', 1)]],
  ] }),
  SWI: kit('swi', { ind: 'Přesné strojírny', more: [
    ['swi_xl_alps2', 'Horské pevnosti', 35, ['swi_xl_res'], [boost('inf_hory', 0.5)]],
  ] }),
  NOR: kit('nor', { ind: 'Elektrárny na fjordech', more: [
    ['nor_xl_merchant2', 'Flotila ve službách spojenců', 35, [], [xp('sea', 15), rel('ENG', 20)]],
  ] }),
};

// ---------------------------------------------------------------- rozšíření malých zemí (pod strom)
const small = (tag, x) => [
  [`${tag}_xl_ind`, x.ind, 70, [], [civ(), boost('ind_pas', 0.3)]],
  [`${tag}_xl_inf`, x.inf || 'Moderní pěchota', 35, [], [boost('inf_kul', 0.4), stock('pusky', 800)]],
  [`${tag}_xl_def`, x.def || 'Obrana hranic', 35, [`${tag}_xl_inf`], [boost('inf_zak', 0.4), ws(0.03)]],
  [`${tag}_xl_sci`, x.sci || 'Univerzita', 35, [], [boost('vyz_univ', 0.4)], { mod: { research: 0.02 } }],
  [`${tag}_xl_arm`, x.arm || 'Zbrojní dílny', 70, [`${tag}_xl_ind`], [mil()]],
  [`${tag}_xl_res`, x.res || 'Zálohy', 35, [`${tag}_xl_def`], [man(0.003)]],
  [`${tag}_xl_dip`, x.dip[0], 35, [], [rel(x.dip[1], 30), rel(x.dip[2], 20)]],
  [`${tag}_xl_unity`, x.unity || 'Národní obrana', 35, [`${tag}_xl_res`, `${tag}_xl_dip`], [stab(0.04), ws(0.03)]],
];
export const XL_SMALL = {
  IRE: small('ire', { ind: 'Rašelinové elektrárny', dip: ['Obchod s Británií', 'ENG', 'FRA'] }),
  LUX: small('lux', { ind: 'Ocelárny v Esch', dip: ['Benelux', 'BEL', 'HOL'] }),
  AUS: small('aus', { ind: 'Alpské hutě', def: 'Obrana Alp', dip: ['Římské protokoly', 'ITA', 'HUN'] }),
  DEN: small('den', { ind: 'Mlékárny a loděnice', dip: ['Severská spolupráce', 'SWE', 'NOR'] }),
  EST: small('est', { ind: 'Břidlicový olej', dip: ['Baltská dohoda', 'LAT', 'FIN'] }),
  LAT: small('lat', { ind: 'Rižské továrny', dip: ['Baltská dohoda', 'EST', 'LIT'] }),
  LIT: small('lit', { ind: 'Kaunaské dílny', dip: ['Baltská dohoda', 'LAT', 'POL'] }),
  BUL: small('bul', { ind: 'Tabákový průmysl', def: 'Opevnění na Dunaji', dip: ['Balkánská politika', 'GER', 'YUG'] }),
  ALB: small('alb', { ind: 'Ropa z Devoli', def: 'Horská obrana', dip: ['Ochrana velmoci', 'ITA', 'GRE'] }),
  ICE: small('ice', { ind: 'Rybářské přístavy', def: 'Pobřežní hlídky', dip: ['Atlantický obchod', 'ENG', 'NOR'] }),
  EGY: small('egy', { ind: 'Bavlnářské továrny', def: 'Obrana Suezu', dip: ['Smlouva se ochráncem', 'ENG', 'TUR'] }),
  IRQ: small('irq', { ind: 'Ropovod k moři', dip: ['Arabská spolupráce', 'SAU', 'EGY'] }),
  PER: small('per', { ind: 'Transíránská železnice', dip: ['Rovnováha mocností', 'TUR', 'SOV'] }),
  SAU: small('sau', { ind: 'Ropné koncese', dip: ['Arabská spolupráce', 'IRQ', 'EGY'] }),
  OMA: small('oma', { ind: 'Obchodní přístavy', dip: ['Ochrana pobřeží', 'ENG', 'PER'] }),
  // W1: země mimo Evropu
  USA: small('usa', { ind: 'Průmysl Středozápadu', dip: ['Dobré sousedství', 'MEX', 'CAN'] }),
  CAN: small('can', { ind: 'Hutě v Ontariu', dip: ['Společenství', 'ENG', 'USA'] }),
  MEX: small('mex', { ind: 'Ropné rafinerie', dip: ['Panamerická spolupráce', 'USA', 'GUA'] }),
  GUA: small('gua', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'MEX', 'HON'] }),
  HON: small('hon', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'GUA', 'NIC'] }),
  ELS: small('els', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'GUA', 'HON'] }),
  NIC: small('nic', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'HON', 'COS'] }),
  COS: small('cos', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'NIC', 'PAN'] }),
  PAN: small('pan', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'COS', 'COL'] }),
  CUB: small('cub', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'USA', 'HAI'] }),
  HAI: small('hai', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'DOM', 'CUB'] }),
  DOM: small('dom', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'HAI', 'CUB'] }),
  COL: small('col', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'VEN', 'ECU'] }),
  VEN: small('ven', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'COL', 'BRA'] }),
  ECU: small('ecu', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'PRU', 'COL'] }),
  PRU: small('pru', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'ECU', 'BOL'] }),
  BOL: small('bol', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'PAR', 'PRU'] }),
  CHL: small('chl', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'ARG', 'PRU'] }),
  ARG: small('arg', { ind: 'Rafinerie YPF', dip: ['Obchod s Británií', 'ENG', 'BRA'] }),
  URG: small('urg', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'ARG', 'BRA'] }),
  PAR: small('par', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'BOL', 'ARG'] }),
  BRA: small('bra', { ind: 'Volta Redonda', dip: ['Panamerická spolupráce', 'USA', 'ARG'] }),
  ETH: small('eth', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'ITA', 'ENG'] }),
  LBR: small('lbr', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'ENG', 'FRA'] }),
  SAF: small('saf', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'ENG', 'POR'] }),
  JAP: small('jap', { ind: 'Zaibacu', dip: ['Pakt proti kominterně', 'GER', 'ITA'] }),
  MAN: small('man', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'JAP', 'CHI'] }),
  CHI: small('chi', { ind: 'Arzenály v Chan-jangu', dip: ['Zahraniční poradci', 'GER', 'USA'] }),
  PRC: small('prc', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'CHI', 'SOV'] }),
  SIK: small('sik', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'SOV', 'CHI'] }),
  TIB: small('tib', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'CHI', 'RAJ'] }),
  MON: small('mon', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'SOV', 'CHI'] }),
  TAN: small('tan', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'SOV', 'MON'] }),
  SIA: small('sia', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'FRA', 'ENG'] }),
  AFG: small('afg', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'RAJ', 'PER'] }),
  RAJ: small('raj', { ind: 'Bombajské přádelny', dip: ['Věrnost koruně', 'ENG', 'NEP'] }),
  NEP: small('nep', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'RAJ', 'TIB'] }),
  YEM: small('yem', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'SAU', 'ENG'] }),
  PHI: small('phi', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'USA', 'JAP'] }),
  AST: small('ast', { ind: 'Hutě v Newcastlu', dip: ['Pacifická obrana', 'NZL', 'ENG'] }),
  NZL: small('nzl', { ind: 'Národní průmysl', dip: ['Zahraniční vztahy', 'AST', 'ENG'] }),
};

// ---------------------------------------------------------------- další větve výchozího stromu
export const XL_DEFAULT = [
  { prio: 4, list: [
    ['def_xl_ind', 'Třetí průmyslová vlna', 70, ['def_rational'], [civ(), boost('ind_pas', 0.3)]],
    ['def_xl_steel', 'Ocelárny', 35, ['def_mines'], [boost('ind_mech', 0.3)], { mod: { extract: 0.02 } }],
    ['def_xl_fuel', 'Rafinerie', 35, ['def_xl_steel'], [boost('ind_rafin', 0.4)]],
    ['def_xl_arm2', 'Zbrojní koncern', 70, ['def_xl_ind'], [mil()]],
  ] },
  { prio: 5, list: [
    ['def_xl_mg', 'Lehké kulomety', 35, ['def_inf'], [boost('inf_kul', 0.5)]],
    ['def_xl_mortar', 'Minomety', 35, ['def_xl_mg'], [boost('inf_mino', 0.5)]],
    ['def_xl_aa', 'Protiletadlová obrana', 35, ['def_art'], [boost('art_pl', 0.5)]],
    ['def_xl_eng', 'Ženijní vojsko', 35, ['def_fort'], [boost('sup_zen', 0.5), boost('sup_most', 0.3)]],
    ['def_xl_recon', 'Průzkum', 35, ['def_staff'], [boost('sup_pruz', 0.5)]],
    ['def_xl_med', 'Polní nemocnice', 35, ['def_xl_recon'], [boost('nem', 0.4), boost('sup_kuch', 0.4)]],
  ] },
  { prio: 6, list: [
    ['def_xl_fight', 'Stíhací letka', 35, ['def_afb'], [boost('sti2', 0.4), xp('air', 10)]],
    ['def_xl_bomb', 'Bombardovací letka', 35, ['def_xl_fight'], [boost('tac2', 0.4)]],
    ['def_xl_dd', 'Torpédoborce', 35, ['def_merchant'], [boost('dd2', 0.4), xp('sea', 10)]],
  ] },
  { prio: 7, list: [
    ['def_xl_radio', 'Radiotechnika', 35, ['def_council'], [boost('el_radio', 0.5)]],
    ['def_xl_lab', 'Průmyslové laboratoře', 35, ['def_xl_radio'], [boost('vyz_lab', 0.4)], { mod: { research: 0.02 } }],
  ] },
  { prio: 5, list: [
    ['def_xl_press', 'Státní tisk', 35, ['def_jednota'], [pp(30), ws(0.03)]],
    ['def_xl_youth', 'Branná mládež', 35, ['def_xl_press'], [man(0.002)]],
    ['def_xl_police', 'Bezpečnostní služba', 35, ['def_spy'], [stab(0.03), pp(20)]],
    ['def_xl_reform', 'Správní reforma', 35, ['def_xl_police'], [stab(0.03)], { mod: { build: 0.02 } }],
  ] },
];
