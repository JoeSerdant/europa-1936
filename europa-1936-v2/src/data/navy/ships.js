// Lodě a počáteční námořnictvo zemí (M27). Vlastní čísla; počty jsou zmenšené oproti skutečnosti, aby odpovídaly měřítku hry.
//  hp síla   atk palebná síla   spd rychlost (km/h)   cost body výroby na kus   res suroviny na kus
export const SHIPS = {
  dd: { n: 'Torpédoborec', ab: 'TOR', hp: 10, atk: 4, spd: 55, info: 'Rychlý a levný, páteř flotil.' },
  ca: { n: 'Křižník', ab: 'KŘI', hp: 30, atk: 10, spd: 50, info: 'Vyvážená bojová loď.' },
  bb: { n: 'Bitevní loď', ab: 'BIT', hp: 90, atk: 28, spd: 38, info: 'Největší síla, drahá a pomalá.' },
  ss: { n: 'Ponorka', ab: 'PON', hp: 6, atk: 5, spd: 30, info: 'Levná, křehká, ale nebezpečná.' },
  tr: { n: 'Transportní loď', ab: 'TRA', hp: 8, atk: 0, spd: 25, info: 'Veze divize přes moře; sama se nebrání.' },
};
export const SHIP_IDS = Object.keys(SHIPS);

export const SHIP_PROD = {
  dd: { cost: 90, res: { ocel: 6, ropa: 1 } },
  ca: { cost: 240, res: { ocel: 14, ropa: 2, chrom: 1 } },
  bb: { cost: 650, res: { ocel: 30, ropa: 4, chrom: 3, hlinik: 1 } },
  ss: { cost: 70, res: { ocel: 5, ropa: 1 } },
  tr: { cost: 60, res: { ocel: 8 } },
};

/** Počáteční námořnictvo: loděnice a lodě (transportní lodě jdou do rezervy, ostatní do hlavní flotily). Země bez záznamu nemá námořnictvo. */
export const NAVY_NATIONAL = {
  ENG: { docks: 6, ships: { bb: 6, ca: 14, dd: 40, ss: 12, tr: 40 } },
  FRA: { docks: 4, ships: { bb: 4, ca: 9, dd: 32, ss: 24, tr: 28 } },
  GER: { docks: 3, ships: { bb: 2, ca: 5, dd: 12, ss: 6, tr: 14 } },
  ITA: { docks: 4, ships: { bb: 3, ca: 10, dd: 30, ss: 28, tr: 24 } },
  SOV: { docks: 3, ships: { bb: 1, ca: 5, dd: 14, ss: 30, tr: 12 } },
  SPR: { docks: 2, ships: { bb: 1, ca: 4, dd: 12, ss: 8, tr: 8 } },
  TUR: { docks: 1, ships: { ca: 2, dd: 8, ss: 6, tr: 8 } },
  GRE: { docks: 1, ships: { ca: 2, dd: 8, ss: 4, tr: 8 } },
  YUG: { docks: 1, ships: { ca: 1, dd: 4, ss: 3, tr: 4 } },
  SWE: { docks: 1, ships: { ca: 3, dd: 9, ss: 8, tr: 8 } },
  DEN: { docks: 1, ships: { dd: 3, ss: 2, tr: 4 } },
  NOR: { docks: 1, ships: { dd: 6, ss: 4, tr: 4 } },
  HOL: { docks: 1, ships: { ca: 3, dd: 8, ss: 10, tr: 8 } },
  POR: { docks: 1, ships: { dd: 5, ss: 3, tr: 6 } },
  FIN: { docks: 1, ships: { dd: 2, ss: 4, tr: 4 } },
  POL: { docks: 1, ships: { dd: 3, ss: 4, tr: 4 } },
  ROM: { docks: 1, ships: { dd: 4, ss: 1, tr: 4 } },
  BUL: { docks: 0, ships: { dd: 1, tr: 2 } },
  BEL: { docks: 0, ships: { tr: 2 } },
  EST: { docks: 0, ships: { ss: 2, tr: 2 } },
  LAT: { docks: 0, ships: { ss: 1, tr: 2 } },
  LIT: { docks: 0, ships: { tr: 1 } },
  IRE: { docks: 0, ships: { tr: 2 } },
  EGY: { docks: 0, ships: { tr: 2 } },
  ALB: { docks: 0, ships: { tr: 1 } },
  IRQ: { docks: 0, ships: { tr: 1 } },
  PER: { docks: 0, ships: { tr: 2 } },
  SAU: { docks: 0, ships: { tr: 1 } },
  OMA: { docks: 0, ships: { tr: 1 } },
  ICE: { docks: 0, ships: { tr: 1 } },
};
