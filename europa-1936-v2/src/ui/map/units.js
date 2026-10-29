// Vrstva jednotek na mapě: z herního stavu staví žetony (divize ve stejné provincii se sloučí), shlukuje je při oddálení,
// hledá žeton pod kurzorem a v obdélníku a kreslí žetony, šipky rozkazů, značky bitev a plány armád.
// Data (buildCounters, clusterCounters, routesOf, ...) jsou čistá a jdou testovat bez plátna; kreslení používá Canvas 2D jen v metodách UnitLayer.
import { geo, deriveStats, atWar } from '../../engine/index.js';
import { labelPath } from './geometry.js';
import { worldToScreen } from './camera.js';
import { drawCounter, counterLook, counterScale, counterSize, arrowHead, COUNTER } from './counters.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const SUP_WARN_HOURS = 48;       // žeton ukáže varování, když divize bez zásob čerpá batoh a zbývá méně hodin
const MOVING_MIN_PROG = 6;       // od tohoto postupu (z 100) se žeton kreslí na cestě mezi provinciemi

/** Žetony: divize stejné země ve stejné provincii (a se stejným směrem pohybu) tvoří jeden žeton. */
export function buildCounters(game, world) {
  const mil = game.mil, g = geo(world);
  const map = new Map();
  for (let id = 1; id < mil.divs.length; id++) {
    const d = mil.divs[id];
    if (!d) continue;
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

/** Rozkazy k pohybu: pro každou jedinečnou cestu { o, nodes: [provincie…], ids, attack }. Útok = cílová provincie patří nepříteli. */
export function routesOf(game) {
  const mil = game.mil;
  const map = new Map();
  for (let id = 1; id < mil.divs.length; id++) {
    const d = mil.divs[id];
    if (!d || !d.path.length) continue;
    const sig = `${d.o}:${d.p}:${d.path.join(',')}`;
    let r = map.get(sig);
    if (!r) {
      const last = d.path[d.path.length - 1];
      r = { o: d.o, nodes: [d.p, ...d.path], ids: [], attack: game.ctrl[last] !== d.o && atWar(game, d.o, game.ctrl[last]) };
      map.set(sig, r);
    }
    r.ids.push(id);
  }
  return [...map.values()];
}

/** Bitvy pro mapu: { p, from: [provincie], adv } (adv = podíl útočníků na zásazích 0–1). */
export const battlesOf = (game) => game.mil.battles.map((b) => ({ id: b.id, p: b.p, from: b.from, adv: b.adv, att: b.att.length, dep: b.dep.length }));

import { buildFleetTokens, buildFleetRoutes, drawFleetToken, FLEET } from './fleets.js';

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
    this.fleetSrc = null; this.fleetTokens = []; this.fleetRoutes = []; this.fleetSel = 0; this.fleetHits = [];   // M27: flotily
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
    if (mil.divs !== this.divs || game.ctrl !== this.ctrlSrc || mil.wars !== this.warsSrc) {
      this.divs = mil.divs; this.ctrlSrc = game.ctrl; this.warsSrc = mil.wars;
      this.counters = buildCounters(game, this.world);
      this.routes = routesOf(game);
      this.cluster.src = null;
      changed = true;
    }
    if (game.nav && game.nav.fleets !== this.fleetSrc) { this.fleetSrc = game.nav.fleets; this.fleetTokens = buildFleetTokens(game, this.world); this.fleetRoutes = buildFleetRoutes(game, this.world); changed = true; }
    if (mil.battles !== this.battlesSrc) { this.battlesSrc = mil.battles; this.battles = battlesOf(game); changed = true; }
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
      if (mine) lines.sel.push(r); else if (r.attack) lines.atk.push(r); else if (rel === 'own') lines.own.push(r); else lines.enemy.push(r);
    }
    const strokeRoutes = (list, width, color, alpha, head) => {
      if (!list.length) return;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = (width + 2.4) * px; ctx.strokeStyle = 'rgba(6,10,14,0.85)';
      ctx.beginPath();
      for (const r of list) { ctx.moveTo(g.cx[r.nodes[0]], g.cy[r.nodes[0]]); for (let i = 1; i < r.nodes.length; i++) ctx.lineTo(g.cx[r.nodes[i]], g.cy[r.nodes[i]]); }
      ctx.stroke();
      ctx.lineWidth = width * px; ctx.strokeStyle = color;
      ctx.stroke();
      ctx.fillStyle = color;
      for (const r of list) {
        const n = r.nodes.length;
        const bx = g.cx[r.nodes[n - 2]], by = g.cy[r.nodes[n - 2]], ex = g.cx[r.nodes[n - 1]], ey = g.cy[r.nodes[n - 1]];
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

    // bitvy: červené šípy z výchozích provincií a značka ve sporné provincii
    for (const b of this.battles) {
      const tx = g.cx[b.p], ty = g.cy[b.p];
      if (tx < vx0 - 40 || tx > vx1 + 40 || ty < vy0 - 40 || ty > vy1 + 40) continue;
      ctx.fillStyle = '#ff5a38';
      for (const f of b.from) {
        const fx = g.cx[f], fy = g.cy[f];
        ctx.lineWidth = 6 * px; ctx.strokeStyle = 'rgba(6,10,14,0.8)';
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.lineWidth = 3.4 * px; ctx.strokeStyle = '#ff5a38';
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
      }
    }

    if (route && route.nodes && route.nodes.length > 1) {
      ctx.setLineDash([7 * px, 5 * px]);
      ctx.lineWidth = 2.6 * px; ctx.strokeStyle = route.attack ? '#ff6a47' : '#fff3c4';
      ctx.beginPath();
      ctx.moveTo(g.cx[route.nodes[0]], g.cy[route.nodes[0]]);
      for (let i = 1; i < route.nodes.length; i++) ctx.lineTo(g.cx[route.nodes[i]], g.cy[route.nodes[i]]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
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

