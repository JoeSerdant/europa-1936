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
  ATTACK_RATIO: { 1: 2.0, 2: 1.3, 3: 1.0 },    // nejmenší poměr vlastních divizí k účinné síle nepřítele v divadle, aby AI útočila (M66)
  TARGETS_MIN: 2,                   // nejméně cílů útoku armády
  DIVS_PER_TARGET: 3,               // cílů útoku na tolik divizí armády
  TARGET_VP: 40,                    // za bod vítězných bodů cíle se cíl „přiblíží“ hlavnímu městu o tolik km
  PEACE_STAB: 0.35,                 // AI navrhne bílý mír, když její stabilita klesne pod tuto hodnotu
  STALEMATE_DAYS: 150,              // AI navrhne bílý mír, když válka trvá aspoň tolik dní bez výrazného skóre
  STALEMATE_SCORE: 0.03,
  PEACE_LOSING: 0.12,               // válečné skóre pod −tuto hodnotu = země prohrává (M66)
  PEACE_WINNING: 0.05,              // země s vyšším válečným skóre bílý mír nenavrhuje
  PEACE_MIN_DAYS: 45,               // dřív než za tolik dní války unavená země o mír nežádá, ledaže prohrává
  PEACE_WS: 0.2,                    // nebo podpora války pod tuto hodnotu (a protivník nevede)
  STOCK_DIVS: 12,                   // zásoba výzbroje se posuzuje vůči potřebě tolika divizí (M65)
  DEMAND_BLEND: 0.85,               // podíl rozdělení výroby podle potřeby proti pevnému rozdělení
  AIR_SHARE: 0.1,                   // podíl vojenských továren na letecké linky v míru
  AIR_SHARE_WAR: 0.16,              // ve válce
  RUSH_RATIO: 1.3,                  // při takové převaze sil útočí AI v režimu „Spěchat“
  PLAN_DAYS: 7,                     // jak často AI přepočítává útočné plány
  RESERVE_SHARE: 0.5,               // podíl nepřátelských záloh mimo divadlo, který se k divadlu přičítá podle délky styku (M66)
  DEFENDER_MULT: 1.8,               // obránce (ne útočník) potřebuje o tolik větší poměr sil, aby sám zaútočil
  STAY_MULT: 0.65,                  // zahájený útok pokračuje, dokud poměr sil neklesne pod tento násobek prahu (hystereze)
  OPPORTUNITY_RATIO: 2.2,           // obránce útočí jen při takové převaze v divadle
  THEATER_VP: 0.06,                 // váha vítězných bodů za cíli divadla při řazení divadel (M66)
  CAPITAL_KM: 700,                  // divadlo blíž k hlavnímu městu než tolik km je přednostní
  CAPITAL_BONUS: 40,
  DEF_POSTS: 0.25,                  // obrana: kolik divizí na styčnou provincii (nejvýš)
  DEF_MIN: 2,                       // obrana: nejmenší počet divizí na divadlo
  DEF_RATIO: 0.5,                   // obrana: násobek nepřátelských divizí poblíž
  OFFENSE_FORCE: 2.0,               // útok: žádaný násobek nepřátelských divizí poblíž
  OFFENSE_BASE: 4,                  // útok: pevný přídavek divizí
  OFFENSE_PER_POST: 5,              // útok: nejvíc divizí na styčnou provincii (šířka fronty víc neunese; aspoň ARMY_SIZE)
  RESERVE_KM: 450,                  // armáda dál než tolik km od nejbližšího divadla, kterou nikdo nepotřebuje, zůstane doma
  STICKY_KM: 500,                   // armáda zůstane u svého divadla, i když je jiné o tolik km blíž
  SLICE_MIN: 6,                     // nejméně styčných provincií v plánu armády
  SLICE_PER_DIV: 2,                 // styčných provincií na divizi armády
  AREA_MAX: 120,                    // nejvíc provincií v obranném plánu armády
  SUP_POST_MIN: 0.35,               // provincie s nižším tokem zásobování armáda neobsazuje (unese necelou divizi; M66)
  SUP_TARGET_MIN: 0.6,              // cíl útoku musí po dobytí udržet aspoň tento tok (zhruba jedna divize)
  PEACE_POSTS: 8,                   // domácích postů na armádu v míru
  PEACE_POSTS_MIN: 12,
  PEACE_SPREAD: 40,                 // příplatek (pixely) za každý už přidělený post – rozloží posty mezi armády
  STAB_MIN: 0.4,                    // nejmenší stabilita pro vyhlášení války
  LEVEL_EFF: 0.1,                   // odchylka výroby, staveb a výzkumu AI za stupeň obtížnosti od běžné
};
