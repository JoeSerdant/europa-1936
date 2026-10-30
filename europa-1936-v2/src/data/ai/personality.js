// Povahy AI zemí (M66): `aggr` násobí ochotu k útoku (poměr sil potřebný k útoku se dělí `aggr`). Velmoci s agresivní doktrínou útočí i s menší převahou,
// opatrné demokracie jen s velkou. Ostatní země mají 1.
export const PERSONALITY = {
  GER: { aggr: 1.35 }, SOV: { aggr: 1.2 }, ITA: { aggr: 1.0 }, POL: { aggr: 0.85 }, FRA: { aggr: 0.7 }, ENG: { aggr: 0.7 },
  default: { aggr: 1 },
};
export const aggrOf = (tag) => (PERSONALITY[tag] || PERSONALITY.default).aggr;
