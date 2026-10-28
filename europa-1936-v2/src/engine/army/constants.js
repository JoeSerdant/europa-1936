// Vyvážení armády: všechny číselné konstanty na jednom místě (vlastní hodnoty). Jednotky: čas v hodinách, podíly 0–1, síla/organizace v bodech praporů.

export const C = {
  // ---- pohyb ----
  PROV_KM: 80,              // vzdálenost středů provincií, při které pěšák na rovině přejde za PROV_HOURS (km)
  PROV_HOURS: 24,
  SPEED_REF: 4,             // rychlost pěšáka
  DIST_MIN: 0.35,           // meze násobku vzdálenosti (malé provincie kolem velkých měst, obří provincie na poušti)
  DIST_MAX: 2.2,
  INFRA_SPEED: 0.05,        // zpomalení za každý stupeň infrastruktury pod 5 v cílové provincii
  ORG_MOVE_COST: 0.2,       // ztráta organizace za hodinu pohybu (body)
  ORG_SPEED_LOW: 0.3,       // pod tímto podílem organizace se pohyb zpomaluje
  ORG_SPEED_ZERO: -0.8,     // změna rychlosti při nulové organizaci
  RETREAT_SPEED: 0.25,      // bonus rychlosti při ústupu
  CONQUER_ORG_LOSS: 0.2,    // podíl maxima organizace, který stojí obsazení provincie
  WIN_PROGRESS: 60,         // postup (z 100), který útočníci dostanou po vítězství (půl cesty do provincie)

  // ---- organizace a síla ----
  ORG_REGEN: 0.011,         // obnova organizace za hodinu (podíl maxima) při klidu a plném zásobování
  ORG_REGEN_SLOW_AT: 0.8,   // nad tímto podílem se obnova zpomaluje
  ORG_REGEN_SLOW: 0.5,      // násobek obnovy nad touto hranicí
  ORG_REGEN_FAST_AT: 0.25,  // pod tímto podílem se obnova zrychluje
  ORG_REGEN_FAST: 1.5,      // násobek obnovy pod touto hranicí
  ORG_INFRA: 0.5,           // vliv infrastruktury na obnovu (0–1: stupeň 0 = 1 − tato hodnota, stupeň 5 = 1)
  DEATH_HP: 0.001,          // podíl síly, pod kterým divize zaniká
  MIN_ORG_SHARE_MOVING: 0.1,// organizace při pohybu neklesne pod tento podíl (pohyb divizi nezničí)

  // ---- boj ----
  STACK_START: 5,           // od kolika divizí v bitvě začíná postih za nahromadění
  STACK_PENALTY: 0.02,      // postih útoku za každou divizi navíc
  OVERWIDTH_PENALTY: 1.0,   // postih útoku za podíl překročení šířky (podíl nad šířkou · tato hodnota), nejvýš OVERWIDTH_MAX
  OVERWIDTH_MAX: 0.33,
  DIR_WIDTH: 0.5,           // zvětšení šířky bitvy za každý další směr útoku
  MULTIDIR_DEF: -0.3,       // postih obrany, na kterou útočí z více směrů (násobí se (směry−1)/směry)
  FLANK_DIRS: 3,            // útok z tolika směrů = obchvat
  MAIN_TARGET: 0.35,        // podíl útoku na hlavní cíl (zbytek se dělí mezi ostatní)
  K_ORG: 0.026,             // organizace za bod útoku za hodinu
  K_HP: 0.018,              // síla za bod útoku za hodinu
  AVOID_MAX: 0.9,           // největší podíl zásahů, kterým obránce uhne
  AVOID_BRK: 2,             // jak silně průraz útočníka přemáhá obranu
  AVOID_C: 60,              // konstanta ve jmenovateli uhýbání
  DICE_LO: 0.55,            // kostka: násobek zásahu = DICE_LO + (DICE_HI − DICE_LO) · náhoda
  DICE_HI: 1.45,
  PIERCE_T: [1, 0.75, 0.5, 0],          // prahy poměru průraz / pancíř
  PIERCE_D: [1, 0.8, 0.65, 0.5],        // násobky zásahu pro jednotlivé prahy
  ARMOR_DEFLECT: 0.5,       // další snížení poškození, když pancíř cíle převyšuje průraz útočníka
  ARMOR_OUTCLASS: 0.3,      // bonus poškození, když pancíř útočníka převyšuje průraz cíle
  DIG_BONUS: 0.04,          // obrana (snížení zásahů) za stupeň zakopání
  DIG_MAX: 5,
  DIG_DAYS: 1,              // dní na jeden stupeň zakopání (ženisté zrychlují)
  XP_BONUS: 0.04,           // bonus útoku i obrany za úroveň zkušenosti (0–4)
  XP_LEVELS: [0.1, 0.3, 0.75, 0.9],
  XP_PER_COMBAT_HOUR: 0.0004,
  RECON_BONUS: 0.015,       // bonus za bod převahy v průzkumu
  RECON_MAX: 0.06,
  HOLD_AFTER_LOSS: 36,      // hodin, po které poražený útočník nesmí útočit
  RETREAT_HOURS: 18,        // hodin „ústupu“ (nemůže útočit) po ústupu obránce
  RETREAT_ORG: 0.1,         // podíl maxima, na který klesne organizace při ústupu
  RETREAT_HP: 0.03,         // podíl síly, který stojí ústup (ztráta při stahování)
  HP_POWER_FLOOR: 0.1,      // účinnost útoku/obrany divize se silou klesá lineárně, ale ne pod tento podíl
  EQUIP_LOSS: 0.7,          // podíl ztracené síly, který znamená skutečné ztráty výzbroje a mužů (zbytek se vrací)
  CASUALTY_BACK: 0.2,       // podíl ztrát lidské síly, který se vrací do zásoby (ranění)
  OVERRUN_ORG_RATIO: 3,     // útočník se 3× větším útokem než obrana přeběhne slabou obranu bez dlouhého boje

  // ---- plánování a velitelé ----
  PLAN_GAIN: 0.02,          // plánování za den
  PLAN_DECAY: 0.01,         // úbytek plánování za den při nečinnosti
  PLAN_CAP: 0.2,            // základní strop plánování (+ dovednost)
  SKILL_ATK: 0.025,         // bonus útoku za úroveň dovednosti
  SKILL_DEF: 0.025,
  SKILL_PLAN_CAP: 0.025,
  SKILL_PLAN_GAIN: 0.1,
  SKILL_LOG_SUP: 0.02,
  SKILL_LOG_SPEED: 0.01,
  MARSHAL_SHARE: 0.5,       // podíl bonusů polního maršála, který dostanou armády skupiny
  ARMY_CAP: 24,             // limit divizí v armádě
  TPL_MAX: 40,              // nejvíc šablon jedné země
  QUEUE_MAX: 200,           // nejvíc divizí ve výcviku najednou
  GROUP_CAP: 5,             // limit armád ve skupině armád
  LEADER_XP_PER_DIV_HOUR: 0.1, // zkušenosti velitele za divizi v bitvě za hodinu
  LEADER_XP_LEVEL: 60,      // zkušenosti na jednu úroveň velitele = tato hodnota × aktuální úroveň
  LEADER_MAX_SKILL: 9,

  // ---- zásobování ----
  SUP_CAPITAL: 6.0,         // tok z hlavního města
  SUP_HUB: 3.4,             // tok z uzlu (násobí se podílem toku, který k uzlu dorazil)
  SUP_LOCAL: 1.4,           // nejmenší tok v každém vlastním uzlu železnice, i když není spojený s hlavním městem
  SUP_RAIL_DROP: 0.1,       // srážka toku po železnici na spoj (dělí se úrovní spoje 1–5)
  SUP_INFRA_RELIEF: 0.3,    // o kolik srážku terénu snižuje nejvyšší infrastruktura
  SUP_CAPACITY: 1.25,       // zásoby za hodinu na jeden bod toku
  SUP_MIN_FLOW: 0.05,       // pod tímto tokem se zásobování dál nešíří
  SUP_GRACE: 72,            // hodin zásoby v batohu
  SUP_GRACE_REFILL: 2,      // hodin zásoby, které se vrátí za hodinu při plném zásobování
  SUP_ORG_CAP: 0.35,        // strop organizace při úplném nedostatku (podíl maxima)
  SUP_ATK_ATT: -0.25,       // útok útočníka při nedostatku zásob
  SUP_DEF_ATT: -0.4,
  SUP_ATK_DEF: -0.35,
  SUP_DEF_DEF: -0.2,
  SUP_SPEED: -0.8,          // pomalejší pohyb při úplném nedostatku
  SUP_ATTRITION: 0.0008,    // ztráta síly za hodinu (podíl maxima) při úplném nedostatku

  // ---- doplňování, lidská síla ----
  REINF_PER_DAY: 0.05,      // podíl maximální síly, který se denně doplní
  MAN_GROWTH_MONTH: 0.0004, // měsíční přírůstek lidské síly (podíl obyvatel)
  MIN_HP_FOR_REINF_SUP: 0.5,// pod tímto zásobováním se nedoplňuje
};

/** Úroveň zkušeností 0–4 z hodnoty 0–1. */
export function xpLevel(xp) {
  let l = 0;
  for (const t of C.XP_LEVELS) if (xp >= t) l++;
  return l;
}
export const XP_NAMES = ['Nováčci', 'Cvičení', 'Zkušení', 'Ostřílení', 'Elita'];
