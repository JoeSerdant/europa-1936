// Počáteční sestavy zemí v lednu 1936 (vlastní odhady, zaokrouhlené).
//  divs  počet divizí podle druhu šablony (viz templates.js: pesi, brig, motor, tank, hory, kav)
//  xp    výchozí zkušenost jednotek 0–1 (0,1 nováčci … 0,3 cvičení … 0,75 ostřílení)
//  res   záloha výzbroje ve skladu vůči výzbroji nasazených divizí (0,5 = na polovinu nové armády)
//  cult  kultura jmen velitelů (viz names.js)
//  man   podíl obyvatel jako počáteční zásoba lidské síly (např. 0,015 = 1,5 %)
//  pool  počet velitelů navíc (nad potřebu armád), ze kterých si hráč vybírá

export const NATIONAL = {
  GER: { cult: 'de', divs: { pesi: 17, motor: 2, tank: 3, hory: 1, kav: 1 }, xp: 0.3, res: 0.45, man: 0.016, pool: 4 },
  FRA: { cult: 'fr', divs: { pesi: 40, brig: 2, motor: 3, tank: 1, hory: 4, kav: 4 }, xp: 0.25, res: 0.5, man: 0.014, pool: 6 },
  ENG: { cult: 'en', divs: { pesi: 11, motor: 1, tank: 1, kav: 1 }, xp: 0.35, res: 0.8, man: 0.012, pool: 3 },
  IRE: { cult: 'ga', divs: { pesi: 2 }, xp: 0.12, res: 0.3, man: 0.012, pool: 1 },
  HOL: { cult: 'nl', divs: { pesi: 6, kav: 1 }, xp: 0.12, res: 0.4, man: 0.014, pool: 1 },
  BEL: { cult: 'nl', divs: { pesi: 10, hory: 1, kav: 1 }, xp: 0.15, res: 0.4, man: 0.014, pool: 1 },
  LUX: { cult: 'fr', divs: { brig: 1 }, xp: 0.1, res: 0.2, man: 0.015, pool: 0 },
  SWI: { cult: 'de', divs: { pesi: 6, hory: 2 }, xp: 0.2, res: 0.5, man: 0.02, pool: 1 },
  AUS: { cult: 'de', divs: { pesi: 4, motor: 1, hory: 1 }, xp: 0.18, res: 0.3, man: 0.014, pool: 1 },
  ITA: { cult: 'it', divs: { pesi: 29, brig: 1, motor: 3, tank: 1, hory: 5, kav: 1 }, xp: 0.2, res: 0.35, man: 0.014, pool: 5 },
  SPR: { cult: 'es', divs: { pesi: 20, hory: 2, kav: 2 }, xp: 0.15, res: 0.3, man: 0.013, pool: 3 },
  POR: { cult: 'pt', divs: { pesi: 5, kav: 1 }, xp: 0.12, res: 0.3, man: 0.013, pool: 1 },
  DEN: { cult: 'sc', divs: { pesi: 3 }, xp: 0.12, res: 0.3, man: 0.013, pool: 1 },
  NOR: { cult: 'sc', divs: { pesi: 3, hory: 1 }, xp: 0.12, res: 0.3, man: 0.013, pool: 1 },
  SWE: { cult: 'sc', divs: { pesi: 6, hory: 1, kav: 1 }, xp: 0.18, res: 0.5, man: 0.016, pool: 1 },
  FIN: { cult: 'fi', divs: { pesi: 6, hory: 1, kav: 1 }, xp: 0.22, res: 0.45, man: 0.02, pool: 1 },
  EST: { cult: 'ee', divs: { pesi: 3 }, xp: 0.15, res: 0.3, man: 0.018, pool: 0 },
  LAT: { cult: 'lv', divs: { pesi: 4 }, xp: 0.15, res: 0.3, man: 0.018, pool: 0 },
  LIT: { cult: 'lt', divs: { pesi: 3, kav: 1 }, xp: 0.15, res: 0.3, man: 0.018, pool: 0 },
  POL: { cult: 'pl', divs: { pesi: 26, hory: 1, tank: 1, kav: 5 }, xp: 0.2, res: 0.35, man: 0.016, pool: 4 },
  CZE: { cult: 'cz', divs: { pesi: 14, motor: 1, tank: 1, hory: 2 }, xp: 0.25, res: 0.5, man: 0.018, pool: 2 },
  HUN: { cult: 'hu', divs: { pesi: 5, kav: 1 }, xp: 0.12, res: 0.25, man: 0.015, pool: 1 },
  ROM: { cult: 'ro', divs: { pesi: 18, hory: 2, kav: 3 }, xp: 0.18, res: 0.3, man: 0.015, pool: 2 },
  YUG: { cult: 'sr', divs: { pesi: 15, hory: 2, kav: 1 }, xp: 0.18, res: 0.3, man: 0.016, pool: 2 },
  BUL: { cult: 'bg', divs: { pesi: 7, hory: 1 }, xp: 0.15, res: 0.25, man: 0.016, pool: 1 },
  GRE: { cult: 'el', divs: { pesi: 7, hory: 1 }, xp: 0.18, res: 0.3, man: 0.015, pool: 1 },
  ALB: { cult: 'sq', divs: { brig: 2 }, xp: 0.1, res: 0.2, man: 0.015, pool: 0 },
  TUR: { cult: 'tr', divs: { pesi: 20, hory: 1, kav: 3 }, xp: 0.18, res: 0.3, man: 0.014, pool: 2 },
  ICE: { cult: 'sc', divs: {}, xp: 0.1, res: 0.1, man: 0.01, pool: 0 },
  SOV: { cult: 'ru', divs: { pesi: 76, motor: 3, tank: 6, hory: 3, kav: 8 }, xp: 0.15, res: 0.6, man: 0.014, pool: 8 },
  EGY: { cult: 'ar', divs: { pesi: 3, kav: 1 }, xp: 0.1, res: 0.2, man: 0.01, pool: 1 },
  IRQ: { cult: 'ar', divs: { pesi: 4, kav: 1 }, xp: 0.1, res: 0.2, man: 0.012, pool: 1 },
  PER: { cult: 'fa', divs: { pesi: 7, kav: 1 }, xp: 0.1, res: 0.2, man: 0.012, pool: 1 },
  SAU: { cult: 'ar', divs: { brig: 2, kav: 1 }, xp: 0.1, res: 0.2, man: 0.01, pool: 0 },
  OMA: { cult: 'ar', divs: { brig: 1 }, xp: 0.1, res: 0.2, man: 0.01, pool: 0 },
};
