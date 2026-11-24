// Dotazy na průmysl pro rozhraní a AI (čisté, bez změn stavu).
import { hasRail, isCoastal, provLevel } from './commands.js';
import { getWorld } from '../world.js';
import { I } from './constants.js';
import { EQUIP } from '../../data/army/equipment.js';
import { BUILDINGS, EQUIP_PROD, PROD, isShip, isAir } from '../../data/industry/index.js';
import { modsOf, isUnlocked } from '../research/core.js';
import { polModsOf, outMult, consOf } from '../politics/core.js';
import { tallyOwners, factoryUse, trimAllLines, demandOf, resFlows, lineFactor, lineRate, slotsOf, slotsUsed, categoryOf, itemCost } from './core.js';

const idxOf = (o) => (typeof o === 'string' ? getWorld().ownerIdx[o] : o);

/**
 * Souhrn průmyslu země: továrny, spotřební zboží, dostupné továrny, linky (se zkrácením), toky surovin, stavby a smlouvy.
 * F2 (výkon): výsledek se pamatuje pro tentýž objekt stavu (stav je neměnný; AI se na stejnou zemi ptá v jednom dni opakovaně). Výsledek se nesmí měnit.
 */
const indMemo = new WeakMap();   // stav → Map(země → souhrn)
export function industryOf(state, o) {
  o = idxOf(o);
  let m = indMemo.get(state);
  if (!m) { m = new Map(); indMemo.set(state, m); }
  let r = m.get(o);
  if (!r) { r = industrySummary(state, o); m.set(o, r); }
  return r;
}

function industrySummary(state, o) {
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
    cons: consOf(state, o), consFac: use.consFac, tradeCiv, imports,
    civAvail: Math.max(0, use.civAfterCons - tradeCiv), milAvail: use.milAvail, milUsed: used, milFree: Math.max(0, Math.floor(use.milAvail - used + 1e-9)),
    points: Math.max(0, use.civAfterCons - tradeCiv) * I.IC_PER_FAC * (1 + mods.build + pm.build) * out,
    effCap: I.EFF_CAP + mods.effCap,
    lines: lines.map((l) => ({ ...l, rate: lineRate(l, lv), perDay: lineRate(l, lv) * l.f * out, need: PROD[l.eq].res, cost: itemCost(l.eq, lv), naval: isShip(l.eq), air: isAir(l.eq) })),
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
    s, cat, civ: e.civ, mil: e.mil, dok: e.dok || 0, port: w.states[s].v.some((p) => w.portLevel[p] > 0), inf: ind.inf[s] || 0, afb: e.afb || 0, radar: e.radar || 0, nb: e.nb || 0, hub: e.hub || 0, res: e.res,
    slots: slotsOf(ind, s), used: slotsUsed(ind, s),
    queued: ind.build.filter((b) => b.s === s),
  };
}

/** Úroveň pevnosti v provincii `p` (0–5). */
export const fortOf = (state, p) => (state.ind.fort && state.ind.fort[p]) || 0;

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

/**
 * Kolik staveb `kind` lze ještě zadat ve státě `s` zemí `o` (M103, stavění klikáním na mapu jako v HOI4): { n, why }.
 * `n` = volné místo (sloty, nebo strop budovy minus postavené a rozestavěné), `why` = důvod nuly česky. Pevnost (stavba v provincii) viz `fortRoom`.
 * Pravidla odpovídají příkazu `build`.
 */
export function buildRoom(state, s, kind, o) {
  const w = getWorld(), ind = state.ind, B = BUILDINGS[kind];
  if (!B || B.province || !(s >= 1 && s < w.states.length)) return { n: 0, why: 'Neplatná stavba.' };
  if (state.stateOwner[s] !== o || state.ctrl[w.states[s].cap] !== o) return { n: 0, why: 'Stavět lze jen ve vlastním, neokupovaném státě.' };
  if (B.port && !w.states[s].v.some((p) => w.portLevel[p] > 0)) return { n: 0, why: `${B.n}: stát nemá přístav.` };
  if (B.rail && !hasRail(w, w.states[s].cap)) return { n: 0, why: `${B.n}: hlavní provincie státu nemá železnici.` };
  if (ind.build.filter((b) => b.o === o).length >= I.QUEUE_MAX) return { n: 0, why: 'Fronta staveb je plná.' };
  if (B.slot) {
    const n = slotsOf(ind, s) - slotsUsed(ind, s);
    return n > 0 ? { n, why: '' } : { n: 0, why: 'Ve státě není volný stavební slot (rozestavěné se počítají).' };
  }
  const have = kind === 'inf' ? ind.inf[s] || 0 : ind.st[s][kind] || 0;
  const n = (B.max ?? I.INF_MAX) - have - ind.build.filter((b) => b.s === s && b.k === kind).length;
  return n > 0 ? { n, why: '' } : { n: 0, why: `${B.n}: stát má nejvyšší úroveň.` };
}

/** Kolik úrovní pevnosti lze ještě zadat v provincii `p` zemí `o` (pravidla příkazu `buildFort`): { n, why }. */
export function fortRoom(state, p, o, kind = 'fort') {
  const w = getWorld(), ind = state.ind, B = BUILDINGS[kind];
  if (!B || !B.province || !(p >= 1 && p <= w.L)) return { n: 0, why: 'Neplatná provincie.' };
  if (state.stateOwner[w.provState[p]] !== o || state.ctrl[p] !== o) return { n: 0, why: `${B.n}: stavět lze jen ve vlastní, neokupované provincii.` };
  if (B.coast && !isCoastal(w, p)) return { n: 0, why: `${B.n}: provincie neleží u moře.` };
  if (ind.build.filter((b) => b.o === o).length >= I.QUEUE_MAX) return { n: 0, why: 'Fronta staveb je plná.' };
  const n = B.max - provLevel(ind, p, kind) - ind.build.filter((b) => b.p === p && b.k === kind).length;
  return n > 0 ? { n, why: '' } : { n: 0, why: `${B.n}: nejvyšší úroveň.` };
}
