// Dotazy na průmysl pro rozhraní a AI (čisté, bez změn stavu).
import { getWorld } from '../world.js';
import { I } from './constants.js';
import { BUILDINGS, EQUIP_PROD } from '../../data/industry/index.js';
import { tallyOwners, factoryUse, trimLines, demandOf, resFlows, lineFactor, lineRate, slotsOf, slotsUsed, categoryOf } from './core.js';

const idxOf = (o) => (typeof o === 'string' ? getWorld().ownerIdx[o] : o);

/** Souhrn průmyslu země: továrny, spotřební zboží, dostupné továrny, linky (se zkrácením), toky surovin, stavby a smlouvy. */
export function industryOf(state, o) {
  o = idxOf(o);
  const ind = state.ind;
  const t = tallyOwners(state)[o];
  const use = factoryUse(t, ind.cons[o]);
  const lines = trimLines(ind.lines.filter((l) => l.o === o), use.milAvail);
  const dem = demandOf(lines);
  const res = resFlows(t, dem, ind.trade, o);
  let imports = 0;
  for (const r in res) imports += res[r].imp;
  const tradeCiv = imports * I.TRADE_CIV;
  const used = lines.reduce((a, l) => a + l.fac, 0);
  return {
    o, civ: t.civ, mil: t.mil, occupied: t.occ,
    cons: ind.cons[o], consFac: use.consFac, tradeCiv,
    civAvail: Math.max(0, use.civAfterCons - tradeCiv), milAvail: use.milAvail, milUsed: used, milFree: Math.max(0, Math.floor(use.milAvail - used + 1e-9)),
    points: Math.max(0, use.civAfterCons - tradeCiv) * I.IC_PER_FAC,
    lines: lines.map((l) => ({ ...l, rate: lineRate(l), perDay: lineRate(l) * l.f, need: EQUIP_PROD[l.eq].res })),
    res,
    build: ind.build.filter((b) => b.o === o),
    trade: ind.trade.filter((d) => d.from === o || d.to === o),
  };
}

/** Údaje o státu: kategorie, sloty, budovy, rozestavěné stavby, těžba, infrastruktura. */
export function stateIndustry(state, s) {
  const ind = state.ind, e = ind.st[s];
  if (!e) return null;
  const w = getWorld();
  const cat = categoryOf(w.states[s].p);
  return {
    s, cat, civ: e.civ, mil: e.mil, inf: ind.inf[s] || 0, res: e.res,
    slots: slotsOf(ind, s), used: slotsUsed(ind, s),
    queued: ind.build.filter((b) => b.s === s),
  };
}

/** Body stavby: kolik bodů projekt potřebuje a jak rychle může postupovat. */
export const projectInfo = (kind) => ({ ...BUILDINGS[kind], perDay: BUILDINGS[kind].cost / BUILDINGS[kind].days });

/** Dny do dokončení fronty projektů země při současném přísunu (odhad pro rozhraní; −1 = nikdy). */
export function projectEta(state, o, buildId) {
  const sum = industryOf(state, o);
  let pool = sum.points, days = 0;
  const list = sum.build;
  const i = list.findIndex((b) => b.id === buildId);
  if (i < 0) return -1;
  let capBefore = 0;
  for (let k = 0; k < i; k++) capBefore += BUILDINGS[list[k].k].cost / BUILDINGS[list[k].k].days;
  const b = list[i], B = BUILDINGS[b.k];
  const mine = Math.min(B.cost / B.days, Math.max(0, pool - capBefore));
  if (mine <= 0) return -1;
  days = Math.ceil((B.cost - b.prog) / mine);
  return days;
}
