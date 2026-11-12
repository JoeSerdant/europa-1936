// Zámořská pomoc (M79). Mapa hry končí v Evropě a Středomoří; velmoc za oceánem se proto neúčastní jako země, ale jako zdroj dodávek:
// od dne `from` do `until` (0 = 1. 1. 1936) dostane země `to` každých `every` dní zásilku `give` (výzbroj podle `EQUIP`, letouny podle `PLANES`,
// `fuel` = palivo), dokud válčí s některou ze zemí `foes` a její domovský přístav není zablokovaný. Vlastní čísla; jen s historickou AI.
export const OVERSEAS = { n: 'Spojené státy', adj: 'americká' };

export const OVERSEAS_AID = [
  { id: 'lend_eng', to: 'ENG', from: 1896, until: 3650, every: 30, foes: ['GER', 'ITA'], give: { pusky: 500, podpora: 80, auta: 120, dela: 30, pdela: 20, ltanky: 15, sti: 20, fuel: 40 } },
  { id: 'lend_sov', to: 'SOV', from: 2100, until: 3650, every: 30, foes: ['GER'], give: { pusky: 700, podpora: 60, auta: 200, dela: 20, mtanky: 10, sti: 15, fuel: 30 } },
];
