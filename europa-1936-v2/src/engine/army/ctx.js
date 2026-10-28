// Pracovní kontext jedné herní hodiny. Systémy armády (pohyb, boj, zásobování …) v něm upravují divize, bitvy, kontrolu provincií a sklady
// způsobem „kopíruj při prvním zápisu“: původní stav zůstává nedotčený a výsledek se složí v `closeCtx`. Když se nic nezměnilo, vrátí se stejný objekt.
import { nextRandom } from '../rng.js';

export function openCtx(state) {
  const mil = state.mil;
  return {
    state, mil,
    tick: state.tick,                      // hodina, která právě proběhla (stav už je o tick posunutý)
    rng: state.rng,
    divs: mil.divs, divsOwn: false, freshDivs: null,
    battles: mil.battles, battlesOwn: false, freshBattles: null,
    gens: mil.gens, gensOwn: false, freshGens: null,
    armies: mil.armies, armiesOwn: false, freshArmies: null,
    stock: mil.stock, stockOwn: false,
    man: mil.man, manOwn: false,
    cas: mil.cas, casOwn: false,
    queue: mil.queue,
    ctrl: state.ctrl, ctrlOwn: false, ctrlChanged: false,
    ver: mil.ver, bn: mil.bn,
    at: null,                              // mapa provincie → pole id divizí (staví se líně)
    entered: [],                           // provincie, do kterých vstoupila divize v této hodině
    changed: false,
  };
}

/** Další náhodné číslo <0,1). */
export function rnd(ctx) {
  const [x, n] = nextRandom(ctx.rng);
  ctx.rng = n;
  return x;
}

// ---- divize ----
/** Upravitelná kopie divize (vytvoří se jednou za hodinu; další volání vrátí tutéž). */
export function editDiv(ctx, id) {
  if (!ctx.divsOwn) { ctx.divs = ctx.divs.slice(); ctx.divsOwn = true; ctx.freshDivs = new Set(); ctx.changed = true; }
  if (!ctx.freshDivs.has(id)) { ctx.divs[id] = { ...ctx.divs[id] }; ctx.freshDivs.add(id); }
  return ctx.divs[id];
}

/** Zruší divizi (null v poli) a odstraní ji z mapy obsazení. */
export function removeDiv(ctx, id) {
  const d = ctx.divs[id];
  if (!d) return;
  if (!ctx.divsOwn) { ctx.divs = ctx.divs.slice(); ctx.divsOwn = true; ctx.freshDivs = new Set(); }
  if (ctx.at) { const a = ctx.at.get(d.p); if (a) { const i = a.indexOf(id); if (i >= 0) a.splice(i, 1); if (!a.length) ctx.at.delete(d.p); } }
  ctx.divs[id] = null;
  ctx.ver++; ctx.changed = true;
}

/** Přidá novou divizi, vrátí její id. */
export function addDiv(ctx, d) {
  if (!ctx.divsOwn) { ctx.divs = ctx.divs.slice(); ctx.divsOwn = true; ctx.freshDivs = new Set(); }
  const id = ctx.divs.length;
  ctx.divs.push(d);
  ctx.freshDivs.add(id);
  if (ctx.at) { const a = ctx.at.get(d.p); if (a) a.push(id); else ctx.at.set(d.p, [id]); }
  ctx.ver++; ctx.changed = true;
  return id;
}

/** Mapa provincie → id divizí v ní (stavěná líně, udržovaná při pohybech). */
export function atMap(ctx) {
  if (!ctx.at) {
    const m = new Map();
    for (let id = 1; id < ctx.divs.length; id++) {
      const d = ctx.divs[id];
      if (!d) continue;
      const a = m.get(d.p);
      if (a) a.push(id); else m.set(d.p, [id]);
    }
    ctx.at = m;
  }
  return ctx.at;
}

/** Přesune divizi do provincie `p` (udržuje mapu obsazení). */
export function relocate(ctx, id, p) {
  const d = editDiv(ctx, id);
  const from = d.p;
  if (ctx.at) {
    const a = ctx.at.get(from);
    if (a) { const i = a.indexOf(id); if (i >= 0) a.splice(i, 1); if (!a.length) ctx.at.delete(from); }
    const b = ctx.at.get(p);
    if (b) b.push(id); else ctx.at.set(p, [id]);
  }
  d.p = p;
  ctx.entered.push(p);
}

// ---- bitvy ----
export function editBattle(ctx, id) {
  if (!ctx.battlesOwn) { ctx.battles = ctx.battles.slice(); ctx.battlesOwn = true; ctx.freshBattles = new Set(); ctx.changed = true; }
  const i = ctx.battles.findIndex((b) => b.id === id);
  if (i < 0) return null;
  if (!ctx.freshBattles.has(id)) { ctx.battles[i] = { ...ctx.battles[i] }; ctx.freshBattles.add(id); }
  return ctx.battles[i];
}
export const battleById = (ctx, id) => ctx.battles.find((b) => b.id === id) || null;
export function addBattle(ctx, b) {
  if (!ctx.battlesOwn) { ctx.battles = ctx.battles.slice(); ctx.battlesOwn = true; ctx.freshBattles = new Set(); }
  const nb = { ...b, id: ++ctx.bn };
  ctx.battles.push(nb);
  ctx.freshBattles.add(nb.id);
  ctx.changed = true;
  return nb;
}
export function removeBattle(ctx, id) {
  if (!ctx.battlesOwn) { ctx.battles = ctx.battles.slice(); ctx.battlesOwn = true; ctx.freshBattles = new Set(); }
  const i = ctx.battles.findIndex((b) => b.id === id);
  if (i >= 0) { ctx.battles.splice(i, 1); ctx.changed = true; }
}

// ---- velitelé, armády ----
export function editGen(ctx, id) {
  if (!ctx.gensOwn) { ctx.gens = ctx.gens.slice(); ctx.gensOwn = true; ctx.freshGens = new Set(); ctx.changed = true; }
  if (!ctx.freshGens.has(id)) { ctx.gens[id] = { ...ctx.gens[id] }; ctx.freshGens.add(id); }
  return ctx.gens[id];
}
export function editArmy(ctx, id) {
  if (!ctx.armiesOwn) { ctx.armies = ctx.armies.slice(); ctx.armiesOwn = true; ctx.freshArmies = new Set(); ctx.changed = true; }
  if (!ctx.freshArmies.has(id)) { ctx.armies[id] = { ...ctx.armies[id] }; ctx.freshArmies.add(id); }
  return ctx.armies[id];
}

// ---- sklady, lidská síla, ztráty ----
export function editStock(ctx, o) {
  if (!ctx.stockOwn) { ctx.stock = ctx.stock.slice(); ctx.stockOwn = 'copy'; ctx.freshStock = new Set(); ctx.changed = true; }
  if (!ctx.freshStock.has(o)) { ctx.stock[o] = { ...ctx.stock[o] }; ctx.freshStock.add(o); }
  return ctx.stock[o];
}
export function addMan(ctx, o, n) {
  if (!ctx.manOwn) { ctx.man = ctx.man.slice(); ctx.manOwn = true; ctx.changed = true; }
  ctx.man[o] = Math.max(0, ctx.man[o] + n);
}
export function addCas(ctx, o, n) {
  if (!ctx.casOwn) { ctx.cas = ctx.cas.slice(); ctx.casOwn = true; ctx.changed = true; }
  ctx.cas[o] += n;
}

// ---- kontrola provincií ----
export function setCtrl(ctx, p, o) {
  if (ctx.ctrl[p] === o) return;
  if (!ctx.ctrlOwn) { ctx.ctrl = ctx.ctrl.slice(); ctx.ctrlOwn = true; }
  ctx.ctrl[p] = o;
  ctx.ctrlChanged = true;
  ctx.changed = true;
}

export const bumpVer = (ctx) => { ctx.ver++; ctx.changed = true; };

export function closeCtx(ctx) {
  const { state, mil } = ctx;
  if (!ctx.changed && ctx.rng === state.rng) return state;
  const next = { ...mil };
  if (ctx.divsOwn) next.divs = ctx.divs;
  if (ctx.battlesOwn) next.battles = ctx.battles;
  if (ctx.gensOwn) next.gens = ctx.gens;
  if (ctx.armiesOwn) next.armies = ctx.armies;
  if (ctx.stockOwn) next.stock = ctx.stock;
  if (ctx.manOwn) next.man = ctx.man;
  if (ctx.casOwn) next.cas = ctx.cas;
  next.queue = ctx.queue;
  next.ver = ctx.ver;
  next.bn = ctx.bn;
  const out = { ...state, rng: ctx.rng, mil: next };
  if (ctx.ctrlChanged) { out.ctrl = ctx.ctrl; out.ownerVer = state.ownerVer + 1; }
  return out;
}
