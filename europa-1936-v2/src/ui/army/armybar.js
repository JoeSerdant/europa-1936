// Data lišty armád (M102): karty armád hráče po skupinách – zkratka, počet divizí, průměrná síla a organizace, boj, zásoby, plán, velitel.
// Čistá funkce nad stavem (testuje `test/armybar.test.js`).
import { armyTree } from '../../engine/index.js';
import { summarize } from './helpers.js';

/** Krátké označení armády na kartě: „1. armáda“ → „1.“, jinak iniciály (nejvýš 3 znaky). */
export function shortName(nm) {
  const m = /^(\d+)\./.exec(nm || '');
  if (m) return `${m[1]}.`;
  return (nm || '?').split(/\s+/).filter(Boolean).map((x) => x[0]).join('').slice(0, 3).toUpperCase();
}

/** Stav plánu pro ikonu: '' bez plánu, 'area' hájí oblast, 'front' drží linii, 'attack' útočí (linie s cíli, ne místní útok). */
export function planState(plan) {
  if (!plan) return '';
  if (plan.k === 'area') return 'area';
  return plan.to && plan.to.length && !plan.loc ? 'attack' : 'front';
}

/** Hlavní druh divizí armády (nejčastější). */
function mainCls(classes) {
  let best = 'inf', n = -1;
  for (const k in classes) if (classes[k] > n) { n = classes[k]; best = k; }
  return best;
}

/** Karty armád země `me`: { groups: [{ id, nm, gen, cards }], loose: [cards], free: [id divizí bez armády] }. */
export function armyCards(state, me) {
  if (!me) return { groups: [], loose: [], free: [] };
  const tree = armyTree(state, me), mil = state.mil;
  const gen = (id) => (id && mil.gens[id] ? { nm: mil.gens[id].nm, r: mil.gens[id].r } : null);
  const card = (node) => {
    const a = mil.armies[node.id], s = summarize(state, node.divs);
    return {
      id: node.id, nm: a.nm, short: shortName(a.nm), n: node.divs.length, divs: node.divs, hp: s.n ? s.hp : 0, org: s.n ? s.org : 0,
      fight: s.fight, lack: s.lack, moving: s.moving, cls: mainCls(s.classes), plan: planState(a.plan), mode: a.plan && a.plan.mode, gen: gen(a.cmd),
    };
  };
  return {
    groups: tree.groups.map((g) => ({ id: g.id, nm: mil.groups[g.id].nm, gen: gen(mil.groups[g.id].cmd), cards: g.armies.map(card) })),
    loose: tree.loose.armies.map(card),
    free: tree.loose.divs,
  };
}
