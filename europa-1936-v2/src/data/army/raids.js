// S5c: nájezdy speciálních jednotek a omezení jejich počtu. Vlastní čísla.
export const RAID = {
  SF_SHARE: 0.5,     // divize je speciální, když aspoň tento podíl liniových praporů je speciálních
  SF_BASE: 4,        // speciálních divizí smí mít každá země aspoň tolik
  SF_PER_DIV: 0.05,  // strop = max(SF_BASE, počet divizí × SF_PER_DIV)
  KM: 500, PREP: 7,  // dosah nájezdu od divize a dní přípravy
  BASE: 0.55, XP: 0.06, ORG: 0.4, GUARD: 0.06, RADAR: 0.08, AA: 0.05, MIN: 0.1, MAX: 0.9,   // šance: základ, za stupeň zkušeností, organizace, obrana cíle
  PLANES: 0.3, FLEET_DMG: 0.2, STOCK: 0.04, IND_DMG: 0.3,   // účinek úspěchu
  ORG_WIN: 0.6, ORG_LOSE: 0.3, HP_LOSE: 0.6,                 // cena pro divizi
};

/** Druhy nájezdů. */
export const RAID_KINDS = {
  afb: { n: 'Letiště', icon: 'air', info: 'Zničí část letadel na letištích státu.' },
  port: { n: 'Přístav', icon: 'navy', info: 'Poškodí lodě, které stojí v přístavních vodách státu.' },
  depot: { n: 'Sklady', icon: 'box', info: 'Zničí část výzbroje ve skladech cílové země.' },
  ind: { n: 'Továrny', icon: 'industry', info: 'Poškodí továrny státu (opraví se jako po bombardování).' },
};
