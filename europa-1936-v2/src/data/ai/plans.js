// Historické sklony AI k válce (M24). Nejsou to scénáře: válka vznikne, jen když jsou splněny podmínky (ospravedlnění, stabilita, poměr sil).
//  from/until  okno ve dnech hry (0 = 1. 1. 1936)   ratio  nejmenší poměr divizí útočníkova bloku k obráncovu bloku
//  force       po tolika dnech od začátku okna země plán spustí, i když je zaneprázdněná jinou válkou (M87; jinak čeká, až se uvolní)
//  war         plán platí jen pro válku, která už běží (M88): země si proti cíli vyhlásí válečný cíl a přejde do útoku, sama ji ale nezačne
//  quiet       F2: záložní válka – platí jen, když spolu žádné velmoci neválčí (světová válka se nekoná, např. hráč za Německo ji nezačne)
//  with        F3: válku začne jen tehdy, když s cílem už válčí země `with` (ospravedlňuje předem)
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
  { tag: 'SOV', target: 'GER', from: 2515, until: 3800, ratio: 1.0, war: true },   // M93: od obratu u Volhy (listopad 1942) útočí Rudá armáda; do té doby jen osvobozuje vlastní území
  { tag: 'ENG', target: 'ITA', from: 2650, until: 3800, ratio: 1.0, war: true },   // od léta 1943 Spojenci
  { tag: 'ENG', target: 'GER', from: 3000, until: 3800, ratio: 1.0, war: true },
  { tag: 'GER', target: 'SOV', from: 1967, until: 2400, ratio: 0.35, force: 1 },   // F2: příprava (výpověď paktu + 30 dní ospravedlnění) začne nejpozději den po začátku okna → válka ~22. 6. 1941 bez ohledu na zaneprázdnění
  // F2: když se do roku 1940 velká válka nekoná, SSSR rozjede vlastní výboje (Polsko, Rumunsko, od jara 1941 při přesile i Německo)
  { tag: 'SOV', target: 'POL', from: 1461, until: 1900, ratio: 1.5, quiet: 1 },
  { tag: 'SOV', target: 'ROM', from: 1552, until: 2000, ratio: 1.5, quiet: 1 },
  { tag: 'SOV', target: 'GER', from: 1886, until: 2600, ratio: 1.3, quiet: 1 },
  { tag: 'ITA', target: 'ALB', from: 1250, until: 1800, ratio: 1.0 },
  { tag: 'ITA', target: 'GRE', from: 1730, until: 2200, ratio: 1.0, force: 1 },   // W1: natvrdo (na mapě světa má Itálie i frontu ve východní Africe)
  { tag: 'SOV', target: 'FIN', from: 1400, until: 1900, ratio: 0.8 },
  { tag: 'FIN', target: 'SOV', from: 1972, until: 2400, ratio: 0.02, with: 'GER' },   // F3: pokračovací válka – Finsko po boku Německa (25. 6. 1941)
  { tag: 'SOV', target: 'EST', from: 1720, until: 2100, ratio: 0.6 },
  { tag: 'SOV', target: 'LAT', from: 1720, until: 2100, ratio: 0.6 },
  { tag: 'SOV', target: 'LIT', from: 1720, until: 2100, ratio: 0.6 },
  { tag: 'GER', target: 'YUG', from: 1892, until: 2400, ratio: 0.5, force: 1 },   // M88: balkánské tažení na jaře 1941 (F4: s ospravedlněním válka 6. 4. 1941)
  { tag: 'GER', target: 'GRE', from: 1893, until: 2400, ratio: 0.5, force: 1 },
  { tag: 'HUN', target: 'YUG', from: 1898, until: 2400, ratio: 1.0 },
];

/** Historické bloky: země `tag` ve dni `from` založí blok a zve `invite` (pozvaný přijme podle vztahů). */
/**
 * Vstup členů bloků do válek bloku (F2 B1): člen `tag` se do válek svého bloku zapojí až ode dne `from` (do té doby ho blok nevolá do útoku
 * ani do obrany – válku, kterou začne sám, vede); od toho dne se AI země sama přidá k válkám vedoucího bloku, kromě zemí ve `skip`.
 * `from: Infinity` = do válek bloku se nezapojí nikdy (Malá dohoda Československo v roce 1938 nebránila).
 */
export const HIST_ENTRY = [
  { tag: 'ITA', from: 1622 },                     // 10. 6. 1940 – vstup Itálie do války
  { tag: 'BUL', from: 1886, skip: ['SOV'] },      // 1. 3. 1941 – přistoupení k Ose (se SSSR Bulharsko neválčilo)
  { tag: 'HUN', from: 2003 },                     // 27. 6. 1941 – Maďarsko proti SSSR
  { tag: 'ROM', from: Infinity },
  { tag: 'YUG', from: Infinity },
];

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
