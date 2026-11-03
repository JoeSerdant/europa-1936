// Vyvážení paliva (M73): všechna čísla na jednom místě. Palivo se počítá v jednotkách za den; stav `ind.fuel[o] = { s, r, g, u }`.
export const FUEL = {
  PER_OIL: 1,         // paliva za jednotku přebytku ropy (těžba + dovoz − vývoz − spotřeba výroby výzbroje)
  BASE: 0.012,        // základní (syntetická) výroba paliva na továrnu a den – i země bez ropy mají něco
  START: 20,          // počáteční zásoba
  CAP_MIN: 20,        // nejmenší kapacita zásoby
  CAP_DAYS: 40,       // kapacita = tolik dní denní výroby (nejméně CAP_MIN)
  IDLE: 0.2,          // spotřeba stojící divize (podíl spotřeby v pohybu nebo v boji)
  AIR: 0.004,         // spotřeba letounu na misi za den
  SHIP: 0.006,        // spotřeba lodi v pohybu za den
  SPEED: 0.6,         // pokles rychlosti motorizované divize při nulovém palivu (× podíl motorizace)
  ATK: 0.4,           // pokles útoku v boji při nulovém palivu
  DEF: 0.25,          // pokles obrany
  AIR_PEN: 0.5,       // pokles síly letectva při nulovém palivu
  NAV_PEN: 0.5,       // pokles rychlosti flotil při nulovém palivu
  LOW: 0.6,           // pod tímto poměrem se zobrazí upozornění na nedostatek paliva
};
