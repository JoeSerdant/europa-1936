// Zbrojení AI zemí (M65): o kolik vzroste armáda země do září 1939 vůči stavu v lednu 1936 a jak rychle po zbytek desetiletí.
// Čísla vycházejí ze scénáře „Září 1939“ (data/scenarios.js), aby se hra z roku 1936 do roku 1939 dostala přibližně na stejný stav.
//  army    násobek počtu divizí v září 1939 (tag → násobek, `default` pro ostatní)
export const REARM = {
  GER: 2.4, ENG: 2.5, FRA: 1.3, ITA: 1.35, SOV: 2.0, POL: 1.35, CZE: 1.3, SPR: 1.2, HUN: 1.8, ROM: 1.4, YUG: 1.3, BUL: 1.4, TUR: 1.3,
  FIN: 1.5, SWE: 1.4, default: 1.25,
};
/** Podíl celkového růstu do září 1939 (den hry → 0–1): zpočátku pomalu, před válkou rychle. */
export const REARM_CURVE = [[0, 0], [365, 0.12], [730, 0.38], [1095, 0.74], [1340, 1]];
export const REARM_END = 1340;          // den, ke kterému je růst dokončen (1. 9. 1939)
export const REARM_POST_YEAR = 0.12;    // roční růst armády po tomto dni (podíl cílového stavu)

/** Násobek počtu divizí země `tag` v den hry `day` (1 = stav z roku 1936). Čistá funkce. */
export function rearmFactor(tag, day) {
  const g = REARM[tag] ?? REARM.default;
  if (day >= REARM_END) return g * (1 + REARM_POST_YEAR * (day - REARM_END) / 365);
  let frac = 0;
  for (let i = 1; i < REARM_CURVE.length; i++) {
    const [d0, f0] = REARM_CURVE[i - 1], [d1, f1] = REARM_CURVE[i];
    if (day <= d1) { frac = f0 + (f1 - f0) * Math.max(0, (day - d0) / (d1 - d0)); break; }
  }
  return 1 + (g - 1) * frac;
}
