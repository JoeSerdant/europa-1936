// Průběžné národní cíle (M85): trvalé zaměření státu, které lze držet, když se neplní žádný běžný cíl. Dává bonus, dokud běží, a stojí denně
// politickou moc. Vlastní názvy a čísla; klíče `mod` jsou stejné jako u zákonů a poradců.
export const CONT_FOCUSES = {
  vyroba: { n: 'Zbrojní výroba', info: 'Závody dostávají přednost ve všem: výroba výzbroje roste.', mod: { prod: 0.05 } },
  stavby: { n: 'Stavební program', info: 'Státní zakázky a brigády urychlují stavby.', mod: { build: 0.1 } },
  veda: { n: 'Podpora vědy', info: 'Ústavy a univerzity mají plné rozpočty.', mod: { research: 0.06 } },
  nabor: { n: 'Náborová kampaň', info: 'Plakáty na každém rohu: příliv lidské síly roste.', mod: { man: 0.1 } },
  klid: { n: 'Vnitřní klid', info: 'Vláda tlumí spory a slibuje jistoty.', mod: { stab: 0.05 } },
  propaganda: { n: 'Válečná propaganda', info: 'Rozhlas a tisk připravují zemi na oběti.', mod: { ws: 0.06 } },
  tezba: { n: 'Těžební kampaň', info: 'Doly a vrty jedou na tři směny.', mod: { extract: 0.1 } },
};
export const CONT_IDS = Object.keys(CONT_FOCUSES);
