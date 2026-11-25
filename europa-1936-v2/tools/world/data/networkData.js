// Doplňkové údaje pro síť: námořní základny, ruční průlivová spojení a hustota železnic podle země.

// Města, která jsou přístavem/základnou úrovně aspoň N bez ohledu na počet obyvatel: [název města, úroveň]
export const PORT_BOOST = [
  ['Valletta', 4], ['Gibraltar', 3], ['Portsmouth', 4], ['Plymouth', 3], ['Rosyth', 2], ['Kirkwall', 2], ['Wilhelmshaven', 3], ['Kiel', 3], ['Brest', 3],
  ['Toulon', 4], ['La Spezia', 3], ['Taranto', 3], ['Pola', 2], ['Sevastopol', 4], ['Kronštadt', 3], ['Murmansk', 3], ['Haifa', 3], ['Alexandrie', 4],
  ['Tobruk', 2], ['Bengází', 2], ['Tripolis', 3], ['Bizerta', 3], ['Oran', 3], ['Kotor', 2], ['Split', 2], ['Rijeka', 3], ['Cuxhaven', 2],
  ['Stralsund', 2], ['Pillau', 2], ['Liepāja', 3], ['Ventspils', 2], ['Pärnu', 1], ['Baku', 4], ['Basra', 3], ['Bandar Abbás', 2], ['Maskat', 2], ['Kuvajt', 2],
  ['Famagusta', 2], ['Souda', 2], ['Pireus', 4], ['Bergen', 3], ['Narvik', 2], ['Trondheim', 2], ['Harstad', 1], ['Tromsø', 1], ['Reykjavík', 3],
  ['Cartagena', 3], ['Ferrol', 3], ['Cádiz', 3], ['Lorient', 2], ['Cherbourg', 3], ['Dunkerque', 3], ['Le Havre', 3],
  // W1: námořní základny světa
  ['Honolulu', 4], ['San Diego', 4], ['Norfolk', 4], ['San Francisco', 4], ['Seattle', 3], ['New York', 3], ['Los Angeles', 3], ['Nový Orleans', 2],
  ['Juneau', 1], ['Anchorage', 1], ['Agaña', 2], ['Midway', 1], ['Wake', 1], ['San Juan', 2], ['Halifax', 3], ['Saint John’s', 2], ['Hamilton (Bermudy)', 2],
  ['Jokosuka', 4], ['Kure', 4], ['Sasebo', 4], ['Maizuru', 3], ['Ósaka', 2], ['Kóbe', 3], ['Nagasaki', 2], ['Hakodate', 2], ['Naha', 2], ['Tojohara', 1],
  ['Saipan', 2], ['Truk', 4], ['Koror', 2], ['Kwajalein', 2], ['Iwodžima', 1], ['Čemulpo', 2], ['Fusan', 3], ['Gensan', 1], ['Takao', 2], ['Kíró', 2],
  ['Dairen', 3], ['Port Arthur', 3], ['Šanghaj', 3], ['Čching-tao', 2], ['Amoy', 1], ['Vladivostok', 4], ['Petropavlovsk-Kamčatskij', 2], ['Ochotsk', 1],
  ['Singapur', 4], ['Hongkong', 4], ['Manila', 3], ['Cebu', 1], ['Surabaja', 3], ['Batávie', 2], ['Saigon', 3], ['Haiphong', 2], ['Rangún', 2],
  ['Trincomalee', 3], ['Kolombo', 3], ['Bombaj', 3], ['Karáčí', 2], ['Kalkata', 2], ['Madrás', 2], ['Aden', 3], ['Džibuti', 2], ['Massawa', 2],
  ['Mogadišo', 1], ['Mombasa', 2], ['Diego-Suarez', 3], ['Kapské Město', 4], ['Durban', 2], ['Freetown', 3], ['Dakar', 3], ['Lagos', 2],
  ['Darwin', 2], ['Sydney', 4], ['Brisbane', 2], ['Perth', 2], ['Rabaul', 2], ['Port Moresby', 1], ['Nouméa', 2], ['Suva', 2], ['Tarawa', 1],
  ['Auckland', 2], ['Wellington', 2], ['Rio de Janeiro', 3], ['Buenos Aires', 3], ['Montevideo', 2], ['Valparaíso', 3], ['Callao', 2], ['Recife', 2],
  ['Colón', 3], ['Panama', 2], ['Kingston', 2], ['Santiago de Cuba', 2], ['Port of Spain', 2], ['Veracruz', 2], ['Stanley', 1],
];

// Ruční spojení přes úžiny, které detekce nezachytí: [název, [lon, lat] strany A, [lon, lat] strany B]
export const STRAIT_EXTRA = [
  ['Velký Belt', [11.14, 55.33], [10.79, 55.31]],
  ['Öresund', [12.57, 55.68], [13.0, 55.6]],
  // W1
  ['Gibraltarský průliv', [-5.6, 36.0], [-5.4, 35.8]],
  ['Messinský průliv', [15.6, 38.2], [15.7, 38.0]],
];

// Dvojice provincií (podle jmen) nesmějí mít průlivové spojení: [jméno A, jméno B]
export const STRAIT_SKIP = [];

// Hustota železnic podle vlastníka: korekce úrovně (0 = západní standard, záporné = řidší, ≤ -3 = žádné)
export const RAIL_FACTOR = {
  GER: 0, FRA: 0, ENG: 0, BEL: 0, HOL: 0, LUX: 0, SWI: 0, CZE: 0, AUS: 0, ITA: 0, DEN: 0, SWE: 0,
  IRE: -1, SPR: -1, POR: -1, NOR: -1, FIN: -1, POL: -1, HUN: -1, ROM: -1, YUG: -1, BUL: -1, GRE: -1, EST: -1, LAT: -1, LIT: -1, SOV: -1,
  TUR: -2, EGY: -1, IRQ: -2, PER: -2, ALB: -2, ICE: -3, SAU: -3, OMA: -3,
};
