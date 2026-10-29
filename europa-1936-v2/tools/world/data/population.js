// Přibližný počet obyvatel zemí v r. 1936 v hranicích naší mapy (v tisících). Vlastní odhady; slouží k rozdělení lidí do provincií a států.
// POP_1936 = hlavní území země bez oblastí uvedených v POP_AREAS (kolonie a závislá území se počítají zvlášť, aby se jejich lidé nepřelévali do mateřské země).
export const POP_1936 = {
  GER: 67400, FRA: 41900, ENG: 47500, IRE: 2950, HOL: 8600, BEL: 8300, LUX: 300, SWI: 4200, AUS: 6750, ITA: 43100, SPR: 24500, POR: 7000,
  DEN: 3700, NOR: 2900, SWE: 6300, FIN: 3700, EST: 1130, LAT: 1950, LIT: 2400, POL: 34000, CZE: 15300, HUN: 8900, ROM: 19500, YUG: 15000,
  BUL: 6200, GRE: 6900, ALB: 1000, TUR: 17000, ICE: 120, SOV: 148000, EGY: 15900, IRQ: 3600, PER: 14800, SAU: 3500, OMA: 500,
};

// Zámořská a závislá území: vlastník → [[názvy strategických regionů, počet obyvatel v tisících], ...]
export const POP_AREAS = {
  FRA: [
    [['Tunisko'], 2600],
    [['Alžírské pobřeží', 'Alžírská Sahara'], 7200],
    [['Marocký Atlas', 'Marocký Atlantik', 'Saharský jih Maroka'], 6000],
    [['Syrské pobřeží a Libanon', 'Syrská poušť'], 3600],
  ],
  ITA: [[['Tripolitánie', 'Kyrenaika', 'Fezzan'], 800]],
  ENG: [[['Palestina a Zajordání'], 1700], [['Kypr'], 350], [['Sicílie a Malta'], 250], [['Hasa a zálivské pobřeží'], 350]],
  SPR: [[['Marocký Atlas', 'Marocký Atlantik', 'Saharský jih Maroka'], 800]],
};

// Váhy hustoty osídlení podle terénu (venkovské obyvatelstvo se dělí podle plochy × váha × hustota regionu)
export const TERRAIN_DENSITY = { plains: 1.0, forest: 0.55, hills: 0.65, mountains: 0.18, marsh: 0.35, desert: 0.04, urban: 1.0 };

// Relativní hustota osídlení regionu: výchozí podle podnebí, výjimky podle názvu regionu
export const CLIMATE_DENSITY = { oceanic: 1.3, temperate: 1.2, continental: 1.0, mediterranean: 0.9, steppe: 0.7, alpine: 0.4, semiarid: 0.3, desert: 0.1, subarctic: 0.25, arctic: 0.06 };
export const REGION_DENSITY = {
  'Nízké země': 3.0, 'Porýní a Porúří': 2.2, 'Severní Anglie': 1.6, 'Jižní Anglie': 2.0, 'Pádská nížina': 1.8, 'Nilská delta': 8, 'Horní Egypt': 3, 'Libyjská poušť': 0.05, 'Sinaj': 0.1,
  'Moskva a střední Rusko': 1.6, 'Černozem': 1.4, 'Pravobřežní Ukrajina': 1.7, 'Levobřežní Ukrajina': 1.5, 'Donbas a Azov': 1.5, 'Bělorusko': 1.1, 'Polesí a Volyň': 1.3,
  'Střední Povolží': 1.2, 'Dolní Povolží': 0.6, 'Severní Rusko': 0.2, 'Archangelsk a Pečora': 0.06, 'Jižní Ural': 0.5, 'Severní Ural': 0.1, 'Západní Kazachstán': 0.03,
  'Turkmenistán': 0.02, 'Aralsko': 0.05, 'Zakavkazsko': 1.6, 'Kuban a severní Kavkaz': 1.4, 'Černomoří a Krym': 1.0, 'Leningradská oblast': 1.0,
  'Maďarská nížina': 1.4, 'Malopolsko a Halič': 1.5, 'Čechy': 1.6, 'Morava a Slovensko': 1.5, 'Slezsko': 1.8, 'Střední Německo': 1.5,
  'Alžírské pobřeží': 1.8, 'Tunisko': 1.5, 'Marocký Atlantik': 1.6, 'Libanon': 1.5, 'Syrské pobřeží a Libanon': 1.8,
  'Íránská plošina': 0.15, 'Chuzestán a Perský záliv': 0.5, 'Baluchistán': 0.1, 'Elburz a Kaspik': 1.8, 'Zagros': 0.7, 'Jižní Mezopotámie': 0.9, 'Severní Mezopotámie': 0.9,
  'Hidžáz': 0.15, 'Nadžd': 0.1, 'Hasa a zálivské pobřeží': 0.15, 'Omán': 0.1,
};
