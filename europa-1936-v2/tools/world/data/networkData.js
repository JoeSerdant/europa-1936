// Doplňkové údaje pro síť: námořní základny, ruční průlivová spojení a hustota železnic podle země.

// Města, která jsou přístavem/základnou úrovně aspoň N bez ohledu na počet obyvatel: [název města, úroveň]
export const PORT_BOOST = [
  ['Valletta', 4], ['Gibraltar', 3], ['Portsmouth', 4], ['Plymouth', 3], ['Rosyth', 2], ['Kirkwall', 2], ['Wilhelmshaven', 3], ['Kiel', 3], ['Brest', 3],
  ['Toulon', 4], ['La Spezia', 3], ['Taranto', 3], ['Pola', 2], ['Sevastopol', 4], ['Kronštadt', 3], ['Murmansk', 3], ['Haifa', 3], ['Alexandrie', 4],
  ['Tobruk', 2], ['Bengází', 2], ['Tripolis', 3], ['Bizerta', 3], ['Oran', 3], ['Kotor', 2], ['Split', 2], ['Rijeka', 3], ['Cuxhaven', 2],
  ['Stralsund', 2], ['Pillau', 2], ['Liepāja', 3], ['Ventspils', 2], ['Pärnu', 1], ['Baku', 4], ['Basra', 3], ['Bandar Abbás', 2], ['Maskat', 2], ['Kuvajt', 2],
  ['Famagusta', 2], ['Souda', 2], ['Pireus', 4], ['Bergen', 3], ['Narvik', 2], ['Trondheim', 2], ['Harstad', 1], ['Tromsø', 1], ['Reykjavík', 3],
  ['Cartagena', 3], ['Ferrol', 3], ['Cádiz', 3], ['Lorient', 2], ['Cherbourg', 3], ['Dunkerque', 3], ['Le Havre', 3],
];

// Ruční spojení přes úžiny, které detekce nezachytí: [název, [lon, lat] strany A, [lon, lat] strany B]
export const STRAIT_EXTRA = [
  ['Velký Belt', [11.14, 55.33], [10.79, 55.31]],
  ['Öresund', [12.57, 55.68], [13.0, 55.6]],
];

// Dvojice provincií (podle jmen) nesmějí mít průlivové spojení: [jméno A, jméno B]
export const STRAIT_SKIP = [];

// Hustota železnic podle vlastníka: korekce úrovně (0 = západní standard, záporné = řidší, ≤ -3 = žádné)
export const RAIL_FACTOR = {
  GER: 0, FRA: 0, ENG: 0, BEL: 0, HOL: 0, LUX: 0, SWI: 0, CZE: 0, AUS: 0, ITA: 0, DEN: 0, SWE: 0,
  IRE: -1, SPR: -1, POR: -1, NOR: -1, FIN: -1, POL: -1, HUN: -1, ROM: -1, YUG: -1, BUL: -1, GRE: -1, EST: -1, LAT: -1, LIT: -1, SOV: -1,
  TUR: -2, EGY: -1, IRQ: -2, PER: -2, ALB: -2, ICE: -3, SAU: -3, OMA: -3,
};
