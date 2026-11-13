// Vyvážení diplomacie (M23): všechna čísla na jednom místě. Čas ve dnech.
export const DIP = {
  ULT_PP: 15,             // ultimátum (M68): cena v politické moci
  ULT_COOLDOWN: 60,       // dní, po které jedna dvojice nevznese další ultimátum
  ULT_RATIO: 2,           // přesila, kterou cíl vyžaduje u ultimáta mimo historický seznam
  ULT_WEAK_STAB: 0.3,     // vláda cíle s nižší stabilitou povolí snáze
  ULT_WEAK_MULT: 0.7,
  ULT_REL: -25,           // změna vztahu cíle k požadujícímu po přijetí (po odmítnutí polovina)
  ULT_STAB: 0.06,         // ztráta stability vlády, která ustoupila
  ULT_WS: 0.03,           // změna podpory války (požadující při úspěchu, cíl při odmítnutí)
  NAP_PP: 25,             // pakt o neútočení (M75): cena nabídky v politické moci
  NAP_REL: 0,             // cíl řízený AI přijme, když jeho vztah k žadateli s přídavky dosáhne této hodnoty
  NAP_ENEMY: 30,          // přídavek za společného nepřítele
  NAP_WAR: 15,            // přídavek, když cíl sám válčí (kryje si záda)
  NAP_GAIN: 15,           // zlepšení vztahu po podpisu
  NAP_MIN_DAYS: 365,      // dřív než za tolik dní pakt vypovědět nelze
  NAP_BREAK_STAB: 0.06,   // ztráta stability toho, kdo pakt vypoví
  NAP_BREAK_REL: -40,     // změna vztahu po vypovězení
  NAP_OFFER_DAYS: 30,     // nabídka hráči vyprší za tolik dní
  IMPROVE_PP: 15,         // zlepšení vztahů: cena v politické moci
  IMPROVE_GAIN: 10,       // o kolik vztah vzroste
  IMPROVE_MAX: 80,        // nad tento vztah už zlepšovat nejde
  ACC_PP: 10,             // žádost o vojenský přístup: cena v politické moci (M67)
  ACC_REL: 20,            // nejmenší vztah, při kterém země dovolí cizí armádě průchod (jinak jen se zárukou)
  ACC_REL_GAIN: 5,        // zlepšení vztahu za dohodu o přístupu (odvolání o totéž zhorší)
  WAR_LOCK_DAYS: 120,     // útočník nepřijme bílý mír v prvních tolika dnech války (M66)
  WAR_LOCK_SCORE: 0.15,   // ledaže prohrává o víc než tuto hodnotu válečného skóre
  GAR_PP: 10,             // záruka nezávislosti: cena v politické moci
  GAR_MAX: 6,             // nejvíc záruk najednou na zemi
  GAR_REL: 10,            // zlepšení vztahu se zaručenou zemí (zrušení o totéž zhorší)
  GAR_STAB: 0.35,         // pod touto stabilitou se zaručitel do války nepřipojí a záruka zaniká
  LEND_MAX: 0.25,         // půjčka a pronájem: nejvíc podíl skladu najednou
  LEND_REL: 3,            // zlepšení vztahu za jednu zásilku
  LEND_AI_MIN: 300,       // AI posílá jen druhy výzbroje, kterých má aspoň tolik kusů
  JUST_PP: 25,            // cena ospravedlnění války v politické moci
  JUST_DAYS: 30,          // doba ospravedlňování
  JUST_KEEP: 365,         // jak dlouho po dokončení ospravedlnění platí
  JUST_MAX: 2,            // nejvíc ospravedlnění zároveň na zemi
  REL_WAR: -60,           // změna vztahu s cílem při vyhlášení války
  REL_WAR_ALLY: -20,      // změna vztahu s cílovými spojenci
  REL_FORGET: 0.1,        // denní návrat změny vztahu k nule (v míru)
  PEACE_SCORE: 0.1,       // druhá strana přijme bílý mír, když její válečné skóre je menší
  CAP_SHARE: 0.6,         // kapitulace: podíl vítězných bodů držený nepřáteli
  CAP_CAPITAL_SHARE: 0.35,// totéž při ztraceném hlavním městě
  CIVIL_CAP_SHARE: 0.7,   // občanská válka (M69): strana kapituluje, až když protivník drží tolik jejích vítězných bodů (pád hlavního města nestačí)
  CAP_STAB: 0.25,         // ztráta stability po kapitulaci
  FAC_PP: 50,             // cena založení bloku
  FAC_MAX_MEM: 12,        // největší blok
  INVITE_MIN: 20,         // nejmenší skóre pozvání, aby pozvaný přijal
  INVITE_ENEMY: 30,       // bonus skóre za společného nepřítele
  INVITE_IDEO: 15,
  AU_START: 30,           // autonomie nové loutky (0–100)
  AU_GROW: 0.06,          // denní růst autonomie (loutka touží po samostatnosti)
  AU_TIGHT: 15,           // o kolik utažení kontroly sníží autonomii
  AU_TIGHT_PP: 20,        // cena utažení v politické moci
  AU_LOOSE: 20,           // o kolik uvolnění zvýší autonomii (zdarma, zlepší vztah)
  AU_LEVELS: [25, 50, 75],// hranice úrovní: kolonie < 25 ≤ loutka < 50 ≤ dominion < 75 ≤ nespokojená
  AU_MULT: [1.6, 1, 0.5, 0.2], // násobek příspěvků pánovi podle úrovně
  SUB_MAN: 0.002,         // podíl lidské síly loutky, který denně připadne pánovi
  SUB_PP: 0.4,            // politická moc, kterou denně dostane pán za každou loutku
  CONF_SHARE: 0.35,       // mírová konference (M84): body vítěze na další územní zisky = tento podíl hodnoty států, které dobyl
  EXILE_ORG: 0.7,         // exil (M83): zbytek organizace divizí, které přejdou k hostiteli
  EXILE_STOCK: 0.2,       // podíl zásob výzbroje, který si exilová vláda odveze k hostiteli
  RESTORE_STAB: 0.5,      // stabilita obnovené země
  RESTORE_MAN: 50000,     // nejmenší lidská síla obnovené země
  VICTORY_DAYS: 180,      // dnů trvání ducha „Vítězná nálada“ po kapitulaci protivníka (M74)
  ANNEX_PP: 150,          // cena anexe vlastní loutky        // bonus za shodnou ideologii
};
