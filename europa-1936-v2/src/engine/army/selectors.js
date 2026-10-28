// Dotazy na stav armády: čisté funkce nad `state`. Výsledky se cachují podle objektů stavu, aby si je rozhraní mohlo brát přes useSyncExternalStore
// (stejný vstup → tentýž výstup). Země lze zadat indexem nebo tagem.
import { getWorld } from '../world.js';
import { C, xpLevel, XP_NAMES } from './constants.js';
import { deriveStats, divisionName as nameOf } from './stats.js';
import { atWar as warBetween, hasWar as warOf, enemiesOf as foesOf } from './war.js';
import { supplyFlow } from './supply.js';
import { infraOf } from '../industry/infra.js';
import { genLevel, xpForLevel } from './leaders.js';
import { adjacency } from './geo.js';

const idxOf = (o) => (typeof o === 'string' ? getWorld().ownerIdx[o] || 0 : o);

// ---- války ----
export const atWar = (state, a, b) => warBetween(state.mil, idxOf(a), idxOf(b));
export const isAtWar = (state, o) => warOf(state.mil, idxOf(o));

const foesCache = new WeakMap();
/** Indexy zemí ve válce s `o` (cachované podle pole válek; stejné pole pro stejné `o`). */
export function enemiesOf(state, o) {
  const wars = state.mil.wars;
  let m = foesCache.get(wars);
  if (!m) { m = new Map(); foesCache.set(wars, m); }
  const i = idxOf(o);
  if (!m.has(i)) m.set(i, foesOf(state.mil, i));
  return m.get(i);
}

// ---- jednotky na mapě ----
const byProvCache = new WeakMap();
/** Mapa provincie → pole id divizí (cachovaná podle pole divizí). */
export function divisionsByProvince(state) {
  const divs = state.mil.divs;
  let m = byProvCache.get(divs);
  if (m) return m;
  m = new Map();
  for (let id = 1; id < divs.length; id++) {
    const d = divs[id];
    if (!d) continue;
    const a = m.get(d.p);
    if (a) a.push(id); else m.set(d.p, [id]);
  }
  byProvCache.set(divs, m);
  return m;
}

const countCache = new WeakMap();
/** Počet divizí země (cachované podle pole divizí; stejné pole → stejná odpověď bez procházení). */
export function divisionCount(state, o) {
  const divs = state.mil.divs;
  let m = countCache.get(divs);
  if (!m) {
    m = new Map();
    for (let id = 1; id < divs.length; id++) { const d = divs[id]; if (d) m.set(d.o, (m.get(d.o) || 0) + 1); }
    countCache.set(divs, m);
  }
  return m.get(idxOf(o)) || 0;
}

// ---- strom armád ----
const treeCache = new WeakMap();   // mil.tpl (stabilní napříč hodinami) → Map(o → { ver, tree })
/**
 * Strom velení země: { groups: [{ id, armies: [{ id, divs: [id…] }] }], loose: { armies: [{ id, divs }], divs: [id…] } }.
 * Cachuje se podle `mil.ver` (mění se jen při změně struktury).
 */
export function armyTree(state, o) {
  const mil = state.mil, i = idxOf(o);
  let per = treeCache.get(mil.tpl);
  if (!per) { per = new Map(); treeCache.set(mil.tpl, per); }
  const hit = per.get(i);
  if (hit && hit.ver === mil.ver) return hit.tree;
  const divsOf = new Map();
  const loose = { armies: [], divs: [] };
  for (let id = 1; id < mil.divs.length; id++) {
    const d = mil.divs[id];
    if (!d || d.o !== i) continue;
    if (!d.army) { loose.divs.push(id); continue; }
    const a = divsOf.get(d.army);
    if (a) a.push(id); else divsOf.set(d.army, [id]);
  }
  const groups = [];
  const groupIdx = new Map();
  for (let id = 1; id < mil.groups.length; id++) {
    const g = mil.groups[id];
    if (g && g.o === i) { groupIdx.set(id, groups.length); groups.push({ id, armies: [] }); }
  }
  for (let id = 1; id < mil.armies.length; id++) {
    const a = mil.armies[id];
    if (!a || a.o !== i) continue;
    const node = { id, divs: divsOf.get(id) || [] };
    if (a.grp && groupIdx.has(a.grp)) groups[groupIdx.get(a.grp)].armies.push(node); else loose.armies.push(node);
  }
  const tree = { groups, loose };
  per.set(i, { ver: mil.ver, tree });
  return tree;
}

// ---- pohled na divizi ----
const viewCache = new WeakMap();
/** Kdo je divize: stav pro rozhraní. */
export function divisionStatus(d) {
  if (d.b) return 'fighting';
  if (d.rt > 0) return 'retreating';
  if (d.path.length) return 'moving';
  if (d.sg <= 0 && d.sup < 1) return 'lack';
  return 'idle';
}

/** Pohled na divizi (odvozené statistiky, procenta, stav). Cachuje se podle objektu divize a šablony. */
export function divisionView(state, id) {
  const mil = state.mil;
  const d = id > 0 && id < mil.divs.length ? mil.divs[id] : null;
  if (!d) return null;
  const tpl = mil.tpl[d.tpl];
  if (!tpl) return null;
  const hit = viewCache.get(d);
  if (hit && hit.tpl === tpl) return hit.view;
  const st = deriveStats(tpl);
  const lvl = xpLevel(d.xp);
  const view = {
    id, o: d.o, p: d.p, name: nameOf(tpl, d.nr), tplId: d.tpl, tplName: tpl.nm, army: d.army, cls: st.cls,
    stats: st,
    hp: d.hp, hpMax: st.hp, hpPct: st.hp ? d.hp / st.hp : 0,
    org: d.org, orgMax: st.org, orgPct: st.org ? d.org / st.org : 0,
    xp: d.xp, xpLevel: lvl, xpName: XP_NAMES[lvl],
    dig: d.dig, supply: d.sup, graceHours: d.sg,
    battle: d.b, retreat: d.rt, hold: d.hold, path: d.path,
    status: divisionStatus(d),
  };
  viewCache.set(d, { tpl, view });
  return view;
}

/** Pohled na šablonu: odvozené statistiky + cena (lidská síla, výzbroj, doba výcviku ve dnech). */
const tplViewCache = new WeakMap();
export function templateView(state, tplId) {
  const tpl = tplId > 0 && tplId < state.mil.tpl.length ? state.mil.tpl[tplId] : null;
  if (!tpl) return null;
  let v = tplViewCache.get(tpl);
  if (!v) {
    const st = deriveStats(tpl);
    v = { id: tplId, tpl, stats: st, men: st.men, need: st.need, days: st.days };
    tplViewCache.set(tpl, v);
  }
  return v;
}

// ---- velitelé ----
/** Kde velitel slouží: { kind: 'army'|'group', id } nebo null. */
export function generalPost(state, genId) {
  const mil = state.mil;
  for (let i = 1; i < mil.armies.length; i++) if (mil.armies[i] && mil.armies[i].cmd === genId) return { kind: 'army', id: i };
  for (let i = 1; i < mil.groups.length; i++) if (mil.groups[i] && mil.groups[i].cmd === genId) return { kind: 'group', id: i };
  return null;
}

const genCache = new WeakMap();
/** Velitelé země: [{ id, gen, level, xpNext, post }] (cachováno podle pole velitelů, armád a skupin). */
export function generalsOf(state, o) {
  const mil = state.mil, i = idxOf(o);
  let per = genCache.get(mil.gens);
  if (!per) { per = new Map(); genCache.set(mil.gens, per); }
  const hit = per.get(i);
  if (hit && hit.armies === mil.armies && hit.groups === mil.groups) return hit.list;
  const list = [];
  for (let id = 1; id < mil.gens.length; id++) {
    const g = mil.gens[id];
    if (!g || g.o !== i) continue;
    const lv = genLevel(g);
    list.push({ id, gen: g, level: lv, xpNext: xpForLevel(lv), post: generalPost(state, id) });
  }
  per.set(i, { armies: mil.armies, groups: mil.groups, list });
  return list;
}

// ---- zásobování ----
/** Tok zásobování po provinciích země (Float32Array; zásoby za hodinu = tok · C.SUP_CAPACITY). Cachuje se podle obsazení provincií. */
export const supplyReach = (state, o) => supplyFlow(state.ctrl, idxOf(o), infraOf(state));

// ---- fronta ----
const frontCache = new WeakMap();
/** Dvojice sousedních provincií, jejichž držitelé spolu válčí: Set klíčů `min * 4096 + max`. Cachuje se podle `ctrl` a `wars`. */
export function frontEdges(state) {
  const hit = frontCache.get(state.ctrl);
  if (hit && hit.wars === state.mil.wars) return hit.set;
  const w = getWorld(), adj = adjacency(w);
  const set = new Set();
  if (state.mil.wars.length) {
    for (let p = 1; p <= w.L; p++) {
      const c = state.ctrl[p];
      for (const e of adj[p]) {
        if (e.kind === 2 || e.to < p) continue;
        const d = state.ctrl[e.to];
        if (c !== d && warBetween(state.mil, c, d)) set.add(p * 4096 + e.to);
      }
    }
  }
  frontCache.set(state.ctrl, { wars: state.mil.wars, set });
  return set;
}
export const frontKey = (a, b) => (a < b ? a * 4096 + b : b * 4096 + a);

/**
 * Návrh plánu pro armádu: `line` = provincie země do `depth` kroků od divizí armády, které sousedí s nepřítelem (od nejbližších),
 * `to` = jejich nepřátelští sousedé. Armáda bez divizí nebo bez nepřítele dostane prázdné seznamy. Čistá funkce.
 */
export function suggestFront(state, armyId, depth = 8, limit = 80) {
  const mil = state.mil;
  const army = armyId > 0 && armyId < mil.armies.length ? mil.armies[armyId] : null;
  if (!army) return { line: [], to: [] };
  const o = army.o, w = getWorld(), adj = adjacency(w);
  const foes = new Set(foesOf(mil, o));
  if (!foes.size) return { line: [], to: [] };
  const dist = new Map();
  let frontier = [];
  for (let id = 1; id < mil.divs.length; id++) {
    const d = mil.divs[id];
    if (d && d.army === armyId && !dist.has(d.p)) { dist.set(d.p, 0); frontier.push(d.p); }
  }
  for (let k = 1; k <= depth && frontier.length; k++) {
    const next = [];
    for (const p of frontier) {
      for (const e of adj[p]) {
        if (e.kind === 2 || dist.has(e.to) || state.ctrl[e.to] !== o) continue;
        dist.set(e.to, k);
        next.push(e.to);
      }
    }
    frontier = next;
  }
  const line = [];
  for (const [p, dd] of dist) {
    if (state.ctrl[p] === o && adj[p].some((e) => e.kind !== 2 && foes.has(state.ctrl[e.to]))) line.push([p, dd]);
  }
  line.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const picked = line.slice(0, limit).map((x) => x[0]);
  const to = [];
  for (const p of picked) for (const e of adj[p]) if (e.kind !== 2 && foes.has(state.ctrl[e.to]) && !to.includes(e.to)) to.push(e.to);
  return { line: picked, to };
}

// ---- sklady a lidská síla ----
export const manpowerOf = (state, o) => state.mil.man[idxOf(o)] || 0;
export const stockOf = (state, o) => state.mil.stock[idxOf(o)] || null;
export const queueOf = (state, o) => state.mil.queue.filter((q) => q.o === idxOf(o));
