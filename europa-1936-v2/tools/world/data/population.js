// Přibližný počet obyvatel zemí v r. 1936 v hranicích naší mapy (v tisících). Vlastní odhady; slouží k rozdělení lidí do provincií a států.
// POP_1936 = hlavní území země bez oblastí uvedených v POP_AREAS (kolonie a závislá území se počítají zvlášť, aby se jejich lidé nepřelévali do mateřské země).
export const POP_1936 = {
  GER: 67400, FRA: 41900, ENG: 47500, IRE: 2950, HOL: 8600, BEL: 8300, LUX: 300, SWI: 4200, AUS: 6750, ITA: 43100, SPR: 24500, POR: 7000,
  DEN: 3700, NOR: 2900, SWE: 6300, FIN: 3700, EST: 1130, LAT: 1950, LIT: 2400, POL: 34000, CZE: 15300, HUN: 8900, ROM: 19500, YUG: 15000,
  BUL: 6200, GRE: 6900, ALB: 1000, TUR: 17000, ICE: 120, SOV: 148000, EGY: 15900, IRQ: 3600, PER: 14800, SAU: 3500, OMA: 500,
  // W1: zbytek světa
  USA: 128000, CAN: 10900, MEX: 18500, GUA: 2200, HON: 1000, ELS: 1600, NIC: 900, COS: 600, PAN: 550, CUB: 4200, HAI: 2800, DOM: 1500,
  COL: 8700, VEN: 3500, ECU: 2600, PRU: 6500, BOL: 3000, CHL: 4600, ARG: 12700, URG: 2000, PAR: 1000, BRA: 40000,
  ETH: 10000, LBR: 1500, SAF: 9900, JAP: 69500, MAN: 34000, CHI: 440000, PRC: 1500, SIK: 4000, TIB: 1200, MON: 750, TAN: 70,
  SIA: 14000, AFG: 10000, RAJ: 360000, NEP: 5600, YEM: 3500, PHI: 15500, AST: 6800, NZL: 1600,
};

// Zámořská a závislá území: vlastník → [[názvy strategických regionů, počet obyvatel v tisících], ...]
export const POP_AREAS = {
  FRA: [
    [['Tunisko'], 2600],
    [['Alžírské pobřeží', 'Alžírská Sahara'], 7200],
    [['Marocký Atlas', 'Marocký Atlantik', 'Saharský jih Maroka'], 6000],
    [['Syrské pobřeží a Libanon', 'Syrská poušť'], 3600],
    // W1: kolonie mimo původní rámec
    [['Guyany', 'Malé Antily'], 560], [['Mauritánie', 'Senegambie', 'Guinejské pobřeží', 'Pobřeží slonoviny a Zlaté pobřeží', 'Niger', 'Sahara střední', 'Nigérie', 'Severní Nigérie'], 15500],
    [['Čad', 'Tibesti a Borku', 'Kamerun', 'Ubangi', 'Gabon a Kongo', 'Kordofán a Dárfúr', 'Západní Kongo', 'Konžská pánev'], 5800], [['Džibuti a Afarsko'], 70], [['Madagaskar', 'Maskarény'], 4100],
    [['Tonkin a Laos', 'Annam', 'Kočinčína a Kambodža'], 23000], [['Melanésie', 'Polynésie', 'Havaj'], 100],
  ],
  ITA: [[['Tripolitánie', 'Kyrenaika', 'Fezzan', 'Tibesti a Borku', 'Libyjská poušť'], 800], [['Eritrea', 'Somálsko', 'Ogaden', 'Džibuti a Afarsko', 'Etiopská vysočina', 'Keňa a Uganda'], 1600]],
  ENG: [
    [['Palestina a Zajordání'], 1700], [['Kypr'], 350], [['Sicílie a Malta'], 250], [['Hasa a zálivské pobřeží'], 350],
    // W1
    [['Labrador a Newfoundland', 'Atlantská Kanada', 'Québec'], 290], [['Velké Antily', 'Malé Antily', 'Bahamy a Bermudy', 'Střední Amerika', 'Guyany', 'Yucatán', 'Venezuela', 'Atlantské pobřeží', 'Florida'], 2500],
    [['Falklandy', 'Ohňová země', 'Jižní oceán'], 3],
    [['Senegambie', 'Guinejské pobřeží', 'Pobřeží slonoviny a Zlaté pobřeží', 'Nigérie', 'Severní Nigérie', 'Niger', 'Kamerun', 'Čad'], 25700],
    [['Severní Súdán', 'Kordofán a Dárfúr', 'Jižní Súdán', 'Eritrea'], 6000],
    [['Keňa a Uganda', 'Tanganika', 'Somálsko', 'Ogaden', 'Džibuti a Afarsko', 'Etiopská vysočina', 'Východní Kongo'], 12500],
    [['Rhodesie', 'Kalahari', 'Transvaal', 'Natal', 'Mosambik', 'Katanga', 'Angola'], 5300],
    [['Jemen', 'Hadramaut', 'Rub al-Chálí'], 600], [['Cejlon'], 5600], [['Jižní Indie', 'Lakadivy'], 80], [['Barma', 'Tenasserim', 'Ásám', 'Bengálsko', 'Jün-nan a Kuej-čou'], 15000],
    [['Malajsko', 'Siam'], 4700], [['Borneo'], 900], [['Kuang-tung a Kuang-si', 'Jihovýchodní Čína'], 1000], [['Maskarény', 'Madagaskar'], 450],
    [['Melanésie', 'Šalamounovy ostrovy', 'Polynésie', 'Mikronésie', 'Bismarckovo souostroví'], 450],
  ],
  SPR: [[['Marocký Atlas', 'Marocký Atlantik', 'Saharský jih Maroka'], 800], [['Kanárské ostrovy a Madeira'], 680], [['Mauritánie'], 40], [['Gabon a Kongo', 'Kamerun'], 170]],
  HOL: [[['Guyany', 'Malé Antily', 'Venezuela'], 250], [['Sumatra', 'Jáva', 'Borneo', 'Celebes', 'Moluky a Malé Sundy', 'Nová Guinea', 'Malajsko'], 61000]],
  BEL: [[['Západní Kongo', 'Konžská pánev', 'Východní Kongo', 'Katanga', 'Keňa a Uganda', 'Tanganika', 'Angola', 'Ubangi', 'Rhodesie'], 13500]],
  POR: [
    [['Azory', 'Kanárské ostrovy a Madeira', 'Kapverdy'], 750],
    [['Senegambie', 'Guinejské pobřeží', 'Gabon a Kongo', 'Západní Kongo', 'Angola', 'Mosambik', 'Rhodesie', 'Kalahari', 'Transvaal', 'Natal', 'Tanganika', 'Katanga', 'Jihozápadní Afrika'], 8000],
    [['Moluky a Malé Sundy', 'Kuang-tung a Kuang-si', 'Jihovýchodní Čína'], 600],
  ],
  DEN: [[['Grónsko'], 17]],
  SOV: [
    [['Kazachstán', 'Sedmiříčí', 'Turkestán', 'Pamír a Ťan-šan', 'Dzungarie'], 12000],
    [['Západní Sibiř', 'Jamal a Tazovsko', 'Altaj a Kuzbas', 'Jenisej', 'Tajmyr', 'Pobajkalí', 'Zabajkalí', 'Lena', 'Jakutsko', 'Severní Jakutsko', 'Kolyma',
      'Ochotsko', 'Kamčatka', 'Čukotka', 'Amur', 'Přímoří', 'Sachalin', 'Mongolsko', 'Tuva', 'Severní Mandžusko'], 13000],
  ],
  JAP: [[['Korea', 'Severní Korea', 'Severní Mandžusko', 'Jižní Mandžusko'], 22000], [['Rjúkjú a Tchaj-wan'], 5800], [['Sachalin'], 330], [['Mikronésie', 'Filipíny'], 100]],
  USA: [[['Havaj'], 380], [['Aljaška', 'Yukon a Mackenzie', 'Čukotka'], 60], [['Velké Antily', 'Malé Antily'], 1750], [['Mikronésie', 'Polynésie'], 30]],
  AST: [[['Nová Guinea', 'Bismarckovo souostroví', 'Šalamounovy ostrovy'], 1500]],
  NZL: [[['Polynésie', 'Melanésie'], 60]],
  SAF: [[['Jihozápadní Afrika', 'Kalahari', 'Angola'], 360]],
  RAJ: [[['Andamany'], 25], [['Himálaj'], 300]],
};

// Váhy hustoty osídlení podle terénu (venkovské obyvatelstvo se dělí podle plochy × váha × hustota regionu)
export const TERRAIN_DENSITY = { plains: 1.0, forest: 0.55, hills: 0.65, mountains: 0.18, marsh: 0.35, desert: 0.04, urban: 1.0 };

// Relativní hustota osídlení regionu: výchozí podle podnebí, výjimky podle názvu regionu
export const CLIMATE_DENSITY = { oceanic: 1.3, temperate: 1.2, continental: 1.0, mediterranean: 0.9, steppe: 0.7, alpine: 0.4, semiarid: 0.3, desert: 0.1, subarctic: 0.25, arctic: 0.06, tropical: 0.8, monsoon: 1.4 };
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
