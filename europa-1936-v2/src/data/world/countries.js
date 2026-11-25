// W1 („Dark Times“): země mimo Evropu – popis, vlajka, počáteční průmysl, armáda, loďstvo a vztahy v lednu 1936.
// Vlastní odhady a zjednodušené vlajky (bez státních znaků a symbolů extremistických režimů); jména velitelů vymyšlená.

const H3 = (a, b, c) => [['r', a, 0, 0, 30, 6.67], ['r', b, 0, 6.67, 30, 6.66], ['r', c, 0, 13.33, 30, 6.67]];
const V3 = (a, b, c) => [['r', a, 0, 0, 10, 20], ['r', b, 10, 0, 10, 20], ['r', c, 20, 0, 10, 20]];
const H2 = (a, b) => [['r', a, 0, 0, 30, 10], ['r', b, 0, 10, 30, 10]];
const canton = (bg, cn, star) => [['r', bg, 0, 0, 30, 20], ['r', cn, 0, 0, 13, 10], ...(star ? [['s', star, 6.5, 5, 2.8]] : [])];
const stripes = (a, b, n) => Array.from({ length: n }, (_, i) => ['r', i % 2 ? b : a, 0, (20 / n) * i, 30, 20 / n + 0.05]);
const disc = (bg, c, r = 5.5) => [['r', bg, 0, 0, 30, 20], ['c', c, 15, 10, r]];

export const COUNTRIES_WORLD = {
  USA: { leader: 'Franklin D. Roosevelt', government: 'Federální republika', ideology: 'democracy', tier: 1, diff: 1,
    blurb: 'Obrovská průmyslová síla, která se ještě vzpamatovává z hospodářské krize. Veřejnost chce zůstat stranou evropských sporů.',
    flag: [...stripes('#b22234', '#f2f2f2', 7), ['r', '#3c3b6e', 0, 0, 13, 10.8], ['s', '#f2f2f2', 6.5, 5.4, 2.6]] },
  CAN: { leader: 'W. L. Mackenzie King', government: 'Britské dominium', ideology: 'democracy', tier: 2, diff: 2,
    blurb: 'Rozlehlé dominium s malou armádou a velkými surovinovými zdroji. V případě války stojí po boku Británie.',
    flag: canton('#c8102e', '#012169') },
  MEX: { leader: 'Lázaro Cárdenas', government: 'Revoluční republika', ideology: 'neutrality', tier: 2, diff: 3,
    blurb: 'Republika po letech revoluce. Pozemková reforma, ropa v rukou cizinců a soused, se kterým je třeba vycházet.',
    flag: V3('#006847', '#f2f2f2', '#ce1126') },
  GUA: { leader: 'Jorge Ubico', government: 'Diktatura', ideology: 'neutrality', tier: 3, diff: 4, blurb: 'Banánová republika pod tvrdou rukou generála.', flag: V3('#4997d0', '#f2f2f2', '#4997d0') },
  HON: { leader: 'Tiburcio Carías', government: 'Diktatura', ideology: 'neutrality', tier: 3, diff: 4, blurb: 'Hornatá země ovládaná ovocnými společnostmi.', flag: H3('#0073cf', '#f2f2f2', '#0073cf') },
  ELS: { leader: 'Maximiliano Martínez', government: 'Vojenská vláda', ideology: 'neutrality', tier: 3, diff: 4, blurb: 'Nejmenší a nejlidnatější země Střední Ameriky.', flag: H3('#0f47af', '#f2f2f2', '#0f47af') },
  NIC: { leader: 'Juan Bautista Sacasa', government: 'Republika', ideology: 'neutrality', tier: 3, diff: 4, blurb: 'Země jezer a sopek, kde rozhoduje velitel národní gardy.', flag: H3('#0067c6', '#f2f2f2', '#0067c6') },
  COS: { leader: 'Ricardo Jiménez', government: 'Republika', ideology: 'democracy', tier: 3, diff: 4, blurb: 'Klidná kávová republika bez velkých ambicí.', flag: [...H3('#002b7f', '#f2f2f2', '#002b7f'), ['r', '#ce1126', 0, 7.5, 30, 5]] },
  PAN: { leader: 'Harmodio Arias', government: 'Republika', ideology: 'democracy', tier: 3, diff: 4, blurb: 'Malá republika, jejímž středem vede průplav spojující oceány.', flag: [['r', '#f2f2f2', 0, 0, 30, 20], ['r', '#d21034', 15, 0, 15, 10], ['r', '#005293', 0, 10, 15, 10]] },
  CUB: { leader: 'José Barnet', government: 'Republika', ideology: 'neutrality', tier: 3, diff: 4, blurb: 'Cukrový ostrov, kde skutečnou moc drží armáda.', flag: [...stripes('#002a8f', '#f2f2f2', 5), ['p', '#cf142b', '0,0 12,10 0,20']] },
  HAI: { leader: 'Sténio Vincent', government: 'Republika', ideology: 'neutrality', tier: 3, diff: 5, blurb: 'Chudá republika, ze které nedávno odešla americká okupace.', flag: H2('#00209f', '#d21034') },
  DOM: { leader: 'Rafael Trujillo', government: 'Diktatura', ideology: 'neutrality', tier: 3, diff: 5, blurb: 'Ostrovní stát pod osobní vládou generála.', flag: [['r', '#002d62', 0, 0, 15, 10], ['r', '#ce1126', 15, 0, 15, 10], ['r', '#ce1126', 0, 10, 15, 10], ['r', '#002d62', 15, 10, 15, 10], ['r', '#f2f2f2', 13, 0, 4, 20], ['r', '#f2f2f2', 0, 8, 30, 4]] },
  COL: { leader: 'Alfonso López Pumarejo', government: 'Republika', ideology: 'democracy', tier: 3, diff: 4, blurb: 'Andská republika s kávou, ropou a liberálními reformami.', flag: [['r', '#fcd116', 0, 0, 30, 10], ['r', '#003893', 0, 10, 30, 5], ['r', '#ce1126', 0, 15, 30, 5]] },
  VEN: { leader: 'Eleazar López Contreras', government: 'Přechodná vláda', ideology: 'neutrality', tier: 3, diff: 4, blurb: 'Země, kterou ropa proměnila za pouhých pár let.', flag: H3('#ffcc00', '#00247d', '#cf142b') },
  ECU: { leader: 'Federico Páez', government: 'Diktatura', ideology: 'neutrality', tier: 3, diff: 5, blurb: 'Malá andská země ve sporu s jižním sousedem o Amazonii.', flag: [['r', '#ffdd00', 0, 0, 30, 10], ['r', '#034ea2', 0, 10, 30, 5], ['r', '#ed1c24', 0, 15, 30, 5]] },
  PRU: { leader: 'Óscar Benavides', government: 'Vojenská vláda', ideology: 'neutrality', tier: 3, diff: 4, blurb: 'Starobylá země And s vojenskou vládou a sporem o hranice.', flag: V3('#d91023', '#f2f2f2', '#d91023') },
  BOL: { leader: 'José Luis Tejada Sorzano', government: 'Republika', ideology: 'neutrality', tier: 3, diff: 5, blurb: 'Vnitrozemská republika vyčerpaná prohranou válkou o Chaco.', flag: H3('#d52b1e', '#f9e300', '#007934') },
  CHL: { leader: 'Arturo Alessandri', government: 'Republika', ideology: 'democracy', tier: 3, diff: 4, blurb: 'Dlouhá úzká země mezi Andami a oceánem, bohatá na měď a ledek.', flag: [['r', '#f2f2f2', 0, 0, 30, 10], ['r', '#d52b1e', 0, 10, 30, 10], ['r', '#0039a6', 0, 0, 10, 10], ['s', '#f2f2f2', 5, 5, 2.5]] },
  ARG: { leader: 'Agustín P. Justo', government: 'Konzervativní republika', ideology: 'neutrality', tier: 2, diff: 3, blurb: 'Bohatá země pamp, obilí a hovězího, s ambicí vést kontinent.', flag: H3('#74acdf', '#f2f2f2', '#74acdf') },
  URG: { leader: 'Gabriel Terra', government: 'Autoritářská republika', ideology: 'neutrality', tier: 3, diff: 4, blurb: 'Malá prosperující republika u ústí La Platy.', flag: [...stripes('#f2f2f2', '#0038a8', 9), ['r', '#f2f2f2', 0, 0, 11, 11], ['c', '#fcd116', 5.5, 5.5, 3]] },
  PAR: { leader: 'Eusebio Ayala', government: 'Republika', ideology: 'neutrality', tier: 3, diff: 5, blurb: 'Vítěz války o Chaco, chudý a nestabilní.', flag: H3('#d52b1e', '#f2f2f2', '#0038a8') },
  BRA: { leader: 'Getúlio Vargas', government: 'Prezidentský režim', ideology: 'neutrality', tier: 2, diff: 3, blurb: 'Kontinentální obr s kávou, gumou a pomalu rostoucím průmyslem.', flag: [['r', '#009c3b', 0, 0, 30, 20], ['p', '#ffdf00', '15,2 28,10 15,18 2,10'], ['c', '#002776', 15, 10, 4.5]] },
  ETH: { leader: 'Haile Selassie', government: 'Císařství', ideology: 'neutrality', tier: 3, diff: 5, blurb: 'Starobylé císařství, které se brání italské invazi s pušperky a odvahou.', flag: H3('#078930', '#fcdd09', '#da121a') },
  LBR: { leader: 'Edwin Barclay', government: 'Republika', ideology: 'neutrality', tier: 3, diff: 5, blurb: 'Jedna ze dvou nezávislých zemí Afriky, závislá na kaučukové společnosti.', flag: [...stripes('#bf0a30', '#f2f2f2', 11), ['r', '#002868', 0, 0, 9, 9.1], ['s', '#f2f2f2', 4.5, 4.5, 2.5]] },
  SAF: { leader: 'J. B. M. Hertzog', government: 'Britské dominium', ideology: 'democracy', tier: 2, diff: 3, blurb: 'Dominium zlata a diamantů, rozdělené spory mezi Búry a Brity.', flag: H3('#ff7f00', '#f2f2f2', '#0a3a8c') },
  JAP: { leader: 'Okada Keisuke', government: 'Císařství', ideology: 'fascism', tier: 1, diff: 3,
    blurb: 'Ostrovní císařství s mocným loďstvem a armádou, která jedná na vlastní pěst. Mandžusko už ovládá, Čína láká.',
    flag: disc('#f2f2f2', '#bc002d', 6) },
  MAN: { leader: 'Pchu-i', government: 'Loutkové císařství', ideology: 'fascism', tier: 3, diff: 4, blurb: 'Nové císařství na severovýchodě Číny, ve skutečnosti řízené japonskou armádou.',
    flag: [['r', '#f2c200', 0, 0, 30, 20], ['r', '#d01c1f', 0, 0, 10, 1.8], ['r', '#0b3c8c', 0, 1.8, 10, 1.8], ['r', '#f2f2f2', 0, 3.6, 10, 1.8], ['r', '#111111', 0, 5.4, 10, 1.8]] },
  CHI: { leader: 'Čankajšek', government: 'Národní vláda', ideology: 'neutrality', tier: 2, diff: 4,
    blurb: 'Obrovská, ale roztříštěná země. Vláda bojuje s komunisty, s regionálními generály i s japonskými nároky.',
    flag: [['r', '#d00a15', 0, 0, 30, 20], ['r', '#1a3a9a', 0, 0, 15, 10], ['c', '#f2f2f2', 7.5, 5, 2.8]] },
  PRC: { leader: 'Mao Ce-tung', government: 'Sovětská republika', ideology: 'communism', tier: 3, diff: 5, blurb: 'Komunisté po Dlouhém pochodu v horách severního Šen-si.', flag: [['r', '#c8102e', 0, 0, 30, 20], ['s', '#ffde00', 6, 5, 3]] },
  SIK: { leader: 'Šeng Š’-cchaj', government: 'Válečný vládce', ideology: 'communism', tier: 3, diff: 5, blurb: 'Pouštní provincie na hedvábné stezce pod sovětským vlivem.', flag: [['r', '#b03a2e', 0, 0, 30, 20], ['s', '#f2c200', 15, 10, 4]] },
  TIB: { leader: 'Regent Reting', government: 'Teokracie', ideology: 'neutrality', tier: 3, diff: 5, blurb: 'Horská teokracie na střeše světa, která si cení své samoty.', flag: [['r', '#bb1e25', 0, 0, 30, 20], ['p', '#1f3c94', '0,20 15,0 30,20'], ['c', '#f2f2f2', 15, 9, 3]] },
  MON: { leader: 'Pelžidijn Genden', government: 'Lidová republika', ideology: 'communism', tier: 3, diff: 5, blurb: 'Stepní lidová republika, satelit Sovětského svazu.', flag: V3('#c4272f', '#015197', '#c4272f') },
  TAN: { leader: 'Salčak Toka', government: 'Lidová republika', ideology: 'communism', tier: 3, diff: 5, blurb: 'Malá horská republika v sevření sovětského souseda.', flag: [['r', '#1f4e9a', 0, 0, 30, 20], ['p', '#f2c200', '0,0 12,10 0,20'], ['r', '#f2f2f2', 0, 8, 30, 4]] },
  SIA: { leader: 'Phraya Phahon', government: 'Konstituční monarchie', ideology: 'neutrality', tier: 3, diff: 4, blurb: 'Jediné nezávislé království jihovýchodní Asie mezi dvěma koloniálními říšemi.', flag: [['r', '#a51931', 0, 0, 30, 20], ['r', '#f2f2f2', 0, 3.3, 30, 13.4], ['r', '#2d2a4a', 0, 6.7, 30, 6.6]] },
  AFG: { leader: 'Muhammad Záhir Šáh', government: 'Království', ideology: 'neutrality', tier: 3, diff: 5, blurb: 'Hornaté království mezi britskou Indií a sovětskou Asií.', flag: V3('#111111', '#d32011', '#007a36') },
  RAJ: { leader: 'Markýz z Linlithgow', government: 'Britská Indie', ideology: 'democracy', tier: 2, diff: 3,
    blurb: 'Klenot britské koruny se stovkami milionů lidí. Hnutí za nezávislost sílí.',
    flag: [['r', '#c8102e', 0, 0, 30, 20], ['r', '#012169', 0, 0, 13, 10], ['c', '#f2c200', 21, 10, 3]] },
  NEP: { leader: 'Džuddha Šamšer', government: 'Království', ideology: 'neutrality', tier: 3, diff: 5, blurb: 'Himálajské království, odkud pocházejí slavní gurkhové.', flag: [['r', '#dc143c', 0, 0, 30, 20], ['c', '#f2f2f2', 10, 10, 3]] },
  YEM: { leader: 'Imám Jahja', government: 'Imamát', ideology: 'neutrality', tier: 3, diff: 5, blurb: 'Hornatý imamát na jihu Arábie, uzavřený před světem.', flag: [['r', '#c8102e', 0, 0, 30, 20], ['s', '#f2f2f2', 15, 10, 3]] },
  PHI: { leader: 'Manuel Quezon', government: 'Společenství', ideology: 'democracy', tier: 3, diff: 4, blurb: 'Souostroví na cestě k nezávislosti pod americkou ochranou.', flag: [['r', '#0038a8', 0, 0, 30, 10], ['r', '#ce1126', 0, 10, 30, 10], ['p', '#f2f2f2', '0,0 14,10 0,20'], ['c', '#fcd116', 4.5, 10, 2]] },
  AST: { leader: 'Joseph Lyons', government: 'Britské dominium', ideology: 'democracy', tier: 2, diff: 3, blurb: 'Rozlehlý kontinent s malým obyvatelstvem, daleko od Evropy, blízko Japonska.', flag: canton('#012169', '#c8102e', '#f2f2f2') },
  NZL: { leader: 'Michael Savage', government: 'Britské dominium', ideology: 'democracy', tier: 3, diff: 4, blurb: 'Ostrovní dominium na konci světa, věrné mateřské zemi.', flag: [...canton('#012169', '#c8102e'), ['s', '#cc142b', 22, 6, 1.6], ['s', '#cc142b', 25, 11, 1.6], ['s', '#cc142b', 20, 14, 1.6]] },
};

/** Počáteční průmysl (civ/mil továrny, těžba surovin za den). */
export const IND_WORLD = {
  USA: { civ: 50, mil: 8, res: { ocel: 90, hlinik: 16, ropa: 60, wolfram: 1, chrom: 0.3 } },
  CAN: { civ: 9, mil: 2, res: { ocel: 8, hlinik: 12, ropa: 1, chrom: 0.2 } },
  MEX: { civ: 4, mil: 1, res: { ropa: 6, ocel: 1 } },
  GUA: { civ: 0, mil: 0, res: {} }, HON: { civ: 0, mil: 0, res: {} }, ELS: { civ: 0, mil: 0, res: {} }, NIC: { civ: 0, mil: 0, res: {} },
  COS: { civ: 0, mil: 0, res: {} }, PAN: { civ: 1, mil: 0, res: {} }, CUB: { civ: 1, mil: 0, res: { chrom: 0.5 } }, HAI: { civ: 0, mil: 0, res: {} },
  DOM: { civ: 0, mil: 0, res: {} }, COL: { civ: 2, mil: 1, res: { ropa: 2 } }, VEN: { civ: 2, mil: 0, res: { ropa: 14 } }, ECU: { civ: 1, mil: 0, res: { ropa: 0.5 } },
  PRU: { civ: 2, mil: 1, res: { ropa: 1, wolfram: 0.3 } }, BOL: { civ: 1, mil: 0, res: { wolfram: 1, ropa: 0.3 } }, CHL: { civ: 3, mil: 1, res: { ocel: 1 } },
  ARG: { civ: 6, mil: 2, res: { ropa: 1.5, ocel: 1 } }, URG: { civ: 1, mil: 0, res: {} }, PAR: { civ: 0, mil: 0, res: {} },
  BRA: { civ: 5, mil: 2, res: { ocel: 2, guma: 3, chrom: 0.3 } },
  ETH: { civ: 0, mil: 0, res: {} }, LBR: { civ: 0, mil: 0, res: { guma: 2 } }, SAF: { civ: 4, mil: 1, res: { ocel: 3, chrom: 4 } },
  JAP: { civ: 30, mil: 16, res: { ocel: 7, hlinik: 1.5, ropa: 0.5, wolfram: 0.3 } },
  MAN: { civ: 6, mil: 3, res: { ocel: 6, hlinik: 1 } },
  CHI: { civ: 10, mil: 6, res: { wolfram: 5, ocel: 2 } },
  PRC: { civ: 0, mil: 0, res: {} }, SIK: { civ: 0, mil: 0, res: { ropa: 0.5 } }, TIB: { civ: 0, mil: 0, res: {} }, MON: { civ: 0, mil: 0, res: {} }, TAN: { civ: 0, mil: 0, res: {} },
  SIA: { civ: 2, mil: 0, res: { guma: 1.5, wolfram: 0.3 } }, AFG: { civ: 0, mil: 0, res: {} },
  RAJ: { civ: 12, mil: 4, res: { ocel: 5, hlinik: 1, chrom: 2 } }, NEP: { civ: 0, mil: 0, res: {} }, YEM: { civ: 0, mil: 0, res: {} },
  PHI: { civ: 1, mil: 0, res: { chrom: 1.5 } }, AST: { civ: 7, mil: 2, res: { ocel: 5, hlinik: 1 } }, NZL: { civ: 2, mil: 0, res: {} },
};

/** Počáteční armády (viz army/national.js). */
export const ARMY_WORLD = {
  USA: { cult: 'en', divs: { pesi: 9, kav: 2, tank: 1 }, xp: 0.15, res: 0.6, man: 0.004, pool: 4, place: [{ states: ['Havaj'], divs: { pesi: 1 } }] },
  CAN: { cult: 'en', divs: { pesi: 3 }, xp: 0.12, res: 0.4, man: 0.006, pool: 1 },
  MEX: { cult: 'es', divs: { pesi: 8, kav: 4 }, xp: 0.12, res: 0.3, man: 0.008, pool: 1 },
  GUA: { cult: 'es', divs: { brig: 1 }, xp: 0.1, res: 0.2, man: 0.008, pool: 0 }, HON: { cult: 'es', divs: { brig: 1 }, xp: 0.1, res: 0.2, man: 0.008, pool: 0 },
  ELS: { cult: 'es', divs: { brig: 1 }, xp: 0.1, res: 0.2, man: 0.008, pool: 0 }, NIC: { cult: 'es', divs: { brig: 1 }, xp: 0.1, res: 0.2, man: 0.008, pool: 0 },
  COS: { cult: 'es', divs: {}, xp: 0.1, res: 0.1, man: 0.006, pool: 0 }, PAN: { cult: 'es', divs: {}, xp: 0.1, res: 0.1, man: 0.006, pool: 0 },
  CUB: { cult: 'es', divs: { pesi: 1, brig: 1 }, xp: 0.1, res: 0.2, man: 0.008, pool: 0 }, HAI: { cult: 'fr', divs: { brig: 1 }, xp: 0.1, res: 0.2, man: 0.006, pool: 0 },
  DOM: { cult: 'es', divs: { brig: 1 }, xp: 0.1, res: 0.2, man: 0.008, pool: 0 },
  COL: { cult: 'es', divs: { pesi: 4 }, xp: 0.1, res: 0.2, man: 0.008, pool: 1 }, VEN: { cult: 'es', divs: { pesi: 3 }, xp: 0.1, res: 0.2, man: 0.008, pool: 1 },
  ECU: { cult: 'es', divs: { pesi: 2 }, xp: 0.1, res: 0.2, man: 0.008, pool: 0 }, PRU: { cult: 'es', divs: { pesi: 6, kav: 1 }, xp: 0.12, res: 0.25, man: 0.008, pool: 1 },
  BOL: { cult: 'es', divs: { pesi: 4 }, xp: 0.2, res: 0.2, man: 0.01, pool: 1 }, CHL: { cult: 'es', divs: { pesi: 6, hory: 1, kav: 1 }, xp: 0.15, res: 0.3, man: 0.01, pool: 1 },
  ARG: { cult: 'es', divs: { pesi: 9, hory: 1, kav: 3 }, xp: 0.15, res: 0.3, man: 0.008, pool: 2 }, URG: { cult: 'es', divs: { pesi: 2 }, xp: 0.1, res: 0.2, man: 0.008, pool: 0 },
  PAR: { cult: 'es', divs: { pesi: 4 }, xp: 0.25, res: 0.2, man: 0.012, pool: 1 }, BRA: { cult: 'pt', divs: { pesi: 12, kav: 3 }, xp: 0.12, res: 0.25, man: 0.006, pool: 2 },
  ETH: { cult: 'am', divs: { pesi: 12, brig: 6 }, xp: 0.08, res: 0.1, man: 0.01, pool: 2 }, LBR: { cult: 'en', divs: { brig: 1 }, xp: 0.1, res: 0.2, man: 0.006, pool: 0 },
  SAF: { cult: 'en', divs: { pesi: 3, motor: 1 }, xp: 0.15, res: 0.4, man: 0.008, pool: 1 },
  JAP: { cult: 'ja', divs: { pesi: 32, hory: 2, kav: 4, tank: 1, motor: 1 }, xp: 0.35, res: 0.5, man: 0.012, pool: 5,
    place: [{ states: ['Keidžó', 'Heidžó', 'Severní Korea'], divs: { pesi: 4 } }, { states: ['Taihoku'], divs: { brig: 1 } }] },   // Korejská armáda
  MAN: { cult: 'zh', divs: { pesi: 8, kav: 4 }, xp: 0.1, res: 0.2, man: 0.004, pool: 1 },
  CHI: { cult: 'zh', divs: { pesi: 70, brig: 20, kav: 6 }, xp: 0.1, res: 0.1, man: 0.003, pool: 6 },
  PRC: { cult: 'zh', divs: { brig: 6 }, xp: 0.25, res: 0.1, man: 0.02, pool: 1 }, SIK: { cult: 'zh', divs: { pesi: 3, kav: 3 }, xp: 0.1, res: 0.1, man: 0.008, pool: 1 },
  TIB: { cult: 'mn', divs: { brig: 2 }, xp: 0.05, res: 0.1, man: 0.008, pool: 0 }, MON: { cult: 'mn', divs: { kav: 5 }, xp: 0.15, res: 0.2, man: 0.015, pool: 1 },
  TAN: { cult: 'mn', divs: { brig: 1 }, xp: 0.1, res: 0.1, man: 0.01, pool: 0 },
  SIA: { cult: 'th', divs: { pesi: 6 }, xp: 0.12, res: 0.25, man: 0.006, pool: 1 }, AFG: { cult: 'fa', divs: { pesi: 4, kav: 2 }, xp: 0.1, res: 0.15, man: 0.008, pool: 1 },
  RAJ: { cult: 'hi', divs: { pesi: 16, kav: 4, hory: 2 }, xp: 0.2, res: 0.3, man: 0.0015, pool: 3 }, NEP: { cult: 'hi', divs: { pesi: 2, hory: 1 }, xp: 0.25, res: 0.2, man: 0.006, pool: 0 },
  YEM: { cult: 'ar', divs: { brig: 2 }, xp: 0.1, res: 0.1, man: 0.008, pool: 0 }, PHI: { cult: 'es', divs: { pesi: 3 }, xp: 0.1, res: 0.2, man: 0.004, pool: 1 },
  AST: { cult: 'en', divs: { pesi: 4, kav: 1 }, xp: 0.15, res: 0.4, man: 0.008, pool: 1 }, NZL: { cult: 'en', divs: { pesi: 1 }, xp: 0.15, res: 0.4, man: 0.008, pool: 0 },
};

/** Počáteční loďstvo (viz navy/ships.js). */
export const NAVY_WORLD = {
  USA: { docks: 6, ships: { bb: 6, ca: 10, dd: 40, ss: 24, cv: 3, tr: 40 } },   // měřítko hry jako u Evropy (asi 0,4 skutečnosti)
  JAP: { docks: 5, ships: { bb: 4, ca: 12, dd: 30, ss: 16, cv: 3, tr: 30 } },
  CAN: { docks: 1, ships: { dd: 4, tr: 6 } }, AST: { docks: 1, ships: { ca: 3, dd: 5, tr: 6 } }, NZL: { docks: 0, ships: { ca: 1, tr: 2 } },
  SAF: { docks: 0, ships: { tr: 2 } }, RAJ: { docks: 0, ships: { dd: 2, tr: 6 } }, CHI: { docks: 0, ships: { ca: 1, dd: 2, tr: 4 } },
  MAN: { docks: 0, ships: { tr: 1 } }, SIA: { docks: 0, ships: { dd: 4, ss: 4, tr: 2 } }, ARG: { docks: 1, ships: { bb: 2, ca: 3, dd: 14, ss: 3, tr: 6 } },
  BRA: { docks: 1, ships: { bb: 2, ca: 2, dd: 8, ss: 4, tr: 6 } }, CHL: { docks: 0, ships: { bb: 1, ca: 2, dd: 8, ss: 6, tr: 4 } },
  MEX: { docks: 0, ships: { dd: 2, tr: 3 } }, PRU: { docks: 0, ships: { ca: 2, dd: 2, ss: 4, tr: 2 } }, COL: { docks: 0, ships: { dd: 2, tr: 2 } },
  VEN: { docks: 0, ships: { tr: 2 } }, CUB: { docks: 0, ships: { tr: 2 } }, URG: { docks: 0, ships: { tr: 1 } }, PHI: { docks: 0, ships: { tr: 2 } },
  ECU: { docks: 0, ships: { tr: 1 } }, DOM: { docks: 0, ships: { tr: 1 } }, PAN: { docks: 0, ships: { tr: 1 } }, YEM: { docks: 0, ships: { tr: 1 } },
};

/** Počáteční loutky: [loutka, pán, autonomie 0–100, pevná = autonomie neroste (historický stav)]. */
export const START_SUBJECTS = [
  ['MAN', 'JAP', 15, 1], ['MON', 'SOV', 35, 1], ['TAN', 'SOV', 30, 1], ['PHI', 'USA', 55, 1], ['RAJ', 'ENG', 45, 1],
];

/** Počáteční bloky mimo Evropu. */
export const FACTIONS_WORLD = [
  { nm: 'Britské společenství', ldr: 'ENG', mem: ['ENG', 'CAN', 'AST', 'NZL', 'SAF'] },
];

/** Historické úpravy vztahů dvojic mimo Evropu. */
export const PAIR_REL_WORLD = [
  ['JAP', 'CHI', -50], ['JAP', 'SOV', -40], ['JAP', 'USA', -15], ['JAP', 'ENG', -5], ['JAP', 'GER', 15], ['JAP', 'ITA', 5], ['MAN', 'CHI', -50], ['MAN', 'SOV', -30],
  ['CHI', 'PRC', -60], ['CHI', 'SOV', -5], ['CHI', 'USA', 10], ['CHI', 'GER', 15], ['PRC', 'SOV', 40], ['SIK', 'SOV', 30], ['MON', 'CHI', -20], ['TIB', 'CHI', -20],
  ['USA', 'ENG', 20], ['USA', 'FRA', 10], ['USA', 'MEX', 10], ['USA', 'CAN', 40], ['USA', 'PHI', 30], ['USA', 'GER', -5], ['USA', 'SOV', -10],
  ['CAN', 'ENG', 50], ['AST', 'ENG', 50], ['NZL', 'ENG', 50], ['SAF', 'ENG', 30], ['RAJ', 'ENG', 40], ['AST', 'NZL', 40], ['AST', 'JAP', -20],
  ['ETH', 'ITA', -60], ['ETH', 'ENG', 15], ['ETH', 'FRA', 10], ['ARG', 'BRA', -10], ['ARG', 'ENG', 20], ['BRA', 'USA', 20], ['CHL', 'PRU', -10], ['PRU', 'ECU', -30],
  ['BOL', 'PAR', -50], ['SIA', 'FRA', -20], ['SIA', 'JAP', 10], ['AFG', 'ENG', -10], ['AFG', 'SOV', -10], ['YEM', 'ENG', -20], ['YEM', 'SAU', -20], ['MEX', 'ENG', -10],
];

/** Další kultury jmen velitelů (vymyšlené osoby). */
export const NAMES_WORLD = {
  ja: { first: ['Hiroši', 'Kendži', 'Takeši', 'Masao', 'Kazuo', 'Saburó', 'Isamu', 'Tadaši', 'Šigeru', 'Jošio', 'Tecuo', 'Haruo'],
    last: ['Tanaka', 'Mori', 'Kawada', 'Ogawa', 'Fudžii', 'Sakurai', 'Ueda', 'Murata', 'Ikeda', 'Nakano', 'Hajaši', 'Kondó', 'Išida', 'Sugimoto', 'Okabe', 'Nišimura'] },
  zh: { first: ['Wej', 'Ming', 'Ťün', 'Čchang', 'Kuo', 'Liang', 'Pao', 'Chua', 'Jung', 'Ťien', 'Te', 'Šan'],
    last: ['Wang', 'Li', 'Čang', 'Liou', 'Čchen', 'Jang', 'Čao', 'Chuang', 'Čou', 'Wu', 'Sü', 'Sun', 'Ma', 'Chu', 'Kuo', 'Lin'] },
  hi: { first: ['Rádž', 'Ardžun', 'Vidžaj', 'Sundar', 'Karan', 'Mohan', 'Hari', 'Ravi', 'Amar', 'Gópál', 'Bhím', 'Dév'],
    last: ['Singh', 'Šarma', 'Rao', 'Gupta', 'Iyer', 'Nair', 'Menon', 'Thápa', 'Čauhán', 'Rathór', 'Pillai', 'Mehta'] },
  th: { first: ['Somčaj', 'Prasert', 'Čalerm', 'Sombat', 'Wičaj', 'Anan'], last: ['Srisuk', 'Wongsa', 'Bunnag', 'Čaroen', 'Phongsri', 'Kittikun'] },
  am: { first: ['Tesfaje', 'Bekele', 'Haile', 'Mesfin', 'Alemu', 'Gebre'], last: ['Wolde', 'Tadesse', 'Mengistu', 'Asfaw', 'Kebede', 'Desta'] },
  mn: { first: ['Bat', 'Ganbold', 'Dordž', 'Sükh', 'Temür', 'Čimed'], last: ['Ölzij', 'Bajar', 'Dašdorž', 'Nergüj', 'Tsend', 'Žamc'] },
};
