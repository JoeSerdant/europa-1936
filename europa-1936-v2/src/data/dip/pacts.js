// Historické pakty o neútočení (M75): země `tag` ve dnech hry `from`–`until` (0 = 1. 1. 1936) nabídne pakt zemi `target`.
// S historickou AI ho cíl řízený AI přijme bez ohledu na vztahy; hráč jako cíl dostane nabídku a rozhodne se sám.
export const HIST_PACTS = [
  { tag: 'GER', target: 'SOV', from: 1320, until: 1420 },
  { tag: 'JAP', target: 'SOV', from: 1925, until: 2000 },   // W2: japonsko-sovětský pakt o neutralitě, 13. 4. 1941
];
