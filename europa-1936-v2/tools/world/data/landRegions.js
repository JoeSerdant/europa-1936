// Pevninské strategické regiony: [název, lon, lat, podnebí]. Každá provincie patří k regionu s nejbližším středem
// (geodeticky po pevnině). Podnebí určuje počasí (déšť, sníh, bahno, mráz) – viz pozdější milníky.
// Podnebí: oceanic, temperate, continental, subarctic, arctic, mediterranean, steppe, semiarid, desert, alpine.
export const LAND_REGIONS = [
  // Britské ostrovy
  ['Irsko', -8.0, 53.2, 'oceanic'], ['Skotsko', -4.3, 56.8, 'oceanic'], ['Severní Anglie', -2.3, 54.2, 'oceanic'],
  ['Wales a západ Anglie', -3.5, 52.0, 'oceanic'], ['Jižní Anglie', -0.9, 51.4, 'oceanic'],
  // Iberie
  ['Galicie a Kantábrie', -6.5, 43.0, 'oceanic'], ['Portugalsko', -8.2, 39.5, 'mediterranean'], ['Kastilská Meseta', -4.0, 40.5, 'mediterranean'],
  ['Katalánsko a Aragonie', 0.5, 41.5, 'mediterranean'], ['Andalusie', -4.5, 37.5, 'mediterranean'], ['Valencie a Murcia', -0.8, 39.0, 'mediterranean'],
  // Francie a Benelux
  ['Bretaň a Normandie', -2.0, 48.5, 'oceanic'], ['Severní Francie', 2.5, 49.8, 'oceanic'], ['Pařížská pánev', 2.3, 48.0, 'temperate'],
  ['Lotrinsko a Alsasko', 6.0, 48.7, 'temperate'], ['Akvitánie', -0.5, 44.5, 'oceanic'], ['Francouzský masiv', 3.0, 45.3, 'temperate'],
  ['Provence a Languedoc', 4.5, 43.8, 'mediterranean'], ['Rhônské Alpy', 5.8, 45.5, 'alpine'], ['Nízké země', 4.8, 51.8, 'oceanic'],
  // Německo, Alpy
  ['Severní Německo', 10.0, 53.5, 'oceanic'], ['Porýní a Porúří', 7.5, 51.0, 'temperate'], ['Střední Německo', 11.0, 51.0, 'temperate'],
  ['Bavorsko', 11.5, 48.8, 'temperate'], ['Braniborsko a Pomořansko', 14.0, 52.8, 'continental'], ['Slezsko', 16.8, 51.0, 'continental'],
  ['Východní Prusko', 21.0, 54.2, 'continental'], ['Švýcarsko a Alpy', 8.5, 46.8, 'alpine'], ['Rakouské Alpy', 13.5, 47.2, 'alpine'],
  ['Podunají a Vídeň', 16.0, 48.2, 'temperate'],
  // střední Evropa
  ['Čechy', 15.0, 49.9, 'temperate'], ['Morava a Slovensko', 17.8, 49.0, 'temperate'], ['Malopolsko a Halič', 21.5, 49.9, 'continental'],
  ['Mazovsko a Podlaší', 21.5, 52.4, 'continental'], ['Velkopolsko a Pomoří', 17.5, 52.5, 'continental'], ['Maďarská nížina', 19.5, 47.0, 'continental'],
  ['Zakarpatí', 23.2, 48.5, 'alpine'], ['Sedmihradsko', 24.5, 46.0, 'continental'], ['Valašsko a Moldávie', 26.5, 45.0, 'continental'],
  // Balkán
  ['Slovinsko a Chorvatsko', 15.5, 45.8, 'temperate'], ['Bosna a Dalmácie', 17.5, 43.8, 'mediterranean'], ['Srbsko', 20.8, 44.0, 'continental'],
  ['Makedonie a Albánie', 21.0, 41.2, 'mediterranean'], ['Bulharsko', 25.0, 42.7, 'continental'], ['Řecko', 22.0, 39.0, 'mediterranean'],
  ['Kréta a Egejské ostrovy', 25.0, 35.6, 'mediterranean'],
  // Itálie
  ['Pádská nížina', 10.0, 45.2, 'temperate'], ['Střední Itálie', 12.2, 43.0, 'mediterranean'], ['Jižní Itálie', 16.0, 40.0, 'mediterranean'],
  ['Sicílie a Malta', 14.0, 37.5, 'mediterranean'], ['Sardinie a Korsika', 9.0, 40.8, 'mediterranean'],
  // sever
  ['Dánsko', 10.0, 56.0, 'oceanic'], ['Jižní Norsko', 8.5, 60.5, 'alpine'], ['Střední Norsko', 12.0, 64.0, 'subarctic'], ['Severní Norsko', 19.0, 69.0, 'arctic'],
  ['Jižní Švédsko', 14.0, 57.5, 'temperate'], ['Střední Švédsko', 16.0, 60.0, 'continental'], ['Severní Švédsko', 19.0, 66.5, 'subarctic'],
  ['Jižní Finsko', 25.0, 61.0, 'continental'], ['Severní Finsko', 27.0, 66.0, 'subarctic'], ['Laponsko', 27.0, 69.0, 'arctic'],
  ['Karélie a Kola', 34.0, 65.5, 'subarctic'], ['Island', -19.0, 64.8, 'arctic'],
  // Pobaltí a Rusko
  ['Estonsko', 25.5, 58.8, 'continental'], ['Lotyšsko', 25.0, 56.8, 'continental'], ['Litva', 23.8, 55.2, 'continental'],
  ['Leningradská oblast', 32.0, 59.8, 'continental'], ['Bělorusko', 28.0, 53.5, 'continental'], ['Polesí a Volyň', 26.0, 51.0, 'continental'],
  ['Pravobřežní Ukrajina', 30.5, 49.5, 'continental'], ['Levobřežní Ukrajina', 35.5, 49.8, 'continental'], ['Donbas a Azov', 38.5, 47.8, 'steppe'],
  ['Černomoří a Krym', 33.0, 46.0, 'steppe'], ['Besarábie', 28.5, 47.0, 'continental'], ['Moskva a střední Rusko', 37.5, 55.5, 'continental'],
  ['Střední Povolží', 44.0, 56.0, 'continental'], ['Černozem', 39.5, 51.5, 'continental'], ['Dolní Povolží', 46.0, 49.0, 'steppe'],
  ['Severní Rusko', 40.0, 62.5, 'subarctic'], ['Archangelsk a Pečora', 47.0, 65.5, 'arctic'], ['Jižní Ural', 57.0, 54.0, 'continental'],
  ['Severní Ural', 58.0, 61.0, 'subarctic'], ['Kuban a severní Kavkaz', 40.0, 45.0, 'steppe'], ['Kavkazské hory', 44.0, 43.0, 'alpine'],
  ['Zakavkazsko', 45.5, 41.0, 'mediterranean'], ['Západní Kazachstán', 55.0, 48.0, 'semiarid'], ['Turkmenistán', 58.0, 40.0, 'desert'],
  ['Aralsko', 60.0, 44.0, 'desert'],
  // Turecko a Blízký východ
  ['Thrákie a Marmara', 28.0, 41.0, 'mediterranean'], ['Egejské Turecko', 28.0, 38.0, 'mediterranean'], ['Pontské pobřeží', 36.0, 41.0, 'oceanic'],
  ['Anatolská plošina', 33.0, 39.0, 'semiarid'], ['Cilicie a jih', 35.0, 37.0, 'mediterranean'], ['Východní Anatolie', 41.0, 39.5, 'alpine'],
  ['Kypr', 33.0, 35.0, 'mediterranean'], ['Syrské pobřeží a Libanon', 36.0, 34.5, 'mediterranean'], ['Syrská poušť', 39.5, 34.5, 'desert'],
  ['Palestina a Zajordání', 35.5, 31.8, 'semiarid'], ['Sinaj', 33.8, 29.8, 'desert'],
  ['Severní Mezopotámie', 43.0, 36.0, 'semiarid'], ['Jižní Mezopotámie', 45.5, 31.5, 'desert'], ['Zagros', 47.5, 34.0, 'alpine'],
  ['Elburz a Kaspik', 51.5, 36.5, 'temperate'], ['Íránská plošina', 55.0, 33.0, 'desert'], ['Chuzestán a Perský záliv', 50.0, 30.0, 'desert'],
  ['Baluchistán', 60.0, 28.5, 'desert'], ['Hidžáz', 39.5, 24.0, 'desert'], ['Nadžd', 44.0, 26.0, 'desert'], ['Hasa a zálivské pobřeží', 49.5, 26.0, 'desert'],
  ['Omán', 57.0, 23.5, 'desert'],
  // Egypt a severní Afrika
  ['Nilská delta', 31.0, 30.8, 'semiarid'], ['Horní Egypt', 32.0, 26.0, 'desert'], ['Libyjská poušť', 27.0, 27.0, 'desert'],
  ['Tripolitánie', 13.5, 32.3, 'mediterranean'], ['Kyrenaika', 21.5, 32.3, 'mediterranean'], ['Fezzan', 13.0, 27.0, 'desert'],
  ['Tunisko', 9.5, 35.0, 'mediterranean'], ['Alžírské pobřeží', 3.0, 36.3, 'mediterranean'], ['Alžírská Sahara', 4.0, 28.0, 'desert'],
  ['Marocký Atlas', -4.0, 33.5, 'alpine'], ['Marocký Atlantik', -7.0, 32.5, 'mediterranean'], ['Saharský jih Maroka', -8.0, 28.5, 'desert'],
];
