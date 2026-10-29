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
};
