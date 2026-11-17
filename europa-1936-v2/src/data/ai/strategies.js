// Historické strategie AI (M92) – obdoba `ai_strategy` a skriptovaných postihů v HOI4. Historie se tu nedolaďuje vyvážením čísel, ale přímo:
// záměrnými chybami (Francie drží zálohy v týlu) a chytrými tahy či okolnostmi (překvapivý úder na SSSR, šok z napadení, pozdější vlastenecká mobilizace).
// Platí jen s historickou AI (pravidlo „Historické plány“). Vlastní názvy a čísla.
//  tag    země, které se řádek týká
//  war    spouštěč: válka se zemí `war` trvá aspoň `after` a méně než `upto` dní → země dostane ducha `spirit` na `days` dní od začátku války (0 = trvale)
//  from / until  okno ve dnech hry (0 = 1. 1. 1936): s `spirit` má země ducha po celé okno (`until` = konec), jinak platí postoje
//  holdBack     podíl divizí, který AI nechá v záloze v týlu místo na frontě (záměrná chyba)
//  defend       země proti zemi `war` jen brání a neútočí (záměrná chyba zaskočené armády) po dobu `after`–`upto` dní války
//  needWar      okenní duch platí jen tehdy, když země válčí se zemí `needWar` (a ta ještě nekapitulovala)
export const HIST_STRATEGIES = [
  // západ 1940: blesková válka proti zaskočené a demoralizované Francii, která drží zálohy v týlu
  { id: 'blitz_ger', tag: 'GER', from: 1585, until: 1680, needWar: 'FRA', spirit: 'bleskova_valka' },
  { id: 'fra_morale', tag: 'FRA', from: 1585, until: 1720, needWar: 'GER', spirit: 'podivna_valka' },
  { id: 'fra_reserve', tag: 'FRA', from: 1300, until: 1750, holdBack: 0.2 },
  // příprava na východ: válečné hospodářství Německa od podzimu 1940
  { id: 'ger_war_eco', tag: 'GER', from: 1730, until: 2400, spirit: 'valecne_hospodarstvi' },
  // Barbarossa: překvapivý úder, šok z napadení a sovětská armáda, která zprvu jen brání; po půl roce vlastenecká válka
  { id: 'barb_ger', tag: 'GER', war: 'SOV', after: 0, upto: 3, spirit: 'prekvapivy_uder', days: 90 },
  { id: 'barb_sov', tag: 'SOV', war: 'GER', after: 0, upto: 3, spirit: 'sok_z_napadeni', days: 180 },
  { id: 'barb_hold', tag: 'SOV', war: 'GER', after: 0, upto: 150, defend: true },
  { id: 'gpw_sov', tag: 'SOV', war: 'GER', after: 180, upto: 186, spirit: 'vlastenecka_valka', days: 0 },
];

/** Hranice kapitulace zemí (M92, obdoba surrender limit v HOI4): podíl bodů území v rukou nepřítele, při kterém se země vzdá (`share`), a totéž po pádu hlavního města (`capital`). Ostatní země mají výchozí hodnoty z `DIP`. */
export const CAP_LIMITS = {
  FRA: { share: 0.5, capital: 0.25 },   // politicky rozštěpená republika se po pádu Paříže vzdá
  SOV: { share: 0.85, capital: 0.8 },   // obrovská země bojuje i po ztrátě Moskvy
  ENG: { share: 0.7, capital: 0.45 },   // ostrovní velmoc s impériem za mořem
};
