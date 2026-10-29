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
};
