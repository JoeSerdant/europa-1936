// Rozhodnutí (M35): jednorázové akce za politickou moc s obnovovací dobou. Vlastní texty a čísla.
//  cat    kategorie v okně           cost   cena v politické moci       cd   dní do dalšího použití (99999 = jednou za hru)
//  when   podmínky (data): war true/false, stab / ws [min, max], tag [tagy], ideo [ideologie], year (od roku)
//  fx     účinky ve tvaru účinků cílů a událostí (nat/effects.js)    ai   smí je používat AI
export const DECISION_CATS = { eco: 'Hospodářství', mil: 'Armáda', pol: 'Politika', nat: 'Národní' };

export const DECISIONS = [
  // ---- hospodářství ----
  { id: 'zbrojni_pujcka', cat: 'eco', n: 'Zbrojní půjčka', info: 'Státní půjčka pro zbrojovky: nová vojenská továrna, ale rozladěné obyvatelstvo.', cost: 40, cd: 180, when: { stab: [0.4, 1] }, fx: [{ t: 'factory', k: 'mil', n: 1 }, { t: 'stab', v: -0.03 }], ai: true },
  { id: 'prumyslova_kampan', cat: 'eco', n: 'Průmyslová kampaň', info: 'Podpora výstavby civilního průmyslu.', cost: 30, cd: 120, when: { stab: [0.35, 1] }, fx: [{ t: 'factory', k: 'civ', n: 1 }, { t: 'stab', v: -0.02 }], ai: true },
  { id: 'pruzkum_surovin', cat: 'eco', n: 'Průzkum surovin', info: 'Geologové a stavbaři: modernizace komunikací v hlavním státě.', cost: 35, cd: 150, when: {}, fx: [{ t: 'infra', n: 1 }], ai: true },
  { id: 'sbirka_kovu', cat: 'eco', n: 'Celostátní sbírka kovů', info: 'Za války obyvatelstvo odevzdá kov na zbraně.', cost: 20, cd: 90, when: { war: true }, fx: [{ t: 'stock', eq: 'pusky', n: 400 }, { t: 'stock', eq: 'podpora', n: 80 }], ai: true },
  // ---- armáda ----
  { id: 'mimoradny_odvod', cat: 'mil', n: 'Mimořádný odvod', info: 'Další ročníky do zbraně: více lidské síly, ale ubývá nadšení pro válku.', cost: 45, cd: 120, when: { stab: [0.3, 1] }, fx: [{ t: 'man', v: 0.005 }, { t: 'ws', v: -0.04 }], ai: true },
  { id: 'velke_manevry', cat: 'mil', n: 'Velké manévry', info: 'Cvičení armády v míru: zkušenosti armády.', cost: 25, cd: 90, when: { war: false }, fx: [{ t: 'xp', b: 'land', n: 40 }], ai: true },
  { id: 'letecke_dny', cat: 'mil', n: 'Letecké dny', info: 'Přehlídka a cvičení letectva: zkušenosti letectva.', cost: 20, cd: 90, when: { war: false }, fx: [{ t: 'xp', b: 'air', n: 40 }], ai: true },
  { id: 'navsteva_pristavu', cat: 'mil', n: 'Námořní cvičení', info: 'Společná plavba flotily: zkušenosti námořnictva.', cost: 20, cd: 90, when: { war: false }, fx: [{ t: 'xp', b: 'sea', n: 40 }], ai: true },
  { id: 'vojenska_reforma', cat: 'mil', n: 'Vojenská reforma', info: 'Reforma štábů: urychlí právě zkoumanou technologii.', cost: 60, cd: 300, when: {}, fx: [{ t: 'boostslot', v: 0.3 }], ai: true },
  // ---- politika ----
  { id: 'propaganda', cat: 'pol', n: 'Propagandistická kampaň', info: 'Rozhlas, plakáty a filmové týdeníky zvedají podporu války.', cost: 30, cd: 60, when: { ws: [0, 0.9] }, fx: [{ t: 'ws', v: 0.05 }], ai: true },
  { id: 'cenzura', cat: 'pol', n: 'Zpřísnění cenzury', info: 'Utlumí nepokoje, za cenu nespokojených novinářů.', cost: 25, cd: 120, when: { stab: [0, 0.6] }, fx: [{ t: 'stab', v: 0.05 }, { t: 'ws', v: -0.02 }], ai: true },
  { id: 'volby', cat: 'pol', n: 'Vyhlásit volby', info: 'Vládnoucí strana získá nový mandát.', cost: 40, cd: 365, when: { ideo: ['democracy'] }, fx: [{ t: 'stab', v: 0.06 }], ai: true },
  { id: 'cistky', cat: 'pol', n: 'Zásah proti opozici', info: 'Tvrdý zákrok proti odpůrcům režimu: stabilita roste, podpora války klesá.', cost: 30, cd: 240, when: { ideo: ['fascism', 'communism'], stab: [0, 0.7] }, fx: [{ t: 'stab', v: 0.07 }, { t: 'ws', v: -0.03 }], ai: true },
  { id: 'mobilizacni_kampan', cat: 'pol', n: 'Mobilizační kampaň', info: 'Za války: země se sjednotí kolem armády.', cost: 35, cd: 90, when: { war: true, ws: [0, 0.9] }, fx: [{ t: 'ws', v: 0.07 }], ai: true },
  // ---- národní ----
  { id: 'nem_remilitarizace', cat: 'nat', n: 'Obnova branné moci', info: 'Zbrojní program říše: dvě vojenské továrny a vzedmutí nadšení.', cost: 60, cd: 99999, when: { tag: ['GER'] }, fx: [{ t: 'factory', k: 'mil', n: 2 }, { t: 'ws', v: 0.05 }], ai: true },
  { id: 'sov_petiletka', cat: 'nat', n: 'Pětiletý plán', info: 'Centrálně plánovaná výstavba průmyslu.', cost: 60, cd: 99999, when: { tag: ['SOV'] }, fx: [{ t: 'factory', k: 'civ', n: 2 }, { t: 'infra', n: 1 }], ai: true },
  { id: 'eng_zbrojeni', cat: 'nat', n: 'Program přezbrojení', info: 'Rozšíření zbrojního průmyslu v metropoli.', cost: 60, cd: 99999, when: { tag: ['ENG'] }, fx: [{ t: 'factory', k: 'mil', n: 2 }, { t: 'boostslot', v: 0.2 }], ai: true },
  { id: 'fra_opevneni', cat: 'nat', n: 'Obranný program', info: 'Dokončení pohraničního opevnění a zásobování.', cost: 50, cd: 99999, when: { tag: ['FRA'] }, fx: [{ t: 'infra', n: 1 }, { t: 'stock', eq: 'dela', n: 120 }], ai: true },
  { id: 'ita_impero', cat: 'nat', n: 'Imperiální nadšení', info: 'Vlna vlastenectví v celé zemi.', cost: 45, cd: 99999, when: { tag: ['ITA'] }, fx: [{ t: 'ws', v: 0.08 }, { t: 'factory', k: 'civ', n: 1 }], ai: true },
  { id: 'pol_branna', cat: 'nat', n: 'Obranná výstavba', info: 'Pevnosti a sklady na východních hranicích.', cost: 40, cd: 99999, when: { tag: ['POL'] }, fx: [{ t: 'stock', eq: 'pusky', n: 600 }, { t: 'factory', k: 'mil', n: 1 }], ai: true },
];
export const DECISION_BY_ID = Object.fromEntries(DECISIONS.map((d) => [d.id, d]));
