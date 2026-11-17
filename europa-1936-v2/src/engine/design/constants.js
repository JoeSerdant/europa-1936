// Vyvážení návrháře výzbroje (M97).
export const DESIGN = {
  XP_BASE: 10,       // základní cena návrhu ve zkušenostech
  XP_MOD: 5,         // za každý měněný modul
  RETOOL: 0.6,       // linky vyrábějící typ s novým návrhem si ponechají tento podíl efektivity (přezbrojení)
  AI_DAYS: 60,       // AI přehodnocuje návrhy jednou za tolik dní
  AI_RESERVE: 40,    // AI navrhuje, jen když jí po zaplacení zbyde tolik zkušeností (doktríny mají přednost)
  AI_COST_W: 0.6,    // AI: váha ceny proti přínosu modulu
};
