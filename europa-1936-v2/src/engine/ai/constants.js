// Vyvážení AI zemí (M24): všechna čísla na jednom místě.
export const AI = {
  QUEUE: 3,                         // nejvíc rozestavěných staveb na AI zemi
  MIL_SHARE: 0.36,                  // cílový podíl vojenských továren v míru
  MIL_SHARE_WAR: 0.5,               // ve válce
  MIL_PRESSURE: 0.3,                // nejvíc o tolik se zvýší podíl vojenských továren při velké mezeře k cílovému počtu divizí (M65)
  BASE_BONUS: 0.04,                 // okamžitá rezerva nad počátečním počtem divizí
  MOTOR_SHIFT: 0.12,                // o kolik podílu pěších divizí velmoci přejde na tankové a motorizované (M65)
  MOTOR_DAYS: 1500,                 // za kolik dní hry se posun složení dokončí
  TRAIN_DIV: 12,                    // nejvíc divizí ve výcviku = cílový počet / tato hodnota (nejméně TRAIN_MAX)
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
  STOCK_DIVS: 12,                   // zásoba výzbroje se posuzuje vůči potřebě tolika divizí (M65)
  DEMAND_BLEND: 0.85,               // podíl rozdělení výroby podle potřeby proti pevnému rozdělení
  AIR_SHARE: 0.1,                   // podíl vojenských továren na letecké linky v míru
  AIR_SHARE_WAR: 0.16,              // ve válce
  RUSH_RATIO: 1.3,                  // při takové převaze sil útočí AI v režimu „Spěchat“
  PLAN_DAYS: 7,                     // jak často AI přepočítává útočné plány
  STAB_MIN: 0.4,                    // nejmenší stabilita pro vyhlášení války
  LEVEL_EFF: 0.1,                   // odchylka výroby, staveb a výzkumu AI za stupeň obtížnosti od běžné
};
