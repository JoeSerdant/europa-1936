// Poradci (M21): čtyři sloty, jednorázová cena v politické moci. Obecné role, žádné skutečné osoby.
export const ADV_SLOTS = {
  pol: { n: 'Politický poradce' },
  arm: { n: 'Vojenský poradce' },
  ind: { n: 'Průmyslový poradce' },
  sci: { n: 'Vědecký poradce' },
};
export const ADV_SLOT_IDS = Object.keys(ADV_SLOTS);

export const ADVISORS = {
  propag: { slot: 'pol', n: 'Propagandista', pp: 100, mod: { ws: 0.05 }, info: 'Zvedá podporu války.' },
  diplomat: { slot: 'pol', n: 'Zkušený diplomat', pp: 100, mod: { stab: 0.04 }, info: 'Uklidňuje domácí scénu.' },
  ideolog: { slot: 'pol', n: 'Státní ideolog', pp: 150, mod: { stab: 0.02, ws: 0.03 }, info: 'Drobně pomáhá oběma.' },
  reform: { slot: 'arm', n: 'Reformátor armády', pp: 120, mod: { man: 0.1 }, info: 'Víc rekrutů z odvodu.' },
  mobil: { slot: 'arm', n: 'Plánovač mobilizace', pp: 120, mod: { cons: -0.02, man: 0.05 }, info: 'Menší spotřební zboží a trochu víc rekrutů.' },
  veteran: { slot: 'arm', n: 'Válečný veterán', pp: 150, mod: { ws: 0.05, stab: 0.01 }, info: 'Jeho slovo má váhu u lidí i vojáků.' },
  koncern: { slot: 'ind', n: 'Průmyslový magnát', pp: 120, mod: { prod: 0.05 }, info: 'Výstup továren +5 %.' },
  stavitel: { slot: 'ind', n: 'Stavební inženýr', pp: 120, mod: { build: 0.1 }, info: 'Body stavby +10 %.' },
  surovinar: { slot: 'ind', n: 'Ředitel těžby', pp: 120, mod: { extract: 0.1 }, info: 'Těžba surovin +10 %.' },
  akademik: { slot: 'sci', n: 'Akademik', pp: 100, mod: { research: 0.1 }, info: 'Rychlost výzkumu +10 %.' },
  konstrukter: { slot: 'sci', n: 'Hlavní konstruktér', pp: 150, mod: { research: 0.05, prod: 0.02 }, info: 'Výzkum +5 %, výroba +2 %.' },
  organizator: { slot: 'sci', n: 'Organizátor výzkumu', pp: 120, mod: { research: 0.07, stab: 0.01 }, info: 'Výzkum +7 %, stabilita +1 %.' },
};
export const ADVISOR_IDS = Object.keys(ADVISORS);
