// Budovy, kategorie států a výrobní parametry výzbroje (M19). Čísla jsou vlastní; vyvážení vzorců je v `engine/industry/constants.js`.
//
//  BUILDINGS   cost = body stavby, days = nejkratší doba stavby (strop denního přísunu na jeden projekt = cost / days), slot = zabírá stavební slot státu
//  STATE_CATEGORIES  kategorie státu podle obyvatel (tis.): sloty = slots + úroveň infrastruktury
//  EQUIP_PROD  výroba výzbroje: cost = výrobní body (IC) na kus, res = suroviny na kus

export const BUILDINGS = {
  civ: { n: 'Civilní továrna', ab: 'CIV', cost: 800, days: 45, slot: true, info: 'Dodává body stavby. Část se vždy spotřebuje na spotřební zboží a na dovoz surovin.' },
  mil: { n: 'Vojenská továrna', ab: 'VOJ', cost: 700, days: 45, slot: true, info: 'Vyrábí výzbroj na výrobních linkách.' },
  inf: { n: 'Infrastruktura', ab: 'INF', cost: 500, days: 30, slot: false, max: 3, info: 'Zlepšuje silnice a železnici státu: rychlejší pochod, lepší zásobování, další stavební slot.' },
};
export const BUILDING_IDS = Object.keys(BUILDINGS);

/** Kategorie států: nejvýš `max` tisíc obyvatel → základní počet slotů. Seřazeno vzestupně. */
export const STATE_CATEGORIES = [
  { id: 'osada', n: 'Osada', max: 150, slots: 2 },
  { id: 'mestecko', n: 'Městečko', max: 400, slots: 4 },
  { id: 'mesto', n: 'Město', max: 900, slots: 6 },
  { id: 'velke', n: 'Velké město', max: 1800, slots: 8 },
  { id: 'velkomesto', n: 'Velkoměsto', max: 3500, slots: 10 },
  { id: 'metropole', n: 'Metropole', max: Infinity, slots: 12 },
];

export const EQUIP_PROD = {
  pusky:   { cost: 0.5, res: { ocel: 0.2 } },
  dela:    { cost: 3.5, res: { ocel: 1.5, wolfram: 0.2 } },
  pdela:   { cost: 3.5, res: { ocel: 1.5, wolfram: 0.5 } },
  auta:    { cost: 1.5, res: { ocel: 0.6, guma: 0.3, ropa: 0.3 } },
  vozy:    { cost: 6,   res: { ocel: 2, guma: 0.4, chrom: 0.1, ropa: 0.4 } },
  ltanky:  { cost: 8,   res: { ocel: 3, guma: 0.5, chrom: 0.3, hlinik: 0.3, ropa: 0.5 } },
  podpora: { cost: 1.5, res: { ocel: 0.5, hlinik: 0.2 } },
};

/** Výchozí rozdělení vojenských továren mezi druhy výzbroje (zemím bez hráče a při startu hry). Pořadí = priorita při malém počtu továren. */
export const DEFAULT_SPLIT = { pusky: 0.38, dela: 0.16, auta: 0.16, podpora: 0.16, ltanky: 0.07, pdela: 0.04, vozy: 0.03 };
