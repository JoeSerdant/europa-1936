// Vyvážení letectva (M30): všechna čísla na jednom místě (vlastní hodnoty).
export const AIR = {
  PER_LEVEL: 60,          // letounů na jednu úroveň letiště ve státě
  BASE_MAX: 5,            // nejvyšší úroveň letiště
  WINGS_MAX: 40,          // nejvíc leteckých křídel na zemi
  LV_MULT: 0.12,          // příplatek k síle za každou úroveň techniky nad první
  CAS_COEF: 0.0009,       // bonus k útoku divizí na jednotku efektivní síly podpory
  CAS_MAX: 0.3,           // strop bonusu podpory
  RADAR_K: 30,            // radar: tolik síly hlídek navíc za úroveň radaru ve státě, nad kterým nepřítel operuje
  COVER_K: 8,             // „setrvačnost“ krytí: bez hlídek na obou stranách je krytí úplné
  LOSS_AIR: 0.07,         // denní ztráty hlídek při vyrovnaném boji
  LOSS_INT: 0.05,         // denní ztráty letadel na misích, když je nikdo nekryje
  ATTRITION: 0.004,       // denní opotřebení letadel na misi
  BOMB_WS: 0.00002,       // pokles podpory války za jednotku efektivní síly bombardování
  BOMB_WS_MAX: 0.03,      // nejvíc za den
  BOMB_STOCK: 0.00001,    // podíl zničeného skladu výzbroje za jednotku síly
  BOMB_STOCK_MAX: 0.02,
  LOST_BASE_LOSS: 0.3,    // podíl letadel ztracený, když křídlo přijde o letiště
  INT_MULT: 1.5,          // F4c: stíhání – síla stíhačů proti nepřátelským bombardérům a bitevním letounům (s hlídkami se nebijí)
  NAV_K: 0.25,            // F4c: úder na lodě – poškození flotil za jednotku síly (podpora × krytí) na jednotku jejich odolnosti
  NAV_DMG_MAX: 0.15,      // nejvyšší denní poškození jedné flotily z úderů letectva
  LOSS_NAV: 0.03,         // denní ztráty letadel útočících na lodě (protiletadlová palba flotil)
  ACE_CHANCE: 0.06,       // denní šance na eso při plném vzdušném boji (násobí se podílem nepřátelských hlídek)
  ACE_BONUS: 0.05,        // bonus síly hlídek křídla za každý stupeň es
  ACE_MAX: 3,             // nejvyšší stupeň es
  FORM_MAX: 400,
  // S8: vzdušné zóny (převaha nad strategickým regionem) a strategické bombardování
  AZ_INT: 0.5,            // stíhání se do převahy v regionu počítá polovinou síly
  AZ_MIN: 40,             // nepřítel potřebuje aspoň tolik síly v regionu, aby převaha něco znamenala
  AZ_ATK: 0.15,           // postih útoku divizí při úplné nepřátelské převaze (od 50 % podílu lineárně)
  AZ_DEF: 0.08,           // postih obrany divizí při úplné nepřátelské převaze
  BOMB_DMG: 0.00004,      // poškození továren státu za jednotku efektivní síly bombardování (podíl za den)
  BOMB_DMG_DAY: 0.04,     // nejvíc za den
  DMG_MAX: 0.8,           // nejvyšší poškození továren státu
  DMG_REPAIR: 0.01,       // oprava poškozených továren za den
  AA_RED: 0.12,           // protiletadlová obrana: o tolik méně poškození za úroveň
  AA_LOSS: 0.006,         // denní ztráty letadel bombardujících a podporujících nad státem s protiletadlovou obranou (za úroveň)
  ROCKET_USE: 0.15,       // rakety (M82): podíl křídla raket spotřebovaný za den mise
  NUKE_DAYS: 150,         // jaderná zbraň: dnů výroby jedné bomby po dokončení technologie
  NUKE_MAX: 5,            // nejvíc bomb ve skladu
  NUKE_PLANES: 10,        // nejméně strategických bombardérů v křídle, které bombu nese
  NUKE_STAB: 0.12,        // ztráta stability zasažené země
  NUKE_WS: 0.15,          // ztráta podpory války zasažené země
  NUKE_FACTORY: 0.5,      // podíl zničených továren a loděnic ve státě
  NUKE_UNITS: 0.5,        // zbytek síly a organizace divizí ve státě
  DROP_KM: 600,           // výsadek (M80): největší vzdálenost z provincie s letištěm do cíle
  DROP_HOURS: 10,         // doba letu k cíli
  DROP_PER_LEVEL: 1,      // divizí na jeden výsadek za úroveň letiště ve státě startu
  DROP_ORG: 0.6,          // zbytek organizace po seskoku
  DROP_FAIL_HP: 0.85,     // zbytek síly, když se výsadek musí vrátit (cíl mezitím obsadili obránci)          // nejvíc letadel v jednom křídle
};

export const ACE_NAMES = ['', 'Dobrý pilot', 'Unikátní pilot', 'Geniální pilot'];
