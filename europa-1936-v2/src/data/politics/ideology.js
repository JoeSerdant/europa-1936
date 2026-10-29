// Zobrazení podpory ideologií na obrazovce Vláda (jen rozhraní, odhad bez vlivu na hru): vládnoucí ideologie dostane podíl rostoucí se stabilitou,
// zbytek se rozdělí podle vah typických pro danou ideologii. Barvy jsou v IDEOLOGIES (data/countries.js).
export const IDEO_ORDER = ['democracy', 'communism', 'fascism', 'neutrality'];
export const IDEO_REST = {
  democracy: { communism: 0.2, fascism: 0.3, neutrality: 0.5 },
  communism: { democracy: 0.25, fascism: 0.35, neutrality: 0.4 },
  fascism: { democracy: 0.3, communism: 0.35, neutrality: 0.35 },
  neutrality: { democracy: 0.35, communism: 0.2, fascism: 0.45 },
};

/** Podpora ideologií 0–1 (součet 1) pro vládnoucí ideologii `main` a stabilitu `stab` 0–1. */
export function ideologySupport(main, stab) {
  const top = 0.4 + 0.45 * Math.max(0, Math.min(1, stab));
  const rest = IDEO_REST[main] || IDEO_REST.neutrality;
  const out = {};
  for (const k of IDEO_ORDER) out[k] = k === main ? top : (1 - top) * (rest[k] || 0);
  return out;
}
