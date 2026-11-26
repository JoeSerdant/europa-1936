// S4: mechaniky jednotlivých zemí – ukazatel 0–100 (`nat.mech[id]`) s pásmy; každé pásmo = národní duch (bonusy a postihy v `SPIRITS`).
// Ukazatel posouvají rozhodnutí hráče (účinek `mech`) a u AI historické kroky `hist` ([den, změna]; s posunem `shiftOf` ve volné
// historii, nikdy u hráčovy země). Mechanika běží jen v okně `from`–`until` a jen pokud země existuje. Vlastní texty a čísla.
//  lo / hi  popisky konců ukazatele      bands  [{ min, spirit, n }] od nejvyššího (první splněné `min` platí; spirit '' = bez ducha)
export const MECHS = {
  purge: {
    tag: 'SOV', n: 'Velká čistka', g: 'Paranoia', lo: 'uvolnění', hi: 'teror', start: 60, from: 0, until: 2200,
    info: 'Strach z nepřátel uvnitř: vysoká paranoia drží režim pevně v rukou, ale bere armádě velitele a odvahu.',
    bands: [{ min: 75, spirit: 'velky_teror', n: 'Velký teror' }, { min: 40, spirit: 'cistky', n: 'Čistky' }, { min: 0, spirit: '', n: 'Klid' }],
    hist: [[520, 20], [1050, -25]],   // vrchol 1937, útlum na konci roku 1938 (úplný konec přinese národní cíl Konec čistek)
  },
  spr_unity: {
    tag: 'SPR', n: 'Jednota republiky', g: 'Jednota', lo: 'rozkol', hi: 'jednota', start: 45, from: 180, until: 1300,
    info: 'Republiku hájí komunisté, anarchisté i liberálové – a vzájemně si nevěří.',
    bands: [{ min: 65, spirit: 'jednota_fronty', n: 'Jednotná fronta' }, { min: 35, spirit: '', n: 'Křehké spojenectví' }, { min: 0, spirit: 'rozkol_fronty', n: 'Rozkol' }],
    hist: [[487, -20], [1150, -15]],   // květnové boje 1937, převrat v Madridu 1939
  },
  nsp_unity: {
    tag: 'NSP', n: 'Jednota nacionalistů', g: 'Jednota', lo: 'rozkol', hi: 'jednota', start: 50, from: 180, until: 1300,
    info: 'Falangisté, karlisté a monarchisté pod jedním velením – zatím jen na papíře.',
    bands: [{ min: 65, spirit: 'jednota_fronty', n: 'Jednotná fronta' }, { min: 35, spirit: '', n: 'Křehké spojenectví' }, { min: 0, spirit: 'rozkol_fronty', n: 'Rozkol' }],
    hist: [[471, 25]],   // sjednocovací dekret 1937
  },
  jap_rivalry: {
    tag: 'JAP', n: 'Armáda a loďstvo', g: 'Vliv', lo: 'loďstvo', hi: 'armáda', start: 60, from: 0, until: 3600,
    info: 'Armáda chce na sever do Asie, loďstvo na jih k ropě. Kdo má vliv, dostává rozpočet a určuje směr expanze.',
    bands: [{ min: 65, spirit: 'prevaha_armady', n: 'Převaha armády' }, { min: 36, spirit: '', n: 'Rovnováha' }, { min: 0, spirit: 'prevaha_lodstva', n: 'Převaha loďstva' }],
    hist: [[1650, -20], [2140, -12]],   // jižní směr 1940, rozhodnutí o válce na Pacifiku 1941
  },
  chi_unity: {
    tag: 'CHI', n: 'Jednota Číny', g: 'Jednota', lo: 'rozdrobení', hi: 'jednota', start: 25, from: 0, until: 3600,
    info: 'Provinční generálové poslouchají vládu, jen když se jim to hodí. Proti vnějšímu nepříteli se země může sjednotit.',
    bands: [{ min: 60, spirit: 'jednotna_fronta', n: 'Jednotná fronta' }, { min: 30, spirit: '', n: 'Křehká jednota' }, { min: 0, spirit: 'rozdrobena_cina', n: 'Rozdrobená země' }],
    hist: [[345, 25], [560, 15], [1840, -20]],   // incident v Si-anu 1936, válka 1937, rozpad fronty 1941
  },
  usa_iso: {
    tag: 'USA', n: 'Izolacionismus', g: 'Izolace', lo: 'zapojení', hi: 'izolace', start: 85, from: 0, until: 3600,
    info: 'Veřejnost nechce do evropských válek. Čím menší izolace, tím víc země pomáhá spojencům a zbrojí.',
    bands: [{ min: 70, spirit: 'izolacionismus', n: 'Izolacionismus' }, { min: 40, spirit: 'opatrna_neutralita', n: 'Opatrná neutralita' }, { min: 0, spirit: 'arzenal_demokracie', n: 'Arzenál demokracie' }],
    hist: [[1400, -15], [1897, -20], [2167, -40]],   // pokladna a doprava 1939, půjčka a pronájem 1941, Pearl Harbor
  },
  // ---- S5d: rovnováha sil velmocí (dvě strany ukazatele, oba konce dávají vlastní ducha) ----
  eng_bop: {
    tag: 'ENG', n: 'Říše a Evropa', g: 'Zaměření', lo: 'Evropa', hi: 'impérium', start: 60, from: 0, until: 3600,
    info: 'Londýn se dívá buď k vlastním koloniím a obchodu, nebo k pevnině, kde rostou hrozby.',
    bands: [{ min: 70, spirit: 'zamereni_imperium', n: 'Říše především' }, { min: 31, spirit: '', n: 'Rovnováha' }, { min: 0, spirit: 'zamereni_evropa', n: 'Evropa především' }],
    hist: [[1340, -30]],   // vstup do války 1939
  },
  fra_bop: {
    tag: 'FRA', n: 'Levice a pravice', g: 'Vláda', lo: 'pravice', hi: 'levice', start: 50, from: 0, until: 1634,
    info: 'Lidová fronta slibuje sociální reformy, pravice zbrojení a pořádek. Země je rozdělená.',
    bands: [{ min: 70, spirit: 'lidova_fronta', n: 'Lidová fronta' }, { min: 31, spirit: '', n: 'Křehký střed' }, { min: 0, spirit: 'pravicova_vlada', n: 'Vláda pořádku' }],
    hist: [[155, 25], [1035, -35]],   // vítězství Lidové fronty 1936, dekrety a zbrojení 1938
  },
  ger_bop: {
    tag: 'GER', n: 'Strana a armáda', g: 'Moc', lo: 'armáda', hi: 'strana', start: 55, from: 0, until: 3600,
    info: 'Generálové a stranické špičky soupeří o vliv na vedení války.',
    bands: [{ min: 70, spirit: 'moc_strany', n: 'Moc strany' }, { min: 31, spirit: '', n: 'Soupeření' }, { min: 0, spirit: 'moc_armady', n: 'Moc armády' }],
    hist: [[765, 20]],   // odvolání velení armády 1938
  },
  ita_bop: {
    tag: 'ITA', n: 'Strana a koruna', g: 'Moc', lo: 'koruna', hi: 'strana', start: 65, from: 0, until: 3600,
    info: 'Režim vládne, ale král a armáda čekají na jeho první velký neúspěch.',
    bands: [{ min: 65, spirit: 'rezim_strany', n: 'Pevný režim' }, { min: 36, spirit: '', n: 'Nejistota' }, { min: 0, spirit: 'moc_koruny', n: 'Koruna přebírá moc' }],
    hist: [[2762, -40]],   // pád režimu v létě 1943
  },
};
export const MECH_IDS = Object.keys(MECHS);
