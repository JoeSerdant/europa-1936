// Pravidla terénu (index = kód terénu ve světě: 0 rovina, 1 les, 2 pahorkatina, 3 hory, 4 bažiny, 5 poušť, 6 město).
//  cost    – násobek doby přechodu provincie (rovina = 1)
//  width   – šířka bitvy v provincii (jednotky šířky praporů; 2 na liniový prapor)
//  atk     – modifikátor útoku útočníka v tomto terénu (obránce jím „dostává“ obranu)
//  attr    – ztráta síly za den při pohybu / bez zásob (podíl maxima, násobí se postihem)
//  flow    – srážka zásobovacího toku při vstupu do provincie
//  infra   – základní infrastruktura 0–5 (železnice a velká města ji zvyšují, viz geo.js)
export const TERRAIN_RULES = [
  { id: 0, n: 'Rovina',      cost: 1.0, width: 80, atk: 0,     attr: 0,     flow: 0.45, infra: 3 },
  { id: 1, n: 'Les',         cost: 1.5, width: 60, atk: -0.15, attr: 0.02,  flow: 0.65, infra: 2 },
  { id: 2, n: 'Pahorkatina', cost: 1.4, width: 66, atk: -0.2,  attr: 0.03,  flow: 0.65, infra: 2 },
  { id: 3, n: 'Hory',        cost: 2.0, width: 48, atk: -0.45, attr: 0.3,   flow: 1.0,  infra: 1 },
  { id: 4, n: 'Bažiny',      cost: 2.0, width: 50, atk: -0.35, attr: 0.35,  flow: 0.9,  infra: 1 },
  { id: 5, n: 'Poušť',       cost: 1.1, width: 72, atk: -0.05, attr: 0.15,  flow: 0.7,  infra: 1 },
  { id: 6, n: 'Město',       cost: 1.2, width: 84, atk: -0.3,  attr: 0,     flow: 0.3,  infra: 4 },
];

/** Přechod přes řeku (druh sousednosti 1): útok −20 %, doba přechodu +25 %. */
export const RIVER = { atk: -0.2, time: 0.25, flow: 0.2 };
