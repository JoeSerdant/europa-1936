// Historické sklony AI k válce (M24). Nejsou to scénáře: válka vznikne, jen když jsou splněny podmínky (ospravedlnění, stabilita, poměr sil).
//  from/until  okno ve dnech hry (0 = 1. 1. 1936)   ratio  nejmenší poměr divizí útočníkova bloku k obráncovu bloku
//  force       po tolika dnech od začátku okna země plán spustí, i když je zaneprázdněná jinou válkou (M87; jinak čeká, až se uvolní)
//  war         plán platí jen pro válku, která už běží (M88): země si proti cíli vyhlásí válečný cíl a přejde do útoku, sama ji ale nezačne
// Válčí-li už země s cílem plánu (zatáhla ji záruka nebo spojenec), vyhlásí proti němu v okně plánu válečný cíl (`claimGoal`) – do té doby jen drží frontu.
export const HIST_WARS = [
  { tag: 'GER', target: 'CZE', from: 1010, until: 1500, ratio: 0.9 },   // M68: záložní válka, když ultimáta (data/dip/demands.js) selžou
  { tag: 'GER', target: 'POL', from: 1305, until: 2000, ratio: 0.5 },
  { tag: 'GER', target: 'NOR', from: 1525, until: 1800, ratio: 0.6, force: 1 },   // M88: tažení roku 1940 běží za války se Západem, proto `force` a menší poměr sil
  { tag: 'GER', target: 'HOL', from: 1560, until: 1800, ratio: 0.6, force: 1 },
  { tag: 'GER', target: 'BEL', from: 1560, until: 1800, ratio: 0.6, force: 1 },
  { tag: 'GER', target: 'FRA', from: 1585, until: 2400, ratio: 1.0 },              // M88: do jara 1940 „podivná válka“, potom tažení na západ
  { tag: 'GER', target: 'ENG', from: 1650, until: 3300, ratio: 1.0, war: true },
  { tag: 'ITA', target: 'FRA', from: 1620, until: 2400, ratio: 1.0, war: true },
  { tag: 'SOV', target: 'GER', from: 2580, until: 3600, ratio: 1.0, war: true },   // od zimy 1943 přechází do útoku Rudá armáda
  { tag: 'ENG', target: 'ITA', from: 2700, until: 3600, ratio: 1.0, war: true },   // od léta 1943 Spojenci
  { tag: 'ENG', target: 'GER', from: 3000, until: 3600, ratio: 1.0, war: true },
  { tag: 'GER', target: 'SOV', from: 1960, until: 2400, ratio: 0.35, force: 30 },
  { tag: 'ITA', target: 'ALB', from: 1250, until: 1800, ratio: 1.0 },
  { tag: 'ITA', target: 'GRE', from: 1730, until: 2200, ratio: 1.0 },
  { tag: 'SOV', target: 'FIN', from: 1400, until: 1900, ratio: 0.8 },
  { tag: 'SOV', target: 'EST', from: 1720, until: 2100, ratio: 0.6 },
  { tag: 'SOV', target: 'LAT', from: 1720, until: 2100, ratio: 0.6 },
  { tag: 'SOV', target: 'LIT', from: 1720, until: 2100, ratio: 0.6 },
  { tag: 'GER', target: 'YUG', from: 1915, until: 2400, ratio: 0.5, force: 1 },   // M88: balkánské tažení na jaře 1941
  { tag: 'GER', target: 'GRE', from: 1920, until: 2400, ratio: 0.5, force: 1 },
  { tag: 'HUN', target: 'YUG', from: 1925, until: 2400, ratio: 1.0 },
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
  { tag: 'FRA', target: 'BEL', from: 480 },    // M88: neutralitu Belgie a Nizozemska zaručují západní mocnosti
  { tag: 'ENG', target: 'BEL', from: 485 },
  { tag: 'ENG', target: 'HOL', from: 1260 },
];
