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
  ESCORT_K: 0.7,        // kolik z palebné síly vlastních lodí na trase ruší síly nájezdníků
};
