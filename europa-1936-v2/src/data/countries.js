// Země hry (tagy odpovídají src/data/world.json): popis pro výběr země, vlajka (jednoduché geometrické vrstvy), vůdce a výchozí ideologie v lednu 1936.
// Texty a vlajky jsou vlastní (zjednodušené; bez státních znaků a bez symbolů extremistických režimů).
//
// Vlajka = vrstvy v plátně 30×20: ['r', barva, x, y, w, h] obdélník, ['c', barva, cx, cy, r] kruh, ['p', barva, 'x,y x,y …'] mnohoúhelník,
// ['s', barva, cx, cy, r] pěticípá hvězda, ['l', barva, šířka, x1, y1, x2, y2] čára.

const H3 = (a, b, c) => [['r', a, 0, 0, 30, 6.67], ['r', b, 0, 6.67, 30, 6.66], ['r', c, 0, 13.33, 30, 6.67]];
const V3 = (a, b, c) => [['r', a, 0, 0, 10, 20], ['r', b, 10, 0, 10, 20], ['r', c, 20, 0, 10, 20]];
const nordic = (bg, cross, inner) => {
  const l = [['r', bg, 0, 0, 30, 20], ['r', cross, 8, 0, 5, 20], ['r', cross, 0, 7.5, 30, 5]];
  if (inner) l.push(['r', inner, 9.2, 0, 2.6, 20], ['r', inner, 0, 8.7, 30, 2.6]);
  return l;
};

export const IDEOLOGIES = {
  democracy: { name: 'Demokracie', color: '#4a7fc1' },
  neutrality: { name: 'Neutralita', color: '#9a9a8c' },
  communism: { name: 'Komunismus', color: '#c0392b' },
  fascism: { name: 'Fašismus', color: '#7a5a3a' },
};

// tier: 1 velmoc, 2 regionální mocnost, 3 malý stát; diff: obtížnost pro hráče 1–5
export const COUNTRIES = {
  GER: {
    leader: 'Adolf Hitler', government: 'Diktatura jedné strany', ideology: 'fascism', tier: 1, diff: 3,
    blurb: 'Hospodářsky oživená, ale diplomaticky osamělá velmoc. Versailleská pouta povolují: armáda se přezbrojuje a Porýní čeká na vojáky.',
    flag: H3('#111111', '#f2f2f2', '#c8102e'),
  },
  FRA: {
    leader: 'Albert Lebrun', government: 'Třetí republika', ideology: 'democracy', tier: 1, diff: 2,
    blurb: 'Největší pozemní armáda Evropy a rozsáhlé državy v zámoří, ale rozhádaná politika a obranná doktrína. Maginotova linie nechrání všechno.',
    flag: V3('#0055a4', '#f2f2f2', '#ef4135'),
  },
  ENG: {
    leader: 'Stanley Baldwin', government: 'Konstituční monarchie', ideology: 'democracy', tier: 1, diff: 1,
    blurb: 'Říše na čtyřech kontinentech, loďstvo bez soupeře a slabá pozemní armáda. Londýn se válce vyhýbá, dokud to jde.',
    flag: [['r', '#1f3a7a', 0, 0, 30, 20], ['l', '#f2f2f2', 4, 0, 0, 30, 20], ['l', '#f2f2f2', 4, 30, 0, 0, 20], ['l', '#c8102e', 1.4, 0, 0, 30, 20], ['l', '#c8102e', 1.4, 30, 0, 0, 20],
      ['r', '#f2f2f2', 12, 0, 6, 20], ['r', '#f2f2f2', 0, 7, 30, 6], ['r', '#c8102e', 13.2, 0, 3.6, 20], ['r', '#c8102e', 0, 8.2, 30, 3.6]],
  },
  IRE: {
    leader: 'Éamon de Valera', government: 'Svobodný stát', ideology: 'democracy', tier: 3, diff: 3,
    blurb: 'Mladý neutrální stát na kraji Evropy. Malá armáda, spor s Londýnem o přístavy a sen o sjednocení ostrova.',
    flag: V3('#169b62', '#f2f2f2', '#ff883e'),
  },
  HOL: {
    leader: 'Hendrikus Colijn', government: 'Konstituční monarchie', ideology: 'democracy', tier: 3, diff: 3,
    blurb: 'Bohatý obchodní národ s koloniemi a tradicí neutrality. Obrana stojí na vodě, hrázích a naději.',
    flag: H3('#ae1c28', '#f2f2f2', '#21468b'),
  },
  BEL: {
    leader: 'Paul van Zeeland', government: 'Konstituční monarchie', ideology: 'democracy', tier: 3, diff: 3,
    blurb: 'Neutrální země, která už jednou zaplatila za to, že leží na cestě. Pevnosti na hranicích mají zadržet první nápor.',
    flag: V3('#111111', '#fdda24', '#ef3340'),
  },
  LUX: {
    leader: 'Joseph Bech', government: 'Velkovévodství', ideology: 'democracy', tier: 3, diff: 5,
    blurb: 'Maličké velkovévodství bez skutečné armády. Přežití závisí na ohledech velkých sousedů.',
    flag: H3('#ed2939', '#f2f2f2', '#00a1de'),
  },
  SWI: {
    leader: 'Federální rada', government: 'Spolková republika', ideology: 'neutrality', tier: 3, diff: 2,
    blurb: 'Alpská pevnost s všeobecnou brannou povinností. Nikdo nechce dobývat hory, ale všichni by rádi jejich průsmyky.',
    flag: [['r', '#d52b1e', 0, 0, 30, 20], ['r', '#f2f2f2', 13, 4, 4, 12], ['r', '#f2f2f2', 8, 8, 14, 4]],
  },
  AUS: {
    leader: 'Kurt Schuschnigg', government: 'Stavovský stát', ideology: 'neutrality', tier: 3, diff: 4,
    blurb: 'Zbytek někdejší monarchie, tísněný mezi Berlínem a Římem. Dokud drží Itálie ochrannou ruku, drží se i Vídeň.',
    flag: H3('#ed2939', '#f2f2f2', '#ed2939'),
  },
  ITA: {
    leader: 'Benito Mussolini', government: 'Fašistický režim', ideology: 'fascism', tier: 1, diff: 2,
    blurb: 'Itálie sní o nové římské říši. Válka v Habeši ji sblížila s Berlínem, ale odcizila Londýn a Paříž.',
    flag: V3('#009246', '#f2f2f2', '#ce2b37'),
  },
  SPR: {
    leader: 'Manuel Azaña', government: 'Druhá republika', ideology: 'democracy', tier: 2, diff: 4,
    blurb: 'Země na prahu občanské války. Vlády se střídají, generálové pletou spiknutí a společnost se láme na dva tábory.',
    flag: H3('#c60b1e', '#f1bf00', '#6b2c91'),
  },
  POR: {
    leader: 'António Salazar', government: 'Nový stát', ideology: 'neutrality', tier: 3, diff: 3,
    blurb: 'Autoritářský stát se nejstarším spojenectvím v Evropě. Chudý a neutrální, s državami daleko za mořem.',
    flag: [['r', '#0a6b2f', 0, 0, 12, 20], ['r', '#d4202a', 12, 0, 18, 20], ['c', '#f2c200', 12, 10, 4]],
  },
  DEN: {
    leader: 'Thorvald Stauning', government: 'Konstituční monarchie', ideology: 'democracy', tier: 3, diff: 4,
    blurb: 'Malé království bez naděje ubránit se silnému sousedovi. Obchoduje se všemi a doufá, že si ho nikdo nevšimne.',
    flag: [['r', '#c8102e', 0, 0, 30, 20], ['r', '#f2f2f2', 9, 0, 3.5, 20], ['r', '#f2f2f2', 0, 8.25, 30, 3.5]],
  },
  NOR: {
    leader: 'Johan Nygaardsvold', government: 'Konstituční monarchie', ideology: 'democracy', tier: 3, diff: 3,
    blurb: 'Neutrální námořní národ s dlouhým pobřežím. Přístavy a švédská ruda táhnou přes Narvik pozornost velmocí.',
    flag: [['r', '#c8102e', 0, 0, 30, 20], ['r', '#f2f2f2', 8, 0, 5.5, 20], ['r', '#f2f2f2', 0, 7.25, 30, 5.5], ['r', '#003087', 9.4, 0, 2.7, 20], ['r', '#003087', 0, 8.65, 30, 2.7]],
  },
  SWE: {
    leader: 'Per Albin Hansson', government: 'Konstituční monarchie', ideology: 'democracy', tier: 3, diff: 2,
    blurb: 'Průmyslová a neutrální země s dobrou armádou a železnou rudou, kterou potřebuje celá Evropa.',
    flag: nordic('#006aa7', '#fecc00'),
  },
  FIN: {
    leader: 'Pehr Evind Svinhufvud', government: 'Republika', ideology: 'democracy', tier: 3, diff: 3,
    blurb: 'Mladá republika s nekonečnou hranicí vůči SSSR. Armáda je malá, ale odhodlaná, a zima je na její straně.',
    flag: nordic('#f2f2f2', '#003580'),
  },
  EST: {
    leader: 'Konstantin Päts', government: 'Autoritářská republika', ideology: 'neutrality', tier: 3, diff: 4,
    blurb: 'Malá pobaltská republika mezi dvěma kolosy. Neutralita je spíš přání než plán.',
    flag: H3('#0072ce', '#111111', '#f2f2f2'),
  },
  LAT: {
    leader: 'Kārlis Ulmanis', government: 'Autoritářská republika', ideology: 'neutrality', tier: 3, diff: 4,
    blurb: 'Pobaltský stát s přísnou vládou a velkým východním sousedem. Přístavy a tranzit jsou jeho největší bohatství.',
    flag: [['r', '#9e3039', 0, 0, 30, 8], ['r', '#f2f2f2', 0, 8, 30, 4], ['r', '#9e3039', 0, 12, 30, 8]],
  },
  LIT: {
    leader: 'Antanas Smetona', government: 'Autoritářská republika', ideology: 'neutrality', tier: 3, diff: 4,
    blurb: 'Země, která neuznává ztrátu Vilniusu. Napjatá vůči Polsku, obklopená většími sousedy.',
    flag: H3('#fdb913', '#006a44', '#c1272d'),
  },
  POL: {
    leader: 'Ignacy Mościcki', government: 'Sanační režim', ideology: 'neutrality', tier: 2, diff: 4,
    blurb: 'Velká země mezi Německem a Sovětským svazem. Početná armáda, ale zastaralá výzbroj, a spojenci, kteří jsou daleko.',
    flag: [['r', '#f2f2f2', 0, 0, 30, 10], ['r', '#dc143c', 0, 10, 30, 10]],
  },
  CZE: {
    leader: 'Edvard Beneš', government: 'První republika', ideology: 'democracy', tier: 2, diff: 5,
    blurb: 'Poslední demokracie střední Evropy: moderní průmysl, opevněné hory a spojenci, kteří jsou daleko – na rozdíl od sousedů.',
    flag: [['r', '#f2f2f2', 0, 0, 30, 10], ['r', '#d7141a', 0, 10, 30, 10], ['p', '#11457e', '0,0 15,10 0,20']],
  },
  HUN: {
    leader: 'Miklós Horthy', government: 'Regentství', ideology: 'neutrality', tier: 3, diff: 3,
    blurb: 'Království bez krále a se sny o ztracených územích. Omezená armáda a těžká volba mezi Berlínem a Římem.',
    flag: H3('#ce2939', '#f2f2f2', '#477050'),
  },
  ROM: {
    leader: 'Karel II.', government: 'Konstituční monarchie', ideology: 'neutrality', tier: 2, diff: 3,
    blurb: 'Ropná velmoc malých rozměrů, zvětšená o nové území a obklopená sousedy, kteří by si je rádi vzali zpět.',
    flag: V3('#002b7f', '#fcd116', '#ce1126'),
  },
  YUG: {
    leader: 'Princ Pavel', government: 'Regentství', ideology: 'neutrality', tier: 2, diff: 3,
    blurb: 'Království Srbů, Chorvatů a Slovinců s vnitřním napětím. Silná armáda, ale rozdělená politika.',
    flag: H3('#0c4076', '#f2f2f2', '#c6363c'),
  },
  BUL: {
    leader: 'Boris III.', government: 'Carství', ideology: 'neutrality', tier: 3, diff: 3,
    blurb: 'Bulharsko chce revizi mírových smluv. Malá armáda, silné city a nedůvěra sousedů.',
    flag: H3('#f2f2f2', '#00966e', '#d62612'),
  },
  GRE: {
    leader: 'Jiří II.', government: 'Konstituční monarchie', ideology: 'democracy', tier: 3, diff: 3,
    blurb: 'Řecko hledá klid po letech převratů. Silné námořní tradice, nejistá armáda a dlouhé pobřeží k obraně.',
    flag: [['r', '#0d5eaf', 0, 0, 30, 20], ['r', '#f2f2f2', 11, 2.2, 19, 2.2], ['r', '#f2f2f2', 11, 6.7, 19, 2.2], ['r', '#f2f2f2', 0, 11.1, 30, 2.2], ['r', '#f2f2f2', 0, 15.6, 30, 2.2],
      ['r', '#0d5eaf', 0, 0, 11, 11], ['r', '#f2f2f2', 4.5, 0, 2, 11], ['r', '#f2f2f2', 0, 4.5, 11, 2]],
  },
  ALB: {
    leader: 'Zogu I.', government: 'Království', ideology: 'neutrality', tier: 3, diff: 5,
    blurb: 'Chudé království pod italským vlivem. Hory, rodové svazky a dluhy u souseda za mořem.',
    flag: [['r', '#e41e20', 0, 0, 30, 20], ['p', '#111111', '15,4 20,10 15,16 10,10']],
  },
  TUR: {
    leader: 'Mustafa Kemal Atatürk', government: 'Republika', ideology: 'neutrality', tier: 2, diff: 3,
    blurb: 'Modernizovaná republika, která drží průlivy. Neutrální, ale s pozorným pohledem na všechny sousedy.',
    flag: [['r', '#e30a17', 0, 0, 30, 20], ['c', '#f2f2f2', 11, 10, 5.2], ['c', '#e30a17', 12.6, 10, 4.2], ['s', '#f2f2f2', 17, 10, 2.4]],
  },
  ICE: {
    leader: 'Hermann Jónasson', government: 'Království pod dánskou korunou', ideology: 'democracy', tier: 3, diff: 5,
    blurb: 'Ostrov uprostřed Atlantiku bez vlastní armády. Strategický pro každého, kdo chce vládnout moři.',
    flag: [['r', '#02529c', 0, 0, 30, 20], ['r', '#f2f2f2', 7.5, 0, 5, 20], ['r', '#f2f2f2', 0, 7.5, 30, 5], ['r', '#dc1e35', 8.7, 0, 2.6, 20], ['r', '#dc1e35', 0, 8.7, 30, 2.6]],
  },
  SOV: {
    leader: 'Josif Stalin', government: 'Diktatura jedné strany', ideology: 'communism', tier: 1, diff: 3,
    blurb: 'Největší země světa s pětiletkami a obrovskou armádou. Čistky ji ale oslabují zevnitř.',
    flag: [['r', '#c8102e', 0, 0, 30, 20], ['s', '#f2c200', 6, 6, 3.2]],
  },
  EGY: {
    leader: 'Farúk I.', government: 'Království', ideology: 'neutrality', tier: 3, diff: 4,
    blurb: 'Formálně nezávislé království pod britským dohledem. Suezský průplav je klíčem k celé říši.',
    flag: [['r', '#0e8a3b', 0, 0, 30, 20], ['c', '#f2f2f2', 10, 10, 6.5], ['c', '#0e8a3b', 12, 10, 5.4], ['s', '#f2f2f2', 17, 5.5, 1.7], ['s', '#f2f2f2', 19, 10, 1.7], ['s', '#f2f2f2', 17, 14.5, 1.7]],
  },
  IRQ: {
    leader: 'Ghází I.', government: 'Království', ideology: 'neutrality', tier: 3, diff: 4,
    blurb: 'Mladý arabský stát s ropnými poli a britskými základnami. Kmenová politika a spory na hranicích.',
    flag: [...H3('#111111', '#f2f2f2', '#0e8a3b'), ['p', '#c8102e', '0,0 12,10 0,20'], ['s', '#f2f2f2', 4, 6.5, 1.5], ['s', '#f2f2f2', 4, 13.5, 1.5]],
  },
  PER: {
    leader: 'Réza Šáh Pahlaví', government: 'Císařství', ideology: 'neutrality', tier: 3, diff: 3,
    blurb: 'Šáh modernizuje zemi a hledá protiváhu Británii i Rusku. Ropa a Transíránská dráha.',
    flag: [...H3('#239f40', '#f2f2f2', '#da0000'), ['c', '#e0a800', 15, 10, 2.6]],
  },
  SAU: {
    leader: 'Abd al-Azíz ibn Saúd', government: 'Království', ideology: 'neutrality', tier: 3, diff: 3,
    blurb: 'Pouštní království s rostoucím významem ropy. Slabá armáda a vzdálenosti jsou jeho ochranou.',
    flag: [['r', '#006c35', 0, 0, 30, 20], ['r', '#f2f2f2', 6, 6, 18, 1.4], ['r', '#f2f2f2', 8, 9, 14, 1.4], ['r', '#f2f2f2', 6, 14, 18, 1]],
  },
  // ---- rezervní země (M69): nemají žádné státy, dokud nevzniknou za hry (občanská válka, uvolnění národů); ve výběru země se nenabízejí ----
  NSP: {
    dyn: true, leader: 'Francisco Franco', government: 'Vojenské povstání', ideology: 'fascism', tier: 2, diff: 4,
    blurb: 'Povstalecká část španělské armády a konzervativní venkov. Tvrdé vedení, podpora z Berlína a Říma a boj o každé město.',
    flag: [['r', '#b3342e', 0, 0, 30, 5], ['r', '#e5b73b', 0, 5, 30, 10], ['r', '#b3342e', 0, 15, 30, 5]],
  },
  VIC: {
    dyn: true, leader: 'Philippe Pétain', government: 'Autoritářský stát', ideology: 'neutrality', tier: 2, diff: 5,
    blurb: 'Zbytek poražené Francie bez okupované severní poloviny. Opatrná spolupráce s vítězem a tichý odpor na venkově.',
    flag: V3('#46629a', '#e8e6df', '#b8504f'),
  },
  SLO: {
    dyn: true, leader: 'Jozef Tiso', government: 'Klerikální stát', ideology: 'fascism', tier: 3, diff: 5,
    blurb: 'Malý stát na horním Dunaji, který vznikl z rozpadu většího souseda a žije z přízně silného patrona.',
    flag: H3('#f2f2f2', '#0b4ea2', '#ee1c25'),
  },
  CRO: {
    dyn: true, leader: 'Ante Pavelić', government: 'Autoritářský stát', ideology: 'fascism', tier: 3, diff: 5,
    blurb: 'Nově vzniklý stát na troskách Jugoslávie. Slabá správa, vnitřní spory a závislost na patronech.',
    flag: H3('#c8102e', '#f2f2f2', '#1f4fa0'),
  },
  OMA: {
    leader: 'Said bin Taimur', government: 'Sultanát', ideology: 'neutrality', tier: 3, diff: 4,
    blurb: 'Sultanát na kraji Arábie v dlouhé závislosti na Británii. Pobřeží, hory a především klid.',
    flag: [['r', '#db161b', 0, 0, 30, 20], ['r', '#f2f2f2', 0, 0, 30, 2.4], ['r', '#0e8a3b', 0, 17.6, 30, 2.4]],
  },
};

export const TIER_NAMES = { 1: 'Velmoc', 2: 'Regionální mocnost', 3: 'Malý stát' };
export const DIFF_NAMES = ['', 'Nejlehčí', 'Lehká', 'Střední', 'Těžká', 'Peklo'];
