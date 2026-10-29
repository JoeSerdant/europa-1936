// Vyvážení diplomacie (M23): všechna čísla na jednom místě. Čas ve dnech.
export const DIP = {
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
  INVITE_IDEO: 15,        // bonus za shodnou ideologii
};
