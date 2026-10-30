// Občanské války a zahraniční pomoc (M69). Vlastní obsah: ve dni hry `day` (0 = 1. 1. 1936) se od země `tag` odtrhne rezervní země `rebel` se státy `states`
// (jména států ze světa); spuštění platí jen v okně `window` dní po tomto dni (scénáře, které začínají později, válku nespouštějí).
export const HIST_CIVIL = [
  {
    id: 'spain', tag: 'SPR', rebel: 'NSP', day: 198, window: 40, defect: 0.34,   // defect = podíl věrných divizí, které přeběhnou k povstalcům
    states: ['Galicie', 'León', 'Salamanka', 'Stará Kastilie', 'Kastilie-sever', 'Navarra', 'Extremadura', 'Západní Andalusie', 'Baleáry', 'Španělské Maroko'],
  },
];

/**
 * Zahraniční pomoc stranám občanské války: `from` smí posílat výzbroj zemi `to` (jako spojenci) ve dnech `start`–`end`; AI to dělá sama (`aiLend`),
 * hráč přes Diplomacii.
 */
export const HIST_AID = [
  { from: 'GER', to: 'NSP', start: 198, end: 1000 },
  { from: 'ITA', to: 'NSP', start: 198, end: 1000 },
  { from: 'SOV', to: 'SPR', start: 198, end: 1000 },
];
