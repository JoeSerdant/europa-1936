// Styly velení AI (F3): každá AI země vede válku po svém – složení armády, priority výroby, ochota útočit, zálohy a způsob útoku.
// V historickém režimu určují styl dějiny (`HIST_PERSONA`, ostatní země vyvážené), ve volné historii se losuje podle semínka hry
// (historický styl země má dvojnásobnou váhu). Vlastní názvy a čísla.
//  mix      změna podílu druhů divizí v žádaném složení armády (klíče `TPL_KINDS`; 0,5 = o polovinu víc), jen u druhů, které země staví
//  prod     násobek priority výroby výzbroje (klíče `EQUIP`)
//  atk      násobek převahy, kterou AI potřebuje k útoku (< 1 útočí ochotněji)
//  reserve  podíl divizí v záloze v týlu za války
//  op       způsob útoku: broad (běžný), focus (soustředěný úder na málo cílů), wide (útok po celé šíři), methodical (bez hrr útoků),
//           weak (útok na slabě hájená místa, obchází silné body)
export const PERSONAS = {
  vyvazena: { n: 'Vyvážené velení', info: 'Běžné složení armády; útočí, když má převahu.', mix: {}, prod: {}, atk: 1, reserve: 0, op: 'broad' },
  mobilni: { n: 'Pohyblivá válka', info: 'Víc tanků a motorizovaných divizí; úder soustředí na málo míst a prolamuje frontu.', mix: { tank: 0.5, motor: 0.4 }, prod: { ltanky: 1.25, mtanky: 1.25, htanky: 1.1, auta: 1.2, vozy: 1.2 }, atk: 1, reserve: 0, op: 'focus' },
  masova: { n: 'Masová armáda', info: 'Hodně pěchoty; útočí po celé šíři fronty i s menší převahou.', mix: { pesi: 0.2, tank: -0.3, motor: -0.3 }, prod: { pusky: 1.2, podpora: 0.85 }, atk: 0.9, reserve: 0, op: 'wide' },
  palebna: { n: 'Palebná převaha', info: 'Silné dělostřelectvo; postupuje metodicky, útočí až s větší převahou a bez hrr útoků.', mix: {}, prod: { dela: 1.3, pdela: 1.2 }, atk: 1.1, reserve: 0, op: 'methodical' },
  obranna: { n: 'Obrana do hloubky', info: 'Část armád drží v záloze v týlu; útočí jen s velkou převahou a tam, kde je nepřítel slabý.', mix: {}, prod: { pdela: 1.3 }, atk: 1.2, reserve: 0.15, op: 'weak' },
  slabiny: { n: 'Hledání slabin', info: 'Útočí na slabě hájená místa, obchází silné body a víc se spoléhá na motorizaci.', mix: { motor: 0.25 }, prod: { auta: 1.15 }, atk: 1, reserve: 0, op: 'weak' },
};
export const PERSONA_IDS = Object.keys(PERSONAS);

/** Styly velmocí podle historie (doktríny let 1936–1941). */
export const HIST_PERSONA = { GER: 'mobilni', SOV: 'masova', FRA: 'obranna', ENG: 'palebna' };
