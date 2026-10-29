// Druhy výzbroje, které se hromadí ve skladech zemí a spotřebovávají při tvorbě a doplňování divizí.
// Statistiky bojové síly nejsou u kusů, ale u praporů (battalions.js); úroveň výzbroje (generace, `mil.lv`) je násobí; vyšší úrovně přináší výzkum (M20).
// `unlock`: null = od začátku, jinak id technologie, která výzbroj odemyká (data/research/techs.js).

export const EQUIP = {
  pusky:   { n: 'Pušky a kulomety', ab: 'PUŠ', unlock: null },
  dela:    { n: 'Polní děla', ab: 'DĚL', unlock: null },
  pdela:   { n: 'Protitanková děla', ab: 'PTD', unlock: null },
  auta:    { n: 'Nákladní automobily', ab: 'AUT', unlock: null },
  vozy:    { n: 'Obrněná vozidla', ab: 'OBV', unlock: null },
  ltanky:  { n: 'Lehké tanky', ab: 'LTK', unlock: null },
  mtanky:  { n: 'Střední tanky', ab: 'STK', unlock: 'mtank' },
  htanky:  { n: 'Těžké tanky', ab: 'TTK', unlock: 'htank' },
  podpora: { n: 'Podpůrná výzbroj', ab: 'POD', unlock: null },
};

export const EQUIP_IDS = Object.keys(EQUIP);

/** Násobek bojových hodnot podle úrovně výzbroje (index = úroveň − 1). Jen úroveň 1 je zatím dostupná. */
export const EQUIP_LEVEL_MULT = [1, 1.3, 1.65, 2.0];
