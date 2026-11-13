// Národní duchové (M74): trvalé nebo dočasné rysy země s bonusy a postihy (stejné klíče jako zákony a poradci:
// stab, ws, cons, build, prod, extract, imp, man, research). Vlastní názvy, texty a čísla.
//  tone  'good' | 'bad' | 'mixed' – barva na kartě státu
//  army  vojenské bonusy ducha (M88; klíče z `MOD_KEYS` v engine/army/leaders.js: atk, def, speed, orgRegen, planGain, …) – čte je `modsOf` divizí
export const SPIRITS = {
  zbrojni_horecka: { n: 'Zbrojní horečka', info: 'Stát lije peníze do zbrojovek na úkor spotřeby.', tone: 'mixed', mod: { prod: 0.05, cons: 0.03 } },
  revize_smluv: { n: 'Touha po revizi smluv', info: 'Společnost nepřijala poválečné uspořádání a je ochotná za jeho změnu bojovat.', tone: 'good', mod: { ws: 0.05 } },
  rozstepena_republika: { n: 'Rozštěpená republika', info: 'Vlády se střídají po měsících a ulice patří krajnostem.', tone: 'bad', mod: { stab: -0.05 } },
  obranne_mysleni: { n: 'Obranné myšlení', info: 'Vzpomínka na zákopy velí schovat se za pevnosti a nikam nepospíchat.', tone: 'bad', mod: { ws: -0.05, build: 0.05 }, army: { atk: -0.1 } },
  tezkopadne_veleni: { n: 'Těžkopádné velení', info: 'Rozkazy putují telefonem a spojkami; na rychlý manévr armáda připravená není.', tone: 'bad', mod: {}, army: { def: -0.1, orgRegen: -0.2 } },
  ukolova_taktika: { n: 'Úkolová taktika', info: 'Velitelé na místě jednají podle vlastního úsudku a útok nečeká na rozkaz shora.', tone: 'good', mod: {}, army: { atk: 0.12, planGain: 0.25 } },
  usmirovani: { n: 'Politika usmiřování', info: 'Veřejnost i vláda věří, že ústupky válku odvrátí.', tone: 'bad', mod: { ws: -0.06 } },
  svetove_imperium: { n: 'Světové impérium', info: 'Zámořské državy dodávají suroviny a obchodní cesty jsou krátké.', tone: 'good', mod: { imp: -0.1, extract: 0.05 } },
  cistky: { n: 'Velké čistky', info: 'Strach ochromil důstojnický sbor i úřady a nikdo si není jistý zítřkem.', tone: 'bad', mod: { stab: -0.05, ws: -0.03 }, army: { atk: -0.08, def: -0.1, orgRegen: -0.1 } },
  petiletky: { n: 'Pětiletý plán', info: 'Celá země je jedno staveniště.', tone: 'good', mod: { build: 0.1 } },
  sen_o_imperiu: { n: 'Sen o novém impériu', info: 'Režim slibuje návrat staré slávy a lidé tomu zatím věří.', tone: 'good', mod: { ws: 0.05 } },
  slaby_prumysl: { n: 'Slabá průmyslová základna', info: 'Chybí suroviny, stroje i zkušení dělníci.', tone: 'bad', mod: { prod: -0.05 } },
  mezi_mlyny: { n: 'Mezi dvěma mocnostmi', info: 'Země ví, že stojí v cestě silnějším sousedům, a podle toho se chystá.', tone: 'good', mod: { ws: 0.05, man: 0.05 } },
  zbrojovka: { n: 'Zbrojovka střední Evropy', info: 'Strojírny a zbrojovky patří ke světové špičce.', tone: 'good', mod: { prod: 0.05, research: 0.03 } },
  rozdelena_spolecnost: { n: 'Rozdělená společnost', info: 'Země je rozťatá vejpůl a obě poloviny se ozbrojují.', tone: 'bad', mod: { stab: -0.08 } },
  tradice_neutrality: { n: 'Tradice neutrality', info: 'Země se válkám dlouho vyhýbala a nechce na tom nic měnit.', tone: 'mixed', mod: { ws: -0.05, stab: 0.03 } },
  ropne_bohatstvi: { n: 'Ropné bohatství', info: 'Vrty chrlí ropu a cizí společnosti stojí ve frontě.', tone: 'good', mod: { extract: 0.1 } },
  // dočasní duchové (přidává je engine nebo účinek `spirit`)
  porevolucni_chaos: { n: 'Porevoluční chaos', info: 'Po převratu se úřady teprve skládají a továrny stojí.', tone: 'bad', mod: { prod: -0.1, build: -0.1 } },
  vitezna_nalada: { n: 'Vítězná nálada', info: 'Vítězství ve válce stmelilo zemi.', tone: 'good', mod: { stab: 0.04, ws: 0.04 } },
  valecne_usili: { n: 'Válečné úsilí', info: 'Mimořádná kampaň vybičovala výrobu, ale lidé jsou unavení.', tone: 'mixed', mod: { prod: 0.08, stab: -0.03 } },
};
export const SPIRIT_IDS = Object.keys(SPIRITS);

/** Počáteční duchové zemí (trvalí, dokud je účinek `unspirit` neodstraní). */
export const SPIRIT_START = {
  GER: ['zbrojni_horecka', 'revize_smluv', 'ukolova_taktika'],
  FRA: ['rozstepena_republika', 'obranne_mysleni', 'tezkopadne_veleni'],
  ENG: ['usmirovani', 'svetove_imperium'],
  SOV: ['cistky', 'petiletky'],
  ITA: ['sen_o_imperiu', 'slaby_prumysl'],
  POL: ['mezi_mlyny'],
  CZE: ['zbrojovka'],
  SPR: ['rozdelena_spolecnost'],
  HUN: ['revize_smluv'],
  BUL: ['revize_smluv'],
  SWI: ['tradice_neutrality'], SWE: ['tradice_neutrality'], NOR: ['tradice_neutrality'], DEN: ['tradice_neutrality'],
  HOL: ['tradice_neutrality'], BEL: ['tradice_neutrality'], IRE: ['tradice_neutrality'], POR: ['tradice_neutrality'],
  ROM: ['ropne_bohatstvi'], PER: ['ropne_bohatstvi'], IRQ: ['ropne_bohatstvi'], SAU: ['ropne_bohatstvi'],
};
