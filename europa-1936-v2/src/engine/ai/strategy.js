// AI: strategický plánovač (M66). Dělí frontu na divadla války, přiděluje jim armády podle hrozby a vzdálenosti a podle poměru sil zadává útok nebo obranu.
// Po válce armády vrací do domácích oblastí (hlavní město, uzly, přístavy, okupovaná území). Používá stejné příkazy jako hráč (`setPlan`, `clearPlan`).
import { getWorld } from '../world.js';
import { geo, adjacency } from '../army/geo.js';
import { enemiesOf } from '../army/war.js';
import { setPlan } from '../army/commands.js';
import { supplyFlow, flowDrop } from '../army/supply.js';
import { seaPorts } from '../nav/core.js';
import { friendsOf } from '../dip/accessCore.js';
import { C } from '../army/constants.js';
import { needOf } from '../occ/day.js';
import { campOf } from '../dip/core.js';
import { aggrOf } from '../../data/ai/personality.js';
import { landZones } from '../army/zones.js';
import { stagingArmies, startInvasion } from './invasion.js';
import { ruleMult } from '../rules.js';
import { fortOf } from '../industry/selectors.js';
import { TERRAIN_RULES } from '../../data/army/terrain.js';
import { statsOf } from '../army/unit.js';
import { docMods } from '../doc/core.js';
import { spiritArmyMods } from '../nat/spirits.js';
import { AI } from './constants.js';

/** Armády země s divizemi: [{ id, n, x, y, ds }] (x, y = těžiště v pixelech světa). */
function armiesOf(state, o) {
  const g = geo(getWorld());
  const by = new Map(), staging = stagingArmies(state, o);   // M71: sbor shromážděný k invazi strategie neřídí
  for (let id = 1; id < state.mil.divs.length; id++) {
    const d = state.mil.divs[id];
    if (!d || d.o !== o || !d.army || staging.has(d.army)) continue;
    let a = by.get(d.army);
    if (!a) { a = { id: d.army, n: 0, x: 0, y: 0, ds: [] }; by.set(d.army, a); }
    a.n++; a.x += g.cx[d.p]; a.y += g.cy[d.p]; a.ds.push(id);
  }
  const out = [];
  for (const a of by.values()) { a.x /= a.n; a.y /= a.n; out.push(a); }
  return out.sort((p, q) => p.id - q.id);
}

const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const samePlan = (a, b) => !!a && a.k === b.k && (b.k === 'area' ? sameList(a.area, b.area) : a.mode === b.mode && !a.loc === !b.loc && sameList(a.line, b.line) && sameList(a.to, b.to));

/** Nastaví plán, pokud se liší od dosavadního. */
function plan(state, armyId, p) {
  const cur = state.mil.armies[armyId] && state.mil.armies[armyId].plan;
  return samePlan(cur, p) ? state : setPlan(state, armyId, p);
}

/**
 * Divadla války země `o`: souvislé úseky styku s nepřítelem. Vrací [{ posts, targets, x, y, enemy, vp, prio }] seřazené podle důležitosti.
 * `posts` = vlastní provincie sousedící s nepřítelem, `targets` = jejich nepřátelští sousedé, `enemy` = nepřátelské divize poblíž, `vp` = body cílů.
 */
export function theatersOf(state, o, foes) {
  const w = getWorld(), g = geo(w), adj = adjacency(w);
  const ctrl = state.ctrl;
  const contact = [];
  const isContact = new Uint8Array(w.L + 1);
  const sub = state.dip.sub;   // M88: území vlastních loutek je pro pána součástí fronty (brání je a útočí z něj)
  const mine = (c) => c === o || (c > 0 && sub[c] === o);
  for (let p = 1; p <= w.L; p++) {
    if (!mine(ctrl[p])) continue;
    for (const e of adj[p]) if (e.kind !== 2 && foes.has(ctrl[e.to])) { isContact[p] = 1; contact.push(p); break; }
  }
  if (!contact.length) return [];
  // sjednocení styčných provincií v okruhu dvou kroků po vlastním území
  const parent = new Map(contact.map((p) => [p, p]));
  const find = (p) => { while (parent.get(p) !== p) { parent.set(p, parent.get(parent.get(p))); p = parent.get(p); } return p; };
  for (const p of contact) {
    let ring = [p];
    const seen = new Set([p]);
    for (let d = 0; d < 2; d++) {
      const next = [];
      for (const q of ring) for (const e of adj[q]) {
        if (e.kind === 2 || seen.has(e.to) || !mine(ctrl[e.to])) continue;
        seen.add(e.to); next.push(e.to);
        if (isContact[e.to]) { const a = find(p), b = find(e.to); if (a !== b) parent.set(a, b); }
      }
      ring = next;
    }
  }
  const groups = new Map();
  for (const p of contact) { const r = find(p); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(p); }
  const theaters = [];
  for (const posts of groups.values()) {
    const targets = new Set();
    for (const p of posts) for (const e of adj[p]) if (e.kind !== 2 && foes.has(ctrl[e.to])) targets.add(e.to);
    let x = 0, y = 0, vp = 0;
    for (const p of posts) { x += g.cx[p]; y += g.cy[p]; }
    for (const t of targets) vp += 1 + w.vp[t];
    theaters.push({ posts: posts.sort((a, b) => a - b), targets: [...targets].sort((a, b) => a - b), x: x / posts.length, y: y / posts.length, enemy: 0, by: new Map(), defenders: new Set([...targets].map((t) => ctrl[t])), vp, prio: 0, label: theaters.length });
  }
  // nepřátelské divize poblíž cílů (do tří kroků od cíle, každá provincie patří nejbližšímu divadlu)
  const label = new Int32Array(w.L + 1).fill(-1);
  let ring = [];
  theaters.forEach((t, i) => { for (const p of t.targets) { if (label[p] < 0) { label[p] = i; ring.push(p); } } });
  for (let d = 0; d < 3; d++) {
    const next = [];
    for (const p of ring) for (const e of adj[p]) {
      if (e.kind === 2 || label[e.to] >= 0 || !foes.has(ctrl[e.to])) continue;
      label[e.to] = label[p]; next.push(e.to);
    }
    ring = next;
  }
  for (let id = 1; id < state.mil.divs.length; id++) {
    const d = state.mil.divs[id];
    if (!d || !foes.has(d.o) || label[d.p] < 0) continue;
    const t = theaters[label[d.p]];
    t.enemy++;
    t.by.set(d.o, (t.by.get(d.o) || 0) + 1);
  }
  // blízkost hlavního města: hrozba pro hlavní město je přednější
  const cap = w.owners[o].cap;
  for (const t of theaters) {
    const dk = Math.hypot(t.x - g.cx[cap], t.y - g.cy[cap]) * g.kmPerPx;
    t.prio = t.enemy * 1.0 + t.vp * AI.THEATER_VP + (dk < AI.CAPITAL_KM ? AI.CAPITAL_BONUS : 0);
  }
  return theaters.sort((a, b) => b.prio - a.prio || a.label - b.label);
}

/**
 * Zásobování očima AI (M66): kde divize dostanou zásoby a které cíle po dobytí udrží zásobování.
 * `post(p)` = vlastní provincie unese divizi, `target(tp)` = cíl po dobytí (sousední vlastní provincie po úbytku toku, nebo uzel s místními zásobami).
 */
export function supplyView(state, o) {
  const w = getWorld(), g = geo(w), adj = adjacency(w);
  const friends = friendsOf(state.dip, o), fset = new Set(friends);
  const reach = supplyFlow(state.ctrl, o, undefined, friends, seaPorts(state, o));
  return {
    reach,
    post: (p) => reach[p] >= AI.SUP_POST_MIN,
    target: (tp) => {
      let best = g.hub[tp] ? C.SUP_LOCAL : 0;
      for (const e of adj[tp]) if (e.kind !== 2 && (state.ctrl[e.to] === o || fset.has(state.ctrl[e.to]))) best = Math.max(best, reach[e.to] - flowDrop(w, g, g.infra, e.to, tp, e.kind));
      return best >= AI.SUP_TARGET_MIN;
    },
  };
}

/** Hladoví armáda? (aspoň polovina divizí bez zásob v batohu a s nedostatkem) */
function starving(state, a) {
  let n = 0;
  for (const id of a.ds) { const d = state.mil.divs[id]; if (d.sg === 0 && d.sup < 0.5) n++; }
  return n * 2 >= a.n;
}

/** Nejbližší zásobované vlastní provincie od divizí armády (šíření po vlastním území), nejvýš `count`. */
function suppliedNear(state, o, a, view, count) {
  const adj = adjacency(getWorld());
  const seen = new Set(), out = [];
  let ring = [];
  for (const id of a.ds) { const p = state.mil.divs[id].p; if (!seen.has(p)) { seen.add(p); ring.push(p); } }
  for (let d = 0; d < 12 && ring.length && out.length < count; d++) {
    const next = [];
    for (const p of ring.sort((x, y) => x - y)) {
      if (state.ctrl[p] === o && view.reach[p] >= AI.SUP_TARGET_MIN && out.length < count) out.push(p);
      for (const e of adj[p]) if (e.kind !== 2 && !seen.has(e.to) && state.ctrl[e.to] === o) { seen.add(e.to); next.push(e.to); }
    }
    ring = next;
  }
  return out;
}

/**
 * Týl divadla (M88): zásobované vlastní provincie dva až čtyři kroky za posty `posts` (ne posty samy ani jejich sousedé), nejbližší armádě `a`, nejvýš `count`.
 * Sem se staví druhý sled, který se na frontu nevejde.
 */
export function rearOf(state, o, posts, a, view, count) {
  const w = getWorld(), g = geo(w), adj = adjacency(w);
  const seen = new Set(posts), out = [];
  let ring = posts.slice();
  for (let step = 1; step <= 4 && ring.length; step++) {
    const next = [];
    for (const p of ring) for (const e of adj[p]) {
      if (e.kind === 2 || seen.has(e.to) || state.ctrl[e.to] !== o) continue;
      seen.add(e.to); next.push(e.to);
      if (step >= 2 && view.reach[e.to] >= AI.SUP_TARGET_MIN) out.push(e.to);
    }
    ring = next;
  }
  const dist = (p) => Math.hypot(g.cx[p] - a.x, g.cy[p] - a.y);
  return out.sort((p, q) => dist(p) - dist(q) || p - q).slice(0, count).sort((p, q) => p - q);
}

/** Je země (nebo někdo z jejího bloku) útočníkem proti některému z nepřátel? (válka ospravedlněná a vyhlášená přes `startWar` zapíše cíl do `dip.goal`) */
export function isAggressor(state, o, foes) {
  const camp = new Set(campOf(state, o));
  for (const k in state.dip.goal) {
    const [a, b] = k.split('>').map(Number);
    if (camp.has(a) && foes.has(b)) return true;
  }
  return false;
}

/** Domácí posty v míru: hlavní město, uzly, přístavy, vítězné body a okupovaná území (jen provincie, kde divize dostane zásoby); armády si je rozdělí. */
function homePosts(state, o, count, view) {
  const w = getWorld(), g = geo(w), adj = adjacency(w);
  const cap = w.owners[o].cap;
  const scored = [];
  for (let p = 1; p <= w.L; p++) {
    if (state.ctrl[p] !== o || view.reach[p] < AI.SUP_TARGET_MIN) continue;
    const s = w.provState[p];
    let sc = w.vp[p] * 0.6 + (g.hub[p] ? 2 : 0) + (w.portLevel[p] ? 1 : 0) + (p === cap ? 6 : 0);
    if (state.stateOwner[s] !== o) sc += 1 + Math.min(3, needOf(s) * 0.5);   // okupované území potřebuje garnizonu
    if (adj[p].some((e) => e.kind !== 2 && state.ctrl[e.to] !== o && state.ctrl[e.to] !== 0 && state.stateOwner[w.provState[e.to]] !== o)) sc += 0.7;   // hranice s cizinou
    if (sc > 0.9) scored.push([p, sc]);
  }
  scored.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  return scored.slice(0, count).map((x) => x[0]);
}

/** Mírové rozmístění: každá armáda dostane posty, které jsou k ní nejblíž. */
export function aiPeaceDeploy(state, o, armies) {
  if (!armies.length) return state;
  const g = geo(getWorld());
  const posts = homePosts(state, o, Math.max(AI.PEACE_POSTS_MIN, armies.length * AI.PEACE_POSTS), supplyView(state, o));
  if (!posts.length) return state;
  const area = armies.map(() => []);
  // post, který už je v plánu právě jedné armády, jí zůstane (stabilita, žádné hromadění více armád v jedné provincii); ostatní podle vzdálenosti
  const holders = new Map();
  armies.forEach((a, i) => {
    const cur = state.mil.armies[a.id].plan;
    if (cur && cur.k === 'area') for (const p of cur.area) holders.set(p, holders.has(p) ? -1 : i);
  });
  const rest = [];
  for (const p of posts) { const h = holders.get(p); if (h >= 0) area[h].push(p); else rest.push(p); }
  for (const p of rest) {
    let best = 0, bd = Infinity;
    armies.forEach((a, i) => { const dd = Math.hypot(g.cx[p] - a.x, g.cy[p] - a.y) + area[i].length * AI.PEACE_SPREAD; if (dd < bd) { bd = dd; best = i; } });
    area[best].push(p);
  }
  armies.forEach((a, i) => {
    if (area[i].length) state = plan(state, a.id, { k: 'area', area: area[i].sort((p, q) => p - q) });
  });
  return state;
}

/**
 * Přidělí armády divadlům (čistá funkce). Nejdřív obrana (každé divadlo dostane tolik divizí, aby se držela linie), potom útočné síly jen tam, kde na převahu
 * `ratioNeed` zbylé síly stačí (jinak by první divadlo vysálo armády, které jinde chybí); zbytek jde k nejbližšímu divadlu.
 * `theaters` jsou seřazená podle priority, `armies` = [{ id, n, x, y }], `sticky` armáda → divadlo, kde už stojí, `engaged` divadla, kde se už útočí.
 * Vrací `{ got, reserve }`: id armád po divadlech a armády, které nikdo nepotřebuje (dál než `AI.RESERVE_KM` od nejbližšího divadla).
 */
export function allocateArmies(theaters, armies, { dist, sticky = new Map(), engaged = new Set(), ratioNeed }) {
  const free = new Set(armies.map((a) => a.id));
  const byId = new Map(armies.map((a) => [a.id, a]));
  const got = theaters.map(() => []);
  const have = (i) => got[i].reduce((s, id) => s + byId.get(id).n, 0);
  const pick = (i) => {
    let best = 0, bd = Infinity;
    for (const id of free) {
      const d = dist(byId.get(id), theaters[i]) - (sticky.get(id) === i ? AI.STICKY_KM : 0);
      if (d >= AI.UNREACH / 2) continue;   // M71: armáda za mořem (jiná zóna dosažitelnosti) divadlo nehájí
      if (d < bd || (d === bd && id < best)) { bd = d; best = id; }
    }
    if (best) { free.delete(best); got[i].push(best); }
    return best;
  };
  theaters.forEach((t, i) => {   // obrana: aspoň tolik divizí, aby se držela linie a nepřítel nepřevažoval
    const need = Math.min(Math.ceil(t.posts.length * AI.DEF_POSTS), Math.max(AI.DEF_MIN, Math.ceil(t.eff * AI.DEF_RATIO)));
    while (have(i) < need && free.size) if (!pick(i)) break;
  });
  let spare = 0;
  for (const id of free) spare += byId.get(id).n;
  theaters.forEach((t, i) => {   // posily k útoku (víc divizí, než unese šířka fronty, je zbytečných); práh může mít každé divadlo vlastní (`t.need`, M88)
    if (!t.viable.length || (t.eff > 0 && (have(i) + spare) / t.eff < (t.need ?? ratioNeed) * (engaged.has(i) ? AI.STAY_MULT : 1))) return;
    const need = Math.min(Math.ceil(t.eff * AI.OFFENSE_FORCE) + AI.OFFENSE_BASE, Math.max(AI.ARMY_SIZE, Math.ceil(t.posts.length * AI.OFFENSE_PER_POST)));
    while (have(i) < need && free.size) { const id = pick(i); if (!id) break; spare -= byId.get(id).n; }
  });
  const reserve = [];
  for (const id of [...free].sort((p, q) => p - q)) {  // zbylé armády: blízké divadlo posílí do hloubky, vzdálené zůstanou doma
    let bi = 0, bd = Infinity;
    theaters.forEach((t, i) => { const d = dist(byId.get(id), t); if (d < bd) { bd = d; bi = i; } });
    if (bd <= AI.RESERVE_KM) got[bi].push(id); else reserve.push(id);
    free.delete(id);
  }
  return { got, reserve };
}

/**
 * Rozhodnutí strategie země `o` ve válce (bez zápisu do stavu): divadla s účinnou silou nepřítele, přidělené armády, poměr sil a rozhodnutí o útoku.
 * Vrací null, když země nemá armády, válku nebo styk s nepřítelem. Čistá funkce.
 */
export function decideStrategy(state, o) {
  const mil = state.mil, w = getWorld(), g = geo(w);
  const armies = armiesOf(state, o);
  if (!armies.length) return null;
  const foesList = enemiesOf(mil, o);
  if (!foesList.length) return null;
  const foes = new Set(foesList);
  const theaters = theatersOf(state, o, foes);
  if (!theaters.length) return null;
  const view = supplyView(state, o);
  for (const t of theaters) t.viable = t.targets.filter(view.target);   // cíle, které po dobytí udrží zásobování
  // účinná síla nepřítele: divize poblíž cílů + podíl záloh těch zemí, které cíle divadla brání (spojenec cizí území nepřejde, jeho divize se tu neobjeví)
  const total = new Map(), nearBy = new Map(), shareOf = new Map();
  for (let id = 1; id < mil.divs.length; id++) { const d = mil.divs[id]; if (d && foes.has(d.o)) total.set(d.o, (total.get(d.o) || 0) + 1); }
  for (const t of theaters) {
    for (const [c, n] of t.by) nearBy.set(c, (nearBy.get(c) || 0) + n);
    for (const c of t.defenders) shareOf.set(c, (shareOf.get(c) || 0) + t.posts.length);
  }
  for (const t of theaters) {
    let res = 0;
    for (const c of t.defenders) res += Math.max(0, (total.get(c) || 0) - (nearBy.get(c) || 0)) * (t.posts.length / shareOf.get(c));
    t.eff = t.enemy + AI.RESERVE_SHARE * res;
    // M88: pevnostní pásmo násobí sílu obrany (průměrná úroveň pevností v cílech divadla) – AI na ně čelně neútočí, dokud nemá drtivou převahu
    let forts = 0;
    for (const tp of t.targets) forts += fortOf(state, tp);
    t.fort = t.targets.length ? forts / t.targets.length : 0;
    t.eff *= 1 + AI.FORT_EFF * t.fort;
    // M88: kvalita armád (doktríny a národní duchové) – počet divizí není všechno
    let main = 0, mn = -1;
    for (const c of t.defenders) { const n = t.by.get(c) || 0; if (n > mn) { mn = n; main = c; } }
    if (main) t.eff *= armyQuality(state, main) / armyQuality(state, o);
  }

  // ---- přidělení armád divadlům ----
  const level = state.ai?.level ?? 2;
  const dist = (a, t) => Math.hypot(a.x - t.x, a.y - t.y) * g.kmPerPx;
  const sticky = new Map();   // armáda → divadlo, na jehož postech už stojí (stabilita přidělení)
  for (const a of armies) {
    const cur = mil.armies[a.id].plan;
    const set = new Set(cur ? (cur.k === 'area' ? cur.area : cur.line) : []);
    let bi = -1, bn = 0;
    theaters.forEach((t, i) => { let n = 0; for (const p of t.posts) if (set.has(p)) n++; if (n > bn) { bn = n; bi = i; } });
    if (bi >= 0 && bn >= 2) sticky.set(a.id, bi);
  }
  const engaged = new Set();   // divadla, kde už některá armáda útočí (hystereze)
  for (const [id, i] of sticky) { const pl = mil.armies[id].plan; if (pl && pl.k === 'front' && pl.to.length > 0 && !pl.loc) engaged.add(i); }   // místní útok (M88) se za zahájenou ofenzivu nepočítá
  const byId = new Map(armies.map((a) => [a.id, a]));
  // M88: útočníkem je země jen v divadlech, kde stojí proti zemi, proti které má její tábor válečný cíl (jinde jen drží frontu – „podivná válka“ na západě během tažení v Polsku)
  const tag = w.owners[o].tag;
  const aggr = theaters.map((t) => isAggressor(state, o, new Set([...t.defenders, ...t.by.keys()])));
  const baseNeed = (AI.ATTACK_RATIO[level] ?? 1.3) / (aggrOf(tag) * ruleMult(state, 'aggr'));   // M78: pravidlo hry „Útočnost AI“
  const need = aggr.map((a) => baseNeed * (a ? 1 : AI.DEFENDER_MULT));
  theaters.forEach((t, i) => { t.need = need[i]; });
  const aggressor = aggr.some(Boolean), ratioNeed = Math.min(...need);
  const zones = landZones(state, o);
  for (const a of armies) a.zone = zones[mil.divs[a.ds[0]].p];
  for (const t of theaters) t.zone = t.posts.length ? zones[t.posts[0]] : 0;
  const { got, reserve } = allocateArmies(theaters, armies, { dist: (a, t) => (a.zone && t.zone && a.zone !== t.zone ? AI.UNREACH : Math.hypot(a.x - t.x, a.y - t.y) * g.kmPerPx), sticky, engaged, ratioNeed });
  const have = (i) => got[i].reduce((sum, id) => sum + byId.get(id).n, 0);

  // ---- útok, nebo obrana ----
  const ratio = theaters.map((t, i) => (t.eff > 0 ? have(i) / t.eff : 99));
  // už zahájený útok se neruší kvůli malému poklesu poměru sil (hystereze): armády, které útočí, pokračují, dokud poměr neklesne pod `STAY_MULT` prahu
  const committed = theaters.map((t, i) => got[i].some((id) => { const pl = mil.armies[id].plan; return pl && pl.k === 'front' && pl.to.length > 0 && !pl.loc; }));
  const attack = theaters.map((t, i) => {
    if (!t.viable.length) return false;
    const nd = committed[i] ? need[i] * AI.STAY_MULT : need[i];
    const opp = committed[i] ? AI.OPPORTUNITY_RATIO * AI.STAY_MULT : AI.OPPORTUNITY_RATIO;
    return ratio[i] >= nd && (aggr[i] || ratio[i] >= opp);
  });
  return { armies, byId, foes, theaters, got, reserve, ratio, attack, aggressor, aggr, ratioNeed, view, sticky };
}

/** Kvalita armády země očima AI (M88): 1 + průměr bonusů útoku a obrany z pozemní doktríny a národních duchů, v mezích 0,7–1,4. */
export function armyQuality(state, o) {
  const doc = state.doc ? docMods(state, o) : null;
  const sp = state.nat && state.nat.own[o] ? spiritArmyMods(state.nat.own[o].sp) : null;
  const sum = (m) => (m ? (m.atk || 0) + (m.def || 0) : 0);
  return Math.min(1.4, Math.max(0.7, 1 + (sum(doc) + sum(sp)) / 2));
}

/** Počty nepřátelských divizí po provinciích (pro místní poměr sil, M88). */
export function foeCounts(state, foes) {
  const m = new Map();
  for (let id = 1; id < state.mil.divs.length; id++) { const d = state.mil.divs[id]; if (d && foes.has(d.o)) m.set(d.p, (m.get(d.p) || 0) + 1); }
  return m;
}

/** Síla obrany cíle `tp` očima AI (M88): divize v provincii, podíl divizí v sousedních nepřátelských provinciích (mohou přijít na pomoc), přirážka za pevnost a terén. */
export function localDefense(state, foes, foeAt, tp) {
  const w = getWorld();
  let back = 0;
  for (const e of adjacency(w)[tp]) if (e.kind !== 2 && foes.has(state.ctrl[e.to])) back += foeAt.get(e.to) || 0;
  return ((foeAt.get(tp) || 0) + AI.LOCAL_BACK * back) * (1 + AI.LOCAL_FORT * fortOf(state, tp)) * (1 - TERRAIN_RULES[w.terrain[tp]].atk);
}

/** Je armáda ve stavu k místnímu útoku? (průměrná síla a zásobování divizí; vyčerpaná nebo hladová armáda jen drží linii) */
export function fitArmy(state, a) {
  let hp = 0, sup = 0;
  for (const id of a.ds) { const d = state.mil.divs[id]; hp += d.hp / statsOf(state.mil, d).hp; sup += d.sg > 0 ? 1 : d.sup; }
  return hp / a.n >= AI.LOCAL_HP && sup / a.n >= AI.LOCAL_SUP;
}

/**
 * Slabá místa fronty (M88): cíle z `cand`, na které armáda o `n` divizích stačí sama s místní převahou `AI.LOCAL_RATIO` (obránce `mult`krát větší).
 * `def(tp)` = síla obrany cíle, `claimed` = cíle, na které už útočí jiná armáda (přednost mají volné), `score` = menší je lepší (blíž k hlavnímu městu).
 * Vrací nejvýš `n / AI.DIVS_PER_TARGET` cílů; prázdné pole = armáda drží linii. Čistá funkce.
 */
export function localTargets(cand, n, def, claimed, mult, score) {
  const list = cand.map((tp) => ({ tp, e: def(tp), c: claimed.has(tp) ? 1 : 0, s: score(tp) })).sort((x, y) => x.c - y.c || x.e - y.e || x.s - y.s || x.tp - y.tp);
  const max = Math.ceil(n / AI.DIVS_PER_TARGET), out = [];
  let left = n;
  for (const x of list) {
    if (out.length >= max) break;
    const need = Math.max(AI.LOCAL_MIN, x.e * AI.LOCAL_RATIO * mult);
    if (need > left) continue;
    out.push(x.tp); left -= need;
  }
  return out;
}

/** Strategie země ve válce: divadla, přidělení armád, plány útoku a obrany. Bez války nebo styku s nepřítelem mírové rozmístění. */
export function aiStrategy(state, o) {
  const d = decideStrategy(state, o);
  if (!d) {
    const armies = armiesOf(state, o);
    if (!armies.length) return state;
    state = startInvasion(state, o, armies);   // M71: válka přes moře – část armád se shromáždí k invazi
    return aiPeaceDeploy(state, o, armiesOf(state, o));
  }
  const w = getWorld(), g = geo(w), adj = adjacency(w);
  const { byId, foes, theaters, got, reserve, ratio, attack, view } = d;
  const foeAt = foeCounts(state, foes), defMemo = new Map(), claimed = new Set();   // M88: místní poměr sil u cílů
  const defOf = (tp) => { let v = defMemo.get(tp); if (v === undefined) { v = localDefense(state, foes, foeAt, tp); defMemo.set(tp, v); } return v; };
  const home = new Set([o, ...friendsOf(state.dip, o)]);   // území vlastního tábora (podle vlastnictví států)
  const echelon = [];   // armády druhého sledu (na frontu se nevešly) – lze z nich sestavit invazní sbor
  if (reserve.length) {   // nepotřebné armády zůstanou doma (nebo se z nich sestaví invazní sbor, M71)
    const free = reserve.map((id) => byId.get(id));
    state = startInvasion(state, o, free);
    const left = new Set(free.map((a) => a.id));
    state = aiPeaceDeploy(state, o, armiesOf(state, o).filter((a) => left.has(a.id)));
  }
  const areaOf = (slice) => {   // obrana: posty a pás zásobovaných vlastních provincií kolem nich
    const belt = new Set(slice);
    for (const p of slice) for (const e of adj[p]) if (e.kind !== 2 && state.ctrl[e.to] === o && view.post(e.to)) belt.add(e.to);
    return [...belt].sort((p, q) => p - q).slice(0, AI.AREA_MAX);
  };
  theaters.forEach((t, i) => {
    const viable = new Set(t.viable);
    // M88: fronta unese jen tolik divizí, kolik uživí zásobování jejích postů; další armády tvoří druhý sled v týlu (armády, které na frontě už stojí, mají přednost)
    const room = Math.max(AI.ARMY_SIZE, AI.FRONT_FILL * t.posts.reduce((sum, p) => sum + Math.floor(view.reach[p] * C.SUP_CAPACITY / AI.DIV_SUP + 0.25), 0));
    const order = got[i].slice().sort((p, q) => (d.sticky.get(q) === i ? 1 : 0) - (d.sticky.get(p) === i ? 1 : 0));
    const fortFree = t.viable.some((tp) => fortOf(state, tp) < AI.FORT_AVOID);
    let placed = 0;
    for (const id of order) {
      const a = byId.get(id);
      if (placed > 0 && placed + a.n > room) {
        const rear = rearOf(state, o, t.posts, a, view, Math.max(AI.SLICE_MIN, a.n));
        if (rear.length) { state = plan(state, id, { k: 'area', area: rear }); echelon.push(id); continue; }
      }
      placed += a.n;
      if (starving(state, a)) {   // hladovějící armáda se stáhne k zásobovaným provinciím a obnoví síly
        const near = suppliedNear(state, o, a, view, Math.max(AI.SLICE_MIN, a.n));
        if (near.length) { state = plan(state, id, { k: 'area', area: near.sort((p, q) => p - q) }); continue; }
      }
      const dist = (p) => Math.hypot(g.cx[p] - a.x, g.cy[p] - a.y);
      const fed = t.posts.filter(view.post);   // posty bez zásob armádu zbytečně vyhladoví – obsadí se, jen když zásobované chybí
      const sorted = (fed.length >= AI.SLICE_MIN ? fed : t.posts).slice().sort((p, q) => dist(p) - dist(q) || p - q);
      const slice = sorted.slice(0, Math.max(AI.SLICE_MIN, a.n * AI.SLICE_PER_DIV)).sort((p, q) => p - q);
      const cand = [];
      for (const p of slice) for (const e of adj[p]) {
        if (e.kind === 2 || !viable.has(e.to) || !foes.has(state.ctrl[e.to]) || cand.includes(e.to)) continue;
        if (fortFree && fortOf(state, e.to) >= AI.FORT_AVOID) continue;   // M88: silné pevnosti se neztékají, dokud je kudy je obejít
        cand.push(e.to);
      }
      const score = (tp) => {
        const cap = w.owners[state.ctrl[tp]].cap;
        return Math.hypot(g.cx[tp] - g.cx[cap], g.cy[tp] - g.cy[cap]) * g.kmPerPx - AI.TARGET_VP * w.vp[tp] + AI.TARGET_FORT * fortOf(state, tp);   // M88: pevnosti se obcházejí
      };
      let to = [], local = false;
      if (cand.length && attack[i]) {
        // celková ofenziva: úder se soustředí na několik cílů (zaměřených k hlavnímu městu nepřítele), ne na celou šířku fronty
        cand.sort((p, q) => score(p) - score(q) || p - q);
        to = cand.slice(0, Math.max(AI.TARGETS_MIN, Math.ceil(a.n / AI.DIVS_PER_TARGET)));
      } else if (cand.length && fitArmy(state, a)) {
        // M88: na ofenzivu síly nestačí – armáda aspoň udeří tam, kde má místní převahu (slabě hájené nebo prázdné provincie); průlom frontu natáhne a obranu zředí.
        // Obránce (země bez válečného cíle proti protivníkovi v divadle) takhle jen osvobozuje území svého tábora.
        const open = d.aggr[i] ? cand : cand.filter((tp) => home.has(state.stateOwner[w.provState[tp]]));
        to = localTargets(open, a.n, defOf, claimed, d.aggr[i] ? 1 : AI.DEFENDER_MULT, score);
        local = to.length > 0;
      }
      if (!to.length) { state = plan(state, id, { k: 'area', area: areaOf(slice) }); continue; }
      for (const tp of to) claimed.add(tp);
      const pick = new Set(to);
      const line = slice.filter((p) => adj[p].some((e) => pick.has(e.to)));
      if (line.length < AI.SLICE_MIN) for (const p of slice) if (!line.includes(p) && line.length < AI.SLICE_MIN) line.push(p);
      const mode = local ? (to.every((tp) => defOf(tp) === 0) ? 'rush' : 'balanced') : ratio[i] >= AI.RUSH_RATIO ? 'rush' : 'balanced';
      const pl = { k: 'front', line: line.sort((p, q) => p - q), to: to.sort((p, q) => p - q), mode };
      if (local) pl.loc = 1;
      state = plan(state, id, pl);
    }
  });
  if (echelon.length) {   // M88: druhý sled může vyplout proti nepříteli za mořem (Norsko 1940), i když hlavní síly váže pozemní fronta
    const pick = new Set(echelon);
    state = startInvasion(state, o, armiesOf(state, o).filter((a) => pick.has(a.id)));
  }
  return state;
}
