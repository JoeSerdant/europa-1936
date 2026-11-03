// Vyvážení politiky: všechna čísla na jednom místě (vlastní hodnoty). Čas ve dnech, podíly 0–1.
export const POL = {
  PP_BASE: 2,         // politická moc za den
  PP_MAX: 2000,
  DRIFT: 0.005,       // denní přiblížení stability a podpory války k cíli
  WAR_WS: 0.15,       // bonus cíle podpory války ve válce
  OCC_STAB: 0.02,     // postih cíle stability za okupovaný stát
  OCC_MAX: 0.2,
  STAB_OUT: 0.4,      // vliv stability na výstup továren a staveb: (stab − 0,5) × STAB_OUT
  WS_MAN_BASE: 0.85,  // lidská síla × (WS_MAN_BASE + WS_MAN_SLOPE · podpora války)
  WS_MAN_SLOPE: 0.3,
  PARTY_REVERT: 0.02,  // strany (M72): denní návrat podpory k výchozímu rozložení (podíl rozdílu)
  PARTY_UNREST: 0.6,   // radikálové (komunisté, fašisté) denně získají tolik bodů krát (0,5 − stabilita), je-li stabilita pod 0,5
  PARTY_WAR: 0.04,     // válka denně přidá radikálům tolik bodů a ubere demokratům
  PARTY_LAW: 0.02,     // válečné zákony ekonomiky a odvodu posilují radikály, občanské demokracii
  PARTY_PP: 35,        // cena podpory strany v politické moci
  PARTY_GAIN: 5,       // body podpory, které strana podporou získá
  PARTY_CD: 20,        // dnů mezi dvěma podporami strany
  PARTY_MIN: 0.5,      // nejmenší podpora strany (body)
  COUP_GAP: 10,        // převrat: některá strana předstihne vládnoucí o tolik bodů
  COUP_STAB: 0.35,     // a stabilita je pod touto hodnotou
  COUP_COOL: 365,      // dnů po změně vlády, ve kterých k převratu nedojde
  COUP_HIT: 0.15,      // ztráta stability po převratu
  SPY_SUBVERT: 6,      // body, o které zpravodajská operace posílí stranu v cíli
};
