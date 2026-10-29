// Prapory (liniové, stojí v pluku) a podpůrné roty (stojí v podpoře). Všechna čísla jsou vlastní a platí pro výzbroj úrovně 1.
//
//  w     šířka v bitvě (liniový prapor 2, podpora 0)            hp     síla (hit pointy)             org   organizace
//  men   lidská síla                                           days   doba výcviku ve dnech         spd   rychlost (pěšák = 4)
//  sup   spotřeba zásob za hodinu                              soft/hard  útok na měkké / tvrdé cíle  pierce  průraz
//  def   obrana                                                brk    průraz fronty (přemáhá obranu)  armor  pancíř   hardness  tvrdost 0–1
//  rec   průzkum (podpora)     eng   zakopávání (podpora)      need   výzbroj na jeden prapor
//  terr  { kód terénu | 'r' (řeka): { atk, def, mov } } – úpravy útoku, obrany a rychlosti v terénu
//  kind  druh výzbroje, kterou prapor „používá“ pro úroveň výzbroje (viz EQUIP_LEVEL_MULT)
//  unlock  null = k dispozici od začátku, jinak id technologie, která jednotku odemyká (data/research/techs.js)
//  sym   značka pro žeton na mapě

export const BATTALIONS = {
  pesi: {
    n: 'Pěší prapor', ab: 'PĚŠ', sym: 'inf', w: 2, hp: 20, org: 50, men: 900, days: 80, spd: 4, sup: 0.05,
    soft: 4.5, hard: 0.8, pierce: 3, def: 16, brk: 1.5, armor: 0, hardness: 0,
    need: { pusky: 90 }, kind: 'pusky', terr: {}, unlock: null,
    info: 'Základ každé armády. Pomalý, ale levný a vytrvalý; drží linii.',
  },
  jezdci: {
    n: 'Jízdní prapor', ab: 'JÍZ', sym: 'cav', w: 2, hp: 15, org: 45, men: 800, days: 70, spd: 8, sup: 0.06,
    soft: 3.2, hard: 0.5, pierce: 1.5, def: 10, brk: 3.5, armor: 0, hardness: 0,
    need: { pusky: 70 }, kind: 'pusky',
    terr: { 1: { atk: -0.2, mov: -0.3 }, 2: { atk: -0.1 }, 3: { atk: -0.3, mov: -0.3 }, 4: { atk: -0.2, mov: -0.3 }, 6: { atk: -0.2, def: -0.1 }, r: { atk: -0.1 } },
    unlock: null,
    info: 'Rychlý a levný, ale slabý v boji. Hodí se k zajištění křídel a pronásledování.',
  },
  horsti: {
    n: 'Horští střelci', ab: 'HOR', sym: 'mtn', w: 2, hp: 18, org: 60, men: 850, days: 110, spd: 4, sup: 0.05,
    soft: 4, hard: 0.7, pierce: 3, def: 16, brk: 1.5, armor: 0, hardness: 0,
    need: { pusky: 100 }, kind: 'pusky',
    terr: { 2: { atk: 0.15, def: 0.05, mov: 0.1 }, 3: { atk: 0.3, def: 0.1, mov: 0.2 } },
    unlock: null,
    info: 'Vycvičení pro hory a pahorkatiny: tam útočí a brání se lépe a pohybují se rychleji.',
  },
  motor: {
    n: 'Motorizovaný prapor', ab: 'MOT', sym: 'mot', w: 2, hp: 22, org: 45, men: 1000, days: 80, spd: 8, sup: 0.08,
    soft: 4.5, hard: 0.9, pierce: 3, def: 15, brk: 3, armor: 0, hardness: 0.1,
    need: { pusky: 90, auta: 35 }, kind: 'pusky',
    terr: { 1: { atk: -0.1, mov: -0.4 }, 3: { atk: -0.05 }, 4: { atk: -0.1, mov: -0.3 }, 6: { atk: -0.1 }, r: { atk: -0.1, mov: -0.1 } },
    unlock: null,
    info: 'Pěchota na nákladních autech: dvojnásobná rychlost, ale závislá na silnicích a zásobování.',
  },
  ltank: {
    n: 'Lehký tankový prapor', ab: 'LTK', sym: 'arm', w: 2, hp: 8, org: 30, men: 450, days: 100, spd: 8, sup: 0.12,
    soft: 10, hard: 7, pierce: 11, def: 3, brk: 17, armor: 9, hardness: 0.5,
    need: { ltanky: 40, podpora: 8 }, kind: 'ltanky',
    terr: { 1: { atk: -0.3, mov: -0.4 }, 2: { atk: -0.1 }, 3: { atk: -0.2 }, 4: { atk: -0.1, mov: -0.1 }, 6: { atk: -0.4, def: -0.1 }, r: { atk: -0.2, mov: -0.2 } },
    unlock: null,
    info: 'Ničí měkké cíle a prorazí slabou obranu. Málo sil, v lesích a městech zranitelný.',
  },
  // ---- odemyká výzkum (M20) ----
  mech: {
    n: 'Mechanizovaný prapor', ab: 'MEC', sym: 'mot', w: 2, hp: 26, org: 50, men: 1000, days: 100, spd: 8, sup: 0.14,
    soft: 5, hard: 3.5, pierce: 8, def: 20, brk: 5, armor: 8, hardness: 0.2,
    need: { pusky: 90, vozy: 40 }, kind: 'vozy',
    terr: { 1: { atk: -0.2 }, 3: { atk: -0.05 }, 4: { atk: -0.1 }, 6: { atk: -0.2, def: -0.05 }, r: { atk: -0.2, mov: -0.2 } },
    unlock: 'mech', info: 'Pěchota v obrněných transportérech.',
  },
  mtank: {
    n: 'Střední tankový prapor', ab: 'STK', sym: 'arm', w: 2, hp: 10, org: 35, men: 500, days: 120, spd: 8, sup: 0.18,
    soft: 15, hard: 13, pierce: 26, def: 5, brk: 30, armor: 26, hardness: 0.6,
    need: { mtanky: 40, podpora: 8 }, kind: 'mtanky',
    terr: { 1: { atk: -0.3, mov: -0.4 }, 2: { atk: -0.1 }, 3: { atk: -0.2 }, 4: { atk: -0.1, mov: -0.1 }, 6: { atk: -0.4, def: -0.1 }, r: { atk: -0.2, mov: -0.2 } },
    unlock: 'mtank', info: 'Páteř tankových divizí.',
  },
  htank: {
    n: 'Těžký tankový prapor', ab: 'TTK', sym: 'arm', w: 2, hp: 12, org: 30, men: 550, days: 140, spd: 6, sup: 0.26,
    soft: 18, hard: 18, pierce: 40, def: 8, brk: 28, armor: 42, hardness: 0.7,
    need: { htanky: 30, podpora: 10 }, kind: 'htanky',
    terr: { 1: { atk: -0.4, mov: -0.4 }, 2: { atk: -0.2 }, 3: { atk: -0.3 }, 4: { atk: -0.4, mov: -0.2 }, 6: { atk: -0.5, def: -0.2 }, r: { atk: -0.4, mov: -0.4 } },
    unlock: 'htank', info: 'Pomalý a žíznivý, ale téměř nezranitelný.',
  },
};

// Podpůrné roty: bez šířky, doplňují divizi (lze jich dát až 5). Zápory útoku jsou už zapracované v číslech.
export const SUPPORT = {
  ing: {
    n: 'Ženijní rota', ab: 'ŽEN', sym: 'eng', w: 0, hp: 2, org: 0, men: 200, days: 100, spd: 99, sup: 0.03,
    soft: 0.8, hard: 0, pierce: 0, def: 4, brk: 1.5, armor: 0, hardness: 0, eng: 1, rec: 0,
    need: { pusky: 20, podpora: 10 }, kind: 'pusky', terr: {}, unlock: null,
    info: 'Obránci se zakopávají rychleji a hlouběji. Zlepšuje průraz prvního náporu.',
  },
  del: {
    n: 'Dělostřelecká rota', ab: 'DĚL', sym: 'art', w: 0, hp: 3, org: 0, men: 350, days: 100, spd: 99, sup: 0.12,
    soft: 18, hard: 2.5, pierce: 8, def: 2, brk: 4, armor: 0, hardness: 0, eng: 0, rec: 0,
    need: { dela: 12 }, kind: 'dela', terr: {}, unlock: null,
    info: 'Největší zdroj útoku na měkké cíle v pěší divizi.',
  },
  pt: {
    n: 'Protitanková rota', ab: 'PT', sym: 'at', w: 0, hp: 2, org: 0, men: 250, days: 90, spd: 99, sup: 0.05,
    soft: 2, hard: 9, pierce: 22, def: 3, brk: 0, armor: 0, hardness: 0, eng: 0, rec: 0,
    need: { pdela: 12 }, kind: 'pdela', terr: {}, unlock: null,
    info: 'Zvyšuje průraz a útok na tvrdé cíle – proti tankům zásadní.',
  },
  zvid: {
    n: 'Průzkumná rota', ab: 'PRŮ', sym: 'rec', w: 0, hp: 2, org: 0, men: 200, days: 80, spd: 99, sup: 0.04,
    soft: 0.5, hard: 0, pierce: 0, def: 2, brk: 0, armor: 0, hardness: 0.05, eng: 0, rec: 1,
    need: { pusky: 10, vozy: 8 }, kind: 'vozy', terr: {}, unlock: null,
    info: 'Kdo vidí víc, bojuje lépe: převaha v průzkumu dává malý bonus v boji.',
  },
  spoj: {
    n: 'Spojovací rota', ab: 'SPO', sym: 'sig', w: 0, hp: 1, org: 0, men: 180, days: 100, spd: 99, sup: 0.03,
    soft: 0, hard: 0, pierce: 0, def: 2, brk: 0, armor: 0, hardness: 0, eng: 0, rec: 0.5, plan: 0.05,
    need: { podpora: 10 }, kind: 'pusky', terr: {}, unlock: 'spoj', info: 'Rychlejší plánování útoků armády.',
  },
  log: {
    n: 'Logistická rota', ab: 'LOG', sym: 'log', w: 0, hp: 1, org: 0, men: 220, days: 100, spd: 99, sup: 0.03,
    soft: 0, hard: 0, pierce: 0, def: 1, brk: 0, armor: 0, hardness: 0, eng: 0, rec: 0, supSave: 0.06,
    need: { auta: 12, podpora: 8 }, kind: 'auta', terr: {}, unlock: 'log', info: 'Divize spotřebuje méně zásob.',
  },
  nem: {
    n: 'Polní nemocnice', ab: 'NEM', sym: 'med', w: 0, hp: 1, org: 0, men: 240, days: 100, spd: 99, sup: 0.03,
    soft: 0, hard: 0, pierce: 0, def: 1, brk: 0, armor: 0, hardness: 0, eng: 0, rec: 0, healing: 0.25,
    need: { podpora: 12 }, kind: 'pusky', terr: {}, unlock: 'nem', info: 'Rychlejší doplňování síly po bojích.',
  },
};

export const ALL_UNITS = { ...BATTALIONS, ...SUPPORT };

/** Kolik pluků (sloupců) a praporů v pluku šablona smí mít, kolik podpůrných rot. */
export const GRID = { cols: 5, rows: 5, support: 5 };
