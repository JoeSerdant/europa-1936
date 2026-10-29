// Letouny a počáteční letectvo zemí (M30). Čísla jsou vlastní, zmenšená do měřítka hry.
//  atk    síla ve vzdušném boji (hlídky)        cas    podpora pozemních bojů (bonus k útoku divizí)
//  bomb   síla při bombardování                 range  dolet z letiště v km
//  unlock id technologie, která typ odemyká (null = od začátku)   role: 'air' hlídky, 'cas' podpora, 'bomb' bombardování
export const PLANES = {
  sti: { n: 'Stíhací letoun', ab: 'STÍ', atk: 6, cas: 0.4, bomb: 0, range: 600, unlock: null, roles: ['air'], info: 'Vybojuje nadvládu ve vzduchu a kryje vlastní letadla.' },
  bit: { n: 'Bitevní letoun', ab: 'BIT', atk: 2, cas: 5, bomb: 1, range: 450, unlock: null, roles: ['cas'], info: 'Podporuje pozemní boje: bonus k útoku divizí ve zvoleném státě.' },
  tac: { n: 'Taktický bombardér', ab: 'TAK', atk: 1, cas: 3, bomb: 4, range: 800, unlock: null, roles: ['cas', 'bomb'], info: 'Univerzální: podpora boje i bombardování.' },
  str: { n: 'Strategický bombardér', ab: 'STR', atk: 0.5, cas: 0, bomb: 10, range: 1500, unlock: 'strbomb', roles: ['bomb'], info: 'Dálkové bombardování zázemí: ničí zásoby a podlamuje podporu války.' },
};
export const PLANE_IDS = Object.keys(PLANES);

export const AIR_PROD = {
  sti: { cost: 12, res: { ocel: 1, hlinik: 1.5, ropa: 0.3 } },
  bit: { cost: 14, res: { ocel: 1.2, hlinik: 1.6, ropa: 0.4 } },
  tac: { cost: 22, res: { ocel: 2, hlinik: 2.5, ropa: 0.6 } },
  str: { cost: 55, res: { ocel: 5, hlinik: 6, ropa: 1.2, chrom: 0.5 } },
};

/** Počáteční letouny zemí; chybí-li záznam, použije se výchozí podle velikosti země (tier). */
export const AIR_NATIONAL = {
  GER: { sti: 160, bit: 90, tac: 120 },
  ENG: { sti: 150, bit: 70, tac: 110 },
  FRA: { sti: 170, bit: 60, tac: 70 },
  ITA: { sti: 140, bit: 60, tac: 90 },
  SOV: { sti: 300, bit: 150, tac: 200 },
  SPR: { sti: 60, bit: 30, tac: 40 },
  POL: { sti: 60, bit: 30, tac: 40 },
  TUR: { sti: 30, bit: 20, tac: 20 },
};
export const AIR_TIER = { 1: { sti: 100, bit: 50, tac: 60 }, 2: { sti: 36, bit: 18, tac: 18 }, 3: { sti: 10, bit: 5, tac: 5 } };
