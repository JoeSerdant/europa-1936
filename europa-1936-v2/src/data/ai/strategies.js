// Historické strategie AI (M92) – obdoba `ai_strategy` a skriptovaných postihů v HOI4. Historie se tu nedolaďuje vyvážením čísel, ale přímo:
// záměrnými chybami (Francie drží zálohy v týlu) a chytrými tahy či okolnostmi (překvapivý úder na SSSR, šok z napadení, pozdější vlastenecká mobilizace).
// Platí jen s historickou AI (pravidlo „Historické plány“). Vlastní názvy a čísla.
//  tag    země, které se řádek týká
//  war    spouštěč: válka se zemí `war` trvá aspoň `after` a méně než `upto` dní → země dostane ducha `spirit` na `days` dní od začátku války (0 = trvale)
//  from / until  okno ve dnech hry (0 = 1. 1. 1936): s `spirit` má země ducha po celé okno (`until` = konec), jinak platí postoje
//  holdBack     podíl divizí, který AI nechá v záloze v týlu místo na frontě (záměrná chyba)
//  defend       země proti zemi `war` jen brání a neútočí (záměrná chyba zaskočené armády) po dobu `after`–`upto` dní války,
//               nebo v okně `from`–`until` dní hry (operační pauza: doplnění sil před další ofenzivou)
//  needWar      okenní duch platí jen tehdy, když země válčí se zemí `needWar` (a ta ještě nekapitulovala)
//  push         (s `war`, `from`/`until`) historická ofenziva: práh poměru sil pro útok proti zemi `war` se násobí tímto číslem
//  noEnter      (s `from`/`until`) AI zatím neútočí na původní (předválečné) území země `noEnter` – tempo postupu podle historie
//  armistice    (s `from`/`until`) země v okně kapituluje, jakmile země `armistice` nebo její spojenec drží aspoň `held` provincií jejího původního území
//               (Itálie 1943: pád režimu po vylodění Spojenců); od dne `force` kapituluje i bez toho
//               s `conf` = bezpodmínečná kapitulace s mírovou konferencí (bez exilu); s `peace` = územní mír (F3): obsazené státy připadnou
//               okupantovi, ale země nekapituluje – dál vede vlastní politiku a války (moskevský mír Finska 1940)
//  holdout      (s `from`/`until`) země bojuje do posledního: kapituluje až při `DIP.HOLDOUT_SHARE` území v rukou nepřítele (M98)
//  invade       operace vylodění (s `from`/`until`): země se v okně vylodí u země `invade` i bez převahy na moři, z větší dálky a v plné síle sboru (Sicílie, Normandie);
//               `at` = vylodění jen na původním území této země (Normandie: Němci držená Francie)
export const HIST_STRATEGIES = [
  // západ 1940: blesková válka proti zaskočené a demoralizované Francii, která drží zálohy v týlu
  { id: 'blitz_ger', tag: 'GER', from: 1585, until: 1680, needWar: 'FRA', spirit: 'bleskova_valka' },
  { id: 'fra_morale', tag: 'FRA', from: 1585, until: 1720, needWar: 'GER', spirit: 'podivna_valka' },
  { id: 'fra_reserve', tag: 'FRA', from: 1300, until: 1750, holdBack: 0.2 },
  // F3: zimní válka 1939/40 – Finové se drží, Rudá armáda po čistkách útočí neobratně; moskevský mír (13. 3. 1940) – Finsko odstoupí
  // obsazené státy a zůstane samostatné (příměří bez konference a bez loutky)
  { id: 'winter_fin', tag: 'FIN', war: 'SOV', after: 0, upto: 3, spirit: 'zimni_valka', days: 110 },
  { id: 'winter_sov', tag: 'SOV', war: 'FIN', after: 0, upto: 3, spirit: 'armada_po_cistkach', days: 70 },
  { id: 'fin_holdout', tag: 'FIN', from: 1430, until: 1540, holdout: true },   // F3: Finsko se v zimní válce nevzdá – skončí ji územní mír
  { id: 'fin_peace', tag: 'FIN', from: 1430, until: 1700, armistice: 'SOV', held: 12, force: 1533, peace: true },
  // pokračovací válka 1941–1944: finská fronta stojí (SSSR proti Finsku jen brání), moskevské příměří 19. 9. 1944 – opět územní mír
  { id: 'sov_fin_hold', tag: 'SOV', war: 'FIN', from: 2000, until: 3150, defend: true },
  { id: 'fin_peace44', tag: 'FIN', from: 3184, until: 3400, armistice: 'SOV', held: 1, force: 3184, peace: true },
  // příprava na východ: válečné hospodářství Německa od podzimu 1940
  { id: 'ger_war_eco', tag: 'GER', from: 1730, until: 2400, spirit: 'valecne_hospodarstvi' },
  // Barbarossa: překvapivý úder, šok z napadení a sovětská armáda, která zprvu jen brání; po půl roce vlastenecká válka
  { id: 'barb_ger', tag: 'GER', war: 'SOV', after: 0, upto: 3, spirit: 'prekvapivy_uder', days: 90 },
  { id: 'barb_sov', tag: 'SOV', war: 'GER', after: 0, upto: 3, spirit: 'sok_z_napadeni', days: 180 },
  { id: 'barb_hold', tag: 'SOV', war: 'GER', after: 0, upto: 165, defend: true },
  { id: 'gpw_sov', tag: 'SOV', war: 'GER', after: 180, upto: 186, spirit: 'vlastenecka_valka', days: 0 },
  // evakuovaný průmysl za Uralem se rozbíhá (od zimy 1941/42 do konce války)
  { id: 'sov_evacuation', tag: 'SOV', from: 2150, until: 3800, needWar: 'GER', spirit: 'evakuace_prumyslu' },
  // zima 1941/42: generál Zima zastaví Němce před Moskvou, sibiřské zálohy přejdou do protiútoku
  { id: 'winter41_ger', tag: 'GER', from: 2150, until: 2230, needWar: 'SOV', spirit: 'general_zima' },
  { id: 'winter41_sov', tag: 'SOV', from: 2160, until: 2230, needWar: 'GER', spirit: 'sibirske_zalohy' },
  // jaro a léto 1942: po zimním protiútoku Rudá armáda doplňuje síly a brání; německá letní ofenziva na jih
  { id: 'sov_pause42', tag: 'SOV', war: 'GER', from: 2235, until: 2505, defend: true },
  { id: 'summer42_ger', tag: 'GER', from: 2340, until: 2450, needWar: 'SOV', spirit: 'letni_ofenziva' },
  // 1942–1944: válečná výroba Německa vrcholí (zbrojní ministerstvo)
  { id: 'ger_armament', tag: 'GER', from: 2220, until: 3300, spirit: 'zbrojni_ministerstvo' },
  // zima 1942/43: obrat u Volhy
  { id: 'winter42_ger', tag: 'GER', from: 2510, until: 2610, needWar: 'SOV', spirit: 'general_zima' },
  { id: 'uran_sov', tag: 'SOV', from: 2510, until: 2620, needWar: 'GER', spirit: 'velky_obrat' },
  // operační pauzy Rudé armády: jarní rozbředlé cesty 1943 (do Kurska) a jaro 1944 (do Bagrationu)
  { id: 'sov_pause43', tag: 'SOV', war: 'GER', from: 2650, until: 2745, defend: true },
  { id: 'sov_pause44', tag: 'SOV', war: 'GER', from: 3000, until: 3090, defend: true },
  // od roku 1943 mají iniciativu Rudá armáda a Spojenci; Osa se vyčerpává
  { id: 'ger_overstretch', tag: 'GER', from: 2600, until: 3800, spirit: 'vycerpana_rise' },
  { id: 'sov_initiative', tag: 'SOV', from: 2600, until: 3800, needWar: 'GER', spirit: 'ruda_armada_v_utoku' },
  { id: 'allied_might', tag: 'ENG', from: 2640, until: 3800, spirit: 'spojenecka_prevaha' },
  { id: 'ita_collapse', tag: 'ITA', from: 2640, until: 3300, spirit: 'rozklad_rezimu' },
  // velké sovětské ofenzivy (Uran a Charkov, léto 1943, Bagration, Visla–Odra a Berlín) s pauzami (zastavení na Visle) a spojenecký postup z Normandie;
  // do Německa samého vstoupí Rudá armáda až na podzim 1944
  { id: 'sov_push43', tag: 'SOV', war: 'GER', from: 2520, until: 2650, push: 0.7 },
  { id: 'sov_push43b', tag: 'SOV', war: 'GER', from: 2745, until: 2900, push: 0.9 },
  { id: 'sov_push44', tag: 'SOV', war: 'GER', from: 3090, until: 3190, push: 0.6 },
  { id: 'sov_vistula', tag: 'SOV', war: 'GER', from: 3190, until: 3290, defend: true },
  { id: 'sov_push45', tag: 'SOV', war: 'GER', from: 3298, until: 3450, push: 0.6 },   // F3: Visla–Odra od 12. 1. 1945
  { id: 'sov_border', tag: 'SOV', from: 2000, until: 3200, noEnter: 'GER' },
  { id: 'eng_push44', tag: 'ENG', war: 'GER', from: 3090, until: 3450, push: 0.6 },
  // F3: Západní spojenci vstoupí na předválečné území Německa až na podzim 1944 (Cáchy) a přes zimu stojí u Rýna (Ardeny, vyčerpané zásobování)
  { id: 'eng_border', tag: 'ENG', from: 2600, until: 3215, noEnter: 'GER' },
  { id: 'fra_border', tag: 'FRA', from: 2600, until: 3215, noEnter: 'GER' },
  { id: 'eng_rhine', tag: 'ENG', war: 'GER', from: 3230, until: 3353, defend: true },   // do přechodu Rýna 7. 3. 1945
  { id: 'sov_oder', tag: 'SOV', war: 'GER', from: 3320, until: 3392, defend: true },   // F3: Rudá armáda na Odře do Berlínské operace (16. 4. 1945)
  // po Kursku přechází Německo na východě do strategické obrany; Bagration v létě 1944 rozbije střed fronty
  { id: 'ger_east_def', tag: 'GER', war: 'SOV', from: 2760, until: 3800, defend: true },
  { id: 'bagration', tag: 'SOV', from: 3094, until: 3200, needWar: 'GER', spirit: 'bagration' },
  { id: 'ger_collapse', tag: 'GER', from: 3150, until: 3800, spirit: 'rozpad_front' },
  { id: 'ger_ruin', tag: 'GER', from: 3260, until: 3800, needWar: 'SOV', spirit: 'zhroucene_hospodarstvi' },   // M96: bombardované továrny, ztracená ropa
  // vylodění Spojenců: Sicílie a Itálie 1943, Normandie 1944
  // konec války v Evropě: Německo vytrvá do jara 1945, pak bezpodmínečně kapituluje (nejpozději v létě 1945)
  { id: 'ger_holdout', tag: 'GER', from: 2000, until: 3415, holdout: true },   // F3: do 8. 5. 1945
  { id: 'ger_surrender', tag: 'GER', from: 3415, until: 3800, armistice: 'SOV', held: 20, force: 3470, conf: true },
  { id: 'ita_armistice', tag: 'ITA', from: 2795, until: 3000, armistice: 'ENG', held: 3, force: 2870 },
  { id: 'husky', tag: 'ENG', from: 2650, until: 2950, invade: 'ITA', at: 'ITA' },
  { id: 'overlord', tag: 'ENG', from: 3075, until: 3400, invade: 'GER', at: 'FRA' },
];

/** Hranice kapitulace zemí (M92, obdoba surrender limit v HOI4): podíl bodů území v rukou nepřítele, při kterém se země vzdá (`share`), a totéž po pádu hlavního města (`capital`). Ostatní země mají výchozí hodnoty z `DIP`. */
export const CAP_LIMITS = {
  FRA: { share: 0.5, capital: 0.25 },   // politicky rozštěpená republika se po pádu Paříže vzdá
  SOV: { share: 0.85, capital: 0.8 },   // obrovská země bojuje i po ztrátě Moskvy
  ENG: { share: 0.7, capital: 0.45 },   // ostrovní velmoc s impériem za mořem
  ITA: { share: 0.45, capital: 0.2 },   // režim se po vylodění Spojenců rychle rozpadne
  GER: { share: 0.8, capital: 0.7 },    // režim bojuje do posledního (Berlín 1945)
};
