// Stromy národních cílů (M22). Vlastní obsah a čísla. Každý strom je pole cílů; `x`, `y` = poloha v mřížce rozhraní.
//  days  dny plnění     req  všechny předpoklady   any  aspoň jeden   excl  vylučující cíle   ai  priorita AI (nižší dřív)
//  fx    okamžité účinky (viz SPEC § 4e)   mod   trvalé bonusy
const F = (id, n, x, y, days, req, fx, extra = {}) => ({ id, n, x, y, days, req, fx, any: [], excl: [], mod: null, ai: 100, info: '', ...extra });
const civ = (n = 1) => ({ t: 'factory', k: 'civ', n });
const mil = (n = 1) => ({ t: 'factory', k: 'mil', n });

const DEFAULT = [
  F('def_ind', 'Průmyslová expanze', 1, 0, 35, [], [civ()], { ai: 1, info: 'Nová civilní továrna.' }),
  F('def_arm', 'Zbrojní výroba', 0, 1, 35, ['def_ind'], [mil()], { ai: 2, info: 'Nová vojenská továrna.' }),
  F('def_unity', 'Národní jednota', 3, 0, 35, [], [{ t: 'stab', v: 0.05 }, { t: 'pp', v: 30 }], { ai: 3 }),
  F('def_road', 'Silnice a železnice', 2, 1, 35, ['def_ind'], [{ t: 'infra', n: 1 }], { ai: 4 }),
  F('def_army', 'Posílení armády', 3, 1, 35, ['def_unity'], [{ t: 'man', v: 0.003 }], { ai: 5 }),
  F('def_sci', 'Vědecký program', 4, 1, 35, ['def_unity'], [{ t: 'boostslot', v: 0.25 }], { ai: 6, mod: { research: 0.05 }, info: 'Trvale rychlejší výzkum.' }),
  F('def_stock', 'Modernizace zásob', 0, 2, 35, ['def_arm'], [{ t: 'stock', eq: 'pusky', n: 1500 }, { t: 'stock', eq: 'dela', n: 80 }], { ai: 7 }),
  F('def_def', 'Příprava obrany', 3, 2, 35, ['def_army'], [{ t: 'ws', v: 0.08 }, { t: 'law', cat: 'con', id: 'ext' }], { ai: 8, info: 'Zavede rozšířený odvod.' }),
];

export const FOCUS_TREES = {
  DEFAULT,
  GER: [
    F('ger_plan', 'Čtyřletý plán', 2, 0, 45, [], [civ(), mil()], { ai: 1, mod: { prod: 0.03 }, info: 'Řízené hospodářství: továrny a trvale vyšší výroba.' }),
    F('ger_road', 'Dálniční síť', 1, 1, 35, ['ger_plan'], [{ t: 'infra', n: 1 }, civ()], { ai: 2 }),
    F('ger_rearm', 'Zbrojní program', 3, 1, 45, ['ger_plan'], [mil(2)], { ai: 3 }),
    F('ger_auta', 'Motorizace', 1, 2, 35, ['ger_road'], [{ t: 'boost', id: 'auta2', v: 0.3 }, mil()], { ai: 4 }),
    F('ger_auto', 'Hospodářská soběstačnost', 3, 2, 35, ['ger_rearm'], [{ t: 'law', cat: 'trd', id: 'closed' }], { ai: 5, mod: { extract: 0.05 }, excl: ['ger_trade'], info: 'Uzavřené hospodářství, vlastní těžba.' }),
    F('ger_trade', 'Zámořský obchod', 4, 2, 35, ['ger_rearm'], [{ t: 'law', cat: 'trd', id: 'free' }], { ai: 6, mod: { imp: -0.1 }, excl: ['ger_auto'], info: 'Volný obchod, levnější dovoz.' }),
    F('ger_conscr', 'Branná výchova', 2, 3, 35, ['ger_rearm'], [{ t: 'man', v: 0.004 }, { t: 'ws', v: 0.06 }], { ai: 7 }),
    F('ger_tank', 'Tankové ambice', 0, 3, 45, ['ger_auta'], [{ t: 'boost', id: 'ltank2', v: 0.3 }, { t: 'stock', eq: 'ltanky', n: 60 }], { ai: 8 }),
  ],
  FRA: [
    F('fra_front', 'Pevnostní pás', 1, 0, 45, [], [{ t: 'infra', n: 1 }, { t: 'ws', v: 0.04 }], { ai: 1, info: 'Dlouhodobá obrana hranic.' }),
    F('fra_ind', 'Národní hospodářská obnova', 3, 0, 45, [], [civ(2)], { ai: 2 }),
    F('fra_arm', 'Znárodnění zbrojovek', 3, 1, 35, ['fra_ind'], [mil(2)], { ai: 3, mod: { prod: 0.02 } }),
    F('fra_army', 'Reforma armády', 1, 1, 35, ['fra_front'], [{ t: 'man', v: 0.004 }, { t: 'adv', slot: 'arm', id: 'reform' }], { ai: 4 }),
    F('fra_col', 'Zdroje z kolonií', 4, 1, 35, ['fra_ind'], [{ t: 'law', cat: 'trd', id: 'closed' }], { ai: 5, mod: { extract: 0.08 } }),
    F('fra_unity', 'Lidová jednota', 2, 2, 35, ['fra_army'], [{ t: 'stab', v: 0.08 }, { t: 'pp', v: 50 }], { ai: 6 }),
    F('fra_tank', 'Tankové divize', 0, 2, 45, ['fra_army'], [{ t: 'boost', id: 'ltank2', v: 0.3 }, { t: 'stock', eq: 'ltanky', n: 50 }], { ai: 7 }),
  ],
  ENG: [
    F('eng_ind', 'Obnova průmyslu', 2, 0, 35, [], [civ(2)], { ai: 1 }),
    F('eng_sci', 'Radiolokační výzkum', 1, 1, 45, ['eng_ind'], [{ t: 'boostslot', v: 0.3 }], { ai: 2, mod: { research: 0.08 }, info: 'Silný vědecký sektor.' }),
    F('eng_rearm', 'Program přezbrojení', 3, 1, 45, ['eng_ind'], [mil(2)], { ai: 3 }),
    F('eng_nav', 'Zámořské zásobování', 4, 2, 35, ['eng_rearm'], [{ t: 'law', cat: 'trd', id: 'free' }], { ai: 4, mod: { imp: -0.1 } }),
    F('eng_army', 'Expediční armáda', 2, 2, 35, ['eng_rearm'], [{ t: 'man', v: 0.003 }, { t: 'ws', v: 0.08 }], { ai: 5 }),
    F('eng_unity', 'Národní svornost', 0, 2, 35, ['eng_sci'], [{ t: 'stab', v: 0.06 }, { t: 'pp', v: 40 }], { ai: 6 }),
  ],
  ITA: [
    F('ita_ind', 'Hospodářský program', 2, 0, 45, [], [civ(), mil()], { ai: 1 }),
    F('ita_auto', 'Soběstačnost', 1, 1, 35, ['ita_ind'], [{ t: 'law', cat: 'trd', id: 'closed' }], { ai: 2, mod: { extract: 0.06 } }),
    F('ita_army', 'Reforma armády', 3, 1, 35, ['ita_ind'], [{ t: 'man', v: 0.004 }, { t: 'ws', v: 0.05 }], { ai: 3 }),
    F('ita_arm', 'Zbrojní podniky', 1, 2, 45, ['ita_auto'], [mil(2)], { ai: 4 }),
    F('ita_sci', 'Technické ústavy', 3, 2, 35, ['ita_army'], [{ t: 'boostslot', v: 0.25 }], { ai: 5, mod: { research: 0.05 } }),
    F('ita_road', 'Silniční program', 2, 3, 35, ['ita_arm'], [{ t: 'infra', n: 1 }], { ai: 6 }),
  ],
  SOV: [
    F('sov_plan', 'Pětiletý plán', 2, 0, 45, [], [civ(2), mil(1)], { ai: 1, mod: { build: 0.05 } }),
    F('sov_heavy', 'Těžký průmysl', 1, 1, 45, ['sov_plan'], [mil(3)], { ai: 2 }),
    F('sov_rail', 'Železniční výstavba', 3, 1, 35, ['sov_plan'], [{ t: 'infra', n: 2 }], { ai: 3 }),
    F('sov_sci', 'Akademie věd', 4, 2, 35, ['sov_rail'], [{ t: 'boostslot', v: 0.25 }], { ai: 4, mod: { research: 0.05 } }),
    F('sov_army', 'Přezbrojení armády', 1, 2, 45, ['sov_heavy'], [{ t: 'stock', eq: 'pusky', n: 4000 }, { t: 'stock', eq: 'dela', n: 150 }, { t: 'man', v: 0.003 }], { ai: 5 }),
    F('sov_tank', 'Tankové zbraně', 2, 3, 45, ['sov_army'], [{ t: 'boost', id: 'ltank2', v: 0.3 }, { t: 'stock', eq: 'ltanky', n: 100 }], { ai: 6 }),
  ],
  POL: [
    F('pol_ind', 'Ústřední průmyslová oblast', 2, 0, 45, [], [civ(2), mil()], { ai: 1 }),
    F('pol_army', 'Plán všeobecné obrany', 1, 1, 35, ['pol_ind'], [{ t: 'man', v: 0.004 }, { t: 'ws', v: 0.06 }], { ai: 2 }),
    F('pol_road', 'Magistrály', 3, 1, 35, ['pol_ind'], [{ t: 'infra', n: 1 }], { ai: 3 }),
    F('pol_arm', 'Zbrojní program', 1, 2, 45, ['pol_army'], [mil(2), { t: 'stock', eq: 'pdela', n: 60 }], { ai: 4 }),
    F('pol_unity', 'Národní svornost', 3, 2, 35, ['pol_road'], [{ t: 'stab', v: 0.06 }, { t: 'pp', v: 40 }], { ai: 5 }),
  ],
  CZE: [
    F('cze_ind', 'Zbrojní průmysl', 2, 0, 35, [], [mil(2)], { ai: 1, mod: { prod: 0.03 } }),
    F('cze_fort', 'Pohraniční opevnění', 1, 1, 45, ['cze_ind'], [{ t: 'infra', n: 1 }, { t: 'ws', v: 0.06 }], { ai: 2 }),
    F('cze_tank', 'Pancéřové zbraně', 3, 1, 45, ['cze_ind'], [{ t: 'boost', id: 'ltank2', v: 0.3 }, { t: 'stock', eq: 'ltanky', n: 60 }], { ai: 3 }),
    F('cze_unity', 'Národní svornost', 2, 2, 35, ['cze_fort'], [{ t: 'stab', v: 0.06 }, { t: 'pp', v: 40 }], { ai: 4 }),
    F('cze_export', 'Zbrojní vývoz', 4, 2, 35, ['cze_tank'], [civ(), { t: 'law', cat: 'trd', id: 'free' }], { ai: 5 }),
  ],
  SPR: [
    F('spr_order', 'Obnova pořádku', 2, 0, 45, [], [{ t: 'stab', v: 0.08 }, { t: 'pp', v: 60 }], { ai: 1 }),
    F('spr_ind', 'Obnova hospodářství', 1, 1, 35, ['spr_order'], [civ(2)], { ai: 2 }),
    F('spr_army', 'Reforma armády', 3, 1, 35, ['spr_order'], [{ t: 'man', v: 0.003 }, { t: 'ws', v: 0.05 }], { ai: 3 }),
    F('spr_mine', 'Těžba rud', 1, 2, 35, ['spr_ind'], [{ t: 'boost', id: 'tez1', v: 0.3 }], { ai: 4, mod: { extract: 0.08 } }),
    F('spr_arm', 'Zbrojní dílny', 3, 2, 45, ['spr_army'], [mil()], { ai: 5 }),
  ],
};

/** Vyhledání cíle podle id (unikátní napříč stromy). */
export const FOCUS_BY_ID = {};
for (const tag in FOCUS_TREES) for (const f of FOCUS_TREES[tag]) FOCUS_BY_ID[f.id] = f;
export const treeOf = (tag) => FOCUS_TREES[tag] || FOCUS_TREES.DEFAULT;
