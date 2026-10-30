// Ultimáta (M68): země `a` požaduje od `b` celou zemi (`annex`), nebo vyjmenované státy (`cede`). Cíl řízený AI odpoví hned a bez náhody: přijme, mají-li
// požadující (s blokem) přesilu `ratio`-násobek proti obráncům (s bloky a zaručiteli, kteří by se přidali), jinak odmítne. Odmítnutí dá požadujícímu
// hotové ospravedlnění války. Hráč jako cíl dostane událost `ult_<id>` se dvěma volbami (účinek `ult` zavolá `resolveDemand`).
// Záznamy: `state.dip.ult = [{ id, a, b, t, ok }]`, `ok` 1 přijato, 0 odmítnuto, 2 čeká na hráče. Čisté funkce, neplatný vstup vrací tentýž stav.
import { getWorld } from '../world.js';
import { logAdd } from '../log.js';
import { atWar } from '../army/war.js';
import { withCtx, settleAfterPeace } from '../army/commands.js';
import { divisionCount } from '../army/selectors.js';
import { DEMAND_BY_ID } from '../../data/dip/demands.js';
import { DIP } from './constants.js';
import { campOf, hasCapitulated, sameFaction, setRel } from './core.js';
import { joiningGuarantors } from './guarantee.js';
import { annexRump } from './subjects.js';
import { releaseBlock, releaseNation } from '../civil/index.js';

const ok = (o) => Number.isInteger(o) && o >= 1 && o < getWorld().owners.length;
const patch = (state, p) => ({ ...state, dip: { ...state.dip, ...p, ver: state.dip.ver + 1 } });
const ultsOf = (state) => state.dip.ult || [];

const nameIndex = new WeakMap();
function stateByName(name) {
  const w = getWorld();
  let m = nameIndex.get(w);
  if (!m) { m = new Map(); for (let i = 1; i < w.states.length; i++) m.set(w.states[i].n, i); nameIndex.set(w, m); }
  return m.get(name) || 0;
}

/** Požadavek z dat: `{ id, kind, states }` (u `cede` jen státy, které cíl ještě vlastní). */
export function demandSpec(state, d, b) {
  const states = d.kind === 'cede' ? (d.states || []).map(stateByName).filter((s) => s && state.stateOwner[s] === b) : [];
  return { id: d.id, kind: d.kind, states };
}

/** Síly stran: divize požadujícího bloku a obránců (blok cíle a zaručitelé, kteří by se přidali). */
export function demandForce(state, a, b) {
  const alive = (x) => !hasCapitulated(state, x);
  const att = campOf(state, a).filter(alive);
  let def = campOf(state, b).filter(alive);
  const guard = joiningGuarantors(state, b, att);
  for (const g of guard) for (const x of campOf(state, g)) if (alive(x) && !att.includes(x) && !def.includes(x)) def = [...def, x];
  const sum = (list) => list.reduce((s, x) => s + divisionCount(state, x), 0);
  return { mine: sum(att), theirs: sum(def), guard };
}

/** Přijme cíl požadavek s nároky `ratio`? Nestabilní vláda povolí snáze. Vrací { ok, mine, theirs, need }. */
export function acceptsDemand(state, a, b, ratio) {
  const f = demandForce(state, a, b);
  const weak = state.pol.own[b].stab < DIP.ULT_WEAK_STAB ? DIP.ULT_WEAK_MULT : 1;
  const need = Math.max(1, f.theirs) * ratio * weak;
  return { ok: f.mine >= need, mine: f.mine, theirs: f.theirs, need };
}

/** Proč `a` nemůže vznést požadavek `spec` vůči `b` (český text), nebo null. */
export function demandBlock(state, a, b, spec) {
  if (!ok(a) || !ok(b) || a === b || !spec) return 'Neplatná země.';
  if (hasCapitulated(state, a) || hasCapitulated(state, b)) return 'Kapitulovaná země požadavky nevznáší ani nepřijímá.';
  if (atWar(state.mil, a, b)) return 'Ve válce se ultimátum nevznáší.';
  if (sameFaction(state, a, b)) return 'Člen téhož bloku je spojenec.';
  if (state.dip.sub[a] || state.dip.sub[b]) return 'Loutkový stát požadavky nevznáší ani nepřijímá.';
  if (spec.kind !== 'annex' && !spec.states.length) return 'Země už požadované území nevlastní.';
  if (ultsOf(state).some((u) => u.a === a && u.b === b && (u.id === spec.id || u.ok === 2 || state.tick - u.t < DIP.ULT_COOLDOWN * 24))) return 'Ultimátum nedávno proběhlo.';
  if (state.pol.own[a].pp < DIP.ULT_PP) return `Chybí politická moc (${Math.ceil(DIP.ULT_PP - state.pol.own[a].pp)}).`;
  return null;
}

/** Zruší zemi `b` jako státní celek (bez války): vypadne z bloku, záruky a ospravedlnění zaniknou, její loutky se osamostatní. */
function retire(state, b) {
  const cap = state.dip.cap.slice(); cap[b] = 1;
  let fac = state.dip.fac, facs = state.dip.facs;
  const id = fac[b];
  if (id) {
    fac = fac.slice(); fac[b] = 0;
    facs = facs.slice();
    const f = facs[id], mem = f.mem.filter((m) => m !== b);
    facs[id] = mem.length ? { ...f, mem, ldr: f.ldr === b ? mem[0] : f.ldr } : null;
  }
  return patch(state, {
    cap, fac, facs, sub: state.dip.sub.map((v) => (v === b ? 0 : v)),
    gar: state.dip.gar.filter((g) => g.g !== b && g.t !== b),
    just: state.dip.just.filter((j) => j.a !== b && j.b !== b),
    acc: (state.dip.acc || []).filter((x) => x.g !== b && x.r !== b),
  });
}

/** Převede státy `ids` z `b` na `a` (jednotky `b` v nich odejdou domů); když `b` nezbyde nic, zanikne. */
function cede(state, a, b, ids) {
  const w = getWorld();
  const stateOwner = state.stateOwner.slice(), ctrl = state.ctrl.slice();
  for (const s of ids) { stateOwner[s] = a; for (const p of w.states[s].v) if (ctrl[p] === b) ctrl[p] = a; }
  const next = { ...state, stateOwner, ctrl, ownerVer: state.ownerVer + 1, mil: { ...state.mil, ver: state.mil.ver + 1 } };
  const s = withCtx(next, (ctx) => settleAfterPeace(ctx, b, a));
  return stateOwner.some((o) => o === b) ? s : retire(s, b);
}

const setPol = (state, o, fn) => {
  const own = state.pol.own.slice();
  own[o] = { ...own[o], ...fn(own[o]) };
  return { ...state, pol: { ...state.pol, own } };
};

/** Cíl požadavek přijal: území se převede, vztah klesne, vláda cíle ztratí stabilitu, požadující získá podporu války. */
function grantDemand(state, a, b, spec) {
  let s = state;
  if (spec.kind === 'annex') {
    if ((DEMAND_BY_ID[spec.id] || {}).release && releaseBlock(s, a, b) === null) s = releaseNation(s, a, b);   // M70: Slovensko vznikne jako loutka žadatele
    s = annexRump(retire(s, b), a, b);
  } else if (spec.states.length) s = cede(s, a, b, spec.states);
  s = patch(s, { rel: setRel(s.dip.rel, b, a, DIP.ULT_REL) });
  s = setPol(s, b, (p) => ({ stab: Math.max(0.05, p.stab - DIP.ULT_STAB) }));
  s = setPol(s, a, (p) => ({ ws: Math.min(1, p.ws + DIP.ULT_WS) }));
  return logAdd(s, { k: 'ult', a, b, x: spec.id, y: 1 });
}

/** Cíl požadavek odmítl: požadující dostane hotové ospravedlnění války, vztah klesne, cíl posílí odhodlání. */
function refuseDemand(state, a, b, spec) {
  let s = patch(state, {
    rel: setRel(state.dip.rel, b, a, DIP.ULT_REL / 2),
    just: [...state.dip.just.filter((j) => !(j.a === a && j.b === b)), { a, b, g: 'conquest', ready: state.tick }],
  });
  s = setPol(s, b, (p) => ({ ws: Math.min(1, p.ws + DIP.ULT_WS) }));
  return logAdd(s, { k: 'ult', a, b, x: spec.id, y: 0 });
}

/** Naplánuje hráči událost `ult_<id>` (spustí se při nejbližším denním kroku národních cílů). */
function askPlayer(state, b, id) {
  const own = state.nat.own.slice();
  own[b] = { ...own[b], sched: [...own[b].sched, { id: `ult_${id}`, at: state.tick }] };
  return { ...state, nat: { ...state.nat, ver: state.nat.ver + 1, own } };
}

/**
 * Vznese požadavek: stojí politickou moc. Cíl řízený AI odpoví hned (přijme, nebo odmítne), hráč dostane událost s volbou.
 * Neplatný požadavek vrací tentýž stav.
 */
export function demand(state, a, b, spec) {
  if (demandBlock(state, a, b, spec)) return state;
  const w = getWorld(), player = state.player ? w.ownerIdx[state.player] : 0;
  let s = setPol(state, a, (p) => ({ pp: p.pp - DIP.ULT_PP }));
  if (b === player && DEMAND_BY_ID[spec.id]) {
    s = patch(s, { ult: [...ultsOf(s), { id: spec.id, a, b, t: s.tick, ok: 2 }] });
    return logAdd(askPlayer(s, b, spec.id), { k: 'ultq', a, b, x: spec.id });
  }
  const r = acceptsDemand(s, a, b, (DEMAND_BY_ID[spec.id] || {}).ratio ?? DIP.ULT_RATIO);
  s = patch(s, { ult: [...ultsOf(s), { id: spec.id, a, b, t: s.tick, ok: r.ok ? 1 : 0 }] });
  return r.ok ? grantDemand(s, a, b, spec) : refuseDemand(s, a, b, spec);
}

/** Odpověď hráče (účinek události): přijme, nebo odmítne čekající požadavek `id`. */
export function resolveDemand(state, b, id, accept) {
  const u = ultsOf(state).find((x) => x.id === id && x.b === b && x.ok === 2);
  const d = DEMAND_BY_ID[id];
  if (!u || !d) return state;
  const s = patch(state, { ult: state.dip.ult.map((x) => (x === u ? { ...x, ok: accept ? 1 : 0 } : x)) });
  const spec = demandSpec(s, d, b);
  return accept ? grantDemand(s, u.a, b, spec) : refuseDemand(s, u.a, b, spec);
}
