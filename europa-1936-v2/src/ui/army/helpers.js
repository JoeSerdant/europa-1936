// Pomocné funkce rozhraní armády: texty, souhrny výběru, popisy plánů a velitelů. Čisté funkce nad stavem hry (bez Reactu), takže jdou testovat.
import { getWorld, deriveStats, divisionView, MODE_NAMES, atWar } from '../../engine/index.js';

export const CLS_NAMES = { inf: 'Pěchota', mot: 'Motorizovaná pěchota', arm: 'Tanková', cav: 'Jízda', mtn: 'Horská pěchota' };
export const STATUS_NAMES = { idle: 'Stojí', moving: 'Na cestě', fighting: 'V boji', retreating: 'Ústup', lack: 'Bez zásob' };
export const RANK_NAMES = { M: 'Polní maršál', G: 'Generál' };
export const EQUIP_SHORT = { pusky: 'pušky', dela: 'děla', pdela: 'PT děla', auta: 'auta', vozy: 'obrněná vozidla', ltanky: 'lehké tanky', mtanky: 'střední tanky', htanky: 'těžké tanky', podpora: 'podpora' };

export const pct = (v) => `${Math.round(Math.max(0, v) * 100)} %`;
export const provName = (p) => getWorld().provName(p);

/** Souhrn skupiny divizí: počty, průměrná síla a organizace, stavy. */
export function summarize(state, ids) {
  const out = { n: 0, hp: 0, org: 0, fight: 0, lack: 0, moving: 0, idle: 0, retreat: 0, classes: {}, owners: new Set() };
  for (const id of ids) {
    const d = state.mil.divs[id];
    if (!d) continue;
    const st = deriveStats(state.mil.tpl[d.tpl]);
    out.n++;
    out.hp += st.hp ? d.hp / st.hp : 0;
    out.org += st.org ? d.org / st.org : 0;
    out.owners.add(d.o);
    out.classes[st.cls] = (out.classes[st.cls] || 0) + 1;
    if (d.b) out.fight++;
    else if (d.rt > 0) out.retreat++;
    else if (d.path.length) out.moving++;
    else out.idle++;
    if (d.sup < 0.999 && d.sg < 48) out.lack++;
  }
  if (out.n) { out.hp /= out.n; out.org /= out.n; }
  return out;
}

/** Krátký popis plánu armády (pro řádek stromu). */
export function planText(plan) {
  if (!plan) return 'Bez plánu';
  if (plan.k === 'area') return `Hájit oblast · ${plan.area.length} ${plural3(plan.area.length)}`;
  const modes = MODE_NAMES[plan.mode] || plan.mode;
  return `Linie fronty · ${plan.line.length} ${plural3(plan.line.length)}${plan.to.length ? ` → ${plan.to.length} ${plan.to.length === 1 ? 'cíl' : plan.to.length < 5 ? 'cíle' : 'cílů'}` : ''} · ${modes}`;
}
const plural3 = (n) => (n === 1 ? 'provincie' : n >= 2 && n <= 4 ? 'provincie' : 'provincií');

/** Zda válčí země `a` s `b` (indexy). */
export const atWarIdx = (state, a, b) => !!a && !!b && atWar(state, a, b);

/** Dovednosti velitele jako seznam [zkratka, hodnota]. */
export const SKILLS = [['a', 'Útok'], ['d', 'Obrana'], ['pl', 'Plánování'], ['lg', 'Logistika']];

export { deriveStats, divisionView, MODE_NAMES };
