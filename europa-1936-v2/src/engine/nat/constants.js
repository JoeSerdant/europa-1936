// Vyvážení národních cílů a událostí (M22).
export const NAT = {
  FOCUS_SPEED: 1,     // dnů plnění cíle za den
  PEND_MAX: 4,
  CONT_MIN: 4,        // průběžné cíle (M85): nejméně tolik splněných běžných cílů
  CONT_PP: 0.5,       // denní cena průběžného cíle v politické moci        // nejvýš tolik událostí čeká na volbu hráče
  ALT_HIST_W: 8,      // M100 (F2: 3 → 8): váha historické cesty při volbě AI bez historie (alternativy mají váhu 1)
  ALT_MIN_SUPPORT: 20,       // F2: AI zvolí alternativní cestu jen, má-li její strana v zemi aspoň tolik % podpory
  ALT_MIN_SUPPORT_MAJOR: 30, // F2: totéž pro velmoci
};
