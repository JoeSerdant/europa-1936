// W3: velké stromy národních cílů velmocí mimo Evropu – Spojené státy, Japonsko a Čína (jako evropské velmoci v M94/M98/M100:
// vlastní větve + politické cesty + modernizace). Vlastní obsah, názvy a čísla (bez skutečných osob). Polohu dopočítá `big`.
//  Položka: [id, název, dny, předpoklady, účinky, doplňky { ai, info, mod, excl, any }]
import { big } from './focuses_big.js';
import { paths, modern, HIST_NAME } from './focuses_alt.js';

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
const xp = (b, n = 20) => ({ t: 'xp', b, n });
const spirit = (id) => ({ t: 'spirit', id });
const party = (i, v) => ({ t: 'party', i, v });
const bld = (k, n = 1) => ({ t: 'bld', k, n });
const NAMES = {
  ENG: 'Británie', FRA: 'Francie', SOV: 'SSSR', GER: 'Německo', ITA: 'Itálie', CAN: 'Kanada', MEX: 'Mexiko', BRA: 'Brazílie', ARG: 'Argentina',
  CHI: 'Čína', JAP: 'Japonsko', PHI: 'Filipíny', MAN: 'Mandžukuo', SIA: 'Siam', AST: 'Austrálie', PRC: 'Čínští komunisté', SIK: 'Sin-ťiang',
  TIB: 'Tibet', RAJ: 'Indie', MON: 'Mongolsko', HOL: 'Nizozemsko',
};
const rel = (tag, v) => ({ t: 'rel', tag, nm: NAMES[tag] || tag, v });

// ---------------------------------------------------------------- Spojené státy
const USA_B = [
  { prio: 0, list: [
    ['usa_newdeal', 'Nový úděl', 45, [], [civ(2), stab(0.03)], { ai: 1, info: 'Veřejné práce a obnova po hospodářské krizi.' }],
    ['usa_tva', 'Přehrady v údolí', 70, ['usa_newdeal'], [civ(), infra()], { ai: 2, mod: { build: 0.03 }, info: 'Elektřina pro celý venkov.' }],
    ['usa_highway', 'Federální silnice', 35, ['usa_newdeal'], [infra(2)], { ai: 3 }],
    ['usa_steel', 'Ocelárny Pittsburghu', 70, ['usa_tva'], [civ(), boost('tez1', 0.4)], { mod: { extract: 0.04 } }],
    ['usa_detroit', 'Automobilky Detroitu', 35, ['usa_highway'], [civ(), boost('auta2')]],
    ['usa_oil', 'Texaská ropa', 35, ['usa_highway'], [boost('ind_rafin', 0.4)], { mod: { extract: 0.04 } }],
    ['usa_assembly', 'Výrobní linky', 70, ['usa_steel', 'usa_detroit'], [spirit('f_racionalizace'), civ()], { info: 'Pásová výroba se přesune ze spotřebního zboží do zbrojovek.' }],
    ['usa_rubber', 'Syntetický kaučuk', 35, ['usa_oil'], [boost('ind_kauc', 0.5)]],
    ['usa_wpb', 'Rada válečné výroby', 70, ['usa_assembly'], [mil(3)], { info: 'Stát rozděluje suroviny a zakázky.' }],
    ['usa_victory', 'Program vítězství', 70, ['usa_wpb'], [spirit('f_totalni_mobilizace'), mil(2)], { ai: 900, info: 'Celá země vyrábí pro válku.' }],
  ] },
  { prio: 1, list: [
    ['usa_army', 'Obnova armády', 45, ['usa_newdeal'], [stock('pusky', 3000), man(0.002)], { ai: 4 }],
    ['usa_draft', 'Výběrová služba', 35, ['usa_army'], [man(0.004), ws(0.05)], { info: 'První odvody v době míru.' }],
    ['usa_garand', 'Samonabíjecí puška', 35, ['usa_army'], [boost('pusky2'), boost('inf_sam', 0.4)]],
    ['usa_armor', 'Obrněná síla', 45, ['usa_draft'], [boost('ltank2'), stock('ltanky', 80)]],
    ['usa_medium', 'Střední tank', 70, ['usa_armor'], [boost('mtank', 0.5), mil()]],
    ['usa_art', 'Řízení palby', 35, ['usa_garand'], [boost('dela2'), boost('art_rad', 0.4)], { info: 'Centrála palby soustředí celé dělostřelectvo na jeden cíl.' }],
    ['usa_motor', 'Plně motorizovaná armáda', 35, ['usa_medium'], [spirit('f_motorizovana_valka'), boost('auta3')]],
    ['usa_supply', 'Zásobovací služba', 35, ['usa_motor'], [spirit('f_tylove_sluzby'), boost('log')]],
    ['usa_para', 'Výsadkové divize', 35, ['usa_draft'], [boost('vysadek', 0.5)]],
    ['usa_marines', 'Námořní pěchota', 35, ['usa_para'], [boost('nav_vysad', 0.5), xp('land', 15)], { info: 'Výsadky na pobřeží odolávající palbě.' }],
    ['usa_staff', 'Velitelská a štábní škola', 35, ['usa_art'], [spirit('f_stabni_planovani'), xp('land', 20)]],
  ] },
  { prio: 2, list: [
    ['usa_air', 'Armádní letectvo', 45, ['usa_newdeal'], [boost('sti2'), xp('air', 20)], { ai: 5 }],
    ['usa_afb', 'Letecké základny', 35, ['usa_air'], [bld('afb', 3)]],
    ['usa_bomber', 'Létající pevnosti', 70, ['usa_air'], [boost('strbomb', 0.5), boost('str2', 0.3)], { info: 'Těžké bombardéry pro denní nálety.' }],
    ['usa_fighter', 'Doprovodné stíhačky', 35, ['usa_afb'], [boost('sti3'), boost('air_nadr', 0.4)]],
    ['usa_cas', 'Taktické letectvo', 35, ['usa_afb'], [boost('tac2'), xp('air', 15)]],
    ['usa_air2', 'Padesát tisíc letadel', 70, ['usa_fighter', 'usa_bomber'], [mil(2), xp('air', 20)], { info: 'Výroba letadel bez obdoby.' }],
  ] },
  { prio: 3, list: [
    ['usa_navy', 'Dvouoceánské loďstvo', 45, ['usa_tva'], [xp('sea', 20), bld('dok', 2)], { ai: 6 }],
    ['usa_carrier', 'Letadlové lodě', 70, ['usa_navy'], [boost('cv2', 0.5), xp('sea', 15)]],
    ['usa_bb', 'Rychlé bitevní lodě', 70, ['usa_navy'], [boost('bb2', 0.5)]],
    ['usa_dd', 'Torpédoborce doprovodu', 35, ['usa_carrier'], [boost('dd2', 0.5), boost('nav_sonar', 0.4)]],
    ['usa_sub', 'Ponorková válka v Tichomoří', 35, ['usa_dd'], [boost('ss2', 0.5), xp('sea', 15)]],
    ['usa_liberty', 'Lodě svobody', 70, ['usa_dd'], [boost('tr2', 0.5), bld('dok', 2)], { info: 'Nákladní lodě stavěné za několik týdnů.' }],
    ['usa_fleet', 'Velké loďstvo', 70, ['usa_carrier', 'usa_bb'], [boost('cv3', 0.4), boost('bb3', 0.4)]],
  ] },
  { prio: 4, list: [
    ['usa_sci', 'Národní výzkumná rada', 35, ['usa_highway'], [slot()], { ai: 7, mod: { research: 0.05 } }],
    ['usa_lab', 'Radiační laboratoř', 35, ['usa_sci'], [boost('el_radar', 0.5), spirit('f_vedecka_rada')]],
    ['usa_codes', 'Luštění šifer', 35, ['usa_sci'], [boost('el_sifr', 0.5), boost('sup_sifr', 0.4)]],
    ['usa_comp', 'Počítací stroje', 70, ['usa_lab'], [boost('el_comp', 0.5)]],
    ['usa_atom', 'Atomový projekt', 70, ['usa_lab'], [boost('jadro1', 0.6)], { info: 'Tajné laboratoře v poušti.' }],
    ['usa_atom2', 'Štěpná puma', 70, ['usa_atom'], [boost('jadro2', 0.6)]],
  ] },
  { prio: 2, list: [
    ['usa_neutral', 'Zákony o neutralitě', 35, [], [stab(0.05), pp(40)], { ai: 3, excl: ['usa_intervene'], info: 'Amerika se do evropských válek nemíchá.' }],
    ['usa_intervene', 'Konec izolace', 35, [], [ws(0.08), party('democracy', 5)], { ai: 40, excl: ['usa_neutral'], info: 'Amerika se připravuje stát po boku demokracií.' }],
    ['usa_neighbor', 'Dobré sousedství', 35, [], [rel('MEX', 30), rel('BRA', 30), rel('ARG', 20)], { ai: 5 }],
    ['usa_cashcarry', 'Plať a odvez si', 35, ['usa_neutral'], [law('trd', 'free'), civ()], { any: ['usa_intervene'], info: 'Zbraně za hotové, odvoz na vlastních lodích.' }],
    ['usa_arsenal', 'Zbrojnice demokracie', 70, ['usa_cashcarry'], [mil(2), rel('ENG', 40)], { info: 'Továrny pracují pro spojence dřív, než země vstoupí do války.' }],
    ['usa_charter', 'Atlantická charta', 35, ['usa_arsenal'], [rel('ENG', 50), rel('CAN', 30), rel('FRA', 20)]],
    ['usa_china', 'Pomoc Číně', 35, ['usa_neighbor'], [rel('CHI', 40), pp(20)]],
    ['usa_pacific', 'Obrana Tichomoří', 35, ['usa_china'], [rel('PHI', 30), rel('AST', 30), ws(0.04)]],
    ['usa_war', 'Válečná mobilizace', 35, ['usa_charter'], [law('eco', 'war'), law('con', 'ext')], { ai: 800 }],
    ['usa_unity', 'Celý národ za vlajkou', 35, ['usa_war'], [spirit('f_narodni_jednota'), stab(0.04)]],
  ] },
];

// ---------------------------------------------------------------- Japonsko
const JAP_B = [
  { prio: 0, list: [
    ['jap_zaibatsu', 'Spolupráce koncernů', 45, [], [civ(), mil()], { ai: 1, mod: { prod: 0.03 }, info: 'Velké rodinné koncerny vyrábějí pro stát.' }],
    ['jap_manchuria', 'Mandžuský plán rozvoje', 70, ['jap_zaibatsu'], [civ(), boost('tez1', 0.4)], { ai: 2, mod: { extract: 0.05 } }],
    ['jap_rail', 'Železnice na pevnině', 35, ['jap_zaibatsu'], [infra(2)], { ai: 3 }],
    ['jap_steel', 'Ocelárny v Jawatě', 35, ['jap_manchuria'], [civ(), boost('ind_mech', 0.3)]],
    ['jap_synth', 'Paliva z uhlí', 70, ['jap_manchuria'], [boost('synt1', 0.5)], { info: 'Bez vlastní ropy musí ostrovy vyrábět benzín jinak.' }],
    ['jap_oilres', 'Ropné zásoby', 35, ['jap_synth'], [boost('ind_rafin', 0.4)], { mod: { extract: 0.03 } }],
    ['jap_plan', 'Pětiletý plán zbrojení', 70, ['jap_steel'], [mil(2)], { ai: 6 }],
    ['jap_mobil', 'Zákon o národní mobilizaci', 35, ['jap_plan'], [law('eco', 'war'), pp(30)], { info: 'Stát smí řídit výrobu, mzdy i práci.' }],
    ['jap_total', 'Celonárodní úsilí', 70, ['jap_mobil'], [spirit('f_totalni_mobilizace')], { ai: 900 }],
  ] },
  { prio: 1, list: [
    ['jap_army', 'Modernizace armády', 45, ['jap_zaibatsu'], [stock('pusky', 2500), boost('pusky2')], { ai: 4 }],
    ['jap_night', 'Noční boj', 35, ['jap_army'], [boost('inf_noc', 0.5), spirit('f_pechotni_drill')], { info: 'Pěchota cvičená k útokům za tmy.' }],
    ['jap_light', 'Lehké tanky pro pevninu', 35, ['jap_army'], [boost('ltank2'), stock('ltanky', 60)]],
    ['jap_kwantung', 'Armáda na pevnině', 45, ['jap_night'], [man(0.004), xp('land', 20)]],
    ['jap_jungle', 'Válka v džungli', 35, ['jap_kwantung'], [boost('inf_komando', 0.4), spirit('f_disciplina')]],
    ['jap_art', 'Horské dělostřelectvo', 35, ['jap_light'], [boost('dela2'), spirit('f_horske_jednotky')]],
    ['jap_medium', 'Střední tanky', 70, ['jap_art'], [boost('mtank', 0.4)]],
    ['jap_para', 'Námořní výsadkáři', 35, ['jap_jungle'], [boost('vysadek', 0.5), boost('nav_vysad', 0.3)]],
    ['jap_staff', 'Generální štáb armády', 35, ['jap_kwantung'], [spirit('f_stabni_planovani'), pp(20)]],
    ['jap_spirit', 'Duch útoku', 35, ['jap_staff'], [spirit('f_elitni_jednotky')], { info: 'Útok do posledního muže.' }],
  ] },
  { prio: 2, list: [
    ['jap_navy', 'Námořní program', 45, ['jap_zaibatsu'], [xp('sea', 25), bld('dok', 2)], { ai: 5 }],
    ['jap_bb', 'Největší bitevní lodě', 70, ['jap_navy'], [boost('bb2', 0.5), boost('bb3', 0.3)], { excl: ['jap_cv'], info: 'Obří děla rozhodnou bitvu loďstev.' }],
    ['jap_cv', 'Údernice letadlových lodí', 70, ['jap_navy'], [boost('cv2', 0.5), boost('cv3', 0.3)], { excl: ['jap_bb'], info: 'Letadla z lodí rozhodnou válku na moři.' }],
    ['jap_torp', 'Dlouhá kopí', 35, ['jap_navy'], [boost('nav_torp', 0.6), boost('dd2', 0.3)], { info: 'Torpéda s kyslíkovým pohonem a obrovským dosahem.' }],
    ['jap_night_navy', 'Noční boj loďstva', 35, ['jap_torp'], [boost('ca2', 0.4), xp('sea', 20)]],
    ['jap_sub', 'Ponorky dálkového dosahu', 35, ['jap_torp'], [boost('ss2', 0.4)]],
    ['jap_decisive', 'Rozhodující bitva', 70, ['jap_night_navy'], [xp('sea', 30)], { any: ['jap_bb', 'jap_cv'] }],
    ['jap_convoy', 'Ochrana konvojů', 35, ['jap_sub'], [boost('nav_sonar', 0.4), boost('tr2', 0.3)]],
  ] },
  { prio: 3, list: [
    ['jap_air', 'Námořní letectvo', 45, ['jap_navy'], [boost('sti2'), xp('air', 20)], { ai: 7 }],
    ['jap_zero', 'Lehký stíhač dlouhého doletu', 70, ['jap_air'], [boost('sti3', 0.5), boost('air_nadr', 0.4)]],
    ['jap_bomb', 'Dálkové bombardéry', 35, ['jap_air'], [boost('tac2'), xp('air', 15)]],
    ['jap_afb', 'Ostrovní letiště', 35, ['jap_bomb'], [bld('afb', 2)]],
    ['jap_aces', 'Výcvik pilotů', 35, ['jap_zero'], [xp('air', 25)]],
  ] },
  { prio: 4, list: [
    ['jap_sci', 'Císařské univerzity', 35, ['jap_rail'], [slot()], { ai: 8, mod: { research: 0.05 } }],
    ['jap_radio', 'Rádiová technika', 35, ['jap_sci'], [boost('el_radio', 0.5)]],
    ['jap_radar', 'Radiolokátory', 35, ['jap_radio'], [boost('el_radar', 0.4)]],
    ['jap_council', 'Rada pro vědu', 35, ['jap_sci'], [spirit('f_vedecka_rada')]],
  ] },
  { prio: 2, list: [
    ['jap_anticom', 'Pakt proti kominterně', 35, [], [rel('GER', 40), rel('ITA', 30)], { ai: 3 }],
    ['jap_northern', 'Úder na sever', 35, ['jap_anticom'], [ws(0.06), xp('land', 15)], { excl: ['jap_southern'], info: 'Hlavní nepřítel je Sovětský svaz.' }],
    ['jap_southern', 'Postup na jih', 35, ['jap_anticom'], [ws(0.06), xp('sea', 15)], { ai: 11, excl: ['jap_northern'], info: 'Ropa a guma leží na jihu.' }],
    ['jap_mansfriend', 'Spolupráce s Mandžukuem', 35, ['jap_anticom'], [rel('MAN', 40), pp(20)]],
    ['jap_siam', 'Přátelství se Siamem', 35, ['jap_southern'], [rel('SIA', 40)]],
    ['jap_neutral_sov', 'Neutralita se SSSR', 35, ['jap_southern'], [rel('SOV', 40), pp(20)]],
    ['jap_sphere', 'Sféra společné prosperity', 70, ['jap_siam'], [civ(), law('trd', 'lim')], { info: 'Hospodářský blok Východní Asie pod japonským vedením.' }],
    ['jap_tripartite', 'Pakt tří', 35, ['jap_mansfriend'], [rel('GER', 50), rel('ITA', 40)]],
    ['jap_propaganda', 'Sjednocení národa', 35, ['jap_tripartite'], [spirit('f_propaganda'), party('fascism', 8)]],
    ['jap_unity', 'Národní obranný stát', 35, ['jap_propaganda'], [spirit('f_narodni_jednota'), law('con', 'ext')]],
  ] },
];

// ---------------------------------------------------------------- Čína
const CHI_B = [
  { prio: 0, list: [
    ['chi_decade', 'Desetiletí výstavby', 45, [], [civ(), infra()], { ai: 1, info: 'Silnice, banky a továrny v pobřežních provinciích.' }],
    ['chi_currency', 'Měnová reforma', 35, ['chi_decade'], [stab(0.05), pp(30)]],
    ['chi_arsenal', 'Arzenály ve vnitrozemí', 45, ['chi_decade'], [mil(2)], { ai: 2 }],
    ['chi_relocate', 'Stěhování továren na západ', 70, ['chi_arsenal'], [civ(), mil()], { info: 'Továrny z pobřeží se rozeberou a odvezou proti proudu řeky.' }],
    ['chi_burma', 'Silnice přes hory', 70, ['chi_currency'], [infra(2), law('trd', 'free')], { info: 'Zásobovací cesta z jihu přes horské průsmyky.' }],
    ['chi_mines', 'Wolfram a cín', 35, ['chi_currency'], [boost('tez1', 0.4)], { mod: { extract: 0.06 } }],
    ['chi_coop', 'Průmyslová družstva', 35, ['chi_relocate'], [civ(), spirit('f_stavebni_program')]],
    ['chi_war_eco', 'Válečné hospodářství odporu', 70, ['chi_coop'], [law('eco', 'war'), mil()], { ai: 900 }],
  ] },
  { prio: 1, list: [
    ['chi_german', 'Vzorové divize', 45, ['chi_decade'], [stock('pusky', 3000), xp('land', 20)], { ai: 3, info: 'Několik divizí vycvičených a vyzbrojených podle cizích poradců.' }],
    ['chi_conscr', 'Branný zákon', 35, ['chi_german'], [man(0.004), ws(0.05)]],
    ['chi_fort', 'Obranné linie', 35, ['chi_german'], [spirit('f_hlubka_obrany'), boost('inf_zak', 0.4)]],
    ['chi_mass', 'Milionová armáda', 35, ['chi_conscr'], [spirit('f_masova_armada'), man(0.004)]],
    ['chi_guerrilla', 'Partyzánská válka', 35, ['chi_mass'], [boost('inf_komando', 0.4), boost('inf_hory', 0.4)], { info: 'Boj v týlu nepřítele.' }],
    ['chi_art', 'Dělostřelecké pluky', 35, ['chi_fort'], [boost('dela2'), stock('dela', 200)]],
    ['chi_tank', 'Obrněný sbor', 70, ['chi_art'], [boost('ltank2'), stock('ltanky', 40)]],
    ['chi_reform', 'Reforma velení', 35, ['chi_guerrilla'], [spirit('f_disciplina'), xp('land', 15)]],
    ['chi_expedition', 'Expediční armáda', 35, ['chi_reform'], [xp('land', 25), stock('pusky', 2000)], { info: 'Divize vycvičené a vyzbrojené spojenci.' }],
  ] },
  { prio: 2, list: [
    ['chi_air', 'Letecká škola', 45, ['chi_decade'], [boost('sti2'), xp('air', 15)], { ai: 5 }],
    ['chi_volunteer', 'Dobrovolní piloti', 35, ['chi_air'], [xp('air', 20), rel('USA', 20)], { info: 'Zahraniční letci bránící čínské nebe.' }],
    ['chi_afb', 'Letiště ve vnitrozemí', 35, ['chi_air'], [bld('afb', 2)]],
    ['chi_navy', 'Říční flotila', 35, ['chi_decade'], [xp('sea', 10), boost('dd2', 0.3)]],
  ] },
  { prio: 3, list: [
    ['chi_sci', 'Sjednocené univerzity', 35, ['chi_currency'], [slot()], { ai: 6, mod: { research: 0.04 } }],
    ['chi_radio', 'Rádiové spojení', 35, ['chi_sci'], [boost('el_radio', 0.5)]],
    ['chi_med', 'Polní nemocnice', 35, ['chi_sci'], [boost('sup_san', 0.5), man(0.002)]],
  ] },
  { prio: 2, list: [
    ['chi_unify', 'Sjednocení země', 35, [], [stab(0.05), pp(40)], { ai: 2 }],
    ['chi_front', 'Jednotná fronta', 35, ['chi_unify'], [rel('PRC', 50), ws(0.08)], { ai: 11, excl: ['chi_purge'], info: 'Nacionalisté a komunisté proti společnému nepříteli.' }],
    ['chi_purge', 'Potlačení komunistů', 35, ['chi_unify'], [stab(0.04), party('neutrality', 8)], { excl: ['chi_front'], info: 'Nejdřív vnitřní mír, potom vnější nepřítel.' }],
    ['chi_warlords', 'Usmíření s generály', 35, ['chi_unify'], [rel('SIK', 30), rel('TIB', 20), man(0.002)]],
    ['chi_aid', 'Žádost o pomoc', 35, ['chi_warlords'], [rel('USA', 40), rel('ENG', 30)]],
    ['chi_sov', 'Sovětští poradci', 35, ['chi_warlords'], [rel('SOV', 40), stock('pusky', 1500)]],
    ['chi_resist', 'Válka odporu', 35, ['chi_front'], [spirit('f_narodni_jednota'), ws(0.06)], { any: ['chi_purge'] }],
    ['chi_capital', 'Válečné hlavní město', 35, ['chi_resist'], [stab(0.04), spirit('f_propaganda')], { info: 'Vláda vydrží v horách za soutěskami.' }],
    ['chi_allies', 'Spojenecká velmoc', 70, ['chi_capital', 'chi_aid'], [rel('USA', 30), rel('ENG', 30), pp(50)]],
  ] },
];

/** Prefix, výchozí ideologie (pro politické cesty) a vlastní názvy modernizace. */
const MOD_NAMES = {
  USA: { final: 'Armáda pro celý svět', amph: 'Obojživelné sbory', comp: 'Elektronické počítače' },
  JAP: { amph: 'Výsadkové lodě', final: 'Císařská armáda budoucnosti' },
  CHI: { log: 'Zásobování přes hory', final: 'Nová armáda republiky' },
};
const assemble = (tag, ideo, branches) => {
  const p = tag.toLowerCase();
  return big([...branches, { prio: 3, list: paths(p, tag, ideo, HIST_NAME[tag]) }, { prio: 9, list: modern(p, MOD_NAMES[tag]) }]);
};

/** Velmoci světa s vlastním velkým stromem (W3). Zbytek mimoevropských zemí má výchozí strom + rozšíření (W1). */
export const WORLD_BIG = {
  USA: assemble('USA', 'democracy', USA_B),
  JAP: assemble('JAP', 'fascism', JAP_B),
  CHI: assemble('CHI', 'neutrality', CHI_B),
};
export const WORLD_BIG_TAGS = Object.keys(WORLD_BIG);
