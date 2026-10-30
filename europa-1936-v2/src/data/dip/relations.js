// Počáteční diplomacie (M23): vztahy mezi zeměmi a bloky v lednu 1936. Vlastní odhady, zjednodušené.
//  ideologie: základ vztahu dvou zemí podle ideologie (symetrické)
export const IDEO_REL = {
  democracy: { democracy: 10, neutrality: 5, fascism: -10, communism: -10 },
  neutrality: { neutrality: 5, fascism: 0, communism: 0 },
  fascism: { fascism: 10, communism: -30 },
  communism: { communism: 10 },
};

/** Historické úpravy dvojic (součet se základem podle ideologie). */
export const PAIR_REL = [
  ['FRA', 'ENG', 40], ['FRA', 'POL', 40], ['FRA', 'CZE', 30], ['FRA', 'BEL', 30], ['FRA', 'SOV', 10], ['FRA', 'ITA', -10], ['FRA', 'GER', -30], ['FRA', 'SPR', 10],
  ['ENG', 'POR', 40], ['ENG', 'GRE', 20], ['ENG', 'TUR', 10], ['ENG', 'GER', -10], ['ENG', 'ITA', -10], ['ENG', 'BEL', 20], ['ENG', 'HOL', 20],
  ['GER', 'ITA', 10], ['GER', 'POL', -10], ['GER', 'CZE', -30], ['GER', 'SOV', -30], ['GER', 'AUS', -10], ['GER', 'HUN', 10], ['GER', 'BUL', 10],
  ['ITA', 'HUN', 20], ['ITA', 'YUG', -20], ['ITA', 'AUS', 10], ['ITA', 'ALB', -10], ['ITA', 'GRE', -10],
  ['CZE', 'ROM', 40], ['CZE', 'YUG', 40], ['CZE', 'SOV', 20], ['CZE', 'HUN', -30], ['CZE', 'POL', -10],
  ['ROM', 'YUG', 30], ['ROM', 'HUN', -40], ['ROM', 'SOV', -20], ['ROM', 'POL', 20], ['YUG', 'HUN', -20], ['YUG', 'BUL', -10], ['YUG', 'GRE', 20],
  ['GRE', 'TUR', 20], ['GRE', 'BUL', -20], ['TUR', 'BUL', -10], ['TUR', 'SOV', 10],
  ['POL', 'SOV', -20], ['POL', 'LIT', -40], ['POL', 'LAT', 10], ['POL', 'ROM', 20],
  ['LAT', 'EST', 40], ['LAT', 'LIT', 30], ['EST', 'LIT', 30], ['EST', 'FIN', 30], ['SOV', 'FIN', -20], ['SOV', 'LAT', -10], ['SOV', 'EST', -10],
  ['NSP', 'GER', 50], ['NSP', 'ITA', 50], ['NSP', 'SOV', -50], ['NSP', 'ENG', -10], ['NSP', 'FRA', -20], ['NSP', 'POR', 30], ['SPR', 'SOV', 25], ['SPR', 'GER', -40], ['SPR', 'ITA', -40],
  ['SWE', 'NOR', 40], ['SWE', 'DEN', 40], ['SWE', 'FIN', 30], ['NOR', 'DEN', 40],
  ['SPR', 'POR', -10], ['SAU', 'IRQ', 10], ['EGY', 'ENG', 10], ['IRQ', 'ENG', 20], ['PER', 'SOV', -10], ['PER', 'ENG', -10], ['PER', 'TUR', 20], ['PER', 'IRQ', 10], ['TUR', 'IRQ', 10],
];

/** Počáteční bloky: název, vedoucí a členové (tagy). */
export const START_FACTIONS = [
  { nm: 'Malá dohoda', ldr: 'CZE', mem: ['CZE', 'ROM', 'YUG'] },
  { nm: 'Francouzský systém', ldr: 'FRA', mem: ['FRA', 'POL', 'BEL'] },
  { nm: 'Balkánská dohoda', ldr: 'TUR', mem: ['TUR', 'GRE'] },
  { nm: 'Pobaltská dohoda', ldr: 'LAT', mem: ['LAT', 'EST', 'LIT'] },
];
