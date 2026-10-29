// Vyvážení doktrín (M34): zkušenosti se sbírají denně a platí se jimi doktríny.
export const DOC = {
  COST: [50, 80, 120],     // cena doktríny podle stupně
  XP_START: 25,            // zkušenosti na začátku hry
  XP_MAX: 300,             // strop zásoby zkušeností
  LAND_BASE: 0.25,         // denní zisk armády bez bojů
  LAND_BATTLE: 0.03,       // za každou divizi v boji
  LAND_BATTLE_MAX: 2.5,    // nejvíc z bojů za den
  AIR_BASE: 0.15,
  AIR_MISSION: 0.012,      // za letadlo na misi (každých 10 letadel = 0,12)
  AIR_MAX: 2,
  SEA_BASE: 0.15,
  SEA_FLEET: 0.05,         // za flotilu na moři
  SEA_MAX: 1.5,
};
