// Vyvážení diplomacie (M23): všechna čísla na jednom místě. Čas ve dnech.
export const DIP = {
  WAR_LOCK_DAYS: 120,     // útočník nepřijme bílý mír v prvních tolika dnech války (M66)
  WAR_LOCK_SCORE: 0.15,   // ledaže prohrává o víc než tuto hodnotu válečného skóre
  GAR_PP: 10,             // záruka nezávislosti: cena v politické moci
  GAR_MAX: 4,             // nejvíc záruk najednou na zemi
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
  ANNEX_PP: 150,          // cena anexe vlastní loutky        // bonus za shodnou ideologii
};
