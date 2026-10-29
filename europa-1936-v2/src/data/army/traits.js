// Rysy velitelů. `mod` se sčítá s bonusy z dovedností (viz engine/army/leaders.js):
//  atk, def           přidává se k násobiči útoku a obrany jednotek armády
//  atkArm             navíc útok pancéřových divizí; atkInf/defInf navíc pro pěší divize; hillAtk/hillDef v pahorkatině a horách
//  planCap, planGain  strop plánování (přičte se) a rychlost jeho růstu (násobí)
//  orgRegen           rychlost obnovy organizace (násobí); supUse spotřeba zásob (násobí); speed rychlost pohybu (násobí)

export const TRAITS = {
  utocny:      { n: 'Útočný duch', info: '+6 % útoku', mod: { atk: 0.06 } },
  obrance:     { n: 'Mistr obrany', info: '+6 % obrany', mod: { def: 0.06 } },
  opatrny:     { n: 'Opatrný', info: '+3 % obrany, strop plánování +4 %', mod: { def: 0.03, planCap: 0.04 } },
  odvazny:     { n: 'Odvážný', info: '+8 % útoku, −4 % obrany', mod: { atk: 0.08, def: -0.04 } },
  organizator: { n: 'Organizátor', info: 'Organizace se obnovuje o 15 % rychleji', mod: { orgRegen: 0.15 } },
  logistik:    { n: 'Logistik', info: 'Spotřeba zásob −8 %, rychlost +4 %', mod: { supUse: -0.08, speed: 0.04 } },
  tankista:    { n: 'Znalec tanků', info: '+10 % útoku pancéřových divizí', mod: { atkArm: 0.1 } },
  horal:       { n: 'Horal', info: '+10 % útoku a obrany v pahorkatině a horách', mod: { hillAtk: 0.1, hillDef: 0.1 } },
  strateg:     { n: 'Stratég', info: 'Strop plánování +8 %, plánování o 30 % rychleji', mod: { planCap: 0.08, planGain: 0.3 } },
  pesak:       { n: 'Znalec pěchoty', info: '+4 % útoku a obrany pěších divizí', mod: { atkInf: 0.04, defInf: 0.04 } },
};

export const TRAIT_IDS = Object.keys(TRAITS);
