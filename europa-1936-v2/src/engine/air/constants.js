// Vyvážení letectva (M30): všechna čísla na jednom místě (vlastní hodnoty).
export const AIR = {
  PER_LEVEL: 60,          // letounů na jednu úroveň letiště ve státě
  BASE_MAX: 5,            // nejvyšší úroveň letiště
  WINGS_MAX: 40,          // nejvíc leteckých křídel na zemi
  LV_MULT: 0.12,          // příplatek k síle za každou úroveň techniky nad první
  CAS_COEF: 0.0009,       // bonus k útoku divizí na jednotku efektivní síly podpory
  CAS_MAX: 0.3,           // strop bonusu podpory
  COVER_K: 8,             // „setrvačnost“ krytí: bez hlídek na obou stranách je krytí úplné
  LOSS_AIR: 0.07,         // denní ztráty hlídek při vyrovnaném boji
  LOSS_INT: 0.05,         // denní ztráty letadel na misích, když je nikdo nekryje
  ATTRITION: 0.004,       // denní opotřebení letadel na misi
  BOMB_WS: 0.00002,       // pokles podpory války za jednotku efektivní síly bombardování
  BOMB_WS_MAX: 0.03,      // nejvíc za den
  BOMB_STOCK: 0.00001,    // podíl zničeného skladu výzbroje za jednotku síly
  BOMB_STOCK_MAX: 0.02,
  LOST_BASE_LOSS: 0.3,    // podíl letadel ztracený, když křídlo přijde o letiště
  FORM_MAX: 400,          // nejvíc letadel v jednom křídle
};
