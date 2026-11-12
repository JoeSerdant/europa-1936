// Vyvážení námořnictva (M27): všechna čísla na jednom místě. Čas v hodinách, rychlost v km/h.
export const NAV = {
  DMG: 0.3,             // podíl síly strany, který za den zničí palba protivníka rovné její síle
  DMG_CAP: 0.4,         // nejvyšší denní ztráta síly strany
  RETREAT: 0.5,         // flotila ustoupí, když její síla klesne pod tento podíl maxima
  TR_SPEED: 25,         // rychlost transportních lodí (km/h)
  LOAD_H: 24,           // doba nalodění (hodiny)
  LAND_ORG: 0.8,        // zbytek organizace po vylodění mimo přístav
  FLEET_MAX: 12,        // nejvíc flotil na zemi
  DOCK_RES_MIN: 0,      // rezerva
  ROUTE_MAX_KM: 6000,   // nejdelší trasa přepravy
  TRADE_MAX_KM: 20000,  // nejdelší námořní obchodní trasa
  CONVOY_AMT: 4,        // jednotek suroviny za den na jeden konvoj (transportní loď)
  CONVOY_KM: 3000,      // každých tolik km trasy stojí smlouvu o konvoj navíc
  RAID_COEF: 0.01,      // denní riziko konvoje za bod palebné síly nepřátelských lodí na trase
  RAID_MAX: 0.8,        // nejvyšší riziko
  ESCORT_K: 0.7,
  CV_SUPPRESS: 1,       // letadlové lodě (M81): podíl síly protivníka vyřazený prvním úderem snižuje jeho palbu tolikrát
  SUB_RAID: 1.5,        // násobek palebné síly ponorek proti konvojům
  MISSION_PATROL: 0.15, // mise Hlídka: bonus palby flotily v boji
  MISSION_RAID: 1.5,    // mise Nájezdy: násobek síly flotily proti konvojům
  MISSION_EVADE: 0.6,   // mise Nájezdy: flotila v boji uhýbá – tolik ztrát utrpí i způsobí
  MISSION_ESCORT: 1.5,  // mise Doprovod: násobek krytí konvojů        // kolik z palebné síly vlastních lodí na trase ruší síly nájezdníků
};

/** Mise flotil (M81): '' = bez mise (drží oblast). */
export const NAV_MISSIONS = {
  patrol: { n: 'Hlídka', info: 'Flotila vyhledává nepřítele v oblasti: lepší palba v boji.' },
  raid: { n: 'Nájezdy', info: 'Flotila loví konvoje na trasách oblastí a boji se silnějším se vyhýbá.' },
  escort: { n: 'Doprovod', info: 'Flotila kryje vlastní a spojenecké konvoje v oblasti.' },
};
export const NAV_MISSION_IDS = Object.keys(NAV_MISSIONS);
