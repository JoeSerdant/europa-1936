// Vyvážení AI zemí (M24): všechna čísla na jednom místě.
export const AI = {
  QUEUE: 3,                         // nejvíc rozestavěných staveb na AI zemi
  MIL_SHARE: 0.36,                  // cílový podíl vojenských továren v míru
  MIL_SHARE_WAR: 0.5,               // ve válce
  MIL_PRESSURE: 0.3,                // nejvíc o tolik se zvýší podíl vojenských továren při velké mezeře k cílovému počtu divizí (M65)
  BASE_BONUS: 0.04,                 // okamžitá rezerva nad počátečním počtem divizí
  MOTOR_SHIFT: 0.12,                // o kolik podílu pěších divizí velmoci přejde na tankové a motorizované (M65)
  MOTOR_DAYS: 1500,                 // za kolik dní hry se posun složení dokončí
  TRAIN_DIV: 7,                     // nejvíc divizí ve výcviku = cílový počet / tato hodnota (nejméně TRAIN_MAX)
  WAR_MULT: 1.25,                   // cílový počet divizí ve válce
  LEVEL_MULT: { 1: 0.9, 2: 1, 3: 1.15 },       // násobek cílového počtu divizí podle obtížnosti
  RECRUIT_BATCH: 1,                 // divizí zařazených do výcviku najednou v míru
  RECRUIT_BATCH_WAR: 3,
  TRAIN_MAX: 4,                     // nejvíc divizí ve výcviku na AI zemi
  ARMY_SIZE: 12,                    // nejvíc divizí, které AI vkládá do jedné armády
  ATTACK_RATIO: { 1: 2.0, 2: 1.3, 3: 1.0 },    // nejmenší poměr vlastních divizí k účinné síle nepřítele v divadle, aby AI útočila (M66)
  TARGETS_MIN: 2,                   // nejméně cílů útoku armády
  DIVS_PER_TARGET: 3,               // cílů útoku na tolik divizí armády
  FRONT_FILL: 1.0,                  // podíl zásobovací kapacity postů divadla, který smí obsadit první sled (M88)
  DIV_SUP: 0.65,                    // odhad spotřeby zásob jedné divize pro tento výpočet
  FORT_AVOID: 3,                    // cíle s pevností aspoň této úrovně ofenziva vynechá, dokud jsou v divadle jiné
  TARGET_FORT: 150,                 // za úroveň pevnosti se cíl „vzdálí“ o tolik km (M88: ofenziva obchází opevnění)
  FORT_EFF: 0.25,                   // účinná síla nepřítele v divadle roste o tolik za průměrnou úroveň pevností v cílech (M88)
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
  PLAN_DAYS_WAR: 2,                 // země, která útočí (má armádu s vyčerpanými cíli plánu), přepočítá plány už po tolika dnech (M88)
  LOCAL_RATIO: 2.5,                 // místní útok (M88): armáda udeří na cíl, když má tolikrát víc divizí, než je síla jeho obrany
  LOCAL_BACK: 0.5,                  // do síly obrany cíle se počítá tento podíl divizí v sousedních nepřátelských provinciích
  LOCAL_FORT: 0.3,                  // přirážka k síle obrany za úroveň pevnosti
  LOCAL_MIN: 2,                     // každý cíl místního útoku váže aspoň tolik divizí armády
  LOCAL_HP: 0.7,                    // místně útočí jen armáda, jejíž divize mají v průměru aspoň takový podíl síly
  LOCAL_SUP: 0.8,                   // a aspoň takové zásobování
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
  BUSY_SHARE: 0.5,                  // země je válkou zaměstnaná, když protivníci mají aspoň tolik jejích sil (M68)
  FROZEN_DAYS: 200,                 // válka bez styku s nepřítelem starší než tolik dní se ukončí i vítězem
  JACKAL_SHARE: 0.2,                // oportunistická válka (M68): podíl bodů cíle, který už drží jeho nepřátelé
  INV_MIN: 4,                       // námořní invaze (M71): nejméně divizí invazního sboru
  INV_MAX: 12,                      // nejvíc divizí sboru
  INV_EXTRA: 2,                     // sbor se skládá jen tak velký, kolik místo vylodění žádá (obránci × INV_RATIO) plus tato rezerva (M88)
  INV_RATIO: 1.5,                   // sbor musí mít aspoň tolik divizí, kolik nepřátelských stojí poblíž místa vylodění
  INV_NEAR_KM: 350,                 // poloměr, ve kterém se počítají vlastní divize u předmostí
  INV_FAR_KM: 900,                  // nepřátelské divize v tomto okolí místa vylodění se počítají s váhou 1 − vzdálenost / tato hodnota
  INV_STAGE_DAYS: 30,               // nejdéle tolik dní se sbor shromažďuje v přístavu
  INV_GATHER: 0.75,                 // podíl sboru, který musí stát v přístavech, aby se nalodil
  INV_COOL_DAYS: 12,                // pauza mezi operacemi země
  INV_SEA_KM: 2500,                 // nejdelší plavba invaze
  INV_NAVAL_KM: 700,                // nepřátelské flotily se počítají do této vzdálenosti od cílové mořské oblasti (M88)
  INV_NAVAL: 1.2,                   // vlastní (s blokem) palebná síla lodí musí být aspoň tolikrát větší než nepřátelská, aby AI zahájila invazi
  INV_TOTAL_MIN: 20,                // země s menší armádou invazi nepodniká
  INV_SHARE: 0.3,                   // nejvýš tento podíl všech divizí země jde do jednoho sboru
  INV_HOLD: 6,                      // předmostí s tolika vlastními divizemi poblíž posily nepotřebuje
  INV_PORT: 3,                      // hodnocení místa vylodění: za úroveň přístavu
  INV_HUB: 1.5,                     // za uzel železnice
  INV_VP: 0.4,                      // za vítězný bod
  INV_CAP: 1.0,                     // srážka za každých 1000 km od hlavního města nepřítele
  INV_DEF: 0.8,                     // srážka za nepřátelskou divizi poblíž (u předmostí příplatek za ohrožení)
  INV_REINF: 6,                     // základ hodnocení posil držené předmostí
  INV_KM: 1500,                     // srážka za 1 bod: tolik km plavby
  UNREACH: 1e8,                     // vzdálenost „nedosažitelné po souši“ při přidělování armád divadlům
  FUEL_DAYS: 45,                    // palivo (M87): AI řeší nedostatek, když zásoba vystačí na méně dní (nebo spotřeba není pokrytá)
  FUEL_DEALS: 2,                    // nejvíc smluv o dovozu ropy na zemi
  FUEL_MARGIN: 1.3,                 // dovoz = schodek paliva krát tato rezerva
  FUEL_SURPLUS_MIN: 0.5,            // vývozce musí mít aspoň takový přebytek ropy
  FUEL_REL_MIN: -40,                // se zemí s horším vztahem AI o ropě nejedná
  TRADE_DAYS: 7,                    // dovoz surovin (M88): jak často AI obchod přehodnocuje
  TRADE_NEED: 0.9,                  // surovinu dováží, když její pokrytí klesne pod tuto hodnotu
  TRADE_MARGIN: 1.1,                // dovoz = schodek krát tato rezerva
  TRADE_MIN: 1,                     // menší smlouvu neuzavírá
  TRADE_DEAD: 0.3,                  // smlouvu, ze které chodí méně než tento podíl, při příštím přehodnocení zruší
  TRADE_SPARE: 6,                   // vývozce s méně než tolika volnými místy na smlouvy AI nežádá
  GOAL_DAYS: 365,                   // bez historické AI: po tolika dnech války si velmoc vyhlásí válečný cíl proti nepřátelské velmoci
  TRADE_CIV_SHARE: 0.25,            // nejvýš tento podíl civilních továren smí dovoz spotřebovat
  STOCK_KEEP: 0.12,                 // rezerva výzbroje (M88): po odvodu nové divize musí ve skladu zůstat tento podíl výzbroje divizí v poli (v míru)
  STOCK_KEEP_WAR: 0.06,             // totéž za války
  RECRUIT_HP: 0.8,                  // ve válce AI nové divize necvičí, dokud průměrná síla těch stávajících nedosáhne této hodnoty (výzbroj jde na doplnění)
  PARA_DIVS: 2,                     // výsadky (M87): tolik výsadkových divizí si velmoc drží
  PARA_FROM_DAY: 1200,              // od tohoto dne hry je cvičí i v míru (jaro 1939)
  PARA_MIN_SCORE: 2,                // cíl výsadku musí mít aspoň takovou hodnotu (vítězné body, uzel, přístav, hlavní město)
  NAP_DAYS: 30,                     // pakty (M87): jak často AI zvažuje nabídku paktu
  NAP_ASK_DAYS: 240,                // stejné zemi AI nabídku opakuje nejdřív po tolika dnech
  NAP_PP_RESERVE: 50,               // politická moc, kterou si AI po nabídce nechá
  NUKE_MIN_FAC: 4,                  // jaderný úder (M82): AI míří jen na stát s aspoň tolika továrnami a loděnicemi
  PARTY_MARGIN: 15,                 // strany (M72): AI podpoří vládnoucí stranu, když její náskok před nejsilnějším soupeřem klesne pod tolik bodů
  PARTY_RESERVE: 80,                // a má aspoň tolik politické moci
  PEACE_POSTS: 8,                   // domácích postů na armádu v míru
  PEACE_POSTS_MIN: 12,
  PEACE_SPREAD: 40,                 // příplatek (pixely) za každý už přidělený post – rozloží posty mezi armády
  STAB_MIN: 0.4,                    // nejmenší stabilita pro vyhlášení války
  LEVEL_EFF: 0.1,                   // odchylka výroby, staveb a výzkumu AI za stupeň obtížnosti od běžné
};
