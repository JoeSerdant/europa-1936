// Výchozí druhy šablon divizí. Každá země dostane při startu kopie těch, které používá její sestava (national.js); hráč si může navrhnout další.
// reg = pluky (sloupce), v každém řada praporů; sup = podpůrné roty.

const row = (t, n) => Array.from({ length: n }, () => t);

export const TPL_KINDS = {
  pesi: {
    nm: 'Pěší divize', short: 'pěší divize', sym: 'inf',
    reg: [row('pesi', 3), row('pesi', 3), row('pesi', 3)], sup: ['ing', 'del'],
  },
  brig: {
    nm: 'Pěší brigáda', short: 'pěší brigáda', sym: 'inf',
    reg: [row('pesi', 3), row('pesi', 3)], sup: ['del'],
  },
  motor: {
    nm: 'Motorizovaná divize', short: 'motorizovaná divize', sym: 'mot',
    reg: [row('motor', 3), row('motor', 3), row('motor', 3)], sup: ['zvid', 'ing', 'del'],
  },
  tank: {
    nm: 'Tanková divize', short: 'tanková divize', sym: 'arm',
    reg: [row('ltank', 2), row('ltank', 2), row('motor', 2)], sup: ['zvid', 'ing', 'del'],
  },
  hory: {
    nm: 'Horská divize', short: 'horská divize', sym: 'mtn',
    reg: [row('horsti', 3), row('horsti', 3), row('horsti', 3)], sup: ['ing', 'del'],
  },
  kav: {
    nm: 'Jízdní brigáda', short: 'jízdní brigáda', sym: 'cav',
    reg: [row('jezdci', 2), row('jezdci', 2)], sup: ['zvid'],
  },
};

export const TPL_KIND_IDS = Object.keys(TPL_KINDS);
