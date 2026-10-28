// Nastavení generátoru světa „Evropa 1936“ (2. generace).
//
// Svět vzniká z veřejných geodat Natural Earth (dnešní hranice) + našich převodů na stav z r. 1936.
// Žádná data ani mapa ze hry, která posloužila jako vzor mechanik, se nepoužívá – hranice, jména, čísla jsou naše.

// ---------------------------------------------------------------- rastr a projekce
export const RES_KM = 2.5;                       // 1 pixel rastru = 2,5 km (souřadnice světa ve výstupu jsou v pixelech)
export const PROJECTION = { centralMeridian: 16, parallels: [38, 62] };   // kuželová konformní
export const FRAME_PAD_KM = 40;
export const EAST_LIMIT_LON = 63.6;              // co leží východněji, je „prázdno“ (mimo hrací plochu)

// Body, které musí být na mapě; z jejich obálky v projekci vznikne obdélníkový rámec.
export const FRAME_POINTS = [
  [-24.6, 66.5], [-13.5, 66.4], [-22.5, 63.4],                       // Island
  [-10.0, 36.9], [-9.5, 43.1], [-5.0, 50.0], [-10.5, 51.5],          // Portugalsko, Galicie, Cornwall, Irsko
  [-6.0, 35.8], [-1.5, 35.0],                                        // Gibraltar, Oran
  [10.0, 30.5], [20.0, 30.0], [25.0, 29.5], [33.0, 25.0],            // Libye, Egypt
  [43.0, 25.0], [48.0, 24.5], [56.5, 24.5], [60.0, 25.0],            // Arábie, Perský záliv
  [62.0, 40.0], [62.0, 55.0], [62.0, 62.0],                          // východní okraj
  [25.8, 71.2], [41.0, 67.6], [50.0, 69.0], [60.0, 67.0],            // Severní mys, Kola, Kanin
];

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

export const TRANSFERS = [
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
];

// ---------------------------------------------------------------- jezera, která bereme jako vodu (min. plocha km²)
export const MIN_LAKE_KM2 = 1500;
export const MIN_ISLAND_KM2 = 350;     // menší ostrůvky vypustíme (kromě těch v ISLAND_KEEP)
export const ISLAND_KEEP = [[14.4, 35.9]];   // Malta

// ---------------------------------------------------------------- provincie
export const PROV_BASE_KM2 = 4200;      // základní plocha provincie v hustě osídlené Evropě
export const PROV_MAX_PER_STATE = 26;
// výchozí „řídkost“ provincií podle vlastníka (násobí PROV_BASE_KM2; navíc se bere sp ze semínka)
export const OWNER_SPARSE = { SOV: 1.5, TUR: 1.25, PER: 1.5, EGY: 1.4, SAU: 1.5, NOR: 1.1, SWE: 1.1, FIN: 1.15, ITA: 1.0 };
