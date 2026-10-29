// Příkazy průmyslu (M19): čisté funkce `(state, …) → state`; neplatný vstup vrací tentýž objekt. Země jsou indexy (`o`), státy ids.
// Příkazy nehlídají, komu věci patří vůči hráči – to dělá `ui/actions.js` (engine je neutrální pro AI).
import { getWorld } from '../world.js';
import { I } from './constants.js';
import { BUILDINGS, PROD, isShip, RESOURCES } from '../../data/industry/index.js';
import { EQUIP } from '../../data/army/equipment.js';
import { PLANES } from '../../data/air/planes.js';
import { isUnlocked } from '../research/core.js';
import { consOf } from '../politics/core.js';
import { tallyOwners, factoryUse, slotsOf, slotsUsed } from './core.js';

const patch = (state, p) => ({ ...state, ind: { ...state.ind, ...p, ver: state.ind.ver + 1 } });
const isInt = (n) => Number.isInteger(n);
const unlockOf = (eq) => (EQUIP[eq] ? EQUIP[eq].unlock : PLANES[eq].unlock);
const kindOf = (eq) => (isShip(eq) ? 's' : PLANES[eq] ? 'a' : 'g');
const validState = (w, s) => isInt(s) && s >= 1 && s < w.states.length;

/** Zadá stavbu `kind` ('civ' | 'mil' | 'inf') ve státě `s`; stavba přijde na konec fronty vlastníka. Stát musí ovládat jeho vlastník. */
export function build(state, s, kind) {
  const w = getWorld(), ind = state.ind;
  if (!validState(w, s) || !BUILDINGS[kind]) return state;
  const o = state.stateOwner[s];
  if (!o || state.ctrl[w.states[s].cap] !== o) return state;
  if (BUILDINGS[kind].port && !w.states[s].v.some((p) => w.portLevel[p] > 0)) return state;
  if (ind.build.filter((b) => b.o === o).length >= I.QUEUE_MAX) return state;
  if (BUILDINGS[kind].slot) { if (slotsUsed(ind, s) >= slotsOf(ind, s)) return state; }
  else if ((kind === 'inf' ? ind.inf[s] || 0 : ind.st[s][kind] || 0) + ind.build.filter((b) => b.s === s && b.k === kind).length >= (BUILDINGS[kind].max ?? I.INF_MAX)) return state;
  const id = ind.jn + 1;
  return patch(state, { jn: id, build: [...ind.build, { id, o, s, k: kind, prog: 0 }] });
}

export function cancelBuild(state, id) {
  if (!state.ind.build.some((b) => b.id === id)) return state;
  return patch(state, { build: state.ind.build.filter((b) => b.id !== id) });
}

/** Posune stavbu ve frontě své země o `dir` míst (−1 dřív, +1 později) nebo na začátek (`dir` = −Infinity). */
export function moveBuild(state, id, dir) {
  const list = state.ind.build, i = list.findIndex((b) => b.id === id);
  if (i < 0 || !dir) return state;
  const own = list.map((b, k) => (b.o === list[i].o ? k : -1)).filter((k) => k >= 0);
  const pos = own.indexOf(i);
  const to = Math.max(0, Math.min(own.length - 1, dir === -Infinity ? 0 : pos + Math.sign(dir) * Math.abs(dir)));
  if (to === pos) return state;
  const order = own.slice();
  order.splice(pos, 1);
  order.splice(to, 0, i);
  const out = list.slice();
  own.forEach((slot, k) => { out[slot] = list[order[k]]; });
  return patch(state, { build: out });
}

// ---- výroba ----
/** Volné továrny (výzbroj) nebo loděnice (`naval`) země: dostupné minus přiřazené linkám téže skupiny. */
const freeFor = (state, o, naval, exceptId = 0) => {
  const t = tallyOwners(state)[o];
  const avail = naval ? t.dok : factoryUse(t, consOf(state, o)).milAvail;
  let used = 0;
  for (const l of state.ind.lines) if (l.o === o && l.id !== exceptId && isShip(l.eq) === naval) used += l.fac;
  return Math.floor(avail - used + 1e-9);
};
const milFree = (state, o, exceptId = 0) => freeFor(state, o, false, exceptId);

/** Nová linka `eq` s `fac` továrnami (1 až volné továrny, nejvýš LINE_MAX_FAC). */
export function addLine(state, o, eq, fac = 1) {
  const w = getWorld(), ind = state.ind;
  if (!isInt(o) || o < 1 || o >= w.owners.length || !PROD[eq] || (!isShip(eq) && !isUnlocked(state, o, unlockOf(eq)))) return state;
  if (!isInt(fac) || fac < 1 || fac > I.LINE_MAX_FAC || fac > freeFor(state, o, isShip(eq))) return state;
  if (ind.lines.filter((l) => l.o === o).length >= I.LINES_MAX) return state;
  const id = ind.jn + 1;
  return patch(state, { jn: id, lines: [...ind.lines, { id, o, eq, fac, eff: I.EFF_START, acc: 0, f: 1, out: 0 }] });
}

/** Změní počet továren na lince (0 = zrušit linku). Přidání zředí efektivitu úměrně, ubrání ji nechává. */
export function setLineFactories(state, id, fac) {
  const ind = state.ind, l = ind.lines.find((x) => x.id === id);
  if (!l || !isInt(fac) || fac < 0 || fac > I.LINE_MAX_FAC || fac === l.fac) return state;
  if (fac === 0) return patch(state, { lines: ind.lines.filter((x) => x.id !== id) });
  if (fac > l.fac && fac - l.fac > freeFor(state, l.o, isShip(l.eq))) return state;
  const eff = fac > l.fac ? l.eff * (l.fac / fac) : l.eff;
  return patch(state, { lines: ind.lines.map((x) => (x.id === id ? { ...x, fac, eff } : x)) });
}

/** Přepne linku na jiný druh výzbroje: efektivita i rozpracovaná výroba se ztratí. */
export function setLineEquip(state, id, eq) {
  const ind = state.ind, l = ind.lines.find((x) => x.id === id);
  if (!l || !PROD[eq] || eq === l.eq || kindOf(eq) !== kindOf(l.eq) || (!isShip(eq) && !isUnlocked(state, l.o, unlockOf(eq)))) return state;
  return patch(state, { lines: ind.lines.map((x) => (x.id === id ? { ...x, eq, eff: I.EFF_START, acc: 0, out: 0 } : x)) });
}

export const removeLine = (state, id) => setLineFactories(state, id, 0);

// ---- obchod ----
/** Nová obchodní smlouva: `from` vyváží `amt` jednotek suroviny `res` denně do `to` (z přebytku vývozce). Ne mezi zeměmi ve válce, ne sama sobě. */
export function addTrade(state, from, to, res, amt) {
  const w = getWorld(), ind = state.ind;
  const ok = (o) => isInt(o) && o >= 1 && o < w.owners.length;
  if (!ok(from) || !ok(to) || from === to || !RESOURCES[res]) return state;
  if (!(amt > 0) || amt > I.TRADE_AMT_MAX) return state;
  if (state.mil.wars.some(([a, b]) => (a === from && b === to) || (a === to && b === from))) return state;
  if (ind.trade.filter((d) => d.from === from || d.to === from || d.from === to || d.to === to).length >= I.TRADE_MAX) return state;
  const id = ind.jn + 1;
  return patch(state, { jn: id, trade: [...ind.trade, { id, from, to, res, amt: Math.round(amt * 10) / 10, got: 0 }] });
}

export function setTradeAmount(state, id, amt) {
  const d = state.ind.trade.find((x) => x.id === id);
  if (!d || !(amt > 0) || amt > I.TRADE_AMT_MAX || Math.round(amt * 10) / 10 === d.amt) return state;
  return patch(state, { trade: state.ind.trade.map((x) => (x.id === id ? { ...x, amt: Math.round(amt * 10) / 10 } : x)) });
}

export function cancelTrade(state, id) {
  if (!state.ind.trade.some((d) => d.id === id)) return state;
  return patch(state, { trade: state.ind.trade.filter((d) => d.id !== id) });
}
