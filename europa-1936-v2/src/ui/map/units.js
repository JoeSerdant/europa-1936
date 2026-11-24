// Vrstva jednotek na mapě: z herního stavu staví žetony (divize ve stejné provincii se sloučí), shlukuje je při oddálení,
// hledá žeton pod kurzorem a v obdélníku a kreslí žetony, šipky rozkazů, značky bitev a plány armád.
// Data (buildCounters, clusterCounters, routesOf, ...) jsou čistá a jdou testovat bez plátna; kreslení používá Canvas 2D jen v metodách UnitLayer.
import { geo, deriveStats, atWar, fogOn, visibleLand, sameFaction, getWorld, marchEta } from '../../engine/index.js';
import { fmtEta } from '../format.js';
import { labelPath } from './geometry.js';
import { worldToScreen } from './camera.js';
import { drawCounter, counterLook, counterScale, counterSize, arrowHead, etaPill, COUNTER } from './counters.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const SUP_WARN_HOURS = 48;       // žeton ukáže varování, když divize bez zásob čerpá batoh a zbývá méně hodin
const MOVING_MIN_PROG = 6;       // od tohoto postupu (z 100) se žeton kreslí na cestě mezi provinciemi

/** Žetony: divize stejné země ve stejné provincii (a se stejným směrem pohybu) tvoří jeden žeton. */
export function buildCounters(game, world) {
  const mil = game.mil, g = geo(world);
  const fog = fogOn(game), me = fog ? world.ownerIdx[game.player] : 0, vis = fog ? visibleLand(game, me) : null;
  const ally = new Uint8Array(world.owners.length);
  if (fog) for (let o = 1; o < ally.length; o++) if (sameFaction(game, me, o)) ally[o] = 1;
  const map = new Map();
  for (let id = 1; id < mil.divs.length; id++) {
    const d = mil.divs[id];
    if (!d || (fog && d.o !== me && !ally[d.o] && !vis[d.p])) continue;   // M76: mlha války skryje cizí divize mimo dohled
    const moving = d.b === 0 && d.path.length > 0 && d.prog >= MOVING_MIN_PROG;
    const next = moving ? d.path[0] : 0;
    const key = (d.o * 4096 + d.p) * 4096 + next;
    let c = map.get(key);
    if (!c) {
      c = { key, o: d.o, p: d.p, next, ids: [], n: 0, hp: 0, org: 0, prog: 0, fight: 0, lack: 0, retreat: 0, kinds: {}, cls: 'inf', x: 0, y: 0 };
      map.set(key, c);
    }
    const st = deriveStats(mil.tpl[d.tpl]);
    c.ids.push(id);
    c.n++;
    c.hp += st.hp ? d.hp / st.hp : 0;
    c.org += st.org ? d.org / st.org : 0;
    c.prog += d.prog;
    if (d.b) c.fight++;
    if (d.rt > 0) c.retreat++;
    if (d.sup < 0.999 && d.sg < SUP_WARN_HOURS) c.lack++;
    c.kinds[st.cls] = (c.kinds[st.cls] || 0) + 1;
  }
  const list = [];
  for (const c of map.values()) {
    c.hp /= c.n; c.org /= c.n;
    const t = c.next ? clamp(c.prog / c.n / 100, 0, 1) : 0;
    c.x = g.cx[c.p] + (c.next ? (g.cx[c.next] - g.cx[c.p]) * t : 0);
    c.y = g.cy[c.p] + (c.next ? (g.cy[c.next] - g.cy[c.p]) * t : 0);
    c.cls = dominant(c.kinds);
    list.push(c);
  }
  return list;
}

function dominant(kinds) {
  let best = 'inf', n = -1;
  for (const k in kinds) if (kinds[k] > n) { n = kinds[k]; best = k; }
  return best;
}

/** Sloučí žetony stejné země, které leží ve stejné buňce mřížky (buňka ve světových pixelech). Samostatné žetony zůstanou stejné objekty. */
export function clusterCounters(counters, cell) {
  const groups = new Map();
  for (const c of counters) {
    const key = ((c.o * 4096 + Math.floor(c.x / cell)) * 4096) + Math.floor(c.y / cell);
    const a = groups.get(key);
    if (a) a.push(c); else groups.set(key, [c]);
  }
  const out = [];
  for (const arr of groups.values()) {
    if (arr.length === 1) { out.push(arr[0]); continue; }
    let n = 0, x = 0, y = 0, hp = 0, org = 0, fight = 0, lack = 0, retreat = 0;
    const ids = [], kinds = {};
    for (const c of arr) {
      n += c.n; x += c.x * c.n; y += c.y * c.n; hp += c.hp * c.n; org += c.org * c.n;
      fight += c.fight; lack += c.lack; retreat += c.retreat;
      for (const id of c.ids) ids.push(id);
      for (const k in c.kinds) kinds[k] = (kinds[k] || 0) + c.kinds[k];
    }
    out.push({ key: arr[0].key, o: arr[0].o, p: arr[0].p, next: 0, ids, n, hp: hp / n, org: org / n, prog: 0, fight, lack, retreat, kinds, cls: dominant(kinds), x: x / n, y: y / n, merged: arr.length });
  }
  return out;
}

/** Buňka shlukování (mocnina dvou, aby se shluky při posunu mapy neměnily): žetony bližší než `minPx` obrazovkových pixelů se sloučí. */
export function clusterCell(zoom, minPx) {
  return 2 ** Math.ceil(Math.log2(Math.max(1e-3, minPx / zoom)));
}

/**
 * Rozkazy k pohybu: pro každou jedinečnou cestu { o, nodes: [provincie…], ids, attack, prog }. Útok = cílová provincie patří nepříteli.
 * `prog` = průměrný postup (0–100) pochodujících divizí na první úsek – čára pak začíná u posunutého žetonu (F3).
 * F3: s mlhou války hráč vidí jen rozkazy svých a spojeneckých divizí (cizí rozkazy v HOI4 vidět nejsou).
 */
export function routesOf(game) {
  const mil = game.mil, w = getWorld();
  const fog = fogOn(game), me = fog ? w.ownerIdx[game.player] : 0;
  const seen = fog ? new Int8Array(w.owners.length) : null;   // 1 = vidět, -1 = skryté (spočítá se líně)
  const map = new Map();
  for (let id = 1; id < mil.divs.length; id++) {
    const d = mil.divs[id];
    if (!d || !d.path.length) continue;
    if (fog && d.o !== me) {
      if (!seen[d.o]) seen[d.o] = sameFaction(game, me, d.o) ? 1 : -1;
      if (seen[d.o] < 0) continue;
    }
    const sig = `${d.o}:${d.p}:${d.path.join(',')}`;
    let r = map.get(sig);
    if (!r) {
      const last = d.path[d.path.length - 1];
      r = { o: d.o, nodes: [d.p, ...d.path], ids: [], attack: game.ctrl[last] !== d.o && atWar(game, d.o, game.ctrl[last]), prog: 0, np: 0 };
      map.set(sig, r);
    }
    r.ids.push(id);
    if (d.b === 0 && d.prog >= MOVING_MIN_PROG) { r.prog += d.prog; r.np++; }
  }
  const out = [];
  for (const r of map.values()) { r.prog = r.np ? r.prog / r.np : 0; delete r.np; out.push(r); }
  return out;
}

/** F3: začátek čáry rozkazu – u žetonu, který už je na cestě k první provincii (stejná interpolace jako `buildCounters`). */
export function routeStart(g, r) {
  const a = r.nodes[0];
  if (!r.prog || r.nodes.length < 2) return [g.cx[a], g.cy[a]];
  const b = r.nodes[1], t = clamp(r.prog / 100, 0, 1);
  return [g.cx[a] + (g.cx[b] - g.cx[a]) * t, g.cy[a] + (g.cy[b] - g.cy[a]) * t];
}

/** Barvy plánů armád na mapě (M103): každá armáda podle id jinou. */
export const PLAN_COLORS = ['#ffb347', '#7ec8ff', '#c792ea', '#9be564', '#ff8a7a', '#f6e05e', '#5eead4', '#f0abfc'];
const PLAN_GAP = 160;   // mezera v linii (svět. jednotky), nad kterou se čára přeruší
const PLAN_ARROWS = 4;  // nejvýš šípů útoku na armádu

/**
 * Plány armád země `me` pro mapu (M103, jako v HOI4): { id, color, segs: [[[x,y]…]…] (linie fronty jako lomené čáry), arrows: [{ fx, fy, tx, ty }] }.
 * Linie se řadí od konce (provincie s nejméně sousedy v linii) k nejbližší další; šípy vedou z nejbližší provincie linie k cílům, které ještě drží nepřítel.
 */
export function planMarks(game, me, g) {
  if (!me) return [];
  const out = [];
  const armies = game.mil.armies;
  for (let id = 1; id < armies.length; id++) {
    const a = armies[id];
    if (!a || a.o !== me || !a.plan || a.plan.k !== 'front' || !a.plan.line.length) continue;
    const line = a.plan.line.filter((p) => game.ctrl[p] === me || game.ctrl[p] === 0 || !atWar(game, me, game.ctrl[p]));
    if (!line.length) continue;
    const d = (p, q) => Math.hypot(g.cx[p] - g.cx[q], g.cy[p] - g.cy[q]);
    const left = new Set(line), segs = [];
    // začátek: nejzápadnější/nejsevernější krajní provincie (stabilní pořadí)
    let cur = line.slice().sort((p, q) => g.cx[p] + g.cy[p] - (g.cx[q] + g.cy[q]) || p - q)[0];
    let seg = [];
    while (cur) {
      left.delete(cur); seg.push([g.cx[cur], g.cy[cur]]);
      let nx = 0, nd = Infinity;
      for (const q of left) { const x = d(cur, q); if (x < nd || (x === nd && q < nx)) { nd = x; nx = q; } }
      if (nx && nd > PLAN_GAP) { segs.push(seg); seg = []; }
      cur = nx;
    }
    if (seg.length) segs.push(seg);
    // vyhlazení lomené čáry (klouzavý průměr se sousedy, konce zůstávají) – linie se nekroutí mezi provinciemi dvou řad
    const smooth = (pts) => pts.map((pt, i) => (i === 0 || i === pts.length - 1 ? pt : [(pts[i - 1][0] + pt[0] * 2 + pts[i + 1][0]) / 4, (pts[i - 1][1] + pt[1] * 2 + pts[i + 1][1]) / 4]));
    const to = a.plan.to.filter((t) => game.ctrl[t] && game.ctrl[t] !== me && atWar(game, me, game.ctrl[t]));
    // M103: velké šípy jako v HOI4 – cíle po skupinách (podél osy linie) a za každou skupinu jeden šíp zpoza linie přes ni k cílům
    const arrows = [];
    if (to.length) {
      const pts = line.map((p) => [g.cx[p], g.cy[p]]);
      let ax = 1, ay = 0;
      if (pts.length > 1) { const [p0, p1] = [pts[0], pts.reduce((b, q) => (Math.hypot(q[0] - pts[0][0], q[1] - pts[0][1]) > Math.hypot(b[0] - pts[0][0], b[1] - pts[0][1]) ? q : b), pts[0])]; const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1; ax = (p1[0] - p0[0]) / l; ay = (p1[1] - p0[1]) / l; }
      const sorted = to.slice().sort((p, q) => (g.cx[p] * ax + g.cy[p] * ay) - (g.cx[q] * ax + g.cy[q] * ay) || p - q);
      const k = Math.min(PLAN_ARROWS, Math.max(1, Math.round(sorted.length / 3)));
      for (let c = 0; c < k; c++) {
        const grp = sorted.slice(Math.floor((c * sorted.length) / k), Math.floor(((c + 1) * sorted.length) / k));
        if (!grp.length) continue;
        const tx = grp.reduce((x, t) => x + g.cx[t], 0) / grp.length, ty = grp.reduce((y, t) => y + g.cy[t], 0) / grp.length;
        let bx = 0, by = 0, bd = Infinity;
        for (const [x, y] of pts) { const dd = Math.hypot(x - tx, y - ty); if (dd < bd) { bd = dd; bx = x; by = y; } }
        if (bd > PLAN_GAP * 1.4) continue;
        const ux = (tx - bx) / (bd || 1), uy = (ty - by) / (bd || 1), back = Math.max(34, bd * 1.1);
        arrows.push({ fx: bx - ux * back, fy: by - uy * back, tx: tx + ux * 10, ty: ty + uy * 10 });
      }
    }
    for (let i = 0; i < segs.length; i++) segs[i] = smooth(segs[i]);
    out.push({ id, color: PLAN_COLORS[id % PLAN_COLORS.length], segs, arrows, mode: a.plan.mode });
  }
  return out;
}

/** Bitvy pro mapu: { p, from: [provincie], adv } (adv = podíl útočníků na zásazích 0–1). */
export const battlesOf = (game) => game.mil.battles.filter((b) => !fogOn(game) || visibleLand(game, getWorld().ownerIdx[game.player])[b.p]).map((b) => ({ id: b.id, p: b.p, from: b.from, adv: b.adv, att: b.att.length, dep: b.dep.length }));

import { buildAirMarks, drawAirBadge, MISSION_COLOR } from './air.js';
import { buildFleetTokens, buildFleetRoutes, drawFleetToken, FLEET } from './fleets.js';

/** Zakřivený šíp útoku (M63): obrys, tělo a hrot; konec se zkrátí, aby hrot nezakryl střed provincie. Souřadnice ve světě, `px` = 1 / zoom. */
export function drawAttackArrow(ctx, fx, fy, tx, ty, w, px, color) {
  const dx = tx - fx, dy = ty - fy, len = Math.hypot(dx, dy);
  if (len < 1e-6) return;
  const ux = dx / len, uy = dy / len;
  const head = Math.min(len * 0.45, w * 4.2);
  const ex = tx - ux * Math.min(len * 0.3, w * 1.6), ey = ty - uy * Math.min(len * 0.3, w * 1.6);   // špička šípu
  const bend = len * 0.12;
  const cx = (fx + ex) / 2 - uy * bend, cy = (fy + ey) / 2 + ux * bend;
  // směr na konci křivky (z řídicího bodu ke špičce)
  const hx = ex - cx, hy = ey - cy, hl = Math.hypot(hx, hy) || 1, hux = hx / hl, huy = hy / hl;
  const bx = ex - hux * head, by = ey - huy * head;   // začátek hrotu
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const pass of [0, 1]) {
    ctx.strokeStyle = ctx.fillStyle = pass === 0 ? 'rgba(6,10,14,0.85)' : color;
    const grow = pass === 0 ? 2.2 * px : 0;
    ctx.lineWidth = w + grow * 2;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(cx, cy, bx, by); ctx.stroke();
    const hw = w * 1.55 + grow;
    ctx.beginPath();
    ctx.moveTo(ex + hux * grow, ey + huy * grow);
    ctx.lineTo(bx - huy * hw, by + hux * hw);
    ctx.lineTo(bx + huy * hw, by - hux * hw);
    ctx.closePath(); ctx.fill();
  }
}

export class UnitLayer {
  constructor(world) {
    this.world = world;
    this.g = geo(world);
    this.looks = world.owners.map((o) => (o ? counterLook(o.color) : counterLook('#808080')));
    this.divs = null;
    this.battlesSrc = null;
    this.ctrlSrc = null;
    this.warsSrc = null;
    this.counters = [];
    this.routes = [];
    this.battles = [];
    this.selected = new Set();
    this.hoverIds = null;
    this.player = 0;
    this.cluster = { cell: 0, src: null, list: [] };
    this.hits = [];                 // žetony z posledního snímku: { x0, y0, x1, y1, c }
    this.routeView = null; this.etaList = []; this.etaSrc = null; this.etaSel = null;   // F3: náhled rozkazu a odhady příjezdu vybraných
    this.fleetSrc = null; this.fleetTokens = []; this.fleetRoutes = []; this.fleetSel = 0; this.fleetHits = [];   // M27: flotily
    this.airSrc = null; this.airPlayer = null; this.air = { lines: [], bases: [] };   // M30: letectvo
    this.stats = { counters: 0, shown: 0, ms: 0 };
  }

  /** Přebere nový stav hry; vrací true, když se vzhled vrstvy změnil. */
  setGame(game) {
    if (!game) {
      const had = this.counters.length > 0;
      this.divs = null; this.counters = []; this.routes = []; this.battles = []; this.hits = []; this.fleetSrc = null; this.fleetTokens = []; this.fleetRoutes = []; this.fleetHits = [];
      return had;
    }
    const mil = game.mil;
    let changed = false;
    if (mil.divs !== this.divs || game.ctrl !== this.ctrlSrc || mil.wars !== this.warsSrc || game.rules !== this.rulesSrc || game.dip.ver !== this.dipVer) {
      this.divs = mil.divs; this.ctrlSrc = game.ctrl; this.warsSrc = mil.wars; this.rulesSrc = game.rules; this.dipVer = game.dip.ver;
      this.counters = buildCounters(game, this.world);
      this.routes = routesOf(game);
      this.cluster.src = null;
      changed = true;
    }
    if (game.nav && (game.nav.fleets !== this.fleetSrc || game.rules !== this.fleetRules)) { this.fleetSrc = game.nav.fleets; this.fleetRules = game.rules; this.fleetTokens = buildFleetTokens(game, this.world); this.fleetRoutes = buildFleetRoutes(game, this.world); changed = true; }
    if (game.air && (game.air.wings !== this.airSrc || game.player !== this.airPlayer)) { this.airSrc = game.air.wings; this.airPlayer = game.player; this.air = buildAirMarks(game, this.world); changed = true; }
    if (mil.armies !== this.armiesSrc || game.ctrl !== this.planCtrl) { this.armiesSrc = mil.armies; this.planCtrl = game.ctrl; this.plans = planMarks(game, game.player ? this.world.ownerIdx[game.player] : 0, this.g); changed = true; }   // M103
    if (mil.battles !== this.battlesSrc || changed) { this.battlesSrc = mil.battles; this.battles = battlesOf(game); changed = true; }
    this.game = game;
    return changed;
  }

  setSelection(ids) { this.selected = new Set(ids); }
  setFleetSel(id) { this.fleetSel = id; }

  relation(o) {
    if (!this.player) return 'other';
    if (o === this.player) return 'own';
    return this.game && atWar(this.game, this.player, o) ? 'enemy' : 'other';
  }

  /** Žetony po shlukování pro dané přiblížení (mezipaměť podle zdroje a buňky). */
  clustered(zoom) {
    const s = counterScale(zoom);
    const cell = clusterCell(zoom, COUNTER.W * s * 0.95);
    const c = this.cluster;
    if (c.src !== this.counters || c.cell !== cell) {
      c.src = this.counters; c.cell = cell;
      c.list = clusterCounters(this.counters, cell);
    }
    return c.list;
  }

  /** Kreslení ve světových souřadnicích (kamera už nastavená v ctx): plán armády, šipky pohybu a útoků, bitvy. */
  drawWorld(ctx, cam, view, planView, route) {
    const px = 1 / cam.zoom;
    const g = this.g;
    const [vx0, vy0, vx1, vy1] = view;
    const inView = (nodes) => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const p of nodes) { const x = g.cx[p], y = g.cy[p]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return !(x1 < vx0 || x0 > vx1 || y1 < vy0 || y0 > vy1);
    };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // pohyb divizí: tenké čáry se šipkami; vybrané jednotky zlatě, útoky červeně
    const sel = this.selected;
    const lines = { own: [], enemy: [], sel: [], atk: [] };
    for (const r of this.routes) {
      if (!inView(r.nodes)) continue;
      const mine = r.ids.some((id) => sel.has(id));
      const rel = this.relation(r.o);
      if (mine) lines.sel.push(r); else if (rel !== 'own') lines.enemy.push(r); else if (r.attack) lines.atk.push(r); else lines.own.push(r);   // F3: červeně jen vlastní útoky, cizí rozkazy šedě
    }
    const strokeRoutes = (list, width, color, alpha, head) => {
      if (!list.length) return;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = (width + 2.4) * px; ctx.strokeStyle = 'rgba(6,10,14,0.85)';
      ctx.beginPath();
      for (const r of list) { const [sx, sy] = routeStart(g, r); ctx.moveTo(sx, sy); for (let i = 1; i < r.nodes.length; i++) ctx.lineTo(g.cx[r.nodes[i]], g.cy[r.nodes[i]]); }
      ctx.stroke();
      ctx.lineWidth = width * px; ctx.strokeStyle = color;
      ctx.stroke();
      ctx.fillStyle = color;
      for (const r of list) {
        const n = r.nodes.length;
        const [bx, by] = n > 2 ? [g.cx[r.nodes[n - 2]], g.cy[r.nodes[n - 2]]] : routeStart(g, r), ex = g.cx[r.nodes[n - 1]], ey = g.cy[r.nodes[n - 1]];
        ctx.lineWidth = 1.2 * px; ctx.strokeStyle = 'rgba(6,10,14,0.85)';
        arrowHead(ctx, ex, ey, ex - bx, ey - by, head * px);
        ctx.fill(); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    strokeRoutes(lines.enemy, 1.4, '#b8c4cf', 0.55, 7);
    strokeRoutes(lines.own, 2.2, '#8fdc72', 0.9, 9);
    strokeRoutes(lines.atk, 2.8, '#ff6a47', 0.95, 10);
    strokeRoutes(lines.sel, 3.2, '#ffd25a', 1, 11);
    // F3: cíle vybraných divizí – kroužek v cílové provincii (štítek s odhadem příjezdu kreslí drawScreen)
    if (lines.sel.length) {
      const done = new Set();
      ctx.lineWidth = 2.2 * px; ctx.strokeStyle = '#ffd25a';
      for (const r of lines.sel) {
        const t = r.nodes[r.nodes.length - 1];
        if (done.has(t)) continue;
        done.add(t);
        ctx.beginPath(); ctx.arc(g.cx[t], g.cy[t], 9 * px, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // cesty flotil po moři (čárkovaně, vybraná zlatě)
    if (this.fleetRoutes.length) {
      ctx.setLineDash([8 * px, 6 * px]);
      for (const r of this.fleetRoutes) {
        const mine = r.ids.includes(this.fleetSel);
        ctx.lineWidth = (mine ? 3 : 2) * px; ctx.strokeStyle = mine ? '#ffd25a' : this.relation(r.o) === 'own' ? '#7fd0ff' : 'rgba(190,200,210,0.6)';
        ctx.beginPath(); ctx.moveTo(r.nodes[0][0], r.nodes[0][1]);
        for (let i = 1; i < r.nodes.length; i++) ctx.lineTo(r.nodes[i][0], r.nodes[i][1]);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // letecké mise hráče: tenká čára z letiště do cíle, u hlídek kruh kolem cíle
    if (this.air.lines.length) {
      for (const l of this.air.lines) {
        const col = MISSION_COLOR[l.m];
        ctx.lineWidth = 1.8 * px; ctx.strokeStyle = col; ctx.globalAlpha = 0.85; ctx.setLineDash([3 * px, 6 * px]);
        ctx.beginPath(); ctx.moveTo(l.a[0], l.a[1]); ctx.lineTo(l.b[0], l.b[1]); ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 2.4 * px;
        ctx.beginPath(); ctx.arc(l.b[0], l.b[1], (l.m === 'air' ? 24 : 12) * px, 0, Math.PI * 2); ctx.stroke();
        if (l.m !== 'air') { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(l.b[0], l.b[1], 4 * px, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
    }

    // M103: plány armád hráče – barevná linie fronty a velké šípy k cílům útoku (upravovaná armáda se kreslí podrobně v drawPlan)
    for (const pm of this.plans || []) {
      if (planView && planView.army === pm.id) continue;
      for (const seg of pm.segs) {
        if (seg.length < 2) continue;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const pass of [0, 1]) {
          ctx.lineWidth = (pass ? 4 : 7.5) * px; ctx.strokeStyle = pass ? pm.color : 'rgba(6,10,14,0.8)'; ctx.globalAlpha = pass ? 0.92 : 0.75;
          ctx.beginPath(); ctx.moveTo(seg[0][0], seg[0][1]);
          for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i][0], seg[i][1]);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      for (const ar of pm.arrows) drawAttackArrow(ctx, ar.fx, ar.fy, ar.tx, ar.ty, 7 * px, px, pm.color);
    }

    // bitvy: červené šípy z výchozích provincií a značka ve sporné provincii
    for (const b of this.battles) {
      const tx = g.cx[b.p], ty = g.cy[b.p];
      if (tx < vx0 - 40 || tx > vx1 + 40 || ty < vy0 - 40 || ty > vy1 + 40) continue;
      const w = (3.2 + 1.6 * Math.sqrt(b.att / Math.max(1, b.from.length))) * px;   // šířka šípu roste s počtem útočících divizí na směr
      for (const f of b.from) drawAttackArrow(ctx, g.cx[f], g.cy[f], tx, ty, w, px, '#ff5a38');
    }

    // náhled rozkazu pod kurzorem (F3: od každého vybraného žetonu, s hrotem v cíli; odhad příjezdu kreslí drawScreen)
    this.routeView = route && route.routes && route.routes.length ? route : null;
    if (this.routeView) {
      const col = route.attack ? '#ff6a47' : '#fff3c4';
      ctx.setLineDash([7 * px, 5 * px]);
      ctx.lineWidth = 4.6 * px; ctx.strokeStyle = 'rgba(6,10,14,0.55)';
      const path = () => {   // společné úseky tras se kreslí jednou (překryté čárkované čáry by splynuly v plnou)
        ctx.beginPath();
        const seen = new Set();
        for (const r of route.routes) {
          const [sx, sy] = routeStart(g, r);
          ctx.moveTo(sx, sy); ctx.lineTo(g.cx[r.nodes[1]], g.cy[r.nodes[1]]);
          for (let i = 2; i < r.nodes.length; i++) {
            const k = r.nodes[i - 1] * 65536 + r.nodes[i];
            if (seen.has(k)) continue;
            seen.add(k);
            ctx.moveTo(g.cx[r.nodes[i - 1]], g.cy[r.nodes[i - 1]]); ctx.lineTo(g.cx[r.nodes[i]], g.cy[r.nodes[i]]);
          }
        }
      };
      path(); ctx.stroke();
      ctx.lineWidth = 2.6 * px; ctx.strokeStyle = col;
      path(); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = col; ctx.lineWidth = 1.2 * px; ctx.strokeStyle = 'rgba(6,10,14,0.85)';
      for (const r of route.routes) {
        const n = r.nodes.length;
        const [bx, by] = n > 2 ? [g.cx[r.nodes[n - 2]], g.cy[r.nodes[n - 2]]] : routeStart(g, r), ex = g.cx[r.nodes[n - 1]], ey = g.cy[r.nodes[n - 1]];
        arrowHead(ctx, ex, ey, ex - bx, ey - by, 10 * px);
        ctx.fill(); ctx.stroke();
      }
    }
  }

  /**
   * F3: odhady příjezdu vybraných vlastních divizí – pro každý cíl { dest, hours (-1 = všechny v boji), fighting, attack }.
   * Přepočítá se jen se změnou divizí nebo výběru.
   */
  selMarks() {
    if (this.etaSrc === this.divs && this.etaSel === this.selected) return this.etaList;
    this.etaSrc = this.divs; this.etaSel = this.selected;
    const game = this.game, byDest = new Map();
    if (game && this.player) {
      for (const id of this.selected) {
        const d = game.mil.divs[id];
        if (!d || d.o !== this.player || !d.path.length) continue;
        const t = d.path[d.path.length - 1];
        if (!byDest.has(t)) byDest.set(t, []);
        byDest.get(t).push(id);
      }
    }
    this.etaList = [...byDest].map(([dest, ids]) => {
      const e = marchEta(game, ids);
      return { dest, hours: e.hours, fighting: e.fighting, attack: game.ctrl[dest] !== this.player && atWar(game, this.player, game.ctrl[dest]) };
    });
    return this.etaList;
  }

  /** F3: štítky s odhadem příjezdu (vybrané rozkazy a náhled pod kurzorem) v obrazovkovém prostoru. */
  drawEta(ctx, cam, view, s) {
    const g = this.g;
    const [vx0, vy0, vx1, vy1] = view;
    const above = COUNTER.H * s / 2 + 6;
    const pill = (p, text, tone) => {
      const x = g.cx[p], y = g.cy[p];
      if (x < vx0 - 80 || x > vx1 + 80 || y < vy0 - 40 || y > vy1 + 60) return;
      const [sx, sy] = worldToScreen(cam, x, y);
      etaPill(ctx, text, sx, sy - above, tone);
    };
    const prev = this.routeView;
    const prevDest = prev ? prev.routes[0].nodes[prev.routes[0].nodes.length - 1] : 0;
    for (const m of this.selMarks()) {
      if (m.dest === prevDest) continue;   // náhled do téhož cíle má přednost
      pill(m.dest, m.hours < 0 ? 'v boji' : `${fmtEta(m.hours)}${m.fighting ? ' · boj' : ''}`, m.attack ? '#ff6a47' : '#ffd25a');
    }
    if (prev && prev.hours >= 0) pill(prevDest, `${fmtEta(prev.hours)}${prev.attack ? ' · útok' : ''}`, prev.attack ? '#ff6a47' : '#fff3c4');
  }

  /** Plán armády: provincie ke hájení (modře), linie a cíle útoku (červeně), šipky z linie k cílům. */
  drawPlan(ctx, cam, geom, plan) {
    if (!plan) return;
    const px = 1 / cam.zoom, g = this.g;
    ctx.lineJoin = 'round';
    const paint = (list, fill, stroke) => {
      for (const p of list) {
        if (!geom.polys[p]) continue;
        const path = labelPath(geom, p);
        ctx.fillStyle = fill; ctx.fill(path, 'evenodd');
        ctx.strokeStyle = stroke; ctx.lineWidth = 1.8 * px; ctx.stroke(path);
      }
    };
    if (plan.area && plan.area.length) paint(plan.area, 'rgba(70,150,255,0.30)', 'rgba(150,200,255,0.95)');
    if (plan.line && plan.line.length) paint(plan.line, 'rgba(70,150,255,0.30)', 'rgba(150,200,255,0.95)');
    if (plan.fb && plan.fb.length) paint(plan.fb, 'rgba(230,190,60,0.25)', 'rgba(255,215,90,0.95)');   // F4c: ústupová linie
    if (plan.to && plan.to.length) {
      paint(plan.to, 'rgba(235,75,50,0.30)', 'rgba(255,150,120,0.95)');
      ctx.fillStyle = '#ff6a47';
      const lineSet = new Set(plan.line || []);
      for (const t of plan.to) {
        let best = 0, bd = Infinity;
        for (const l of lineSet) { const d = Math.hypot(g.cx[l] - g.cx[t], g.cy[l] - g.cy[t]); if (d < bd) { bd = d; best = l; } }
        if (!best || bd > 160) continue;
        ctx.lineWidth = 5 * px; ctx.strokeStyle = 'rgba(6,10,14,0.8)';
        ctx.beginPath(); ctx.moveTo(g.cx[best], g.cy[best]); ctx.lineTo(g.cx[t], g.cy[t]); ctx.stroke();
        ctx.lineWidth = 2.6 * px; ctx.strokeStyle = '#ff6a47'; ctx.stroke();
        arrowHead(ctx, g.cx[t], g.cy[t], g.cx[t] - g.cx[best], g.cy[t] - g.cy[best], 9 * px);
        ctx.fill();
      }
    }
  }

  /** Žetony a značky bitev v obrazovkovém prostoru (ctx s transformací dpr). Vrací nic; hit-testy se uloží do `hits`. */
  drawScreen(ctx, cam, view) {
    const t0 = performance.now();
    const s = counterScale(cam.zoom);
    const { w, total } = counterSize(s);
    const [vx0, vy0, vx1, vy1] = view;
    const mx = (w + 30) / cam.zoom, my = (total + 30) / cam.zoom;
    const list = this.clustered(cam.zoom);
    const g = this.g;
    // značky bitev
    this.battleHits = [];
    for (const b of this.battles) {
      const bx = g.cx[b.p], by = g.cy[b.p];
      if (bx < vx0 - mx || bx > vx1 + mx || by < vy0 - my || by > vy1 + my) continue;
      const [sx, sy] = worldToScreen(cam, bx, by);
      this.drawBattleMark(ctx, sx, sy, s, b);
    }
    const shown = [];
    for (const c of list) {
      if (c.x < vx0 - mx || c.x > vx1 + mx || c.y < vy0 - my || c.y > vy1 + my) continue;
      shown.push(c);
    }
    // vzadu severní, vpředu jižní žetony; vybrané a pod kurzorem nakonec
    const rank = (c) => (this.isHover(c) ? 2e6 : this.selCount(c) ? 1e6 : 0) + c.y;
    shown.sort((a, b) => rank(a) - rank(b));
    this.hits.length = 0;
    for (const c of shown) {
      const [sx, sy] = worldToScreen(cam, c.x, c.y);
      const sc = this.selCount(c);
      drawCounter(ctx, c, sx, sy, this.looks[c.o], { s, rel: this.relation(c.o), sel: sc === 0 ? 0 : sc >= c.n ? 2 : 1, hover: this.isHover(c) });
      this.hits.push({ x0: sx - w / 2 - 1, y0: sy - COUNTER.H * s / 2 - 1, x1: sx + w / 2 + 1, y1: sy - COUNTER.H * s / 2 + total, c });
    }
    this.drawEta(ctx, cam, view, s);   // F3: odhady příjezdu nad žetony
    // flotily: žetony ve středech mořských oblastí
    this.fleetHits.length = 0;
    if (this.fleetTokens.length) {
      const fw = FLEET.W * s, fh = FLEET.H * s;
      for (const t of this.fleetTokens) {
        if (t.x < vx0 - mx || t.x > vx1 + mx || t.y < vy0 - my || t.y > vy1 + my) continue;
        const [sx, sy] = worldToScreen(cam, t.x, t.y);
        drawFleetToken(ctx, t, sx, sy, this.looks[t.o], { s, rel: this.relation(t.o), sel: t.ids.includes(this.fleetSel), hover: false });
        this.fleetHits.push({ x0: sx - fw / 2 - 1, y0: sy - fh / 2 - 1, x1: sx + fw / 2 + 1, y1: sy + fh / 2 + 6 * s, t });
      }
    }
    // letiště hráče: odznaky s počtem letadel
    for (const b of this.air.bases) {
      if (b.x < vx0 - mx || b.x > vx1 + mx || b.y < vy0 - my || b.y > vy1 + my) continue;
      const [sx, sy] = worldToScreen(cam, b.x, b.y);
      drawAirBadge(ctx, b, sx, sy + 22 * s, s);
    }
    this.stats.counters = this.counters.length; this.stats.shown = shown.length; this.stats.ms = performance.now() - t0;
  }

  selCount(c) {
    if (!this.selected.size) return 0;
    let n = 0;
    for (const id of c.ids) if (this.selected.has(id)) n++;
    return n;
  }

  isHover(c) {
    const h = this.hoverIds;
    return !!h && h.length > 0 && c.ids.length > 0 && h.includes(c.ids[0]);
  }

  drawBattleMark(ctx, sx, sy, s, b) {
    const r = 9 * Math.max(0.8, s);
    const cy0 = sy - COUNTER.H * s * 0.95 - r * 0.2;
    this.battleHits.push({ x0: sx - r - 3, x1: sx + r + 3, y0: cy0 - r - 3, y1: cy0 + r + 8, id: b.id });
    ctx.save();
    ctx.translate(sx, sy - COUNTER.H * s * 0.95 - r * 0.2);
    ctx.fillStyle = 'rgba(20,6,4,0.88)'; ctx.strokeStyle = '#ff6a47'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ffd9c8'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const q = r * 0.52;
    ctx.beginPath(); ctx.moveTo(-q, -q); ctx.lineTo(q, q); ctx.moveTo(-q, q); ctx.lineTo(q, -q); ctx.stroke();
    // poměr sil: pruh pod značkou (červená = útočníci, modrá = obránci)
    const bw = r * 2.4, bh = 3;
    ctx.fillStyle = '#4c9ae0'; ctx.fillRect(-bw / 2, r + 3, bw, bh);
    ctx.fillStyle = '#ff6a47'; ctx.fillRect(-bw / 2, r + 3, bw * clamp(b.adv, 0, 1), bh);
    ctx.restore();
  }

  /** Id bitvy, jejíž značka je pod bodem obrazovky, nebo 0 (M63). */
  pickBattle(sx, sy) {
    const hs = this.battleHits || [];
    for (let i = hs.length - 1; i >= 0; i--) { const h = hs[i]; if (sx >= h.x0 && sx <= h.x1 && sy >= h.y0 && sy <= h.y1) return h.id; }
    return 0;
  }

  /** Žeton flotily pod bodem obrazovky, nebo null. */
  pickFleet(sx, sy) {
    for (let i = this.fleetHits.length - 1; i >= 0; i--) {
      const h = this.fleetHits[i];
      if (sx >= h.x0 && sx <= h.x1 && sy >= h.y0 && sy <= h.y1) return h.t;
    }
    return null;
  }

  /** Žeton pod bodem obrazovky (nejvýše položený), nebo null. */
  pick(sx, sy) {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i];
      if (sx >= h.x0 && sx <= h.x1 && sy >= h.y0 && sy <= h.y1) return h.c;
    }
    return null;
  }

  /** Divize ze žetonů, jejichž střed leží v obdélníku obrazovky; `ownOnly` = jen divize hráče. */
  inBox(x0, y0, x1, y1, ownOnly = true) {
    const out = [];
    const a = Math.min(x0, x1), b = Math.max(x0, x1), c = Math.min(y0, y1), d = Math.max(y0, y1);
    for (const h of this.hits) {
      const cx = (h.x0 + h.x1) / 2, cy = (h.y0 + h.y1) / 2 - 5;
      if (cx < a || cx > b || cy < c || cy > d) continue;
      if (ownOnly && h.c.o !== this.player) continue;
      for (const id of h.c.ids) out.push(id);
    }
    return out;
  }
}

