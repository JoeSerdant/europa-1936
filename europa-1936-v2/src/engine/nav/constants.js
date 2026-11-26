// Vyvážení námořnictva (M27): všechna čísla na jednom místě. Čas v hodinách, rychlost v km/h.
export const NAV = {
  DMG: 0.3,
  LV_ATK: 0.12,         // M96: palba lodi za každou úroveň techniky jejího typu nad první
  LV_HP: 0.08,          // M96: odolnost lodi za úroveň techniky             // podíl síly strany, který za den zničí palba protivníka rovné její síle
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
  PLANE_LOSS: 0.04,     // palubní letouny (M90): denní ztráta letounů flotily v bitvě (protiletadlová palba)
  PLANE_DUEL: 0.2,      // další ztráta podle podílu nepřátelských palubních letounů ve vzdušném souboji nad flotilami
  PLANE_REFILL: 8,      // nejvíc letounů, které flotila za den v domovském přístavu nalodí z rezervy
  PLANE_CAS: 0.5,       // podíl podpůrné síly palubních letounů (`cas` v PLANES) pro boje v pobřežních státech mořské oblasti
  SUB_RAID: 1.5,        // násobek palebné síly ponorek proti konvojům
  MISSION_PATROL: 0.15, // mise Hlídka: bonus palby flotily v boji
  MISSION_RAID: 1.5,    // mise Nájezdy: násobek síly flotily proti konvojům
  MISSION_EVADE: 0.6,   // mise Nájezdy: flotila v boji uhýbá – tolik ztrát utrpí i způsobí
  MISSION_ESCORT: 1.5,  // mise Doprovod: násobek krytí konvojů        // kolik z palebné síly vlastních lodí na trase ruší síly nájezdníků
  // F4c: poškození a opravy, námořní základny, miny, pobřežní pevnosti
  SINK_SHARE: 0.5,      // podíl ztrát v boji, který lodě potopí; zbytek je poškození flotily (`dm`, oslabí palbu i odolnost)
  DMG_MAX: 0.7,         // nejvyšší poškození flotily
  REPAIR: 0.03,         // denní oprava v oblasti s vlastním přístavem (stojící flotila)
  REPAIR_LV: 0.02,      // navíc za každou úroveň přístavu a námořní základny (nejlepší u oblasti)
  MINES_MAX: 100,       // nejvíc min jedné země v oblasti
  MINE_LAY: 1.5,        // denně min za každý torpédoborec a ponorku flotily na misi Kladení min
  MINE_SWEEP: 2,        // denně odstraněných nepřátelských min za každý torpédoborec na misi Odminování
  MINE_DECAY: 0.01,     // denní úbytek min (moře je odnáší)
  MINE_DMG: 0.0008,     // denní poškození flotily za každou nepřátelskou minu v její oblasti (odminovávající polovina)
  MINE_RISK: 0.003,     // riziko konvoje za nepřátelskou minu v oblasti trasy (nejvýš RAID_MAX)
  CFORT_ORG: 0.25,
  // S9: přestavby flotil a příprava vylodění
  REFIT_DAYS: 30,       // dní přestavby flotily v přístavu s námořní základnou (každá úroveň základny nad první o 10 % rychleji)
  REFIT_POW: 0.5,       // síla flotily v boji během přestavby
  REFIT_DOK: 0.25,      // loděnic na každou přestavovanou loď (chybí výrobním linkám lodí)
  PREP_DAYS: 20,        // dní přípravy vylodění na 100 % (divize stojí v přístavu)
  PREP_MIN: 0.5,        // nejmenší příprava, se kterou divize vyplují na nepřátelské pobřeží
  PREP_ORG: 0.5,        // ztráta organizace při vylodění bez přípravy (× chybějící příprava)      // pobřežní pevnost: vyloďující se divize ztratí tento podíl organizace za úroveň
};

/** Mise flotil (M81): '' = bez mise (drží oblast). */
export const NAV_MISSIONS = {
  patrol: { n: 'Hlídka', info: 'Flotila vyhledává nepřítele v oblasti: lepší palba v boji.' },
  raid: { n: 'Nájezdy', info: 'Flotila loví konvoje na trasách oblastí a boji se silnějším se vyhýbá.' },
  escort: { n: 'Doprovod', info: 'Flotila kryje vlastní a spojenecké konvoje v oblasti.' },
  mine: { n: 'Kladení min', info: 'Torpédoborce a ponorky kladou miny: nepřátelské flotily v oblasti se poškozují a konvoje ztrácejí lodě.' },   // F4c
  sweep: { n: 'Odminování', info: 'Torpédoborce odstraňují nepřátelské miny v oblasti.' },
};
export const NAV_MISSION_IDS = Object.keys(NAV_MISSIONS);
