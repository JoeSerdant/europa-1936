// Stromy technologií (M20). Čísla, jména i popisy jsou vlastní.
//  n      název                               cat   obor (viz CATS)
//  year   historický rok (dřív = pomalejší)   days  dnů výzkumu při rychlosti 1
//  req    předpoklady (id technologií)        info  popis
//  fx     účinky: lv { výzbroj: úroveň } | mod { effCap, build, extract, research } | slot: +1
// Technologie, jejichž id je klíč `unlock` v datech praporů, rot a výzbroje (mech, mtank, htank, spoj, log, nem), tu jednotku odemykají.

export const CATS = {
  pesi: { n: 'Pěchota' },
  zbran: { n: 'Dělostřelectvo' },
  tanky: { n: 'Tanky a motorizace' },
  podpora: { n: 'Podpora a logistika' },
  prumysl: { n: 'Průmysl a věda' },
};
export const CAT_IDS = Object.keys(CATS);

const t = (cat, n, year, days, req, fx, info) => ({ cat, n, year, days, req, fx, info });

export const TECHS = {
  // ---- pěchota ----
  pusky2: t('pesi', 'Opakovací pušky II', 1936, 70, [], { lv: { pusky: 2 } }, 'Modernější pušky a kulomety: lepší útok i obrana pěších praporů.'),
  pusky3: t('pesi', 'Samonabíjecí pušky', 1940, 100, ['pusky2'], { lv: { pusky: 3 } }, 'Vyšší palebná síla pěchoty.'),
  pusky4: t('pesi', 'Útočné pušky', 1943, 120, ['pusky3'], { lv: { pusky: 4 } }, 'Nejmodernější pěchotní zbraně dekády.'),
  // ---- dělostřelectvo ----
  dela2: t('zbran', 'Polní děla II', 1936, 90, [], { lv: { dela: 2 } }, 'Modernější houfnice a kanóny.'),
  dela3: t('zbran', 'Polní děla III', 1940, 110, ['dela2'], { lv: { dela: 3 } }, 'Větší dostřel a rychlejší palba.'),
  dela4: t('zbran', 'Polní děla IV', 1943, 130, ['dela3'], { lv: { dela: 4 } }, 'Dělostřelectvo s dálkovým řízením palby.'),
  pdela2: t('zbran', 'Protitanková děla II', 1936, 80, [], { lv: { pdela: 2 } }, 'Výkonnější protitanková děla.'),
  pdela3: t('zbran', 'Protitanková děla III', 1939, 100, ['pdela2'], { lv: { pdela: 3 } }, 'Průbojnější střely proti pancíři.'),
  pdela4: t('zbran', 'Protitanková děla IV', 1942, 120, ['pdela3'], { lv: { pdela: 4 } }, 'Dlouhé hlavně a podkaliberní střely.'),
  // ---- tanky a motorizace ----
  auta2: t('tanky', 'Nákladní automobily II', 1937, 70, [], { lv: { auta: 2 } }, 'Spolehlivější motorizace; vyšší bojová hodnota motorizovaných praporů.'),
  auta3: t('tanky', 'Nákladní automobily III', 1941, 90, ['auta2'], { lv: { auta: 3 } }, 'Terénní podvozky.'),
  auta4: t('tanky', 'Nákladní automobily IV', 1943, 110, ['auta3'], { lv: { auta: 4 } }, 'Čtyřkolý pohon a velká nosnost.'),
  vozy2: t('tanky', 'Obrněná vozidla II', 1937, 80, [], { lv: { vozy: 2 } }, 'Lepší pancíř a výzbroj průzkumných vozidel.'),
  vozy3: t('tanky', 'Obrněná vozidla III', 1941, 100, ['vozy2'], { lv: { vozy: 3 } }, 'Půlpásová a kolová vozidla nové generace.'),
  ltank2: t('tanky', 'Lehké tanky II', 1937, 90, [], { lv: { ltanky: 2 } }, 'Silnější motor a kanón lehkých tanků.'),
  ltank3: t('tanky', 'Lehké tanky III', 1940, 110, ['ltank2'], { lv: { ltanky: 3 } }, 'Zesílený pancíř.'),
  mech: t('tanky', 'Mechanizovaná pěchota', 1938, 100, ['auta2', 'vozy2'], {}, 'Odemyká mechanizovaný prapor (pěchota v obrněných transportérech).'),
  mtank: t('tanky', 'Střední tank', 1938, 120, ['ltank2'], {}, 'Odemyká střední tankový prapor a výrobu středních tanků: páteř tankových divizí.'),
  mtank2: t('tanky', 'Střední tank II', 1941, 120, ['mtank'], { lv: { mtanky: 2 } }, 'Dlouhý kanón a silnější pancíř.'),
  mtank3: t('tanky', 'Střední tank III', 1943, 130, ['mtank2'], { lv: { mtanky: 3 } }, 'Šikmý pancíř a kanón velké ráže.'),
  htank: t('tanky', 'Těžký tank', 1940, 150, ['mtank'], {}, 'Odemyká těžký tankový prapor a výrobu těžkých tanků: pomalé, ale téměř nezranitelné.'),
  htank2: t('tanky', 'Těžký tank II', 1943, 150, ['htank'], { lv: { htanky: 2 } }, 'Silnější kanón a pancíř těžkých tanků.'),
  // ---- podpora a logistika ----
  spoj: t('podpora', 'Spojovací roty', 1936, 60, [], {}, 'Odemyká spojovací rotu: rychlejší plánování útoků armády.'),
  log: t('podpora', 'Logistické roty', 1937, 70, ['auta2'], {}, 'Odemyká logistickou rotu: divize spotřebuje méně zásob.'),
  nem: t('podpora', 'Polní nemocnice', 1938, 70, [], {}, 'Odemyká polní nemocnici: rychlejší doplňování síly po bojích.'),
  podpora2: t('podpora', 'Podpůrná výzbroj II', 1938, 70, [], { lv: { podpora: 2 } }, 'Lepší vybavení podpůrných rot.'),
  podpora3: t('podpora', 'Podpůrná výzbroj III', 1942, 100, ['podpora2'], { lv: { podpora: 3 } }, 'Moderní polní vybavení.'),
  // ---- průmysl a věda ----
  org1: t('prumysl', 'Organizace výroby I', 1936, 60, [], { mod: { effCap: 0.05 } }, 'Strop efektivity výrobních linek +5 %.'),
  org2: t('prumysl', 'Organizace výroby II', 1938, 90, ['org1'], { mod: { effCap: 0.05 } }, 'Strop efektivity výrobních linek +5 %.'),
  org3: t('prumysl', 'Organizace výroby III', 1941, 110, ['org2'], { mod: { effCap: 0.05 } }, 'Strop efektivity výrobních linek +5 %.'),
  stav1: t('prumysl', 'Stavební technika I', 1936, 60, [], { mod: { build: 0.1 } }, 'Body stavby +10 %.'),
  stav2: t('prumysl', 'Stavební technika II', 1939, 90, ['stav1'], { mod: { build: 0.1 } }, 'Body stavby +10 %.'),
  stav3: t('prumysl', 'Stavební technika III', 1942, 110, ['stav2'], { mod: { build: 0.1 } }, 'Body stavby +10 %.'),
  tez1: t('prumysl', 'Těžba surovin I', 1937, 70, [], { mod: { extract: 0.1 } }, 'Těžba surovin +10 %.'),
  tez2: t('prumysl', 'Těžba surovin II', 1940, 100, ['tez1'], { mod: { extract: 0.1 } }, 'Těžba surovin +10 %.'),
  vyz1: t('prumysl', 'Vědecké ústavy', 1936, 70, [], { mod: { research: 0.1 } }, 'Rychlost výzkumu +10 %.'),
  vyz2: t('prumysl', 'Vědecká spolupráce', 1939, 100, ['vyz1'], { mod: { research: 0.1 } }, 'Rychlost výzkumu +10 %.'),
  lab1: t('prumysl', 'Výzkumná pracoviště I', 1938, 100, ['vyz1'], { slot: 1 }, 'Další slot výzkumu.'),
  lab2: t('prumysl', 'Výzkumná pracoviště II', 1941, 140, ['lab1', 'vyz2'], { slot: 1 }, 'Další slot výzkumu.'),
};
export const TECH_IDS = Object.keys(TECHS);

/** Národní úpravy rychlosti výzkumu (násobek; chybějící = 1). */
export const RESEARCH_NATIONAL = { GER: 1.1, ENG: 1.1, FRA: 1.05, SOV: 0.9, ITA: 0.9, CZE: 1.05, SWI: 1.05, SWE: 1.05 };

const MOD_TEXT = { effCap: 'strop efektivity linek', build: 'body stavby', extract: 'těžba surovin', research: 'rychlost výzkumu' };
const EQ_TEXT = { pusky: 'Pušky', dela: 'Polní děla', pdela: 'Protitanková děla', auta: 'Nákladní automobily', vozy: 'Obrněná vozidla', ltanky: 'Lehké tanky', mtanky: 'Střední tanky', htanky: 'Těžké tanky', podpora: 'Podpůrná výzbroj' };

/** Krátký výčet účinků technologie pro rozhraní. */
export function fxLines(id) {
  const fx = TECHS[id].fx, out = [];
  for (const e in fx.lv || {}) out.push(`${EQ_TEXT[e]}: úroveň ${fx.lv[e]}`);
  for (const m in fx.mod || {}) out.push(`${MOD_TEXT[m]} +${Math.round(fx.mod[m] * 100)} %`);
  if (fx.slot) out.push(`+${fx.slot} slot výzkumu`);
  return out;
}
