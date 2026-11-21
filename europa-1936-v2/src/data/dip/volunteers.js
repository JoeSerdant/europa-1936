// Historičtí dobrovolníci (F4): ve dnech `start`–`end` (0 = 1. 1. 1936) chce AI země `from` mít u země `to` tolik divizí (`n`);
// padlé divize doplní jen ve vlnách po `AI.VOL_WAVE` dnech od začátku okna (sbor se nevyčerpá donekonečna).
// Posílá je stejným příkazem jako hráč (`sendVolunteers`), takže platí i pravidla (podpora války, velikost armády, strop).
// Ve volné historii se okna posouvají (`shiftOf`) a platí jen se zachovaným kurzem (`keepsCourse`).
export const HIST_VOL = [
  { from: 'ITA', to: 'NSP', n: 3, start: 225, end: 1190 },   // italský sbor ve Španělsku
  { from: 'GER', to: 'NSP', n: 1, start: 225, end: 1190 },   // sovětská pomoc republice je jen výzbroj (`HIST_AID`) – s divizemi by občanská válka neskončila
];
