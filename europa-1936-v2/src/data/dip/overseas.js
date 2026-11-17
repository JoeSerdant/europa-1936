// Zámořská pomoc (M79). Mapa hry končí v Evropě a Středomoří; velmoc za oceánem se proto neúčastní jako země, ale jako zdroj dodávek:
// od dne `from` do `until` (0 = 1. 1. 1936) dostane země `to` každých `every` dní zásilku `give` (výzbroj podle `EQUIP`, letouny podle `PLANES`,
// `fuel` = palivo, lodě podle `SHIPS` do námořní rezervy – M93), dokud válčí s některou ze zemí `foes` a její domovský přístav není zablokovaný. Vlastní čísla; jen s historickou AI.
export const OVERSEAS = { n: 'Spojené státy', adj: 'americká' };

export const OVERSEAS_AID = [
  { id: 'lend_eng', to: 'ENG', from: 1896, until: 3650, every: 30, foes: ['GER', 'ITA'], give: { pusky: 500, podpora: 80, auta: 120, dela: 30, pdela: 20, ltanky: 15, sti: 20, fuel: 40 } },
  { id: 'lend_sov', to: 'SOV', from: 2100, until: 3650, every: 30, foes: ['GER'], give: { pusky: 700, podpora: 60, auta: 200, dela: 20, mtanky: 10, sti: 15, fuel: 30 } },
  // M93: americké transportní lodě pro vylodění ve Středomoří a ve Francii (1943–1944)
  { id: 'lend_eng_tr', to: 'ENG', from: 2560, until: 3200, every: 30, foes: ['GER', 'ITA'], give: { tr: 4 } },
  // M93: od roku 1942 jde do SSSR plná síla dodávek severní a perskou cestou
  { id: 'lend_sov2', to: 'SOV', from: 2300, until: 3500, every: 30, foes: ['GER'], give: { pusky: 2500, podpora: 120, auta: 400, dela: 60, mtanky: 30, sti: 25, fuel: 60 } },
];
