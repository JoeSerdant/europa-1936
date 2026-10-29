// Vyvážení AI zemí (M24): všechna čísla na jednom místě.
export const AI = {
  QUEUE: 3,                         // nejvíc rozestavěných staveb na AI zemi
  MIL_SHARE: 0.36,                  // cílový podíl vojenských továren v míru
  MIL_SHARE_WAR: 0.5,               // ve válce
  BASE_BONUS: 0.04,                 // okamžitá rezerva nad počátečním počtem divizí
  GROWTH_YEAR: 0.16,                // roční růst cílového počtu divizí
  WAR_MULT: 1.25,                   // cílový počet divizí ve válce
  LEVEL_MULT: { 1: 0.9, 2: 1, 3: 1.15 },       // násobek cílového počtu divizí podle obtížnosti
  RECRUIT_BATCH: 1,                 // divizí zařazených do výcviku najednou v míru
  RECRUIT_BATCH_WAR: 3,
  TRAIN_MAX: 4,                     // nejvíc divizí ve výcviku na AI zemi
  ARMY_SIZE: 12,                    // nejvíc divizí, které AI vkládá do jedné armády
  ATTACK_RATIO: { 1: 1.5, 2: 0.7, 3: 0.5 },    // nejmenší poměr sil bloku k protivníkům, aby AI útočila
  PEACE_STAB: 0.35,                 // AI navrhne bílý mír, když její stabilita klesne pod tuto hodnotu
  STALEMATE_DAYS: 150,              // AI navrhne bílý mír, když válka trvá aspoň tolik dní bez výrazného skóre
  STALEMATE_SCORE: 0.03,
  PEACE_WS: 0.2,                    // nebo podpora války pod tuto hodnotu (a protivník nevede)
  AIR_SHARE: 0.1,                   // podíl vojenských továren na letecké linky v míru
  AIR_SHARE_WAR: 0.16,              // ve válce
  RUSH_RATIO: 1.3,                  // při takové převaze sil útočí AI v režimu „Spěchat“
  PLAN_DAYS: 7,                     // jak často AI přepočítává útočné plány
  STAB_MIN: 0.4,                    // nejmenší stabilita pro vyhlášení války
  LEVEL_EFF: 0.1,                   // odchylka výroby, staveb a výzkumu AI za stupeň obtížnosti od běžné
};
