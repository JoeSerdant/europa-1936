// Vyvážení průmyslu: všechna čísla na jednom místě (vlastní hodnoty). Čas ve dnech, podíly 0–1.
export const I = {
  IC_PER_FAC: 5,            // výrobní / stavební body továrny za den
  EFF_START: 0.1,           // efektivita nové linky (a po změně druhu výzbroje)
  EFF_CAP: 0.5,             // strop efektivity (M20: výzkum ho zvedá)
  EFF_GROW: 0.035,          // denní přírůstek: podíl vzdálenosti ke stropu
  EFF_INIT: 0.4,            // efektivita linek na začátku hry
  LINE_MAX_FAC: 20,         // nejvíc továren na jedné lince
  LINES_MAX: 15,            // nejvíc linek na zemi
  RES_FLOOR: 0.25,          // nejmenší výkon linky při nedostatku suroviny
  TRADE_CIV: 0.12,          // civilní továrny spotřebované jednou jednotkou dováženou za den
  TRADE_MAX: 40,            // nejvíc smluv na zemi (dovoz i vývoz dohromady)
  TRADE_AMT_MAX: 30,        // nejvíc jedné suroviny jednou smlouvou za den
  QUEUE_MAX: 40,            // nejdelší fronta staveb na zemi
  CONS_TIER: { 1: 0.35, 2: 0.3, 3: 0.25 },   // spotřební zboží podle velikosti země
  CONS_MAX: 0.8,
  INF_MAX: 3,               // nejvyšší počet vylepšení infrastruktury státu
};
