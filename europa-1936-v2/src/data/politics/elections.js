// Volby v demokraciích (F4): den prvních voleb ve hře (0 = 1. 1. 1936) a odstup dalších ve dnech. Termíny podle skutečných
// volebních období; země mimo seznam volí každé čtyři roky od dne odvozeného ze semínka (`electionDay`).
export const ELECTIONS = {
  FRA: { day: 123, every: 1461 },    // květen 1936
  BEL: { day: 144, every: 1461 },    // květen 1936
  FIN: { day: 183, every: 1096 },    // červenec 1936
  SWE: { day: 263, every: 1461 },    // září 1936
  NOR: { day: 293, every: 1096 },    // říjen 1936
  HOL: { day: 511, every: 1461 },    // květen 1937
  CZE: { day: 1236, every: 2192 },   // 1939 (šestileté období)
  DEN: { day: 1188, every: 1461 },   // duben 1939
  ENG: { day: 1779, every: 1826 },   // listopad 1940 (pětileté období)
};
