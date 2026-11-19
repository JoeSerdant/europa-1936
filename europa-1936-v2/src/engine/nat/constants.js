// Vyvážení národních cílů a událostí (M22).
export const NAT = {
  FOCUS_SPEED: 1,     // dnů plnění cíle za den
  PEND_MAX: 4,
  CONT_MIN: 4,        // průběžné cíle (M85): nejméně tolik splněných běžných cílů
  CONT_PP: 0.5,       // denní cena průběžného cíle v politické moci        // nejvýš tolik událostí čeká na volbu hráče
  ALT_HIST_W: 5,      // M100 (F2: 3 → 8, F3: 8 → 5): váha historické cesty při volbě AI bez historie (alternativy mají váhu 1)
  FREE_FOCUS_JITTER: 3,   // F3: ve volné historii náhodný posun váhy `ai` cíle o 0–3 podle semínka hry (pořadí cílů se mezi hrami liší)
  ALT_MIN_SUPPORT: 20,       // F2: AI zvolí alternativní cestu jen, má-li její strana v zemi aspoň tolik % podpory
  ALT_MIN_SUPPORT_MAJOR: 30, // F2: totéž pro velmoci
};
