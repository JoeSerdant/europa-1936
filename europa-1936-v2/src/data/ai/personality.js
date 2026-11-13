// Povahy AI zemí (M66): `aggr` násobí ochotu k útoku (poměr sil potřebný k útoku se dělí `aggr`). Velmoci s agresivní doktrínou útočí i s menší převahou,
// opatrné demokracie jen s velkou. Ostatní země mají 1.
export const PERSONALITY = {
  GER: { aggr: 1.35 }, SOV: { aggr: 1.2 }, ITA: { aggr: 1.0 }, POL: { aggr: 0.85 }, FRA: { aggr: 0.7 }, ENG: { aggr: 0.7 },
  default: { aggr: 1 },
};
export const aggrOf = (tag) => (PERSONALITY[tag] || PERSONALITY.default).aggr;

/** Doktríny, ke kterým země tíhne (M88): větev → směr (viz data/doc/doctrines.js). Ostatní země si směr určí podle svého pořadí. */
export const DOCTRINE_PREF = {
  GER: { land: 'pruraz', air: 'podpora', sea: 'obchod' },
  FRA: { land: 'obrana', air: 'nadvlada', sea: 'flotila' },
  ENG: { land: 'obrana', air: 'nadvlada', sea: 'eskorta' },
  SOV: { land: 'masa', air: 'podpora', sea: 'obchod' },
  ITA: { land: 'masa', air: 'nadvlada', sea: 'flotila' },
  POL: { land: 'masa' }, CZE: { land: 'obrana' }, FIN: { land: 'obrana' }, SWI: { land: 'obrana' }, BEL: { land: 'obrana' }, HOL: { land: 'obrana' },
};
