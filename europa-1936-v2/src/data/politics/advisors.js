// Poradci (M21): čtyři sloty, jednorázová cena v politické moci. Obecné role, žádné skutečné osoby.
export const ADV_SLOTS = {
  pol: { n: 'Politický poradce' },
  arm: { n: 'Vojenský poradce' },
  ind: { n: 'Průmyslový poradce' },
  sci: { n: 'Vědecký poradce' },
  // F4: vrchní velení (náčelníci štábů) – bonusy v poli `doc` s klíči doktrín (`engine/doc/core.js`, čte je `docMods`)
  army: { n: 'Náčelník generálního štábu', hc: true, icon: 'army' },
  navy: { n: 'Náčelník námořního štábu', hc: true, icon: 'navy' },
  air: { n: 'Náčelník leteckého štábu', hc: true, icon: 'air' },
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
  // F4: vrchní velení – vlastní role a čísla
  nac_utok: { slot: 'army', n: 'Stoupenec útoku', pp: 150, doc: { atk: 0.05 }, info: 'Útok divizí +5 %.' },
  nac_obrana: { slot: 'army', n: 'Stoupenec obrany', pp: 150, doc: { def: 0.05 }, info: 'Obrana divizí +5 %.' },
  nac_tanky: { slot: 'army', n: 'Teoretik obrněných sil', pp: 150, doc: { atkArm: 0.1 }, info: 'Útok obrněných divizí +10 %.' },
  nac_plan: { slot: 'army', n: 'Mistr plánování', pp: 120, doc: { planGain: 0.25 }, info: 'Armády plánují útok o 25 % rychleji.' },
  nac_zasoby: { slot: 'army', n: 'Logistik', pp: 120, doc: { supUse: -0.1 }, info: 'Spotřeba zásob divizí −10 %.' },
  nam_palba: { slot: 'navy', n: 'Dělostřelecký admirál', pp: 120, doc: { fire: 0.08 }, info: 'Palebná síla flotil +8 %.' },
  nam_ponorky: { slot: 'navy', n: 'Velitel ponorek', pp: 120, doc: { raid: 0.12 }, info: 'Nájezdy na konvoje +12 %.' },
  nam_konvoje: { slot: 'navy', n: 'Organizátor konvojů', pp: 120, doc: { escort: 0.15 }, info: 'Krytí konvojů +15 %.' },
  let_stihaci: { slot: 'air', n: 'Velitel stíhačů', pp: 120, doc: { patrol: 0.1 }, info: 'Síla hlídek stíhačů +10 %.' },
  let_podpora: { slot: 'air', n: 'Velitel podpory', pp: 120, doc: { cas: 0.12 }, info: 'Podpora pozemních bojů +12 %.' },
  let_bomby: { slot: 'air', n: 'Velitel bombardérů', pp: 120, doc: { bomb: 0.12 }, info: 'Účinek bombardování +12 %.' },
};
export const ADVISOR_IDS = Object.keys(ADVISORS);
