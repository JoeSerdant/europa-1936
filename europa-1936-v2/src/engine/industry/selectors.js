// Dotazy na průmysl pro rozhraní a AI (čisté, bez změn stavu).
import { getWorld } from '../world.js';
import { I } from './constants.js';
import { EQUIP } from '../../data/army/equipment.js';
import { BUILDINGS, EQUIP_PROD, PROD, isShip } from '../../data/industry/index.js';
import { modsOf, isUnlocked } from '../research/core.js';
import { polModsOf, outMult, consOf } from '../politics/core.js';
import { tallyOwners, factoryUse, trimAllLines, demandOf, resFlows, lineFactor, lineRate, slotsOf, slotsUsed, categoryOf, itemCost } from './core.js';

const idxOf = (o) => (typeof o === 'string' ? getWorld().ownerIdx[o] : o);

/** Souhrn průmyslu země: továrny, spotřební zboží, dostupné továrny, linky (se zkrácením), toky surovin, stavby a smlouvy. */
export function industryOf(state, o) {
  o = idxOf(o);
  const ind = state.ind;
  const t = tallyOwners(state)[o];
  const use = factoryUse(t, consOf(state, o));
  const lines = trimAllLines(ind.lines.filter((l) => l.o === o), use.milAvail, t.dok);
  const mods = modsOf(state, o), pm = polModsOf(state, o), out = outMult(state, o), lv = state.mil.lv[o];
  const dem = demandOf(lines, lv);
  const res = resFlows(t, dem, ind.trade, o, mods.extract + pm.extract);
  let imports = 0;
  for (const r in res) imports += res[r].imp;
  const tradeCiv = imports * I.TRADE_CIV * (1 + pm.imp);
  const used = lines.filter((l) => !isShip(l.eq)).reduce((a, l) => a + l.fac, 0);
  const dockUsed = lines.filter((l) => isShip(l.eq)).reduce((a, l) => a + l.fac, 0);
  return {
    o, civ: t.civ, mil: t.mil, dok: t.dok, dockUsed, dockFree: Math.max(0, t.dok - dockUsed), occupied: t.occ,
    cons: consOf(state, o), consFac: use.consFac, tradeCiv,
    civAvail: Math.max(0, use.civAfterCons - tradeCiv), milAvail: use.milAvail, milUsed: used, milFree: Math.max(0, Math.floor(use.milAvail - used + 1e-9)),
    points: Math.max(0, use.civAfterCons - tradeCiv) * I.IC_PER_FAC * (1 + mods.build + pm.build) * out,
    effCap: I.EFF_CAP + mods.effCap,
    lines: lines.map((l) => ({ ...l, rate: lineRate(l, lv), perDay: lineRate(l, lv) * l.f * out, need: PROD[l.eq].res, cost: itemCost(l.eq, lv), naval: isShip(l.eq) })),
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
    s, cat, civ: e.civ, mil: e.mil, dok: e.dok || 0, port: w.states[s].v.some((p) => w.portLevel[p] > 0), inf: ind.inf[s] || 0, res: e.res,
    slots: slotsOf(ind, s), used: slotsUsed(ind, s),
    queued: ind.build.filter((b) => b.s === s),
  };
}

/** Body stavby: kolik bodů projekt potřebuje a jak rychle může postupovat. */
export const projectInfo = (kind) => ({ ...BUILDINGS[kind], perDay: BUILDINGS[kind].cost / BUILDINGS[kind].days });

/** Dny do dokončení fronty projektů země při současném přísunu (odhad pro rozhraní; −1 = nikdy). */
/** Výzbroj, kterou země může vyrábět (odemčená výzkumem). */
export const producibleEquip = (state, o) => Object.keys(EQUIP_PROD).filter((e) => isUnlocked(state, o, EQUIP[e].unlock));

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
