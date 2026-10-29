// Statistiky (M45): měsíční snímky pořadí zemí pro grafy. `state.stat = { t: [tick…], m: { vp, divs, fac, stab }: [[hodnota podle země]…] }`.
import { getWorld } from '../world.js';
import { countryTable } from '../overview.js';

export const STAT = { EVERY: 24 * 30, MAX: 130 };   // snímek po 30 dnech, nejvýše 130 snímků (~ 10 let)
export const STAT_METRICS = [
  { id: 'vp', name: 'Vítězné body pod kontrolou' },
  { id: 'divs', name: 'Divize' },
  { id: 'fac', name: 'Továrny' },
  { id: 'stab', name: 'Stabilita (%)' },
];

export const createStat = () => ({ t: [], m: { vp: [], divs: [], fac: [], stab: [] } });

/** Jeden snímek: pole podle indexu země (0 = nikdo). Čistá funkce stavu. */
export function snapshot(state) {
  const n = getWorld().owners.length;
  const m = { vp: new Array(n).fill(0), divs: new Array(n).fill(0), fac: new Array(n).fill(0), stab: new Array(n).fill(0) };
  for (const r of countryTable(state)) {
    m.vp[r.o] = r.vp; m.divs[r.o] = r.divs; m.fac[r.o] = r.civ + r.mil; m.stab[r.o] = Math.round(r.stab * 100);
  }
  return m;
}

/** Zapíše snímek k aktuálnímu času (starší se po překročení limitu zahazují). */
export function recordStat(state) {
  const snap = snapshot(state);
  const st = state.stat;
  const cut = (a) => (a.length >= STAT.MAX ? a.slice(a.length - STAT.MAX + 1) : a);
  const m = {};
  for (const k of Object.keys(st.m)) m[k] = [...cut(st.m[k]), snap[k]];
  return { ...state, stat: { t: [...cut(st.t), state.tick], m } };
}

/** Hodinový krok: každých 30 dní jeden snímek. */
export function statHour(state) {
  return state.tick > 0 && state.tick % STAT.EVERY === 0 ? recordStat(state) : state;
}

/** Řada jedné země pro graf: [{ t, v }]. */
export function seriesOf(state, metric, o) {
  const a = state.stat.m[metric];
  return a ? state.stat.t.map((t, i) => ({ t, v: a[i][o] || 0 })) : [];
}

/** Nejlepších n zemí podle poslední hodnoty metriky (indexy zemí). */
export function topBy(state, metric, n = 6) {
  const a = state.stat.m[metric];
  if (!a || !a.length) return [];
  const last = a[a.length - 1];
  return last.map((v, o) => [o, v]).filter(([o]) => o > 0).sort((x, y) => y[1] - x[1] || x[0] - y[0]).slice(0, n).map(([o]) => o);
}
