// S5a: konstrukční kanceláře (vlastní obdoba organizací pro vývoj výzbroje z HOI4). Země si v každém oboru najme jednu kancelář
// se zaměřením; kancelář sbírá zkušenosti z výroby svého oboru a s každou úrovní (1–`BUREAU.MAX`) přidá `per` × úroveň k násobkům
// výzbroje oboru (klíče jako v `DESIGN_STATS`; `cost` < 0 = levnější výroba). Vlastní jména a čísla.
export const BUREAU = { MAX: 4, PP: 50, XP_FAC: 0.5, XP_LV: 300 };   // XP_FAC = zkušenosti za továrnu na lince za den, XP_LV × úroveň = potřeba na další úroveň

/** Obory kanceláří a druhy výzbroje, na které působí. */
export const BUREAU_CATS = {
  inf: { n: 'Pěchotní výzbroj', icon: 'army', eq: ['pusky', 'dela', 'pdela', 'podpora'] },
  tank: { n: 'Obrněná technika', icon: 'attack', eq: ['ltanky', 'mtanky', 'htanky', 'vozy'] },
  plane: { n: 'Letectví', icon: 'air', eq: ['sti', 'bit', 'tac', 'str', 'pal', 'rak'] },
  ship: { n: 'Loďařství', icon: 'navy', eq: ['dd', 'ca', 'bb', 'ss', 'cv'] },
};

export const BUREAUS = {
  inf_strelna: { cat: 'inf', n: 'Střelecká zbrojovka', info: 'Přesné a spolehlivé zbraně: vyšší palebná síla pěchoty a dělostřelectva.', per: { atk: 0.02 } },
  inf_opevneni: { cat: 'inf', n: 'Zákopová dílna', info: 'Lehké kulomety a minomety pro obranu: lepší obrana.', per: { def: 0.02 } },
  inf_lisovna: { cat: 'inf', n: 'Lisovna a montáž', info: 'Zjednodušené zbraně z lisovaných dílů: levnější výroba.', per: { cost: -0.02 }, ai: true },
  tank_ocel: { cat: 'tank', n: 'Kancelář těžké oceli', info: 'Silné pancéřování a velké kanóny, za vyšší cenu.', per: { armor: 0.03, atk: 0.01, cost: 0.01 } },
  tank_manevr: { cat: 'tank', n: 'Konstruktéři manévru', info: 'Lehké a rychlé stroje pro průlom.', per: { speed: 0.02, atk: 0.01 } },
  tank_pas: { cat: 'tank', n: 'Pásová výrobní linka', info: 'Unifikované díly a sériová montáž: levnější tanky.', per: { cost: -0.02 }, ai: true },
  plane_stihac: { cat: 'plane', n: 'Konstrukce stíhaček', info: 'Silnější motory a výzbroj: lepší vzdušné souboje.', per: { atk: 0.02 } },
  plane_bomb: { cat: 'plane', n: 'Konstrukce bombardérů', info: 'Větší náklad a lepší zaměřovače.', per: { bomb: 0.02, cas: 0.02 } },
  plane_serie: { cat: 'plane', n: 'Letecká sériová výroba', info: 'Jednoduché draky ve velkých sériích: levnější letadla.', per: { cost: -0.02 }, ai: true },
  ship_pancir: { cat: 'ship', n: 'Loděnice pancéřových lodí', info: 'Silnější pancéřování a přepážky: odolnější lodě.', per: { hp: 0.02 } },
  ship_del: { cat: 'ship', n: 'Kancelář lodních děl', info: 'Rychlopalná děla a řízení palby.', per: { atk: 0.02 } },
  ship_sekce: { cat: 'ship', n: 'Sekční stavba lodí', info: 'Lodě ze svařovaných sekcí: levnější stavba.', per: { cost: -0.02 }, ai: true },
};
export const BUREAU_IDS = Object.keys(BUREAUS);
