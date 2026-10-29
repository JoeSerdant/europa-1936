// Příkazy armády: čisté funkce (state, …) → nový stav; při neplatném vstupu vrací tentýž objekt.
// Příkazy nekontrolují, komu divize patří vůči hráči – to dělá rozhraní (ui/actions.js); engine je neutrální, aby jím šla řídit i AI.
import { isUnlocked } from '../research/core.js';
import { getWorld } from '../world.js';
import { C } from './constants.js';
import { openCtx, closeCtx, editDiv, relocate, removeDiv, removeBattle, addMan, editStock } from './ctx.js';
import { deriveStats, validateTemplate } from './stats.js';
import { atWar, addWar, nearestControlled } from './war.js';
import { findPath } from './paths.js';
import { statsOf } from './unit.js';
import { PLAN_MODES, AREA_MAX, planNow, aiNow } from './plans.js';

const isId = (x) => Number.isInteger(x) && x > 0;
const uniq = (a) => (Array.isArray(a) ? [...new Set(a)] : []);
const ownerIdx = (tag) => getWorld().ownerIdx[tag] || 0;
const bump = (mil, patch) => ({ ...mil, ...patch, ver: mil.ver + 1 });

/** Spustí `fn` nad pracovním kontextem; nic se nezměnilo → tentýž stav. */
function withCtx(state, fn) {
  const ctx = openCtx(state);
  fn(ctx);
  return closeCtx(ctx);
}

export function cleanName(s, max = 40) {
  if (typeof s !== 'string') return '';
  return s.replace(/\s+/g, ' ').trim().slice(0, max);
}

const divOf = (mil, id) => (isId(id) && id < mil.divs.length ? mil.divs[id] : null);
const armyOf = (mil, id) => (isId(id) && id < mil.armies.length ? mil.armies[id] : null);
const groupOf = (mil, id) => (isId(id) && id < mil.groups.length ? mil.groups[id] : null);
const tplOf = (mil, id) => (isId(id) && id < mil.tpl.length ? mil.tpl[id] : null);

// ============================================================ války
/** Po míru: zruší bitvy bez nepřátel a odešle cizí jednotky domů. */
function settleAfterPeace(ctx, a, b) {
  for (const bt of ctx.battles.slice()) {
    const valid = bt.att.some((x) => ctx.divs[x] && bt.dep.some((y) => ctx.divs[y] && atWar(ctx.mil, ctx.divs[x].o, ctx.divs[y].o)));
    if (valid) continue;
    for (const id of bt.att.concat(bt.dep)) { const d = ctx.divs[id]; if (d && d.b === bt.id) editDiv(ctx, id).b = 0; }
    removeBattle(ctx, bt.id);
  }
  for (let id = 1; id < ctx.divs.length; id++) {
    const d = ctx.divs[id];
    if (!d || (d.o !== a && d.o !== b)) continue;
    const c = ctx.ctrl[d.p];
    if (c === d.o || atWar(ctx.mil, d.o, c)) continue;
    const home = nearestControlled(ctx.ctrl, d.o, d.p);
    if (!home) { removeDiv(ctx, id); continue; }
    // přesun domů (bez bitev): divize se jen objeví v nejbližší vlastní provincii
    relocate(ctx, id, home);
    const e = editDiv(ctx, id);
    e.path = []; e.prog = 0; e.b = 0; e.dig = 0;
  }
}

/** Vyhlásí válku. Obranná AI obou stran dostane hned plány „Hájit oblast“. */
export function declareWar(state, aTag, bTag) {
  const a = ownerIdx(aTag), b = ownerIdx(bTag);
  if (!a || !b || a === b || atWar(state.mil, a, b)) return state;
  const s = { ...state, mil: bump(addWar(state.mil, a, b), {}) };
  return withCtx(s, (ctx) => aiNow(ctx, [a, b])) ;
}

/** Bílý mír: okupované provincie se vracejí držitelům, cizí jednotky odejdou domů, bitvy mezi stranami se ruší. */
export function makePeace(state, aTag, bTag) {
  const w = getWorld();
  const a = ownerIdx(aTag), b = ownerIdx(bTag);
  const mil = state.mil;
  if (!a || !b || a === b || !atWar(mil, a, b)) return state;
  const wars = mil.wars.filter(([x, y]) => !((x === a && y === b) || (x === b && y === a)));
  let ctrl = state.ctrl, changed = false;
  for (let p = 1; p <= w.L; p++) {
    const own = state.stateOwner[w.provState[p]];
    const c = ctrl[p];
    if ((c === a && own === b) || (c === b && own === a)) {
      if (!changed) { ctrl = ctrl.slice(); changed = true; }
      ctrl[p] = own;
    }
  }
  const s = { ...state, ctrl, ownerVer: changed ? state.ownerVer + 1 : state.ownerVer, mil: bump(mil, { wars }) };
  return withCtx(s, (ctx) => settleAfterPeace(ctx, a, b));
}

// ============================================================ šablony
const unlockedFor = (state, o) => (def) => isUnlocked(state, o, def.unlock);   // M20: podle výzkumu země

function cleanTemplate(o, tpl, short) {
  const t = { o, nm: cleanName(tpl.nm), reg: tpl.reg.map((c) => c.slice()), sup: tpl.sup.slice() };
  if (short) t.short = short;
  return t;
}

export const templatesOf = (mil, o) => {
  const out = [];
  for (let i = 1; i < mil.tpl.length; i++) if (mil.tpl[i] && mil.tpl[i].o === o) out.push(i);
  return out;
};

export function createTemplate(state, tag, tpl) {
  const o = ownerIdx(tag);
  if (!o || validateTemplate(tpl, unlockedFor(state, o))) return state;
  if (templatesOf(state.mil, o).length >= C.TPL_MAX) return state;
  return { ...state, mil: bump(state.mil, { tpl: [...state.mil.tpl, cleanTemplate(o, tpl)] }) };
}

/** Upraví šablonu; existující divize si ponechají sílu a organizaci (nejvýš však nové maximum), chybějící sílu doplní sklad. */
export function editTemplate(state, tplId, tpl) {
  const mil = state.mil;
  const old = tplOf(mil, tplId);
  if (!old || validateTemplate(tpl, unlockedFor(state, old.o))) return state;
  const next = cleanTemplate(old.o, tpl, cleanName(tpl.nm) === old.nm ? old.short : undefined);
  const tpls = mil.tpl.slice();
  tpls[tplId] = next;
  const ns = deriveStats(next);
  let divs = mil.divs;
  for (let id = 1; id < mil.divs.length; id++) {
    const d = mil.divs[id];
    if (!d || d.tpl !== tplId) continue;
    if (d.hp > ns.hp || d.org > ns.org) {
      if (divs === mil.divs) divs = mil.divs.slice();
      divs[id] = { ...d, hp: Math.min(d.hp, ns.hp), org: Math.min(d.org, ns.org) };
    }
  }
  return { ...state, mil: bump(mil, { tpl: tpls, divs }) };
}

/** Smaže šablonu, kterou nepoužívá žádná divize ani výcvik. */
export function deleteTemplate(state, tplId) {
  const mil = state.mil;
  if (!tplOf(mil, tplId)) return state;
  if (mil.divs.some((d) => d && d.tpl === tplId) || mil.queue.some((q) => q.tpl === tplId)) return state;
  const tpls = mil.tpl.slice();
  tpls[tplId] = null;
  return { ...state, mil: bump(mil, { tpl: tpls }) };
}

// ============================================================ nábor
/** Zařadí `count` divizí šablony do výcviku v provincii `prov`. Lidskou sílu a výzbroj odečte hned; všechno, nebo nic. */
export function recruit(state, tplId, prov, count = 1) {
  const mil = state.mil, w = getWorld();
  const tpl = tplOf(mil, tplId);
  if (!tpl || !Number.isInteger(count) || count < 1 || count > 20) return state;
  if (!Number.isInteger(prov) || !w.isLand(prov) || state.ctrl[prov] !== tpl.o) return state;
  if (mil.queue.length + count > C.QUEUE_MAX) return state;
  const o = tpl.o, st = deriveStats(tpl);
  if (mil.man[o] < st.men * count) return state;
  const stock = mil.stock[o];
  for (const e in st.need) if ((stock[e] || 0) < st.need[e] * count) return state;
  const stock2 = { ...stock };
  for (const e in st.need) stock2[e] -= st.need[e] * count;
  const man = mil.man.slice();
  man[o] -= st.men * count;
  const stocks = mil.stock.slice();
  stocks[o] = stock2;
  const done = state.tick + st.days * 24;
  const items = [];
  for (let i = 0; i < count; i++) items.push({ id: mil.qn + 1 + i, o, tpl: tplId, p: prov, done });
  return { ...state, mil: bump(mil, { man, stock: stocks, queue: mil.queue.concat(items), qn: mil.qn + count }) };
}

/** Zruší výcvik (úplné vrácení lidské síly i výzbroje). */
export function cancelRecruit(state, queueId) {
  const mil = state.mil;
  const q = mil.queue.find((x) => x.id === queueId);
  if (!q) return state;
  const tpl = tplOf(mil, q.tpl);
  const man = mil.man.slice(), stocks = mil.stock.slice();
  if (tpl) {
    const st = deriveStats(tpl);
    man[q.o] += st.men;
    const s = { ...stocks[q.o] };
    for (const e in st.need) s[e] = (s[e] || 0) + st.need[e];
    stocks[q.o] = s;
  }
  return { ...state, mil: bump(mil, { man, stock: stocks, queue: mil.queue.filter((x) => x.id !== queueId) }) };
}

/** Rozpustí divize (mimo boj); lidská síla a výzbroj se vrátí podle zbývající síly. */
export function disband(state, divIds) {
  return withCtx(state, (ctx) => {
    for (const id of uniq(divIds)) {
      const d = isId(id) && id < ctx.divs.length ? ctx.divs[id] : null;
      if (!d || d.b !== 0) continue;
      const st = statsOf(ctx.mil, d);
      const f = st.hp ? Math.max(0, Math.min(1, d.hp / st.hp)) : 0;
      addMan(ctx, d.o, st.men * f);
      const s = editStock(ctx, d.o);
      for (const e in st.need) s[e] = (s[e] || 0) + st.need[e] * f;
      removeDiv(ctx, id);
    }
  });
}

// ============================================================ rozkazy
const isDefending = (mil, d, id) => {
  if (!d.b) return false;
  const b = mil.battles.find((x) => x.id === d.b);
  return !!b && b.dep.includes(id);
};

/** Pošle divize do provincie `prov` (nejkratší průchozí cesta). Nepřátelská provincie = útok. Divize, které se nedostanou nikam, se přeskočí. */
export function orderMove(state, divIds, prov) {
  const mil = state.mil, w = getWorld();
  if (!Number.isInteger(prov) || !w.isLand(prov)) return state;
  const paths = new Map();
  let divs = null;
  for (const id of uniq(divIds)) {
    const d = divOf(mil, id);
    if (!d || d.p === prov || isDefending(mil, d, id)) continue;
    const key = `${d.o}:${d.p}`;
    if (!paths.has(key)) paths.set(key, findPath(mil, state.ctrl, d.o, d.p, prov));
    const path = paths.get(key);
    if (!path) continue;
    if (!divs) divs = mil.divs.slice();
    divs[id] = { ...d, path, prog: d.path[0] === path[0] ? d.prog : 0 };
  }
  return divs ? { ...state, mil: { ...mil, divs } } : state;
}

/** Zruší rozkazy (divize se zastaví; útočící divize se z bitvy stáhnou). */
export function cancelOrder(state, divIds) {
  const mil = state.mil;
  let divs = null;
  for (const id of uniq(divIds)) {
    const d = divOf(mil, id);
    if (!d || (d.path.length === 0 && d.prog === 0) || isDefending(mil, d, id)) continue;
    if (!divs) divs = mil.divs.slice();
    divs[id] = { ...d, path: [], prog: 0 };
  }
  return divs ? { ...state, mil: { ...mil, divs } } : state;
}

// ============================================================ armády a skupiny armád
function nextNumber(list, o, suffix) {
  let n = 0;
  for (const x of list) if (x && x.o === o) { const m = /^(\d+)\./.exec(x.nm); n = Math.max(n, m ? +m[1] : 0); }
  return `${n + 1}. ${suffix}`;
}

export function createArmy(state, tag, name, divIds = []) {
  const o = ownerIdx(tag);
  if (!o) return state;
  const mil = state.mil;
  const ids = uniq(divIds).filter((id) => divOf(mil, id) && divOf(mil, id).o === o);
  if (ids.length > C.ARMY_CAP) return state;
  const id = mil.armies.length;
  const armies = [...mil.armies, { o, nm: cleanName(name) || nextNumber(mil.armies, o, 'armáda'), grp: 0, cmd: 0, plan: null, pl: 0 }];
  let divs = mil.divs;
  if (ids.length) { divs = mil.divs.slice(); for (const x of ids) divs[x] = { ...divs[x], army: id }; }
  return { ...state, mil: bump(mil, { armies, divs }) };
}

export function renameArmy(state, armyId, name) {
  const a = armyOf(state.mil, armyId), nm = cleanName(name);
  if (!a || !nm || nm === a.nm) return state;
  const armies = state.mil.armies.slice();
  armies[armyId] = { ...a, nm };
  return { ...state, mil: bump(state.mil, { armies }) };
}

export function disbandArmy(state, armyId) {
  const mil = state.mil;
  if (!armyOf(mil, armyId)) return state;
  const armies = mil.armies.slice();
  armies[armyId] = null;
  let divs = mil.divs;
  for (let id = 1; id < divs.length; id++) {
    if (divs[id] && divs[id].army === armyId) { if (divs === mil.divs) divs = divs.slice(); divs[id] = { ...divs[id], army: 0 }; }
  }
  return { ...state, mil: bump(mil, { armies, divs }) };
}

/** Přiřadí divize do armády; `armyId` 0 = vyřadit z armád. Překročení limitu velení (24) příkaz odmítne. */
export function assignDivisions(state, armyId, divIds) {
  const mil = state.mil;
  const army = armyId === 0 ? null : armyOf(mil, armyId);
  if (armyId !== 0 && !army) return state;
  const ids = uniq(divIds).filter((id) => { const d = divOf(mil, id); return d && (!army || d.o === army.o) && d.army !== armyId; });
  if (!ids.length) return state;
  if (army) {
    const stay = mil.divs.reduce((n, d, id) => n + (d && d.army === armyId && !ids.includes(id) ? 1 : 0), 0);
    if (stay + ids.length > C.ARMY_CAP) return state;
  }
  const divs = mil.divs.slice();
  for (const id of ids) divs[id] = { ...divs[id], army: armyId };
  return { ...state, mil: bump(mil, { divs }) };
}

export function createGroup(state, tag, name, armyIds = []) {
  const o = ownerIdx(tag);
  if (!o) return state;
  const mil = state.mil;
  const ids = uniq(armyIds).filter((id) => armyOf(mil, id) && armyOf(mil, id).o === o);
  if (ids.length > C.GROUP_CAP) return state;
  const id = mil.groups.length;
  const groups = [...mil.groups, { o, nm: cleanName(name) || nextNumber(mil.groups, o, 'skupina armád'), cmd: 0 }];
  let armies = mil.armies;
  if (ids.length) { armies = mil.armies.slice(); for (const x of ids) armies[x] = { ...armies[x], grp: id }; }
  return { ...state, mil: bump(mil, { groups, armies }) };
}

export function renameGroup(state, groupId, name) {
  const g = groupOf(state.mil, groupId), nm = cleanName(name);
  if (!g || !nm || nm === g.nm) return state;
  const groups = state.mil.groups.slice();
  groups[groupId] = { ...g, nm };
  return { ...state, mil: bump(state.mil, { groups }) };
}

export function disbandGroup(state, groupId) {
  const mil = state.mil;
  if (!groupOf(mil, groupId)) return state;
  const groups = mil.groups.slice();
  groups[groupId] = null;
  let armies = mil.armies;
  for (let id = 1; id < armies.length; id++) {
    if (armies[id] && armies[id].grp === groupId) { if (armies === mil.armies) armies = armies.slice(); armies[id] = { ...armies[id], grp: 0 }; }
  }
  return { ...state, mil: bump(mil, { groups, armies }) };
}

/** Přiřadí armády do skupiny armád (nejvýš 5); `groupId` 0 = vyřadit ze skupin. */
export function assignArmies(state, groupId, armyIds) {
  const mil = state.mil;
  const grp = groupId === 0 ? null : groupOf(mil, groupId);
  if (groupId !== 0 && !grp) return state;
  const ids = uniq(armyIds).filter((id) => { const a = armyOf(mil, id); return a && (!grp || a.o === grp.o) && a.grp !== groupId; });
  if (!ids.length) return state;
  if (grp) {
    const stay = mil.armies.reduce((n, a, id) => n + (a && a.grp === groupId && !ids.includes(id) ? 1 : 0), 0);
    if (stay + ids.length > C.GROUP_CAP) return state;
  }
  const armies = mil.armies.slice();
  for (const id of ids) armies[id] = { ...armies[id], grp: groupId };
  return { ...state, mil: bump(mil, { armies }) };
}

/** Jmenuje velitele: `kind` = 'army' | 'group', `genId` 0 = odvolat. Skupinu armád vede jen polní maršál. Velitel přeložený odjinud se odvolá z původního místa. */
export function assignCommander(state, kind, id, genId) {
  const mil = state.mil;
  const target = kind === 'army' ? armyOf(mil, id) : kind === 'group' ? groupOf(mil, id) : null;
  if (!target || !Number.isInteger(genId) || genId < 0) return state;
  if (genId !== 0) {
    const g = isId(genId) && genId < mil.gens.length ? mil.gens[genId] : null;
    if (!g || g.o !== target.o || (kind === 'group' && g.r !== 'M')) return state;
  }
  if (target.cmd === genId) return state;
  const armies = mil.armies.slice(), groups = mil.groups.slice();
  if (genId !== 0) {
    for (let i = 1; i < armies.length; i++) if (armies[i] && armies[i].cmd === genId) armies[i] = { ...armies[i], cmd: 0 };
    for (let i = 1; i < groups.length; i++) if (groups[i] && groups[i].cmd === genId) groups[i] = { ...groups[i], cmd: 0 };
  }
  if (kind === 'army') armies[id] = { ...armies[id], cmd: genId }; else groups[id] = { ...groups[id], cmd: genId };
  return { ...state, mil: bump(mil, { armies, groups }) };
}

// ============================================================ plány
const landList = (list) => {
  const w = getWorld();
  if (!Array.isArray(list)) return null;
  const out = [];
  for (const p of list) { if (!Number.isInteger(p) || !w.isLand(p)) return null; if (!out.includes(p)) out.push(p); }
  return out;
};

/** Normalizuje plán; neplatný → null. */
export function normalizePlan(plan) {
  if (!plan || typeof plan !== 'object') return null;
  if (plan.k === 'area') {
    const area = landList(plan.area);
    return area && area.length >= 1 && area.length <= AREA_MAX ? { k: 'area', area } : null;
  }
  if (plan.k === 'front') {
    const line = landList(plan.line), to = landList(plan.to ?? []);
    const mode = PLAN_MODES.includes(plan.mode) ? plan.mode : 'balanced';
    if (!line || !to || line.length < 1 || line.length > AREA_MAX || to.length > AREA_MAX) return null;
    return { k: 'front', line, to: to.filter((p) => !line.includes(p)), mode };
  }
  return null;
}

/** Zadá armádě plán a hned ji naplánuje. */
export function setPlan(state, armyId, plan) {
  const mil = state.mil;
  const a = armyOf(mil, armyId), p = normalizePlan(plan);
  if (!a || !p) return state;
  const armies = mil.armies.slice();
  armies[armyId] = { ...a, plan: p };
  const s = { ...state, mil: bump(mil, { armies }) };
  return withCtx(s, (ctx) => planNow(ctx, armyId));
}

/** Zruší plán (divize zůstanou, kde jsou). */
export function clearPlan(state, armyId) {
  const mil = state.mil;
  const a = armyOf(mil, armyId);
  if (!a || !a.plan) return state;
  const armies = mil.armies.slice();
  armies[armyId] = { ...a, plan: null };
  return { ...state, mil: bump(mil, { armies }) };
}

/** Přepne režim útoku u plánu Linie fronty. */
export function setPlanMode(state, armyId, mode) {
  const a = armyOf(state.mil, armyId);
  if (!a || !a.plan || a.plan.k !== 'front' || !PLAN_MODES.includes(mode) || a.plan.mode === mode) return state;
  const armies = state.mil.armies.slice();
  armies[armyId] = { ...a, plan: { ...a.plan, mode } };
  return { ...state, mil: { ...state.mil, armies } };
}
