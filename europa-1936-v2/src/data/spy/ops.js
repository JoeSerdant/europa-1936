// Zpravodajské operace (M41). Vlastní názvy a čísla.
//  days   doba operace   cost   cena v politické moci   hostile   operace škodí cíli (po odhalení se zhorší vztah)
export const SPY_OPS = {
  recon: { n: 'Průzkum', info: 'Zvýší přehled o cílové zemi: další operace proti ní mají větší šanci.', days: 15, cost: 10, hostile: false },
  sabotage: { n: 'Sabotáž skladů', info: 'Cíl ztratí část zásob výzbroje.', days: 25, cost: 20, hostile: true },
  steal: { n: 'Krádež technologie', info: 'Urychlí vaši právě zkoumanou technologii (víc, je-li cíl pokročilejší).', days: 30, cost: 25, hostile: true },
  unrest: { n: 'Podněcování nepokojů', info: 'Cíl ztratí stabilitu a podporu války.', days: 25, cost: 20, hostile: true },
};
export const SPY_OP_IDS = Object.keys(SPY_OPS);
