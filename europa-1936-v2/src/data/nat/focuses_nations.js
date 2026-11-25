// W4: vlastní národní cíle zemí mimo Evropu (bez velmocí USA, Japonska a Číny – ty mají velký strom ve `focuses_world.js`).
// Každá země má osm základních cílů (stejná id jako ve W1: eco, rail, army, sci, arm, trade, unity, staff) s vlastními názvy
// a k nim jedinečné cíle `x` podle země (suroviny, terén, loďstvo, diplomacie). Vlastní obsah, názvy a čísla (bez skutečných osob).
//  Základ: { eco: [název, popis], rail, army, sci, arm, trade, unity, staff } (chybějící = obecný název)
//  Jedinečné cíle: [přípona id, název, dny, předpoklady (přípony), účinky, doplňky { info, mod, excl }] – id = `<tag>_<přípona>`
const civ = (n = 1) => ({ t: 'factory', k: 'civ', n });
const mil = (n = 1) => ({ t: 'factory', k: 'mil', n });
const stab = (v) => ({ t: 'stab', v });
const ws = (v) => ({ t: 'ws', v });
const pp = (v) => ({ t: 'pp', v });
const man = (v) => ({ t: 'man', v });
const infra = (n = 1) => ({ t: 'infra', n });
const stock = (eq, n) => ({ t: 'stock', eq, n });
const boost = (id, v = 0.3) => ({ t: 'boost', id, v });
const law = (cat, id) => ({ t: 'law', cat, id });
const xp = (b, n = 20) => ({ t: 'xp', b, n });
const spirit = (id) => ({ t: 'spirit', id });
const bld = (k, n = 1) => ({ t: 'bld', k, n });
const NAMES = {
  USA: 'Spojené státy', ENG: 'Británie', FRA: 'Francie', GER: 'Německo', ITA: 'Itálie', SOV: 'SSSR', JAP: 'Japonsko', CHI: 'Čína', POR: 'Portugalsko',
  SPR: 'Španělsko', HOL: 'Nizozemsko', TUR: 'Turecko', PER: 'Írán', SAU: 'Saúdská Arábie', EGY: 'Egypt',
  CAN: 'Kanada', MEX: 'Mexiko', GUA: 'Guatemala', HON: 'Honduras', ELS: 'Salvador', NIC: 'Nikaragua', COS: 'Kostarika', PAN: 'Panama',
  CUB: 'Kuba', HAI: 'Haiti', DOM: 'Dominikánská republika', COL: 'Kolumbie', VEN: 'Venezuela', ECU: 'Ekvádor', PRU: 'Peru', BOL: 'Bolívie',
  CHL: 'Chile', ARG: 'Argentina', URG: 'Uruguay', PAR: 'Paraguay', BRA: 'Brazílie', ETH: 'Etiopie', LBR: 'Libérie', SAF: 'Jihoafrická unie',
  MAN: 'Mandžukuo', PRC: 'Čínští komunisté', SIK: 'Sin-ťiang', TIB: 'Tibet', MON: 'Mongolsko', TAN: 'Tuva', SIA: 'Siam', AFG: 'Afghánistán',
  RAJ: 'Indie', NEP: 'Nepál', YEM: 'Jemen', PHI: 'Filipíny', AST: 'Austrálie', NZL: 'Nový Zéland',
};
const rel = (tag, v) => ({ t: 'rel', tag, nm: NAMES[tag] || tag, v });

export const NATION_SPEC = {
  // ---------------------------------------------------------------- Severní a Střední Amerika
  CAN: { eco: ['Kanadská železnice', 'Pšenice z prérií a dřevo ze severu.'], army: 'Kanadský armádní sbor', arm: 'Zbrojovky v Ontariu', unity: 'Jednota provincií', x: [
    ['nickel', 'Niklové doly', 35, ['eco'], [boost('tez1', 0.4)], { mod: { extract: 0.06 } }],
    ['bcatp', 'Letecký výcvik Společenství', 70, ['arm'], [boost('sti2'), xp('air', 25), bld('afb', 2)], { info: 'Výcvikové školy pro piloty celého Společenství.' }],
    ['corvette', 'Korvety pro konvoje', 35, ['rail'], [boost('dd2', 0.4), bld('dok', 1)]],
    ['mutual', 'Vzájemná pomoc', 35, ['unity'], [rel('ENG', 30), rel('USA', 30)]],
    ['volunteers', 'Dobrovolnická armáda', 35, ['army'], [man(0.003), ws(0.04)]],
  ] },
  MEX: { eco: ['Znárodnění ropy', 'Ropa patří národu.'], army: 'Revoluční armáda', unity: 'Strana revoluce', x: [
    ['pemex', 'Státní ropná společnost', 70, ['eco'], [boost('ind_rafin', 0.4), civ()], { mod: { extract: 0.05 } }],
    ['land', 'Pozemková reforma', 35, ['eco'], [stab(0.06), man(0.002)], { info: 'Půda pro vesnická společenství.' }],
    ['rail2', 'Železnice do Yucatánu', 35, ['rail'], [infra(), boost('sup_zel', 0.3)]],
    ['air', 'Expediční letka', 35, ['arm'], [boost('sti2'), xp('air', 15)]],
    ['pan', 'Dobré sousedství', 35, ['trade'], [rel('USA', 30), rel('GUA', 20)]],
  ] },
  GUA: { eco: ['Kávové plantáže', 'Káva a banány pro sever.'], army: 'Národní garda', x: [
    ['fruit', 'Banánové koncese', 35, ['eco'], [civ(), law('trd', 'free')]],
    ['road', 'Silnice přes vysočinu', 35, ['rail'], [infra()]],
    ['hills', 'Horská obrana', 35, ['army'], [boost('inf_hory', 0.4)]],
    ['ally', 'Opora na severu', 35, ['unity'], [rel('USA', 30), rel('MEX', 20)]],
  ] },
  HON: { eco: ['Banánové přístavy', 'Přístavy plné nákladních lodí.'], army: 'Národní garda', x: [
    ['port', 'Přístavy na Karibiku', 35, ['eco'], [infra(), civ()]],
    ['jungle', 'Válka v pralese', 35, ['army'], [boost('inf_komando', 0.4)]],
    ['air', 'Letecký sbor', 35, ['arm'], [boost('sti2'), xp('air', 10)]],
    ['ally', 'Středoamerická spolupráce', 35, ['unity'], [rel('GUA', 30), rel('NIC', 20)]],
  ] },
  ELS: { eco: ['Kávový vývoz', 'Nejlidnatější země šíje.'], army: 'Národní garda', x: [
    ['coffee', 'Kávová banka', 35, ['eco'], [civ(), pp(20)]],
    ['people', 'Husté osídlení', 35, ['army'], [man(0.004)]],
    ['volcano', 'Obrana sopečných hor', 35, ['army'], [boost('inf_hory', 0.4)]],
    ['ally', 'Sousedská smlouva', 35, ['unity'], [rel('GUA', 30), rel('HON', 20)]],
  ] },
  NIC: { eco: ['Kanál přes jezera', 'Starý sen o průplavu mezi oceány.'], army: 'Národní garda', x: [
    ['canal', 'Průzkum průplavu', 70, ['eco'], [civ(), infra()], { info: 'Trasa přes velké jezero čeká na investory.' }],
    ['gold', 'Zlaté doly', 35, ['eco'], [boost('tez1', 0.3), pp(20)]],
    ['guard', 'Garda věrná vládě', 35, ['army'], [stab(0.05), stock('pusky', 600)]],
    ['ally', 'Přízeň severu', 35, ['unity'], [rel('USA', 30)]],
  ] },
  COS: { eco: ['Kávová republika', 'Vzdělaná země bez velké armády.'], army: 'Civilní stráž', x: [
    ['school', 'Školy místo kasáren', 35, ['sci'], [boost('vyz_univ', 0.4), stab(0.04)], { mod: { research: 0.02 } }],
    ['peace', 'Mírová politika', 35, ['eco'], [stab(0.06), pp(30)]],
    ['rail2', 'Železnice k Atlantiku', 35, ['rail'], [infra()]],
    ['ally', 'Přátelství sousedů', 35, ['unity'], [rel('PAN', 30), rel('NIC', 20)]],
  ] },
  PAN: { eco: ['Průplavové hospodářství', 'Lodě celého světa platí za průjezd.'], army: 'Národní policie', x: [
    ['canal', 'Průplavové poplatky', 35, ['eco'], [civ(), pp(30)]],
    ['flag', 'Lodě pod cizí vlajkou', 35, ['trade'], [boost('tr2', 0.4), civ()]],
    ['defense', 'Obrana průplavu', 35, ['army'], [boost('inf_zak', 0.4), bld('radar', 1)]],
    ['ally', 'Smlouva o průplavu', 35, ['unity'], [rel('USA', 40), rel('COL', 20)]],
  ] },
  CUB: { eco: ['Cukrovary', 'Cukr pro celý sever.'], army: 'Konstitucionální armáda', x: [
    ['sugar', 'Cukerní kvóty', 35, ['eco'], [civ(), law('trd', 'free')]],
    ['nickel', 'Nikl z hor na východě', 35, ['eco'], [boost('tez1', 0.4)], { mod: { extract: 0.04 } }],
    ['coast', 'Pobřežní hlídky', 35, ['army'], [boost('dd2', 0.3), xp('sea', 10)]],
    ['ally', 'Zvláštní vztah', 35, ['unity'], [rel('USA', 40)]],
  ] },
  HAI: { eco: ['Přístav Port-au-Prince', 'Káva, sisal a přístav.'], army: 'Haitská garda', x: [
    ['coffee', 'Venkovská káva', 35, ['eco'], [civ()]],
    ['mount', 'Hory a partyzáni', 35, ['army'], [boost('inf_hory', 0.4), boost('inf_komando', 0.3)]],
    ['ally', 'Francouzské vazby', 35, ['unity'], [rel('FRA', 30), rel('USA', 20)]],
    ['peace', 'Smír se sousedem', 35, ['trade'], [rel('DOM', 30), stab(0.04)]],
  ] },
  DOM: { eco: ['Cukerní hospodářství', 'Plantáže a přístavy pod přísnou vládou.'], army: 'Národní armáda', x: [
    ['sugar', 'Cukrovary na pobřeží', 35, ['eco'], [civ()]],
    ['order', 'Pevná ruka', 35, ['army'], [stab(0.06), stock('pusky', 800)]],
    ['port', 'Nový přístav', 35, ['rail'], [infra(), bld('dok', 1)]],
    ['ally', 'Přízeň severu', 35, ['unity'], [rel('USA', 30)]],
  ] },
  // ---------------------------------------------------------------- Jižní Amerika
  COL: { eco: ['Káva a ropa', 'Země dvou oceánů a tří pohoří.'], army: 'Andská armáda', x: [
    ['oil', 'Ropné koncese', 35, ['eco'], [boost('ind_rafin', 0.4)], { mod: { extract: 0.04 } }],
    ['air', 'Civilní letecké linky', 35, ['rail'], [boost('sti2'), infra()], { info: 'Letadla přes hory, kam silnice nevedou.' }],
    ['andes', 'Horské prapory', 35, ['army'], [boost('inf_hory', 0.4)]],
    ['amazon', 'Hranice v Amazonii', 35, ['army'], [boost('inf_komando', 0.3), ws(0.03)]],
    ['ally', 'Panamerická spolupráce', 35, ['unity'], [rel('USA', 30), rel('VEN', 20)]],
  ] },
  VEN: { eco: ['Ropná pole Maracaiba', 'Jezero plné ropných věží.'], army: 'Bolívarovská armáda', x: [
    ['oil', 'Ropný boom', 70, ['eco'], [boost('ind_rafin', 0.5), civ()], { mod: { extract: 0.08 } }],
    ['refine', 'Rafinerie na ostrovech', 35, ['oil'], [boost('synt1', 0.3), civ()]],
    ['road', 'Silnice přes Andy', 35, ['rail'], [infra()]],
    ['navy', 'Pobřežní loďstvo', 35, ['arm'], [boost('dd2', 0.3), xp('sea', 10)]],
    ['ally', 'Bolívarovská jednota', 35, ['unity'], [rel('COL', 30), rel('USA', 20)]],
  ] },
  ECU: { eco: ['Kakaové plantáže', 'Kakao, banány a balza.'], army: 'Obrana Amazonie', x: [
    ['cocoa', 'Vývoz kakaa', 35, ['eco'], [civ()]],
    ['border', 'Spor o hranici', 35, ['army'], [ws(0.06), man(0.002)]],
    ['andes', 'Horské posádky', 35, ['army'], [boost('inf_hory', 0.4)]],
    ['ally', 'Hledání spojenců', 35, ['unity'], [rel('COL', 30), rel('USA', 20)]],
  ] },
  PRU: { eco: ['Doly v Andách', 'Měď, stříbro a guano.'], army: 'Armáda Inků', x: [
    ['copper', 'Měděné doly', 35, ['eco'], [boost('tez1', 0.4)], { mod: { extract: 0.06 } }],
    ['guano', 'Guanové ostrovy', 35, ['trade'], [civ(), pp(20)]],
    ['andes', 'Vysokohorská pěchota', 35, ['army'], [boost('inf_hory', 0.5)]],
    ['navy', 'Pacifická eskadra', 35, ['arm'], [boost('ss2', 0.3), xp('sea', 10)]],
    ['border', 'Severní hranice', 35, ['andes'], [ws(0.05), stock('pusky', 800)]],
  ] },
  BOL: { eco: ['Cínové doly', 'Svět potřebuje cín z vysokých plání.'], army: 'Obnova po Chacu', x: [
    ['tin', 'Cínoví baroni', 35, ['eco'], [boost('tez2', 0.4)], { mod: { extract: 0.07 } }],
    ['oil', 'Znárodnění ropy', 35, ['eco'], [boost('ind_rafin', 0.3), pp(20)]],
    ['alti', 'Armáda náhorní plošiny', 35, ['army'], [boost('inf_hory', 0.4), man(0.002)]],
    ['lessons', 'Poučení z porážky', 35, ['staff'], [xp('land', 20), ws(0.04)]],
  ] },
  CHL: { eco: ['Ledek a měď', 'Pouštní doly na severu, přístavy na jihu.'], army: 'Chilská armáda', x: [
    ['copper', 'Velké měděné doly', 70, ['eco'], [boost('tez1', 0.5), civ()], { mod: { extract: 0.07 } }],
    ['navy', 'Nejsilnější loďstvo jihu', 35, ['arm'], [boost('ca2', 0.4), xp('sea', 20)]],
    ['andes', 'Horská brigáda', 35, ['army'], [boost('inf_hory', 0.4), boost('inf_zima', 0.3)]],
    ['corfo', 'Rozvojová korporace', 35, ['trade'], [civ(), infra()]],
    ['ally', 'Pacifická politika', 35, ['unity'], [rel('ARG', 20), rel('ENG', 20)]],
  ] },
  ARG: { eco: ['Pampy a obilí', 'Obilnice a jatka světa.'], army: 'Armáda La Platy', x: [
    ['beef', 'Hovězí pro Evropu', 35, ['eco'], [civ(), law('trd', 'free')]],
    ['steel', 'Státní hutě', 70, ['arm'], [mil(), boost('ind_mech', 0.3)]],
    ['navy', 'Loďstvo Jižního Atlantiku', 35, ['arm'], [boost('ca2', 0.3), bld('dok', 1)]],
    ['ypf', 'Patagonská ropa', 35, ['rail'], [boost('ind_rafin', 0.4)], { mod: { extract: 0.04 } }],
    ['neutral', 'Ozbrojená neutralita', 35, ['unity'], [stab(0.05), pp(30)]],
    ['cav', 'Jezdectvo pamp', 35, ['army'], [xp('land', 15), stock('auta', 100)]],
  ] },
  URG: { eco: ['Hovězí vývoz', 'Malá země s velkými stády.'], army: 'Národní armáda', x: [
    ['welfare', 'Sociální stát', 35, ['eco'], [stab(0.06), civ()]],
    ['port', 'Přístav Montevideo', 35, ['trade'], [infra(), bld('dok', 1)]],
    ['ally', 'Mezi dvěma sousedy', 35, ['unity'], [rel('ARG', 30), rel('BRA', 30)]],
    ['guard', 'Domobrana', 35, ['army'], [man(0.003)]],
  ] },
  PAR: { eco: ['Vítězové z Chaca', 'Země hrdá na vyhranou válku.'], army: 'Veteráni války', x: [
    ['veterans', 'Zkušení velitelé', 35, ['army'], [xp('land', 25), spirit('f_disciplina')]],
    ['river', 'Říční flotila', 35, ['rail'], [infra(), xp('sea', 10)]],
    ['chaco', 'Opevnění v Chacu', 35, ['staff'], [boost('inf_zak', 0.4)]],
    ['ally', 'Přátelé u ústí řek', 35, ['unity'], [rel('ARG', 30), rel('BRA', 20)]],
  ] },
  BRA: { eco: ['Káva a guma', 'Obr, který se probouzí.'], army: 'Brazilská armáda', x: [
    ['steel', 'Ocelárna u řeky', 70, ['eco'], [civ(), mil(), boost('ind_mech', 0.3)], { info: 'První velká ocelárna jižní polokoule.' }],
    ['rubber', 'Gumové plantáže', 35, ['eco'], [boost('ind_kauc', 0.4)], { mod: { extract: 0.04 } }],
    ['iron', 'Železná ruda z vnitrozemí', 35, ['rail'], [boost('tez1', 0.4)], { mod: { extract: 0.05 } }],
    ['estado', 'Nový stát', 35, ['unity'], [stab(0.06), pp(40)]],
    ['feb', 'Expediční sbor', 35, ['army'], [xp('land', 20), man(0.003)]],
    ['navy', 'Loďstvo jižního Atlantiku', 35, ['arm'], [boost('dd2', 0.4), bld('dok', 1)]],
  ] },
  // ---------------------------------------------------------------- Afrika
  ETH: { eco: ['Císařská silnice', 'Cesty, které spojí horské provincie.'], army: 'Obrana císařství', x: [
    ['mount', 'Válka v horách', 35, ['army'], [boost('inf_hory', 0.5), spirit('f_horske_jednotky')]],
    ['levy', 'Odvody provincií', 35, ['army'], [man(0.005), stock('pusky', 1500)]],
    ['league', 'Apel u Společnosti národů', 35, ['unity'], [rel('ENG', 30), rel('FRA', 20)]],
    ['guerrilla', 'Odboj patriotů', 35, ['levy'], [boost('inf_komando', 0.4), ws(0.06)], { info: 'Boj pokračuje v horách i po pádu hlavního města.' }],
  ] },
  LBR: { eco: ['Kaučukové plantáže', 'Guma pro americké pneumatiky.'], army: 'Pohraniční síly', x: [
    ['rubber', 'Kaučukové koncese', 35, ['eco'], [boost('ind_kauc', 0.4), civ()]],
    ['port', 'Přístav Monrovia', 35, ['rail'], [infra(), bld('dok', 1)]],
    ['ally', 'Opora za oceánem', 35, ['unity'], [rel('USA', 40)]],
    ['frontier', 'Pohraniční prapory', 35, ['army'], [boost('inf_komando', 0.3), man(0.002)]],
  ] },
  SAF: { eco: ['Zlaté doly', 'Zlato a diamanty z hlubin.'], army: 'Obranné síly Unie', arm: 'Zbrojovky v Pretorii', x: [
    ['gold', 'Zlatá pánev', 35, ['eco'], [civ(), pp(30)]],
    ['steel', 'Státní ocelárny', 70, ['arm'], [mil(), boost('tez1', 0.4)], { mod: { extract: 0.05 } }],
    ['desert', 'Pouštní válka', 35, ['army'], [boost('auta2'), xp('land', 15)], { info: 'Motorizované brigády pro severní Afriku.' }],
    ['cape', 'Obrana mysu', 35, ['rail'], [bld('dok', 1), boost('dd2', 0.3)]],
    ['ally', 'Společenství', 35, ['unity'], [rel('ENG', 40)]],
  ] },
  // ---------------------------------------------------------------- Asie
  MAN: { eco: ['Mandžuské doly', 'Uhlí a železo pro japonský průmysl.'], army: 'Armáda Mandžukua', x: [
    ['coal', 'Uhelné pánve', 35, ['eco'], [boost('tez1', 0.4), civ()], { mod: { extract: 0.06 } }],
    ['steel', 'Ocelárny v Anšanu', 70, ['coal'], [mil(), civ()]],
    ['plan', 'Pětiletý plán rozvoje', 70, ['arm'], [civ(), infra()]],
    ['loyal', 'Věrnost ochránci', 35, ['unity'], [rel('JAP', 40), stab(0.04)]],
    ['cav', 'Jízda ze stepí', 35, ['army'], [man(0.003), xp('land', 10)]],
  ] },
  PRC: { eco: ['Pohraniční oblast', 'Chudá horská oblast s vlastní vládou.'], army: 'Rudá armáda', x: [
    ['guerrilla', 'Partyzánská válka', 35, ['army'], [boost('inf_komando', 0.5), spirit('f_disciplina')]],
    ['land', 'Pozemková reforma', 35, ['eco'], [stab(0.06), man(0.004)]],
    ['caves', 'Školy v jeskyních', 35, ['sci'], [boost('vyz_univ', 0.3), xp('land', 15)]],
    ['front', 'Jednotná fronta', 35, ['unity'], [rel('CHI', 40), ws(0.06)]],
    ['sov', 'Pomoc ze severu', 35, ['unity'], [rel('SOV', 40), stock('pusky', 1000)]],
  ] },
  SIK: { eco: ['Hedvábná stezka', 'Oázy a karavany na staré cestě.'], army: 'Provinční armáda', x: [
    ['oil', 'Ropa z pouště', 35, ['eco'], [boost('ind_rafin', 0.3)], { mod: { extract: 0.05 } }],
    ['sov', 'Sovětští poradci', 35, ['unity'], [rel('SOV', 40), stock('pusky', 800)]],
    ['road', 'Cesta přes poušť', 35, ['rail'], [infra(), boost('sup_zel', 0.2)]],
    ['cav', 'Pouštní jízda', 35, ['army'], [xp('land', 15), man(0.002)]],
  ] },
  TIB: { eco: ['Klášterní hospodářství', 'Ječmen, jaci a kláštery.'], army: 'Tibetská armáda', x: [
    ['roof', 'Obrana střechy světa', 35, ['army'], [boost('inf_hory', 0.5), boost('inf_zima', 0.4)]],
    ['monks', 'Rada kláštera', 35, ['unity'], [stab(0.08), pp(30)]],
    ['ally', 'Hledání ochránce', 35, ['trade'], [rel('ENG', 30), rel('RAJ', 20)]],
    ['modern', 'Modernizace armády', 35, ['arm'], [stock('pusky', 800), xp('land', 10)]],
  ] },
  MON: { eco: ['Stepní kolektivy', 'Stáda a nová města.'], army: 'Mongolská jízda', x: [
    ['horse', 'Jezdecké divize', 35, ['army'], [xp('land', 20), man(0.003)]],
    ['sov', 'Spojenectví se severem', 35, ['unity'], [rel('SOV', 50)]],
    ['steppe', 'Válka ve stepi', 35, ['horse'], [boost('auta2'), boost('inf_zima', 0.3)]],
    ['wool', 'Vlna a kůže', 35, ['eco'], [civ()]],
  ] },
  TAN: { eco: ['Pastevecké družstvo', 'Malá země v horách Sajanu.'], army: 'Tuvinská jízda', x: [
    ['gold', 'Zlato z řek', 35, ['eco'], [pp(20), civ()]],
    ['sov', 'Ochrana ze severu', 35, ['unity'], [rel('SOV', 40)]],
    ['taiga', 'Lovci z tajgy', 35, ['army'], [boost('inf_zima', 0.4), man(0.002)]],
    ['school', 'Nové písmo', 35, ['sci'], [stab(0.04), boost('vyz_univ', 0.2)]],
  ] },
  SIA: { eco: ['Modernizace Siamu', 'Jediná nezávislá země jihovýchodní Asie.'], army: 'Královská armáda', x: [
    ['rice', 'Rýžový vývoz', 35, ['eco'], [civ(), law('trd', 'free')]],
    ['tin', 'Cín a teak', 35, ['eco'], [boost('tez2', 0.3)], { mod: { extract: 0.04 } }],
    ['navy', 'Královské loďstvo', 35, ['arm'], [boost('dd2', 0.3), boost('ss2', 0.3)]],
    ['jungle', 'Válka v džungli', 35, ['army'], [boost('inf_komando', 0.4)]],
    ['japan', 'Přátelství s Japonskem', 35, ['unity'], [rel('JAP', 40)], { excl: ['sia_west'] }],
    ['west', 'Přátelství se Západem', 35, ['unity'], [rel('ENG', 30), rel('FRA', 30)], { excl: ['sia_japan'] }],
  ] },
  AFG: { eco: ['Kábulské dílny', 'První továrny v horách.'], army: 'Kmenové milice', x: [
    ['tribes', 'Smlouvy s kmeny', 35, ['unity'], [stab(0.06), man(0.004)]],
    ['mount', 'Horská válka', 35, ['army'], [boost('inf_hory', 0.5)]],
    ['road', 'Silnice přes průsmyky', 35, ['rail'], [infra()]],
    ['neutral', 'Nárazníkový stát', 35, ['trade'], [rel('ENG', 20), rel('SOV', 20), pp(30)]],
  ] },
  RAJ: { eco: ['Indický průmysl', 'Bavlna, juta a ocel pro impérium.'], army: 'Indická armáda', arm: 'Zbrojovky v Bengálsku', x: [
    ['steel', 'Ocelárny Tata', 70, ['arm'], [mil(), boost('ind_mech', 0.3)]],
    ['jute', 'Juta a bavlna', 35, ['eco'], [civ(), law('trd', 'free')]],
    ['volunteer', 'Největší dobrovolnická armáda', 35, ['army'], [man(0.005), stock('pusky', 3000)], { info: 'Miliony dobrovolníků ze všech provincií.' }],
    ['frontier', 'Severozápadní hranice', 35, ['army'], [boost('inf_hory', 0.4), xp('land', 15)]],
    ['jungle', 'Válka v Barmě', 35, ['staff'], [boost('inf_komando', 0.4), boost('sup_vzduch', 0.3)]],
    ['ally', 'Věrnost koruně', 35, ['unity'], [rel('ENG', 30), stab(0.03)]],
  ] },
  NEP: { eco: ['Himálajské průsmyky', 'Malé království mezi velmocemi.'], army: 'Gurkhské pluky', x: [
    ['gurkha', 'Pověstní horalé', 35, ['army'], [boost('inf_hory', 0.5), spirit('f_elitni_jednotky')]],
    ['ally', 'Spojenectví s Indií', 35, ['unity'], [rel('ENG', 30), rel('RAJ', 30)]],
    ['valley', 'Údolí Káthmándú', 35, ['eco'], [civ(), stab(0.04)]],
  ] },
  YEM: { eco: ['Imámovy přístavy', 'Káva z Mochy a kadidlo.'], army: 'Kmenová vojska', x: [
    ['coffee', 'Moka', 35, ['eco'], [civ(), pp(20)]],
    ['mount', 'Horské pevnosti', 35, ['army'], [boost('inf_hory', 0.4)]],
    ['tribes', 'Věrnost kmenů', 35, ['unity'], [stab(0.05), man(0.003)]],
    ['ally', 'Arabská spolupráce', 35, ['trade'], [rel('SAU', 30), rel('ITA', 15)]],
  ] },
  PHI: { eco: ['Společenství Filipín', 'Cesta k plné samostatnosti.'], army: 'Filipínská armáda', x: [
    ['defense', 'Plán národní obrany', 35, ['army'], [man(0.004), stock('pusky', 1500)], { info: 'Záložní divize v každé provincii.' }],
    ['scouts', 'Filipínští zvědové', 35, ['defense'], [xp('land', 20), boost('inf_komando', 0.3)]],
    ['sugar', 'Cukr a kopra', 35, ['eco'], [civ()]],
    ['ally', 'Opora za oceánem', 35, ['unity'], [rel('USA', 40)]],
    ['corregidor', 'Pevnost v zátoce', 35, ['staff'], [boost('inf_zak', 0.4), bld('radar', 1)]],
  ] },
  AST: { eco: ['Australský průmysl', 'Ocel z Newcastlu, vlna z vnitrozemí.'], army: 'Australské císařské síly', arm: 'Muniční továrny', x: [
    ['steel', 'Ocelárny na pobřeží', 70, ['arm'], [mil(), boost('tez1', 0.4)], { mod: { extract: 0.04 } }],
    ['aircraft', 'Domácí letadla', 35, ['arm'], [boost('sti2'), bld('afb', 2)]],
    ['navy', 'Královské australské loďstvo', 35, ['rail'], [boost('ca2', 0.3), bld('dok', 1), xp('sea', 15)]],
    ['desert', 'Pouštní krysy', 35, ['army'], [xp('land', 20), boost('auta2')]],
    ['jungle', 'Válka na Nové Guineji', 35, ['desert'], [boost('inf_komando', 0.4)]],
    ['ally', 'Tichomořská spolupráce', 35, ['unity'], [rel('NZL', 30), rel('USA', 30)]],
  ] },
  NZL: { eco: ['Vlnařství a mléko', 'Ostrovy na konci světa.'], army: 'Novozélandské síly', x: [
    ['dairy', 'Mléčné družstvo', 35, ['eco'], [civ(), law('trd', 'free')]],
    ['div', 'Expediční divize', 35, ['army'], [xp('land', 20), man(0.003)]],
    ['navy', 'Novozélandská eskadra', 35, ['rail'], [boost('ca2', 0.3), xp('sea', 10)]],
    ['ally', 'Bratrství s Austrálií', 35, ['unity'], [rel('AST', 40), rel('ENG', 20)]],
  ] },
};
