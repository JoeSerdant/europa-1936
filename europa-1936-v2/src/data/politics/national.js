// Počáteční politika zemí (vlastní odhady). Základ podle ideologie; velmoci a vybrané země mají vlastní hodnoty.
//  stab, ws  základní (cílová) stabilita a podpora války 0–1   laws  { eco, con, trd } počáteční zákony (jinak civ / lim / lim)
export const POL_IDEO = {
  democracy: { stab: 0.65, ws: 0.15 },
  neutrality: { stab: 0.6, ws: 0.2 },
  communism: { stab: 0.6, ws: 0.45 },
  fascism: { stab: 0.65, ws: 0.5 },
};
export const POL_DEFAULT_LAWS = { eco: 'civ', con: 'lim', trd: 'lim' };

export const POL_NATIONAL = {
  GER: { stab: 0.7, ws: 0.55, laws: { con: 'ext' } },
  ITA: { stab: 0.65, ws: 0.5, laws: { con: 'ext' } },
  SOV: { stab: 0.6, ws: 0.5, laws: { con: 'ext', trd: 'closed' } },
  ENG: { stab: 0.7, ws: 0.15, laws: { con: 'vol', trd: 'free' } },
  FRA: { stab: 0.55, ws: 0.2 },
  POL: { stab: 0.6, ws: 0.45, laws: { con: 'ext' } },
  CZE: { stab: 0.65, ws: 0.4, laws: { con: 'ext' } },
  SPR: { stab: 0.4, ws: 0.4 },
  YUG: { stab: 0.5, ws: 0.3 },
  ROM: { stab: 0.55, ws: 0.3 },
  FIN: { stab: 0.65, ws: 0.45 },
  SWE: { laws: { con: 'vol', trd: 'free' } },
  NOR: { laws: { con: 'vol', trd: 'free' } },
  DEN: { laws: { con: 'vol', trd: 'free' } },
  HOL: { laws: { con: 'vol', trd: 'free' } },
  IRE: { laws: { con: 'vol' } },
  ICE: { laws: { con: 'vol', trd: 'free' } },
  LUX: { laws: { con: 'vol', trd: 'free' } },
  SWI: { stab: 0.7, ws: 0.2, laws: { con: 'ext', trd: 'free' } },
};
