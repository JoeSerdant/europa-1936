// Formátování čísel a textů pro rozhraní (česky, s nezlomitelnými mezerami).
const NBSP = ' ';
const nf = new Intl.NumberFormat('cs-CZ');
const nf1 = new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const fmtInt = (n) => nf.format(Math.round(n));
/** Obyvatelé: vstup v tisících → „68,2 mil.“ nebo „477 tis.“. */
export const fmtPop = (thousands) => (thousands >= 1000 ? `${nf1.format(thousands / 1000)}${NBSP}mil.` : `${nf.format(Math.round(thousands))}${NBSP}tis.`);
export const fmtArea = (km2) => `${nf.format(Math.round(km2))}${NBSP}km²`;
export const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
/** Desetinné číslo s danou přesností: 4.5 → „4,5“ (celé číslo bez desetinné části). */
export const fmtNum = (n, digits = 1) => {
  const f = 10 ** digits;
  const r = Math.round(n * f) / f;
  return Number.isInteger(r) ? nf.format(r) : new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(r);
};
/** Doba ve dnech: 1 den, 2 dny, 5 dní. */
export const fmtDays = (d) => `${fmtInt(d)} ${plural(Math.round(d), 'den', 'dny', 'dní')}`;
/** F3: odhad doby pochodu z hodin – „5 h“, „2 d 4 h“, od 10 dní jen dny („12 d“). */
export const fmtEta = (hours) => {
  const h = Math.max(0, Math.round(hours));
  if (h < 24) return `${h}${NBSP}h`;
  const d = Math.floor(h / 24), r = h % 24;
  return d >= 10 || !r ? `${d}${NBSP}d` : `${d}${NBSP}d ${r}${NBSP}h`;
};
/** F3: rychlost hry z herních hodin za sekundu – „den za 6 s“, „1,5 dne za sekundu“, „10 dní za sekundu“. */
export const fmtSpeed = (perSecond) => {
  if (perSecond < 24) return `den za ${fmtNum(24 / perSecond, 1)}${NBSP}s`;
  const d = perSecond / 24;
  return `${fmtNum(d, 1)} ${Number.isInteger(d) ? plural(d, 'den', 'dny', 'dní') : 'dne'} za sekundu`;
};
