// Herní čas. Základní jednotka (tick) = 1 herní hodina. Hra začíná 1. 1. 1936 00:00.

export const START_UTC = Date.UTC(1936, 0, 1, 0, 0, 0);
export const HOUR_MS = 3600 * 1000;
export const HOURS_PER_DAY = 24;

const MONTHS_GEN = [
  'ledna', 'února', 'března', 'dubna', 'května', 'června',
  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince',
];
const WEEKDAYS = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];

export function dateOfHour(hour) {
  const d = new Date(START_UTC + hour * HOUR_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    weekday: d.getUTCDay(),
  };
}

/** Herní hodina (00:00) data ve tvaru 'YYYY-MM-DD'. */
export function hourOfDate(iso) {
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) throw new Error(`Neplatné datum: ${iso}`);
  return Math.round((t - START_UTC) / HOUR_MS);
}

export function dayOfHour(hour) {
  return Math.floor(hour / HOURS_PER_DAY);
}

export function formatDate(hour) {
  const d = dateOfHour(hour);
  return `${d.day}. ${MONTHS_GEN[d.month - 1]} ${d.year}`;
}

export function formatClock(hour) {
  return `${String(dateOfHour(hour).hour).padStart(2, '0')}:00`;
}

export function formatWeekday(hour) {
  return WEEKDAYS[dateOfHour(hour).weekday];
}

/** Doba v hodinách čitelně: "9 h", "5 d", "5 d 9 h" (zaokrouhleno nahoru na celé hodiny). */
export function formatDuration(hours) {
  const total = Math.max(0, Math.ceil(hours - 1e-6));
  if (total === 0) return '0 h';
  const d = Math.floor(total / HOURS_PER_DAY);
  const h = total % HOURS_PER_DAY;
  if (d === 0) return `${h} h`;
  return h === 0 ? `${d} d` : `${d} d ${h} h`;
}
