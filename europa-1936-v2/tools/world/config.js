// Nastavení generátoru světa „Evropa 1936“ (2. generace).
//
// Svět vzniká z veřejných geodat Natural Earth (dnešní hranice) + našich převodů na stav z r. 1936.
// Žádná data ani mapa ze hry, která posloužila jako vzor mechanik, se nepoužívá – hranice, jména, čísla jsou naše.

// ---------------------------------------------------------------- rastr a projekce
// W1: celý svět v Mercatorově projekci, mapa se vodorovně opakuje. Šev vede Beringovým mořem a Pacifikem (−169,3° – jen oceán; ostrov
// sv. Vavřince, který jím prochází, se vypouští). V 50° s. š. má pixel `refKm` km (jako dřív v Evropě), na rovníku víc, na severu méně.
export const PROJECTION = { seam: -169.3, latN: 78, latS: -56, refLat: 50, refKm: 2.5 };
export const RES_KM = PROJECTION.refKm;          // jen pro starší výpisy; skutečné měřítko dává grid.kmAt(y)

// ---------------------------------------------------------------- vlastníci (tagy) v roce 1936
// Tag -> [česky, barva, hlavní město (lon, lat)]. Barvy jsou pro politickou mapu; jemně dolaďované později.
export const OWNERS = {
  GER: ['Německo', '#6b6f78', [13.4, 52.52]],
  FRA: ['Francie', '#3b6fb6', [2.35, 48.86]],
  ENG: ['Británie', '#c4527a', [-0.12, 51.51]],
  IRE: ['Irsko', '#4fa36a', [-6.26, 53.35]],
  HOL: ['Nizozemsko', '#e08a2e', [4.9, 52.37]],
  BEL: ['Belgie', '#d8c24a', [4.35, 50.85]],
  LUX: ['Lucembursko', '#7ab8d8', [6.13, 49.61]],
  SWI: ['Švýcarsko', '#d9534f', [7.45, 46.95]],
  AUS: ['Rakousko', '#b98ab0', [16.37, 48.21]],
  ITA: ['Itálie', '#4e8f5a', [12.5, 41.9]],
  SPR: ['Španělsko', '#d4a24c', [-3.7, 40.42]],
  POR: ['Portugalsko', '#2f7d6d', [-9.14, 38.72]],
  DEN: ['Dánsko', '#b5483f', [12.57, 55.68]],
  NOR: ['Norsko', '#5a8fc9', [10.75, 59.91]],
  SWE: ['Švédsko', '#e3c64f', [18.07, 59.33]],
  FIN: ['Finsko', '#8fb6d6', [24.94, 60.17]],
  EST: ['Estonsko', '#55a6b8', [24.75, 59.44]],
  LAT: ['Lotyšsko', '#a05468', [24.1, 56.95]],
  LIT: ['Litva', '#6d9a4a', [23.9, 54.9]],
  POL: ['Polsko', '#cf6b6b', [21.01, 52.23]],
  CZE: ['Československo', '#5b7fb0', [14.42, 50.09]],
  HUN: ['Maďarsko', '#9b7b52', [19.04, 47.5]],
  ROM: ['Rumunsko', '#cdb04d', [26.1, 44.43]],
  YUG: ['Jugoslávie', '#8c6bb0', [20.46, 44.8]],
  BUL: ['Bulharsko', '#5f9b6b', [23.32, 42.7]],
  GRE: ['Řecko', '#6ea7d6', [23.73, 37.98]],
  ALB: ['Albánie', '#b34a4a', [19.82, 41.33]],
  TUR: ['Turecko', '#c98a5a', [32.85, 39.93]],
  ICE: ['Island', '#79a8b5', [-21.9, 64.15]],
  SOV: ['Sovětský svaz', '#b03a3a', [37.62, 55.75]],
  EGY: ['Egypt', '#c9b86a', [31.24, 30.04]],
  IRQ: ['Irák', '#8a9a5a', [44.36, 33.31]],
  PER: ['Persie', '#7aa87a', [51.39, 35.69]],
  SAU: ['Saúdská Arábie', '#6a9a6a', [46.7, 24.63]],
  OMA: ['Omán', '#a5806a', [58.4, 23.6]],
  // W1: zbytek světa
  USA: ['Spojené státy', '#4f7fa8', [-77.04, 38.9]],
  CAN: ['Kanada', '#b8574e', [-75.7, 45.42]],
  MEX: ['Mexiko', '#6f9a58', [-99.13, 19.43]],
  GUA: ['Guatemala', '#5fa0b8', [-90.51, 14.63]],
  HON: ['Honduras', '#8aa0c8', [-87.2, 14.08]],
  ELS: ['Salvador', '#3d66a8', [-89.2, 13.7]],
  NIC: ['Nikaragua', '#d2b05a', [-86.25, 12.13]],
  COS: ['Kostarika', '#b55a6a', [-84.08, 9.93]],
  PAN: ['Panama', '#c9796a', [-79.52, 8.98]],
  CUB: ['Kuba', '#5a83c0', [-82.37, 23.13]],
  HAI: ['Haiti', '#6a7fd0', [-72.33, 18.54]],
  DOM: ['Dominikánská republika', '#c86a5a', [-69.9, 18.47]],
  COL: ['Kolumbie', '#e0c050', [-74.07, 4.71]],
  VEN: ['Venezuela', '#a8704a', [-66.9, 10.5]],
  ECU: ['Ekvádor', '#d9a85a', [-78.5, -0.22]],
  PRU: ['Peru', '#c95a50', [-77.04, -12.05]],
  BOL: ['Bolívie', '#6aa070', [-68.15, -16.5]],
  CHL: ['Chile', '#8a5a9a', [-70.65, -33.45]],
  ARG: ['Argentina', '#7fb3d9', [-58.38, -34.6]],
  URG: ['Uruguay', '#5a9ad0', [-56.16, -34.9]],
  PAR: ['Paraguay', '#a0a058', [-57.58, -25.3]],
  BRA: ['Brazílie', '#4f9a5a', [-43.2, -22.9]],
  ETH: ['Etiopie', '#7aa04a', [38.74, 9.03]],
  LBR: ['Libérie', '#c0705a', [-10.8, 6.3]],
  SAF: ['Jihoafrická unie', '#d09a4a', [28.19, -25.75]],
  JAP: ['Japonsko', '#e8e0d0', [139.69, 35.69]],
  MAN: ['Mandžukuo', '#9a8a5a', [125.32, 43.88]],
  CHI: ['Čína', '#c8b24a', [118.78, 32.06]],
  PRC: ['Čínská sovětská republika', '#a04040', [109.49, 36.6]],
  SIK: ['Sin-ťiang', '#8a9a70', [87.6, 43.8]],
  TIB: ['Tibet', '#b89a7a', [91.1, 29.65]],
  MON: ['Mongolsko', '#6a8ab0', [106.9, 47.9]],
  TAN: ['Tuva', '#7a9a8a', [94.45, 51.72]],
  SIA: ['Siam', '#5ab0a0', [100.5, 13.75]],
  AFG: ['Afghánistán', '#8a7a5a', [69.17, 34.53]],
  RAJ: ['Indie', '#d8884a', [77.2, 28.6]],
  NEP: ['Nepál', '#b8506a', [85.32, 27.7]],
  YEM: ['Jemen', '#9a7060', [44.2, 15.35]],
  PHI: ['Filipíny', '#6a90c0', [120.98, 14.6]],
  AST: ['Austrálie', '#5a8a6a', [149.13, -35.28]],
  NZL: ['Nový Zéland', '#3a6a8a', [174.78, -41.29]],
};

export const VOID_OWNER = 'VOID';

// dnešní stát (jméno v Natural Earth) -> tag státu v roce 1936. Co tu chybí (a leží v rámci), je „prázdno“.
export const OWNER_OF = {
  Germany: 'GER', France: 'FRA', 'United Kingdom': 'ENG', Ireland: 'IRE', Guernsey: 'ENG', Jersey: 'ENG', 'Isle of Man': 'ENG',
  Netherlands: 'HOL', Belgium: 'BEL', Luxembourg: 'LUX',
  Switzerland: 'SWI', Liechtenstein: 'SWI', Austria: 'AUS',
  Italy: 'ITA', 'San Marino': 'ITA', Vatican: 'ITA', Monaco: 'FRA', Andorra: 'SPR',
  Spain: 'SPR', Portugal: 'POR', Gibraltar: 'ENG', Malta: 'ENG',
  Denmark: 'DEN', 'Faeroe Is.': 'DEN', Norway: 'NOR', Sweden: 'SWE', Finland: 'FIN', 'Åland': 'FIN',
  Estonia: 'EST', Latvia: 'LAT', Lithuania: 'LIT', Poland: 'POL',
  Czechia: 'CZE', Slovakia: 'CZE', Hungary: 'HUN', Romania: 'ROM',
  Serbia: 'YUG', Montenegro: 'YUG', 'North Macedonia': 'YUG', Kosovo: 'YUG', Croatia: 'YUG', 'Bosnia and Herz.': 'YUG', Slovenia: 'YUG',
  Bulgaria: 'BUL', Greece: 'GRE', Albania: 'ALB', Turkey: 'TUR', Iceland: 'ICE',
  Russia: 'SOV', Ukraine: 'SOV', Belarus: 'SOV', Moldova: 'SOV',
  Georgia: 'SOV', Armenia: 'SOV', Azerbaijan: 'SOV', Kazakhstan: 'SOV', Turkmenistan: 'SOV', Uzbekistan: 'SOV', Baikonur: 'SOV',
  Cyprus: 'ENG', 'N. Cyprus': 'ENG', 'Cyprus U.N. Buffer Zone': 'ENG', Akrotiri: 'ENG', Dhekelia: 'ENG',
  Egypt: 'EGY', Libya: 'ITA', Tunisia: 'FRA', Algeria: 'FRA', Morocco: 'FRA', 'W. Sahara': 'SPR', Mauritania: 'FRA',
  Syria: 'FRA', Lebanon: 'FRA', Israel: 'ENG', Palestine: 'ENG', Jordan: 'ENG',
  Iraq: 'IRQ', Iran: 'PER', 'Saudi Arabia': 'SAU', Kuwait: 'ENG', Bahrain: 'ENG', Qatar: 'ENG', 'United Arab Emirates': 'ENG', Oman: 'OMA',
  // W1: Amerika
  'United States of America': 'USA', 'Puerto Rico': 'USA', 'U.S. Virgin Is.': 'USA', Guam: 'USA', 'American Samoa': 'USA', 'U.S. Minor Outlying Is.': 'USA', 'USNB Guantanamo Bay': 'USA',
  Philippines: 'PHI', Canada: 'CAN', Greenland: 'DEN', 'St. Pierre and Miquelon': 'FRA', Bermuda: 'ENG',
  Mexico: 'MEX', Guatemala: 'GUA', Belize: 'ENG', Honduras: 'HON', 'El Salvador': 'ELS', Nicaragua: 'NIC', 'Costa Rica': 'COS', Panama: 'PAN',
  Cuba: 'CUB', Haiti: 'HAI', 'Dominican Rep.': 'DOM', Jamaica: 'ENG', Bahamas: 'ENG', 'Turks and Caicos Is.': 'ENG', 'Cayman Is.': 'ENG',
  'Trinidad and Tobago': 'ENG', Barbados: 'ENG', Grenada: 'ENG', 'St. Vin. and Gren.': 'ENG', 'Saint Lucia': 'ENG', Dominica: 'ENG', Montserrat: 'ENG',
  'Antigua and Barb.': 'ENG', 'St. Kitts and Nevis': 'ENG', Anguilla: 'ENG', 'British Virgin Is.': 'ENG',
  'Curaçao': 'HOL', Aruba: 'HOL', 'Sint Maarten': 'HOL', 'St-Martin': 'FRA', 'St-Barthélemy': 'FRA', 'Clipperton I.': 'FRA',
  Colombia: 'COL', Venezuela: 'VEN', Ecuador: 'ECU', Peru: 'PRU', Bolivia: 'BOL', Chile: 'CHL', Argentina: 'ARG', 'Southern Patagonian Ice Field': 'ARG',
  Uruguay: 'URG', Paraguay: 'PAR', Brazil: 'BRA', 'Brazilian I.': 'BRA', Guyana: 'ENG', Suriname: 'HOL', 'Falkland Is.': 'ENG', 'S. Geo. and the Is.': 'ENG',
  // W1: Afrika
  Ethiopia: 'ETH', Eritrea: 'ITA', Somalia: 'ITA', Somaliland: 'ENG', Djibouti: 'FRA', Liberia: 'LBR', 'South Africa': 'SAF', Namibia: 'SAF',
  Nigeria: 'ENG', Ghana: 'ENG', 'Sierra Leone': 'ENG', Gambia: 'ENG', Kenya: 'ENG', Uganda: 'ENG', Tanzania: 'ENG', Malawi: 'ENG', Zambia: 'ENG',
  Zimbabwe: 'ENG', Botswana: 'ENG', Lesotho: 'ENG', eSwatini: 'ENG', Sudan: 'ENG', 'S. Sudan': 'ENG', Mauritius: 'ENG', Seychelles: 'ENG', 'Saint Helena': 'ENG',
  'Br. Indian Ocean Ter.': 'ENG',
  Mali: 'FRA', Senegal: 'FRA', Guinea: 'FRA', "Côte d'Ivoire": 'FRA', 'Burkina Faso': 'FRA', Niger: 'FRA', Benin: 'FRA', Chad: 'FRA',
  'Central African Rep.': 'FRA', Congo: 'FRA', Gabon: 'FRA', Cameroon: 'FRA', Togo: 'FRA', Madagascar: 'FRA', Comoros: 'FRA', 'Fr. S. Antarctic Lands': 'FRA',
  'Dem. Rep. Congo': 'BEL', Rwanda: 'BEL', Burundi: 'BEL',
  Angola: 'POR', Mozambique: 'POR', 'Guinea-Bissau': 'POR', 'Cabo Verde': 'POR', 'São Tomé and Principe': 'POR', 'Timor-Leste': 'POR', Macao: 'CHI',
  'Eq. Guinea': 'SPR', 'Bir Tawil': 'EGY',
  // W1: Asie a Oceánie
  Japan: 'JAP', Taiwan: 'JAP', 'North Korea': 'JAP', 'South Korea': 'JAP', Palau: 'JAP', 'N. Mariana Is.': 'JAP', Micronesia: 'JAP', 'Marshall Is.': 'JAP',
  China: 'CHI', 'Hong Kong': 'ENG', Mongolia: 'MON', Tajikistan: 'SOV', Kyrgyzstan: 'SOV', Afghanistan: 'AFG', Nepal: 'NEP', Bhutan: 'RAJ',
  India: 'RAJ', Pakistan: 'RAJ', Bangladesh: 'RAJ', 'Siachen Glacier': 'RAJ', Myanmar: 'ENG', 'Sri Lanka': 'ENG', Maldives: 'ENG', Yemen: 'YEM',
  Thailand: 'SIA', Vietnam: 'FRA', Laos: 'FRA', Cambodia: 'FRA', Malaysia: 'ENG', Singapore: 'ENG', Brunei: 'ENG', Indonesia: 'HOL',
  'Indian Ocean Ter.': 'ENG',
  Australia: 'AST', 'Papua New Guinea': 'AST', 'Norfolk Island': 'AST', 'Coral Sea Is.': 'AST', 'Ashmore and Cartier Is.': 'AST', Nauru: 'AST', 'Heard I. and McDonald Is.': 'AST',
  'New Zealand': 'NZL', Samoa: 'NZL', 'Cook Is.': 'NZL', Niue: 'NZL',
  Fiji: 'ENG', Tonga: 'ENG', 'Solomon Is.': 'ENG', Vanuatu: 'ENG', Kiribati: 'ENG', Tuvalu: 'ENG', 'Pitcairn Is.': 'ENG',
  'New Caledonia': 'FRA', 'Fr. Polynesia': 'FRA', 'Wallis and Futuna Is.': 'FRA',
};

// ---------------------------------------------------------------- převody území na stav z r. 1936
// Polygony [lon, lat] jsou záměrně hrubé. Pořadí je důležité: co už bylo převedeno, se dál nepřevádí.
const ring = (...pts) => pts;

const GER_POMERANIA_SILESIA = ring(
  [11.0, 55.6], [17.95, 55.6], [17.95, 54.75], [17.6, 54.3], [17.35, 54.0], [17.3, 53.6], [17.1, 53.35], [16.6, 53.0],
  [15.95, 52.45], [15.85, 52.0], [16.5, 51.78], [16.75, 51.55], [17.35, 51.5], [17.45, 51.33], [17.95, 51.25], [18.0, 51.05],
  [18.35, 51.0], [18.65, 50.85], [18.8, 50.45], [18.7, 50.2], [18.4, 50.05], [18.35, 49.0], [11.0, 49.0]);
const GER_EAST_PRUSSIA = ring(
  [19.3, 55.3], [23.0, 55.3], [22.85, 54.4], [22.55, 53.95], [22.45, 53.75], [21.9, 53.45], [21.4, 53.3], [20.4, 53.25],
  [19.7, 53.55], [19.2, 53.65], [18.95, 53.6], [18.88, 53.95], [18.95, 54.1], [19.3, 54.3]);
const GER_KONIGSBERG = ring([19.3, 54.2], [23.0, 54.2], [23.0, 55.15], [19.3, 55.15]);
const POL_VILNIUS = ring(
  [26.4, 55.8], [27.2, 55.8], [27.2, 53.8], [24.05, 53.8], [24.1, 54.0], [24.3, 54.25], [24.4, 54.45], [24.6, 54.65],
  [24.8, 54.85], [25.2, 55.15], [25.8, 55.35], [26.4, 55.6]);
const POL_WEST_BELARUS = ring(
  [22.0, 56.0], [27.45, 56.0], [27.0, 55.2], [27.0, 54.0], [27.2, 53.4], [27.5, 52.6], [27.9, 52.1], [28.0, 51.5], [22.0, 51.5]);
const POL_GALICIA_VOLHYNIA = ring(
  [22.0, 52.0], [28.0, 52.0], [28.0, 51.5], [27.6, 51.0], [27.5, 50.5], [27.3, 50.1], [26.9, 49.8], [26.3, 49.6], [26.2, 49.2],
  [26.4, 48.8], [26.5, 48.55], [25.8, 48.5], [25.2, 48.3], [24.7, 48.45], [24.0, 48.6], [23.4, 48.9], [22.8, 49.0], [22.0, 49.0]);
const CZE_RUTHENIA = ring([22.0, 47.9], [24.7, 47.9], [24.7, 48.45], [24.0, 48.6], [23.4, 48.9], [22.8, 49.0], [22.0, 49.0]);
const ROM_BUKOVINA = ring([24.6, 47.5], [27.9, 47.5], [27.9, 48.35], [27.2, 48.58], [26.5, 48.62], [25.8, 48.55], [25.2, 48.4], [24.6, 48.45]);
const ROM_BUDJAK = ring([28.0, 45.0], [30.5, 45.0], [30.5, 46.3], [29.6, 46.55], [28.0, 46.55]);
const SOV_TRANSNISTRIA = ring(   // levý břeh Dněstru = Moldavská ASSR (sovětská)
  [28.2, 48.6], [28.3, 48.15], [28.7, 47.95], [29.1, 47.5], [29.2, 47.25], [29.5, 46.9], [29.6, 46.75], [29.85, 46.6],
  [30.1, 46.45], [30.2, 46.2], [30.3, 46.0], [31.2, 46.0], [31.2, 48.8]);
const ROM_BESSARABIA = ring(
  [26.0, 49.0], [27.5, 48.55], [28.2, 48.2], [28.9, 47.9], [29.25, 47.3], [29.7, 46.8], [30.15, 46.45], [30.15, 45.0], [26.0, 45.0]);
const ROM_DOBRUJA = ring([26.6, 44.5], [29.0, 44.5], [29.0, 43.4], [27.6, 43.4], [27.0, 43.85], [26.6, 44.0]);
const FIN_KARELIA = ring(
  [28.0, 59.9], [30.0, 59.9], [30.0, 61.2], [32.2, 61.2], [32.5, 61.9], [32.0, 62.3], [31.0, 62.7], [30.0, 63.0], [29.0, 63.0], [28.0, 60.5]);
const FIN_PETSAMO = ring([29.3, 68.8], [32.3, 68.8], [32.3, 70.4], [29.3, 70.4]);
const FIN_SALLA = ring([29.0, 66.6], [30.9, 66.6], [31.0, 67.6], [29.4, 67.6]);
const EST_PETSERI = ring([27.2, 57.4], [28.25, 57.4], [28.25, 58.15], [27.2, 58.15]);
const EST_IVANGOROD = ring([28.0, 59.2], [28.45, 59.2], [28.45, 59.55], [28.0, 59.55]);
const LAT_ABRENE = ring([27.2, 56.65], [28.25, 56.65], [28.25, 57.25], [27.2, 57.25]);
const ITA_JULIAN_MARCH = ring(
  [12.5, 44.4], [12.5, 46.6], [13.7, 46.55], [13.85, 46.3], [14.15, 46.0], [14.35, 45.85], [14.55, 45.65], [14.5, 45.45], [14.45, 45.3], [14.45, 44.4]);
const ITA_ZARA = ring([15.05, 44.0], [15.5, 44.0], [15.5, 44.3], [15.05, 44.3]);
const ITA_DODECANESE = ring([26.45, 35.3], [29.95, 35.3], [29.95, 37.45], [26.45, 37.45]);
const FRA_HATAY = ring([35.8, 35.85], [36.0, 35.85], [36.75, 36.05], [36.85, 36.4], [36.7, 36.65], [36.45, 37.0], [36.1, 37.1], [35.8, 37.1]);
const SPR_MOROCCO = ring(
  [-6.0, 35.98], [-1.9, 35.98], [-1.9, 34.9], [-2.5, 34.6], [-4.0, 34.7], [-5.2, 34.75], [-6.4, 35.0], [-6.4, 35.4]);

// W1: převody mimo Evropu (hrubé obdélníky / mnohoúhelníky)
const JAP_SAKHALIN = ring([141.5, 45.8], [145.0, 45.8], [145.0, 50.0], [141.5, 50.0]);
const JAP_KURILS = ring([145.3, 43.3], [157.0, 43.3], [157.0, 51.0], [151.0, 51.0], [145.3, 45.0]);
const MAN_MANCHURIA = ring(   // Mandžusko a Žehol (1936)
  [119.5, 53.6], [127.0, 53.6], [135.2, 48.4], [131.3, 42.9], [130.0, 42.4], [128.0, 41.5], [124.3, 39.8], [121.0, 38.7], [119.5, 39.6],
  [118.9, 40.0], [117.5, 40.6], [116.5, 41.6], [117.0, 42.6], [118.0, 43.5], [116.0, 44.8], [116.8, 46.5], [119.0, 47.6], [117.5, 49.6]);
const PRC_YANAN = ring([107.3, 35.4], [110.6, 35.4], [110.6, 38.3], [107.3, 38.3]);
const SIK_XINJIANG = ring(   // Sin-ťiang (hrubě podle hranice Čchinghaje a Kansu)
  [73.0, 49.3], [91.0, 49.3], [96.4, 42.7], [95.4, 41.0], [93.5, 39.5], [91.0, 38.0], [86.0, 36.0], [80.3, 35.4], [77.8, 35.5], [73.0, 37.0]);
const TIB_TIBET = ring(      // Tibet (dnešní autonomní oblast, hrubě)
  [78.3, 34.9], [80.3, 35.6], [86.0, 36.2], [90.5, 36.0], [94.0, 34.0], [97.5, 33.0], [99.0, 31.5], [98.8, 28.5], [97.0, 28.0], [95.0, 28.5],
  [91.5, 27.5], [88.0, 27.8], [85.0, 28.5], [81.0, 30.0], [78.5, 31.0]);
const TAN_TUVA = ring([88.7, 49.8], [99.3, 49.8], [99.3, 53.0], [96.0, 53.8], [91.5, 53.0], [88.7, 52.0]);
const ENG_ADEN = ring([43.3, 12.4], [53.2, 15.6], [53.2, 17.6], [49.0, 17.0], [46.5, 15.3], [44.8, 14.0], [43.6, 13.3]);
const ENG_NEWFOUNDLAND = ring(   // Newfoundland a Labrador (samostatné panství, správa z Londýna)
  [-59.5, 46.5], [-52.5, 46.5], [-52.5, 60.5], [-64.6, 60.5], [-64.0, 58.2], [-67.0, 58.0], [-67.0, 55.0], [-64.0, 54.0], [-64.0, 52.2],
  [-60.0, 52.0], [-57.1, 51.4], [-59.5, 48.5]);

export const TRANSFERS = [
  { from: ['Russia'], to: 'JAP', ring: JAP_SAKHALIN },
  { from: ['Russia'], to: 'JAP', ring: JAP_KURILS },
  { from: ['China'], to: 'MAN', ring: MAN_MANCHURIA },
  { from: ['China'], to: 'PRC', ring: PRC_YANAN },
  { from: ['China'], to: 'SIK', ring: SIK_XINJIANG },
  { from: ['China'], to: 'TIB', ring: TIB_TIBET },
  { from: ['Russia'], to: 'TAN', ring: TAN_TUVA },
  { from: ['Yemen'], to: 'ENG', ring: ENG_ADEN },
  { from: ['Canada'], to: 'ENG', ring: ENG_NEWFOUNDLAND },
  { from: ['Poland'], to: 'GER', ring: GER_POMERANIA_SILESIA },
  { from: ['Poland'], to: 'GER', ring: GER_EAST_PRUSSIA },
  { from: ['Russia'], to: 'GER', ring: GER_KONIGSBERG },
  { from: ['Lithuania'], to: 'POL', ring: POL_VILNIUS },
  { from: ['Belarus'], to: 'POL', ring: POL_WEST_BELARUS },
  { from: ['Moldova'], to: 'SOV', ring: SOV_TRANSNISTRIA },
  { from: ['Ukraine'], to: 'ROM', ring: ROM_BUKOVINA },
  { from: ['Ukraine'], to: 'ROM', ring: ROM_BUDJAK },
  { from: ['Ukraine'], to: 'CZE', ring: CZE_RUTHENIA },
  { from: ['Ukraine'], to: 'POL', ring: POL_GALICIA_VOLHYNIA },
  { from: ['Moldova'], to: 'ROM', ring: ROM_BESSARABIA },
  { from: ['Bulgaria'], to: 'ROM', ring: ROM_DOBRUJA },
  { from: ['Russia'], to: 'FIN', ring: FIN_KARELIA },
  { from: ['Russia'], to: 'FIN', ring: FIN_PETSAMO },
  { from: ['Russia'], to: 'FIN', ring: FIN_SALLA },
  { from: ['Russia'], to: 'EST', ring: EST_PETSERI },
  { from: ['Russia'], to: 'EST', ring: EST_IVANGOROD },
  { from: ['Russia'], to: 'LAT', ring: LAT_ABRENE },
  { from: ['Slovenia', 'Croatia'], to: 'ITA', ring: ITA_JULIAN_MARCH },
  { from: ['Croatia'], to: 'ITA', ring: ITA_ZARA },
  { from: ['Greece'], to: 'ITA', ring: ITA_DODECANESE },
  { from: ['Turkey'], to: 'FRA', ring: FRA_HATAY },
  { from: ['Morocco'], to: 'SPR', ring: SPR_MOROCCO },
];

// ---------------------------------------------------------------- průlivy, které rastr 2,5 km nezachytí (vyhloubíme je)
// [název, šířka v km, [[lon, lat], ...]]
export const STRAITS = [
  ['Bospor', 4, [[29.12, 41.25], [29.06, 41.1], [29.0, 41.0], [28.97, 40.98]]],
  ['Dardanely', 4, [[26.8, 40.45], [26.6, 40.34], [26.42, 40.17], [26.22, 40.05], [26.08, 40.02]]],
  ['Kerčský průliv', 5, [[36.4, 45.4], [36.6, 45.2], [36.75, 45.0]]],
  ['Öresund', 5, [[12.5, 56.14], [12.65, 55.95], [12.75, 55.7]]],
  ['Malý Belt', 4, [[9.78, 55.55], [9.75, 55.3], [9.7, 55.1]]],
  ['Messinský průliv', 4, [[15.65, 38.3], [15.63, 38.15]]],
  ['Suezský průplav', 3.5, [[32.33, 31.3], [32.3, 30.8], [32.37, 30.45], [32.56, 29.95]]],
  ['Samos', 3, [[26.9, 37.67], [27.1, 37.7]]],
  ['Korfu', 3, [[19.95, 39.8], [20.05, 39.62]]],
  // W1
  ['Panamský průplav', 3.5, [[-79.92, 9.38], [-79.85, 9.2], [-79.68, 9.05], [-79.55, 8.93]]],
];

// ---------------------------------------------------------------- jezera, která bereme jako vodu (min. plocha km²)
export const MIN_LAKE_KM2 = 1500;
export const MIN_ISLAND_KM2 = 350;     // menší ostrůvky vypustíme (kromě těch v ISLAND_KEEP)
export const ISLAND_KEEP = [[14.4, 35.9]];   // Malta
export const MIN_ISLAND_FAR_KM2 = 2500;      // W1: mimo původní rámec vypouštíme menší ostrovy (zbytečné provincie)
// W1: strategické ostrůvky, které musí na mapě být (i když je rastr nezachytí): [název, lon, lat, vlastník, poloměr px]
export const FORCE_ISLANDS = [
  ['Midway', -177.37, 28.21, 'USA', 2], ['Wake', 166.63, 19.29, 'USA', 2], ['Guam', 144.78, 13.45, 'USA', 3], ['Oahu', -157.98, 21.47, 'USA', 0],
  ['Saipan', 145.75, 15.18, 'JAP', 3], ['Tinian', 145.63, 14.98, 'JAP', 2], ['Iwodžima', 141.32, 24.78, 'JAP', 2], ['Truk', 151.85, 7.42, 'JAP', 3],
  ['Kwajalein', 167.73, 8.72, 'JAP', 2], ['Palau', 134.55, 7.45, 'JAP', 3], ['Okinawa', 127.8, 26.4, 'JAP', 0],
  ['Tarawa', 172.98, 1.42, 'ENG', 2], ['Bermudy', -64.75, 32.3, 'ENG', 2], ['Malta', 14.4, 35.9, 'ENG', 0],
  ['Aden', 45.0, 12.8, 'ENG', 0], ['Diego Garcia', 72.42, -7.32, 'ENG', 2], ['Kokosové ostrovy', 96.83, -12.17, 'ENG', 2],
  ['Tonga', -175.2, -21.2, 'ENG', 2], ['Johnston', -169.53, 16.73, 'USA', 0],
  // ponechané malé ostrovy (poloměr 0 = jen nevypouštět)
  ['Guadeloupe', -61.55, 16.25, 'FRA', 0], ['Martinik', -61.0, 14.65, 'FRA', 0], ['Barbados', -59.55, 13.15, 'ENG', 0], ['Svatá Lucie', -60.97, 13.9, 'ENG', 0],
  ['Grenada', -61.68, 12.12, 'ENG', 0], ['Mauricius', 57.55, -20.25, 'ENG', 0], ['Curaçao', -68.95, 12.18, 'HOL', 2], ['Kapverdy', -23.6, 15.05, 'POR', 0],
  ['Santiago (Kapverdy)', -23.6, 15.05, 'POR', 2], ['Svatý Tomáš', 6.6, 0.25, 'POR', 0], ['Samoa', -172.4, -13.65, 'NZL', 0], ['Upolu', -171.75, -13.9, 'NZL', 0],
  ['Tahiti', -149.45, -17.65, 'FRA', 0], ['Komory', 43.35, -11.65, 'FRA', 0], ['Bahamy', -77.35, 25.05, 'ENG', 0], ['Fernando Póo', 8.7, 3.5, 'SPR', 0],
];

// ---------------------------------------------------------------- provincie
export const PROV_BASE_KM2 = 4200;      // základní plocha provincie v hustě osídlené Evropě
export const PROV_MAX_PER_STATE = 26;
// výchozí „řídkost“ provincií podle vlastníka (násobí PROV_BASE_KM2; navíc se bere sp ze semínka)
export const OWNER_SPARSE = {
  SOV: 1.5, TUR: 1.25, PER: 1.5, EGY: 1.4, SAU: 1.5, NOR: 1.1, SWE: 1.1, FIN: 1.15, ITA: 1.0,
  // W1: mimo Evropu řidší provincie (jako v HOI4) – řídkost ≈ plocha / (4200 km² × cílový počet provincií země)
  USA: 9, CAN: 34, MEX: 9.5, GUA: 4.3, HON: 5.3, ELS: 2.5, NIC: 6, COS: 4, PAN: 4.5, CUB: 3.3, HAI: 3.3, DOM: 3.8,
  COL: 11, VEN: 11, ECU: 7.7, PRU: 12, BOL: 17, CHL: 10, ARG: 15, URG: 7, PAR: 12, BRA: 25,
  ETH: 10.5, LBR: 8.7, SAF: 13.5, JAP: 2.2, MAN: 7.7, CHI: 7, PRC: 6, SIK: 33, TIB: 28, MON: 31, TAN: 13, SIA: 8, AFG: 13, RAJ: 6.5, NEP: 12, YEM: 12,
  PHI: 4.8, AST: 32, NZL: 8, ICE: 1.5, OMA: 2.5, IRQ: 1.8,
};

// ---------------------------------------------------------------- W1: hustota provincií a železnic podle oblasti
// Původní rámec mapy (Evropa, severní Afrika, Blízký východ do 63,6° v. d.) zůstává jako dřív; mimo něj řidší provincie a železnice (jako v HOI4).
export const NEW_TAGS = new Set(['USA', 'CAN', 'MEX', 'GUA', 'HON', 'ELS', 'NIC', 'COS', 'PAN', 'CUB', 'HAI', 'DOM', 'COL', 'VEN', 'ECU', 'PRU', 'BOL', 'CHL',
  'ARG', 'URG', 'PAR', 'BRA', 'ETH', 'LBR', 'SAF', 'JAP', 'MAN', 'CHI', 'PRC', 'SIK', 'TIB', 'MON', 'TAN', 'SIA', 'AFG', 'RAJ', 'NEP', 'YEM', 'PHI', 'AST', 'NZL']);
export const inOldFrame = (lon, lat) => lon >= -26 && lon <= 63.6 && lat >= 24 && lat <= 72;
export function sparseAt(owner, lon, lat) {
  if (NEW_TAGS.has(owner)) return OWNER_SPARSE[owner] ?? 8;
  if (inOldFrame(lon, lat)) return OWNER_SPARSE[owner] ?? 1;
  if (owner === 'SOV') return lon > 100 ? 30 : lon > 75 ? 20 : lat > 52 ? 12 : 9;   // Sibiř, Střední Asie
  if (owner === 'DEN') return 60;                                                  // Grónsko
  if (lon < -30) return 6;                                                         // kolonie v Americe (ostrovy, Guyany)
  if (lon > 90 && lat > -12) return 6;                                             // jihovýchodní Asie
  if (lon > 140 || lon < -140) return 8;                                           // Oceánie
  if (lon > 55) return 6;                                                          // Cejlon, Indický oceán
  return 11;                                                                       // Afrika a Arábie mimo starý rámec
}
// korekce hustoty železnic (0 = západní standard, ≤ -3 žádné) pro nové země a kolonie
export const NEW_RAIL = {
  USA: 0, CAN: -1, MEX: -2, GUA: -3, HON: -3, ELS: -2, NIC: -3, COS: -3, PAN: -3, CUB: -2, HAI: -3, DOM: -3, COL: -3, VEN: -3, ECU: -3, PRU: -2,
  BOL: -2, CHL: -2, ARG: -1, URG: -1, PAR: -2, BRA: -2, ETH: -3, LBR: -3, SAF: -1, JAP: 0, MAN: -1, CHI: -2, PRC: -3, SIK: -3, TIB: -3, MON: -3,
  TAN: -3, SIA: -2, AFG: -3, RAJ: -1, NEP: -3, YEM: -3, PHI: -2, AST: -1, NZL: -1,
};
export function railAt(owner, lon, lat, base) {
  if (NEW_TAGS.has(owner)) return NEW_RAIL[owner] ?? -2;
  if (inOldFrame(lon, lat)) return base;
  if (owner === 'SOV') return lon > 100 ? -2 : -2;
  return -2;
}
