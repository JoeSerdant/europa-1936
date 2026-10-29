// Vyvážení zpravodajství (M41): všechna čísla na jednom místě (vlastní hodnoty).
export const SPY = {
  AGENT_PP: 25,                    // cena najmutí agenta v politické moci
  AGENTS_MAX: { 1: 8, 2: 5, 3: 3 }, // nejvíc agentů podle velikosti země
  BASE: 0.5,                       // základní šance operace
  INTEL_BONUS: 0.3,                // bonus za plný přehled o cíli
  AGENT_BONUS: 0.02,               // bonus za každého dalšího agenta (nejvíc 5)
  COUNTER: 0.04,                   // postih za každého agenta cíle (protišpionáž, nejvíc 8)
  MIN: 0.1, MAX: 0.9,              // meze šance
  CAUGHT: 0.5,                     // pravděpodobnost, že neúspěšná operace je odhalena
  REL_CAUGHT: -12,                 // změna vztahu při odhalení
  INTEL_GAIN: 0.35,                // přírůstek přehledu po průzkumu
  INTEL_DECAY: 0.0015,             // denní ztráta přehledu
  SABOTAGE: 0.05,                  // podíl zničených zásob
  STEAL: 0.12, STEAL_BEHIND: 0.25, // zrychlení výzkumu (cíl pokročilejší = větší)
  UNREST_STAB: 0.04, UNREST_WS: 0.02,
};
