// Historické sklony AI k válce (M24). Nejsou to scénáře: válka vznikne, jen když jsou splněny podmínky (ospravedlnění, stabilita, poměr sil).
//  from/until  okno ve dnech hry (0 = 1. 1. 1936)   ratio  nejmenší poměr divizí útočníkova bloku k obráncovu bloku
export const HIST_WARS = [
  { tag: 'GER', target: 'CZE', from: 1010, until: 1500, ratio: 0.9 },   // M68: záložní válka, když ultimáta (data/dip/demands.js) selžou
  { tag: 'GER', target: 'POL', from: 1305, until: 2000, ratio: 0.5 },
  { tag: 'GER', target: 'NOR', from: 1525, until: 1800, ratio: 1.0 },
  { tag: 'GER', target: 'HOL', from: 1560, until: 1800, ratio: 1.0 },
  { tag: 'GER', target: 'BEL', from: 1560, until: 1800, ratio: 1.0 },
  { tag: 'GER', target: 'SOV', from: 1960, until: 2400, ratio: 0.35 },
  { tag: 'ITA', target: 'ALB', from: 1250, until: 1800, ratio: 1.0 },
  { tag: 'ITA', target: 'GRE', from: 1730, until: 2200, ratio: 1.0 },
  { tag: 'SOV', target: 'FIN', from: 1400, until: 1900, ratio: 0.8 },
  { tag: 'SOV', target: 'EST', from: 1720, until: 2100, ratio: 0.6 },
  { tag: 'SOV', target: 'LAT', from: 1720, until: 2100, ratio: 0.6 },
  { tag: 'SOV', target: 'LIT', from: 1720, until: 2100, ratio: 0.6 },
  { tag: 'HUN', target: 'YUG', from: 1700, until: 2400, ratio: 1.0 },
];

/** Historické bloky: země `tag` ve dni `from` založí blok a zve `invite` (pozvaný přijme podle vztahů). */
export const HIST_FACTIONS = [
  { tag: 'GER', nm: 'Osa Berlín–Řím', invite: ['ITA', 'HUN', 'BUL'], from: 270 },
  { tag: 'ENG', nm: 'Britská spolupráce', invite: ['POR', 'GRE', 'EGY', 'IRQ'], from: 200 },
];

/** Historické záruky nezávislosti (M48): země `tag` ve dni `from` zaručí nezávislost země `target` (platí, jen když to hra dovolí). */
export const HIST_GUARANTEES = [
  { tag: 'ENG', target: 'POL', from: 1180 },
  { tag: 'FRA', target: 'POL', from: 1185 },
  { tag: 'ENG', target: 'GRE', from: 1200 },
  { tag: 'FRA', target: 'GRE', from: 1205 },
  { tag: 'ENG', target: 'ROM', from: 1195 },
  { tag: 'FRA', target: 'ROM', from: 1195 },
  { tag: 'ENG', target: 'TUR', from: 1250 },
];
