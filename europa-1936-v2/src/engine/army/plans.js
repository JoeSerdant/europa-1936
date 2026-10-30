// Plánovač: rozděluje divize armády podle jejího plánu a zadává jim cesty.
//  • Hájit oblast ('area')   – divize se rozloží po provinciích oblasti podle jejich důležitosti.
//  • Linie fronty ('front')  – totéž pro provincie linie; navíc útočí na cílové provincie ('to'), jakmile to dovolí režim:
//      careful  počká na nahromaděné plánování (polovina stropu) a plně odpočatou organizaci,
//      balanced útočí, když je organizace aspoň 65 %,
//      rush     útočí hned (organizace aspoň 35 %).
//    Dobytá cílová provincie přejde z 'to' do 'line'.
// Plánovač běží denně (a hned po zadání plánu); ovládá jen nečinné divize – ruční rozkaz platí, dokud divize nedojde.
// Země bez hráče (zatím jen obranná AI): armády bez vlastního plánu dostanou plán „Hájit oblast“ kolem fronty s nepřítelem.
import { getWorld } from '../world.js';
import { C } from './constants.js';
import { geo, adjacency } from './geo.js';
import { enemiesOf, hasWar } from './war.js';
import { findPath } from './paths.js';
import { adjKind } from './paths.js';
import { editDiv, editArmy } from './ctx.js';
import { statsOf, modsOf } from './unit.js';
import { friendsOf } from '../dip/accessCore.js';
import { supplyFlow } from './supply.js';

export const PLAN_MODES = ['careful', 'balanced', 'rush'];
export const MODE_NAMES = { careful: 'Opatrně', balanced: 'Vyváženě', rush: 'Zteče' };
const MODE_ORG = { careful: 0.85, balanced: 0.65, rush: 0.35 };
const MODE_PLAN = { careful: 0.5, balanced: 0, rush: 0 };
export const AREA_MAX = 300;

/** Důležitost provincie pro obranu: vítězné body, uzel, přístav, hlavní město, nepřátelé v sousedství. */
export function importance(w, g, adj, ctrl, enemies, o, p) {
  let s = 1 + w.vp[p] * 0.6 + (g.hub[p] ? 2 : 0) + (w.portLevel[p] ? 1 : 0);
  if (w.owners[o].cap === p) s += 6;
  for (const e of adj[p]) if (e.kind !== 2 && enemies.has(ctrl[e.to])) s += 1.5;
  return s;
}

/** Rozdělí `total` kusů podle vah metodou největšího zbytku (stabilní při shodě). */
export function quotas(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || !weights.length) return weights.map(() => 0);
  const raw = weights.map((x) => (total * x) / sum);
  const q = raw.map(Math.floor);
  let left = total - q.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - q[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; left > 0 && k < order.length; k++, left--) q[order[k][1]]++;
  return q;
}

/**
 * Omezí podíly divizí na posty kapacitou zásobování (M67): post unese jen tolik divizí, kolik uživí jeho tok; přebytek jde na posty s volnou kapacitou
 * (podle vah), a když nikde není místo, rozdělí se podle vah (hladovění nelze obejít). `caps` = nejvýš divizí na post (aspoň 1).
 */
export function capQuotas(q, caps, wt) {
  const out = q.slice();
  let excess = 0;
  for (let i = 0; i < out.length; i++) if (out[i] > caps[i]) { excess += out[i] - caps[i]; out[i] = caps[i]; }
  while (excess > 0) {
    let best = -1;
    for (let i = 0; i < out.length; i++) if (out[i] < caps[i] && (best < 0 || wt[i] > wt[best])) best = i;
    if (best < 0) break;
    out[best]++; excess--;
  }
  if (excess > 0) { const extra = quotas(excess, wt); for (let i = 0; i < out.length; i++) out[i] += extra[i]; }
  return out;
}

/** Mapa armáda → seřazená pole id divizí (jednou za běh). */
export function divisionsByArmy(ctx) {
  const m = new Map();
  for (let id = 1; id < ctx.divs.length; id++) {
    const d = ctx.divs[id];
    if (!d || !d.army) continue;
    const a = m.get(d.army);
    if (a) a.push(id); else m.set(d.army, [id]);
  }
  return m;
}

function makePathCache(ctx) {
  const cache = new Map();
  return (o, from, to) => {
    const key = `${o}:${from}:${to}`;
    if (cache.has(key)) return cache.get(key);
    const path = findPath(ctx.mil, ctx.ctrl, o, from, to, { dip: ctx.state.dip });
    cache.set(key, path);
    return path;
  };
}

function sendTo(ctx, id, path) {
  const d = ctx.divs[id];
  const same = d.path.length === path.length && d.path.every((p, i) => p === path[i]);
  if (same) return;
  const e = editDiv(ctx, id);
  e.prog = d.path[0] === path[0] ? d.prog : 0;
  e.path = path;
}

/** Provincie, v nichž má plán držet divize (jen ty, které země ještě ovládá). */
/** Tok zásobování země `o` pro plánovač (jednou za běh kontextu; přátelské území se počítá do sítě). */
function supplyOf(ctx, o) {
  if (!ctx.supMemo) ctx.supMemo = new Map();
  let r = ctx.supMemo.get(o);
  if (!r) { r = supplyFlow(ctx.ctrl, o, undefined, ctx.state.dip ? friendsOf(ctx.state.dip, o) : null); ctx.supMemo.set(o, r); }
  return r;
}

function postsOf(ctx, army) {
  const plan = army.plan;
  const list = plan.k === 'area' ? plan.area : plan.line;
  const friends = ctx.state.dip ? new Set(friendsOf(ctx.state.dip, army.o)) : null;   // M67: posty smějí být i na území spojenců
  return list.filter((p) => ctx.ctrl[p] === army.o || (friends !== null && friends.has(ctx.ctrl[p])));
}

/** Naplánuje jednu armádu. `byArmy` = divisionsByArmy(ctx), `pathOf` = mezipaměť cest. */
export function planArmy(ctx, armyId, byArmy, pathOf) {
  let army = ctx.armies[armyId];
  if (!army || !army.plan) return;
  const w = getWorld(), g = geo(w), adj = adjacency(w);
  const o = army.o;
  const ids = (byArmy.get(armyId) || []).filter((id) => ctx.divs[id]);
  if (!ids.length) return;

  // dobyté cíle přejdou do linie
  if (army.plan.k === 'front') {
    const taken = army.plan.to.filter((t) => ctx.ctrl[t] === o);
    if (taken.length) {
      const e = editArmy(ctx, armyId);
      e.plan = { ...army.plan, to: army.plan.to.filter((t) => !taken.includes(t)), line: army.plan.line.concat(taken.filter((t) => !army.plan.line.includes(t))) };
      army = e;
    }
  }
  const plan = army.plan;
  const posts = postsOf(ctx, army);
  const enemies = new Set(enemiesOf(ctx.mil, o));
  const targets = plan.k === 'front' ? plan.to.filter((t) => enemies.has(ctx.ctrl[t])) : [];
  const targetSet = new Set(targets);

  // ---- rozmístění ----
  if (posts.length) {
    const wt = posts.map((p) => {
      let s = importance(w, g, adj, ctx.ctrl, enemies, o, p);
      if (targets.length && adj[p].some((e) => e.kind !== 2 && targetSet.has(e.to))) s *= 2;   // u cíle útoku se shromažďuje víc divizí
      return s;
    });
    // každý post aspoň jednu divizi, pokud jich je dost; zbytek podle důležitosti
    let q = ids.length >= posts.length ? quotas(ids.length - posts.length, wt).map((x) => x + 1) : quotas(ids.length, wt);
    if (ids.length > posts.length) {   // zásobování: post unese jen tolik divizí, kolik uživí (M67)
      let use = 0;
      for (const id of ids) use += statsOf(ctx.mil, ctx.divs[id]).sup;
      use = Math.max(0.1, use / ids.length);
      const reach = supplyOf(ctx, o);
      q = capQuotas(q, posts.map((p) => Math.max(1, Math.floor((reach[p] * C.SUP_CAPACITY) / use + 0.25))), wt);
    }
    const want = new Map(posts.map((p, i) => [p, q[i]]));
    const have = new Map();
    const free = [];
    for (const id of ids) {
      const d = ctx.divs[id];
      if (d.b !== 0) continue;                                             // v boji
      const last = d.path.length ? d.path[d.path.length - 1] : d.p;
      if (targetSet.has(last)) continue;                                   // útočí na cíl plánu
      if (want.has(last) && (have.get(last) || 0) < want.get(last)) have.set(last, (have.get(last) || 0) + 1);
      else free.push(id);
    }
    for (const id of free) {
      const d = ctx.divs[id];
      let best = 0, bd = Infinity;
      for (const p of posts) {
        if ((have.get(p) || 0) >= want.get(p)) continue;
        const dd = g.distKm(d.p, p);
        if (dd < bd) { bd = dd; best = p; }
      }
      if (!best) break;
      have.set(best, (have.get(best) || 0) + 1);
      if (best === d.p) { if (d.path.length) { const e = editDiv(ctx, id); e.path = []; e.prog = 0; } continue; }
      const path = pathOf(o, d.p, best);
      if (path) sendTo(ctx, id, path);
    }
  }

  // ---- útok na cíle ----
  if (targets.length) {
    const cap = C.PLAN_CAP + modsOf(ctx, { army: armyId }).planCap;
    if (army.pl >= MODE_PLAN[plan.mode] * cap - 1e-9) {
      for (const t of targets) {
        for (const id of ids) {
          const d = ctx.divs[id];
          if (d.b !== 0 || d.path.length || d.hold > 0 || d.rt > 0) continue;
          const k = adjKind(d.p, t);
          if (k < 0 || k === 2) continue;
          if (d.org < statsOf(ctx.mil, d).org * MODE_ORG[plan.mode]) continue;
          sendTo(ctx, id, [t]);
        }
      }
    }
  }
}

// ---- obranná AI (zatím jediná) ----
/** Provincie, kde se země `o` dotýká nepřítele, plus jejich vlastní sousedé (pás). */
function frontBelt(ctx, o, enemies) {
  const w = getWorld(), adj = adjacency(w);
  const edge = [];
  for (let p = 1; p <= w.L; p++) {
    if (ctx.ctrl[p] !== o) continue;
    if (adj[p].some((e) => e.kind !== 2 && enemies.has(ctx.ctrl[e.to]))) edge.push(p);
  }
  const belt = new Set(edge);
  for (const p of edge) for (const e of adj[p]) if (e.kind !== 2 && ctx.ctrl[e.to] === o) belt.add(e.to);
  return [...belt].sort((a, b) => a - b);
}

/** Plány „Hájit oblast“ pro armády dané země (jen armády bez vlastního plánu nebo s plánem AI). */
export function aiPlanCountry(ctx, o, byArmy) {
  const w = getWorld(), g = geo(w);
  const enemies = new Set(enemiesOf(ctx.mil, o));
  if (!enemies.size) return;
  const mine = [];
  for (let id = 1; id < ctx.armies.length; id++) {
    const a = ctx.armies[id];
    if (a && a.o === o && byArmy.has(id) && (!a.plan || a.plan.auto)) mine.push(id);
  }
  if (!mine.length) return;
  const belt = frontBelt(ctx, o, enemies);
  const centers = mine.map((id) => {
    const ds = byArmy.get(id).filter((x) => ctx.divs[x]);
    let x = 0, y = 0;
    for (const d of ds) { x += g.cx[ctx.divs[d].p]; y += g.cy[ctx.divs[d].p]; }
    return { x: x / Math.max(1, ds.length), y: y / Math.max(1, ds.length), ds };
  });
  const area = mine.map(() => []);
  for (const p of belt) {
    let best = 0, bd = Infinity;
    centers.forEach((c, i) => { const dd = Math.hypot(g.cx[p] - c.x, g.cy[p] - c.y); if (dd < bd) { bd = dd; best = i; } });
    area[best].push(p);
  }
  mine.forEach((id, i) => {
    let list = area[i];
    if (!list.length) list = [...new Set(centers[i].ds.map((d) => ctx.divs[d].p))].sort((a, b) => a - b);   // bez styku s nepřítelem zůstane, kde je
    const cur = ctx.armies[id].plan;
    if (cur && cur.k === 'area' && cur.area.length === list.length && cur.area.every((p, j) => p === list[j])) return;
    editArmy(ctx, id).plan = { k: 'area', area: list.slice(0, AREA_MAX), auto: true };
  });
}

/** Denní krok plánovače: AI plány (týdně a pro armády bez plánu), potom plánování všech armád s plánem. */
export function plansStep(ctx) {
  const w = getWorld();
  const byArmy = divisionsByArmy(ctx);
  const player = ctx.state.player ? w.ownerIdx[ctx.state.player] : 0;
  const weekly = ctx.tick % (24 * 7) === 0;
  for (let o = 1; o < w.owners.length; o++) {
    if (o === player || !hasWar(ctx.mil, o)) continue;
    let need = weekly;
    if (!need) for (let id = 1; id < ctx.armies.length && !need; id++) { const a = ctx.armies[id]; if (a && a.o === o && !a.plan && byArmy.has(id)) need = true; }
    if (need) aiPlanCountry(ctx, o, byArmy);
  }
  const pathOf = makePathCache(ctx);
  for (let id = 1; id < ctx.armies.length; id++) if (ctx.armies[id] && ctx.armies[id].plan) planArmy(ctx, id, byArmy, pathOf);
}

/** Naplánuje jednu armádu hned (po zadání plánu). */
export function planNow(ctx, armyId) {
  planArmy(ctx, armyId, divisionsByArmy(ctx), makePathCache(ctx));
}

/** Okamžitě přidělí plány AI zemím ve válce (po vyhlášení války). */
export function aiNow(ctx, owners) {
  const byArmy = divisionsByArmy(ctx);
  const w = getWorld();
  const player = ctx.state.player ? w.ownerIdx[ctx.state.player] : 0;
  const pathOf = makePathCache(ctx);
  for (const o of owners) {
    if (o === player) continue;
    aiPlanCountry(ctx, o, byArmy);
    for (let id = 1; id < ctx.armies.length; id++) if (ctx.armies[id] && ctx.armies[id].o === o && ctx.armies[id].plan) planArmy(ctx, id, byArmy, pathOf);
  }
}
