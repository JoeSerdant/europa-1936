// Vyvážení okupace (M38): všechna čísla na jednom místě (vlastní hodnoty).
export const OCC = {
  POP_PER_DIV: 400,     // tisíc obyvatel na jednu divizi garnizony (kolik jich okupovaný stát „potřebuje“)
  R0: 0.35,             // počáteční odboj v čerstvě okupovaném státě
  R_BASE: 0.75,         // cílový odboj bez poddajnosti a garnizony
  R_EXILE: 0.15,        // příplatek, když původní stát ještě bojuje
  R_GARRISON: 0.7,      // o kolik garnizona (100 %) sníží cílový odboj
  R_RATE: 0.06,         // denní přiblížení odboje k cíli
  C_GAIN: 0.003,        // denní růst poddajnosti (bez garnizony 40 %, s plnou garnizonou 100 %)
  R_DMG: 14,            // denní ztráta organizace garnizony za jednotku odboje nad hranicí
  R_DMG_FROM: 0.5,      // od tohoto odboje garnizona trpí
  R_REBEL: 0.9,         // odboj, při kterém se stát vzbouří (a garnizona je slabá)
  G_REBEL: 0.35,        // nejvyšší garnizona, při které povstání uspěje
  RES_BASE: 0.25,       // podíl těžby okupovaného státu, který dostane okupant bez poddajnosti
  // S7: okupační zákony, posádky a kolaborantské vlády
  MP_LOSS: 12,          // denní ztráta lidské síly posádek na jednu potřebnou divizi garnizony při plném odboji (× zákon `mp`)
  COL_MIN: 3,           // kolaborantská vláda: aspoň tolik okupovaných států země
  COL_C: 0.4,           // a průměrná poddajnost aspoň tolik
  COL_PP: 75,           // cena v politické moci
  COL_R: 0.5,           // násobek cílového odboje ve státech pod kolaborantskou vládou
  COL_C_GAIN: 0.002,    // denní příplatek k poddajnosti
  COL_RES: 0.1,         // příplatek k podílu těžby
};
