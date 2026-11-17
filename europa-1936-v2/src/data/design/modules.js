// Návrhář výzbroje (M97): typy, které lze navrhovat, jejich sloty a moduly. Vlastní názvy a čísla.
// Návrh varianty = modul v každém slotu; účinky modulů se sčítají a násobí statistiky typu výzbroje země (1 + součet):
//  atk útok (tanky: měkký i tvrdý útok, průlom a průraz; lodě: palba; letouny: vzdušný boj)   def obrana (tanky)   armor pancíř (tanky)
//  speed rychlost (tanky)   hp odolnost (lodě)   cas podpora pozemních bojů (letouny)   bomb bombardování (letouny)   cost cena výroby
//  unlock  technologie, která modul odemyká (null = od začátku)   only  jen pro tyto typy

export const DESIGN_CATS = {
  tank: { n: 'Tanky', xp: 'land' },
  ship: { n: 'Lodě', xp: 'sea' },
  plane: { n: 'Letadla', xp: 'air' },
};

export const SLOT_NAMES = {
  zbran: 'Hlavní zbraň', pancir: 'Pancíř', motor: 'Motor', dopl: 'Doplněk',
  vyzbroj: 'Výzbroj', ochrana: 'Ochrana', pohon: 'Pohon', drak: 'Drak',
};

export const DESIGN_TYPES = {
  ltanky: { cat: 'tank', n: 'Lehký tank', slots: ['zbran', 'pancir', 'motor', 'dopl'] },
  mtanky: { cat: 'tank', n: 'Střední tank', slots: ['zbran', 'pancir', 'motor', 'dopl'] },
  htanky: { cat: 'tank', n: 'Těžký tank', slots: ['zbran', 'pancir', 'motor', 'dopl'] },
  dd: { cat: 'ship', n: 'Torpédoborec', slots: ['vyzbroj', 'ochrana', 'pohon', 'dopl'] },
  ca: { cat: 'ship', n: 'Křižník', slots: ['vyzbroj', 'ochrana', 'pohon', 'dopl'] },
  bb: { cat: 'ship', n: 'Bitevní loď', slots: ['vyzbroj', 'ochrana', 'pohon', 'dopl'] },
  ss: { cat: 'ship', n: 'Ponorka', slots: ['vyzbroj', 'pohon', 'dopl'] },
  cv: { cat: 'ship', n: 'Letadlová loď', slots: ['ochrana', 'pohon', 'dopl'] },
  sti: { cat: 'plane', n: 'Stíhací letoun', slots: ['vyzbroj', 'motor', 'drak', 'dopl'] },
  bit: { cat: 'plane', n: 'Bitevní letoun', slots: ['vyzbroj', 'motor', 'drak', 'dopl'] },
  tac: { cat: 'plane', n: 'Taktický bombardér', slots: ['vyzbroj', 'motor', 'drak', 'dopl'] },
  str: { cat: 'plane', n: 'Strategický bombardér', slots: ['vyzbroj', 'motor', 'drak', 'dopl'] },
  pal: { cat: 'plane', n: 'Palubní letoun', slots: ['vyzbroj', 'motor', 'drak', 'dopl'] },
};
export const DESIGN_TYPE_IDS = Object.keys(DESIGN_TYPES);

const m = (cat, slot, n, unlock, fx, extra = {}) => ({ cat, slot, n, unlock, fx, ...extra });

export const MODULES = {
  // ---- tanky ----
  tk_kul: m('tank', 'zbran', 'Kulomety', null, { atk: -0.05, cost: -0.05 }, { only: ['ltanky'] }),
  tk_kan_l: m('tank', 'zbran', 'Lehký kanón', null, { atk: 0.05, cost: 0.04 }),
  tk_kan_s: m('tank', 'zbran', 'Střední kanón', 'mtank', { atk: 0.12, cost: 0.1 }),
  tk_houf: m('tank', 'zbran', 'Krátká houfnice', 'art_sp', { atk: 0.08, def: 0.04, cost: 0.08 }),
  tk_kan_d: m('tank', 'zbran', 'Dlouhý kanón', 'mtank2', { atk: 0.2, cost: 0.16 }, { only: ['mtanky', 'htanky'] }),
  tk_plam: m('tank', 'zbran', 'Plamenomet', 'tank_plam', { atk: 0.1, def: -0.02, cost: 0.06 }),
  tk_kan_t: m('tank', 'zbran', 'Těžký kanón', 'htank2', { atk: 0.28, speed: -0.04, cost: 0.24 }, { only: ['htanky'] }),
  pan_nyt: m('tank', 'pancir', 'Nýtovaný pancíř', null, { armor: 0.08, def: 0.02, speed: -0.03, cost: 0.05 }),
  pan_svar: m('tank', 'pancir', 'Svařovaný pancíř', 'ltank3', { armor: 0.14, def: 0.04, speed: -0.04, cost: 0.08 }),
  pan_lit: m('tank', 'pancir', 'Litá věž a korba', 'htank', { armor: 0.18, def: 0.05, speed: -0.06, cost: 0.1 }),
  pan_sik: m('tank', 'pancir', 'Šikmý pancíř', 'tank_sik', { armor: 0.22, def: 0.06, speed: -0.05, cost: 0.12 }),
  mot_vyk: m('tank', 'motor', 'Výkonný motor', 'tank_sus', { speed: 0.08, cost: 0.05 }),
  mot_diesel: m('tank', 'motor', 'Dieselový motor', 'tank_diesel', { speed: 0.05, def: 0.02, cost: 0.04 }),
  tk_rad: m('tank', 'dopl', 'Tankové rádio', 'tank_rad', { atk: 0.03, cost: 0.02 }),
  tk_opt: m('tank', 'dopl', 'Dálkoměr a optika', 'tank_opt', { atk: 0.05, cost: 0.03 }),
  tk_zast: m('tank', 'dopl', 'Pancéřové zástěrky', 'tank_sik', { armor: 0.04, def: 0.05, speed: -0.02, cost: 0.03 }),
  // ---- lodě ----
  lv_tor: m('ship', 'vyzbroj', 'Torpédomety', null, { atk: 0.08, cost: 0.05 }, { only: ['dd', 'ca', 'ss'] }),
  lv_rych: m('ship', 'vyzbroj', 'Rychlopalná děla', 'dd3', { atk: 0.12, cost: 0.08 }, { only: ['dd', 'ca', 'bb'] }),
  lv_tez: m('ship', 'vyzbroj', 'Těžká děla', 'bb2', { atk: 0.2, cost: 0.15 }, { only: ['ca', 'bb'] }),
  lv_mag: m('ship', 'vyzbroj', 'Magnetická torpéda', 'nav_torp', { atk: 0.12, cost: 0.06 }, { only: ['dd', 'ss'] }),
  lo_pas: m('ship', 'ochrana', 'Pancéřový pás', null, { hp: 0.1, cost: 0.08 }),
  lo_prot: m('ship', 'ochrana', 'Protitorpédová ochrana', 'ca2', { hp: 0.08, cost: 0.05 }),
  lo_tez: m('ship', 'ochrana', 'Těžký pancíř', 'bb3', { hp: 0.2, cost: 0.15 }, { only: ['ca', 'bb', 'cv'] }),
  lp_turb: m('ship', 'pohon', 'Parní turbíny', 'dd2', { atk: 0.03, cost: 0.04 }),
  lp_kotle: m('ship', 'pohon', 'Vysokotlaké kotle', 'ca3', { atk: 0.05, hp: 0.03, cost: 0.06 }),
  ld_sonar: m('ship', 'dopl', 'Sonar', 'nav_sonar', { atk: 0.04, cost: 0.02 }),
  ld_radar: m('ship', 'dopl', 'Lodní radar', 'nav_radar', { atk: 0.06, cost: 0.03 }),
  ld_pl: m('ship', 'dopl', 'Protiletadlová výzbroj', 'art_pl2', { hp: 0.06, cost: 0.03 }),
  ld_hang: m('ship', 'dopl', 'Větší hangár', 'cv2', { atk: 0.08, cost: 0.04 }, { only: ['cv'] }),
  // ---- letadla ----
  la_kan: m('plane', 'vyzbroj', 'Letecké kanóny', 'sti2', { atk: 0.1, cas: 0.05, cost: 0.06 }),
  la_tez: m('plane', 'vyzbroj', 'Těžké kanóny', 'bit3', { cas: 0.15, atk: 0.04, cost: 0.08 }, { only: ['bit', 'tac', 'pal'] }),
  la_bomb: m('plane', 'vyzbroj', 'Velké pumovnice', 'tac2', { bomb: 0.15, cost: 0.08 }, { only: ['tac', 'str', 'pal'] }),
  la_rak: m('plane', 'vyzbroj', 'Neřízené rakety', 'el_rak', { cas: 0.12, cost: 0.06 }),
  lm_vyk: m('plane', 'motor', 'Výkonný motor', 'air_kys', { atk: 0.08, cas: 0.03, bomb: 0.03, cost: 0.06 }),
  lm_turbo: m('plane', 'motor', 'Turbokompresor', 'air_turbo', { atk: 0.1, bomb: 0.05, cost: 0.08 }),
  lm_jet: m('plane', 'motor', 'Proudový motor', 'sti4', { atk: 0.2, cost: 0.2 }, { only: ['sti', 'tac'] }),
  ld_kov: m('plane', 'drak', 'Celokovový drak', 'sti2', { atk: 0.04, cas: 0.02, bomb: 0.02, cost: 0.04 }),
  ld_pan: m('plane', 'drak', 'Pancéřovaná kabina', 'air_pan', { cas: 0.08, atk: 0.03, cost: 0.05 }),
  ld_nadr: m('plane', 'drak', 'Přídavné nádrže', 'air_nadr', { bomb: 0.05, atk: 0.03, cost: 0.03 }),
  lx_rad: m('plane', 'dopl', 'Radiostanice', 'air_rad', { atk: 0.03, cas: 0.03, cost: 0.02 }),
  lx_zam: m('plane', 'dopl', 'Zaměřovač pum', 'tac3', { bomb: 0.08, cost: 0.03 }, { only: ['tac', 'str', 'pal'] }),
  lx_radar: m('plane', 'dopl', 'Palubní radar', 'el_radar2', { atk: 0.06, cost: 0.04 }),
};
export const MODULE_IDS = Object.keys(MODULES);

/** Klíče účinků modulů s českým popisem. */
export const DESIGN_STATS = { atk: 'útok', def: 'obrana', armor: 'pancíř', speed: 'rychlost', hp: 'odolnost', cas: 'podpora boje', bomb: 'bombardování', cost: 'cena výroby' };
